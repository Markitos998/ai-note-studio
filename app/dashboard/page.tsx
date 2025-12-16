"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { fetchSummaries, Summary } from "@/lib/summaries";
import { logSummary } from "@/lib/logSummary";
import { useSessionHistory } from "@/components/SessionHistoryProvider";
import jsPDF from "jspdf";

type TabType = "text" | "files";

export default function DashboardPage() {
  const { addSummary } = useSessionHistory();
  const [activeTab, setActiveTab] = useState<TabType>("text");
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<{
    summary: string;
    originalFileName: string;
    mimeType: string;
  } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [summariesHistory, setSummariesHistory] = useState<Summary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setSummary("");

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, userId: user?.uid || null }),
      });

      if (!res.ok) {
        throw new Error("Errore durante il riassunto");
      }

      const data = await res.json();

      // IMPORTANT: the API must return { summary: string }
      if (!data.summary || typeof data.summary !== "string") {
        throw new Error("Formato risposta non valido");
      }

      setSummary(data.summary);
      
      const isAnonymous = user?.isAnonymous ?? false;
      if (isAnonymous) {
        addSummary({
          userId: null,
          sessionType: "anonymous",
          summary: data.summary,
          sourceType: "text",
          sourceFileName: null,
        });
      } else {
        await logSummary({
          userId: user?.uid || null,
          sessionType: "authenticated",
          summary: data.summary,
          sourceType: "text",
          sourceFileName: null,
        });
        if (user) {
          loadSummaries(user.uid);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Errore imprevisto");
      setSummary("");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    setError(null);
    setSummary("");
    setUploadResult(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (user?.uid) {
        formData.append("userId", user.uid);
      }

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch("/api/upload-and-summarize", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Errore dalla API");
      }
      
      // Check if the response contains an error
      if (data.error) {
        throw new Error(data.error || "Errore nella generazione del riassunto");
      }
      
      // Validate that summary exists
      if (!data.summary || typeof data.summary !== "string") {
        console.error("Invalid response from API:", data);
        throw new Error("Il riassunto non è stato generato correttamente");
      }
      
      setSummary(data.summary);
      setUploadResult({
        summary: data.summary,
        originalFileName: data.originalFileName || selectedFile.name,
        mimeType: data.mimeType || selectedFile.type,
      });
      
      const isAnonymous = user?.isAnonymous ?? false;
      if (isAnonymous) {
        addSummary({
          userId: null,
          sessionType: "anonymous",
          summary: data.summary,
          sourceType: "file",
          sourceFileName: data.originalFileName || selectedFile.name,
        });
      } else {
        await logSummary({
          userId: user?.uid || null,
          sessionType: "authenticated",
          summary: data.summary,
          sourceType: "file",
          sourceFileName: data.originalFileName || selectedFile.name,
        });
        if (user) {
          loadSummaries(user.uid);
        }
      }
    } catch (err: any) {
      console.error("Error in handleFileSubmit:", err);
      setError(err.message ?? "Errore imprevisto");
      setSummary(""); // Clear summary on error
    } finally {
      setLoading(false);
      // Don't reset upload progress immediately - keep it at 100% briefly to show completion
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleClear = () => {
    setText("");
    setSummary("");
    setError(null);
    setSelectedFile(null);
    setUploadResult(null);
    setUploadProgress(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setError(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadSummaries(currentUser.uid);
      } else {
        setSummariesHistory([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadSummaries = async (userId: string) => {
    setLoadingHistory(true);
    try {
      const summaries = await fetchSummaries({ userId, limit: 10 });
      setSummariesHistory(summaries);
    } catch (err: any) {
      console.error("Error loading summaries:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDownload = (summaryData: Summary) => {
    const blob = new Blob([summaryData.summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const dateStr = summaryData.createdAt.toISOString().split("T")[0];
    link.download = `summary-${dateStr}.txt`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("it-IT", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const downloadBlob = (filename: string, mimeType: string, content: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxt = () => {
    if (!summary) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    downloadBlob(`summary-${timestamp}.txt`, "text/plain;charset=utf-8", summary);
  };

  const handleDownloadMd = () => {
    if (!summary) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    downloadBlob(`summary-${timestamp}.md`, "text/markdown;charset=utf-8", summary);
  };

  const handleDownloadPdf = () => {
    if (!summary) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    
    doc.setFontSize(18);
    doc.text("Riassunto", margin, margin);
    
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    doc.text(`Generato il: ${dateStr}`, margin, margin + 10);
    
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(summary, maxWidth);
    let y = margin + 25;
    
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    });
    
    doc.save(`summary-${timestamp}.pdf`);
  };

  const characterCount = text.length;
  const fileSize = selectedFile ? (selectedFile.size / 1024).toFixed(2) : null;

  return (
    <AppShell>
      <SectionHeader
        title="Dashboard"
        subtitle="Trasforma i tuoi appunti in riassunti chiari e concisi"
        badge="AI-powered"
      />

      <div className="mb-6">
        <div className="border-b border-zinc-800/50">
          <nav className="flex space-x-1" aria-label="Tabs">
            <button
              onClick={() => {
                setActiveTab("text");
                handleClear();
              }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                activeTab === "text"
                  ? "text-indigo-400 bg-zinc-800/80 backdrop-blur-sm border-b-2 border-indigo-500"
                  : "text-gray-400 hover:text-gray-200 hover:bg-zinc-800/50"
              }`}
            >
              Input Testo
            </button>
            <button
              onClick={() => {
                setActiveTab("files");
                handleClear();
              }}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all duration-200 ${
                activeTab === "files"
                  ? "text-indigo-400 bg-zinc-800/80 backdrop-blur-sm border-b-2 border-indigo-500"
                  : "text-gray-400 hover:text-gray-200 hover:bg-zinc-800/50"
              }`}
            >
              Files
            </button>
          </nav>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-xl font-medium text-white mb-1">
              {activeTab === "text" ? "Input Note" : "Upload File"}
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              {activeTab === "text"
                ? "Incolla note, riunioni, pensieri grezzi"
                : "Carica file .txt, .md, .pdf, .jpg, .jpeg, .png"}
            </p>
          </div>

          {activeTab === "text" ? (
            <form onSubmit={handleTextSubmit} className="space-y-5">
              <div className="relative">
                <textarea
                  className="w-full h-96 px-4 py-3 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-2xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500/50 transition-all duration-200 resize-none text-white placeholder:text-gray-500 leading-relaxed"
                  placeholder="Incolla qui le tue note..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                  disabled={loading}
                />
                {text && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-zinc-700 rounded-lg transition-all duration-200"
                    aria-label="Clear input"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {characterCount.toLocaleString()} caratteri
                </span>
                <PrimaryButton
                  type="submit"
                  disabled={loading || !text.trim()}
                >
                  {loading ? (
                    <span className="flex items-center space-x-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Generazione...</span>
                    </span>
                  ) : (
                    "Genera riassunto"
                  )}
                </PrimaryButton>
              </div>
            </form>
          ) : (
            <form onSubmit={handleFileSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="file-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-zinc-700/50 rounded-2xl cursor-pointer bg-zinc-800/30 hover:bg-zinc-800/50 transition-all duration-200"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-12 h-12 mb-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="mb-2 text-sm text-gray-300">
                      <span className="font-medium">Clicca per caricare</span> o
                      trascina il file qui
                    </p>
                    <p className="text-xs text-gray-400">
                      TXT, MD, PDF, JPG, PNG (MAX. 10MB)
                    </p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".txt,.md,.pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </label>

                {selectedFile && (
                  <div className="mt-4 p-4 bg-zinc-800/50 backdrop-blur-sm rounded-xl border border-zinc-700/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-500/30">
                          <svg
                            className="w-6 h-6 text-indigo-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {fileSize} KB · {selectedFile.type || "Unknown type"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setError(null);
                          setUploadResult(null);
                        }}
                        className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-zinc-700 rounded-lg transition-all duration-200"
                        aria-label="Remove file"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {loading && uploadProgress > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                      <span>Upload in corso...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-zinc-700/50 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <PrimaryButton
                type="submit"
                disabled={loading || !selectedFile}
                className="w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Upload & Summarize...</span>
                  </span>
                ) : (
                  "Upload & Summarize"
                )}
              </PrimaryButton>
            </form>
          )}

          {error && (
            <div className="mt-5 p-4 bg-red-900/30 backdrop-blur-sm border border-red-800/50 rounded-xl">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-xl font-medium text-white mb-1">Riassunto</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">Risultato generato</p>
          </div>

          <div className="h-96 overflow-y-auto mb-5">
            {loading && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">Sto generando il riassunto...</p>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-4 bg-zinc-700/50 rounded-lg animate-pulse"
                    style={{
                      width: `${Math.random() * 40 + 60}%`,
                    }}
                  />
                ))}
              </div>
            )}

            {error && !loading && (
              <p className="text-sm text-red-300">{error}</p>
            )}

            {!loading && !error && summary && (
              <p className="text-base text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            )}

            {!loading && !error && !summary && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-sm text-zinc-400">
                  Nessun riassunto ancora. Incolla un testo e premi il pulsante per generare il riassunto.
                </p>
              </div>
            )}
          </div>

          {summary && (
            <div className="pt-5 border-t border-zinc-800/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <PrimaryButton onClick={handleDownloadTxt} disabled={!summary}>
                  <span className="flex items-center space-x-2">
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
                    <span>Download .txt</span>
                  </span>
                </PrimaryButton>

                <div className="flex gap-2">
                  <SecondaryButton
                    onClick={handleDownloadMd}
                    disabled={!summary}
                  >
                    .md
                  </SecondaryButton>
                  <SecondaryButton
                    onClick={handleDownloadPdf}
                    disabled={!summary}
                  >
                    .pdf
                  </SecondaryButton>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {user && summariesHistory.length > 0 && (
        <Card className="p-6">
          <div className="mb-5">
            <h2 className="text-2xl font-medium text-white mb-1">
              Recent Summaries
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Ultimi 10 riassunti generati
            </p>
          </div>

          {loadingHistory ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-zinc-700/50 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {summariesHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-zinc-800/50 transition-all duration-200 group border border-zinc-800/50"
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          item.type === "file"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : "bg-zinc-700/50 text-gray-300 border border-zinc-600/50"
                        }`}
                      >
                        {item.type === "file" ? "File" : "Testo"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {item.sourceFileName || formatDate(item.createdAt)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <p className="text-xs text-gray-500 max-w-xs truncate">
                        {item.summary.substring(0, 60)}...
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(item)}
                    className="ml-4 p-2 text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                  >
                    <svg
                      className="w-5 h-5"
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
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </AppShell>
  );
}
