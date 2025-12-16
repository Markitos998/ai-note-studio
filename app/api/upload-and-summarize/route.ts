import { NextRequest, NextResponse } from "next/server";
import { summarizeText, summarizeImage } from "@/lib/gemini";
// TODO: Save summary to Firestore after successful generation
// import { saveSummary } from "@/lib/summaries";

const MAX_TEXT_LENGTH = 10_000;

function isValidFirebaseUID(uid: string | undefined | null): boolean {
  if (!uid) return false;
  // Firebase UIDs are typically 28 characters alphanumeric
  return /^[a-zA-Z0-9]{20,}$/.test(uid);
}

function sanitizeFileName(fileName: string): string {
  // Remove any path components and keep only the filename
  const name = fileName.split(/[/\\]/).pop() || fileName;
  // Remove potentially dangerous characters but keep Unicode
  return name.replace(/[<>:"|?*\x00-\x1f]/g, "").trim() || "file";
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nessun file caricato" },
        { status: 400 }
      );
    }

    // Validate userId format if provided
    if (userId && !isValidFirebaseUID(userId)) {
      return NextResponse.json(
        { error: "Formato userId non valido" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "text/plain",
      "text/markdown",
      "application/pdf",
      "image/jpeg",
      "image/png",
    ];
    const allowedExtensions = [".txt", ".md", ".pdf", ".jpg", ".jpeg", ".png"];
    
    // Sanitize file name
    const originalFileName = sanitizeFileName(file.name);
    const fileName = originalFileName.toLowerCase();
    const mimeType = file.type;

    const hasAllowedExtension = allowedExtensions.some((ext) =>
      fileName.endsWith(ext)
    );
    const hasAllowedType = allowedTypes.includes(mimeType) || !mimeType;

    if (!hasAllowedExtension && !hasAllowedType) {
      return NextResponse.json(
        {
          error: "Tipo di file non supportato",
          details: "Sono supportati solo file .txt, .md, .pdf, .jpg, .jpeg, .png",
        },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: "File troppo grande",
          details: `La dimensione massima è ${maxSize / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    let extractedText: string = "";

    // Handle text files
    if (mimeType === "text/plain" || mimeType === "text/markdown" || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      const fileContent = await file.text();
      extractedText = fileContent.trim();

      if (!extractedText) {
        return NextResponse.json(
          { error: "Il file è vuoto" },
          { status: 400 }
        );
      }
    }
    // Handle PDF files
    else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      try {
        const pdfParse = (await import("pdf-parse")).default;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const data = await pdfParse(buffer);
        extractedText = data.text.trim();

        if (!extractedText) {
          return NextResponse.json(
            { error: "Impossibile estrarre testo dal PDF" },
            { status: 400 }
          );
        }
      } catch (error: any) {
        console.error("Error parsing PDF:", error);
        return NextResponse.json(
          {
            error: "Errore nell'elaborazione del PDF",
          },
          { status: 500 }
        );
      }
    }
    // Handle image files
    else if (
      mimeType === "image/jpeg" ||
      mimeType === "image/png" ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png")
    ) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString("base64");

        // Use Gemini vision API to extract and summarize text from image
        extractedText = await summarizeImage({
          imageBase64: base64Image,
          mimeType: mimeType || "image/jpeg",
        });

        // For images, extractedText is already the summary from Gemini
        // We'll use it directly
      } catch (error: any) {
        console.error("Error processing image:", error);
        return NextResponse.json(
          {
            error: "Errore nell'elaborazione dell'immagine",
          },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error: "Tipo di file non supportato",
        },
        { status: 400 }
      );
    }

    // Truncate extracted text to max length
    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.substring(0, MAX_TEXT_LENGTH);
    }

    // For images, extractedText is already the summary, so return it directly
    // For text/PDF, we need to summarize it
    let summary: string;
    if (
      mimeType === "image/jpeg" ||
      mimeType === "image/png" ||
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png")
    ) {
      summary = extractedText;
    } else {
      summary = await summarizeText(extractedText);
    }

    // TODO: Save summary to Firestore
    // if (userId) {
    //   try {
    //     await saveSummary({
    //       userId,
    //       type: "file",
    //       originalText: extractedText.substring(0, 1000), // Store preview
    //       summary,
    //       sourceFileName: file.name,
    //     });
    //   } catch (saveError: any) {
    //     console.error("Failed to save summary to Firestore:", saveError);
    //   }
    // }

    const extractedTextPreview = extractedText.substring(0, 200);

    return NextResponse.json({
      summary,
      extractedTextPreview,
      originalFileName: originalFileName,
      mimeType,
    });
  } catch (error: any) {
    console.error("Error in upload-and-summarize:", error);
    // Don't expose internal error details to client
    return NextResponse.json(
      {
        error: "Errore nella generazione del riassunto",
      },
      { status: 500 }
    );
  }
}
