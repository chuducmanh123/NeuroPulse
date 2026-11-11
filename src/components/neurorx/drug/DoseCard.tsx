"use client";

import React, { useState } from "react";
import {
  Zap,
  Pill,
  Check,
  Copy,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  Syringe,
  Package,
} from "lucide-react";
import type { DrugRecord, Regimen, RenalBand } from "@/types/neurorx";
import type { PatientParsed, RenalResolutionResult } from "@/lib/neurorx/patient";
import { resolveRegimen } from "@/lib/neurorx/dosing";
import { toProductUnits } from "@/lib/neurorx/formulation";
import { computeInfusion } from "@/lib/neurorx/infusion";
import { buildOrderText, CLINICAL_DISCLAIMER } from "@/lib/neurorx/orderText";

interface DoseCardProps {
  drug: DrugRecord;
  regimens: Regimen[];
  setting?: "acute_inpatient" | "maintenance_outpatient" | "unified";
  patient: PatientParsed;
  renal: RenalResolutionResult;
  darkMode?: boolean;
}

export function DoseCard({
  drug,
  regimens,
  setting = "unified",
  patient,
  renal,
  darkMode = false,
}: DoseCardProps) {
  // If multiple regimens for this setting, allow user to toggle between indications
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const isAcute = setting === "acute_inpatient";
  const isMaintenance = setting === "maintenance_outpatient";
  const activeRegimen = regimens[selectedIndex] || regimens[0];

  if (!activeRegimen) {
    return (
      <div
        className={`p-6 rounded-2xl border ${
          darkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"
        } text-center text-slate-400 text-xs`}
      >
        Chưa có thông tin liều dùng cho thuốc này.
      </div>
    );
  }

  // 1. Resolve clinical dosage
  const resolution = resolveRegimen(drug, activeRegimen, patient, renal);

  // 2. Physical formulation product units
  const productUnits =
    resolution.state === "computed" && resolution.amount
      ? toProductUnits(resolution.amount, drug.vn_products?.value)
      : [];
  const productUnitText = productUnits.length > 0 ? productUnits[0].displayText : undefined;

  // 3. IV Infusion calculation (if IV infusion spec present)
  const infusionCalc =
    resolution.state === "computed" && resolution.amount && activeRegimen.dose?.infusion
      ? computeInfusion(
          resolution.amount,
          resolution.unit || "mg",
          activeRegimen.dose.infusion
        )
      : null;

  // 4. Relevant renal bands (from regimen or drug-level impairment)
  const renalBands: RenalBand[] =
    activeRegimen.renal_bands || drug.renal_impairment?.bands || [];

  // Copy order handler
  const handleCopyOrder = () => {
    const orderOutput = buildOrderText(
      drug,
      activeRegimen,
      resolution,
      productUnitText
    );
    navigator.clipboard.writeText(orderOutput.multiLine);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className={`rounded-2xl border flex flex-col justify-between transition-all ${
        darkMode
          ? "bg-slate-900/90 border-slate-800 shadow-sm"
          : "bg-white border-slate-200/90 shadow-sm"
      }`}
    >
      <div>
        {/* Card Header */}
        <div
          className={`p-4 sm:p-5 border-b rounded-t-2xl ${
            isAcute
              ? darkMode
                ? "bg-rose-950/20 border-rose-900/40"
                : "bg-rose-50/70 border-rose-100"
              : isMaintenance
              ? darkMode
                ? "bg-sky-950/20 border-sky-900/40"
                : "bg-sky-50/70 border-sky-100"
              : darkMode
              ? "bg-slate-800/60 border-slate-700/60"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                isAcute
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  : isMaintenance
                  ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                  : "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20"
              }`}
            >
              {isAcute ? (
                <Zap className="w-3.5 h-3.5" />
              ) : (
                <Pill className="w-3.5 h-3.5" />
              )}
              <span>
                {isAcute
                  ? "⚡ Acute / Inpatient"
                  : isMaintenance
                  ? "💊 Maintenance / Outpatient"
                  : "💊 Liều dùng & Chế độ điều trị (Dosing Regimen)"}
              </span>
            </span>

            {/* Route Badge */}
            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {activeRegimen.route}
            </span>
          </div>

          {/* Indication selector if multiple regimens exist */}
          {regimens.length > 1 ? (
            <div className="mt-3">
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Clinical Indication:
              </label>
              <select
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(parseInt(e.target.value, 10))}
                className={`w-full text-xs font-semibold p-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
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
            <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {activeRegimen.indication}
            </h4>
          )}
        </div>

        {/* Card Body: Dosage Resolution */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* State 1: Computed */}
          {resolution.state === "computed" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                  Computed Dosage:
                </span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                    {resolution.amount} {resolution.unit}
                  </span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {resolution.frequency}
                  </span>

                  {resolution.capped && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Capped at max
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 font-medium">
                  {resolution.ruleText}
                </p>
              </div>

              {/* Formulation Product Units Line */}
              {productUnitText && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Package className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>Formulation: {productUnitText}</span>
                </div>
              )}

              {/* Infusion Line */}
              {infusionCalc && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-700 dark:text-blue-300">
                  <Syringe className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    IV Infusion: {infusionCalc.volumeMl} mL @ {infusionCalc.rateMlPerHour} mL/h over {infusionCalc.durationMin} min
                  </span>
                </div>
              )}

              {/* Explanation Collapsible */}
              {resolution.explanation.length > 0 && (
                <details className="text-xs text-slate-500 dark:text-slate-400">
                  <summary className="cursor-pointer font-semibold hover:text-slate-700 dark:hover:text-slate-200">
                    Show clinical calculation steps ({resolution.explanation.length})
                  </summary>
                  <ul className="list-disc list-inside mt-2 space-y-1 pl-1">
                    {resolution.explanation.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* State 2: Needs Input */}
          {resolution.state === "needs_input" && (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Dosage Formula:
              </span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {resolution.ruleText}
              </p>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 pt-1">
                <Info className="w-4 h-4 shrink-0" />
                <span>Enter patient weight in the patient bar above to calculate exact bedside dose.</span>
              </div>
            </div>
          )}

          {/* State 3: Text Only */}
          {resolution.state === "text_only" && (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Prescribing Guidance (Hướng dẫn liều):
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {resolution.ruleText}
              </p>
            </div>
          )}

          {/* State 4: Blocked Draft */}
          {resolution.state === "blocked_draft" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  <span>Bản nháp (Draft Record)</span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  Hồ sơ thuốc đang ở trạng thái bản nháp (Draft). Dưới đây là phác đồ liều dùng đã ghi nhận:
                </p>
              </div>
              {activeRegimen.dose_text && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Liều dùng lâm sàng (Dosing Guidance):
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {activeRegimen.dose_text}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Hemodialysis guidance box if active */}
          {patient.onHemodialysis && resolution.hemodialysisNote && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                Hemodialysis Guidance:
              </span>
              <p className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                {resolution.hemodialysisNote}
              </p>
            </div>
          )}

          {/* Renal Clearance Bands Table */}
          {(isAcute || setting === "unified" || !setting) && renalBands.length > 0 && resolution.state !== "blocked_draft" && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Renal Clearance Bands ({drug.renal_basis?.value || "cg_abw"}):
              </span>
              <div className="space-y-1 text-xs">
                {renalBands.map((band, idx) => {
                  const isMatched = resolution.renalBandMatched === band;
                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        isMatched
                          ? "bg-sky-50 dark:bg-sky-950/70 border-sky-400 dark:border-sky-700 font-bold text-sky-900 dark:text-sky-200 shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isMatched ? (
                          <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                        )}
                        <span className="font-mono">
                          {band.min === null
                            ? `< ${band.max}`
                            : band.max === null
                            ? `> ${band.min}`
                            : `${band.min} – ${band.max}`} mL/min:
                        </span>
                        <span className="font-semibold">{band.dose_text}</span>
                      </div>

                      {isMatched && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-white uppercase tracking-wider shrink-0">
                          Active Band
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: 1-Click Copy Order */}
      <div className="p-4 sm:p-5 pt-0">
        <button
          type="button"
          onClick={handleCopyOrder}
          disabled={resolution.state === "blocked_draft"}
          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
            copied
              ? "bg-emerald-600 text-white shadow-xs"
              : resolution.state === "blocked_draft"
              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              : darkMode
              ? "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 shadow-xs"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Copied order snippet with disclaimer!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>📋 Copy EHR Order Snippet</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
