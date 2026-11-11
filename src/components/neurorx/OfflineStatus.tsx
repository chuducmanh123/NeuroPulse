"use client";

import React, { useState, useEffect } from "react";
import { Zap, RefreshCw, Wifi, WifiOff, CheckCircle2 } from "lucide-react";

interface OfflineStatusProps {
  dataHash?: string;
  darkMode?: boolean;
}

type PwaStatus = "online-only" | "caching" | "ready" | "update-available";

export function OfflineStatus({
  dataHash = "v1-live",
  darkMode = false,
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
