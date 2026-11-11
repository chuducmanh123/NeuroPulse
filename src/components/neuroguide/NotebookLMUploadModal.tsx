"use client";

import React, { useState, useRef, useMemo } from "react";
import { parseNotebookLMContent } from "@/lib/neuroguide/notebooklmParser";
import { detectSociety } from "@/lib/neuroguide/pubmedDiscovery";
import { GuidelineDoc, SubspecialtyType, NEUROLOGY_SUBSPECIALTIES } from "@/types/neuroguide";
import { getAdminHeaders, getStoredAdminToken } from "@/utils/clientAuth";

interface NotebookLMUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: GuidelineDoc) => void;
  darkMode: boolean;
  existingGuidelines?: GuidelineDoc[];
}

export function NotebookLMUploadModal({
  isOpen,
  onClose,
  onSuccess,
  darkMode,
  existingGuidelines,
}: NotebookLMUploadModalProps) {
  const [activeTab, setActiveTab] = useState<"file" | "paste">("paste");
  const [rawText, setRawText] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingFile, setIsParsingFile] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showExtractedText, setShowExtractedText] = useState<boolean>(false);
  const [isAiExtracting, setIsAiExtracting] = useState<boolean>(false);

  // Editable overrides
  const [overrideTitle, setOverrideTitle] = useState<string>("");
  const [overrideSociety, setOverrideSociety] = useState<string>("");
  const [overrideYear, setOverrideYear] = useState<string>("");
  const [overrideSubspecialty, setOverrideSubspecialty] = useState<SubspecialtyType>("Stroke");

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compute live parsed preview whenever text changes
  const parsedPreview = useMemo(() => {
    if (!rawText || rawText.trim().length < 30) return null;
    try {
      return parseNotebookLMContent(rawText, {
        title: overrideTitle || undefined,
        society: overrideSociety || undefined,
        year: overrideYear ? parseInt(overrideYear, 10) : undefined,
        subspecialty: overrideSubspecialty,
      });
    } catch {
      return null;
    }
  }, [rawText, overrideTitle, overrideSociety, overrideYear, overrideSubspecialty]);

  const candidateTitle = (overrideTitle || parsedPreview?.doc.title || "").trim();

  // Real-time duplicate check with existing guidelines in repository
  const duplicateMatch = useMemo(() => {
    if (!candidateTitle || !existingGuidelines || existingGuidelines.length === 0) return null;
    const candNorm = candidateTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
    const candTrim = candidateTitle.toLowerCase();
    return (
      existingGuidelines.find((g) => {
        const gNorm = (g.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const gTrim = (g.title || "").trim().toLowerCase();
        return gNorm === candNorm || gTrim === candTrim;
      }) || null
    );
  }, [candidateTitle, existingGuidelines]);

  if (!isOpen) return null;

  const processUploadedFile = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setSuccessMessage(null);

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isBinaryDoc = ["doc", "docx", "pdf"].includes(ext);

    if (isBinaryDoc) {
      setIsParsingFile(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/neuroguide/parse-document", {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || `Could not extract content from .${ext} file. Please try again.`);
        }

        setRawText(data.text);
        const detectedSoc = detectSociety(file.name, (data.text || "").slice(0, 3000));
        if (detectedSoc && detectedSoc !== "Other" && !overrideSociety) {
          setOverrideSociety(detectedSoc);
        }
        setSuccessMessage(`Successfully extracted content from "${file.name}" (${(data.charCount || data.text.length).toLocaleString()} characters).`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error processing document file";
        setErrorMessage(msg);
      } finally {
        setIsParsingFile(false);
      }
    } else {
      // Plain text, Markdown, CSV, JSON
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        setRawText(text);
        const detectedSoc = detectSociety(file.name, text.slice(0, 3000));
        if (detectedSoc && detectedSoc !== "Other" && !overrideSociety) {
          setOverrideSociety(detectedSoc);
        }
      };
      reader.onerror = () => {
        setErrorMessage("Could not read file. Please try again or paste text directly.");
      };
      reader.readAsText(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  const handleAiExtraction = async () => {
    if (!rawText || rawText.trim().length < 20) return;
    setIsAiExtracting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/neuroguide/ai-extract-guideline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          title: overrideTitle || parsedPreview?.doc.title,
          society: overrideSociety || parsedPreview?.doc.society,
          year: overrideYear ? parseInt(overrideYear, 10) : parsedPreview?.doc.year,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.formattedText) {
        throw new Error(data?.error || "Could not extract recommendations via AI. Please try again.");
      }

      setRawText(data.formattedText);
      setShowExtractedText(true);
      setSuccessMessage("AI successfully structured text into standardized clinical recommendations!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error during AI extraction";
      setErrorMessage(msg);
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText || rawText.trim().length < 20) {
      setErrorMessage("Please upload a document (.md, .txt, .docx, .doc, .pdf) or paste NotebookLM summary text.");
      return;
    }

    if (duplicateMatch) {
      setErrorMessage(
        `Guideline title "${candidateTitle}" duplicates an existing guideline: "${duplicateMatch.title}" (${duplicateMatch.year || ""}). Existing guidelines are not overwritten. Please rename or specify year/version.`
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const token = getStoredAdminToken();

    try {
      const res = await fetch("/api/neuroguide/import-notebooklm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(token),
        },
        body: JSON.stringify({
          text: rawText,
          fileName: selectedFile?.name || "notebooklm-guideline.md",
          title: overrideTitle || undefined,
          society: overrideSociety || undefined,
          year: overrideYear ? parseInt(overrideYear, 10) : undefined,
          subspecialty: overrideSubspecialty,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Error processing guideline from NotebookLM.");
      }

      try {
        const gId = String(data.guideline?.id || "").toLowerCase().trim();
        const normTitle = String(data.guideline?.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const localDel: string[] = JSON.parse(localStorage.getItem("neuroguide_deleted_ids") || "[]");
        const filteredDel = localDel.filter((d) => {
          const ld = String(d || "").toLowerCase().trim();
          return ld !== gId && ld !== normTitle;
        });
        localStorage.setItem("neuroguide_deleted_ids", JSON.stringify(filteredDel));
        localStorage.removeItem("neuroguide_swr_store_v3");
      } catch {}

      setSuccessMessage(
        `🎉 Successfully generated Practice Guideline "${data.guideline.title}" with ${data.stats?.totalRecommendations || 0} recommendations!`
      );

      setTimeout(() => {
        onSuccess(data.guideline);
        onClose();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div
        className={`relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl transition-all ${
          darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-xl text-white shadow-md">
              📝
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Import &amp; Generate Practice Guideline from NotebookLM
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  AI + Rule-based Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Parses COR/LOE recommendation tables, cited clinical trials, and creates an official clinical guideline document
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab switch & Quick Actions */}
        <div className="px-4 sm:px-5 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-xs font-bold">
            <button
              onClick={() => setActiveTab("paste")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "paste"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📋 Paste Text / Markdown Table
            </button>
            <button
              onClick={() => setActiveTab("file")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "file"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📁 Upload File (.md, .txt, .doc, .docx, .pdf)
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(rawText || selectedFile) && (
              <button
                type="button"
                onClick={() => {
                  setRawText("");
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === "file" ? (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    processUploadedFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-amber-500 bg-amber-500/10 scale-[1.01]"
                    : selectedFile
                    ? "border-amber-500 bg-amber-500/5"
                    : darkMode
                    ? "border-slate-700 hover:border-amber-500 bg-slate-800/40"
                    : "border-slate-300 hover:border-amber-500 bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".md,.txt,.csv,.json,.doc,.docx,.pdf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-amber-500/10 flex items-center justify-center text-2xl">
                  {isParsingFile ? (
                    <span className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                  ) : selectedFile ? (
                    selectedFile.name.toLowerCase().endsWith(".pdf")
                      ? "📕"
                      : selectedFile.name.toLowerCase().match(/\.docx?$/)
                      ? "📘"
                      : "📄"
                  ) : (
                    "☁️"
                  )}
                </div>
                {isParsingFile ? (
                  <div>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      Reading and extracting data from {selectedFile?.name}...
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Analyzing tables and clinical recommendations</p>
                  </div>
                ) : selectedFile ? (
                  <div>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click or drag another file to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-bold">Drag &amp; drop NotebookLM / document file or click to browse</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports Word (.docx, .doc), PDF (.pdf), Markdown (.md), Text (.txt), CSV (.csv)
                    </p>
                  </div>
                )}
              </div>

              {selectedFile && rawText && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>📄</span>
                      <span>Extracted Text ({rawText.length.toLocaleString()} characters)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowExtractedText(!showExtractedText)}
                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      {showExtractedText ? "Collapse ▲" : "View & Edit ▼"}
                    </button>
                  </div>
                  {showExtractedText && (
                    <div className="mt-2.5 space-y-1.5">
                      <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        rows={7}
                        className={`w-full p-2.5 text-xs font-mono rounded-lg border outline-none transition-all ${
                          darkMode
                            ? "bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-500"
                            : "bg-white border-slate-300 text-slate-900 focus:border-amber-500"
                        }`}
                        placeholder="Extracted text content from file..."
                      />
                      <p className="text-[10px] text-slate-400">
                        💡 You can edit the text directly above; the recommendation table below will automatically update.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Markdown Content or Table from NotebookLM:
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste NotebookLM summary or markdown table here... (Include title and recommendation table | Domain | Recommendation | COR/LOE | Evidence |)"
                rows={8}
                className={`w-full p-3.5 text-xs font-mono rounded-xl border outline-none transition-all ${
                  darkMode
                    ? "bg-slate-950 border-slate-700 text-slate-200 focus:border-amber-500"
                    : "bg-slate-50 border-slate-300 text-slate-900 focus:border-amber-500"
                }`}
              />
            </div>
          )}

          {/* Metadata Customization Inputs */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              Guideline Metadata (Auto-detected &amp; Customizable):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-500">Guideline Title:</label>
                  {duplicateMatch && (
                    <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider animate-pulse">
                      Duplicate title exists!
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={overrideTitle || parsedPreview?.doc.title || ""}
                  onChange={(e) => setOverrideTitle(e.target.value)}
                  placeholder="e.g. 2023 AHA/ASA Guideline for aSAH"
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none transition-all ${
                    duplicateMatch
                      ? "border-rose-500 bg-rose-500/5 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/40"
                      : darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-200"
                      : "bg-white border-slate-300 text-slate-800"
                  }`}
                />
                {duplicateMatch && (
                  <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-[11px] font-medium flex items-start gap-1.5">
                    <span className="shrink-0 text-xs">⚠️</span>
                    <span>
                      <strong>Exact duplicate of existing guideline:</strong> &quot;{duplicateMatch.title}&quot; ({duplicateMatch.year}). Existing guidelines are not overwritten. Please rename or adjust year/version before saving.
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Medical Society:</label>
                <input
                  type="text"
                  value={overrideSociety || parsedPreview?.doc.society || ""}
                  onChange={(e) => setOverrideSociety(e.target.value)}
                  placeholder="AHA/ASA, ESO, AAN..."
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none ${
                    darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Publication Year:</label>
                <input
                  type="number"
                  value={overrideYear || (parsedPreview?.doc.year ? String(parsedPreview.doc.year) : "2023")}
                  onChange={(e) => setOverrideYear(e.target.value)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none ${
                    darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Neurology Subspecialty:</label>
                <select
                  value={overrideSubspecialty}
                  onChange={(e) => setOverrideSubspecialty(e.target.value as SubspecialtyType)}
                  className={`w-full px-2.5 py-1.5 text-xs rounded-lg border outline-none ${
                    darkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                  }`}
                >
                  {NEUROLOGY_SUBSPECIALTIES.filter((s) => s !== "All Subspecialties").map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Live Analysis Preview */}
          {parsedPreview && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">Live Extracted Preview:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {parsedPreview.stats.totalRecommendations} Recommendations Extracted
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1 text-[10.5px]">
                  {Object.entries(parsedPreview.stats.corBreakdown).map(([cor, count]) => {
                    let badgeClass = "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
                    if (cor.includes("1")) badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
                    else if (cor.includes("2a")) badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
                    else if (cor.includes("2b")) badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
                    else if (cor.includes("Harm") || cor.includes("3")) badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
                    return (
                      <span key={cor} className={`px-2 py-0.5 rounded-md font-bold ${badgeClass}`}>
                        {cor}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Scrollable table preview */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className={`sticky top-0 text-[10.5px] uppercase tracking-wider font-black ${
                    darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
                  }`}>
                    <tr>
                      <th className="p-2 border-b border-slate-200 dark:border-slate-700 w-32">Domain / Topic</th>
                      <th className="p-2 border-b border-slate-200 dark:border-slate-700 w-28">COR / LOE Grade</th>
                      <th className="p-2 border-b border-slate-200 dark:border-slate-700">Recommendation Statement</th>
                      <th className="p-2 border-b border-slate-200 dark:border-slate-700 w-44">Trials / Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {parsedPreview.doc.allPracticeChanges.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-500 dark:text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2 py-2">
                            <span className="text-3xl">📋</span>
                            <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                              No valid recommendation table or list detected yet
                            </p>
                            <p className="text-[11.5px] max-w-md text-slate-500 dark:text-slate-400">
                              The document may be in freeform text format. Click <strong className="text-amber-600 dark:text-amber-400">Extract with AI (Gemini)</strong> below to automatically parse PICO questions, COR/LOE grades, and structured recommendation tables.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {parsedPreview.doc.allPracticeChanges.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                          <span className="text-[10px] text-slate-400 block">{rec.category}</span>
                          {rec.topic}
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            rec.currentGrade.includes("Harm")
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              : rec.currentGrade.includes("No Benefit")
                              ? "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30"
                              : rec.currentGrade.includes("Class 1")
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                          }`}>
                            {rec.currentGrade}
                          </span>
                        </td>
                        <td className="p-2 text-slate-800 dark:text-slate-200 leading-relaxed text-[11.5px]">
                          {rec.currentText}
                        </td>
                        <td className="p-2 text-[10.5px] text-slate-500 dark:text-slate-400">
                          {rec.drivingTrials?.slice(0, 2).join(", ")}
                          {(rec.drivingTrials?.length || 0) > 2 ? "..." : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Extraction Assist Callout when 0 recommendations detected */}
          {rawText && (parsedPreview?.stats.totalRecommendations || 0) === 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">✨</span>
                <div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    Automated Recommendation Extraction via AI
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Use Gemini AI to scan the entire text and build a complete structured PICO / COR-LOE recommendation table.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAiExtraction}
                disabled={isAiExtracting}
                className="w-full sm:w-auto px-4 py-2 whitespace-nowrap rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white font-black text-xs shadow-md hover:from-amber-600 hover:to-rose-600 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isAiExtracting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Extracting via AI...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>Extract with AI (Gemini)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <span>✅</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !rawText || (parsedPreview?.stats.totalRecommendations || 0) === 0 || Boolean(duplicateMatch)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm ${
                isLoading || !rawText || (parsedPreview?.stats.totalRecommendations || 0) === 0 || Boolean(duplicateMatch)
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:from-amber-600 hover:to-rose-600 shadow-md cursor-pointer"
              }`}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating &amp; Persisting Guideline...</span>
                </>
              ) : duplicateMatch ? (
                <>
                  <span>⚠️</span>
                  <span>Duplicate guideline title (Rename to save)</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Generate Practice Guideline ({parsedPreview?.stats.totalRecommendations || 0} Recommendations)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
