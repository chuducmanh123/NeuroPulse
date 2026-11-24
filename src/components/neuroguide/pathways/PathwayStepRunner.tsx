"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Image as ImageIcon,
  Lightbulb,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type {
  BilingualText,
  ClinicalPathwayDoc,
  PathwayEdge,
  PathwayLangMode,
  PathwayNode,
  PathwayNodeKind,
} from "../../../types/clinicalPathways";
import { TIER_CONFIG } from "../../../types/neuroguide";
import {
  buildPathwaySummaryText,
  evaluateChecklistState,
  resolveBilingualDisplay,
} from "../../../lib/neuroguide/pathwayRunnerUtils";
import { OriginalImageDrawer } from "./OriginalImageDrawer";

interface HistoryStep {
  nodeId: string;
  chosenEdgeId?: string;
  chosenLabel?: BilingualText;
}

interface PathwayStepRunnerProps {
  pathway: ClinicalPathwayDoc;
  darkMode?: boolean;
  onBack?: () => void;
  initialLangMode?: PathwayLangMode;
  isPreviewMode?: boolean;
  isAdminVerified?: boolean;
  onEdit?: () => void;
}

const NODE_KIND_META: Record<
  PathwayNodeKind,
  { label: string; badgeClass: string }
> = {
  entry: {
    label: "Entry",
    badgeClass:
      "bg-[#C25934]/12 text-[#C25934] border-[#C25934]/30 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/35",
  },
  decision: {
    label: "Decision",
    badgeClass:
      "bg-sky-500/12 text-sky-700 border-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/35",
  },
  checklist: {
    label: "Checklist",
    badgeClass:
      "bg-violet-500/12 text-violet-700 border-violet-500/30 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/35",
  },
  action: {
    label: "Action",
    badgeClass:
      "bg-amber-500/12 text-amber-700 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/35",
  },
  diagnosis: {
    label: "Diagnosis",
    badgeClass:
      "bg-indigo-500/12 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/35",
  },
  treatment: {
    label: "Treatment",
    badgeClass:
      "bg-emerald-500/12 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/35",
  },
};

function getEdgeToneClasses(tone: PathwayEdge["tone"], isRecommended: boolean): string {
  const ring = isRecommended ? "ring-2 ring-[#C25934]/50 dark:ring-orange-400/50" : "";
  switch (tone) {
    case "positive":
      return `border-emerald-500/35 bg-emerald-500/8 hover:bg-emerald-500/15 text-[var(--text-ink)] ${ring}`;
    case "warning":
      return `border-amber-500/35 bg-amber-500/8 hover:bg-amber-500/15 text-[var(--text-ink)] ${ring}`;
    case "danger":
      return `border-rose-500/35 bg-rose-500/8 hover:bg-rose-500/15 text-[var(--text-ink)] ${ring}`;
    default:
      return `border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 hover:bg-[var(--bg-subtle)] hover:border-[#C25934]/60 text-[var(--text-ink)] ${ring}`;
  }
}

