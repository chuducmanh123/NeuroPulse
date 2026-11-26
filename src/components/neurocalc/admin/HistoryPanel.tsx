"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import type { RevisionRow, SyncRow } from "@/lib/neurocalc/sync/types";
import { getStoredAdminToken } from "@/utils/clientAuth";

export interface HistoryPanelProps {
  isOpen: boolean;
  uid: string;
  scaleName: string;
  currentRev: number;
  darkMode?: boolean;
  onClose: () => void;
  onRestored: (restoredRow: SyncRow) => Promise<void> | void;
}

function previewVal(v: unknown): string {
  if (v === undefined) return "∅";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 90 ? `${s.slice(0, 90)}…` : s;
}

export function HistoryPanel({
  isOpen,
  uid,
  scaleName,
  currentRev,
  darkMode = false,
  onClose,
  onRestored,
}: HistoryPanelProps) {
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringRev, setRestoringRev] = useState<number | null>(null);
  const [expandedRev, setExpandedRev] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const token = getStoredAdminToken();
      const res = await fetch(
        `/api/neurocalc/sync/scales/${encodeURIComponent(uid)}/history`,
        {
          method: "GET",
          headers: { "x-admin-token": token || "" },
          cache: "no-store",
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || `Failed to load history (${res.status})`);
        return;
      }
      const rows = Array.isArray(json?.revisions)
        ? (json.revisions as RevisionRow[])
        : [];
      setRevisions(rows);
      if (rows.length > 0) setExpandedRev(rows[0].rev);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error loading history."
      );
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    if (isOpen && uid) {
      void loadHistory();
    }
  }, [isOpen, uid, loadHistory]);

  if (!isOpen) return null;

  const handleRestoreAsDraft = async (revisionRev: number) => {
    setRestoringRev(revisionRev);
    setError(null);
    try {
      const token = getStoredAdminToken();
      const res = await fetch(
        `/api/neurocalc/sync/scales/${encodeURIComponent(uid)}/restore`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": token || "",
          },
          body: JSON.stringify({
            revisionRev,
            expectedRev: currentRev,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json?.row) {
        setError(json?.error || `Failed to restore rev ${revisionRev}`);
        return;
      }
      await onRestored(json.row as SyncRow);
      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error restoring revision."
      );
    } finally {
      setRestoringRev(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1005] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Revision History — ${scaleName}`}
    >
      <div
        className={`w-full max-w-3xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          darkMode
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-[#0E7490] dark:text-cyan-400" />
            <div>
              <h2 className="text-base font-bold">
                Revision History — {scaleName}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                uid={uid.slice(0, 8)}… · current rev {currentRev}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close history panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading revisions…</span>
            </div>
          ) : revisions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              No revisions found.
            </p>
          ) : (
            revisions.map((rv) => {
              const expanded = expandedRev === rv.rev;
              return (
                <div
                  key={rv.id}
                  className={`rounded-xl border ${
                    darkMode
                      ? "border-slate-800 bg-slate-800/40"
                      : "border-slate-200 bg-slate-50/70"
                  }`}
                >
                  <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRev(expanded ? null : rv.rev)
                      }
                      className="flex items-center gap-2 text-left"
                    >
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-mono text-xs font-bold">
                        rev {rv.rev}
                      </span>
                      <span className="rounded-md bg-cyan-500/15 text-[#0E7490] dark:text-cyan-300 px-2 py-0.5 text-[10.5px] font-bold uppercase">
                        {rv.op}
                      </span>
                      {rv.status && (
                        <span className="rounded-md bg-slate-500/15 px-2 py-0.5 text-[10.5px] font-semibold">
                          {rv.status}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        by {rv.actor} ·{" "}
                        {new Date(rv.createdAt).toLocaleString()}
                      </span>
                    </button>

                    {rv.rev !== currentRev && (
                      <button
                        type="button"
                        disabled={restoringRev !== null}
                        onClick={() => void handleRestoreAsDraft(rv.rev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-semibold hover:bg-slate-200/60 dark:hover:bg-slate-700"
                      >
                        {restoringRev === rv.rev ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3 h-3" />
                        )}
                        <span>Restore as Draft</span>
                      </button>
                    )}
                  </div>

                  {expanded && (
                    <div className="px-4 pb-3 pt-1 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                      <div className="font-mono text-slate-500">
                        content_hash: {rv.contentHash.slice(0, 16)}…
                      </div>
                      {rv.patchDiff.length === 0 ? (
                        <div className="text-slate-500 italic">
                          No JSON-Patch diff recorded ({rv.op}).
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {rv.patchDiff.map((op, i) => (
                            <div
                              key={i}
                              className="rounded-lg bg-black/5 dark:bg-black/30 px-2.5 py-1.5 font-mono"
                            >
                              <span className="font-bold uppercase text-cyan-700 dark:text-cyan-400 mr-1.5">
                                {op.op}
                              </span>
                              <span className="font-semibold">{op.path}</span>
                              {op.old_value !== undefined && (
                                <div className="text-rose-600 dark:text-rose-400">
                                  - {previewVal(op.old_value)}
                                </div>
                              )}
                              {op.new_value !== undefined && (
                                <div className="text-emerald-700 dark:text-emerald-400">
                                  + {previewVal(op.new_value)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
