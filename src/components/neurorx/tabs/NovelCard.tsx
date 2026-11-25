"use client";

import React from "react";
import {
  Sparkles,
  Award,
  CheckCircle,
  Syringe,
  AlertCircle,
  ExternalLink,
  Eye,
  FileText,
  BookOpen,
} from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import type { Source } from "@/types/neurorx";
import { SourcePopover } from "../drug/SourcePopover";
import { MonitoringTimeline } from "./MonitoringTimeline";

interface NovelCardProps {
  drugItem: DrugWithEffectiveStatus;
  sources?: Source[];
  darkMode?: boolean;
}

export function NovelCard({
  drugItem,
  sources = [],
  darkMode = false,
}: NovelCardProps) {
  const { drug, effectiveStatus } = drugItem;
  const isDraft = effectiveStatus === "draft";
  const displayName = drug.tall_man?.value || drug.generic_name;
  const novel = drug.novel;
  const ecosystemLinks = drug.links || novel?.links;

  if (!novel) return null;

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[#2F855A]/50 transition-all shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border-hairline)] pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#2F855A]/10 text-[#2F855A] dark:text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-[var(--text-ink)]">
              {displayName}
            </h3>
            {isDraft ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                Pending verification
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#2F855A]/15 text-[#2F855A] dark:text-emerald-400 border border-[#2F855A]/25">
                Verified Protocol
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {drug.classes.join(" • ")}
          </p>
        </div>

        {/* Ecosystem Link Buttons */}
        {ecosystemLinks && (
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {ecosystemLinks.neurovision && (
              <a
                href={ecosystemLinks.neurovision}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  darkMode
                    ? "border-sky-800 bg-sky-950/40 text-sky-300 hover:bg-sky-900/50"
                    : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>NeuroVision</span>
              </a>
            )}
            {ecosystemLinks.neuropulse && (
              <a
                href={ecosystemLinks.neuropulse}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  darkMode
                    ? "border-emerald-800 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>NeuroPulse</span>
              </a>
            )}
            {ecosystemLinks.neuroguide && (
              <a
                href={ecosystemLinks.neuroguide}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  darkMode
                    ? "border-indigo-800 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50"
                    : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>NeuroGuide</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* 1. Regulatory Approvals */}
      {novel.approvals && novel.approvals.value && novel.approvals.value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>Regulatory Approvals</span>
            </span>
            {novel.approvals.refs && novel.approvals.refs.length > 0 && (
              <SourcePopover
                refs={novel.approvals.refs}
                sources={sources}
                label="Source"
                darkMode={darkMode}
              />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {novel.approvals.value.map((app, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-xs"
              >
                <div className="font-bold text-[var(--text-ink)] flex items-center justify-between">
                  <span>{app.agency}</span>
                  <span className="text-[11px] font-normal text-[var(--text-muted)]">
                    {app.date}
                  </span>
                </div>
                <p className="text-[var(--text-secondary)] mt-1">
                  {app.indication}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Patient Eligibility Criteria */}
      {novel.eligibility && novel.eligibility.value && novel.eligibility.value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Patient Eligibility & Criteria</span>
            </span>
            {novel.eligibility.refs && novel.eligibility.refs.length > 0 && (
              <SourcePopover
                refs={novel.eligibility.refs}
                sources={sources}
                label="Source"
                darkMode={darkMode}
              />
            )}
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {novel.eligibility.value.map((crit, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{crit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Administration Protocol */}
      {novel.administration && novel.administration.value && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Syringe className="w-3.5 h-3.5 text-indigo-500" />
              <span>Administration Protocol & Dosing</span>
            </span>
            {novel.administration.refs && novel.administration.refs.length > 0 && (
              <SourcePopover
                refs={novel.administration.refs}
                sources={sources}
                label="Source"
                darkMode={darkMode}
              />
            )}
          </div>
          <p className="text-xs text-[var(--text-ink)] leading-relaxed font-medium p-3 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-hairline)]">
            {novel.administration.value}
          </p>
        </div>
      )}

      {/* 4. Monitoring Timeline */}
      {novel.monitoring && (
        <MonitoringTimeline
          monitoring={novel.monitoring}
          sources={sources}
          darkMode={darkMode}
        />
      )}

      {/* 5. Prerequisites */}
      {novel.prerequisites && novel.prerequisites.value && novel.prerequisites.value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Pre-treatment Prerequisites & Safety Screenings</span>
            </span>
            {novel.prerequisites.refs && novel.prerequisites.refs.length > 0 && (
              <SourcePopover
                refs={novel.prerequisites.refs}
                sources={sources}
                label="Source"
                darkMode={darkMode}
              />
            )}
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            {novel.prerequisites.value.map((prereq, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{prereq}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
