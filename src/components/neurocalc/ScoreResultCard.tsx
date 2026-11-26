"use client";

import React from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import type { ScoreEvaluationResult } from "@/lib/neurocalc/engine";
import type { ScaleRecord, SeverityLevel } from "@/types/neurocalc";

interface ScoreResultCardProps {
  scale: ScaleRecord;
  evaluation: ScoreEvaluationResult;
  onReset: () => void;
}

const SEVERITY_STYLES: Record<
  SeverityLevel,
  {
    badge: string;
    barActive: string;
    barInactive: string;
    border: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  normal: {
    badge:
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    barActive: "bg-emerald-600 dark:bg-emerald-500",
    barInactive: "bg-emerald-500/20",
    border: "border-emerald-500/30",
    Icon: CheckCircle2,
  },
  mild: {
    badge: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30",
    barActive: "bg-[#0E7490] dark:bg-cyan-500",
    barInactive: "bg-cyan-500/20",
    border: "border-cyan-500/30",
    Icon: Activity,
  },
  moderate: {
    badge:
      "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    barActive: "bg-amber-500",
    barInactive: "bg-amber-500/20",
    border: "border-amber-500/30",
    Icon: AlertTriangle,
  },
  severe: {
    badge:
      "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30",
    barActive: "bg-orange-600 dark:bg-orange-500",
    barInactive: "bg-orange-500/20",
    border: "border-orange-500/30",
    Icon: AlertOctagon,
  },
  critical: {
    badge: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
    barActive: "bg-rose-600 dark:bg-rose-500",
    barInactive: "bg-rose-500/20",
    border: "border-rose-500/30",
    Icon: ShieldAlert,
  },
  info: {
    badge:
      "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
    barActive: "bg-[#0E7490] dark:bg-cyan-500",
    barInactive: "bg-slate-500/20",
    border: "border-[var(--border-hairline)]",
    Icon: Info,
  },
};

export function ScoreResultCard({
  scale,
  evaluation,
  onReset,
}: ScoreResultCardProps) {
  if (evaluation.isGated) {
    return (
      <div className="rounded-2xl border border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/30 p-5">
        <div className="flex items-start gap-2.5">
          <ShieldAlert
            className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              Pending clinical verification
            </h3>
            <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
              This scale is currently in <span className="font-semibold uppercase">{evaluation.effectiveStatus}</span>{" "}
              status or failed integrity verification. Live clinical scoring is disabled until reviewed and verified in Admin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeBand = evaluation.band;
  const activeStyle = activeBand
    ? SEVERITY_STYLES[activeBand.severity]
    : SEVERITY_STYLES.info;
  const SeverityIcon = activeStyle.Icon;
  const hasAnyScore = evaluation.formattedScore !== null;

  const visibleBands =
    evaluation.applicableBands.length > 0
      ? evaluation.applicableBands
      : scale.interpretation;

  return (
    <div
      id="neurocalc-result-card"
      className={`rounded-2xl border border-l-4 border-l-[#0E7490] bg-[var(--bg-surface)] p-5 shadow-2xs transition-colors ${activeStyle.border}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
          Live Result
        </span>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      {evaluation.effectiveStatus !== "verified" && (
        <div className="mb-3 rounded-xl border border-amber-500/35 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 text-[11.5px] text-amber-900 dark:text-amber-200 leading-snug">
          <span className="font-bold">Draft Preview (Admin only)</span> — Live scoring is enabled for review. Verify this scale in Admin before clinical use.
        </div>
      )}

      {/* Primary Score Display */}
      <div className="flex items-baseline gap-2">
        <span className="font-mono-tech text-4xl font-bold tracking-tight text-[var(--text-ink)]">
          {hasAnyScore ? evaluation.formattedScore : "—"}
        </span>
        {scale.scoring.max_score !== null ? (
          <span className="font-mono-tech text-sm font-semibold text-[var(--text-muted)]">
            / {scale.scoring.max_score} {scale.scoring.unit ?? "pts"}
          </span>
        ) : (
          scale.scoring.unit && (
            <span className="font-mono-tech text-sm font-semibold text-[var(--text-muted)]">
              {scale.scoring.unit}
            </span>
          )
        )}
      </div>

      {/* Completion Status */}
      <div className="mt-2">
        {evaluation.isComplete ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              Complete ({evaluation.answeredCount}/{evaluation.requiredCount} required)
            </span>
          </span>
        ) : (
          <span className="text-xs font-medium text-[var(--text-muted)]">
            {scale.scoring.method === "formula"
              ? `Enter all ${evaluation.requiredCount} required inputs (${evaluation.answeredCount}/${evaluation.requiredCount})`
              : `Partial — ${Math.max(
                  0,
                  evaluation.requiredCount - evaluation.answeredCount
                )} required item(s) remaining`}
          </span>
        )}
      </div>

      {/* Visual Segmented Severity Bar */}
      {visibleBands.length > 0 && (
        <div className="mt-4">
          <div
            className="flex gap-1.5"
            role="img"
            aria-label={
              activeBand
                ? `Severity: ${activeBand.label}`
                : "Severity stratification bar"
            }
          >
            {visibleBands.map((band) => {
              const style = SEVERITY_STYLES[band.severity];
              const isActive = activeBand?.id === band.id;
              const visibleBands =
    evaluation.applicableBands.length > 0
      ? evaluation.applicableBands
      : scale.interpretation;

  return (
                <div
                  key={band.id}
                  title={`${band.label} (${band.min}${
                    band.max !== null ? `–${band.max}` : "+"
                  })`}
                  className="flex-1 flex flex-col gap-1"
                >
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      isActive
                        ? `${style.barActive} ring-2 ring-offset-1 ring-offset-[var(--bg-surface)] ring-current`
                        : style.barInactive
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono-tech truncate text-center ${
                      isActive
                        ? "font-bold text-[var(--text-ink)]"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {band.min}
                    {band.max !== null
                      ? band.max === band.min
                        ? ""
                        : `–${band.max}`
                      : "+"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Interpretation Band */}
      {activeBand ? (
        <div className="mt-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${activeStyle.badge}`}
            >
              <SeverityIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{activeBand.label}</span>
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {activeBand.summary}
          </p>
          {activeBand.clinical_note && (
            <p className="mt-1.5 text-[11.5px] text-[var(--text-muted)] leading-relaxed">
              {activeBand.clinical_note}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-paper)]/50 p-3.5 text-xs text-[var(--text-muted)]">
          Complete all required items to display final stratification and clinical interpretation.
        </div>
      )}

      {/* Optional Subscores */}
      {evaluation.subscores.length > 0 && (
        <div className="mt-4 pt-3.5 border-t border-[var(--border-hairline)]">
          <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            Subscores
          </p>
          <div className="grid grid-cols-2 gap-2">
            {evaluation.subscores.map((sub) => (
              <div
                key={sub.id}
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-2"
              >
                <span className="block text-[11px] text-[var(--text-muted)] truncate">
                  {sub.label}
                </span>
                <span className="font-mono-tech text-sm font-bold text-[var(--text-ink)]">
                  {sub.score !== null ? sub.score : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Untestable (UN) Items Callout */}
      {evaluation.untestableItems.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/35 bg-amber-50/70 dark:bg-amber-950/25 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
            Untestable (UN) Items ({evaluation.untestableItems.length})
          </p>
          <ul className="space-y-0.5 text-xs text-amber-950 dark:text-amber-100/90">
            {evaluation.untestableItems.map((u) => (
              <li key={u.itemId}>
                {u.code ? <span className="font-mono-tech font-bold mr-1">{u.code}</span> : null}
                {u.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
