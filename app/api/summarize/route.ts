import { NextRequest, NextResponse } from "next/server";
import { saveSummary } from "@/lib/summaries";

const API_KEY = process.env.FIREBASE_API_KEY_FOR_AI!;

// Maximum text length for input (characters)
const MAX_TEXT_LENGTH = 50_000;

// Cache for discovered model name (lazy-loaded on first request)
let cachedModelName: string | null = null;

interface GeminiModel {
  name: string;
  supportedGenerationMethods?: string[];
}

interface GeminiModelsResponse {
  models?: GeminiModel[];
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface GeminiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

/**
 * Discovers and caches the first available Gemini model that supports generateContent
 */
async function getAvailableModel(): Promise<string> {
  if (cachedModelName) {
    return cachedModelName;
  }

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;
    const res = await fetch(listUrl);

    if (!res.ok) {
      const errText = await res.text();
      console.error("Failed to list models:", {
        status: res.status,
        statusText: res.statusText,
        body: errText,
      });
      throw new Error(`Models list failed: ${res.status} ${res.statusText}`);
    }

    const data: GeminiModelsResponse = await res.json();
    const models = data.models || [];

    // Find first model that:
    // 1. Name starts with "models/gemini-"
    // 2. Has "generateContent" in supportedGenerationMethods
    const availableModel = models.find((model) => {
      const name = model.name || "";
      const methods = model.supportedGenerationMethods || [];
      return name.startsWith("models/gemini-") && methods.includes("generateContent");
    });

    if (!availableModel || !availableModel.name) {
      throw new Error(
        "No Gemini model found with generateContent support. Available models: " +
          models.map((m) => m.name).join(", ")
      );
    }

    // Cache the model name (e.g., "models/gemini-2.0-flash-001")
    cachedModelName = availableModel.name;
    console.log("Discovered available model:", cachedModelName);
    return cachedModelName;
  } catch (error: any) {
    console.error("Error discovering model:", error);
    throw error;
  }
}

/**
 * Strips "models/" prefix if present, as the generateContent endpoint expects just the model identifier
 */
function normalizeModelName(fullModelName: string): string {
  // The generateContent endpoint expects: models/{model-id}:generateContent
  // The fullModelName from list is already "models/..." so we can use it directly
  // But verify the format is correct
  if (fullModelName.startsWith("models/")) {
    return fullModelName;
  }
  return `models/${fullModelName}`;
}

/**
 * Checks if an error response is retryable (503 or UNAVAILABLE status)
 */
function isRetryableError(status: number, errorBody: string): boolean {
  if (status === 503) {
    return true;
  }

  try {
    const errorData: GeminiErrorResponse = JSON.parse(errorBody);
    return errorData.error?.status === "UNAVAILABLE";
  } catch {
    return false;
  }
}

/**
 * Calls generateContent with retry logic for 503/UNAVAILABLE errors
 */
async function generateContentWithRetry(
  generateUrl: string,
  payload: any,
  modelName: string,
  maxAttempts: number = 3
): Promise<{ response: Response; errorBody?: string }> {
  const backoffDelays = [0, 500, 1500]; // ms delays for attempts 1, 2, 3

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const delay = backoffDelays[attempt] || 0;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const res = await fetch(generateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { response: res };
    }

    const errText = await res.text();
    const isRetryable = isRetryableError(res.status, errText);

    if (!isRetryable || attempt === maxAttempts - 1) {
      // Not retryable or last attempt, return error
      return { response: res, errorBody: errText };
    }

    console.log(`GenerateContent attempt ${attempt + 1} failed (${res.status}), retrying...`);
  }

  // Should never reach here, but TypeScript requires it
  throw new Error("Retry logic failed");
}

function isValidFirebaseUID(uid: string | undefined | null): boolean {
  if (!uid) return false;
  // Firebase UIDs are typically 28 characters alphanumeric
  return /^[a-zA-Z0-9]{20,}$/.test(uid);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = (body?.text as string | undefined)?.trim();
    const userId = body?.userId as string | undefined;

    if (!text) {
      return NextResponse.json(
        { error: "Campo 'text' obbligatorio" },
        { status: 400 }
      );
    }

    // Validate text length
    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Il testo è troppo lungo. Massimo ${MAX_TEXT_LENGTH.toLocaleString()} caratteri.` },
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

    // Discover available model (cached after first call)
    let modelName: string;
    try {
      modelName = await getAvailableModel();
    } catch (error: any) {
      console.error("Model discovery failed:", error);
      return NextResponse.json(
        {
          error: "Errore nella configurazione del modello AI",
          details: error?.message || "Impossibile trovare un modello disponibile",
        },
        { status: 500 }
      );
    }

    const normalizedModelName = normalizeModelName(modelName);
    
    // Build generateContent endpoint URL
    // Format: https://generativelanguage.googleapis.com/v1/{modelName}:generateContent
    const generateUrl = `https://generativelanguage.googleapis.com/v1/${normalizedModelName}:generateContent?key=${API_KEY}`;

    // Build request payload exactly as per Gemini REST API docs
    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "Riepiloga il seguente testo in 3-5 frasi chiare in italiano, " +
                "mettendo in evidenza solo i punti principali:\n\n" +
                text,
            },
          ],
        },
      ],
    };

    // Call generateContent with retry logic
    const { response: res, errorBody } = await generateContentWithRetry(
      generateUrl,
      payload,
      normalizedModelName
    );

    if (!res.ok) {
      let parsedError: GeminiErrorResponse | null = null;
      let providerMessage: string | undefined;

      try {
        if (errorBody) {
          parsedError = JSON.parse(errorBody) as GeminiErrorResponse;
          providerMessage = parsedError.error?.message;
        }
      } catch {
        // Ignore parse errors
      }

      console.error("Gemini generateContent error:", {
        status: res.status,
        statusText: res.statusText,
        model: normalizedModelName,
        body: errorBody,
      });

      // Return 503 for retryable errors that failed after all retries
      if (res.status === 503 || parsedError?.error?.status === "UNAVAILABLE") {
        return NextResponse.json(
          {
            error: "Servizio AI temporaneamente non disponibile",
          },
          { status: 503 }
        );
      }

      // For non-503 errors, return 500 without exposing internal details
      return NextResponse.json(
        {
          error: "Errore nella generazione del riassunto",
        },
        { status: 500 }
      );
    }

    const data: GeminiGenerateContentResponse = await res.json();

    // Extract text from response: candidates[0].content.parts[0].text
    const summary =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!summary) {
      console.error("Empty summary in response");
      return NextResponse.json(
        {
          error: "Nessun riassunto restituito dal modello",
        },
        { status: 500 }
      );
    }

    // Save summary to Firestore if userId is provided
    if (userId) {
      try {
        await saveSummary({
          userId,
          type: "text",
          originalText: text,
          summary,
          sourceFileName: null,
        });
      } catch (saveError: any) {
        console.error("Failed to save summary to Firestore:", saveError);
        // Don't fail the request if saving fails, just log it
      }
    }

    return NextResponse.json({ summary });
    } catch (error: any) {
      console.error("Unexpected error in summarize route:", error);
      // Don't expose internal error details to client
      return NextResponse.json(
        {
          error: "Errore interno del server",
        },
        { status: 500 }
      );
    }
}
