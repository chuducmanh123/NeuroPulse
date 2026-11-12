"use client";

import React, { useState } from "react";
import {
  Zap,
  Pill,
  CheckCircle2,
  Syringe,
  FileText,
} from "lucide-react";
import type { DrugRecord, Regimen } from "@/types/neurorx";
import type { PatientParsed, RenalResolutionResult } from "@/lib/neurorx/patient";
import { resolveRegimen } from "@/lib/neurorx/dosing";

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
      <div
        className={`p-6 rounded-2xl border ${
          darkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"
        } text-center text-slate-500 dark:text-slate-400 text-sm font-medium`}
      >
        No dosing regimen available for this drug.
      </div>
    );
  }

  // 1. Resolve clinical dosage
  const resolution = resolveRegimen(drug, activeRegimen, patient, renal);

  return (
    <div
      className={`rounded-2xl border border-l-4 border-l-emerald-500 flex flex-col justify-between transition-all ${
        darkMode
          ? "bg-slate-900/90 border-emerald-900/40 shadow-sm"
          : "bg-white border-emerald-200/80 shadow-sm"
      }`}
    >
      <div>
        {/* Card Header */}
        <div
          className={`p-3.5 sm:p-5 border-b rounded-t-2xl ${
            isAcute
              ? darkMode
                ? "bg-rose-950/20 border-rose-900/40"
                : "bg-rose-50/70 border-rose-100"
              : isMaintenance
              ? darkMode
                ? "bg-sky-950/20 border-sky-900/40"
                : "bg-sky-50/70 border-sky-100"
              : darkMode
              ? "bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 border-emerald-900/40"
              : "bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-white border-emerald-200/80"
          }`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-base font-extrabold uppercase tracking-wide ${
                isAcute
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  : isMaintenance
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
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
            <span className="px-3 py-1 rounded-md text-xs sm:text-sm font-extrabold bg-slate-200/90 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
              {activeRegimen.route}
            </span>
          </div>

          {/* Indication selector if multiple regimens exist */}
          {regimens.length > 1 ? (
            <div className="mt-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Clinical Indication:
              </label>
              <select
                value={activeIndex}
                onChange={(e) => handleSelectIndex(parseInt(e.target.value, 10))}
                className={`w-full text-sm sm:text-base font-bold p-2.5 sm:p-3 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500/25 truncate ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-white"
                    : "bg-white border-slate-300 text-slate-900"
                }`}
              >
                {regimens.map((reg, idx) => (
                  <option key={reg.id} value={idx}>
                    {reg.indication}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-3">
              <span className="block text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0.5">
                Clinical Indication
              </span>
              <h4 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white break-words">
                {activeRegimen.indication}
              </h4>
            </div>
          )}
        </div>

        {/* Card Body: Clinical Administration & Specific Guidance */}
        <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
          {/* Specific Clinical Administration & Instructions */}
          {(activeRegimen.dose_text || resolution.ruleText) && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Clinical Administration &amp; Dosing Instructions:
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-wrap break-words">
                {activeRegimen.dose_text || resolution.ruleText}
              </p>
            </div>
          )}

          {/* IV Infusion Protocol / Preparation */}
          {drug.tools?.iv_infusion?.value && (activeRegimen.route === "IV" || !activeRegimen.route) && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-sky-500/10 border-2 border-sky-500/25 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-sky-950 dark:text-sky-200 uppercase tracking-wider">
                <Syringe className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="break-words">IV Preparation &amp; Administration Protocol:</span>
              </div>
              {drug.tools.iv_infusion.value.instructions && (
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal break-words">
                  {drug.tools.iv_infusion.value.instructions}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {drug.tools.iv_infusion.value.diluent && (
                  <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 shadow-2xs space-y-1">
                    <strong className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300 block">
                      Reconstitution / Diluent:
                    </strong>
                    <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed block">
                      {drug.tools.iv_infusion.value.diluent}
                    </span>
                  </div>
                )}
                {drug.tools.iv_infusion.value.rate && (
                  <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800 shadow-2xs space-y-1">
                    <strong className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-sky-900 dark:text-sky-300 block">
                      Infusion Rate:
                    </strong>
                    <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed block">
                      {drug.tools.iv_infusion.value.rate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enteral / NG Tube Guidance */}
          {drug.ng_tube?.value?.instructions && (activeRegimen.route === "NG" || activeRegimen.route === "PO") && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/25 space-y-2">
              <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-amber-950 dark:text-amber-200 block">
                Enteral / NG Tube Administration:
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-normal leading-relaxed break-words">
                {drug.ng_tube.value.instructions}
              </p>
            </div>
          )}

          {/* Hemodialysis guidance box if active */}
          {patient.onHemodialysis && resolution.hemodialysisNote && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/25 space-y-2">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-rose-950 dark:text-rose-200 block">
                Hemodialysis Guidance:
              </span>
              <p className="text-xs sm:text-sm text-rose-900 dark:text-rose-200 font-normal leading-relaxed break-words">
                {resolution.hemodialysisNote}
              </p>
            </div>
          )}

          {/* Matched Renal Clearance Band Notice */}
          {resolution.renalBandMatched && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-sky-50 dark:bg-sky-950/70 border-2 border-sky-400 dark:border-sky-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sky-950 dark:text-sky-100 shadow-xs">
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0 break-words text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-sky-900 dark:text-sky-200">
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
              <span className="px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-extrabold bg-sky-600 text-white uppercase tracking-wider shrink-0 self-start sm:self-auto">
                Active Band
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
