"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  FlaskConical,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Star,
} from "lucide-react";
import {
  evaluateScale,
  type ScaleInputValues,
} from "@/lib/neurocalc/engine";
import { FORMULA_METADATA } from "@/lib/neurocalc/formulas";
import type {
  AssessmentGuide,
  NumericScaleItem,
  ScaleReference,
  ScaleWithEffectiveStatus,
  SelectScaleItem,
} from "@/types/neurocalc";
import { sanitizeUrl } from "@/utils/safeUrl";
import { AssessmentGuideDrawer } from "./AssessmentGuidePanel";
import { NihssStimulusModal } from "./NihssStimulusModal";
import { NumericItemCard } from "./NumericItemCard";
import { RelatedScaleDrawer } from "./RelatedScaleDrawer";
import { ScoreResultCard } from "./ScoreResultCard";
import { SelectItemCard } from "./SelectItemCard";

interface ScaleWorkspaceProps {
  scaleEntry: ScaleWithEffectiveStatus;
  allScales: ScaleWithEffectiveStatus[];
  isAdmin?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (slug: string) => void;
  onSelectScale: (slug: string) => void;
  onBack: () => void;
}

type PreCdsTab = "when_to_use" | "pearls";
type PostCdsTab = "next_steps" | "formula" | "pearls" | "evidence";

