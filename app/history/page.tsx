"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { Card } from "@/components/Card";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { getUserSummaries } from "@/lib/summaries";
import { useSessionHistory } from "@/components/SessionHistoryProvider";
import { SummaryRecord } from "@/lib/types";
import jsPDF from "jspdf";

export default function HistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [summaries, setSummaries] = useState<SummaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { summaries: sessionSummaries } = useSessionHistory();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(true);

      if (currentUser && !currentUser.isAnonymous) {
        try {
          const userSummaries = await getUserSummaries(currentUser.uid, 50);
          setSummaries(userSummaries);
        } catch (error: any) {
          console.error("Error loading summaries:", error);
          setSummaries([]);
        }
      } else {
        setSummaries([]);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const displaySummaries = user && !user.isAnonymous ? summaries : sessionSummaries;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const handleDownload = (record: SummaryRecord) => {
    const blob = new Blob([record.summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = record.createdAt.toISOString().split("T")[0];
    link.download = `summary-${dateStr}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = (record: SummaryRecord) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;

    doc.setFontSize(18);
    doc.text("Riassunto", margin, margin);

    doc.setFontSize(10);
    const dateStr = formatDate(record.createdAt);
    doc.text(`Generato il: ${dateStr}`, margin, margin + 10);

    doc.setFontSize(12);
    const lines = doc.splitTextToSize(record.summary, maxWidth);
    let y = margin + 25;

    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    });

    const timestamp = record.createdAt.toISOString().replace(/[:.]/g, "-").slice(0, -5);
    doc.save(`summary-${timestamp}.pdf`);
  };

  return (
    <AppShell>
      <SectionHeader
        title="Cronologia"
        subtitle="Rivedi i tuoi ultimi riassunti"
      />

      {loading ? (
        <Card className="p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-zinc-700/50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </Card>
      ) : displaySummaries.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center text-gray-500">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 border border-zinc-700">
              <svg
                className="w-8 h-8 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-400">Nessun riassunto</p>
            <p className="text-xs mt-1 text-gray-500">
              I riassunti generati appariranno qui
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Nome sorgente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Anteprima riassunto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {displaySummaries.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-800/50 transition-colors duration-200 border-b border-zinc-800/30">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          item.sourceType === "file"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "bg-zinc-700/50 text-gray-300 border border-zinc-600/50"
                        }`}
                      >
                        {item.sourceType === "file" ? "File" : "Testo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
                      {item.sourceFileName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                      {item.summary.substring(0, 100)}
                      {item.summary.length > 100 && "..."}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(item)}
                          className="text-indigo-400 hover:text-indigo-300 inline-flex items-center space-x-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-500/20"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                          <span>TXT</span>
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(item)}
                          className="text-gray-400 hover:text-gray-300 inline-flex items-center space-x-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-700/50"
                        >
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}

