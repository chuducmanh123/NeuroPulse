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
        } text-center text-slate-400 text-xs`}
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
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                isAcute
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  : isMaintenance
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {isAcute ? (
                <Zap className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Pill className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">
                {isAcute
                  ? "⚡ Acute / Inpatient"
                  : isMaintenance
                  ? "💊 Maintenance / Outpatient"
                  : "💊 Clinical Dosing Regimen"}
              </span>
            </span>

            {/* Route Badge */}
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
              {activeRegimen.route}
            </span>
          </div>

          {/* Indication selector if multiple regimens exist */}
          {regimens.length > 1 ? (
            <div className="mt-2.5 sm:mt-3">
              <label className="block text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Clinical Indication:
              </label>
              <select
                value={activeIndex}
                onChange={(e) => handleSelectIndex(parseInt(e.target.value, 10))}
                className={`w-full text-xs font-semibold p-2 sm:p-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500/20 truncate ${
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
            <h4 className="mt-2 text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words">
              {activeRegimen.indication}
            </h4>
          )}
        </div>

        {/* Card Body: Clinical Administration & Specific Guidance */}
        <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4">
          {/* Specific Clinical Administration & Instructions */}
          {(activeRegimen.dose_text || resolution.ruleText) && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Clinical Administration &amp; Dosing Instructions:
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap break-words">
                {activeRegimen.dose_text || resolution.ruleText}
              </p>
            </div>
          )}

          {/* IV Infusion Protocol / Preparation */}
          {drug.tools?.iv_infusion?.value && (activeRegimen.route === "IV" || !activeRegimen.route) && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-sky-800 dark:text-sky-300">
                <Syringe className="w-4 h-4 text-sky-500 shrink-0" />
                <span className="break-words">IV Preparation &amp; Administration Protocol:</span>
              </div>
              {drug.tools.iv_infusion.value.instructions && (
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium break-words">
                  {drug.tools.iv_infusion.value.instructions}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                {drug.tools.iv_infusion.value.diluent && (
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-sky-200/60 dark:border-sky-800/60 break-words">
                    <strong className="text-sky-700 dark:text-sky-400 block mb-0.5">Reconstitution / Diluent:</strong>
                    <span className="text-slate-600 dark:text-slate-400">{drug.tools.iv_infusion.value.diluent}</span>
                  </div>
                )}
                {drug.tools.iv_infusion.value.rate && (
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-sky-200/60 dark:border-sky-800/60 break-words">
                    <strong className="text-sky-700 dark:text-sky-400 block mb-0.5">Infusion Rate:</strong>
                    <span className="text-slate-600 dark:text-slate-400">{drug.tools.iv_infusion.value.rate}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enteral / NG Tube Guidance */}
          {drug.ng_tube?.value?.instructions && (activeRegimen.route === "NG" || activeRegimen.route === "PO") && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
              <span className="font-bold text-amber-800 dark:text-amber-300 block">
                Enteral / NG Tube Administration:
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-medium break-words">
                {drug.ng_tube.value.instructions}
              </p>
            </div>
          )}

          {/* Hemodialysis guidance box if active */}
          {patient.onHemodialysis && resolution.hemodialysisNote && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                Hemodialysis Guidance:
              </span>
              <p className="text-xs text-rose-800 dark:text-rose-300 font-medium break-words">
                {resolution.hemodialysisNote}
              </p>
            </div>
          )}

          {/* Matched Renal Clearance Band Notice */}
          {resolution.renalBandMatched && (
            <div className="p-3 sm:p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/70 border border-sky-400 dark:border-sky-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sky-900 dark:text-sky-200 shadow-xs">
              <div className="flex items-start sm:items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0 break-words">
                  <span className="font-bold">
                    Adjusted for Renal Function ({resolution.renalBandMatched.min === null
                      ? `< ${resolution.renalBandMatched.max}`
                      : resolution.renalBandMatched.max === null
                      ? `> ${resolution.renalBandMatched.min}`
                      : `${resolution.renalBandMatched.min} – ${resolution.renalBandMatched.max}`}{" "}
                    mL/min):
                  </span>{" "}
                  <span>{resolution.renalBandMatched.dose_text}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-white uppercase tracking-wider shrink-0 self-start sm:self-auto">
                Active Band
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
