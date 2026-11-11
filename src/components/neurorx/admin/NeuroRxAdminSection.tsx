"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Database,
  Download,
  Copy,
  Check,
  Terminal,
  RefreshCw,
  GitPullRequest,
  AlertTriangle,
} from "lucide-react";
import { getStoredAdminToken } from "@/utils/clientAuth";
import { DataHealth } from "./DataHealth";
import { UpdateQueueList } from "./UpdateQueueList";
import { ExtractorPanel } from "./ExtractorPanel";
import type { UpdateQueueItem } from "@/types/neurorx";

interface NeuroRxAdminSectionProps {
  darkMode?: boolean;
}

interface AdminDataResponse {
  version_hash: string;
  health: {
    total_drugs: number;
    verified_count: number;
    draft_count: number;
    hash_mismatch_count: number;
    sources_count: number;
    interactions_count: number;
  };
  updates_queue: UpdateQueueItem[];
  drafts: { id: string; name: string; classes: string[]; status: string }[];
}

export function NeuroRxAdminSection({ darkMode = false }: NeuroRxAdminSectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "extractor">("dashboard");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDataResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredAdminToken();
      const res = await fetch("/api/neurorx/admin-data", {
        headers: {
          "x-admin-token": token || "",
        },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to load NeuroRx admin status");
      }
      setData(json.data);
    } catch (err: any) {
      setError(err?.message || "Error connecting to NeuroRx admin API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCopyCommand = async (drugId: string) => {
    const cmd = `npm run rx:verify -- ${drugId} --by "Admin"`;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedId(drugId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const handleExport = async () => {
    const token = getStoredAdminToken();
    try {
      const res = await fetch("/api/neurorx/admin-data?export=true", {
        headers: {
          "x-admin-token": token || "",
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `neurorx-data-backup-${data?.version_hash || "v1"}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Failed to export NeuroRx data bundle.");
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-sky-500" />
        <span>Loading NeuroRx data integrity &amp; audit status…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
        <div className="flex items-center gap-2 font-bold mb-1">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>Failed to load NeuroRx status</span>
        </div>
        <p>{error || "No data returned."}</p>
        <button
          onClick={fetchAdminData}
          className="mt-3 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>💊 NeuroRx Administration &amp; Provenance Hub</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold">
              v{data.version_hash}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Read-only clinical decision support system governance, label watcher queue, and cryptographic verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAdminData}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Data Bundle (JSON)</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("dashboard")}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
            activeSubTab === "dashboard"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          Repository Health &amp; Queues
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("extractor")}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${
            activeSubTab === "extractor"
              ? "bg-sky-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <span>Source Extractor (AI + Quote-Guard)</span>
        </button>
      </div>

      {activeSubTab === "extractor" ? (
        <ExtractorPanel darkMode={darkMode} />
      ) : (
        <>
          {/* 1. Data Health & Cryptographic State */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Clinical Repository Health &amp; Verification State
            </h3>
            <DataHealth health={data.health} versionHash={data.version_hash} darkMode={darkMode} />
          </div>

          {/* 2. Label Watch Queue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <GitPullRequest className="w-4 h-4 text-indigo-500" />
                <span>DailyMed / OpenFDA Label Watch Updates Queue</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                {data.updates_queue.length} item(s) in queue
              </span>
            </div>
            <UpdateQueueList items={data.updates_queue} darkMode={darkMode} />
          </div>

          {/* 3. Draft Verification Queue & Terminal Commands */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-amber-500" />
                <span>Draft Records Verification Queue ({data.drafts.length})</span>
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Review against source PDF, then verify via terminal CLI
              </span>
            </div>

            <div
              className={`rounded-2xl border overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              {data.drafts.map((draft) => {
                const isCopied = copiedId === draft.id;
                const cmd = `npm run rx:verify -- ${draft.id} --by "Admin"`;

                return (
                  <div
                    key={draft.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 dark:hover:bg-slate-950/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {draft.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          ({draft.id})
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          Draft (Dosing Locked)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Classes: {draft.classes.join(", ") || "None"}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`px-3 py-1.5 rounded-lg border font-mono text-[11px] flex items-center gap-2 select-all ${
                          darkMode
                            ? "bg-slate-950 border-slate-800 text-slate-300"
                            : "bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span>{cmd}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCommand(draft.id)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isCopied
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "border-slate-300 dark:border-slate-700 hover:border-sky-500 text-slate-600 dark:text-slate-300"
                        }`}
                        title="Copy verification command"
                      >
                        {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
