"use client";

import React, { useState, useEffect } from "react";
import { Zap, RefreshCw, Wifi, WifiOff, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  formatSyncStatusView,
  type LookupSyncStatus,
} from "@/lib/neurorx/sync/lookupHelpers";

export { formatSyncStatusView };

interface OfflineStatusProps {
  dataHash?: string;
  darkMode?: boolean;
  syncV2?: boolean;
  syncStatus?: LookupSyncStatus;
  lastSyncAt?: string | null;
  lastChangeCount?: number;
  lastSeq?: number;
  onRefresh?: () => Promise<void> | void;
}

type PwaStatus = "online-only" | "caching" | "ready" | "update-available";

export function OfflineStatus({
  dataHash = "v2-live",
  darkMode = false,
  syncV2 = true,
  syncStatus = "loading",
  lastSyncAt = null,
  lastChangeCount = 0,
  lastSeq = 0,
  onRefresh,
}: OfflineStatusProps) {
  const [status, setStatus] = useState<PwaStatus>("online-only");
  const [cachedVersion, setCachedVersion] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!("serviceWorker" in navigator)) {
      setStatus("online-only");
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }

    let isMounted = true;

    // Register service worker scoped to /neurorx
    navigator.serviceWorker
      .register(`/neurorx-sw.js?v=${dataHash}`, { scope: "/neurorx" })
      .then((reg) => {
        if (!isMounted) return;

        // Check for waiting worker (update available)
        if (reg.waiting) {
          setStatus("update-available");
          return;
        }

        // Check if currently installing
        if (reg.installing) {
          setStatus("caching");
          reg.installing.addEventListener("statechange", (e) => {
            const sw = e.target as ServiceWorker;
            if (sw.state === "installed") {
              if (navigator.serviceWorker.controller) {
                setStatus("update-available");
              } else {
                setStatus("ready");
                setCachedVersion(dataHash);
              }
            }
          });
        } else if (reg.active) {
          setStatus("ready");
          setCachedVersion(dataHash);
        }

        // Listen for new worker updates
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          setStatus("caching");

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                setStatus("update-available");
              } else {
                setStatus("ready");
                setCachedVersion(dataHash);
              }
            }
          });
        });
      })
      .catch(() => {
        if (isMounted) setStatus("online-only");
      });

    // Message communication with active service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "DATA_VERSION") {
        const swVer = event.data.version;
        setCachedVersion(swVer);
        if (swVer !== dataHash) {
          setStatus("update-available");
        } else {
          setStatus("ready");
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Query active controller
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "GET_DATA_VERSION" });
    }

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, [dataHash]);

  const handleReload = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  };

  if (syncV2) {
    const view = formatSyncStatusView({
      syncStatus,
      lastSyncAt,
      lastChangeCount,
      lastSeq,
      isOnline,
    });

    const toneClass =
      view.kind === "offline"
        ? darkMode
          ? "bg-amber-950/60 border-amber-700/60 text-amber-200"
          : "bg-amber-50 border-amber-200 text-amber-800"
        : view.kind === "error"
          ? darkMode
            ? "bg-rose-950/60 border-rose-700/60 text-rose-200"
            : "bg-rose-50 border-rose-200 text-rose-800"
          : view.kind === "updating"
            ? darkMode
              ? "bg-cyan-950/60 border-cyan-800/70 text-cyan-200"
              : "bg-cyan-50 border-cyan-200 text-cyan-800"
            : darkMode
              ? "bg-slate-900/90 border-slate-800 text-slate-200"
              : "bg-white border-slate-200 text-slate-700";

    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-wrap items-center gap-1.5"
      >
        <span
          className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-semibold ${toneClass}`}
        >
          {view.kind === "updating" && (
            <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" aria-hidden="true" />
          )}
          {view.kind === "offline" && (
            <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
          {view.kind === "error" && (
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          )}
          {view.kind === "ready" && (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
          )}
          <span>{view.primaryText}</span>
        </span>

        {view.updatedBadgeText && (
          <span
            className={`inline-flex items-center gap-1 min-h-[44px] px-2.5 py-1 rounded-lg border text-xs font-bold ${
              darkMode
                ? "bg-emerald-950/60 border-emerald-700/60 text-emerald-200"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{view.updatedBadgeText}</span>
          </span>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={syncStatus === "loading" || syncStatus === "syncing"}
            aria-label="Sync drugs now"
            title="Sync drugs now"
            className={`min-h-[44px] min-w-[44px] px-2.5 rounded-lg border text-xs font-bold inline-flex items-center justify-center transition-colors disabled:opacity-50 ${
              darkMode
                ? "bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${
                syncStatus === "loading" || syncStatus === "syncing" ? "animate-spin" : ""
              }`}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    );
  }

  if (status === "update-available") {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold animate-pulse">
        <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
        <span>New verified data available —</span>
        <button
          type="button"
          onClick={handleReload}
          className="underline hover:text-emerald-900 dark:hover:text-white font-extrabold cursor-pointer"
        >
          Reload
        </button>
      </div>
    );
  }

  if (status === "caching") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Caching…</span>
      </span>
    );
  }

  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-sky-700 dark:text-sky-300 font-semibold">
        <Zap className="w-3.5 h-3.5 text-sky-500" />
        <span>
          ⚡ Offline-ready • data v{cachedVersion || dataHash} cached
        </span>
        {!isOnline && (
          <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
            Offline mode
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
      <Wifi className="w-3.5 h-3.5 text-slate-400" />
      <span>Online only</span>
    </span>
  );
}
