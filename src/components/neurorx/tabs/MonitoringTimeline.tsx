"use client";

import React from "react";
import { Clock, ShieldCheck } from "lucide-react";
import type { Sourced, Source } from "@/types/neurorx";
import { SourcePopover } from "../drug/SourcePopover";

interface MonitoringTimelineProps {
  monitoring?: Sourced<{ timepoint: string; action: string }[]>;
  sources?: Source[];
  darkMode?: boolean;
}

export function MonitoringTimeline({
  monitoring,
  sources = [],
  darkMode = false,
}: MonitoringTimelineProps) {
  if (!monitoring || !monitoring.value || monitoring.value.length === 0) {
    return null;
  }

  const items = monitoring.value;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span>Safety Monitoring Timeline</span>
        </span>
        {monitoring.refs && monitoring.refs.length > 0 && (
          <SourcePopover
            refs={monitoring.refs}
            sources={sources}
            label="Protocol Source"
            darkMode={darkMode}
          />
        )}
      </div>

      <div className="relative pl-5 border-l-2 border-indigo-200 dark:border-indigo-900/60 space-y-4 my-2">
        {items.map((item, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline marker node */}
            <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-indigo-500 bg-white dark:bg-slate-900" />

            <div className="space-y-0.5">
              <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 block">
                {item.timepoint}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {item.action}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
