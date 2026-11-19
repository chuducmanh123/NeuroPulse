"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Zap,
  Pill,
  CheckCircle2,
  Syringe,
  FileText,
  ChevronDown,
  Check,
} from "lucide-react";
import type { DrugRecord, Regimen } from "@/types/neurorx";
import type { PatientParsed, RenalResolutionResult } from "@/lib/neurorx/patient";
import { resolveRegimen } from "@/lib/neurorx/dosing";

export interface IndicationDropdownProps {
  regimens: Regimen[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  darkMode?: boolean;
  variant?: "card" | "compact";
  ariaLabel?: string;
}

/**
 * Accessible custom clinical indication selector replacing native mobile `<select>`
 * to avoid oversized OS pickers on narrow viewports.
 */
export function IndicationDropdown({
  regimens,
  selectedIndex,
  onSelectIndex,
  darkMode = false,
  variant = "card",
  ariaLabel = "Clinical Indication",
}: IndicationDropdownProps) {
  const [isIndicationOpen, setIsIndicationOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeIndex =
    selectedIndex >= 0 && selectedIndex < regimens.length ? selectedIndex : 0;
  const activeRegimen = regimens[activeIndex] || regimens[0];

  useEffect(() => {
    if (!isIndicationOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsIndicationOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsIndicationOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isIndicationOpen]);

  if (!activeRegimen) return null;

  const isCompact = variant === "compact";

  return (
    <div
      ref={dropdownRef}
      className={
        isCompact
          ? "relative w-full sm:w-auto sm:min-w-[240px] sm:max-w-[320px]"
          : "mt-3 relative"
      }
    >
      {!isCompact && (
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Clinical Indication:
          </label>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#2F855A]/10 text-[#2F855A] dark:text-emerald-300 border border-[#2F855A]/20">
            {activeIndex + 1} / {regimens.length} regimens
          </span>
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isIndicationOpen}
        onClick={() => setIsIndicationOpen((prev) => !prev)}
        className={
          isCompact
            ? "w-full text-left py-2 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] hover:border-[#2F855A] text-xs font-semibold transition-all flex items-center justify-between gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2F855A]/25"
            : "w-full text-left p-2.5 sm:p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] hover:border-[#2F855A] shadow-2xs transition-all flex items-start justify-between gap-2.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2F855A]/25"
        }
      >
        {isCompact ? (
          <span className="truncate min-w-0 flex-1">
            {activeRegimen.indication}
            {activeRegimen.route ? ` (${activeRegimen.route})` : ""}
          </span>
        ) : (
          <span className="text-xs sm:text-sm font-bold leading-snug line-clamp-2 min-w-0 flex-1">
            {activeRegimen.indication}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
            isCompact ? "" : "mt-0.5"
          } ${isIndicationOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isIndicationOpen && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-30 mt-1.5 max-h-64 overflow-y-auto custom-scrollbar rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] divide-y divide-[var(--border-hairline)] shadow-xl ${
            isCompact
              ? "left-0 right-0 sm:left-auto sm:min-w-[320px]"
              : "left-0 right-0"
          }`}
        >
          {regimens.map((reg, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={reg.id || idx}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectIndex(idx);
                  setIsIndicationOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 flex items-start justify-between gap-2.5 text-xs leading-snug transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#2F855A]/10 text-[#2F855A] dark:text-emerald-300 font-bold"
                    : "text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] font-medium"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="break-words">{reg.indication}</div>
                  {reg.route && (
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${
                        isSelected
                          ? "bg-[#2F855A]/15 text-[#2F855A] dark:text-emerald-300"
                          : "bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                      }`}
                    >
                      {reg.route}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-[#2F855A] dark:text-emerald-400 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DoseCardProps {
  drug: DrugRecord;
  regimens: Regimen[];
  setting?: "acute_inpatient" | "maintenance_outpatient" | "unified";
  patient: PatientParsed;
  renal: RenalResolutionResult;
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
  darkMode?: boolean;
}

export function DoseCard({
  drug,
  regimens,
  setting = "unified",
  patient,
  renal,
  selectedIndex,
  onSelectIndex,
  darkMode = false,
}: DoseCardProps) {
  // If multiple regimens for this setting, allow user to toggle between indications
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = selectedIndex !== undefined ? selectedIndex : internalIndex;
  const handleSelectIndex = (idx: number) => {
    if (onSelectIndex) {
      onSelectIndex(idx);
    } else {
      setInternalIndex(idx);
    }
  };

  const isAcute = setting === "acute_inpatient";
  const isMaintenance = setting === "maintenance_outpatient";
  const activeRegimen = regimens[activeIndex] || regimens[0];

  if (!activeRegimen) {
    return (
      <div className="p-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-center text-[var(--text-muted)] text-sm font-medium">
        No dosing regimen available for this drug.
      </div>
    );
  }

  // 1. Resolve clinical dosage
  const resolution = resolveRegimen(drug, activeRegimen, patient, renal);

  return (
    <div className="rounded-2xl border border-[var(--border-hairline)] border-l-4 border-l-[#2F855A] bg-[var(--bg-surface)] shadow-xs flex flex-col justify-between transition-all">
      <div>
        {/* Card Header */}
        <div
          className={`p-3.5 sm:p-5 border-b rounded-t-2xl ${
            isAcute
              ? "bg-rose-50/70 border-rose-200/80 dark:bg-rose-950/20 dark:border-rose-900/40"
              : isMaintenance
              ? "bg-sky-50/70 border-sky-200/80 dark:bg-sky-950/20 dark:border-sky-900/40"
              : "bg-emerald-50/75 border-emerald-200/80 dark:bg-emerald-950/25 dark:border-emerald-900/40"
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-base font-extrabold uppercase tracking-wide ${
                isAcute
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  : isMaintenance
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                  : "bg-[#2F855A]/15 text-[#2F855A] dark:text-emerald-300 border border-[#2F855A]/30"
              }`}
            >
              {isAcute ? (
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              ) : (
                <Pill className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              )}
              <span className="truncate">
                {isAcute
                  ? "Acute / Inpatient"
                  : isMaintenance
                  ? "Maintenance / Outpatient"
                  : "Clinical Dosing Regimen"}
              </span>
            </span>

            {/* Route Badge */}
            <span className="px-3 py-1 rounded-md text-xs sm:text-sm font-extrabold bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-ink)] shrink-0">
              {activeRegimen.route}
            </span>
          </div>

          {/* Indication selector if multiple regimens exist */}
          {regimens.length > 1 ? (
            <IndicationDropdown
              regimens={regimens}
              selectedIndex={activeIndex}
              onSelectIndex={handleSelectIndex}
              darkMode={darkMode}
              variant="card"
            />
          ) : (
            <div className="mt-3">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-0.5">
                Clinical Indication
              </span>
              <h4 className="text-base sm:text-lg font-bold text-[var(--text-ink)] break-words">
                {activeRegimen.indication}
              </h4>
            </div>
          )}
        </div>

        {/* Card Body: Clinical Administration & Specific Guidance */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Specific Clinical Administration & Instructions */}
          {(activeRegimen.dose_text || resolution.ruleText) && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2F855A] dark:text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Clinical Administration &amp; Dosing Instructions:
                </span>
              </div>
              <p className="text-sm text-[var(--text-ink)] leading-relaxed font-normal whitespace-pre-wrap break-words">
                {activeRegimen.dose_text || resolution.ruleText}
              </p>
            </div>
          )}

          {/* IV Infusion Protocol / Preparation */}
          {drug.tools?.iv_infusion?.value && (activeRegimen.route === "IV" || !activeRegimen.route) && (
            <div className="pt-4 border-t border-[var(--border-hairline)] space-y-2.5">
              <div className="flex items-center gap-2 font-semibold text-xs text-sky-900 dark:text-sky-300 uppercase tracking-wider">
                <Syringe className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="break-words">IV Preparation &amp; Administration Protocol:</span>
              </div>
              {drug.tools.iv_infusion.value.instructions && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-normal break-words">
                  {drug.tools.iv_infusion.value.instructions}
                </p>
              )}
              {(drug.tools.iv_infusion.value.diluent || drug.tools.iv_infusion.value.rate) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {drug.tools.iv_infusion.value.diluent && (
                    <div className="space-y-1 p-3 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-hairline)]">
                      <strong className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                        Reconstitution / Diluent:
                      </strong>
                      <span className="text-sm font-normal text-[var(--text-ink)] leading-relaxed block">
                        {drug.tools.iv_infusion.value.diluent}
                      </span>
                    </div>
                  )}
                  {drug.tools.iv_infusion.value.rate && (
                    <div className="space-y-1 p-3 rounded-xl bg-[var(--bg-subtle)]/60 border border-[var(--border-hairline)]">
                      <strong className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                        Infusion Rate:
                      </strong>
                      <span className="text-sm font-normal text-[var(--text-ink)] leading-relaxed block">
                        {drug.tools.iv_infusion.value.rate}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Enteral / NG Tube Guidance */}
          {drug.ng_tube?.value?.instructions && (activeRegimen.route === "NG" || activeRegimen.route === "PO") && (
            <div className="pt-4 border-t border-[var(--border-hairline)] space-y-1.5">
              <span className="text-xs font-semibold tracking-wider uppercase text-amber-800 dark:text-amber-300 block">
                Enteral / NG Tube Administration:
              </span>
              <p className="text-sm text-[var(--text-secondary)] font-normal leading-relaxed break-words">
                {drug.ng_tube.value.instructions}
              </p>
            </div>
          )}

          {/* Hemodialysis guidance box if active */}
          {patient.onHemodialysis && resolution.hemodialysisNote && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/25 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-950 dark:text-rose-200 block">
                Hemodialysis Guidance:
              </span>
              <p className="text-sm text-rose-900 dark:text-rose-200 font-normal leading-relaxed break-words">
                {resolution.hemodialysisNote}
              </p>
            </div>
          )}

          {/* Matched Renal Clearance Band Notice */}
          {resolution.renalBandMatched && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-sky-50 dark:bg-sky-950/70 border-2 border-sky-400 dark:border-sky-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sky-950 dark:text-sky-100 shadow-xs">
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0 break-words text-sm leading-relaxed">
                  <span className="font-semibold text-sky-900 dark:text-sky-200">
                    Adjusted for Renal Function ({resolution.renalBandMatched.min === null
                      ? `< ${resolution.renalBandMatched.max}`
                      : resolution.renalBandMatched.max === null
                      ? `> ${resolution.renalBandMatched.min}`
                      : `${resolution.renalBandMatched.min} – ${resolution.renalBandMatched.max}`}{" "}
                    mL/min):
                  </span>{" "}
                  <span className="font-normal text-slate-700 dark:text-slate-300">{resolution.renalBandMatched.dose_text}</span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-600 text-white uppercase tracking-wider shrink-0 self-start sm:self-auto">
                Active Band
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
