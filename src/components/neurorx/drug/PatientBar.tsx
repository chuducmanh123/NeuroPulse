"use client";

import React from "react";
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
} from "lucide-react";
import type { DrugRecord } from "@/types/neurorx";
import { useNeuroRxStore } from "@/store/useNeuroRxStore";
import { resolveRenalFunction } from "@/lib/neurorx/patient";

interface PatientBarProps {
  drug: DrugRecord;
  darkMode?: boolean;
}

export function PatientBar({ drug, darkMode = false }: PatientBarProps) {
  const { patientInput, patientParsed, errors, setField, clearPatient } =
    useNeuroRxStore();

  const renalBasis = drug.renal_basis?.value || "cg_abw";
  const renalResult = resolveRenalFunction(patientParsed, renalBasis);

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
      className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
        darkMode
          ? "bg-slate-900/90 border-slate-800"
          : "bg-white border-slate-200/90 shadow-sm"
      }`}
    >
      {/* Header & Reset Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-500" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Bedside Patient Variables
          </h3>
        </div>

        {hasAnyInput && (
          <button
            type="button"
            onClick={clearPatient}
            className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors p-1"
            title="Reset all patient inputs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-3">
        {/* 1. Weight */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
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
              className={`w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-2.5 top-2 text-[11px] text-slate-400 pointer-events-none">
              kg
            </span>
          </div>
        </div>

        {/* 2. Age */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
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
              className={`w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-2.5 top-2 text-[11px] text-slate-400 pointer-events-none">
              y
            </span>
          </div>
        </div>

        {/* 3. Biological Sex */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Biological Sex
          </label>
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setField("sex", "male")}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
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
              className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
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
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
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
              className={`w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-2.5 top-2 text-[11px] text-slate-400 pointer-events-none">
              cm
            </span>
          </div>
        </div>

        {/* 5. Serum Creatinine (with Unit Toggle) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Serum Creatinine
            </label>
            <button
              type="button"
              onClick={handleScrUnitToggle}
              className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
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
              className={`w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-2 top-2 text-[10px] text-slate-400 pointer-events-none">
              {currentScrUnit === "umol/L" ? "µmol/L" : "mg/dL"}
            </span>
          </div>
        </div>

        {/* 6. CrCl Override (mL/min) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            CrCl Manual
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
              className={`w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-900"
              }`}
            />
            <span className="absolute right-2 top-2 text-[10px] text-slate-400 pointer-events-none">
              mL/min
            </span>
          </div>
        </div>

        {/* 7. Hemodialysis Toggle */}
        <div className="flex flex-col justify-between">
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
            Hemodialysis
          </label>
          <button
            type="button"
            onClick={() => setField("onHemodialysis", !patientInput.onHemodialysis)}
            className={`w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1.5 ${
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
        <div className="mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Resolved Renal Clearance:
            </span>
            <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
              {renalResult.label}
            </span>
          </div>

          {renalResult.warning && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              ⚠️ {renalResult.warning}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
