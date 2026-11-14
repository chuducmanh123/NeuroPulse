"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Cloud,
  GitMerge,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import type { DrugRecord } from "@/types/neurorx";
import {
  buildConflictSummary,
  formatPatchValuePreview,
  formatRevisionDiffEntries,
  type ConflictResolutionMode,
} from "@/lib/neurorx/sync/adminHelpers";
import type { SyncRow } from "@/lib/neurorx/sync/types";

export interface ConflictDialogProps {
  isOpen: boolean;
  base: DrugRecord;
  mine: DrugRecord;
  cloudRow: SyncRow;
  baseRev: number;
  submitting?: boolean;
  error?: string | null;
  darkMode?: boolean;
  onResolve: (
    mode: ConflictResolutionMode,
    conflictSelections: Record<string, "mine" | "cloud">
  ) => Promise<void> | void;
  onCancel: () => void;
}

export function ConflictDialog({
  isOpen,
  base,
  mine,
  cloudRow,
  baseRev,
  submitting = false,
  error = null,
  darkMode = false,
  onResolve,
  onCancel,
}: ConflictDialogProps) {
  const [selections, setSelections] = useState<Record<string, "mine" | "cloud">>({});

  const summary = useMemo(
    () => buildConflictSummary(base, mine, cloudRow.data),
    [base, mine, cloudRow.data]
  );

  const formattedDiffs = useMemo(
    () => formatRevisionDiffEntries(summary.mineVsCloudDiff),
    [summary.mineVsCloudDiff]
  );

  useEffect(() => {
    setSelections({});
  }, [isOpen, cloudRow.uid, cloudRow.rev]);

  if (!isOpen) return null;

  const { mergeResult } = summary;
  const overlappingConflicts = mergeResult.conflicts;
  const unresolvedCount = overlappingConflicts.filter((c) => {
    const pick = selections[c.path];
    return pick !== "mine" && pick !== "cloud";
  }).length;
  const allConflictsResolved = unresolvedCount === 0;

  return (
    <div
      className="fixed inset-0 z-[1010] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="neurorx-conflict-dialog-title"
    >
      <div
        className={`w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          darkMode
            ? "bg-slate-900 border-amber-500/40 text-slate-100"
            : "bg-white border-amber-300 text-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-6 py-4 border-b flex items-start justify-between gap-3 ${
            darkMode
              ? "bg-amber-950/30 border-slate-800"
              : "bg-amber-50/80 border-amber-200"
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="neurorx-conflict-dialog-title"
                className="text-base sm:text-lg font-extrabold tracking-tight"
              >
                Version Conflict Detected
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                Another editor updated{" "}
                <span className="font-bold">{cloudRow.data.generic_name || cloudRow.slug}</span>{" "}
                while you were editing. Choose how to reconcile your changes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
            aria-label="Close conflict dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {/* Revision Comparison Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`p-3.5 rounded-xl border text-xs sm:text-sm ${
                darkMode
                  ? "bg-slate-800/60 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Your Editing Base
              </div>
              <div className="font-bold mt-1">Revision {baseRev}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {formattedDiffs.length} field{formattedDiffs.length === 1 ? "" : "s"} differ from
                current cloud state
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border text-xs sm:text-sm ${
                darkMode
                  ? "bg-sky-950/30 border-sky-700/40"
                  : "bg-sky-50/70 border-sky-200"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                Latest Cloud Revision
              </div>
              <div className="font-bold mt-1">
                Revision {cloudRow.rev} by {cloudRow.updatedBy || "admin"}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                Updated {new Date(cloudRow.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Non-overlapping Auto-Merge Info */}
          {mergeResult.autoMergedPaths.length > 0 && (
            <div
              className={`p-3.5 rounded-xl border ${
                darkMode
                  ? "bg-emerald-950/25 border-emerald-700/40"
                  : "bg-emerald-50/70 border-emerald-200"
              }`}
            >
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Check className="w-4 h-4 shrink-0" />
                <span>
                  Non-overlapping changes ready for Smart Merge (
                  {mergeResult.autoMergedPaths.length})
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mergeResult.autoMergedPaths.map((path) => (
                  <span
                    key={path}
                    className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border border-emerald-500/20 break-all"
                  >
                    {path}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Overlapping Conflicts requiring per-field choice */}
          {overlappingConflicts.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Overlapping Field Conflicts ({overlappingConflicts.length})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {allConflictsResolved
                    ? "All overlapping fields resolved."
                    : `${unresolvedCount} remaining for Smart Merge`}
                </span>
              </div>

              {overlappingConflicts.map((conflict) => {
                const picked = selections[conflict.path];
                return (
                  <div
                    key={conflict.path}
                    className={`p-3.5 rounded-xl border space-y-3 ${
                      darkMode
                        ? "bg-slate-800/50 border-slate-700"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 break-all">
                      {conflict.path}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div
                        className={`p-2.5 rounded-lg border ${
                          darkMode
                            ? "bg-slate-900/70 border-slate-700"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                          Base (rev {baseRev})
                        </div>
                        <div className="font-mono text-[11px] break-words">
                          {formatPatchValuePreview(conflict.baseValue)}
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-lg border ${
                          picked === "mine"
                            ? "border-indigo-500 bg-indigo-500/10"
                            : darkMode
                            ? "bg-slate-900/70 border-slate-700"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-300 mb-1">
                          Your Edit
                        </div>
                        <div className="font-mono text-[11px] break-words">
                          {formatPatchValuePreview(conflict.mineValue)}
                        </div>
                      </div>

                      <div
                        className={`p-2.5 rounded-lg border ${
                          picked === "cloud"
                            ? "border-sky-500 bg-sky-500/10"
                            : darkMode
                            ? "bg-slate-900/70 border-slate-700"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="text-[11px] font-bold uppercase text-sky-600 dark:text-sky-300 mb-1">
                          Cloud (rev {cloudRow.rev})
                        </div>
                        <div className="font-mono text-[11px] break-words">
                          {formatPatchValuePreview(conflict.cloudValue)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          setSelections((prev) => ({ ...prev, [conflict.path]: "mine" }))
                        }
                        aria-pressed={picked === "mine"}
                        className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                          picked === "mine"
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : darkMode
                            ? "bg-slate-900 text-slate-200 border-slate-700 hover:border-indigo-400"
                            : "bg-white text-slate-800 border-slate-300 hover:border-indigo-500"
                        }`}
                      >
                        Keep Mine
                      </button>

                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() =>
                          setSelections((prev) => ({ ...prev, [conflict.path]: "cloud" }))
                        }
                        aria-pressed={picked === "cloud"}
                        className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                          picked === "cloud"
                            ? "bg-sky-600 text-white border-sky-600"
                            : darkMode
                            ? "bg-slate-900 text-slate-200 border-slate-700 hover:border-sky-400"
                            : "bg-white text-slate-800 border-slate-300 hover:border-sky-500"
                        }`}
                      >
                        Use Cloud
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Summary of Differences (Cloud vs. Your Edit)
              </h3>
              {formattedDiffs.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No field differences found against the latest cloud snapshot.
                </p>
              ) : (
                <div className="space-y-2">
                  {formattedDiffs.map((entry, idx) => (
                    <div
                      key={`${entry.op}-${entry.path}-${idx}`}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        darkMode
                          ? "bg-slate-800/50 border-slate-700"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-mono font-bold break-all">
                        <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-[10px] uppercase">
                          {entry.op}
                        </span>
                        <span>{entry.path}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono break-words">
                        Cloud: {entry.oldPreview} → Yours: {entry.newPreview}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`px-4 sm:px-6 py-4 border-t space-y-2.5 ${
            darkMode
              ? "bg-slate-950/60 border-slate-800"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          {!allConflictsResolved && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Choose Keep Mine or Use Cloud on every overlapping field above to enable Smart Merge.
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-end gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={onCancel}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => onResolve("use_cloud", selections)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Cloud className="w-4 h-4 shrink-0" />
              <span>Use Cloud</span>
            </button>

            <button
              type="button"
              disabled={submitting || !allConflictsResolved}
              onClick={() => onResolve("smart_merge", selections)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <GitMerge className="w-4 h-4 shrink-0" />
              )}
              <span>Smart Merge</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => onResolve("force_overwrite", selections)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Force Overwrite</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
