"use client";

import React, { useState } from "react";
import {
  FileText,
  Upload,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Download,
  Copy,
  Check,
  RefreshCw,
  Info,
  Terminal,
} from "lucide-react";
import { getStoredAdminToken } from "@/utils/clientAuth";
import type { RejectedValue } from "@/lib/neurorx/extractGuard";
import type { ValidationError } from "@/lib/neurorx/validate";
import type { DrugRecord } from "@/types/neurorx";

interface ExtractorPanelProps {
  darkMode?: boolean;
}

export function ExtractorPanel({ darkMode = false }: ExtractorPanelProps) {
  const [drugId, setDrugId] = useState("");
  const [genericName, setGenericName] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [extractedDraft, setExtractedDraft] = useState<DrugRecord | null>(null);
  const [rejectedValues, setRejectedValues] = useState<RejectedValue[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [sourceText, setSourceText] = useState("");
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      // Auto-suggest source_id if empty
      if (!sourceId) {
        const baseName = selected.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
        setSourceId(baseName);
      }
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanDrugId = drugId.trim().toLowerCase();
    const cleanSourceId = sourceId.trim();

    if (!cleanDrugId) {
      setError("Please specify a target Drug ID (e.g. lacosamide)");
      return;
    }
    if (!cleanSourceId) {
      setError("Please specify a Source ID (e.g. fda-lacosamide-2024)");
      return;
    }
    if (!file && !pastedText.trim()) {
      setError("Please upload a source document (.pdf, .docx, .txt) or paste source text.");
      return;
    }

    setLoading(true);
    setExtractedDraft(null);
    setRejectedValues([]);
    setValidationErrors([]);

    try {
      const token = getStoredAdminToken();
      let res: Response;

      if (file) {
        const formData = new FormData();
        formData.append("drug_id", cleanDrugId);
        formData.append("generic_name", genericName.trim() || cleanDrugId);
        formData.append("source_id", cleanSourceId);
        formData.append("file", file);
        if (pastedText.trim()) {
          formData.append("text", pastedText.trim());
        }

        res = await fetch("/api/neurorx/extract", {
          method: "POST",
          headers: {
            "x-admin-token": token || "",
          },
          body: formData,
        });
      } else {
        res = await fetch("/api/neurorx/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": token || "",
          },
          body: JSON.stringify({
            drug_id: cleanDrugId,
            generic_name: genericName.trim() || cleanDrugId,
            source_id: cleanSourceId,
            text: pastedText.trim(),
          }),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to extract drug record from document.");
      }

      setExtractedDraft(json.draft);
      setRejectedValues(json.rejected_values || []);
      setValidationErrors(json.validation_errors || []);
      setSourceText(json.source_text || "");
    } catch (err: any) {
      setError(err?.message || "An error occurred during extraction.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDraft = () => {
    if (!extractedDraft) return;
    const blob = new Blob([JSON.stringify(extractedDraft, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${extractedDraft.id}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDownloadSourceText = () => {
    if (!sourceText) return;
    const blob = new Blob([sourceText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sourceId.trim() || "source"}.txt`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleCopyJson = async () => {
    if (!extractedDraft) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(extractedDraft, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick Extraction Process Guide */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-black flex items-center justify-center shrink-0 text-xs">
              1
            </span>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Select Source Document</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                Upload FDA prescribing information (PDF/DOCX) or paste official monograph text directly.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-black flex items-center justify-center shrink-0 text-xs">
              2
            </span>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Automated AI Extraction</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                Automatically extract dosing regimens, organ adjustments, and verify quotes.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-black flex items-center justify-center shrink-0 text-xs">
              3
            </span>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Review &amp; Ingest</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed block mt-0.5">
                Preview structured JSON, download files, or commit directly to the formulary.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Extraction Form */}
      <form onSubmit={handleExtract} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Generic Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={genericName}
              onChange={(e) => {
                const val = e.target.value;
                setGenericName(val);
                if (!drugId || drugId === genericName.toLowerCase().replace(/[^a-z0-9_-]/g, "-")) {
                  setDrugId(val.toLowerCase().replace(/[^a-z0-9_-]/g, "-"));
                }
              }}
              placeholder="e.g. Lacosamide"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            />
            <span className="text-[10px] text-slate-400">International nonproprietary name</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Drug ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={drugId}
              onChange={(e) => setDrugId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
              placeholder="e.g. lacosamide"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            />
            <span className="text-[10px] text-slate-400">Lowercase slug for data storage</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Source ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              placeholder="e.g. fda-vimpat-2024"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            />
            <span className="text-[10px] text-slate-400">Identifier for source citation file</span>
          </div>
        </div>

        {/* File upload or text paste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Upload Original Document (.pdf, .docx, .txt)
            </label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-sky-500 transition-colors">
              <input
                type="file"
                id="doc-upload"
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,.txt,.md"
                className="hidden"
              />
              <label htmlFor="doc-upload" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
                <Upload className="w-5 h-5 text-sky-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {file ? file.name : "Click to select drug label / monograph file"}
                </span>
                <span className="text-[10px] text-slate-400">Supports PDF, DOCX, TXT up to 50 MB</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Or Paste Document Text Directly (Optional)
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste Prescribing Information highlights or full label text here..."
              rows={4}
              className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>AI is reading and extracting structured data...</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Run AI Extraction &amp; Quote-Guard</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 3. Extraction Output */}
      {extractedDraft && (
        <div className="space-y-4">
          {/* A. Quote mismatch alert if any */}
          {rejectedValues.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>Quote-Guard Verification Notice ({rejectedValues.length} item(s))</span>
              </div>
              <p className="text-amber-700 dark:text-amber-300/90 leading-relaxed">
                The fields below lacked exact verbatim quote matching in the uploaded text, so they were safely defaulted to null (<code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">null</code>) for clinical review:
              </p>
              <div className="divide-y divide-amber-500/20 max-h-48 overflow-y-auto pr-2">
                {rejectedValues.map((rej, idx) => (
                  <div key={idx} className="py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-800 dark:text-amber-300">{rej.path || rej.field}</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">{rej.reason}</span>
                    </div>
                    {rej.attempted_quote && (
                      <p className="text-[11px] font-mono bg-amber-500/10 p-1.5 rounded text-amber-800 dark:text-amber-200 truncate">
                        Attempted quote: &quot;{rej.attempted_quote}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* B. Extracted drug preview */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Draft Generated: {extractedDraft.generic_name} ({extractedDraft.id})
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    Draft
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Identified {extractedDraft.regimens?.length || 0} dosing regimen(s) · Ready for clinical review and verification
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy JSON"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDraft}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {extractedDraft.id}.json</span>
                </button>
                {sourceText && (
                  <button
                    type="button"
                    onClick={handleDownloadSourceText}
                    className="px-3 py-1.5 rounded-xl border border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Source (.txt)</span>
                  </button>
                )}
              </div>
            </div>

            {/* JSON Preview */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3 max-h-96 overflow-y-auto">
              <pre className="text-[11px] font-mono text-slate-800 dark:text-slate-200 whitespace-pre">
                {JSON.stringify(extractedDraft, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
