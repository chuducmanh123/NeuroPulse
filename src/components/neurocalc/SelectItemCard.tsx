"use client";

import React, { useState } from "react";
import { Check, HelpCircle } from "lucide-react";
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
  itemGuide?: AssessmentGuide;
  optionGuidesByOptionId: ReadonlyMap<string, AssessmentGuide>;
  references: ScaleReference[];
  onOpenDrawer: (guide: AssessmentGuide) => void;
  elementId?: string;
}

export function SelectItemCard({
  item,
  selectedOptionId,
  onSelect,
  onClear,
  itemGuide,
  optionGuidesByOptionId,
  references,
  onOpenDrawer,
  elementId,
}: SelectItemCardProps) {
  const [openInlineItemGuide, setOpenInlineItemGuide] = useState(false);
  const [openOptionGuideId, setOpenOptionGuideId] = useState<string | null>(null);

  const isAnswered = Boolean(selectedOptionId);

  return (
    <section
      id={elementId}
      className={`rounded-2xl border p-4 sm:p-5 transition-colors bg-[var(--bg-surface)] shadow-2xs ${
        isAnswered
          ? "border-[#0E7490]/35 dark:border-cyan-500/35"
          : "border-[var(--border-hairline)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {item.code && (
              <span className="inline-flex items-center justify-center rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 font-mono-tech text-[11px] font-bold text-[var(--text-secondary)]">
                {item.code}
              </span>
            )}
            <h3 className="text-sm sm:text-[15px] font-bold text-[var(--text-ink)] leading-snug">
              {item.label}
              {!item.required && (
                <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">
                  (Optional)
                </span>
              )}
            </h3>
          </div>
          {item.subtitle && (
            <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
              {item.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!item.required && isAnswered && onClear && (
            <button
              type="button"
              onClick={() => onClear(item.id)}
              className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Clear
            </button>
          )}
          {itemGuide && (
          <>
            <button
              type="button"
              onClick={() => onOpenDrawer(itemGuide)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#0E7490]/30 bg-[#0E7490]/5 dark:bg-cyan-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/15 transition-colors shrink-0"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{itemGuide.chip_label || "How to assess"}</span>
            </button>
            <button
              type="button"
              onClick={() => setOpenInlineItemGuide((prev) => !prev)}
              aria-expanded={openInlineItemGuide}
              aria-controls={`guide-inline-${item.id}`}
              className="sm:hidden inline-flex items-center gap-1 rounded-full border border-[#0E7490]/30 bg-[#0E7490]/5 dark:bg-cyan-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-[#0E7490] dark:text-cyan-300 shrink-0"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{itemGuide.chip_label || "How to assess"}</span>
            </button>
          </>
        )}
        </div>
      </div>

      {itemGuide && openInlineItemGuide && (
        <div className="sm:hidden mb-3">
          <InlineAssessmentGuide
            id={`guide-inline-${item.id}`}
            guide={itemGuide}
            references={references}
            onClose={() => setOpenInlineItemGuide(false)}
          />
        </div>
      )}

      <div className="space-y-2" role="radiogroup" aria-label={item.label}>
        {item.options.map((opt) => {
          const isSelected = selectedOptionId === opt.id;
          const optGuide = optionGuidesByOptionId.get(opt.id);
          const isOptGuideOpen = openOptionGuideId === opt.id;
          const pointDisplay = opt.badge
            ? opt.badge
            : opt.is_untestable
              ? "UN"
              : opt.points !== null
                ? opt.points > 0
                  ? `+${opt.points}`
                  : String(opt.points)
                : "";

          return (
            <div key={opt.id}>
              <div className="flex items-stretch gap-1.5">
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelect(item.id, opt.id)}
                  className={`flex-1 min-h-[44px] flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
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
                      <span className="block text-[13.5px] font-medium leading-snug">
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="mt-0.5 block text-[11.5px] text-[var(--text-muted)] leading-snug">
                          {opt.description}
                        </span>
                      )}
                    </div>
                  </div>

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
                    className={`min-w-[36px] min-h-[44px] flex items-center justify-center rounded-xl border transition-colors ${
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
