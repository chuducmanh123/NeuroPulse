"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
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
  onJumpToEvidence?: () => void;
}

const SEVERITY_STYLES: Record<
  SeverityLevel,
  {
    badge: string;
    barActive: string;
    barInactive: string;
    border: string;
    topBorder: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  normal: {
    badge:
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30",
    barActive: "bg-emerald-600 dark:bg-emerald-500",
    barInactive: "bg-emerald-500/20",
    border: "border-emerald-500/30",
    topBorder: "border-t-emerald-600 dark:border-t-emerald-500",
    Icon: CheckCircle2,
  },
  mild: {
    badge: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border-cyan-500/30",
    barActive: "bg-[#0E7490] dark:bg-cyan-500",
    barInactive: "bg-cyan-500/20",
    border: "border-cyan-500/30",
    topBorder: "border-t-[#0E7490] dark:border-t-cyan-500",
    Icon: Activity,
  },
  moderate: {
    badge:
      "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
    barActive: "bg-amber-500",
    barInactive: "bg-amber-500/20",
    border: "border-amber-500/30",
    topBorder: "border-t-amber-500",
    Icon: AlertTriangle,
  },
  severe: {
    badge:
      "bg-orange-500/15 text-orange-800 dark:text-orange-300 border-orange-500/30",
    barActive: "bg-orange-600 dark:bg-orange-500",
    barInactive: "bg-orange-500/20",
    border: "border-orange-500/30",
    topBorder: "border-t-orange-600 dark:border-t-orange-500",
    Icon: AlertOctagon,
  },
  critical: {
    badge: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30",
    barActive: "bg-rose-600 dark:bg-rose-500",
    barInactive: "bg-rose-500/20",
    border: "border-rose-500/30",
    topBorder: "border-t-rose-600 dark:border-t-rose-500",
    Icon: ShieldAlert,
  },
  info: {
    badge:
      "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
    barActive: "bg-[#0E7490] dark:bg-cyan-500",
    barInactive: "bg-slate-500/20",
    border: "border-[var(--border-hairline)]",
    topBorder: "border-t-[#0E7490] dark:border-t-cyan-500",
    Icon: Info,
  },
};

function formatScoreUnitSuffix(scale: ScaleRecord): string {
  if (scale.scoring.unit === "%" && scale.scoring.max_score === 100) {
    return "%";
  }
  if (scale.scoring.max_score !== null) {
    return ` / ${scale.scoring.max_score} ${scale.scoring.unit ?? "pts"}`;
  }
  return scale.scoring.unit ? ` ${scale.scoring.unit}` : "";
}

