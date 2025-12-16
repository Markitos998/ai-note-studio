import { db } from "./firebase";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit as limitQuery,
  getDocs,
  Timestamp,
  QueryConstraint,
  serverTimestamp,
} from "firebase/firestore";
import { SummaryRecord } from "./types";

export type SummaryType = "text" | "file";

export interface Summary {
  id?: string;
  userId: string;
  type: SummaryType;
  originalText: string;
  summary: string;
  sourceFileName?: string | null;
  createdAt: Date;
}

export interface SummaryDocument {
  userId: string;
  type: SummaryType;
  originalText: string;
  summary: string;
  sourceFileName?: string | null;
  createdAt: Timestamp;
}

export interface SaveSummaryParams {
  userId: string;
  type: SummaryType;
  originalText: string;
  summary: string;
  sourceFileName?: string | null;
}

export async function saveSummary(params: SaveSummaryParams): Promise<string> {
  try {
    const summaryData: Omit<SummaryDocument, "id"> = {
      userId: params.userId,
      type: params.type,
      originalText: params.originalText,
      summary: params.summary,
      sourceFileName: params.sourceFileName ?? null,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, "summaries"), summaryData);
    return docRef.id;
  } catch (error: any) {
    console.error("Error saving summary to Firestore:", error);
    throw new Error(`Failed to save summary: ${error.message}`);
  }
}

export interface FetchSummariesParams {
  userId: string;
  type?: SummaryType;
  limit?: number;
}

export async function fetchSummaries(
  params: FetchSummariesParams
): Promise<Summary[]> {
  try {
    const constraints: QueryConstraint[] = [where("userId", "==", params.userId)];

    if (params.type) {
      constraints.push(where("type", "==", params.type));
    }

    // Try to order by createdAt, but if documents are missing this field, 
    // Firestore will exclude them from results (which is acceptable)
    constraints.push(orderBy("createdAt", "desc"));

    if (params.limit && params.limit > 0) {
      constraints.push(limitQuery(params.limit));
    }

    const q = query(collection(db, "summaries"), ...constraints);
    const querySnapshot = await getDocs(q);

    const summaries: Summary[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as SummaryDocument;
      
      // Safely handle createdAt field - some existing documents may not have it or it may be null
      let createdAt: Date;
      try {
        if (
          data.createdAt != null &&
          typeof data.createdAt === "object" &&
          "toDate" in data.createdAt &&
          typeof (data.createdAt as Timestamp).toDate === "function"
        ) {
          createdAt = (data.createdAt as Timestamp).toDate();
        } else {
          throw new Error("createdAt is null or invalid");
        }
      } catch (error) {
        // Fallback for documents without createdAt field or with null/invalid createdAt
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `Document ${doc.id} is missing or has invalid createdAt field. Using fallback date.`,
            error
          );
        }
        createdAt = new Date(0); // Use epoch as fallback
      }
      
      summaries.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        originalText: data.originalText,
        summary: data.summary,
        sourceFileName: data.sourceFileName ?? null,
        createdAt,
      });
    });

    return summaries;
  } catch (error: any) {
    console.error("Error fetching summaries from Firestore:", error);
    // If Firestore database doesn't exist, return empty array instead of throwing
    if (error?.code === 5 || error?.message?.includes("NOT_FOUND")) {
      console.warn("Firestore database may not be created. Returning empty summaries list.");
      return [];
    }
    throw new Error(`Failed to fetch summaries: ${error.message}`);
  }
}

export interface SummaryRecordDocument {
  userId: string | null;
  sessionType: "authenticated" | "anonymous";
  summary: string;
  sourceType: "text" | "file";
  sourceFileName?: string | null;
  createdAt: Timestamp | ReturnType<typeof serverTimestamp>;
}

export async function saveSummaryRecord(
  record: Omit<SummaryRecord, "id" | "createdAt">
): Promise<void> {
  try {
    const summaryData: Omit<SummaryRecordDocument, "id"> = {
      userId: record.userId,
      sessionType: record.sessionType,
      summary: record.summary,
      sourceType: record.sourceType,
      sourceFileName: record.sourceFileName ?? null,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "summaries"), summaryData);
  } catch (error: any) {
    console.error("Error saving summary record to Firestore:", error);
    // If Firestore database doesn't exist, log warning but don't throw
    if (error?.code === 5 || error?.message?.includes("NOT_FOUND")) {
      console.warn("Firestore database may not be created. Skipping save (non-critical).");
      return; // Silently fail - this is called from logSummary which already handles errors
    }
    throw new Error(`Failed to save summary record: ${error.message}`);
  }
}

function isValidFirebaseUID(uid: string): boolean {
  // Firebase UIDs are typically 28 characters alphanumeric
  return /^[a-zA-Z0-9]{20,}$/.test(uid);
}

export async function getUserSummaries(
  userId: string,
  limitCount: number = 20
): Promise<SummaryRecord[]> {
  // Validate userId format
  if (!isValidFirebaseUID(userId)) {
    throw new Error("Invalid userId format");
  }

  // Validate limit count
  if (limitCount < 1 || limitCount > 100) {
    limitCount = 20; // Default to safe limit
  }

  try {
    const constraints: QueryConstraint[] = [
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    ];

    if (limitCount > 0) {
      constraints.push(limitQuery(limitCount));
    }

    const q = query(collection(db, "summaries"), ...constraints);
    const querySnapshot = await getDocs(q);

    const summaries: SummaryRecord[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as SummaryRecordDocument;
      
      // Safely handle createdAt field - some existing documents may not have it or it may be null
      let createdAt: Date;
      try {
        if (
          data.createdAt != null &&
          typeof data.createdAt === "object" &&
          "toDate" in data.createdAt &&
          typeof (data.createdAt as Timestamp).toDate === "function"
        ) {
          createdAt = (data.createdAt as Timestamp).toDate();
        } else {
          throw new Error("createdAt is null or invalid");
        }
      } catch (error) {
        // Fallback for documents without createdAt field or with null/invalid createdAt
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `Document ${doc.id} is missing or has invalid createdAt field. Using fallback date.`,
            error
          );
        }
        createdAt = new Date(0); // Use epoch as fallback
      }
      
      summaries.push({
        id: doc.id,
        userId: data.userId,
        sessionType: data.sessionType,
        summary: data.summary,
        sourceType: data.sourceType,
        sourceFileName: data.sourceFileName ?? null,
        createdAt,
      });
    });

    return summaries;
  } catch (error: any) {
    console.error("Error fetching user summaries from Firestore:", error);
    // If Firestore database doesn't exist, return empty array instead of throwing
    if (error?.code === 5 || error?.message?.includes("NOT_FOUND")) {
      console.warn("Firestore database may not be created. Returning empty summaries list.");
      return [];
    }
    throw new Error(`Failed to fetch user summaries: ${error.message}`);
  }
}

