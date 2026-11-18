"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  RotateCcw,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  formatBlockRevisionDiffEntries,
  type BlockDiffSection,
} from "@/lib/neuroguide/sync/adminHelpers";
import type {
  NeuroGuideBlockRevisionRow,
  NeuroGuideContentBlockRow,
} from "@/lib/neuroguide/sync/types";
import { getAdminHeaders, getStoredAdminToken } from "@/utils/clientAuth";

export interface BlockHistoryPanelProps {
  isOpen: boolean;
  uid: string;
  blockTitle: string;
  currentRev: number;
  darkMode?: boolean;
  adminToken?: string;
  onClose: () => void;
  onRestored: (restoredRow: NeuroGuideContentBlockRow) => Promise<void> | void;
  onConflict?: (currentRow: NeuroGuideContentBlockRow) => void;
}

const SECTION_BADGE_CLASSES: Record<BlockDiffSection, string> = {
  payload: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  facetIndex: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  meta: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  top: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
};

export function BlockHistoryPanel({
  isOpen,
  uid,
  blockTitle,
  currentRev,
  darkMode = false,
  adminToken,
  onClose,
  onRestored,
  onConflict,
}: BlockHistoryPanelProps) {
  const [revisions, setRevisions] = useState<NeuroGuideBlockRevisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringRev, setRestoringRev] = useState<number | null>(null);
  const [expandedRev, setExpandedRev] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const token = adminToken || getStoredAdminToken();
      const res = await fetch(
        `/api/neuroguide/sync/blocks/${encodeURIComponent(uid)}/history`,
        {
          method: "GET",
          headers: {
            ...getAdminHeaders(token),
          },
          cache: "no-store",
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.error || `Failed to load block history (${res.status}).`);
        return;
      }
      const rows = Array.isArray(json?.revisions)
        ? (json.revisions as NeuroGuideBlockRevisionRow[])
        : [];
      setRevisions(rows);
      if (rows.length > 0) {
        setExpandedRev(rows[0].rev);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error loading block history.");
    } finally {
      setLoading(false);
    }
  }, [uid, adminToken]);

  useEffect(() => {
    if (isOpen && uid) {
      void loadHistory();
    }
  }, [isOpen, uid, loadHistory]);

  if (!isOpen) return null;

  const handleRestoreAsDraft = async (revisionRev: number) => {
    if (!uid) return;
    setRestoringRev(revisionRev);
    setError(null);
    try {
      const token = adminToken || getStoredAdminToken();
      const res = await fetch(
        `/api/neuroguide/sync/blocks/${encodeURIComponent(uid)}/restore`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAdminHeaders(token),
          },
          body: JSON.stringify({
            revisionRev,
            expectedRev: currentRev,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json?.code === "REV_CONFLICT") {
        setError(
          `Conflict: latest server revision is rev ${json.currentRev ?? "newer"}. Refresh and try again.`,
        );
        if (json.current && onConflict) {
          onConflict(json.current as NeuroGuideContentBlockRow);
        }
        return;
      }
      if (!res.ok || !json?.row) {
        setError(json?.error || `Failed to restore revision ${revisionRev}.`);
        return;
      }

      await onRestored(json.row as NeuroGuideContentBlockRow);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error restoring block revision.");
    } finally {
      setRestoringRev(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1012] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="neuroguide-block-history-title"
    >
      <div
        className={`w-full max-w-3xl max-h-[92vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          darkMode
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-6 py-4 border-b flex items-center justify-between gap-3 ${
            darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="neuroguide-block-history-title"
                className="text-base sm:text-lg font-extrabold tracking-tight truncate"
              >
                Block Revision History: {blockTitle}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current revision: rev {currentRev} · Restoring creates a new draft revision
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
            aria-label="Close block revision history"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading block revisions…</span>
            </div>
          ) : revisions.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              No revisions recorded for this content block yet.
            </div>
          ) : (
            revisions.map((rev) => {
              const isExpanded = expandedRev === rev.rev;
              const diffEntries = formatBlockRevisionDiffEntries(rev);

              return (
                <div
                  key={`${rev.id}-${rev.rev}`}
                  className={`rounded-xl border transition-colors ${
                    darkMode
                      ? "bg-slate-800/40 border-slate-700/80"
                      : "bg-slate-50/70 border-slate-200"
                  }`}
                >
                  <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedRev(isExpanded ? null : rev.rev)}
                      className="flex items-start sm:items-center gap-2.5 text-left min-h-[44px] flex-1 min-w-0 cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 mt-0.5 sm:mt-0 shrink-0 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mt-0.5 sm:mt-0 shrink-0 text-slate-500" />
                      )}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-extrabold">rev {rev.rev}</span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                            {rev.op}
                          </span>
                          {rev.status && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                                rev.status === "verified" || rev.status === "approved"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              }`}
                            >
                              {rev.status}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 break-words">
                          By <span className="font-semibold">{rev.actor || "admin"}</span> ·{" "}
                          {new Date(rev.createdAt).toLocaleString()} · key:{" "}
                          <span className="font-mono">{rev.slug}</span>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={restoringRev !== null || rev.rev === currentRev}
                      onClick={() => void handleRestoreAsDraft(rev.rev)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0 cursor-pointer"
                    >
                      {restoringRev === rev.rev ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{rev.rev === currentRev ? "Current Rev" : "Restore as draft"}</span>
                    </button>
                  </div>

                  {isExpanded && (
                    <div
                      className={`px-3.5 sm:px-4 pb-3.5 pt-2 border-t text-xs space-y-2 ${
                        darkMode ? "border-slate-700/70" : "border-slate-200"
                      }`}
                    >
                      {diffEntries.length === 0 ? (
                        <div className="text-slate-500 dark:text-slate-400">
                          Initial block snapshot or metadata update ({rev.op}).
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Changes in rev {rev.rev} ({diffEntries.length})
                          </div>
                          {diffEntries.map((entry, idx) => (
                            <div
                              key={`${rev.rev}-${entry.path}-${idx}`}
                              className={`p-2.5 rounded-lg border font-mono text-[11px] space-y-1 break-words ${
                                darkMode
                                  ? "bg-slate-900/70 border-slate-700"
                                  : "bg-white border-slate-200"
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-2 font-bold">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                                    SECTION_BADGE_CLASSES[entry.section]
                                  }`}
                                >
                                  {entry.section}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-500/15 text-[10px] uppercase">
                                  {entry.op}
                                </span>
                                <span className="break-all">{entry.path}</span>
                              </div>
                              <div className="text-slate-600 dark:text-slate-300">
                                {entry.oldPreview} → {entry.newPreview}
                              </div>
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

        {/* Footer */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-t flex justify-end ${
            darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
