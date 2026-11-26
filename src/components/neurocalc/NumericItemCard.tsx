"use client";

import React, { useState } from "react";
import { AlertCircle, HelpCircle } from "lucide-react";
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
}: NumericItemCardProps) {
  const [openInlineGuide, setOpenInlineGuide] = useState(false);

  const unitDef =
    item.units.find((u) => u.unit === selectedUnit) ?? item.units[0];
  const offset = unitDef?.to_canonical_offset ?? 0;
  const factor = unitDef?.to_canonical_factor ?? 1;
  const minDisplay = Math.round(((item.min_canonical - offset) / factor) * 100) / 100;
  const maxDisplay = Math.round(((item.max_canonical - offset) / factor) * 100) / 100;

  return (
    <section
      id={elementId}
      className={`rounded-2xl border p-4 sm:p-5 transition-colors bg-[var(--bg-surface)] shadow-2xs ${
        errorMessage
          ? "border-rose-500/60"
          : rawValue.trim().length > 0
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
              onClick={() => setOpenInlineGuide((prev) => !prev)}
              aria-expanded={openInlineGuide}
              aria-controls={`guide-inline-${item.id}`}
              className="sm:hidden inline-flex items-center gap-1 rounded-full border border-[#0E7490]/30 bg-[#0E7490]/5 dark:bg-cyan-500/10 px-2.5 py-1 text-[11.5px] font-semibold text-[#0E7490] dark:text-cyan-300 shrink-0"
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{itemGuide.chip_label || "How to assess"}</span>
            </button>
          </>
        )}
      </div>

      {itemGuide && openInlineGuide && (
        <div className="sm:hidden mb-3">
          <InlineAssessmentGuide
            id={`guide-inline-${item.id}`}
            guide={itemGuide}
            references={references}
            onClose={() => setOpenInlineGuide(false)}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[160px]">
          <input
            type="number"
            inputMode="decimal"
            step={item.step ?? "any"}
            value={rawValue}
            onChange={(e) => onChange(item.id, e.target.value, selectedUnit)}
            placeholder={
              item.placeholder ?? `${minDisplay} – ${maxDisplay} ${selectedUnit}`
            }
            aria-label={item.label}
            aria-invalid={Boolean(errorMessage)}
            className={`w-full min-h-[44px] rounded-xl border bg-[var(--bg-paper)] px-3.5 py-2 font-mono-tech text-sm font-semibold text-[var(--text-ink)] placeholder:font-normal placeholder:text-[var(--text-muted)]/70 focus:outline-none focus:ring-2 ${
              errorMessage
                ? "border-rose-500 focus:ring-rose-500/30"
                : "border-[var(--border-hairline)] focus:border-[#0E7490] focus:ring-[#0E7490]/25"
            }`}
          />
        </div>

        {item.units.length > 1 ? (
          <div
            className="inline-flex rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-0.5"
            role="group"
            aria-label={`Units for ${item.label}`}
          >
            {item.units.map((u) => {
              const active = u.unit === selectedUnit;
              return (
                <button
                  key={u.unit}
                  type="button"
                  onClick={() => onChange(item.id, rawValue, u.unit)}
                  className={`min-h-[38px] px-3 py-1 rounded-lg font-mono-tech text-xs font-semibold transition-colors ${
                    active
                      ? "bg-[var(--bg-surface)] text-[#0E7490] dark:text-cyan-300 shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                  }`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="px-2.5 py-2 font-mono-tech text-xs font-semibold text-[var(--text-muted)]">
            {selectedUnit}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11.5px]">
        {errorMessage ? (
          <p className="flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : (
          <p className="text-[var(--text-muted)] font-mono-tech">
            Valid range: {minDisplay} – {maxDisplay} {selectedUnit}
          </p>
        )}
      </div>
    </section>
  );
}
