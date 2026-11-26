"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit3,
  ExternalLink,
  FileText,
  Info,
  Lightbulb,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import type {
  ClinicalPathwayDoc,
  PathwayCompoundItem,
  PathwayEdge,
  PathwayLangMode,
  PathwayNode,
} from "../../../types/clinicalPathways";
import type { NormalizedTier } from "../../../types/neuroguide";
import {
  buildStackSummaryText,
  evaluateChecklistState,
  parseClinicalBodyBlocks,
  resolveBilingualDisplay,
  selectDecisionAt,
  buildVisibleStack,
  type PathwayDecisionChoice,
  type PathwayStackItem,
  type ResolvedChoiceLayout,
} from "../../../lib/neuroguide/pathwayRunnerUtils";
import { OriginalImageDrawer } from "./OriginalImageDrawer";

interface PathwayStepRunnerProps {
  pathway: ClinicalPathwayDoc;
  darkMode?: boolean;
  onBack?: () => void;
  initialLangMode?: PathwayLangMode;
  isPreviewMode?: boolean;
  isAdminVerified?: boolean;
  onEdit?: () => void;
}

function getCorSurfaceClasses(tier?: NormalizedTier): {
  container: string;
  badge: string;
  subtext: string;
  bulletDot: string;
} {
  switch (tier) {
    case 1:
      return {
        container:
          "bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:border-emerald-500/80",
        badge: "bg-white/20 text-white border-white/30",
        subtext: "text-emerald-50/90",
        bulletDot: "bg-white/90",
      };
    case 2:
      return {
        container:
          "bg-amber-300 text-stone-950 border-amber-400 dark:bg-amber-400 dark:text-stone-950 dark:border-amber-500",
        badge: "bg-stone-950/12 text-stone-950 border-stone-950/20",
        subtext: "text-stone-800",
        bulletDot: "bg-stone-900",
      };
    case 3:
      return {
        container:
          "bg-orange-500 text-white border-orange-600 dark:bg-orange-600 dark:border-orange-400/80",
        badge: "bg-white/20 text-white border-white/30",
        subtext: "text-orange-50/90",
        bulletDot: "bg-white/90",
      };
    case 4:
      return {
        container:
          "bg-indigo-600 text-white border-indigo-700 dark:bg-indigo-700 dark:border-indigo-500/80",
        badge: "bg-white/20 text-white border-white/30",
        subtext: "text-indigo-50/90",
        bulletDot: "bg-white/90",
      };
    case 5:
      return {
        container:
          "bg-red-700 text-white border-red-800 dark:bg-red-800 dark:border-red-500/80",
        badge: "bg-white/20 text-white border-white/30",
        subtext: "text-red-50/90",
        bulletDot: "bg-white/90",
      };
    default:
      return {
        container:
          "bg-[var(--bg-surface)] text-[var(--text-ink)] border-sky-500/60 dark:border-sky-400/50",
        badge:
          "bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-500/30",
        subtext: "text-[var(--text-muted)]",
        bulletDot: "bg-sky-500",
      };
  }
}

function getChevronColorClass(nextItem: PathwayStackItem): string {
  const { node, isInteractive } = nextItem;
  if (isInteractive) {
    return "text-[#C23B43] dark:text-rose-400";
  }
  switch (node.tier) {
    case 1:
      return "text-emerald-600 dark:text-emerald-400";
    case 2:
      return "text-amber-500 dark:text-amber-400";
    case 3:
      return "text-orange-500 dark:text-orange-400";
    case 4:
      return "text-indigo-500 dark:text-indigo-400";
    case 5:
      return "text-red-700 dark:text-red-400";
    default:
      return "text-sky-500 dark:text-sky-400";
  }
}

function getChoiceGridClasses(layout: ResolvedChoiceLayout): string {
  switch (layout) {
    case "binary":
      return "grid grid-cols-2 divide-x divide-[var(--border-hairline)]";
    case "row3":
      return "grid grid-cols-3 divide-x divide-[var(--border-hairline)]";
    case "grid2":
      return "grid grid-cols-2 gap-px bg-[var(--border-hairline)]";
    case "stack":
    default:
      return "grid grid-cols-1 divide-y divide-[var(--border-hairline)]";
  }
}

function formatDefaultCorLabel(tier?: NormalizedTier, badge?: string): string | null {
  if (badge?.trim()) return badge.trim();
  switch (tier) {
    case 1:
      return "Class 1";
    case 2:
      return "Class 2a";
    case 3:
      return "Class 2b";
    case 4:
      return "Consensus";
    case 5:
      return "Class 3: Harm";
    default:
      return null;
  }
}

