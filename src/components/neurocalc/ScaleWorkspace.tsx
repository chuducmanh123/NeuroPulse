"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  evaluateScale,
  type ScaleInputValues,
} from "@/lib/neurocalc/engine";
import type {
  AssessmentGuide,
  NumericScaleItem,
  ScaleReference,
  ScaleWithEffectiveStatus,
  SelectScaleItem,
} from "@/types/neurocalc";
import { sanitizeUrl } from "@/utils/safeUrl";
import { AssessmentGuideDrawer } from "./AssessmentGuidePanel";
import { NumericItemCard } from "./NumericItemCard";
import { ScoreResultCard } from "./ScoreResultCard";
import { SelectItemCard } from "./SelectItemCard";

interface ScaleWorkspaceProps {
  scaleEntry: ScaleWithEffectiveStatus;
  isAdmin?: boolean;
  onBack: () => void;
}

export function ScaleWorkspace({
  scaleEntry,
  isAdmin = false,
  onBack,
}: ScaleWorkspaceProps) {
  const { scale } = scaleEntry;

  // Strictly ephemeral in-memory scoring state (zero localStorage/IndexedDB persistence).
  const [inputs, setInputs] = useState<ScaleInputValues>({});
  const [drawerGuide, setDrawerGuide] = useState<AssessmentGuide | null>(null);
  const [showRefs, setShowRefs] = useState(false);

  // Reset ephemeral state whenever active scale changes
  useEffect(() => {
    setInputs({});
    setDrawerGuide(null);
    setShowRefs(false);
  }, [scale.id]);

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

  const showProgressBar = scale.items.length >= 4;
  const progressPct =
    evaluation.requiredCount > 0
      ? Math.round((evaluation.answeredRequiredCount / evaluation.requiredCount) * 100)
      : 0;

  return (
    <div className="max-w-4xl mx-auto pb-4">
      {/* Top Breadcrumb & Scale Header Card */}
      <div className="mb-5">
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
            </div>
            <h2 className="text-lg sm:text-2xl font-bold leading-snug text-[var(--text-ink)]">
              {scale.metadata.name}
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed max-w-3xl">
              {scale.metadata.summary}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
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

      {/* Multi-item Completion Progress Strip */}
      {showProgressBar && (
        <div className="mb-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
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
      <div className="space-y-3.5">
          {scale.items.map((item) => {
            if (item.kind === "select") {
              const selItem = item as SelectScaleItem;
              const selectedOptId =
                typeof inputs[selItem.id] === "string"
                  ? (inputs[selItem.id] as string)
                  : undefined;
              return (
                <SelectItemCard
                  key={selItem.id}
                  elementId={`calc-item-${selItem.id}`}
                  item={selItem}
                  selectedOptionId={selectedOptId}
                  onSelect={handleSelectOption}
                  onClear={handleClearItem}
                  itemGuide={guidesIndex.itemGuides.get(selItem.id)}
                  optionGuidesByOptionId={
                    guidesIndex.optionGuides.get(selItem.id) ?? new Map()
                  }
                  references={scale.references}
                  onOpenDrawer={setDrawerGuide}
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
                : numItem.canonical_unit;

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
              />
            );
          })}

          {/* Clinical Pearls and Pitfalls & References Accordion */}
          {(scale.metadata.clinical_pearls?.length || scale.references.length > 0) && (() => {
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
                  {trimmedPmid && (
                    isNumericPmid ? (
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
                    )
                  )}
                  {!trimmedPmid && trimmedDoi && (
                    doiUrl ? (
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
                    )
                  )}
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

            return (
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRefs((prev) => !prev)}
                  aria-expanded={showRefs}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[var(--bg-subtle)]/50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    <BookOpen className="w-4 h-4 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
                    <span>Clinical Pearls and Pitfalls &amp; References ({scale.references.length})</span>
                  </span>
                  {showRefs ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" aria-hidden="true" />
                  )}
                </button>

                {showRefs && (
                  <div className="px-5 pb-4 pt-1 border-t border-[var(--border-hairline)] space-y-4">
                    {scale.metadata.clinical_pearls &&
                      scale.metadata.clinical_pearls.length > 0 && (
                        <div>
                          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400 mb-1.5">
                            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Clinical Pearls and Pitfalls</span>
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                            {scale.metadata.clinical_pearls.map((pearl, idx) => (
                              <li key={idx}>{pearl}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {primaryRefs.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                          Original/Primary Reference
                        </h4>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                          {primaryRefs.map(renderReferenceItem)}
                        </ol>
                      </div>
                    )}

                    {validationRefs.length > 0 && (
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                          Validation
                        </h4>
                        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                          {validationRefs.map(renderReferenceItem)}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
      </div>

      {/* Fixed Bottom Live Result Dock */}
      <ScoreResultCard
        scale={scale}
        evaluation={evaluation}
        onReset={handleReset}
      />

      <AssessmentGuideDrawer
        guide={drawerGuide}
        references={scale.references}
        onClose={() => setDrawerGuide(null)}
      />
    </div>
  );
}
