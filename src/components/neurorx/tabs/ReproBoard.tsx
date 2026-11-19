"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import type { Source } from "@/types/neurorx";
import { classifyLactationTier } from "@/lib/neurorx/reproductive";

interface ReproBoardProps {
  mode?: "pregnancy" | "lactation";
  drugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  onSelectDrug: (drug: DrugWithEffectiveStatus) => void;
  darkMode?: boolean;
}

export function ReproBoard({
  mode = "pregnancy",
  drugs,
  onSelectDrug,
  darkMode = false,
}: ReproBoardProps) {
  const isLactation = mode === "lactation";

  // Categorize drugs by pregnancy tier or lactation tier
  const col1Drugs = isLactation
    ? drugs.filter((d) => classifyLactationTier(d.drug.reproductive) === "compatible")
    : drugs.filter((d) => d.drug.reproductive?.tier?.value === "preferred");

  const col2Drugs = isLactation
    ? drugs.filter((d) => classifyLactationTier(d.drug.reproductive) === "caution")
    : drugs.filter((d) => d.drug.reproductive?.tier?.value === "caution");

  const col3Drugs = isLactation
    ? drugs.filter((d) => classifyLactationTier(d.drug.reproductive) === "avoid")
    : drugs.filter((d) => d.drug.reproductive?.tier?.value === "avoid");

  const unclassifiedDrugs = isLactation
    ? drugs.filter((d) => classifyLactationTier(d.drug.reproductive) === null)
    : drugs.filter((d) => !d.drug.reproductive?.tier?.value);

  const renderDrugCard = (drugItem: DrugWithEffectiveStatus) => {
    const { drug, effectiveStatus } = drugItem;
    const isDraft = effectiveStatus === "draft";
    const displayName = drug.tall_man?.value || drug.generic_name;

    return (
      <button
        key={drug.id}
        type="button"
        onClick={() => onSelectDrug(drugItem)}
        className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[#2F855A] text-left cursor-pointer transition-all hover:scale-[1.01] hover:shadow-sm flex items-center justify-between gap-2"
      >
        <span className="font-bold text-xs sm:text-sm text-[var(--text-ink)]">
          {displayName}
        </span>
        {isDraft && (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
            Pending verification
          </span>
        )}
      </button>
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
              {isLactation
                ? `🟢 Compatible (${col1Drugs.length})`
                : `🟢 Preferred (${col1Drugs.length})`}
            </h3>
          </div>

          <div className="space-y-2.5 flex-1">
            {col1Drugs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                {isLactation
                  ? "No drugs classified as compatible in current sources"
                  : "No drugs classified as preferred in current sources"}
              </p>
            ) : (
              col1Drugs.map(renderDrugCard)
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
              🟡 Caution ({col2Drugs.length})
            </h3>
          </div>

          <div className="space-y-2.5 flex-1">
            {col2Drugs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No drugs classified as caution in current sources
              </p>
            ) : (
              col2Drugs.map(renderDrugCard)
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
              🔴 Avoid ({col3Drugs.length})
            </h3>
          </div>

          <div className="space-y-2.5 flex-1">
            {col3Drugs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">
                No drugs classified as avoid in current sources
              </p>
            ) : (
              col3Drugs.map(renderDrugCard)
            )}
          </div>
        </div>
      </div>

      {/* Row: Not Classified in Sources */}
      {unclassifiedDrugs.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] shadow-2xs transition-colors">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-hairline)]">
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-ink)]">
              Not classified in sources ({unclassifiedDrugs.length})
            </h3>
            <span className="text-[11px] text-[var(--text-muted)] italic">
              Click any medication for available pharmacokinetic &amp; lactation guidance
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {unclassifiedDrugs.map((item) => {
              const displayName = item.drug.tall_man?.value || item.drug.generic_name;
              return (
                <button
                  key={item.drug.id}
                  onClick={() => onSelectDrug(item)}
                  className="p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:border-[#2F855A] hover:bg-[var(--bg-subtle)] text-left text-xs font-semibold text-[var(--text-ink)] flex items-center justify-between transition-colors"
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
