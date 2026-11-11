"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Milk, ExternalLink } from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import type { Source } from "@/types/neurorx";
import { SourcePopover } from "../drug/SourcePopover";

interface ReproBoardProps {
  drugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  onSelectDrug: (drug: DrugWithEffectiveStatus) => void;
  darkMode?: boolean;
}

export function ReproBoard({
  drugs,
  sources = [],
  onSelectDrug,
  darkMode = false,
}: ReproBoardProps) {
  // Categorize drugs by reproductive tier
  const preferredDrugs = drugs.filter(
    (d) => d.drug.reproductive?.tier?.value === "preferred"
  );
  const cautionDrugs = drugs.filter(
    (d) => d.drug.reproductive?.tier?.value === "caution"
  );
  const avoidDrugs = drugs.filter(
    (d) => d.drug.reproductive?.tier?.value === "avoid"
  );
  const unclassifiedDrugs = drugs.filter(
    (d) => !d.drug.reproductive?.tier?.value
  );

  const renderDrugCard = (drugItem: DrugWithEffectiveStatus) => {
    const { drug, effectiveStatus } = drugItem;
    const isDraft = effectiveStatus === "draft";
    const displayName = drug.tall_man?.value || drug.generic_name;
    const repro = drug.reproductive;

    return (
      <div
        key={drug.id}
        onClick={() => onSelectDrug(drugItem)}
        className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${
          darkMode
            ? "bg-slate-900/80 border-slate-700/80 hover:border-slate-600"
            : "bg-white border-slate-200/90 hover:border-slate-300 shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <span>{displayName}</span>
          </div>
          {isDraft && (
            <span className="text-[10px] px-1.5 py-0.2 rounded font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Pending verification
            </span>
          )}
        </div>

        {/* MCM Entries per registry (strictly separate; never averaged) */}
        {!isDraft && repro?.mcm && repro.mcm.length > 0 ? (
          <div className="mt-2 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              MCM Registries:
            </span>
            {repro.mcm.map((entry, idx) => (
              <div
                key={idx}
                className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between"
              >
                <span>
                  <strong>{entry.registry}:</strong> {entry.percent}%
                  {entry.n_exposed ? ` (n=${entry.n_exposed})` : ""}
                  {entry.dose_stratum ? ` [${entry.dose_stratum}]` : ""}
                </span>
                {entry.refs && entry.refs.length > 0 && (
                  <span onClick={(e) => e.stopPropagation()}>
                    <SourcePopover
                      refs={entry.refs}
                      sources={sources}
                      label=""
                      darkMode={darkMode}
                    />
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : isDraft ? (
          <p className="text-[11px] text-slate-400 italic mt-1">
            Registry numbers hidden (draft record)
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 italic mt-1">
            No registry MCM data in sources
          </p>
        )}

        {/* Lactation Preview */}
        {repro?.lactation_rid?.value && (
          <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
            <Milk className="w-3 h-3 shrink-0" />
            <span>RID: {repro.lactation_rid.value}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 3 Main Tier Columns: Preferred, Caution, Avoid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Column 1: Preferred */}
        <div
          className={`p-4 rounded-2xl border flex flex-col transition-colors ${
            darkMode
              ? "bg-slate-900/30 border-emerald-950/60"
              : "bg-emerald-50/30 border-emerald-200/60"
          }`}
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-200/60 dark:border-emerald-900/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              🟢 Preferred ({preferredDrugs.length})
            </h3>
          </div>

          <div className="space-y-2.5 flex-1">
            {preferredDrugs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No drugs classified as preferred in current sources
              </p>
            ) : (
              preferredDrugs.map(renderDrugCard)
            )}
          </div>
        </div>

        {/* Column 2: Caution */}
        <div
          className={`p-4 rounded-2xl border flex flex-col transition-colors ${
            darkMode
              ? "bg-slate-900/30 border-amber-950/60"
              : "bg-amber-50/30 border-amber-200/60"
          }`}
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-200/60 dark:border-amber-900/40">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              🟡 Caution ({cautionDrugs.length})
            </h3>
          </div>

          <div className="space-y-2.5 flex-1">
            {cautionDrugs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No drugs classified as caution in current sources
              </p>
            ) : (
              cautionDrugs.map(renderDrugCard)
            )}
          </div>
        </div>

        {/* Column 3: Avoid */}
        <div
          className={`p-4 rounded-2xl border flex flex-col transition-colors ${
            darkMode
              ? "bg-slate-900/30 border-rose-950/60"
              : "bg-rose-50/30 border-rose-200/60"
          }`}
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-rose-200/60 dark:border-rose-900/40">
            <XCircle className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
              🔴 Avoid ({avoidDrugs.length})
            </h3>
          </div>

          <div className="space-y-2.5 flex-1">
            {avoidDrugs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No drugs classified as avoid in current sources
              </p>
            ) : (
              avoidDrugs.map(renderDrugCard)
            )}
          </div>
        </div>
      </div>

      {/* Row: Not Classified in Sources */}
      {unclassifiedDrugs.length > 0 && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
            darkMode
              ? "bg-slate-900/40 border-slate-800 text-slate-300"
              : "bg-white border-slate-200 shadow-sm text-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
              Not classified in sources ({unclassifiedDrugs.length})
            </h3>
            <span className="text-[11px] text-slate-400 italic">
              Click any medication for available pharmacokinetic & lactation guidance
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {unclassifiedDrugs.map((item) => {
              const displayName = item.drug.tall_man?.value || item.drug.generic_name;
              return (
                <button
                  key={item.drug.id}
                  onClick={() => onSelectDrug(item)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                    darkMode
                      ? "bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800"
                      : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span>{displayName}</span>
                  {item.effectiveStatus === "draft" && (
                    <span className="text-[10px] px-1 py-0.2 rounded font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      draft
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
