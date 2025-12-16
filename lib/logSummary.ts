"use client";

import { auth } from "./firebase";
import { saveSummaryRecord } from "./summaries";

export interface LogSummaryParams {
  userId: string | null;
  sessionType: "authenticated" | "anonymous";
  summary: string;
  sourceType: "text" | "file";
  sourceFileName?: string | null;
}

export async function logSummary(params: LogSummaryParams): Promise<void> {
  try {
    const user = auth.currentUser;

    if (user && !user.isAnonymous && params.sessionType === "authenticated") {
      await saveSummaryRecord({
        userId: params.userId,
        sessionType: "authenticated",
        summary: params.summary,
        sourceType: params.sourceType,
        sourceFileName: params.sourceFileName,
      });
    }
  } catch (error: any) {
    // Log error but don't throw - Firestore failures shouldn't break the app
    console.warn("Failed to save summary to Firestore (this is non-critical):", error);
    // Check if it's a NOT_FOUND error (database not created)
    if (error?.code === 5 || error?.message?.includes("NOT_FOUND")) {
      console.warn("Firestore database may not be created. Please create it in Firebase Console.");
    }
  }
}

