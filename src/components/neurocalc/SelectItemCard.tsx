"use client";

import React, { useState } from "react";
import { Calculator, Check, Eye, HelpCircle } from "lucide-react";
import type {
  AssessmentGuide,
  ScaleReference,
  SelectScaleItem,
} from "@/types/neurocalc";
import { InlineAssessmentGuide } from "./AssessmentGuidePanel";

interface SelectItemCardProps {
  item: SelectScaleItem;
  selectedOptionId: string | undefined;
  onSelect: (itemId: string, optionId: string) => void;
  onClear?: (itemId: string) => void;
  showPoints?: boolean;
  itemGuide?: AssessmentGuide;
  optionGuidesByOptionId: ReadonlyMap<string, AssessmentGuide>;
  references: ScaleReference[];
  onOpenDrawer: (guide: AssessmentGuide) => void;
  elementId?: string;
  relatedScaleName?: string;
  relatedScaleSummary?: string;
  onOpenRelatedScale?: (scaleId: string, itemId: string) => void;
  onOpenStimulus?: () => void;
  stimulusLabel?: string;
}

export function SelectItemCard({
  item,
  selectedOptionId,
  onSelect,
  onClear,
  showPoints = true,
  itemGuide,
  optionGuidesByOptionId,
  references,
  onOpenDrawer,
  elementId,
  relatedScaleName,
  relatedScaleSummary,
  onOpenRelatedScale,
  onOpenStimulus,
  stimulusLabel,
}: SelectItemCardProps) {
  const [openInlineItemGuide, setOpenInlineItemGuide] = useState(false);
  const [openOptionGuideId, setOpenOptionGuideId] = useState<string | null>(null);

  const isAnswered = Boolean(selectedOptionId);

  const isSegmented =
    item.options.length >= 2 &&
    item.options.length <= 3 &&
    optionGuidesByOptionId.size === 0 &&
    item.options.every((opt) => !opt.description && opt.label.length <= 22);

  const handleOptionClick = (optId: string) => {
    if (!item.required && onClear && selectedOptionId === optId) {
      onClear(item.id);
      return;
    }
    onSelect(item.id, optId);
  };

  const renderHeaderControls = () => (
    <>
      {relatedScaleSummary && (
        <span className="inline-flex items-center rounded-md border border-[#0E7490]/30 bg-[#0E7490]/10 dark:bg-cyan-500/15 px-1.5 py-0.5 font-mono-tech text-[10.5px] font-semibold text-[#0E7490] dark:text-cyan-300">
          {relatedScaleSummary}
        </span>
      )}
      {item.related_scale_id && onOpenRelatedScale && (
        <button
          type="button"
          onClick={() => onOpenRelatedScale(item.related_scale_id!, item.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-[#0E7490]/35 bg-[#0E7490]/8 dark:bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/15 transition-colors shrink-0"
        >
          <Calculator className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>
            {item.related_scale_label ||
              (relatedScaleName ? `Calculate ${relatedScaleName}` : "Calculate")}
          </span>
        </button>
      )}
      {onOpenStimulus && (
        <button
          type="button"
          onClick={onOpenStimulus}
          className="inline-flex items-center gap-1 rounded-lg border border-[#0E7490]/35 bg-[#0E7490]/8 dark:bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/15 transition-colors shrink-0"
        >
          <Eye className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{stimulusLabel || "Stimulus Cards"}</span>
        </button>
      )}
      {!item.required && isAnswered && onClear && (
        <button
          type="button"
          onClick={() => onClear(item.id)}
          className="rounded-md border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          Clear
        </button>
      )}
      {itemGuide && (
        <>
          <button
            type="button"
            onClick={() => onOpenDrawer(itemGuide)}
            aria-label={`Guide for ${item.label}`}
            title={itemGuide.chip_label || itemGuide.title}
            className="hidden sm:inline-flex items-center justify-center rounded-full p-0.5 text-[var(--text-muted)] hover:text-[#0E7490] dark:hover:text-cyan-300 transition-colors shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setOpenInlineItemGuide((prev) => !prev)}
            aria-expanded={openInlineItemGuide}
            aria-controls={`guide-inline-${item.id}`}
            aria-label={`Guide for ${item.label}`}
            className="sm:hidden inline-flex items-center justify-center rounded-full p-0.5 text-[var(--text-muted)] hover:text-[#0E7490] dark:hover:text-cyan-300 transition-colors shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </>
      )}
    </>
  );

  if (isSegmented) {
    const gridColsClass =
      item.options.length === 2 ? "grid-cols-2" : "grid-cols-3";

    return (
      <section id={elementId} className="px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(240px,340px)] items-center gap-2 sm:gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {item.code && (
                <span className="inline-flex items-center justify-center rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono-tech text-[11px] font-bold text-[var(--text-secondary)]">
                  {item.code}
                </span>
              )}
              <span className="text-sm font-medium text-[var(--text-ink)] leading-snug">
                {item.label}
                {!item.required && (
                  <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">
                    (Optional)
                  </span>
                )}
              </span>
              {renderHeaderControls()}
            </div>
            {item.subtitle && (
              <p className="mt-1 text-[11.5px] text-[var(--text-muted)] leading-snug">
                {item.subtitle}
              </p>
            )}
          </div>

          <div
            role="radiogroup"
            aria-label={item.label}
            className={`grid ${gridColsClass} rounded-lg border border-[var(--border-hairline)] overflow-hidden divide-x divide-[var(--border-hairline)] h-10 bg-[var(--bg-paper)]`}
          >
            {item.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const inlinePoint =
                showPoints &&
                (opt.is_untestable
                  ? "UN"
                  : opt.points !== null && opt.points !== 0
                    ? opt.points > 0
                      ? `+${opt.points}`
                      : String(opt.points)
                    : null);

              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleOptionClick(opt.id)}
                  className={`flex items-center justify-center min-w-0 px-2 text-xs sm:text-[13px] transition-colors ${
                    isSelected
                      ? opt.is_untestable
                        ? "bg-amber-600 text-white font-semibold"
                        : "bg-[#0E7490] dark:bg-cyan-600 text-white font-semibold"
                      : "bg-[var(--bg-paper)] text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] font-medium"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {inlinePoint && (
                    <span className="text-[10.5px] font-mono-tech opacity-80 ml-1 shrink-0">
                      {inlinePoint}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {itemGuide && openInlineItemGuide && (
          <div className="sm:hidden mt-2.5">
            <InlineAssessmentGuide
              id={`guide-inline-${item.id}`}
              guide={itemGuide}
              references={references}
              onClose={() => setOpenInlineItemGuide(false)}
            />
          </div>
        )}
      </section>
    );
  }

  return (
    <section id={elementId} className="px-4 py-3 sm:px-5 sm:py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {item.code && (
              <span className="inline-flex items-center justify-center rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono-tech text-[11px] font-bold text-[var(--text-secondary)]">
                {item.code}
              </span>
            )}
            <h3 className="text-sm font-medium text-[var(--text-ink)] leading-snug">
              {item.label}
              {!item.required && (
                <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">
                  (Optional)
                </span>
              )}
            </h3>
          </div>
          {item.subtitle && (
            <p className="mt-1 text-[11.5px] text-[var(--text-muted)] leading-snug">
              {item.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {renderHeaderControls()}
        </div>
      </div>

      {itemGuide && openInlineItemGuide && (
        <div className="sm:hidden mb-2.5">
          <InlineAssessmentGuide
            id={`guide-inline-${item.id}`}
            guide={itemGuide}
            references={references}
            onClose={() => setOpenInlineItemGuide(false)}
          />
        </div>
      )}

      <div className="space-y-1.5" role="radiogroup" aria-label={item.label}>
        {item.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          const optGuide = optionGuidesByOptionId.get(opt.id);
          const isOptGuideOpen = openOptionGuideId === opt.id;
          const pointDisplay = showPoints
            ? opt.badge
              ? opt.badge
              : opt.is_untestable
                ? "UN"
                : opt.points !== null
                  ? opt.points > 0
                    ? `+${opt.points}`
                    : String(opt.points)
                  : ""
            : "";

          return (
            <div key={opt.id}>
              <div className="flex items-stretch gap-1.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleOptionClick(opt.id)}
                  className={`flex-1 min-h-[38px] flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-all ${
                    isSelected
                      ? opt.is_untestable
                        ? "border-amber-500 bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/40"
                        : "border-[#0E7490] bg-[#0E7490]/8 dark:bg-cyan-500/15 text-[var(--text-ink)] ring-1 ring-[#0E7490]/35"
                      : "border-[var(--border-hairline)] bg-[var(--bg-paper)]/60 hover:border-[#0E7490]/40 hover:bg-[var(--bg-subtle)]/60 text-[var(--text-ink)]"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? opt.is_untestable
                            ? "border-amber-600 bg-amber-600 text-white"
                            : "border-[#0E7490] bg-[#0E7490] text-white"
                          : "border-[var(--text-muted)]/50"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5" aria-hidden="true" />}
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[13px] font-medium leading-snug">
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="mt-0.5 block text-[11px] text-[var(--text-muted)] leading-snug">
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {pointDisplay && (
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 font-mono-tech text-xs font-bold ${
                        opt.is_untestable
                          ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                          : isSelected
                            ? "bg-[#0E7490] text-white"
                            : "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {pointDisplay}
                    </span>
                  )}
                </button>

                {optGuide && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenOptionGuideId((prev) => (prev === opt.id ? null : opt.id));
                    }}
                    aria-expanded={isOptGuideOpen}
                    aria-controls={`guide-opt-${item.id}-${opt.id}`}
                    title={optGuide.title}
                    aria-label={`How to assess: ${opt.label}`}
                    className={`min-w-[34px] min-h-[38px] flex items-center justify-center rounded-lg border transition-colors ${
                      isOptGuideOpen
                        ? "border-[#0E7490] bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300"
                        : "border-[var(--border-hairline)] bg-[var(--bg-paper)]/60 text-[var(--text-muted)] hover:text-[#0E7490] hover:border-[#0E7490]/40"
                    }`}
                  >
                    <HelpCircle className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              {optGuide && isOptGuideOpen && (
                <InlineAssessmentGuide
                  id={`guide-opt-${item.id}-${opt.id}`}
                  guide={optGuide}
                  references={references}
                  onClose={() => setOpenOptionGuideId(null)}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