function ClinicalBodyRenderer({
  text,
  secondaryText,
  bulletDotClass = "bg-current",
  textClass = "text-sm leading-relaxed",
  secondaryClass = "text-xs opacity-80",
}: {
  text: string;
  secondaryText?: string;
  bulletDotClass?: string;
  textClass?: string;
  secondaryClass?: string;
}) {
  const blocks = useMemo(() => parseClinicalBodyBlocks(text), [text]);
  return (
    <div className="space-y-1.5">
      {blocks.map((block, bIdx) =>
        block.type === "bullets" ? (
          <ul key={bIdx} className="space-y-1 text-left">
            {block.lines.map((line, lIdx) => (
              <li key={lIdx} className={`flex items-start gap-2 ${textClass}`}>
                <span
                  className={`mt-2 h-1.5 w-1.5 rounded-full shrink-0 ${bulletDotClass}`}
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div key={bIdx} className="space-y-1">
            {block.lines.map((line, lIdx) => (
              <p key={lIdx} className={textClass}>
                {line}
              </p>
            ))}
          </div>
        )
      )}
      {secondaryText && (
        <p className={`whitespace-pre-line pt-0.5 ${secondaryClass}`}>
          {secondaryText}
        </p>
      )}
    </div>
  );
}

function SlidingStackCard({
  animateOnMount,
  staggerIndex,
  zIndex,
  cardRef,
  children,
}: {
  animateOnMount: boolean;
  staggerIndex: number;
  zIndex: number;
  cardRef: (el: HTMLDivElement | null) => void;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState<boolean>(!animateOnMount);

  useEffect(() => {
    if (!animateOnMount) {
      setExpanded(true);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    ) {
      setExpanded(true);
      return;
    }

    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        setExpanded(true);
      });
    });

    return () => {
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
    };
  }, [animateOnMount]);

  const delayMs = animateOnMount ? `${Math.min(staggerIndex, 5) * 75}ms` : "0ms";

  return (
    <div ref={cardRef} style={{ zIndex }} className="relative">
      <div
        style={{ transitionDelay: delayMs }}
        className={`grid transition-[grid-template-rows,opacity] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden px-0.5">
          <div
            style={{ transitionDelay: delayMs }}
            className={`transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              expanded ? "translate-y-0" : "-translate-y-8"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
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
  const [decisions, setDecisions] = useState<PathwayDecisionChoice[]>([]);
  const [checkedByNode, setCheckedByNode] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [imageViewerMode, setImageViewerMode] = useState<
    "closed" | "split" | "lightbox"
  >("closed");
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [utilityModal, setUtilityModal] = useState<
    "closed" | "footnotes" | "info"
  >("closed");

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevDecisionSigRef = useRef<string>("");

  useEffect(() => {
    setDecisions([]);
    setCheckedByNode({});
    setCopiedSummary(false);
    setUtilityModal("closed");
    prevDecisionSigRef.current = "";
  }, [pathway.uid, pathway.entryNodeId]);

  const visibleStack = useMemo(
    () => buildVisibleStack(pathway, decisions),
    [pathway, decisions]
  );

  const stackWithAnimationMeta = useMemo(() => {
    let currentPrefix = "";
    let segmentLocalIdx = 0;

    return visibleStack.map((item, idx) => {
      const branchPrefix = currentPrefix;
      const animateOnMount = currentPrefix.length > 0;
      const staggerIndex = segmentLocalIdx;
      const zIndex = Math.max(1, 50 - idx);
      segmentLocalIdx++;

      if (item.selectedEdgeId) {
        currentPrefix = `${currentPrefix}>${item.instanceKey}:${item.selectedEdgeId}`;
        segmentLocalIdx = 0;
      }

      return {
        item,
        branchPrefix,
        animateOnMount,
        staggerIndex,
        zIndex,
      };
    });
  }, [visibleStack]);

  const decisionSignature = useMemo(
    () => decisions.map((d) => `${d.instanceKey}:${d.edgeId}`).join("|"),
    [decisions]
  );

  // Smoothly scroll to newly revealed bottom card after a user decision or branch switch
  useEffect(() => {
    if (
      decisions.length > 0 &&
      decisionSignature !== prevDecisionSigRef.current &&
      visibleStack.length > 0
    ) {
      const lastItem = visibleStack[visibleStack.length - 1];
      const timer = window.setTimeout(() => {
        const el = cardRefs.current[lastItem.instanceKey];
        if (el && typeof el.scrollIntoView === "function") {
          el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 220);
      prevDecisionSigRef.current = decisionSignature;
      return () => window.clearTimeout(timer);
    }
    prevDecisionSigRef.current = decisionSignature;
  }, [decisions.length, decisionSignature, visibleStack]);

  const pathwayTitle = resolveBilingualDisplay(pathway.title, langMode);
  const sourceLabel = `${pathway.source.organizationOrAuthor} (${pathway.source.year})${
    pathway.source.figureRef ? ` · ${pathway.source.figureRef}` : ""
  }`;

  const lastStackItem = visibleStack[visibleStack.length - 1];
  const isTerminalReached = Boolean(lastStackItem?.isTerminal);

  const handleSelectBranch = (
    item: PathwayStackItem,
    edge: PathwayEdge
  ) => {
    setDecisions((prev) =>
      selectDecisionAt(prev, item.instanceKey, item.node.id, edge.id)
    );
    setCopiedSummary(false);
  };

  const handleReset = () => {
    setDecisions([]);
    setCheckedByNode({});
    setCopiedSummary(false);
    const firstItem = visibleStack[0];
    if (firstItem) {
      cardRefs.current[firstItem.instanceKey]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
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

  const handleToggleChecklistItem = (nodeId: string, itemId: string) => {
    setCheckedByNode((prev) => ({
      ...prev,
      [nodeId]: {
        ...(prev[nodeId] ?? {}),
        [itemId]: !prev[nodeId]?.[itemId],
      },
    }));
  };

  const handleCopySummary = async () => {
    const text = buildStackSummaryText(pathway, visibleStack, langMode);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2200);
    } catch {
      // Ignore clipboard failure
    }
  };

  const extractedFootnoteNotes = useMemo(() => {
    const notes: string[] = [];
    for (const n of pathway.nodes) {
      const b = n.body?.en || "";
      for (const line of b.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (/^[*†‡]/.test(trimmed) && !notes.includes(trimmed)) {
          notes.push(trimmed);
        }
      }
    }
    return notes;
  }, [pathway.nodes]);

  const isSplitOpen = imageViewerMode === "split";

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
            { id: "bilingual", label: "EN+VI" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLangMode(opt.id)}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
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
          <FileText size={13} className="shrink-0" />
          <span>Flowchart</span>
        </button>
      )}
    </div>
  );

  const renderCompoundCard = (node: PathwayNode) => {
    const items: PathwayCompoundItem[] = node.compoundItems ?? [];
    const op = node.compoundOperator || "AND";
    const titleDisp = resolveBilingualDisplay(node.title, langMode);

    const norm = (s?: string) =>
      (s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const normTitle = norm(node.title.en);
    const joinedEn = norm(
      items.map((it) => it.title.en).join(` ${op.toLowerCase()} `)
    );
    const joinedAmp = norm(items.map((it) => it.title.en).join(" & "));
    const joinedSlash = norm(items.map((it) => it.title.en).join(" / "));
    const isRedundantTitle =
      !titleDisp.primary ||
      items.some((it) => norm(it.title.en) === normTitle) ||
      normTitle === joinedEn ||
      normTitle === joinedAmp ||
      normTitle === joinedSlash;

    return (
      <div className="rounded-xl border border-[var(--border-hairline)] overflow-hidden shadow-xs bg-[var(--bg-surface)]">
        {!isRedundantTitle && (
          <div className="px-4 py-2 bg-[var(--bg-subtle)]/70 border-b border-[var(--border-hairline)] text-center">
            <p className="text-xs font-bold text-[var(--text-ink)]">
              {titleDisp.primary}
            </p>
            {titleDisp.secondary && (
              <p className="text-[11px] text-[var(--text-muted)]">
                {titleDisp.secondary}
              </p>
            )}
          </div>
        )}
        <div>
          {items.map((cItem, idx) => {
            const cor = getCorSurfaceClasses(cItem.tier);
            const cTitle = resolveBilingualDisplay(cItem.title, langMode);
            const cBody = cItem.body
              ? resolveBilingualDisplay(cItem.body, langMode)
              : null;
            const cBadge = formatDefaultCorLabel(cItem.tier, cItem.evidenceBadge);

            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <div className="relative flex items-center justify-center bg-[var(--bg-surface)] py-1 border-y border-[var(--border-hairline)]">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]">
                      {op}
                    </span>
                  </div>
                )}
                <div className={`px-3.5 py-2.5 sm:px-4 sm:py-3.5 text-center space-y-1 ${cor.container}`}>
                  <p className="text-sm font-bold leading-snug">
                    {cTitle.primary}
                    {cBadge && (
                      <span
                        className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border align-middle ${cor.badge}`}
                      >
                        {cBadge}
                      </span>
                    )}
                  </p>
                  {cTitle.secondary && (
                    <p className={`text-xs ${cor.subtext}`}>{cTitle.secondary}</p>
                  )}
                  {cBody && (
                    <div className="pt-1">
                      <ClinicalBodyRenderer
                        text={cBody.primary}
                        secondaryText={cBody.secondary}
                        bulletDotClass={cor.bulletDot}
                        textClass="text-xs sm:text-[13px] leading-relaxed"
                        secondaryClass={`text-[11px] ${cor.subtext}`}
                      />
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStackCard = (item: PathwayStackItem) => {
    const { node, isInteractive, selectedEdgeId, choiceLayout, isTerminal } = item;
    const titleDisp = resolveBilingualDisplay(node.title, langMode);
    const bodyDisp = node.body
      ? resolveBilingualDisplay(node.body, langMode)
      : null;
    const warningDisp = node.warning
      ? resolveBilingualDisplay(node.warning, langMode)
      : null;
    const pearlDisp = node.clinicalPearl
      ? resolveBilingualDisplay(node.clinicalPearl, langMode)
      : null;
    const corLabel = formatDefaultCorLabel(node.tier, node.evidenceBadge);

    // 1. Compound AND / OR card
    if (node.compoundItems && node.compoundItems.length > 0 && !isInteractive) {
      return renderCompoundCard(node);
    }

    // 2. Interactive Decision / Checklist Card (with optional COR header if hybrid)
    if (isInteractive) {
      const checklistMap = checkedByNode[node.id] ?? {};
      const checklistEval =
        node.kind === "checklist" && node.checklistItems?.length
          ? evaluateChecklistState(node.checklistItems, checklistMap)
          : null;
      const hasCor = node.tier !== undefined;
      const cor = hasCor ? getCorSurfaceClasses(node.tier) : null;

      return (
        <div className="rounded-xl border-2 border-[#C23B43]/80 dark:border-rose-500/75 bg-[var(--bg-surface)] overflow-hidden shadow-xs">
          {/* Header */}
          <div
            className={
              cor
                ? `px-3.5 py-2.5 sm:px-4 sm:py-3 text-center space-y-1 border-b border-[var(--border-hairline)] ${cor.container}`
                : "px-3.5 py-2.5 sm:px-4 sm:py-3 text-center space-y-1 bg-rose-50/75 dark:bg-rose-950/25 border-b border-[#C23B43]/25 dark:border-rose-500/30"
            }
          >
            <p className="text-sm sm:text-[15px] font-bold leading-snug">
              {titleDisp.primary}
              {corLabel && (
                <span
                  className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border align-middle ${
                    cor
                      ? cor.badge
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                  }`}
                >
                  {corLabel}
                </span>
              )}
            </p>
            {titleDisp.secondary && (
              <p
                className={`text-xs ${
                  cor ? cor.subtext : "text-[var(--text-muted)]"
                }`}
              >
                {titleDisp.secondary}
              </p>
            )}
            {bodyDisp && (
              <div className="pt-1">
                <ClinicalBodyRenderer
                  text={bodyDisp.primary}
                  secondaryText={bodyDisp.secondary}
                  bulletDotClass={cor ? cor.bulletDot : "bg-[#C23B43]"}
                  textClass={`text-xs leading-relaxed ${
                    cor ? "" : "text-[var(--text-secondary)]"
                  }`}
                  secondaryClass={`text-[11px] ${
                    cor ? cor.subtext : "text-[var(--text-muted)]"
                  }`}
                />
              </div>
            )}
          </div>

          {/* Interactive Checklist if kind === "checklist" */}
          {checklistEval && node.checklistItems && (
            <div className="p-3 sm:p-3.5 bg-[var(--bg-subtle)]/50 border-b border-[var(--border-hairline)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Criteria Checklist
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                    checklistEval.status === "pass"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : checklistEval.status === "fail"
                        ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                        : "bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-hairline)]"
                  }`}
                >
                  {checklistEval.status === "pass"
                    ? "All Inclusion Met"
                    : checklistEval.status === "fail"
                      ? "Exclusion Triggered"
                      : `${checklistEval.inclusionChecked}/${checklistEval.inclusionTotal} Met`}
                </span>
              </div>
              <div className="space-y-1.5">
                {node.checklistItems.map((cItem) => {
                  const checked = Boolean(checklistMap[cItem.id]);
                  const lbl = resolveBilingualDisplay(cItem.label, langMode);
                  const isExcl = cItem.role === "exclusion";
                  return (
                    <label
                      key={cItem.id}
                      className={`flex items-start gap-2.5 rounded-lg border px-2.5 py-2 cursor-pointer transition-colors text-xs ${
                        checked
                          ? isExcl
                            ? "border-rose-500/45 bg-rose-500/10"
                            : "border-emerald-500/45 bg-emerald-500/10"
                          : "border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          handleToggleChecklistItem(node.id, cItem.id)
                        }
                        className="mt-0.5 h-3.5 w-3.5 rounded accent-[#C23B43]"
                      />
                      <div className="min-w-0 flex-1">
                        <span
                          className={`mr-1.5 text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            isExcl
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                          }`}
                        >
                          {isExcl ? "Excl" : "Incl"}
                        </span>
                        <span className="font-medium text-[var(--text-ink)]">
                          {lbl.primary}
                        </span>
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

          {/* Segmented Option Grid */}
          <div className={getChoiceGridClasses(choiceLayout)}>
            {node.edges.map((edge) => {
              const isSelected = selectedEdgeId === edge.id;
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
                  onClick={() => handleSelectBranch(item, edge)}
                  aria-pressed={isSelected}
                  className={`min-h-[44px] px-2.5 py-2.5 sm:px-3.5 sm:py-3 text-center transition-all duration-150 active:scale-[0.985] flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#B91C1C] text-white font-bold shadow-inner dark:bg-rose-700"
                      : "bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-rose-50/70 hover:text-[var(--text-ink)] dark:hover:bg-rose-950/30 font-medium"
                  }`}
                >
                  <span className="text-xs sm:text-[13px] leading-snug flex items-center gap-1.5">
                    {isSelected && <Check size={13} className="shrink-0" />}
                    <span>{lbl.primary}</span>
                    {isRecommended && !isSelected && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-[#C25934] text-white">
                        <Sparkles size={9} />
                        Match
                      </span>
                    )}
                  </span>
                  {lbl.secondary && (
                    <span
                      className={`text-[11px] ${
                        isSelected ? "text-white/85" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {lbl.secondary}
                    </span>
                  )}
                  {sub && (
                    <span
                      className={`text-[10.5px] ${
                        isSelected
                          ? "text-white/80"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {sub.primary}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // 3. Entry / Section Banner / Untiered Terminal Card (AHA Light Blue)
    const isBannerOrUntieredTerminal =
      node.kind === "entry" ||
      node.kind === "section" ||
      (isTerminal && node.tier === undefined);

    if (isBannerOrUntieredTerminal) {
      const isSection = node.kind === "section";
      return (
        <div className="rounded-xl border-2 border-sky-400/75 dark:border-sky-500/60 bg-sky-50/90 dark:bg-sky-950/45 text-sky-950 dark:text-sky-100 px-3.5 py-2.5 sm:px-4 sm:py-3 text-center shadow-2xs space-y-1">
          <p
            className={`leading-snug ${
              isSection
                ? "text-xs sm:text-sm font-bold italic"
                : "text-sm sm:text-[15px] font-bold"
            }`}
          >
            {titleDisp.primary}
          </p>
          {titleDisp.secondary && (
            <p className="text-xs opacity-75">{titleDisp.secondary}</p>
          )}
          {bodyDisp && (
            <div className="pt-1">
              <ClinicalBodyRenderer
                text={bodyDisp.primary}
                secondaryText={bodyDisp.secondary}
                bulletDotClass="bg-sky-600 dark:bg-sky-300"
                textClass="text-xs sm:text-[13px] leading-relaxed opacity-90"
                secondaryClass="text-[11px] opacity-75"
              />
            </div>
          )}
        </div>
      );
    }

    // 4. COR Recommendation Card (Green / Yellow / Orange / Indigo / Harm Red) OR Neutral Criteria / Action Card
    const cor = getCorSurfaceClasses(node.tier);
    const isCriteria = node.kind === "criteria";

    return (
      <div
        className={`rounded-xl border-2 px-3.5 py-2.5 sm:px-4 sm:py-3.5 shadow-xs space-y-1.5 ${
          isCriteria ? "text-left" : "text-center"
        } ${cor.container}`}
      >
        <div
          className={`flex items-center gap-2 ${
            isCriteria ? "justify-start" : "justify-center"
          }`}
        >
          {node.tier === 5 && (
            <ShieldAlert size={16} className="shrink-0 opacity-95" />
          )}
          <p className="text-sm sm:text-[15px] font-bold leading-snug">
            {titleDisp.primary}
            {corLabel && (
              <span
                className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border align-middle ${cor.badge}`}
              >
                {corLabel}
              </span>
            )}
          </p>
        </div>

        {titleDisp.secondary && (
          <p className={`text-xs ${cor.subtext}`}>{titleDisp.secondary}</p>
        )}

        {bodyDisp && (
          <div className="pt-0.5">
            <ClinicalBodyRenderer
              text={bodyDisp.primary}
              secondaryText={bodyDisp.secondary}
              bulletDotClass={cor.bulletDot}
              textClass="text-xs sm:text-[13px] leading-relaxed"
              secondaryClass={`text-[11px] ${cor.subtext}`}
            />
          </div>
        )}

        {warningDisp && (
          <div
            className={`mt-2 rounded-lg px-3 py-2 text-left text-xs flex items-start gap-2 ${
              node.tier === 5
                ? "bg-black/20 text-white"
                : "bg-rose-500/12 text-rose-800 dark:text-rose-200 border border-rose-500/30"
            }`}
          >
            <ShieldAlert size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{warningDisp.primary}</p>
              {warningDisp.secondary && (
                <p className="opacity-85 mt-0.5">{warningDisp.secondary}</p>
              )}
            </div>
          </div>
        )}

        {pearlDisp && (
          <div
            className={`mt-2 rounded-lg px-3 py-2 text-left text-xs flex items-start gap-2 ${
              node.tier
                ? "bg-black/15 text-current"
                : "bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/25"
            }`}
          >
            <Lightbulb size={14} className="shrink-0 mt-0.5" />
            <div>
              <p>{pearlDisp.primary}</p>
              {pearlDisp.secondary && (
                <p className="opacity-85 mt-0.5">{pearlDisp.secondary}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={
        isPreviewMode
          ? "space-y-3"
          : "grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 items-start"
      }
    >
      {/* Mobile Compact Header (< lg) */}
      {!isPreviewMode && (
        <div className="lg:hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-2 shadow-2xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Back to Pathways"
                className="inline-flex items-center justify-center min-h-[36px] min-w-[36px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-ink)] active:scale-[0.96] transition-all shrink-0 cursor-pointer"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <h2 className="text-xs sm:text-sm font-bold text-[var(--text-ink)] leading-tight line-clamp-2 min-w-0">
              {pathwayTitle.primary}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isAdminVerified && onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label="Edit pathway"
                className="inline-flex items-center justify-center min-h-[34px] min-w-[34px] rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer"
              >
                <Edit3 size={13} />
              </button>
            )}
            <div
              className="inline-flex rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
              role="group"
              aria-label="Language display mode"
            >
              {(
                [
                  { id: "en", label: "EN" },
                  { id: "vi", label: "VI" },
                  { id: "bilingual", label: "2" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLangMode(opt.id)}
                  className={`px-2 py-1 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer ${
                    langMode === opt.id
                      ? "bg-[#C25934] text-white shadow-2xs"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar (3 cols, hidden on mobile) */}
      {!isPreviewMode && (
        <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-20 space-y-3">
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-2xs space-y-3">
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

            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                    pathway.source.sourceType === "guideline"
                      ? "bg-[#C25934]/12 text-[#C25934] border-[#C25934]/30 dark:bg-orange-500/20 dark:text-orange-300"
                      : "bg-indigo-500/12 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300"
                  }`}
                >
                  {pathway.source.sourceType === "guideline"
                    ? "Guideline"
                    : "Textbook"}
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
                      href={
                        pathway.source.url.startsWith("http")
                          ? pathway.source.url
                          : `https://doi.org/${pathway.source.url}`
                      }
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

            <div className="pt-2.5 border-t border-[var(--border-hairline)]">
              {controlsSection}
            </div>
          </div>
        </aside>
      )}

      {/* Preview Mode: Compact Top Bar */}
      {isPreviewMode && (
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border bg-[#C25934]/12 text-[#C25934] border-[#C25934]/30">
                {pathway.source.sourceType === "guideline"
                  ? "Guideline"
                  : "Textbook"}
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
      )}

      {/* Main Content: AHA Progressive Vertical Stack + Sticky Bottom Utility Bar */}
      <div className={isPreviewMode ? "space-y-3" : "lg:col-span-9 min-w-0 space-y-3"}>
        <div
          className={
            isSplitOpen
              ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-5 items-start"
              : "w-full"
          }
        >
          <div className="flex flex-col">
            {/* Vertical Progressive Stack */}
            <div
              className={`relative isolate z-0 max-w-2xl w-full mx-auto ${
                isPreviewMode ? "pb-4" : "pb-28 lg:pb-4"
              }`}
            >
              {stackWithAnimationMeta.length === 0 ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-6 text-center">
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    Entry node &ldquo;{pathway.entryNodeId}&rdquo; could not be
                    found in this pathway.
                  </p>
                </div>
              ) : (
                stackWithAnimationMeta.map((meta, idx) => {
                  const { item, branchPrefix, animateOnMount, staggerIndex, zIndex } = meta;
                  return (
                    <SlidingStackCard
                      key={`${branchPrefix}::${item.instanceKey}`}
                      animateOnMount={animateOnMount}
                      staggerIndex={staggerIndex}
                      zIndex={zIndex}
                      cardRef={(el) => {
                        cardRefs.current[item.instanceKey] = el;
                      }}
                    >
                      {idx > 0 && (
                        <div className="flex justify-center py-0.5 sm:py-1">
                          <ChevronDown
                            size={18}
                            strokeWidth={2.75}
                            className={getChevronColorClass(item)}
                            aria-hidden="true"
                          />
                        </div>
                      )}

                      {renderStackCard(item)}

                      {/* Manual Loop Re-entry Trigger (when loop-back edge pauses) */}
                      {item.manualLoopEdge && !item.selectedEdgeId && (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectBranch(item, item.manualLoopEdge!)
                            }
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border border-sky-500/50 bg-sky-500/10 text-sky-800 dark:text-sky-200 hover:bg-sky-500/20 transition-colors cursor-pointer"
                          >
                            <RotateCcw size={12} />
                            <span>
                              {
                                resolveBilingualDisplay(
                                  item.manualLoopEdge.label,
                                  langMode
                                ).primary
                              }
                            </span>
                          </button>
                        </div>
                      )}
                    </SlidingStackCard>
                  );
                })
              )}

              {/* Terminal Outcome Footer */}
              {isTerminalReached && lastStackItem && (
                <div
                  key={`footer::${stackWithAnimationMeta[stackWithAnimationMeta.length - 1]?.branchPrefix ?? ""}`}
                  style={{ animationDelay: "180ms" }}
                  className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2.5 animate-pathway-stack-in"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>Pathway Conclusion Reached</span>
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {lastStackItem.node.ecosystemLinks?.map((link, lIdx) => (
                      <Link
                        key={`${link.app}-${lIdx}`}
                        href={link.href}
                        className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#C25934]/10 text-[#C25934] dark:text-orange-300 border border-[#C25934]/25 hover:bg-[#C25934]/20 transition-all"
                      >
                        <span>
                          {link.app}: {link.label}
                        </span>
                        <ArrowRight
                          size={12}
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                      </Link>
                    ))}

                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        copiedSummary
                          ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] hover:border-[#C25934]"
                      }`}
                    >
                      {copiedSummary ? (
                        <>
                          <Check size={13} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Copy Summary</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AHA-Style Bottom Utility Bar (fixed bottom dock on mobile, sticky on desktop) */}
            <div
              className={
                isPreviewMode
                  ? "sticky bottom-2 z-20 max-w-2xl w-full mx-auto mt-2"
                  : "fixed bottom-0 inset-x-0 z-30 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-[var(--bg-paper)] via-[var(--bg-paper)]/95 to-transparent lg:static lg:p-0 lg:bg-none lg:sticky lg:bottom-3 lg:z-20 lg:max-w-2xl lg:w-full lg:mx-auto lg:mt-2"
              }
            >
              <div className="max-w-2xl w-full mx-auto grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl overflow-hidden border border-stone-700/80 bg-stone-700 shadow-lg">
                <button
                  type="button"
                  onClick={() => setUtilityModal("footnotes")}
                  className="min-h-[44px] bg-stone-800 hover:bg-stone-700 text-stone-100 px-3 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <BookOpen size={13} className="shrink-0 opacity-85" />
                  <span className="truncate">Abbr &amp; Footnotes</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleImage}
                  disabled={!pathway.sourceImageUrl}
                  className="min-h-[44px] bg-stone-800 hover:bg-stone-700 disabled:opacity-45 text-stone-100 px-3 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText size={13} className="shrink-0 opacity-85" />
                  <span className="truncate">Original Flowchart</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={decisions.length === 0}
                  className="min-h-[44px] bg-stone-800 hover:bg-stone-700 disabled:opacity-45 text-stone-100 px-3 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} className="shrink-0 opacity-85" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUtilityModal("info")}
                  className="min-h-[44px] bg-stone-800 hover:bg-stone-700 text-stone-100 px-3 py-2.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Info size={13} className="shrink-0 opacity-85" />
                  <span>More Info</span>
                </button>
              </div>
            </div>
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

      {/* Utility Modals: Abbreviations & Footnotes / More Info (Bottom sheet on mobile) */}
      {utilityModal !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setUtilityModal("closed");
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg max-h-[82vh] pb-[env(safe-area-inset-bottom)] flex flex-col rounded-t-2xl sm:rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-ink)]">
                {utilityModal === "footnotes"
                  ? "Abbreviations, Footnotes & Legend"
                  : "Pathway Information & Summary"}
              </h3>
              <button
                type="button"
                onClick={() => setUtilityModal("closed")}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-surface)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-[var(--text-secondary)]">
              {utilityModal === "footnotes" ? (
                <>
                  {/* AHA COR Color Legend */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Recommendation &amp; Node Legend
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-emerald-600 shrink-0" />
                        <span>COR 1 (Strong)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-amber-300 border border-amber-400 shrink-0" />
                        <span>COR 2a (Moderate)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-orange-500 shrink-0" />
                        <span>COR 2b (Weak)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-red-700 shrink-0" />
                        <span>COR 3 (Harm / No Benefit)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded border-2 border-[#C23B43] shrink-0" />
                        <span>Decision / Branch</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded bg-sky-100 border-2 border-sky-400 shrink-0" />
                        <span>Context / Endpoint</span>
                      </div>
                    </div>
                  </div>

                  {/* Footnotes */}
                  {(pathway.footnotes?.length || extractedFootnoteNotes.length > 0) && (
                    <div className="space-y-2 pt-3 border-t border-[var(--border-hairline)]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Footnotes
                      </p>
                      <div className="space-y-1.5">
                        {pathway.footnotes?.map((fn, i) => {
                          const disp = resolveBilingualDisplay(fn.text, langMode);
                          return (
                            <p key={i} className="leading-relaxed">
                              <strong className="text-[var(--text-ink)] mr-1">
                                {fn.symbol}
                              </strong>
                              <span>{disp.primary}</span>
                            </p>
                          );
                        })}
                        {!pathway.footnotes?.length &&
                          extractedFootnoteNotes.map((note, i) => (
                            <p key={i} className="leading-relaxed">
                              {note}
                            </p>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Abbreviations */}
                  {pathway.abbreviations && pathway.abbreviations.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-[var(--border-hairline)]">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        Abbreviations
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {pathway.abbreviations.map((abbr, i) => (
                          <div key={i}>
                            <strong className="text-[var(--text-ink)]">
                              {abbr.term}:
                            </strong>{" "}
                            <span>
                              {
                                resolveBilingualDisplay(abbr.expansion, langMode)
                                  .primary
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!pathway.footnotes?.length &&
                    !pathway.abbreviations?.length &&
                    extractedFootnoteNotes.length === 0 && (
                      <p className="text-[var(--text-muted)] pt-2 border-t border-[var(--border-hairline)]">
                        No extra abbreviations or footnotes were recorded for this
                        pathway. Use &ldquo;Original Flowchart&rdquo; to inspect
                        the source figure caption.
                      </p>
                    )}
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-[var(--text-ink)]">
                      {pathwayTitle.primary}
                    </p>
                    {pathway.summary && (
                      <p className="leading-relaxed">
                        {
                          resolveBilingualDisplay(pathway.summary, langMode)
                            .primary
                        }
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 p-3 space-y-1">
                    <p>
                      <strong className="text-[var(--text-ink)]">Source:</strong>{" "}
                      {pathway.source.title}
                    </p>
                    <p>
                      <strong className="text-[var(--text-ink)]">
                        Organization / Author:
                      </strong>{" "}
                      {pathway.source.organizationOrAuthor} ({pathway.source.year})
                      {pathway.source.figureRef
                        ? ` · ${pathway.source.figureRef}`
                        : ""}
                    </p>
                    {pathway.source.url && (
                      <p>
                        <a
                          href={
                            pathway.source.url.startsWith("http")
                              ? pathway.source.url
                              : `https://doi.org/${pathway.source.url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-[#C25934] hover:underline"
                        >
                          <span>Open Official Reference</span>
                          <ExternalLink size={11} />
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleCopySummary}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#C25934] hover:bg-[#A64827] text-white cursor-pointer"
                    >
                      {copiedSummary ? <Check size={13} /> : <Copy size={13} />}
                      <span>
                        {copiedSummary
                          ? "Copied Clinical Summary"
                          : "Copy Clinical Summary"}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
