const API_KEY = process.env.FIREBASE_API_KEY_FOR_AI!;

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
        inlineData?: {
          mimeType: string;
          data: string;
        };
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

export async function getAvailableModel(): Promise<string> {
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

    cachedModelName = availableModel.name;
    console.log("Discovered available model:", cachedModelName);
    return cachedModelName;
  } catch (error: any) {
    console.error("Error discovering model:", error);
    throw error;
  }
}

function normalizeModelName(fullModelName: string): string {
  if (fullModelName.startsWith("models/")) {
    return fullModelName;
  }
  return `models/${fullModelName}`;
}

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

async function generateContentWithRetry(
  generateUrl: string,
  payload: any,
  modelName: string,
  maxAttempts: number = 3
): Promise<{ response: Response; errorBody?: string }> {
  const backoffDelays = [0, 500, 1500];

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
      return { response: res, errorBody: errText };
    }

    console.log(`GenerateContent attempt ${attempt + 1} failed (${res.status}), retrying...`);
  }

  throw new Error("Retry logic failed");
}

export async function summarizeText(text: string): Promise<string> {
  const modelName = await getAvailableModel();
  const normalizedModelName = normalizeModelName(modelName);

  const generateUrl = `https://generativelanguage.googleapis.com/v1/${normalizedModelName}:generateContent?key=${API_KEY}`;

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

  const { response: res, errorBody } = await generateContentWithRetry(
    generateUrl,
    payload,
    normalizedModelName
  );

  if (!res.ok) {
    let parsedError: GeminiErrorResponse | null = null;

    try {
      if (errorBody) {
        parsedError = JSON.parse(errorBody) as GeminiErrorResponse;
      }
    } catch {
      // Ignore parse errors
    }

    const errorMessage = parsedError?.error?.message || `API returned ${res.status}: ${res.statusText}`;
    throw new Error(errorMessage);
  }

  const data: GeminiGenerateContentResponse = await res.json();
  const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  if (!summary) {
    throw new Error("Nessun riassunto restituito dal modello");
  }

  return summary;
}

export interface SummarizeImageParams {
  imageBase64: string;
  mimeType: string;
}

export async function summarizeImage(params: SummarizeImageParams): Promise<string> {
  const modelName = await getAvailableModel();
  const normalizedModelName = normalizeModelName(modelName);

  const generateUrl = `https://generativelanguage.googleapis.com/v1/${normalizedModelName}:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: params.mimeType,
              data: params.imageBase64,
            },
          },
          {
            text: "Extract all readable text from this image and summarize it in Italian in 3-5 sentences, highlighting only the main points.",
          },
        ],
      },
    ],
  };

  const { response: res, errorBody } = await generateContentWithRetry(
    generateUrl,
    payload,
    normalizedModelName
  );

  if (!res.ok) {
    let parsedError: GeminiErrorResponse | null = null;

    try {
      if (errorBody) {
        parsedError = JSON.parse(errorBody) as GeminiErrorResponse;
      }
    } catch {
      // Ignore parse errors
    }

    const errorMessage = parsedError?.error?.message || `API returned ${res.status}: ${res.statusText}`;
    throw new Error(errorMessage);
  }

  const data: GeminiGenerateContentResponse = await res.json();
  const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

  if (!summary) {
    throw new Error("Nessun riassunto restituito dal modello");
  }

  return summary;
}