export function PathwayStepRunner({
  pathway,
  onBack,
  initialLangMode = "en",
  isPreviewMode = false,
  isAdminVerified = false,
  onEdit,
}: PathwayStepRunnerProps) {
  const [langMode, setLangMode] = useState<PathwayLangMode>(initialLangMode);
  const [history, setHistory] = useState<HistoryStep[]>([
    { nodeId: pathway.entryNodeId },
  ]);
  const [checkedByNode, setCheckedByNode] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [imageViewerMode, setImageViewerMode] = useState<
    "closed" | "split" | "lightbox"
  >("closed");
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  useEffect(() => {
    setHistory([{ nodeId: pathway.entryNodeId }]);
    setCheckedByNode({});
    setCopiedSummary(false);
  }, [pathway.uid, pathway.entryNodeId]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, PathwayNode>();
    for (const n of pathway.nodes) {
      map.set(n.id, n);
    }
    return map;
  }, [pathway.nodes]);

  const currentStep = history[history.length - 1];
  const currentNode = currentStep ? nodeMap.get(currentStep.nodeId) : undefined;

  const pathwayTitle = resolveBilingualDisplay(pathway.title, langMode);
  const sourceLabel = `${pathway.source.organizationOrAuthor} (${pathway.source.year})${
    pathway.source.figureRef ? ` · ${pathway.source.figureRef}` : ""
  }`;

  const currentChecklistMap = currentNode
    ? checkedByNode[currentNode.id] ?? {}
    : {};
  const checklistEval = useMemo(() => {
    if (!currentNode?.checklistItems?.length) return null;
    return evaluateChecklistState(currentNode.checklistItems, currentChecklistMap);
  }, [currentNode, currentChecklistMap]);

  const handleSelectEdge = (edge: PathwayEdge) => {
    setHistory((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last) {
        updated[updated.length - 1] = {
          ...last,
          chosenEdgeId: edge.id,
          chosenLabel: edge.label,
        };
      }
      updated.push({ nodeId: edge.targetNodeId });
      return updated;
    });
    setCopiedSummary(false);
  };

  const handleRewindTo = (index: number) => {
    setHistory((prev) => {
      const sliced = prev.slice(0, index + 1);
      const last = sliced[sliced.length - 1];
      if (last) {
        sliced[sliced.length - 1] = { nodeId: last.nodeId };
      }
      return sliced;
    });
    setCopiedSummary(false);
  };

  const handleReset = () => {
    setHistory([{ nodeId: pathway.entryNodeId }]);
    setCheckedByNode({});
    setCopiedSummary(false);
  };

  const handleToggleImage = () => {
    if (imageViewerMode !== "closed") {
      setImageViewerMode("closed");
      return;
    }
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setImageViewerMode("lightbox");
    } else {
      setImageViewerMode("split");
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    if (!currentNode) return;
    setCheckedByNode((prev) => ({
      ...prev,
      [currentNode.id]: {
        ...(prev[currentNode.id] ?? {}),
        [itemId]: !prev[currentNode.id]?.[itemId],
      },
    }));
  };

  const handleCopySummary = async () => {
    if (!currentNode) return;
    const trail = history.map((h) => {
      const n = nodeMap.get(h.nodeId);
      return {
        nodeTitle: n ? resolveBilingualDisplay(n.title, langMode).primary : h.nodeId,
        chosenLabel: h.chosenLabel
          ? resolveBilingualDisplay(h.chosenLabel, langMode).primary
          : undefined,
      };
    });
    const text = buildPathwaySummaryText(pathway, trail, currentNode, langMode);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2200);
    } catch {
      // Ignore clipboard failure
    }
  };

  const isSplitOpen = imageViewerMode === "split";
  const isTerminal = Boolean(currentNode && currentNode.edges.length === 0);

  const controlsSection = (
    <div className="flex items-center justify-between gap-2">
      <div
        className="inline-flex shrink-0 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
        role="group"
        aria-label="Language display mode"
      >
        {(
          [
            { id: "en", label: "EN" },
            { id: "vi", label: "VI" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLangMode(opt.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              langMode === opt.id
                ? "bg-[#C25934] text-white shadow-2xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {pathway.sourceImageUrl && (
        <button
          type="button"
          onClick={handleToggleImage}
          className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border whitespace-nowrap transition-all cursor-pointer ${
            imageViewerMode !== "closed"
              ? "bg-[#C25934]/15 border-[#C25934]/40 text-[#C25934] dark:text-orange-300"
              : "bg-[var(--bg-subtle)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-ink)]"
          }`}
        >
          <ImageIcon size={13} className="shrink-0" />
          <span>Original Flowchart</span>
        </button>
      )}
    </div>
  );

  const mobileBreadcrumbStrip = (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]/85 px-3 py-2 shadow-2xs">
      <div className="flex items-center gap-1.5 text-xs overflow-x-auto scrollbar-none min-w-0">
        {history.map((step, idx) => {
          const node = nodeMap.get(step.nodeId);
          const label = node
            ? resolveBilingualDisplay(node.title, langMode).primary
            : step.nodeId;
          const isCurrent = idx === history.length - 1;
          return (
            <React.Fragment key={`${step.nodeId}-${idx}`}>
              {idx > 0 && (
                <ChevronRight size={12} className="text-[var(--text-muted)]/70 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => handleRewindTo(idx)}
                disabled={isCurrent}
                className={`inline-flex items-center gap-1 max-w-[180px] px-2 py-0.5 rounded-lg text-[11px] font-semibold shrink-0 transition-all ${
                  isCurrent
                    ? "bg-[#C25934] text-white cursor-default"
                    : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)] cursor-pointer"
                }`}
              >
                <span className="font-mono text-[10px] opacity-85">{idx + 1}.</span>
                <span className="truncate">{label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {history.length > 1 && (
        <button
          type="button"
          onClick={handleReset}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-ink)] cursor-pointer"
        >
          <RotateCcw size={11} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );

  return (
    <div className={isPreviewMode ? "space-y-3" : "grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"}>
      {/* Full View: Compact Left Sidebar (3 cols) */}
      {!isPreviewMode && (
        <aside className="lg:col-span-3 lg:sticky lg:top-20 space-y-3">
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-2xs space-y-3">
            {/* Nav & Edit Row */}
            {(onBack || (isAdminVerified && onEdit)) && (
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-hairline)]">
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:border-[#C25934]/40 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <ArrowLeft size={13} />
                    <span>Pathways</span>
                  </button>
                ) : (
                  <span />
                )}
                {isAdminVerified && onEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:border-[#C25934]/40 transition-colors cursor-pointer"
                  >
                    <Edit3 size={12} />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            )}

            {/* Badges & Pathway Title */}
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                    pathway.source.sourceType === "guideline"
                      ? "bg-[#C25934]/12 text-[#C25934] border-[#C25934]/30 dark:bg-orange-500/20 dark:text-orange-300"
                      : "bg-indigo-500/12 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300"
                  }`}
                >
                  {pathway.source.sourceType === "guideline" ? "Guideline" : "Textbook"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]">
                  {pathway.subspecialty}
                </span>
                {pathway.status === "draft" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    DRAFT
                  </span>
                )}
              </div>

              <h2 className="text-sm sm:text-base font-bold text-[var(--text-ink)] leading-snug">
                {pathwayTitle.primary}
              </h2>
              {pathwayTitle.secondary && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {pathwayTitle.secondary}
                </p>
              )}
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {pathway.source.title} · {sourceLabel}
                {pathway.source.url && (
                  <>
                    {" · "}
                    <a
                      href={pathway.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-semibold text-[#C25934] hover:underline"
                    >
                      <span>Source</span>
                      <ExternalLink size={10} />
                    </a>
                  </>
                )}
              </p>
            </div>

            {/* Language & Flowchart Controls */}
            <div className="pt-2.5 border-t border-[var(--border-hairline)]">
              {controlsSection}
            </div>
          </div>

          {/* Desktop Vertical Clinical Path Trail */}
          <div className="hidden lg:block rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Pathway Trail ({history.length})
              </span>
              {history.length > 1 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[#C25934] transition-colors cursor-pointer"
                >
                  <RotateCcw size={11} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            <div className="space-y-1">
              {history.map((step, idx) => {
                const node = nodeMap.get(step.nodeId);
                const label = node
                  ? resolveBilingualDisplay(node.title, langMode).primary
                  : step.nodeId;
                const isCurrent = idx === history.length - 1;
                return (
                  <button
                    key={`${step.nodeId}-${idx}`}
                    type="button"
                    onClick={() => handleRewindTo(idx)}
                    disabled={isCurrent}
                    title={
                      step.chosenLabel
                        ? `Selected: ${resolveBilingualDisplay(step.chosenLabel, langMode).primary}`
                        : undefined
                    }
                    className={`w-full text-left flex items-start gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all ${
                      isCurrent
                        ? "bg-[#C25934] text-white font-semibold shadow-xs cursor-default"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-ink)] cursor-pointer"
                    }`}
                  >
                    <span
                      className={`font-mono text-[10.5px] mt-0.5 shrink-0 ${
                        isCurrent ? "text-white/90 font-bold" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {idx + 1}.
                    </span>
                    <span className="line-clamp-2 leading-snug">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      )}

      {/* Preview Mode: Compact Top Bar + Breadcrumb */}
      {isPreviewMode && (
        <>
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-[#C25934]/12 text-[#C25934] border-[#C25934]/30">
                  {pathway.source.sourceType === "guideline" ? "Guideline" : "Textbook"}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]">
                  {pathway.subspecialty}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  LIVE PREVIEW
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-ink)] truncate">
                {pathwayTitle.primary}
              </h2>
            </div>
            {controlsSection}
          </div>
          {mobileBreadcrumbStrip}
        </>
      )}

      {/* Right Main Content (9 cols in full view) */}
      <div className={isPreviewMode ? "" : "lg:col-span-9 min-w-0 space-y-3"}>
        {!isPreviewMode && <div className="lg:hidden">{mobileBreadcrumbStrip}</div>}

        {/* Main Stage: Single Column or Split View */}
        <div
          className={
            isSplitOpen
              ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5 items-start"
              : "w-full"
          }
        >
        <div>
          {!currentNode ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6 text-center animate-pathway-step">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                Node &ldquo;{currentStep?.nodeId}&rdquo; could not be found in this pathway.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-[#C25934] text-white cursor-pointer"
              >
                Restart Pathway
              </button>
            </div>
          ) : (
            <div
              key={`${currentNode.id}-${history.length}`}
              className="animate-pathway-step rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-md shadow-stone-900/[0.04] dark:shadow-black/30 overflow-hidden"
            >
              {/* Top Progress / Status Accent Strip */}
              <div
                className={`h-1.5 w-full transition-colors duration-300 ${
                  isTerminal
                    ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400"
                    : "bg-gradient-to-r from-[#C25934] via-orange-500 to-amber-500"
                }`}
              />

              <div className="p-5 sm:p-7 space-y-5">
                {/* Node Header Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md font-mono text-[11px] font-bold uppercase tracking-wider bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]">
                      Step {history.length}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        NODE_KIND_META[currentNode.kind].badgeClass
                      }`}
                    >
                      {NODE_KIND_META[currentNode.kind].label}
                    </span>
                    {currentNode.tier && TIER_CONFIG[currentNode.tier] && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          TIER_CONFIG[currentNode.tier].badgeBg
                        } ${TIER_CONFIG[currentNode.tier].textColor} ${
                          TIER_CONFIG[currentNode.tier].borderColor
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            TIER_CONFIG[currentNode.tier].dotColor
                          }`}
                        />
                        {currentNode.evidenceBadge ||
                          TIER_CONFIG[currentNode.tier].label.split(":")[0]}
                      </span>
                    )}
                    {!currentNode.tier && currentNode.evidenceBadge && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]">
                        {currentNode.evidenceBadge}
                      </span>
                    )}
                  </div>

                  {history.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRewindTo(history.length - 2)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-surface)] hover:border-[#C25934]/40 active:scale-[0.97] transition-all cursor-pointer"
                    >
                      <ArrowLeft size={13} />
                      <span>Back 1 step</span>
                    </button>
                  )}
                </div>

                {/* Node Title & Body */}
                <div>
                  {(() => {
                    const t = resolveBilingualDisplay(currentNode.title, langMode);
                    return (
                      <>
                        <h3 className="text-lg sm:text-xl font-bold text-[var(--text-ink)] leading-snug tracking-tight">
                          {t.primary}
                        </h3>
                        {t.secondary && (
                          <p className="text-sm text-[var(--text-muted)] mt-1">
                            {t.secondary}
                          </p>
                        )}
                      </>
                    );
                  })()}

                  {currentNode.body &&
                    (() => {
                      const b = resolveBilingualDisplay(currentNode.body, langMode);
                      return (
                        <div
                          className={`mt-3.5 rounded-xl border px-4 py-3.5 space-y-1.5 leading-relaxed ${
                            isTerminal
                              ? "border-emerald-500/35 border-l-4 border-l-emerald-500 bg-emerald-500/[0.07] dark:bg-emerald-500/12 py-4"
                              : "border-[var(--border-hairline)] bg-[var(--bg-subtle)]/45 text-sm text-[var(--text-secondary)]"
                          }`}
                        >
                          <p
                            className={`whitespace-pre-line ${
                              isTerminal
                                ? "text-[15px] sm:text-base font-semibold text-[var(--text-ink)]"
                                : "font-medium text-[var(--text-ink)]/90"
                            }`}
                          >
                            {b.primary}
                          </p>
                          {b.secondary && (
                            <p className="text-xs text-[var(--text-muted)] whitespace-pre-line">
                              {b.secondary}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                </div>

              {/* Warning / Contraindication Box */}
              {currentNode.warning &&
                (() => {
                  const w = resolveBilingualDisplay(currentNode.warning, langMode);
                  return (
                    <div className="rounded-xl border border-rose-500/35 bg-rose-500/8 p-3.5 flex items-start gap-2.5">
                      <ShieldAlert
                        size={18}
                        className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                      />
                      <div className="text-xs sm:text-sm text-rose-800 dark:text-rose-200 space-y-1">
                        <p className="font-semibold">{w.primary}</p>
                        {w.secondary && <p className="opacity-85">{w.secondary}</p>}
                      </div>
                    </div>
                  );
                })()}

              {/* Clinical Pearl Box */}
              {currentNode.clinicalPearl &&
                (() => {
                  const p = resolveBilingualDisplay(currentNode.clinicalPearl, langMode);
                  return (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3.5 flex items-start gap-2.5">
                      <Lightbulb
                        size={17}
                        className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                      />
                      <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                        <p>{p.primary}</p>
                        {p.secondary && <p className="opacity-85">{p.secondary}</p>}
                      </div>
                    </div>
                  );
                })()}

              {/* Interactive Checklist */}
              {currentNode.kind === "checklist" &&
                currentNode.checklistItems &&
                currentNode.checklistItems.length > 0 && (
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                        Criteria Checklist
                      </p>
                      {checklistEval && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            checklistEval.status === "pass"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : checklistEval.status === "fail"
                                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-hairline)]"
                          }`}
                        >
                          {checklistEval.status === "pass"
                            ? "All Inclusion Criteria Met"
                            : checklistEval.status === "fail"
                              ? "Exclusion Triggered"
                              : `${checklistEval.inclusionChecked}/${checklistEval.inclusionTotal} Inclusion Checked`}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {currentNode.checklistItems.map((item) => {
                        const checked = Boolean(currentChecklistMap[item.id]);
                        const lbl = resolveBilingualDisplay(item.label, langMode);
                        const isExcl = item.role === "exclusion";
                        return (
                          <label
                            key={item.id}
                            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                              checked
                                ? isExcl
                                  ? "border-rose-500/45 bg-rose-500/10"
                                  : "border-emerald-500/45 bg-emerald-500/10"
                                : "border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleChecklistItem(item.id)}
                              className="mt-0.5 h-4 w-4 rounded accent-[#C25934]"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                    isExcl
                                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                                      : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                                  }`}
                                >
                                  {isExcl ? "Exclusion" : "Inclusion"}
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm font-medium text-[var(--text-ink)] mt-1">
                                {lbl.primary}
                              </p>
                              {lbl.secondary && (
                                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                                  {lbl.secondary}
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Branch Choices OR Terminal Summary */}
              {!isTerminal ? (
                <div className="space-y-2.5 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Select Clinical Path
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    {currentNode.edges.map((edge, idx) => {
                      const lbl = resolveBilingualDisplay(edge.label, langMode);
                      const sub = edge.sublabel
                        ? resolveBilingualDisplay(edge.sublabel, langMode)
                        : null;
                      const isRecommended = Boolean(
                        checklistEval &&
                          edge.checklistTrigger &&
                          checklistEval.status === edge.checklistTrigger
                      );
                      return (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => handleSelectEdge(edge)}
                          style={{ animationDelay: `${idx * 45}ms` }}
                          className={`group animate-pathway-choice w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] flex items-center justify-between gap-3 cursor-pointer ${getEdgeToneClasses(
                            edge.tone,
                            isRecommended
                          )}`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="mt-0.5 w-6 h-6 rounded-lg font-mono text-[11px] font-bold shrink-0 inline-flex items-center justify-center border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] group-hover:bg-[#C25934] group-hover:text-white group-hover:border-[#C25934] transition-colors duration-200">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">
                                  {lbl.primary}
                                </span>
                                {isRecommended && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C25934] text-white shadow-2xs">
                                    <Sparkles size={10} />
                                    Matched
                                  </span>
                                )}
                              </div>
                              {lbl.secondary && (
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                  {lbl.secondary}
                                </p>
                              )}
                              {sub && (
                                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                                  {sub.primary}
                                </p>
                              )}
                            </div>
                          </div>
                          <ArrowRight
                            size={17}
                            className="shrink-0 text-[var(--text-muted)] group-hover:text-[#C25934] group-hover:translate-x-1 transition-all duration-200"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2.5 border-t border-[var(--border-hairline)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>Pathway Conclusion Reached</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-[0.97] cursor-pointer ${
                        copiedSummary
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] hover:border-[#C25934] hover:shadow-xs"
                      }`}
                    >
                      {copiedSummary ? (
                        <>
                          <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Copied Summary</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Clinical Summary</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Ecosystem Cross-Links */}
                  {currentNode.ecosystemLinks &&
                    currentNode.ecosystemLinks.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {currentNode.ecosystemLinks.map((link, idx) => (
                          <Link
                            key={`${link.app}-${idx}`}
                            href={link.href}
                            className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#C25934]/10 text-[#C25934] dark:text-orange-300 border border-[#C25934]/25 hover:bg-[#C25934]/20 hover:-translate-y-px transition-all"
                          >
                            <span>{link.app}: {link.label}</span>
                            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                        ))}
                      </div>
                    )}

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {history.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRewindTo(history.length - 2)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-surface)] hover:border-[#C25934]/40 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <ArrowLeft size={13} />
                        <span>Step Back</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#C25934] hover:bg-[#A64827] text-white shadow-sm shadow-[#C25934]/20 active:scale-[0.98] transition-all cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Start Over</span>
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Split Original Flowchart */}
        {pathway.sourceImageUrl && isSplitOpen && (
          <OriginalImageDrawer
            imageUrl={pathway.sourceImageUrl}
            title={pathwayTitle.primary}
            sourceLabel={sourceLabel}
            mode="split"
            isOpen={isSplitOpen}
            onClose={() => setImageViewerMode("closed")}
            onExpandToLightbox={() => setImageViewerMode("lightbox")}
          />
        )}
        </div>
      </div>

      {/* Lightbox Original Flowchart */}
      {pathway.sourceImageUrl && imageViewerMode === "lightbox" && (
        <OriginalImageDrawer
          imageUrl={pathway.sourceImageUrl}
          title={pathwayTitle.primary}
          sourceLabel={sourceLabel}
          mode="lightbox"
          isOpen={true}
          onClose={() => setImageViewerMode("closed")}
        />
      )}
    </div>
  );
}
