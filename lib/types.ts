export type SummaryRecord = {
  id: string;
  userId: string | null;
  sessionType: "authenticated" | "anonymous";
  summary: string;
  sourceType: "text" | "file";
  sourceFileName?: string | null;
  createdAt: Date;
};