export function ScoreResultCard({
  scale,
  evaluation,
  onReset,
  onJumpToEvidence,
}: ScoreResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setIsExpanded(false);
    setCopied(false);
  }, [scale.id]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded]);

  const handleResetClick = () => {
    setIsExpanded(false);
    onReset();
  };

  if (evaluation.isGated) {
    return (
      <div className="fixed bottom-0 left-0 right-0 sm:left-[44px] z-20 pointer-events-none sm:px-8">
        <div
          id="neurocalc-result-card"
          role="region"
          aria-label="Verification status"
          className="pointer-events-auto mx-auto max-w-4xl rounded-t-2xl border-t-[3px] sm:border-x border-amber-500/50 bg-amber-50 dark:bg-amber-950 px-4 py-3 sm:px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_-8px_rgba(28,25,23,0.16)] dark:shadow-[0_-12px_36px_-8px_rgba(0,0,0,0.65)]"
        >
          <div className="flex items-start gap-2.5">
            <ShieldAlert
              className="w-5 h-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Pending clinical verification
              </h3>
              <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/80 leading-relaxed">
                This scale is currently in{" "}
                <span className="font-semibold uppercase">
                  {evaluation.effectiveStatus}
                </span>{" "}
                status or failed integrity verification. Live clinical scoring is
                disabled until reviewed and verified in Admin.
              </p>
            </div>
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
  const hasComponentOnly = Boolean(
    evaluation.totalInvalidatedReason && evaluation.componentNotation
  );
  const canCopy = hasAnyScore || hasComponentOnly;

  const visibleBands =
    evaluation.applicableBands.length > 0
      ? evaluation.applicableBands
      : scale.interpretation;

  const hasOutputMetrics = Boolean(
    evaluation.isComplete &&
      evaluation.outputMetrics &&
      evaluation.outputMetrics.length > 0
  );
  const extraOutputCount = hasOutputMetrics
    ? Math.max(0, evaluation.outputMetrics!.length - 1)
    : 0;
  const hasSubscores = evaluation.subscores.length > 0;
  const hasUntestable = evaluation.untestableItems.length > 0;
  const hasWarnings = Boolean(
    evaluation.warnings && evaluation.warnings.length > 0
  );
  const hasMultiResults = hasOutputMetrics || hasSubscores;
  const canExpand =
    hasMultiResults ||
    hasUntestable ||
    hasWarnings ||
    Boolean(evaluation.totalInvalidatedReason) ||
    Boolean(scale.metadata.critical_caveat) ||
    visibleBands.length > 0 ||
    Boolean(activeBand) ||
    evaluation.effectiveStatus !== "verified";

  const handleCopy = async () => {
    if (!canCopy) return;
    const lines: string[] = [];
    const headerTitle = evaluation.primaryMetricLabel
      ? `${scale.metadata.short_name} — ${evaluation.primaryMetricLabel}`
      : scale.metadata.short_name;

    if (hasComponentOnly) {
      lines.push(
        `${headerTitle}: ${evaluation.componentNotation} (Total not summed — NT component)`
      );
    } else if (evaluation.formattedScore !== null) {
      const compSuffix = evaluation.componentNotation
        ? ` (${evaluation.componentNotation})`
        : "";
      lines.push(
        `${headerTitle}: ${evaluation.formattedScore}${formatScoreUnitSuffix(scale)}${compSuffix}`
      );
    }

    if (activeBand) {
      lines.push(`Interpretation: ${activeBand.label}`);
      if (activeBand.summary) {
        lines.push(activeBand.summary);
      }
    }

    if (evaluation.isComplete && scale.metadata.critical_caveat) {
      lines.push(`Caveat: ${scale.metadata.critical_caveat}`);
    }

    if (hasOutputMetrics && evaluation.outputMetrics) {
      const groups: string[] = [];
      for (const m of evaluation.outputMetrics) {
        if (!groups.includes(m.group)) groups.push(m.group);
      }
      for (const group of groups) {
        lines.push("", `${group}:`);
        for (const m of evaluation.outputMetrics.filter(
          (item) => item.group === group
        )) {
          const noteStr = m.note ? ` (${m.note})` : "";
          lines.push(`- ${m.label}${noteStr}: ${m.formattedValue ?? "—"}`);
        }
      }
    }

    if (hasSubscores) {
      lines.push("", "Subscores:");
      for (const sub of evaluation.subscores) {
        lines.push(`- ${sub.label}: ${sub.score !== null ? sub.score : "—"}`);
      }
    }

    if (hasUntestable) {
      lines.push("", "Untestable (UN) Items:");
      for (const u of evaluation.untestableItems) {
        lines.push(`- ${u.code ? `${u.code} ` : ""}${u.label}`);
      }
    }

    try {
      await navigator.clipboard?.writeText(lines.join("\n"));
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimeoutRef.current = null;
      }, 1800);
    } catch {
      // Clipboard unavailable or permission denied
    }
  };

  const outputGroups: string[] = [];
  if (hasOutputMetrics && evaluation.outputMetrics) {
    for (const m of evaluation.outputMetrics) {
      if (!outputGroups.includes(m.group)) outputGroups.push(m.group);
    }
  }

  return (
    <>
      {isExpanded && (
        <div
          className="fixed inset-0 sm:left-[44px] z-30 bg-black/25 dark:bg-black/50 backdrop-blur-[1px]"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 sm:left-[44px] ${
          isExpanded ? "z-40" : "z-20"
        } pointer-events-none sm:px-8`}
      >
        <div
          id="neurocalc-result-card"
          role="region"
          aria-label="Live calculation result"
          className={`pointer-events-auto mx-auto max-w-4xl rounded-t-2xl border-t-[3px] sm:border-x bg-[var(--bg-surface)] shadow-[0_-10px_32px_-8px_rgba(28,25,23,0.18)] dark:shadow-[0_-14px_40px_-8px_rgba(0,0,0,0.7)] transition-colors ${activeStyle.border} ${activeStyle.topBorder} pb-[env(safe-area-inset-bottom)]`}
        >
          {/* Always-Visible Collapsed Summary Header (Primary Result Only) */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5">
            {canExpand && (
              <div
                className="sm:hidden mx-auto mb-2 h-1 w-9 rounded-full bg-[var(--border-hairline)]"
                aria-hidden="true"
              />
            )}

            <div className="flex items-center justify-between gap-2.5 sm:gap-4">
              {/* Left Column: Primary Score & Status */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mb-0.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400">
                    {evaluation.primaryMetricLabel ?? "Live Result"}
                  </span>
                  {evaluation.isComplete && evaluation.modelLabel && (
                    <span className="hidden sm:inline-flex rounded bg-[#0E7490]/10 dark:bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#0E7490] dark:text-cyan-300">
                      {evaluation.modelLabel}
                    </span>
                  )}
                  {evaluation.effectiveStatus !== "verified" && (
                    <span className="inline-flex rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                      Draft Preview
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  {hasComponentOnly ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono-tech text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-ink)] leading-none">
                        {evaluation.componentNotation}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>Component Only (NT)</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1.5 shrink-0">
                      <span className="font-mono-tech text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-ink)] leading-none">
                        {hasAnyScore ? evaluation.formattedScore : "—"}
                      </span>
                      {scale.scoring.unit === "%" &&
                      scale.scoring.max_score === 100 ? (
                        <span className="font-mono-tech text-sm sm:text-base font-semibold text-[var(--text-muted)]">
                          %
                        </span>
                      ) : scale.scoring.max_score !== null ? (
                        <span className="font-mono-tech text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                          / {scale.scoring.max_score} {scale.scoring.unit ?? "pts"}
                        </span>
                      ) : (
                        scale.scoring.unit && (
                          <span className="font-mono-tech text-xs sm:text-sm font-semibold text-[var(--text-muted)]">
                            {scale.scoring.unit}
                          </span>
                        )
                      )}
                      {evaluation.componentNotation && (
                        <span className="ml-1 rounded-md bg-[#0E7490]/12 dark:bg-cyan-500/15 px-1.5 py-0.5 font-mono-tech text-xs font-bold text-[#0E7490] dark:text-cyan-300">
                          {evaluation.componentNotation}
                        </span>
                      )}
                    </div>
                  )}

                  {activeBand ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] sm:text-xs font-bold max-w-full ${activeStyle.badge}`}
                    >
                      <SeverityIcon
                        className="w-3.5 h-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{activeBand.label}</span>
                    </span>
                  ) : evaluation.totalInvalidatedReason ? (
                    <span className="text-xs font-medium text-amber-800 dark:text-amber-300 truncate">
                      Total not summed (NT component)
                    </span>
                  ) : evaluation.isComplete ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2
                        className="w-3.5 h-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        Complete ({evaluation.answeredRequiredCount}/
                        {evaluation.requiredCount})
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-[var(--text-muted)] truncate">
                      {scale.scoring.method === "formula"
                        ? `Enter ${evaluation.requiredCount} required (${evaluation.answeredRequiredCount}/${evaluation.requiredCount})`
                        : `Partial — ${Math.max(
                            0,
                            evaluation.requiredCount -
                              evaluation.answeredRequiredCount
                          )} left`}
                    </span>
                  )}
                </div>

                {/* Desktop-only concise single-line context */}
                <div className="hidden md:block mt-1">
                  {activeBand?.summary ? (
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {activeBand.summary}
                    </p>
                  ) : (
                    visibleBands.length > 0 && (
                      <div
                        className="flex gap-1 max-w-xs mt-1.5"
                        role="img"
                        aria-label="Severity stratification preview"
                      >
                        {visibleBands.map((band) => {
                          const style = SEVERITY_STYLES[band.severity];
                          const isActive = activeBand?.id === band.id;
                          return (
                            <div
                              key={band.id}
                              className={`flex-1 h-1.5 rounded-full ${
                                isActive ? style.barActive : style.barInactive
                              }`}
                            />
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {canCopy && (
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    aria-label={copied ? "Result copied" : "Copy result"}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    {copied ? (
                      <Check
                        className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">
                      {copied ? "Copied" : "Copy"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetClick}
                  aria-label="Reset inputs"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">Reset</span>
                </button>

                {canExpand && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    aria-expanded={isExpanded}
                    aria-controls="neurocalc-result-details"
                    aria-label={
                      isExpanded
                        ? "Hide result details"
                        : !hasMultiResults
                          ? "Show result details"
                          : undefined
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                      !isExpanded && hasMultiResults
                        ? "bg-[#0E7490] text-white border border-[#0E7490] hover:bg-[#0B5F75] dark:bg-cyan-600 dark:border-cyan-500 dark:hover:bg-cyan-500"
                        : "border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    {isExpanded ? (
                      <>
                        <span>Hide</span>
                        <ChevronDown
                          className="w-4 h-4 shrink-0"
                          aria-hidden="true"
                        />
                      </>
                    ) : hasOutputMetrics ? (
                      <>
                        <span className="sm:hidden">+{extraOutputCount}</span>
                        <span className="hidden sm:inline">
                          More results (+{extraOutputCount})
                        </span>
                        <ChevronUp
                          className="w-4 h-4 shrink-0"
                          aria-hidden="true"
                        />
                      </>
                    ) : hasSubscores ? (
                      <>
                        <span className="sm:hidden">
                          +{evaluation.subscores.length}
                        </span>
                        <span className="hidden sm:inline">
                          Subscores ({evaluation.subscores.length})
                        </span>
                        <ChevronUp
                          className="w-4 h-4 shrink-0"
                          aria-hidden="true"
                        />
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Details</span>
                        <ChevronUp
                          className="w-4 h-4 shrink-0"
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Inline Critical Clinical Caveat */}
            {evaluation.isComplete && scale.metadata.critical_caveat && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/35 bg-amber-50/85 dark:bg-amber-950/35 px-2.5 py-1.5 text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                <AlertTriangle
                  className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-300"
                  aria-hidden="true"
                />
                <span>{scale.metadata.critical_caveat}</span>
              </div>
            )}
          </div>

          {/* Expanded Drawer Content */}
          {isExpanded && (
            <div
              id="neurocalc-result-details"
              className="border-t border-[var(--border-hairline)] max-h-[62dvh] sm:max-h-[65dvh] overflow-y-auto custom-scrollbar px-4 py-4 sm:px-5 space-y-4"
            >
              {evaluation.effectiveStatus !== "verified" && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 text-[11.5px] text-amber-900 dark:text-amber-200 leading-snug">
                  <span className="font-bold">Draft Preview (Admin only)</span> —
                  Live scoring is enabled for review. Verify this scale in Admin
                  before clinical use.
                </div>
              )}

              {/* Detailed Completion Status */}
              <div>
                {evaluation.isComplete ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      Complete ({evaluation.answeredRequiredCount}/
                      {evaluation.requiredCount} required
                      {evaluation.answeredCount >
                      evaluation.answeredRequiredCount
                        ? ` + ${
                            evaluation.answeredCount -
                            evaluation.answeredRequiredCount
                          } optional`
                        : ""}
                      )
                    </span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {scale.scoring.method === "formula"
                      ? `Enter all ${evaluation.requiredCount} required inputs (${evaluation.answeredRequiredCount}/${evaluation.requiredCount})`
                      : `Partial — ${Math.max(
                          0,
                          evaluation.requiredCount -
                            evaluation.answeredRequiredCount
                        )} required item(s) remaining`}
                  </span>
                )}
              </div>

              {/* Full Visual Segmented Severity Bar */}
              {visibleBands.length > 0 && (
                <div>
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
                <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${activeStyle.badge}`}
                    >
                      <SeverityIcon
                        className="w-3.5 h-3.5 shrink-0"
                        aria-hidden="true"
                      />
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
                <div className="rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-paper)]/50 p-3.5 text-xs text-[var(--text-muted)]">
                  Complete all required items to display final stratification and
                  clinical interpretation.
                </div>
              )}

              {/* Multi-Outcome Breakdown (e.g. AHA PREVENT 10-Year & 30-Year) */}
              {hasOutputMetrics && evaluation.outputMetrics && (
                <div className="pt-3.5 border-t border-[var(--border-hairline)]">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Risk Breakdown
                    </p>
                    {evaluation.modelLabel && (
                      <span className="rounded-md bg-[#0E7490]/10 dark:bg-cyan-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#0E7490] dark:text-cyan-300">
                        {evaluation.modelLabel}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {outputGroups.map((group) => {
                      const items = evaluation.outputMetrics!.filter(
                        (m) => m.group === group
                      );
                      return (
                        <div
                          key={group}
                          className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3"
                        >
                          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400 mb-2">
                            {group}
                          </p>
                          <dl className="space-y-1.5">
                            {items.map((m) => (
                              <div
                                key={m.id}
                                className={`flex items-baseline justify-between gap-2 text-xs ${
                                  m.highlight
                                    ? "font-bold text-[var(--text-ink)]"
                                    : "text-[var(--text-secondary)]"
                                }`}
                              >
                                <dt className="truncate">
                                  {m.label}
                                  {m.note && (
                                    <span className="ml-1 text-[10px] font-normal text-[var(--text-muted)]">
                                      ({m.note})
                                    </span>
                                  )}
                                </dt>
                                <dd
                                  className={`font-mono-tech tabular-nums shrink-0 ${
                                    m.value === null
                                      ? "text-[var(--text-muted)] font-normal"
                                      : m.highlight
                                        ? "text-[var(--text-ink)]"
                                        : "font-semibold text-[var(--text-ink)]"
                                  }`}
                                >
                                  {m.formattedValue ?? "—"}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    })}
                  </div>

                  {hasWarnings && evaluation.warnings && (
                    <div className="mt-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 px-3 py-2 space-y-1">
                      {evaluation.warnings.map((w, idx) => (
                        <p
                          key={idx}
                          className="text-[11px] text-[var(--text-muted)] leading-snug"
                        >
                          {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Optional Subscores */}
              {hasSubscores && (
                <div className="pt-3.5 border-t border-[var(--border-hairline)]">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                    Subscores
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

              {/* Untestable (UN/NT) Items Callout */}
              {(hasUntestable || evaluation.totalInvalidatedReason) && (
                <div className="rounded-xl border border-amber-500/35 bg-amber-50/70 dark:bg-amber-950/25 p-3 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Untestable Items ({evaluation.untestableItems.length})
                  </p>
                  {evaluation.totalInvalidatedReason && (
                    <p className="text-xs font-medium text-amber-950 dark:text-amber-100 leading-snug">
                      {evaluation.totalInvalidatedReason}
                    </p>
                  )}
                  <ul className="space-y-0.5 text-xs text-amber-950 dark:text-amber-100/90">
                    {evaluation.untestableItems.map((u) => (
                      <li key={u.itemId}>
                        {u.code ? (
                          <span className="font-mono-tech font-bold mr-1">
                            {u.code}
                          </span>
                        ) : null}
                        {u.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {onJumpToEvidence && (
                <div className="pt-2 border-t border-[var(--border-hairline)] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded(false);
                      onJumpToEvidence();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#0E7490]/35 bg-[#0E7490]/10 dark:bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/20 transition-colors"
                  >
                    <span>Next Steps, Formula &amp; Evidence</span>
                    <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
