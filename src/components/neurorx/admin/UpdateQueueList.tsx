"use client";

import React from "react";
import { ExternalLink, GitPullRequest, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { UpdateQueueItem } from "@/types/neurorx";

interface UpdateQueueListProps {
  items: UpdateQueueItem[];
  darkMode?: boolean;
}

export function UpdateQueueList({ items, darkMode = false }: UpdateQueueListProps) {
  if (items.length === 0) {
    return (
      <div
        className={`p-6 rounded-2xl border text-center text-xs text-slate-500 dark:text-slate-400 space-y-1.5 ${
          darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500 opacity-80 mb-1" />
        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
          Label Watch Queue is Clean
        </h4>
        <p className="max-w-md mx-auto text-[11.5px]">
          All FDA prescribing information versions in <code>sources.json</code> are current. No new SPL releases detected by OpenFDA/DailyMed watcher.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isPending = item.status === "pending";

        return (
          <div
            key={item.id}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                  {item.source_id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    isPending
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 font-mono">
                <span>Version:</span>
                <span className="text-slate-400 line-through">{item.old_version}</span>
                <span>→</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">{item.new_version}</span>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                <span>Affected drugs: </span>
                <strong className="text-slate-700 dark:text-slate-200">
                  {item.drug_ids.join(", ") || "None mapped"}
                </strong>
                <span> · Detected: {new Date(item.detected_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-sky-500 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
                >
                  <span>Label</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>Review in PR</span>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