export function ScaleWorkspace({
  scaleEntry,
  allScales,
  isAdmin = false,
  isFavorite = false,
  onToggleFavorite,
  onSelectScale,
  onBack,
}: ScaleWorkspaceProps) {
  const { scale } = scaleEntry;

  // Strictly ephemeral in-memory scoring state (zero localStorage/IndexedDB persistence).
  const [inputs, setInputs] = useState<ScaleInputValues>({});
  const [drawerGuide, setDrawerGuide] = useState<AssessmentGuide | null>(null);
  const [preCdsTab, setPreCdsTab] = useState<PreCdsTab | null>(null);
  const [postCdsTab, setPostCdsTab] = useState<PostCdsTab>("next_steps");
  const [relatedModal, setRelatedModal] = useState<{
    scaleId: string;
    parentItemId: string;
  } | null>(null);
  const [helperSummaries, setHelperSummaries] = useState<Record<string, string>>({});
  const [stimulusState, setStimulusState] = useState<{
    open: boolean;
    initialCard: 0 | 1 | 2 | 3;
  }>({ open: false, initialCard: 0 });

  // Reset ephemeral state whenever active scale changes
  useEffect(() => {
    setInputs({});
    setDrawerGuide(null);
    setPreCdsTab(null);
    setPostCdsTab(scale.metadata.kind === "formula" ? "formula" : "next_steps");
    setRelatedModal(null);
    setHelperSummaries({});
    setStimulusState({ open: false, initialCard: 0 });
  }, [scale.id, scale.metadata.kind]);

  const scaleById = useMemo(() => {
    const map = new Map<string, ScaleWithEffectiveStatus>();
    for (const entry of allScales) {
      map.set(entry.scale.id, entry);
    }
    return map;
  }, [allScales]);

  const evaluation = useMemo(
    () => evaluateScale(scale, inputs, { allowDraftPreview: isAdmin }),
    [scale, inputs, isAdmin]
  );

  const guidesIndex = useMemo(() => {
    let scaleGuide: AssessmentGuide | undefined;
    const itemGuides = new Map<string, AssessmentGuide>();
    const optionGuides = new Map<string, Map<string, AssessmentGuide>>();

    for (const guide of scale.assessment_guides) {
      if (guide.target_type === "scale") {
        scaleGuide = guide;
      } else if (guide.target_type === "item") {
        itemGuides.set(guide.target_id, guide);
      } else if (guide.target_type === "option" && guide.option_id) {
        let map = optionGuides.get(guide.target_id);
        if (!map) {
          map = new Map<string, AssessmentGuide>();
          optionGuides.set(guide.target_id, map);
        }
        map.set(guide.option_id, guide);
      }
    }
    return { scaleGuide, itemGuides, optionGuides };
  }, [scale.assessment_guides]);

  const fieldErrorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const err of evaluation.fieldErrors) {
      map.set(err.itemId, err.message);
    }
    return map;
  }, [evaluation.fieldErrors]);

  const handleSelectOption = (itemId: string, optionId: string) => {
    const targetItem = scale.items.find((i) => i.id === itemId);
    setInputs((prev) => {
      if (targetItem && !targetItem.required && prev[itemId] === optionId) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: optionId };
    });
  };

  const handleClearItem = (itemId: string) => {
    setInputs((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const handleNumericChange = (itemId: string, value: string, unit: string) => {
    setInputs((prev) => ({ ...prev, [itemId]: { value, unit } }));
  };

  const handleReset = () => {
    setInputs({});
    setHelperSummaries({});
  };

  const scrollToNextUnanswered = () => {
    for (const item of scale.items) {
      if (!item.required) continue;
      const val = inputs[item.id];
      const answered =
        item.kind === "select"
          ? typeof val === "string" && val.length > 0
          : typeof val === "object" &&
            val !== null &&
            String(val.value ?? "").trim().length > 0;
      if (!answered) {
        const el = document.getElementById(`calc-item-${item.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
  };

  const jumpToEvidence = () => {
    setPostCdsTab("next_steps");
    const el = document.getElementById("neurocalc-cds-section");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showProgressBar = scale.items.length >= 4;
  const progressPct =
    evaluation.requiredCount > 0
      ? Math.round((evaluation.answeredRequiredCount / evaluation.requiredCount) * 100)
      : 0;

  const activeRelatedEntry = relatedModal
    ? scaleById.get(relatedModal.scaleId) ?? null
    : null;
  const activeParentItem = relatedModal
    ? scale.items.find((i) => i.id === relatedModal.parentItemId) ?? null
    : null;

  const relatedScaleEntries = useMemo(() => {
    const slugs = scale.metadata.links?.related_scales ?? [];
    return slugs
      .map((slug) => scaleById.get(slug))
      .filter((entry): entry is ScaleWithEffectiveStatus => Boolean(entry));
  }, [scale.metadata.links?.related_scales, scaleById]);

  const formulaInfo = scale.scoring.formula_id
    ? FORMULA_METADATA[scale.scoring.formula_id]
    : undefined;

  const primaryRefs = scale.references.filter(
    (ref) => ref.category !== "validation"
  );
  const validationRefs = scale.references.filter(
    (ref) => ref.category === "validation"
  );

  const renderReferenceItem = (ref: ScaleReference) => {
    const safeCustomUrl = sanitizeUrl(ref.url);
    const trimmedPmid = ref.pmid?.trim();
    const isNumericPmid =
      typeof trimmedPmid === "string" && /^\d+$/.test(trimmedPmid);
    const trimmedDoi = ref.doi?.trim();
    const doiUrl = trimmedDoi
      ? sanitizeUrl(`https://doi.org/${trimmedDoi}`)
      : "";

    return (
      <li key={ref.id}>
        <span>{ref.citation}</span>
        {trimmedPmid &&
          (isNumericPmid ? (
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${trimmedPmid}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1.5 font-mono-tech text-[11px] text-[#0E7490] dark:text-cyan-400 hover:underline"
            >
              PMID: {trimmedPmid}
            </a>
          ) : (
            <span className="ml-1.5 font-mono-tech text-[11px] text-[var(--text-muted)]">
              PMID: {trimmedPmid}
            </span>
          ))}
        {!trimmedPmid &&
          trimmedDoi &&
          (doiUrl ? (
            <a
              href={doiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1.5 font-mono-tech text-[11px] text-[#0E7490] dark:text-cyan-400 hover:underline"
            >
              DOI: {trimmedDoi}
            </a>
          ) : (
            <span className="ml-1.5 font-mono-tech text-[11px] text-[var(--text-muted)]">
              DOI: {trimmedDoi}
            </span>
          ))}
        {!trimmedPmid && !trimmedDoi && safeCustomUrl && (
          <a
            href={safeCustomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1.5 text-[11px] font-semibold text-[#0E7490] dark:text-cyan-400 hover:underline"
          >
            Link
          </a>
        )}
      </li>
    );
  };

  const drawerStimulusCallback =
    scale.id === "nihss" && drawerGuide?.target_id === "nihss_9"
      ? () => setStimulusState({ open: true, initialCard: 0 })
      : scale.id === "nihss" && drawerGuide?.target_id === "nihss_10"
        ? () => setStimulusState({ open: true, initialCard: 3 })
        : undefined;

  return (
    <div className="max-w-4xl mx-auto pb-4">
      {/* Top Breadcrumb & Scale Header Card */}
      <div className="mb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7490] dark:text-cyan-400 hover:underline mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>All Clinical Scales</span>
        </button>

        <div className="rounded-2xl border border-[var(--border-hairline)] border-l-4 border-l-[#0E7490] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-2xs flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-200 dark:border-cyan-800">
                {scale.metadata.short_name}
              </span>
              {scale.metadata.subspecialties.map((sub) => (
                <span
                  key={sub}
                  className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]"
                >
                  {sub}
                </span>
              ))}
              {scale.metadata.time_estimate && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  <span>{scale.metadata.time_estimate}</span>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-2xl font-bold leading-snug text-[var(--text-ink)]">
              {scale.metadata.name}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed max-w-3xl">
              {scale.metadata.summary}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(scale.id)}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                className={`inline-flex items-center justify-center rounded-xl border p-2 transition-colors ${
                  isFavorite
                    ? "border-amber-400/60 bg-amber-500/12 text-amber-600 dark:text-amber-300"
                    : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-muted)] hover:text-amber-500 hover:bg-[var(--bg-subtle)]"
                }`}
              >
                <Star
                  className={`w-4 h-4 ${isFavorite ? "fill-amber-500" : ""}`}
                  aria-hidden="true"
                />
              </button>
            )}
            {guidesIndex.scaleGuide && (
              <button
                type="button"
                onClick={() => setDrawerGuide(guidesIndex.scaleGuide ?? null)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#0E7490]/35 bg-[#0E7490]/8 dark:bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/15 transition-colors"
              >
                <HelpCircle className="w-4 h-4" aria-hidden="true" />
                <span>{guidesIndex.scaleGuide.chip_label || "Scale guide"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tier 1 Pre-Scoring CDS Strip (MDCalc-inspired, compact & collapsed by default) */}
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setPreCdsTab((prev) =>
                prev === "when_to_use" ? null : "when_to_use"
              )
            }
            aria-expanded={preCdsTab === "when_to_use"}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
              preCdsTab === "when_to_use"
                ? "border-[#0E7490] bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300"
                : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" />
            <span>When to Use</span>
            {preCdsTab === "when_to_use" ? (
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>

          {scale.metadata.clinical_pearls &&
            scale.metadata.clinical_pearls.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  setPreCdsTab((prev) => (prev === "pearls" ? null : "pearls"))
                }
                aria-expanded={preCdsTab === "pearls"}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  preCdsTab === "pearls"
                    ? "border-[#0E7490] bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300"
                    : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  Pearls &amp; Pitfalls ({scale.metadata.clinical_pearls.length})
                </span>
                {preCdsTab === "pearls" ? (
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            )}
        </div>

        {preCdsTab === "when_to_use" && (
          <div className="mt-2 rounded-xl border border-[#0E7490]/30 bg-[var(--bg-surface)] px-4 py-3 text-xs text-[var(--text-secondary)] space-y-1.5">
            {scale.metadata.when_to_use &&
            scale.metadata.when_to_use.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 leading-relaxed">
                {scale.metadata.when_to_use.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="leading-relaxed">{scale.metadata.summary}</p>
            )}
          </div>
        )}

        {preCdsTab === "pearls" && scale.metadata.clinical_pearls && (
          <div className="mt-2 rounded-xl border border-[#0E7490]/30 bg-[var(--bg-surface)] px-4 py-3 text-xs text-[var(--text-secondary)]">
            <ul className="list-disc list-inside space-y-1 leading-relaxed">
              {scale.metadata.clinical_pearls.map((pearl, idx) => (
                <li key={idx}>{pearl}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Multi-item Completion Progress Strip */}
      {showProgressBar && (
        <div className="mb-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[var(--text-secondary)]">
                Completion Progress
              </span>
              <span className="font-mono-tech font-bold text-[var(--text-ink)]">
                {evaluation.answeredRequiredCount} / {evaluation.requiredCount}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--bg-subtle)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0E7490] dark:bg-cyan-500 transition-all duration-300"
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
          </div>

          {!evaluation.isComplete && (
            <button
              type="button"
              onClick={scrollToNextUnanswered}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-1.5 text-xs font-semibold text-[#0E7490] dark:text-cyan-400 hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <span>Next unanswered</span>
              <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {/* Single-Column Bedside Workspace (Result stays docked at bottom) */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] divide-y divide-[var(--border-hairline)] shadow-2xs overflow-hidden">
          {scale.items.map((item) => {
            const relatedTarget = item.related_scale_id
              ? scaleById.get(item.related_scale_id)?.scale
              : undefined;

            if (item.kind === "select") {
              const selItem = item as SelectScaleItem;
              const selectedOptId =
                typeof inputs[selItem.id] === "string"
                  ? (inputs[selItem.id] as string)
                  : undefined;

              const isNihssLang = scale.id === "nihss" && selItem.id === "nihss_9";
              const isNihssDys = scale.id === "nihss" && selItem.id === "nihss_10";

              return (
                <SelectItemCard
                  key={selItem.id}
                  elementId={`calc-item-${selItem.id}`}
                  item={selItem}
                  selectedOptionId={selectedOptId}
                  onSelect={handleSelectOption}
                  onClear={handleClearItem}
                  showPoints={scale.metadata.kind !== "formula"}
                  itemGuide={guidesIndex.itemGuides.get(selItem.id)}
                  optionGuidesByOptionId={
                    guidesIndex.optionGuides.get(selItem.id) ?? new Map()
                  }
                  references={scale.references}
                  onOpenDrawer={setDrawerGuide}
                  relatedScaleName={relatedTarget?.metadata.short_name}
                  relatedScaleSummary={helperSummaries[selItem.id]}
                  onOpenRelatedScale={(scaleId, itemId) =>
                    setRelatedModal({ scaleId, parentItemId: itemId })
                  }
                  onOpenStimulus={
                    isNihssLang
                      ? () => setStimulusState({ open: true, initialCard: 0 })
                      : isNihssDys
                        ? () => setStimulusState({ open: true, initialCard: 3 })
                        : undefined
                  }
                  stimulusLabel={
                    isNihssLang
                      ? "Stimulus Cards"
                      : isNihssDys
                        ? "Word List Card"
                        : undefined
                  }
                />
              );
            }

            const numItem = item as NumericScaleItem;
            const cur = inputs[numItem.id];
            const rawValue =
              typeof cur === "object" && cur !== null
                ? String(cur.value ?? "")
                : typeof cur === "number" || typeof cur === "string"
                  ? String(cur)
                  : "";
            const selectedUnit =
              typeof cur === "object" && cur !== null && cur.unit
                ? cur.unit
                : (numItem.default_unit ?? numItem.canonical_unit);

            return (
              <NumericItemCard
                key={numItem.id}
                elementId={`calc-item-${numItem.id}`}
                item={numItem}
                rawValue={rawValue}
                selectedUnit={selectedUnit}
                errorMessage={fieldErrorMap.get(numItem.id)}
                onChange={handleNumericChange}
                itemGuide={guidesIndex.itemGuides.get(numItem.id)}
                references={scale.references}
                onOpenDrawer={setDrawerGuide}
                relatedScaleName={relatedTarget?.metadata.short_name}
                relatedScaleSummary={helperSummaries[numItem.id]}
                onOpenRelatedScale={(scaleId, itemId) =>
                  setRelatedModal({ scaleId, parentItemId: itemId })
                }
              />
            );
          })}
        </div>

        {/* Tier 2 Post-Scoring Clinical Decision Support & Evidence Tabs */}
        <section
          id="neurocalc-cds-section"
          className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden shadow-2xs"
        >
          <div
            role="tablist"
            aria-label="Clinical decision support and evidence"
            className="flex items-center gap-1 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 pt-2 overflow-x-auto scrollbar-none"
          >
            {(
              [
                {
                  id: "next_steps" as const,
                  label: "Next Steps",
                  Icon: ClipboardCheck,
                },
                {
                  id: "formula" as const,
                  label:
                    scale.metadata.kind === "formula"
                      ? "Formula"
                      : "Scoring & Bands",
                  Icon: FlaskConical,
                },
                {
                  id: "pearls" as const,
                  label: "Pearls & Pitfalls",
                  Icon: Sparkles,
                },
                {
                  id: "evidence" as const,
                  label: `Evidence (${scale.references.length})`,
                  Icon: BookOpen,
                },
              ] as const
            ).map((tab) => {
              const active = postCdsTab === tab.id;
              const TabIcon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPostCdsTab(tab.id)}
                  className={`relative shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors rounded-t-lg ${
                    active
                      ? "text-[#0E7490] dark:text-cyan-400 bg-[var(--bg-surface)] border border-b-0 border-[var(--border-hairline)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 sm:p-5 text-xs text-[var(--text-secondary)] space-y-4">
            {postCdsTab === "next_steps" && (
              <>
                {evaluation.isComplete && evaluation.band && (
                  <div className="rounded-xl border border-[#0E7490]/30 bg-[#0E7490]/6 dark:bg-cyan-500/10 p-3.5 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-300">
                      Current Result Interpretation · {evaluation.band.label}
                    </p>
                    <p className="text-xs text-[var(--text-ink)] leading-relaxed">
                      {evaluation.band.summary}
                    </p>
                    {evaluation.band.clinical_note && (
                      <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
                        {evaluation.band.clinical_note}
                      </p>
                    )}
                  </div>
                )}

                {scale.metadata.next_steps &&
                scale.metadata.next_steps.length > 0 ? (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-ink)] mb-1.5">
                      Clinical Actions &amp; Disposition
                    </h4>
                    <ul className="list-disc list-inside space-y-1 leading-relaxed">
                      {scale.metadata.next_steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[var(--text-muted)] leading-relaxed">
                    Interpret this score alongside the patient&apos;s full clinical trajectory, imaging, and serial bedside examinations.
                  </p>
                )}

                {(relatedScaleEntries.length > 0 ||
                  scale.metadata.links?.neuroguide_slug ||
                  (scale.metadata.links?.neurorx_slugs?.length ?? 0) > 0) && (
                  <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2.5">
                    {relatedScaleEntries.length > 0 && (
                      <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                          Related Calculators
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {relatedScaleEntries.map((entry) => (
                            <button
                              key={entry.scale.id}
                              type="button"
                              onClick={() => onSelectScale(entry.scale.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-ink)] hover:border-[#0E7490] hover:text-[#0E7490] dark:hover:text-cyan-300 transition-colors"
                            >
                              <Calculator className="w-3.5 h-3.5 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
                              <span>{entry.scale.metadata.short_name}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-60" aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(scale.metadata.links?.neuroguide_slug ||
                      (scale.metadata.links?.neurorx_slugs?.length ?? 0) > 0) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {scale.metadata.links?.neuroguide_slug && (
                          <Link
                            href="/neuroguide"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#0E7490]/35 bg-[#0E7490]/10 dark:bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/20"
                          >
                            <span>Open NeuroGuide</span>
                            <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                          </Link>
                        )}
                        {scale.metadata.links?.neurorx_slugs &&
                          scale.metadata.links.neurorx_slugs.length > 0 && (
                            <Link
                              href="/neurorx"
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-1 text-xs font-semibold text-[var(--text-ink)] hover:border-[#0E7490]"
                            >
                              <span>Open NeuroRx</span>
                              <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                            </Link>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {postCdsTab === "formula" && (
              <div className="space-y-4">
                {(formulaInfo ||
                  scale.scoring.expression ||
                  scale.metadata.formula_display) && (
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3.5 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400">
                      {formulaInfo?.label ?? "Calculation Equation"}
                    </p>
                    <pre className="overflow-x-auto rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 font-mono-tech text-xs text-[var(--text-ink)]">
                      {scale.metadata.formula_display ??
                        formulaInfo?.equation ??
                        scale.scoring.expression}
                    </pre>
                    {formulaInfo?.description && (
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {formulaInfo.description}
                      </p>
                    )}
                  </div>
                )}

                {scale.metadata.kind !== "formula" && (
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3.5 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Scoring Method
                    </p>
                    <p className="text-xs text-[var(--text-ink)]">
                      {scale.scoring.method === "sum"
                        ? `Additive point sum (${scale.scoring.min_score}–${scale.scoring.max_score ?? "∞"} ${scale.scoring.unit ?? "points"})`
                        : `Single-select ordinal grade (${scale.scoring.min_score}–${scale.scoring.max_score ?? "∞"} ${scale.scoring.unit ?? "grade"})`}
                    </p>
                    {scale.scoring.untestable_policy ===
                      "invalidate_total_and_flag" && (
                      <p className="text-[11.5px] text-[var(--text-muted)]">
                        Untestable policy: if any component is marked NT, individual components are preserved and total score is not summed.
                      </p>
                    )}
                    {scale.scoring.untestable_policy === "exclude_and_flag" && (
                      <p className="text-[11.5px] text-[var(--text-muted)]">
                        Untestable policy: UN items contribute 0 to the numeric sum and are flagged separately in the result summary.
                      </p>
                    )}
                  </div>
                )}

                {evaluation.applicableBands.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                      Interpretation Bands
                    </h4>
                    <div className="rounded-xl border border-[var(--border-hairline)] overflow-hidden divide-y divide-[var(--border-hairline)]">
                      {evaluation.applicableBands.map((b) => (
                        <div
                          key={b.id}
                          className="px-3 py-2 bg-[var(--bg-paper)]/60 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
                        >
                          <span className="font-mono-tech text-[11px] font-bold text-[#0E7490] dark:text-cyan-300 shrink-0 min-w-[72px]">
                            {b.min}
                            {b.max !== null
                              ? b.max === b.min
                                ? ""
                                : `–${b.max}`
                              : "+"}
                            {scale.scoring.unit === "%" ? "%" : ""}
                          </span>
                          <span className="font-semibold text-[var(--text-ink)] shrink-0">
                            {b.label}
                          </span>
                          <span className="text-[11.5px] text-[var(--text-muted)]">
                            {b.summary}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {postCdsTab === "pearls" && (
              <div>
                {scale.metadata.clinical_pearls &&
                scale.metadata.clinical_pearls.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                    {scale.metadata.clinical_pearls.map((pearl, idx) => (
                      <li key={idx}>{pearl}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[var(--text-muted)]">
                    No clinical pearls recorded for this scale yet.
                  </p>
                )}
              </div>
            )}

            {postCdsTab === "evidence" && (
              <div className="space-y-4">
                {primaryRefs.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Original / Primary Reference
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                      {primaryRefs.map(renderReferenceItem)}
                    </ol>
                  </div>
                )}

                {validationRefs.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Validation &amp; Supporting Literature
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                      {validationRefs.map(renderReferenceItem)}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Fixed Bottom Live Result Dock */}
      <ScoreResultCard
        scale={scale}
        evaluation={evaluation}
        onReset={handleReset}
        onJumpToEvidence={jumpToEvidence}
      />

      <AssessmentGuideDrawer
        guide={drawerGuide}
        references={scale.references}
        onClose={() => setDrawerGuide(null)}
        onOpenStimulus={drawerStimulusCallback}
      />

      <RelatedScaleDrawer
        scaleEntry={activeRelatedEntry}
        parentItemLabel={activeParentItem?.label ?? ""}
        parentItemKind={activeParentItem?.kind ?? "select"}
        isAdmin={isAdmin}
        onClose={() => setRelatedModal(null)}
        onApplyNumericValue={(val, unit) => {
          if (!activeParentItem || activeParentItem.kind !== "numeric") return;
          const numItem = activeParentItem as NumericScaleItem;
          const matchingUnit =
            numItem.units.find((u) => u.unit === unit)?.unit ??
            numItem.canonical_unit;
          handleNumericChange(numItem.id, val, matchingUnit);
          setHelperSummaries((prev) => ({
            ...prev,
            [numItem.id]: `Applied ${val}${matchingUnit ? ` ${matchingUnit}` : ""}`,
          }));
        }}
        onRememberSummary={(summary) => {
          if (!activeParentItem) return;
          setHelperSummaries((prev) => ({
            ...prev,
            [activeParentItem.id]: summary,
          }));
        }}
        onOpenFullScale={(targetSlug) => onSelectScale(targetSlug)}
      />

      <NihssStimulusModal
        isOpen={stimulusState.open}
        initialCard={stimulusState.initialCard}
        onClose={() => setStimulusState((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
