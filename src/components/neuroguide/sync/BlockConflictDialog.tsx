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
import {
  buildBlockConflictSummary,
  formatBlockRevisionDiffEntries,
  formatPatchValuePreview,
  type BlockConflictResolutionMode,
  type BlockDiffSection,
  type NeuroGuideBlockWriteInput,
} from "@/lib/neuroguide/sync/adminHelpers";
import type { NeuroGuideContentBlockRow } from "@/lib/neuroguide/sync/types";

export interface BlockConflictDialogProps {
  isOpen: boolean;
  base: NeuroGuideContentBlockRow | null;
  mine: NeuroGuideBlockWriteInput;
  cloudRow: NeuroGuideContentBlockRow;
  baseRev: number;
  submitting?: boolean;
  error?: string | null;
  darkMode?: boolean;
  onResolve: (
    mode: BlockConflictResolutionMode,
    fieldChoices: Record<string, "mine" | "cloud">
  ) => Promise<void> | void;
  onCancel: () => void;
}

const SECTION_BADGE_CLASSES: Record<BlockDiffSection, string> = {
  payload: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  facetIndex: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  meta: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  top: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

export function BlockConflictDialog({
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
}: BlockConflictDialogProps) {
  const [choices, setChoices] = useState<Record<string, "mine" | "cloud">>({});

  const summary = useMemo(
    () => buildBlockConflictSummary(base, mine, cloudRow),
    [base, mine, cloudRow],
  );

  const formattedDiffs = useMemo(
    () => formatBlockRevisionDiffEntries(summary.mineVsCloudDiff),
    [summary.mineVsCloudDiff],
  );

  useEffect(() => {
    setChoices({});
  }, [isOpen, cloudRow.uid, cloudRow.rev]);

  if (!isOpen) return null;

  const { mergeResult } = summary;
  const overlappingConflicts = mergeResult.conflicts;
  const unresolvedCount = overlappingConflicts.filter((c) => {
    const pick = choices[c.path];
    return pick !== "mine" && pick !== "cloud";
  }).length;
  const allConflictsResolved = unresolvedCount === 0;

  return (
    <div
      className="fixed inset-0 z-[1015] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="neuroguide-block-conflict-title"
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
                id="neuroguide-block-conflict-title"
                className="text-base sm:text-lg font-extrabold tracking-tight"
              >
                Block Version Conflict Detected
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                Cloud updated block{" "}
                <span className="font-mono font-bold">{cloudRow.blockKey}</span> while
                you were editing. Choose how to reconcile payload &amp; multi-axis facet edits.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close block conflict dialog"
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
                {formattedDiffs.length} field{formattedDiffs.length === 1 ? "" : "s"} differ
                from cloud state
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border text-xs sm:text-sm ${
                darkMode
                  ? "bg-cyan-950/30 border-cyan-800/60"
                  : "bg-cyan-50/70 border-cyan-200"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                Latest Cloud State
              </div>
              <div className="font-bold mt-1">Revision {cloudRow.rev}</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">
                Updated by <span className="font-semibold">{cloudRow.updatedBy || "admin"}</span>{" "}
                · {new Date(cloudRow.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {mergeResult.autoMergedPaths.length > 0 && (
            <div
              className={`p-3.5 rounded-xl border text-xs sm:text-sm ${
                darkMode
                  ? "bg-emerald-950/25 border-emerald-800/50 text-emerald-200"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
              }`}
            >
              <div className="font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>
                  {mergeResult.autoMergedPaths.length} non-overlapping section
                  {mergeResult.autoMergedPaths.length === 1 ? "" : "s"} auto-merged
                </span>
              </div>
              <div className="text-xs opacity-90 mt-1 font-mono break-all">
                {mergeResult.autoMergedPaths.join(", ")}
              </div>
            </div>
          )}

          {overlappingConflicts.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Conflicting Fields ({overlappingConflicts.length})
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {unresolvedCount === 0
                    ? "All conflicts selected — ready for Smart Merge"
                    : `${unresolvedCount} field${unresolvedCount === 1 ? "" : "s"} left to choose`}
                </span>
              </div>

              {overlappingConflicts.map((conflict) => {
                const picked = choices[conflict.path];
                return (
                  <div
                    key={conflict.path}
                    className={`rounded-xl border p-3.5 sm:p-4 space-y-3 ${
                      darkMode
                        ? "bg-slate-800/40 border-slate-700"
                        : "bg-slate-50/70 border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            SECTION_BADGE_CLASSES[conflict.section]
                          }`}
                        >
                          {conflict.section}
                        </span>
                        <span className="font-mono text-xs sm:text-sm font-bold break-all">
                          {conflict.path}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        {picked === "mine"
                          ? "Selected: Mine"
                          : picked === "cloud"
                            ? "Selected: Cloud"
                            : "Needs selection"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setChoices((prev) => ({ ...prev, [conflict.path]: "mine" }))
                        }
                        className={`text-left p-3 rounded-xl border transition-all min-h-[44px] cursor-pointer ${
                          picked === "mine"
                            ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
                            : darkMode
                              ? "border-slate-700 bg-slate-900/60 hover:border-slate-500"
                              : "border-slate-200 bg-white hover:border-slate-400"
                        }`}
                      >
                        <div className="font-extrabold text-indigo-600 dark:text-indigo-400 mb-1">
                          Keep Mine
                        </div>
                        <div className="font-mono break-words text-slate-700 dark:text-slate-200">
                          {formatPatchValuePreview(conflict.myValue)}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setChoices((prev) => ({ ...prev, [conflict.path]: "cloud" }))
                        }
                        className={`text-left p-3 rounded-xl border transition-all min-h-[44px] cursor-pointer ${
                          picked === "cloud"
                            ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30"
                            : darkMode
                              ? "border-slate-700 bg-slate-900/60 hover:border-slate-500"
                              : "border-slate-200 bg-white hover:border-slate-400"
                        }`}
                      >
                        <div className="font-extrabold text-cyan-600 dark:text-cyan-400 mb-1">
                          Use Cloud (rev {cloudRow.rev})
                        </div>
                        <div className="font-mono break-words text-slate-700 dark:text-slate-200">
                          {formatPatchValuePreview(conflict.cloudValue)}
                        </div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className={`p-3.5 rounded-xl border text-xs sm:text-sm ${
                darkMode
                  ? "bg-slate-800/50 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="font-bold">
                Your edits touched different fields from Cloud.
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Click <strong>Smart Merge</strong> to combine both updates cleanly at rev{" "}
                {cloudRow.rev + 1}.
              </p>
            </div>
          )}

          {formattedDiffs.length > 0 && (
            <details
              className={`rounded-xl border p-3.5 text-xs ${
                darkMode
                  ? "bg-slate-950/40 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <summary className="font-bold cursor-pointer select-none min-h-[28px] flex items-center">
                Inspect full diff between Cloud &amp; Your Draft ({formattedDiffs.length})
              </summary>
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {formattedDiffs.map((entry, idx) => (
                  <div
                    key={`${entry.path}-${idx}`}
                    className={`p-2 rounded-lg border font-mono text-[11px] break-words ${
                      darkMode
                        ? "bg-slate-900 border-slate-800"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="font-bold flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] uppercase ${
                          SECTION_BADGE_CLASSES[entry.section]
                        }`}
                      >
                        {entry.section}
                      </span>
                      <span>
                        [{entry.op}] {entry.path}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                      Cloud: {entry.oldPreview} → Mine: {entry.newPreview}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Footer Actions: 3 Modes + Cancel */}
        <div
          className={`px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 ${
            darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void onResolve("use_cloud", choices)}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-700 hover:bg-slate-800 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Cloud className="w-4 h-4 shrink-0" />
              <span>Use Cloud</span>
            </button>

            <button
              type="button"
              disabled={submitting || !allConflictsResolved}
              onClick={() => void onResolve("smart_merge", choices)}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
              onClick={() => void onResolve("force_overwrite", choices)}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
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
