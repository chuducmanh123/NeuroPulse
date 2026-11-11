"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Calculator,
  Plus,
  Trash2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import type { Source } from "@/types/neurorx";
import {
  totalLEDD,
  resolveNpoConversions,
  type LeddFactor,
  type NpoConversion,
  type RegimenItemInput,
} from "@/lib/neurorx/ledd";
import { SourcePopover } from "../drug/SourcePopover";
import defaultLeddFactorsData from "../../../../data/neurorx/ledd-factors.json";

interface LeddModalProps {
  sources?: Source[];
  initialDrugId?: string;
  factorsData?: {
    factors: LeddFactor[];
    npo_conversions?: NpoConversion[];
  };
  onClose: () => void;
  darkMode?: boolean;
}

export function LeddModal({
  sources = [],
  initialDrugId,
  factorsData = defaultLeddFactorsData as any,
  onClose,
  darkMode = false,
}: LeddModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const factors = factorsData.factors || [];
  const npoConversions = factorsData.npo_conversions || [];

  // Initialize with initialDrugId if available in factors, otherwise standard levodopa-ir
  const defaultDrug = factors.some((f) => f.drug_id === initialDrugId)
    ? initialDrugId!
    : factors[0]?.drug_id || "levodopa-ir";

  const [items, setItems] = useState<RegimenItemInput[]>([
    { drug_id: defaultDrug, dose_mg: 100, times_per_day: 3 },
  ]);

  // Handle ESC key to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Calculate LEDD
  const calculation = totalLEDD(items, factors);

  // Calculate NPO conversions
  const npoResults = resolveNpoConversions(calculation.total_ledd_mg, npoConversions);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { drug_id: "pramipexole", dose_mg: 0.5, times_per_day: 3 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: keyof RegimenItemInput,
    val: string | number
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          darkMode
            ? "bg-slate-900 border-slate-700 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>🔄 Levodopa Equivalent Daily Dose (LEDD)</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Tomlinson 2010
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Standardized antiparkinsonian regimen equivalency &amp; acute NPO bridging guidance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Section 1: Regimen Builder */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-500" />
                Current Antiparkinsonian Regimen
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medication</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const itemResult = calculation.items[idx];
                const factorEntry = factors.find((f) => f.drug_id === item.drug_id);

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {/* Drug Selector */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Medication
                      </label>
                      <select
                        value={item.drug_id}
                        onChange={(e) => handleUpdateItem(idx, "drug_id", e.target.value)}
                        className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-medium ${
                          darkMode
                            ? "bg-slate-900 border-slate-700 text-white"
                            : "bg-white border-slate-300 text-slate-900"
                        }`}
                      >
                        {factors.map((f) => (
                          <option key={f.drug_id} value={f.drug_id}>
                            {f.drug_name || f.drug_id} (×{f.factor} {f.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dose and Frequency inputs */}
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Dose (mg)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.dose_mg || ""}
                          onChange={(e) =>
                            handleUpdateItem(idx, "dose_mg", parseFloat(e.target.value) || 0)
                          }
                          className={`w-20 py-1.5 px-2 rounded-lg border text-xs font-mono font-bold ${
                            darkMode
                              ? "bg-slate-900 border-slate-700 text-white"
                              : "bg-white border-slate-300 text-slate-900"
                          }`}
                        />
                      </div>

                      <span className="text-slate-400 mt-4">×</span>

                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Times/Day
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.times_per_day || ""}
                          onChange={(e) =>
                            handleUpdateItem(
                              idx,
                              "times_per_day",
                              parseInt(e.target.value, 10) || 0
                            )
                          }
                          className={`w-16 py-1.5 px-2 rounded-lg border text-xs font-mono font-bold ${
                            darkMode
                              ? "bg-slate-900 border-slate-700 text-white"
                              : "bg-white border-slate-300 text-slate-900"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Computed item LEDD & SourcePopover */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 min-w-[150px]">
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                          LEDD Contribution
                        </span>
                        <span className="font-extrabold font-mono text-sm text-sky-600 dark:text-sky-400">
                          {itemResult ? `${itemResult.ledd_mg} mg` : "0 mg"}
                        </span>
                      </div>

                      {factorEntry?.refs && (
                        <SourcePopover
                          refs={factorEntry.refs}
                          sources={sources}
                          darkMode={darkMode}
                        />
                      )}

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modifiers explanation if applicable */}
            {calculation.modifiers_applied.length > 0 && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{calculation.modifiers_applied.join("; ")}</span>
              </div>
            )}
          </div>

          {/* Section 2: Total LEDD Banner */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
              darkMode
                ? "bg-sky-950/30 border-sky-800 text-sky-200"
                : "bg-sky-50/80 border-sky-200 text-sky-900"
            }`}
          >
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider block text-sky-700 dark:text-sky-400">
                Total Daily Levodopa Equivalent Dose
              </span>
              <p className="text-xs text-sky-600/80 dark:text-sky-300/80 mt-0.5">
                Summed across all entered agents per Tomlinson et al. consensus formulae
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400">
                {calculation.total_ledd_mg}{" "}
                <span className="text-sm font-bold uppercase tracking-normal">mg/day</span>
              </span>
            </div>
          </div>

          {/* Section 3: Sourced NPO / Perioperative Conversion */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Acute NPO / Perioperative Bridging Guidance
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                Prevent Acute Akinesia &amp; NMS
              </span>
            </div>

            <div className="space-y-3">
              {npoResults.map((npo, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border space-y-2 text-xs ${
                    darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {npo.to}
                      </span>
                      {npo.is_capped && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          Max Dose Capped (16 mg/24h)
                        </span>
                      )}
                    </div>
                    <SourcePopover refs={npo.refs} sources={sources} darkMode={darkMode} />
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {npo.rule_text}
                  </p>

                  {npo.computed_dose !== undefined && (
                    <div
                      className={`p-3 rounded-lg border mt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        darkMode
                          ? "bg-slate-900 border-slate-700 text-slate-200"
                          : "bg-white border-slate-200 text-slate-800"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                          Calculated Equivalent Dose:
                        </span>
                        <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                          {npo.computed_dose} {npo.unit}
                        </span>
                      </div>

                      {npo.recommended_patch_combination && (
                        <div className="sm:text-right">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                            Standard Discrete Patch Combination (Do not cut):
                          </span>
                          <span className="font-bold text-xs text-sky-600 dark:text-sky-400">
                            {npo.recommended_patch_combination}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Disclaimer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <p className="leading-tight text-center sm:text-left">
            <strong>Clinical Disclaimer:</strong> Reference only. Verify against current product labelling. Prescriber is responsible. Conversion ratios are estimates and clinical response must be closely monitored.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
