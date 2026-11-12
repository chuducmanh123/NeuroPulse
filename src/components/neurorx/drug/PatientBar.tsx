"use client";

import React, { useMemo } from "react";
import {
  RotateCcw,
  Activity,
  AlertTriangle,
  Scale,
  Calendar,
  User,
  Ruler,
  Droplet,
  Sliders,
  Calculator,
  Package,
  Syringe,
  Info,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import type { DrugRecord, Regimen } from "@/types/neurorx";
import { useNeuroRxStore } from "@/store/useNeuroRxStore";
import { resolveRenalFunction } from "@/lib/neurorx/patient";
import { resolveRegimen } from "@/lib/neurorx/dosing";
import { toProductUnits } from "@/lib/neurorx/formulation";
import { computeInfusion } from "@/lib/neurorx/infusion";

interface PatientBarProps {
  drug: DrugRecord;
  regimens?: Regimen[];
  selectedRegimenIndex?: number;
  onSelectRegimenIndex?: (index: number) => void;
  darkMode?: boolean;
}

export function PatientBar({
  drug,
  regimens = drug.regimens || [],
  selectedRegimenIndex = 0,
  onSelectRegimenIndex,
  darkMode = false,
}: PatientBarProps) {
  const { patientInput, patientParsed, errors, setField, clearPatient } =
    useNeuroRxStore();

  const renalBasis = drug.renal_basis?.value || "cg_abw";
  const renalResult = resolveRenalFunction(patientParsed, renalBasis);

  const activeRegimen = regimens[selectedRegimenIndex] || regimens[0];

  const resolution = useMemo(() => {
    if (!activeRegimen) {
      return {
        state: "needs_input" as const,
        ruleText: "No active regimen configured",
        explanation: [],
      };
    }
    return resolveRegimen(drug, activeRegimen, patientParsed, renalResult);
  }, [drug, activeRegimen, patientParsed, renalResult]);

  // Product units
  const productUnits =
    resolution.state === "computed" && resolution.amount
      ? toProductUnits(resolution.amount, drug.vn_products?.value)
      : [];
  const productUnitText =
    productUnits.length > 0 ? productUnits[0].displayText : undefined;

  // Infusion
  const infusionCalc =
    resolution.state === "computed" &&
    resolution.amount &&
    activeRegimen.dose?.infusion
      ? computeInfusion(
          resolution.amount,
          resolution.unit || "mg",
          activeRegimen.dose.infusion
        )
      : null;

  // SCr unit toggle
  const currentScrUnit = patientInput.scr?.unit || "umol/L";

  const handleScrValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setField("scr", undefined);
      return;
    }
    const val = parseFloat(raw);
    if (!isNaN(val)) {
      setField("scr", { value: val, unit: currentScrUnit });
    }
  };

  const handleScrUnitToggle = () => {
    const nextUnit: "umol/L" | "mg/dL" =
      currentScrUnit === "umol/L" ? "mg/dL" : "umol/L";
    if (patientInput.scr) {
      setField("scr", { value: patientInput.scr.value, unit: nextUnit });
    } else {
      setField("scr", undefined);
    }
  };

  const hasAnyInput =
    patientInput.weightKg !== undefined ||
    patientInput.ageYears !== undefined ||
    patientInput.sex !== undefined ||
    patientInput.heightCm !== undefined ||
    patientInput.scr !== undefined ||
    patientInput.crclManual !== undefined ||
    patientInput.onHemodialysis;

  return (
    <div
      className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-l-4 border-l-cyan-500 transition-colors ${
        darkMode
          ? "bg-gradient-to-b from-cyan-950/20 via-slate-900 to-slate-900 border-cyan-900/40"
          : "bg-gradient-to-b from-cyan-50/30 via-white to-white border-cyan-200/80 shadow-sm"
      }`}
    >
      {/* Header & Reset Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <Activity className="w-5 h-5 text-cyan-500 shrink-0" />
          <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100 truncate">
            Bedside Patient Variables
          </h3>
        </div>

        {hasAnyInput && (
          <button
            type="button"
            onClick={clearPatient}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-500 hover:text-rose-600 transition-colors p-1 shrink-0"
            title="Reset all patient inputs"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-3">
        {/* 1. Weight */}
        <div>
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 truncate">
            Weight (kg)
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="2"
              max="300"
              placeholder="e.g. 60"
              value={patientInput.weightKg ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setField("weightKg", isNaN(val) ? undefined : val);
              }}
              className={`w-full pl-3 pr-8 py-2 text-sm sm:text-base font-bold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
              kg
            </span>
          </div>
        </div>

        {/* 2. Age */}
        <div>
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 truncate">
            Age (years)
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              max="120"
              placeholder="e.g. 65"
              value={patientInput.ageYears ?? ""}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setField("ageYears", isNaN(val) ? undefined : val);
              }}
              className={`w-full pl-3 pr-8 py-2 text-sm sm:text-base font-bold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
              y
            </span>
          </div>
        </div>

        {/* 3. Biological Sex */}
        <div>
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 truncate">
            Biological Sex
          </label>
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setField("sex", "male")}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                patientInput.sex === "male"
                  ? "bg-sky-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Male
            </button>
            <button
              type="button"
              onClick={() => setField("sex", "female")}
              className={`py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                patientInput.sex === "female"
                  ? "bg-sky-500 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Female
            </button>
          </div>
        </div>

        {/* 4. Height (cm) */}
        <div>
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 truncate">
            Height (cm)
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="50"
              max="250"
              placeholder="e.g. 165"
              value={patientInput.heightCm ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setField("heightCm", isNaN(val) ? undefined : val);
              }}
              className={`w-full pl-3 pr-8 py-2 text-sm sm:text-base font-bold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
              cm
            </span>
          </div>
        </div>

        {/* 5. Serum Creatinine (with Unit Toggle) */}
        <div>
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
              <span className="hidden sm:inline">Serum Creatinine</span>
              <span className="sm:hidden">Serum Cr</span>
            </label>
            <button
              type="button"
              onClick={handleScrUnitToggle}
              className="text-xs font-extrabold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
              title="Toggle unit between µmol/L and mg/dL"
            >
              [{currentScrUnit === "umol/L" ? "µmol/L" : "mg/dL"}]
            </button>
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0.1"
              placeholder={currentScrUnit === "umol/L" ? "e.g. 110" : "e.g. 1.2"}
              value={patientInput.scr?.value ?? ""}
              onChange={handleScrValueChange}
              className={`w-full pl-3 pr-14 py-2 text-sm sm:text-base font-bold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-2.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
              {currentScrUnit === "umol/L" ? "µmol/L" : "mg/dL"}
            </span>
          </div>
        </div>

        {/* 6. CrCl Override (mL/min) */}
        <div>
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 truncate">
            <span className="hidden sm:inline">CrCl Manual</span>
            <span className="sm:hidden">CrCl Override</span>
          </label>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="1"
              max="300"
              placeholder="Override"
              value={patientInput.crclManual ?? ""}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setField("crclManual", isNaN(val) ? undefined : val);
              }}
              className={`w-full pl-3 pr-14 py-2 text-sm sm:text-base font-bold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-2.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
              mL/min
            </span>
          </div>
        </div>

        {/* 7. Hemodialysis Toggle */}
        <div className="col-span-2 sm:col-span-3 md:col-span-1 lg:col-span-1 flex flex-col justify-between">
          <label className="block text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 truncate">
            Hemodialysis
          </label>
          <button
            type="button"
            onClick={() => setField("onHemodialysis", !patientInput.onHemodialysis)}
            className={`w-full py-2 px-3 rounded-xl border text-xs sm:text-sm font-extrabold transition-all min-h-[38px] flex items-center justify-center gap-1.5 ${
              patientInput.onHemodialysis
                ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                : darkMode
                ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                : "bg-slate-50 border-slate-300 text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>{patientInput.onHemodialysis ? "ON DIALYSIS" : "No"}</span>
          </button>
        </div>
      </div>

      {/* Validation Errors banner */}
      {errors.length > 0 && (
        <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errors.join(" • ")}</span>
        </div>
      )}

      {/* Pediatric Warning Banner (age < 18) */}
      {patientParsed.isPediatric && (
        <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>Adult dosing only:</strong> NeuroRx v1 does not compute pediatric dosages (age &lt; 18). Refer to institutional pediatric formularies.
          </span>
        </div>
      )}

      {/* Derived Renal Function Callout - Tự động hiển thị khi đã nhập đủ thông tin */}
      {renalResult.value !== null && (
        <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Resolved Renal Clearance:
            </span>
            <span className="font-extrabold text-cyan-600 dark:text-cyan-400 text-sm sm:text-base">
              {renalResult.label}
            </span>
          </div>

          {renalResult.warning && (
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              ⚠️ {renalResult.warning}
            </span>
          )}
        </div>
      )}

      {/* 8. COMPUTED DOSAGE SECTION */}
      <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-slate-200/80 dark:border-slate-800 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <h4 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100 truncate">
              Computed Dosage (Bedside Calculation)
            </h4>
          </div>

          {/* Indication selector if multiple regimens exist */}
          {regimens.length > 1 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 whitespace-nowrap shrink-0">
                Indication:
              </span>
              <select
                value={selectedRegimenIndex}
                onChange={(e) => onSelectRegimenIndex?.(parseInt(e.target.value, 10))}
                className={`text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 w-full sm:max-w-[300px] truncate ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-white"
                    : "bg-slate-50 border-slate-300 text-slate-900"
                }`}
              >
                {regimens.map((reg, idx) => (
                  <option key={reg.id || idx} value={idx}>
                    {reg.indication} ({reg.route})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* State 1: Computed */}
        {resolution.state === "computed" && (
          <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/25 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Computed Dosage:
              </span>
              {activeRegimen && (
                <span className="text-xs sm:text-sm font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 break-words max-w-full">
                  {activeRegimen.route} • {activeRegimen.indication}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-2xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 break-words tracking-tight">
                {resolution.amount} {resolution.unit}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-200">
                {resolution.frequency}
              </span>

              {resolution.capped && (
                <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  Capped at max
                </span>
              )}

              {patientParsed.weightKg && (
                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold sm:ml-auto">
                  Based on: {patientParsed.weightKg} kg
                </span>
              )}
            </div>

            {resolution.cappedReason && (
              <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-semibold break-words">
                ⚠️ {resolution.cappedReason}
              </p>
            )}

            {/* Renal adjustment notification if active */}
            {resolution.renalBandMatched && (
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs sm:text-sm font-medium text-cyan-900 dark:text-cyan-200 flex items-start sm:items-center gap-2 break-words">
                <Info className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Renal adjusted dose applied for CrCl {resolution.renalBandMatched.min ?? 0}-{resolution.renalBandMatched.max ?? "∞"} mL/min: {resolution.renalBandMatched.dose_text}
                </span>
              </div>
            )}

            {/* Formulation Product Units Line */}
            {productUnitText && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/70 dark:bg-slate-800/80 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 break-words">
                <Package className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Formulation: {productUnitText}</span>
              </div>
            )}

            {/* Infusion Line */}
            {infusionCalc && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs sm:text-sm font-bold text-blue-800 dark:text-blue-200 break-words">
                <Syringe className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  IV Infusion: {infusionCalc.volumeMl} mL @ {infusionCalc.rateMlPerHour} mL/h over {infusionCalc.durationMin} min
                </span>
              </div>
            )}
          </div>
        )}

        {/* State 2: Needs Input */}
        {resolution.state === "needs_input" && (
          <div className="p-4 sm:p-5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 block">
              Dosage Formula:
            </span>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 break-words">
              {resolution.ruleText}
            </p>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-sky-700 dark:text-sky-300 pt-1">
              <Info className="w-4 h-4 shrink-0" />
              <span>Enter patient weight in the field above to calculate exact bedside dose.</span>
            </div>
          </div>
        )}

        {/* State 3: Text Only */}
        {resolution.state === "text_only" && (
          <div className="p-4 sm:p-5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-300 block">
              Prescribing Guidance:
            </span>
            <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed break-words">
              {resolution.ruleText}
            </p>
          </div>
        )}

        {/* State 4: Blocked Draft */}
        {resolution.state === "blocked_draft" && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm font-semibold flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
            <span>Bedside dosage calculation is blocked until this draft drug record is verified.</span>
          </div>
        )}
      </div>
    </div>
  );
}
