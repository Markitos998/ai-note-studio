"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { SummaryRecord } from "@/lib/types";

interface SessionHistoryContextType {
  summaries: SummaryRecord[];
  addSummary: (summary: Omit<SummaryRecord, "id" | "createdAt">) => void;
  clearHistory: () => void;
}

const SessionHistoryContext = createContext<SessionHistoryContextType | undefined>(
  undefined
);

const STORAGE_KEY = "session_history_summaries";

export function SessionHistoryProvider({ children }: { children: ReactNode }) {
  const [summaries, setSummaries] = useState<SummaryRecord[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const summariesWithDates = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
        }));
        setSummaries(summariesWithDates);
      } catch (error) {
        console.error("Error loading session history from storage:", error);
      }
    }
  }, []);

  useEffect(() => {
    if (summaries.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
      } catch (error) {
        console.error("Error saving session history to storage:", error);
      }
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [summaries]);

  const addSummary = (summary: Omit<SummaryRecord, "id" | "createdAt">) => {
    const newRecord: SummaryRecord = {
      ...summary,
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };
    setSummaries((prev) => [newRecord, ...prev]);
  };

  const clearHistory = () => {
    setSummaries([]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SessionHistoryContext.Provider value={{ summaries, addSummary, clearHistory }}>
      {children}
    </SessionHistoryContext.Provider>
  );
}

export function useSessionHistory() {
  const context = useContext(SessionHistoryContext);
  if (context === undefined) {
    throw new Error("useSessionHistory must be used within a SessionHistoryProvider");
  }
  return context;
}

