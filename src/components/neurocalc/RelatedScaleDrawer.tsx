"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, RotateCcw, ShieldAlert, X } from "lucide-react";
import { evaluateScale, type ScaleInputValues } from "@/lib/neurocalc/engine";
import type {
  AssessmentGuide,
  NumericScaleItem,
  ScaleWithEffectiveStatus,
  SelectScaleItem,
} from "@/types/neurocalc";
import { AssessmentGuideDrawer } from "./AssessmentGuidePanel";
import { NumericItemCard } from "./NumericItemCard";
import { SelectItemCard } from "./SelectItemCard";

interface RelatedScaleDrawerProps {
  scaleEntry: ScaleWithEffectiveStatus | null;
  parentItemLabel: string;
  parentItemKind: "select" | "numeric";
  isAdmin?: boolean;
  onClose: () => void;
  onApplyNumericValue?: (value: string, unit: string) => void;
  onRememberSummary?: (summary: string) => void;
  onOpenFullScale?: (scaleId: string) => void;
}

export function RelatedScaleDrawer({
  scaleEntry,
  parentItemLabel,
  parentItemKind,
  isAdmin = false,
  onClose,
  onApplyNumericValue,
  onRememberSummary,
  onOpenFullScale,
}: RelatedScaleDrawerProps) {
  const [inputs, setInputs] = useState<ScaleInputValues>({});
  const [nestedGuide, setNestedGuide] = useState<AssessmentGuide | null>(null);

  useEffect(() => {
    setInputs({});
    setNestedGuide(null);
  }, [scaleEntry?.scale.id]);

  useEffect(() => {
    if (!scaleEntry) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !nestedGuide) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scaleEntry, nestedGuide, onClose]);

  const evaluation = useMemo(() => {
    if (!scaleEntry) return null;
    return evaluateScale(scaleEntry.scale, inputs, {
      allowDraftPreview: isAdmin,
    });
  }, [scaleEntry, inputs, isAdmin]);

  const guidesIndex = useMemo(() => {
    const itemGuides = new Map<string, AssessmentGuide>();
    const optionGuides = new Map<string, Map<string, AssessmentGuide>>();
    if (!scaleEntry) return { itemGuides, optionGuides };

    for (const g of scaleEntry.scale.assessment_guides) {
      if (g.target_type === "item") {
        itemGuides.set(g.target_id, g);
      } else if (g.target_type === "option" && g.option_id) {
        let map = optionGuides.get(g.target_id);
        if (!map) {
          map = new Map<string, AssessmentGuide>();
          optionGuides.set(g.target_id, map);
        }
        map.set(g.option_id, g);
      }
    }
    return { itemGuides, optionGuides };
  }, [scaleEntry]);

  if (!scaleEntry || !evaluation) return null;

  const { scale } = scaleEntry;
  const fieldErrorMap = new Map<string, string>();
  for (const err of evaluation.fieldErrors) {
    fieldErrorMap.set(err.itemId, err.message);
  }

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

  const summaryBadge = evaluation.totalInvalidatedReason
    ? `${scale.metadata.short_name}: ${evaluation.componentNotation ?? "NT"}`
    : evaluation.formattedScore !== null
      ? `${scale.metadata.short_name}: ${evaluation.formattedScore}${
          evaluation.componentNotation ? ` (${evaluation.componentNotation})` : ""
        }`
      : null;

  const canApplyNumeric =
    parentItemKind === "numeric" &&
    !evaluation.isGated &&
    evaluation.isComplete &&
    evaluation.formattedScore !== null &&
    Boolean(onApplyNumericValue);

  const canDoneSelect =
    parentItemKind === "select" &&
    !evaluation.isGated &&
    summaryBadge !== null &&
    Boolean(onRememberSummary);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`${scale.metadata.name} helper calculator`}
    >
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative z-10 w-full max-w-lg h-full flex flex-col border-l border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[var(--border-hairline)] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300">
                Helper · {scale.metadata.short_name}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] truncate">
                For {parentItemLabel}
              </span>
            </div>
            <h2 className="mt-1 text-base font-bold text-[var(--text-ink)] leading-snug">
              {scale.metadata.name}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setInputs({})}
              title="Reset helper inputs"
              aria-label="Reset helper inputs"
              className="p-2 rounded-xl border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close helper calculator"
              className="p-2 rounded-xl border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-hairline)]">
          {evaluation.isGated && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-2.5">
              <ShieldAlert
                className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                This helper scale is currently in{" "}
                <span className="font-bold uppercase">
                  {evaluation.effectiveStatus}
                </span>{" "}
                status and requires verification in Admin before clinical scoring.
              </p>
            </div>
          )}

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
                  onOpenDrawer={setNestedGuide}
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
                item={numItem}
                rawValue={rawValue}
                selectedUnit={selectedUnit}
                errorMessage={fieldErrorMap.get(numItem.id)}
                onChange={handleNumericChange}
                itemGuide={guidesIndex.itemGuides.get(numItem.id)}
                references={scale.references}
                onOpenDrawer={setNestedGuide}
              />
            );
          })}
        </div>

        {/* Sticky Drawer Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--border-hairline)] bg-[var(--bg-paper)] shrink-0 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Helper Result
              </p>
              {evaluation.totalInvalidatedReason ? (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono-tech text-xl font-bold text-[var(--text-ink)]">
                    {evaluation.componentNotation ?? "NT"}
                  </span>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    Component only (NT)
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono-tech text-2xl font-bold text-[var(--text-ink)]">
                    {evaluation.formattedScore ?? "—"}
                  </span>
                  {scale.scoring.unit && (
                    <span className="font-mono-tech text-xs font-semibold text-[var(--text-muted)]">
                      {scale.scoring.unit}
                    </span>
                  )}
                  {evaluation.componentNotation && (
                    <span className="rounded bg-[#0E7490]/12 dark:bg-cyan-500/15 px-1.5 py-0.5 font-mono-tech text-[11px] font-bold text-[#0E7490] dark:text-cyan-300">
                      {evaluation.componentNotation}
                    </span>
                  )}
                </div>
              )}
              {evaluation.band && (
                <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
                  {evaluation.band.label}
                </p>
              )}
            </div>

            {onOpenFullScale && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullScale(scale.id);
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors shrink-0"
              >
                <span>Open full scale</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {canApplyNumeric && (
            <button
              type="button"
              onClick={() => {
                onApplyNumericValue!(
                  evaluation.formattedScore!,
                  scale.scoring.unit ?? ""
                );
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0E7490] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0B5E75] transition-colors"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>
                Apply {evaluation.formattedScore} {scale.scoring.unit ?? ""} to{" "}
                {parentItemLabel}
              </span>
            </button>
          )}

          {canDoneSelect && (
            <button
              type="button"
              onClick={() => {
                onRememberSummary!(summaryBadge!);
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0E7490] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0B5E75] transition-colors"
            >
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>Done ({summaryBadge})</span>
            </button>
          )}
        </div>
      </aside>

      <AssessmentGuideDrawer
        guide={nestedGuide}
        references={scale.references}
        onClose={() => setNestedGuide(null)}
      />
    </div>
  );
}
