"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  RefreshCw,
  WifiOff,
  Zap,
} from "lucide-react";
import {
  formatNeuroGuideSyncStatusView,
  type LookupSyncStatus,
} from "@/lib/neuroguide/sync/lookupHelpers";

export interface NeuroGuideSyncStatusBadgeProps {
  syncStatus: LookupSyncStatus;
  lastSyncAt: string | null;
  lastChangeCount: number;
  lastSeq: number;
  rootHash?: string;
  protocolCount?: number;
  blockCount?: number;
  darkMode?: boolean;
  onRefresh?: () => Promise<void> | void;
}

export function NeuroGuideSyncStatusBadge({
  syncStatus,
  lastSyncAt,
  lastChangeCount,
  lastSeq,
  rootHash,
  protocolCount,
  blockCount,
  darkMode = false,
  onRefresh,
}: NeuroGuideSyncStatusBadgeProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const view = formatNeuroGuideSyncStatusView({
    syncStatus,
    lastSyncAt,
    lastChangeCount,
    lastSeq,
    isOnline,
  });

  const toneClass =
    view.tone === "offline"
      ? darkMode
        ? "bg-amber-950/60 border-amber-700/60 text-amber-200"
        : "bg-amber-50 border-amber-200 text-amber-800"
      : view.tone === "error"
        ? darkMode
          ? "bg-rose-950/60 border-rose-700/60 text-rose-200"
          : "bg-rose-50 border-rose-200 text-rose-800"
        : view.tone === "updating"
          ? darkMode
            ? "bg-cyan-950/60 border-cyan-800/70 text-cyan-200"
            : "bg-cyan-50 border-cyan-200 text-cyan-800"
          : darkMode
            ? "bg-slate-900/90 border-slate-800 text-slate-200"
            : "bg-white border-slate-200 text-slate-700";

  const seqMarker = " · seq #";
  const seqIndex = view.label.indexOf(seqMarker);
  const primaryPrefix = seqIndex !== -1 ? view.label.slice(0, seqIndex) : view.label;
  const primarySeqSuffix = seqIndex !== -1 ? view.label.slice(seqIndex) : null;

  return (
    <div
      role="status"
      aria-live={view.ariaLive}
      className="flex flex-wrap items-center gap-1.5"
    >
      <span
        className={`inline-flex items-center gap-1.5 min-h-[36px] sm:min-h-[44px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border text-[11px] sm:text-xs font-semibold whitespace-nowrap ${toneClass}`}
        title={rootHash ? `Merkle root: ${rootHash.slice(0, 12)}…` : undefined}
      >
        {view.tone === "updating" && (
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden="true" />
        )}
        {view.tone === "offline" && (
          <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        {view.tone === "error" && (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        {view.tone === "idle" && (
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
        )}
        <span>
          {primaryPrefix}
          {primarySeqSuffix && (
            <span className="hidden sm:inline">{primarySeqSuffix}</span>
          )}
        </span>
        {typeof protocolCount === "number" && typeof blockCount === "number" && (
          <span
            className={`hidden md:inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
              darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"
            }`}
          >
            <GitBranch className="w-3 h-3" aria-hidden="true" />
            {protocolCount}P · {blockCount}B
          </span>
        )}
      </span>

      {view.changeToast && (
        <span
          className={`inline-flex items-center gap-1 min-h-[36px] sm:min-h-[44px] px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-bold whitespace-nowrap ${
            darkMode
              ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-200"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{view.changeToast}</span>
        </span>
      )}

      {onRefresh && (
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={syncStatus === "loading" || syncStatus === "syncing"}
          aria-label="Sync NeuroGuide blocks now"
          title="Sync NeuroGuide blocks now"
          className={`min-h-[44px] min-w-[44px] px-2.5 rounded-lg border text-xs font-bold inline-flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer ${
            darkMode
              ? "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <RefreshCw
            className={`w-4 h-4 ${view.spinning ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
