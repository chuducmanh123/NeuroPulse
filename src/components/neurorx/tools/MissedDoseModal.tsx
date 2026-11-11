"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, HelpCircle, Copy, Check, AlertCircle } from "lucide-react";
import type { DrugRecord, Source } from "@/types/neurorx";
import { SourcePopover } from "../drug/SourcePopover";

interface MissedDoseModalProps {
  drug: DrugRecord;
  sources?: Source[];
  onClose: () => void;
  darkMode?: boolean;
}

export function MissedDoseModal({
  drug,
  sources = [],
  onClose,
  darkMode = false,
}: MissedDoseModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const displayName = drug.tall_man?.value || drug.generic_name;
  const missedDose = drug.tools?.missed_dose;
  const vomiting = drug.tools?.vomiting;

  const handleCopy = async () => {
    const textParts = [
      `[${displayName}] Missed Dose Clinical Instructions:`,
      "",
      missedDose?.value || "No specific missed dose protocol in active sources.",
    ];

    if (vomiting?.value) {
      textParts.push("", `Vomiting / Emesis Protocol:`, vomiting.value);
    }

    textParts.push(
      "",
      "Reference only. Verify against current product labelling. Prescriber is responsible."
    );

    const fullMessage = textParts.join("\n");

    try {
      await navigator.clipboard.writeText(fullMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={`w-full max-w-xl flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          darkMode
            ? "bg-slate-900 border-slate-700 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>❓ Missed Dose Protocol</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official labelling instructions for <strong>{displayName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Missed Dose Card */}
          <div
            className={`p-4 rounded-xl border space-y-2 text-xs leading-relaxed ${
              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Missed Dose Instructions
              </span>
              {missedDose?.refs && (
                <SourcePopover refs={missedDose.refs} sources={sources} darkMode={darkMode} />
              )}
            </div>

            <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line text-sm">
              {missedDose?.value || "No specific missed dose protocol stated in active source documents."}
            </p>
          </div>

          {/* Vomiting / Regurgitation Guidance if available */}
          {vomiting?.value && (
            <div
              className={`p-4 rounded-xl border space-y-2 text-xs leading-relaxed ${
                darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
                <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Vomiting / Regurgitation Guidance
                </span>
                {vomiting?.refs && (
                  <SourcePopover refs={vomiting.refs} sources={sources} darkMode={darkMode} />
                )}
              </div>

              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-line text-sm">
                {vomiting.value}
              </p>
            </div>
          )}

          {/* Clinical Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p>
              <strong>Clinical Reminder:</strong> Patients should never double doses to make up for a missed dose unless specifically directed by the official product labelling.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] leading-tight">
            Reference only. Verify against current product labelling.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-sky-600 hover:bg-sky-700 text-white"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Instructions</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
