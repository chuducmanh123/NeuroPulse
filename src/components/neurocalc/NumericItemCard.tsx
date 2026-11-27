"use client";

import React, { useState } from "react";
import { AlertCircle, ArrowLeftRight, Calculator, HelpCircle } from "lucide-react";
import type {
  AssessmentGuide,
  NumericScaleItem,
  ScaleReference,
} from "@/types/neurocalc";
import { InlineAssessmentGuide } from "./AssessmentGuidePanel";

interface NumericItemCardProps {
  item: NumericScaleItem;
  rawValue: string;
  selectedUnit: string;
  errorMessage?: string;
  onChange: (itemId: string, value: string, unit: string) => void;
  itemGuide?: AssessmentGuide;
  references: ScaleReference[];
  onOpenDrawer: (guide: AssessmentGuide) => void;
  elementId?: string;
  relatedScaleName?: string;
  relatedScaleSummary?: string;
  onOpenRelatedScale?: (scaleId: string, itemId: string) => void;
}

export function NumericItemCard({
  item,
  rawValue,
  selectedUnit,
  errorMessage,
  onChange,
  itemGuide,
  references,
  onOpenDrawer,
  elementId,
  relatedScaleName,
  relatedScaleSummary,
  onOpenRelatedScale,
}: NumericItemCardProps) {
  const [openInlineGuide, setOpenInlineGuide] = useState(false);

  const currentUnitIdx = item.units.findIndex((u) => u.unit === selectedUnit);
  const unitDef =
    (currentUnitIdx >= 0 ? item.units[currentUnitIdx] : item.units[0]) ??
    item.units[0];
  const offset = unitDef?.to_canonical_offset ?? 0;
  const factor = unitDef?.to_canonical_factor ?? 1;
  const minDisplay = Math.round(((item.min_canonical - offset) / factor) * 100) / 100;
  const maxDisplay = Math.round(((item.max_canonical - offset) / factor) * 100) / 100;

  const inputId = `calc-input-${item.id}`;

  const handleCycleUnit = () => {
    if (item.units.length <= 1) return;
    const baseIdx = currentUnitIdx >= 0 ? currentUnitIdx : 0;
    const nextUnit = item.units[(baseIdx + 1) % item.units.length].unit;
    onChange(item.id, rawValue, nextUnit);
  };

  return (
    <section
      id={elementId}
      className={`px-4 py-3 sm:px-5 sm:py-3.5 transition-colors ${
        errorMessage ? "bg-rose-500/5" : ""
      }`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(240px,340px)] items-center gap-2 sm:gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.code && (
              <span className="inline-flex items-center justify-center rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono-tech text-[11px] font-bold text-[var(--text-secondary)]">
                {item.code}
              </span>
            )}
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-[var(--text-ink)] leading-snug cursor-pointer"
            >
              {item.label}
              {!item.required && (
                <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">
                  (Optional)
                </span>
              )}
            </label>

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
                  onClick={() => setOpenInlineGuide((prev) => !prev)}
                  aria-expanded={openInlineGuide}
                  aria-controls={`guide-inline-${item.id}`}
                  aria-label={`Guide for ${item.label}`}
                  className="sm:hidden inline-flex items-center justify-center rounded-full p-0.5 text-[var(--text-muted)] hover:text-[#0E7490] dark:hover:text-cyan-300 transition-colors shrink-0"
                >
                  <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          {item.subtitle && (
            <p className="mt-1 text-[11.5px] text-[var(--text-muted)] leading-snug">
              {item.subtitle}
            </p>
          )}
        </div>

        <div className="min-w-0">
          <div
            className={`flex items-stretch h-10 rounded-lg border overflow-hidden bg-[var(--bg-paper)] transition-colors ${
              errorMessage
                ? "border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/25"
                : "border-[var(--border-hairline)] focus-within:border-[#0E7490] focus-within:ring-2 focus-within:ring-[#0E7490]/20"
            }`}
          >
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              step={item.step ?? "any"}
              value={rawValue}
              onChange={(e) => onChange(item.id, e.target.value, selectedUnit)}
              placeholder={item.placeholder ?? `${minDisplay}–${maxDisplay}`}
              aria-label={item.label}
              aria-invalid={Boolean(errorMessage)}
              className="min-w-0 flex-1 bg-transparent px-3 text-sm font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)]/55 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />

            <div className="border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 flex items-stretch shrink-0">
              {item.units.length > 1 ? (
                <button
                  type="button"
                  onClick={handleCycleUnit}
                  title="Switch unit"
                  aria-label={`Switch unit for ${item.label} (current: ${unitDef?.label ?? selectedUnit})`}
                  className="px-3 flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-ink)] whitespace-nowrap transition-colors"
                >
                  <span>{unitDef?.label ?? selectedUnit}</span>
                  <ArrowLeftRight
                    className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0"
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <span className="px-3 flex items-center text-xs font-medium text-[var(--text-secondary)] whitespace-nowrap">
                  {unitDef?.label ?? selectedUnit}
                </span>
              )}
            </div>
          </div>

          {errorMessage && (
            <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{errorMessage}</span>
            </p>
          )}
        </div>
      </div>

      {itemGuide && openInlineGuide && (
        <div className="sm:hidden mt-2.5">
          <InlineAssessmentGuide
            id={`guide-inline-${item.id}`}
            guide={itemGuide}
            references={references}
            onClose={() => setOpenInlineGuide(false)}
          />
        </div>
      )}
    </section>
  );
}
