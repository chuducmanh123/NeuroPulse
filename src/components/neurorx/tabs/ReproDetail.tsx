"use client";

import React, { useEffect, useRef } from "react";
import { X, Baby, HeartHandshake, ShieldAlert, Sparkles, AlertCircle } from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import type { Source, Sourced } from "@/types/neurorx";
import { SourcePopover } from "../drug/SourcePopover";

interface ReproDetailProps {
  drugItem: DrugWithEffectiveStatus;
  sources?: Source[];
  onClose: () => void;
  darkMode?: boolean;
}

export function ReproDetail({
  drugItem,
  sources = [],
  onClose,
  darkMode = false,
}: ReproDetailProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { drug, effectiveStatus } = drugItem;
  const isDraft = effectiveStatus === "draft";
  const repro = drug.reproductive;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const displayName = drug.tall_man?.value || drug.generic_name;

  const renderSourcedField = (
    label: string,
    field: Sourced<string> | undefined,
    fallbackText = "No recommendation in sources"
  ) => {
    const text = field?.value;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            {label}
          </span>
          {field?.refs && field.refs.length > 0 && (
            <SourcePopover
              refs={field.refs}
              sources={sources}
              label="Source"
              darkMode={darkMode}
            />
          )}
        </div>
        <p className={`text-xs leading-relaxed ${text ? "text-slate-600 dark:text-slate-300" : "text-slate-400 italic"}`}>
          {text || fallbackText}
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all ${
          darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <Baby className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-black tracking-tight">{displayName}</h3>
              {isDraft ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Pending verification
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Reproductive, pregnancy pharmacology, and lactation guidance
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Draft Notice if draft */}
        {isDraft && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              This drug is currently in <strong>draft</strong> status. Quantitative registry risk figures are suppressed until clinical review is verified.
            </span>
          </div>
        )}

        {/* 3 Stages Content */}
        <div className="space-y-5 text-xs sm:text-sm">
          {/* Stage 1: Preconception */}
          <div
            className={`p-4 rounded-xl border ${
              darkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider mb-2.5">
              <HeartHandshake className="w-4 h-4" />
              <span>Stage 1: Preconception Planning</span>
            </div>
            <div className="space-y-3">
              {renderSourcedField("Folic Acid Supplementation", repro?.folic_acid)}
              {renderSourcedField("Contraceptive Interactions", repro?.contraception)}
            </div>
          </div>

          {/* Stage 2: Pregnancy */}
          <div
            className={`p-4 rounded-xl border ${
              darkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400 text-xs uppercase tracking-wider mb-2.5">
              <Baby className="w-4 h-4" />
              <span>Stage 2: Pregnancy & Pharmacokinetics</span>
            </div>
            <div className="space-y-3">
              {renderSourcedField(
                "Pregnancy PK Changes & TDM Monitoring",
                repro?.pregnancy_pk
              )}

              {/* MCM Registries breakdown */}
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                  Major Congenital Malformations (MCM per Registry)
                </span>
                {!isDraft && repro?.mcm && repro.mcm.length > 0 ? (
                  <div className="space-y-2 mt-1.5">
                    {repro.mcm.map((entry, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                          darkMode
                            ? "bg-slate-900 border-slate-700 text-slate-300"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {entry.registry}: {entry.percent}%
                            {entry.ci95 ? ` (95% CI: ${entry.ci95})` : ""}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {entry.n_exposed ? `n = ${entry.n_exposed}` : ""}
                            {entry.dose_stratum ? ` • ${entry.dose_stratum}` : ""}
                          </div>
                        </div>
                        {entry.refs && entry.refs.length > 0 && (
                          <SourcePopover
                            refs={entry.refs}
                            sources={sources}
                            label="Source"
                            darkMode={darkMode}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {isDraft
                      ? "Pending verification (registry data hidden in draft mode)"
                      : "No registry MCM figures in sources"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stage 3: Postpartum */}
          <div
            className={`p-4 rounded-xl border ${
              darkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase tracking-wider mb-2.5">
              <Sparkles className="w-4 h-4" />
              <span>Stage 3: Postpartum Dose Adjustment</span>
            </div>
            {renderSourcedField(
              "Postpartum Management",
              repro?.postpartum,
              "No specific postpartum dose reduction schedule in sources"
            )}
          </div>

          {/* Lactation Block */}
          <div
            className={`p-4 rounded-xl border ${
              darkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider mb-2.5">
              <span>🍼 Lactation & Infant Exposure (LactMed)</span>
            </div>
            <div className="space-y-2">
              {renderSourcedField(
                "Relative Infant Dose (RID)",
                repro?.lactation_rid,
                "No RID percentage reported in sources"
              )}
              {renderSourcedField(
                "Lactation Safety Summary",
                repro?.lactation_summary,
                "No lactation summary in sources"
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              darkMode
                ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                : "border-slate-200 hover:bg-slate-100 text-slate-700"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
