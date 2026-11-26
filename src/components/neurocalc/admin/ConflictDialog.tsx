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
  computeJsonPatch,
  threeWayMergeScale,
} from "@/lib/neurocalc/sync/jsonPatch";
import type { SyncRow } from "@/lib/neurocalc/sync/types";
import type { ScaleRecord } from "@/types/neurocalc";

export interface ConflictDialogProps {
  isOpen: boolean;
  base: ScaleRecord;
  mine: ScaleRecord;
  cloudRow: SyncRow;
  baseRev: number;
  submitting?: boolean;
  error?: string | null;
  darkMode?: boolean;
  onResolve: (
    resolved: ScaleRecord,
    mode: "cloud" | "mine" | "merge"
  ) => Promise<void> | void;
  onCancel: () => void;
}

function setByJsonPointer(
  target: Record<string, unknown>,
  pointer: string,
  value: unknown
): void {
  const segments = pointer
    .replace(/^\//, "")
    .split("/")
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"));
  if (segments.length === 0 || !segments[0]) return;

  let cur: unknown = target;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (Array.isArray(cur)) {
      const idx = Number(key);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return;
      cur = cur[idx];
    } else if (cur && typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return;
    }
  }

  const last = segments[segments.length - 1];
  if (Array.isArray(cur)) {
    const idx = Number(last);
    if (!Number.isInteger(idx) || idx < 0) return;
    if (value === undefined) {
      cur.splice(idx, 1);
    } else {
      cur[idx] = JSON.parse(JSON.stringify(value));
    }
  } else if (cur && typeof cur === "object") {
    if (value === undefined) {
      delete (cur as Record<string, unknown>)[last];
    } else {
      (cur as Record<string, unknown>)[last] = JSON.parse(JSON.stringify(value));
    }
  }
}

function formatPreview(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}…` : value;
  }
  const str = JSON.stringify(value);
  return str.length > 120 ? `${str.slice(0, 120)}…` : str;
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

  const mergeResult = useMemo(
    () => threeWayMergeScale(base, mine, cloudRow.data),
    [base, mine, cloudRow.data]
  );

  const mineVsCloudDiff = useMemo(
    () => computeJsonPatch(cloudRow.data, mine),
    [cloudRow.data, mine]
  );

  useEffect(() => {
    setSelections({});
  }, [isOpen, cloudRow.uid, cloudRow.rev]);

  if (!isOpen) return null;

  const overlappingConflicts = mergeResult.conflicts;
  const unresolvedCount = overlappingConflicts.filter((c) => {
    const pick = selections[c.path];
    return pick !== "mine" && pick !== "cloud";
  }).length;
  const allResolved = unresolvedCount === 0;

  const handleApplyMerge = () => {
    const mergedCopy = JSON.parse(
      JSON.stringify(mergeResult.merged)
    ) as ScaleRecord;
    for (const conflict of overlappingConflicts) {
      const pick = selections[conflict.path];
      const chosenVal =
        pick === "mine" ? conflict.mineValue : conflict.cloudValue;
      setByJsonPointer(
        mergedCopy as unknown as Record<string, unknown>,
        conflict.path,
        chosenVal
      );
    }
    void onResolve(mergedCopy, "merge");
  };

  return (
    <div
      className="fixed inset-0 z-[1010] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="neurocalc-conflict-dialog-title"
    >
      <div
        className={`w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          darkMode
            ? "bg-slate-900 border-amber-500/40 text-slate-100"
            : "bg-white border-amber-300 text-slate-900"
        }`}
      >
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
                id="neurocalc-conflict-dialog-title"
                className="text-base sm:text-lg font-extrabold tracking-tight"
              >
                Version Conflict Detected
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                Another editor updated{" "}
                <span className="font-bold">
                  {cloudRow.data.metadata.short_name || cloudRow.slug}
                </span>{" "}
                (base rev {baseRev} → cloud rev {cloudRow.rev}).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            aria-label="Cancel conflict dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-700 dark:text-rose-300 font-medium">
              {error}
            </div>
          )}

          {mergeResult.autoMergedPaths.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                Auto-merged sections ({mergeResult.autoMergedPaths.length}):
              </p>
              <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-200">
                {mergeResult.autoMergedPaths.join(", ")}
              </p>
            </div>
          )}

          {overlappingConflicts.length > 0 ? (
            <div className="space-y-3">
              <p className="font-bold text-amber-700 dark:text-amber-300">
                Overlapping conflicts ({overlappingConflicts.length}) — pick Mine or Cloud for each:
              </p>
              {overlappingConflicts.map((c) => {
                const pick = selections[c.path];
                return (
                  <div
                    key={c.path}
                    className={`rounded-xl border p-3 space-y-2 ${
                      darkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="font-mono font-bold text-[11px] text-cyan-700 dark:text-cyan-400">
                      {c.path} ({c.section})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSelections((prev) => ({ ...prev, [c.path]: "mine" }))
                        }
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          pick === "mine"
                            ? "border-cyan-600 bg-cyan-500/10 ring-1 ring-cyan-500"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        <span className="font-bold block mb-1">Mine (Local)</span>
                        <span className="font-mono text-[11px] break-all opacity-85">
                          {formatPreview(c.mineValue)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSelections((prev) => ({ ...prev, [c.path]: "cloud" }))
                        }
                        className={`p-2.5 rounded-lg border text-left transition-all ${
                          pick === "cloud"
                            ? "border-indigo-600 bg-indigo-500/10 ring-1 ring-indigo-500"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        <span className="font-bold block mb-1">
                          Cloud (rev {cloudRow.rev})
                        </span>
                        <span className="font-mono text-[11px] break-all opacity-85">
                          {formatPreview(c.cloudValue)}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-cyan-800 dark:text-cyan-200">
              All section edits are disjoint ({mineVsCloudDiff.length} diff ops vs cloud). Safe to apply 3-way merge.
            </div>
          )}
        </div>

        <div
          className={`px-4 sm:px-6 py-3.5 border-t flex flex-wrap items-center justify-end gap-2 ${
            darkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-50"
          }`}
        >
          <button
            type="button"
            disabled={submitting}
            onClick={() => void onResolve(cloudRow.data, "cloud")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Use Cloud</span>
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void onResolve(mine, "mine")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-500/20"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Overwrite with Mine</span>
          </button>
          <button
            type="button"
            disabled={submitting || !allResolved}
            onClick={handleApplyMerge}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0E7490] text-white text-xs font-bold hover:bg-cyan-800 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <GitMerge className="w-3.5 h-3.5" />
            )}
            <span>
              Apply 3-Way Merge
              {!allResolved ? ` (${unresolvedCount} left)` : ""}
            </span>
            {allResolved && !submitting && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
