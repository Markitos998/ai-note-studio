"use client";

import { ReactNode } from "react";
import { SessionHistoryProvider } from "./SessionHistoryProvider";

export function Providers({ children }: { children: ReactNode }) {
  return <SessionHistoryProvider>{children}</SessionHistoryProvider>;
}

