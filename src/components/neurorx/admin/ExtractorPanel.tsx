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
      {/* 1. Mandatory Workflow & Guardrail Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>Extraction Workflow: Commit both files via the repo; then review and run rx:verify.</span>
        </div>
        <p className="text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
          NeuroRx strictly enforces zero hallucination. All AI-extracted fields must have verbatim quotes from the
          uploaded source text. Any value with a missing or fabricated quote is automatically rejected and nulled by the
          Quote-Guard. This tool never writes to the repo directly: download both the draft JSON and source text, commit
          them via git, review against the original document, and run <code className="font-mono bg-amber-500/20 px-1 py-0.5 rounded">npm run rx:verify -- &lt;id&gt; --by &quot;Name&quot;</code>.
        </p>
      </div>

      {/* 2. Extraction Form */}
      <form onSubmit={handleExtract} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Target Drug ID <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={drugId}
              onChange={(e) => setDrugId(e.target.value)}
              placeholder="e.g. lacosamide"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            />
            <span className="text-[10px] text-slate-400">Lowercase slug used for data/neurorx/drugs/&lt;id&gt;.json</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Generic Name
            </label>
            <input
              type="text"
              value={genericName}
              onChange={(e) => setGenericName(e.target.value)}
              placeholder="e.g. lacosamide"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400">Clinical generic name (defaults to drug ID)</span>
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
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
              required
            />
            <span className="text-[10px] text-slate-400">ID in sources.json and sources/&lt;source_id&gt;.txt</span>
          </div>
        </div>

        {/* File upload or text paste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Upload Document (.pdf, .docx, .txt, .md)
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
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-medium text-sky-600 dark:text-sky-400">
                  {file ? file.name : "Select official label or guideline document"}
                </span>
                <span className="text-[10px] text-slate-400">PDF, DOCX, or plain text up to 50 MB</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Or Paste Text Directly (optional)
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste FDA highlights or full prescribing info text here…"
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
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Extracting &amp; Quote-Guarding…</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4" />
                <span>Run Extraction &amp; Quote-Guard</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 3. Extraction Output */}
      {extractedDraft && (
        <div className="space-y-4">
          {/* A. Quote-Guard Rejected Values List */}
          {rejectedValues.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-800 dark:text-rose-300">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-600" />
                <span>Rejected Values ({rejectedValues.length}) — Blocked by Quote-Guard</span>
              </div>
              <p className="text-rose-700 dark:text-rose-300/90">
                The following fields contained quotes not found verbatim in the provided text. To enforce zero
                hallucination, their clinical values were automatically set to <code className="font-mono bg-rose-500/20 px-1 py-0.5 rounded">null</code>:
              </p>
              <div className="divide-y divide-rose-500/20 max-h-60 overflow-y-auto pr-2">
                {rejectedValues.map((rej, idx) => (
                  <div key={idx} className="py-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-800 dark:text-rose-300">{rej.path || rej.field}</span>
                      <span className="text-[10px] text-rose-600 dark:text-rose-400">{rej.reason}</span>
                    </div>
                    {rej.attempted_quote && (
                      <p className="text-[11px] font-mono bg-rose-500/10 p-1.5 rounded text-rose-700 dark:text-rose-200 truncate">
                        Quote: &quot;{rej.attempted_quote}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* B. Schema Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
                <span>Schema Validation Warnings ({validationErrors.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300/90 max-h-40 overflow-y-auto">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>
                    <span className="font-mono font-bold">{err.path}:</span> {err.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* C. Verified Draft Summary & Actions */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                    Draft Generated: {extractedDraft.generic_name} ({extractedDraft.id})
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    draft (locked)
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Extracted {extractedDraft.regimens?.length || 0} regimen(s) · Status: {extractedDraft.status} · Verification: pending human review
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy JSON"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDraft}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {extractedDraft.id}.json</span>
                </button>
                {sourceText && (
                  <button
                    type="button"
                    onClick={handleDownloadSourceText}
                    className="px-3 py-1.5 rounded-xl border border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 font-bold text-xs flex items-center gap-1 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download {sourceId}.txt</span>
                  </button>
                )}
              </div>
            </div>

            {/* Terminal Instructions */}
            <div className="p-3 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>npm run rx:verify -- {extractedDraft.id} --by &quot;Your Name&quot;</span>
              </div>
              <span className="text-[10px] text-slate-400">Run in terminal after placing files in data/neurorx/</span>
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
