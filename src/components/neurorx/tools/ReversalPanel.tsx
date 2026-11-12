"use client";

import React from "react";
import { Shield, AlertCircle, CheckCircle2, X } from "lucide-react";
import type { DrugRecord, Source } from "@/types/neurorx";
import { reversal, type ReversalPlanResult } from "@/lib/neurorx/compass";
import { SourcePopover } from "../drug/SourcePopover";

interface ReversalPanelProps {
  drug: DrugRecord;
  sources?: Source[];
  patientWeight?: number;
  patientInr?: number;
  onClose?: () => void;
  darkMode?: boolean;
}

export function ReversalPanel({
  drug,
  sources = [],
  patientWeight,
  patientInr,
  onClose,
  darkMode = false,
}: ReversalPanelProps) {
  const result: ReversalPlanResult = reversal(drug, {
    weight_kg: patientWeight,
    inr: patientInr,
  });

  if (result.agents.length === 0) {
    return (
      <div
        className={`p-5 rounded-2xl border text-center text-xs text-slate-500 dark:text-slate-400 ${
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        No specific reversal agents registered for {result.drug_name} in active sources.
      </div>
    );
  }

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl border space-y-4 transition-all shadow-sm ${
        darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>🛡️ Urgent Anticoagulation Reversal Guidance</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Protocol for acute intracranial hemorrhage (ICH) or life-threatening bleeding on <strong>{result.drug_name}</strong>
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Patient Parameters Reminder */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
          darkMode
            ? "bg-slate-950/60 border-slate-800 text-slate-300"
            : "bg-slate-50 border-slate-200 text-slate-700"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold">Patient Parameters:</span>
          <span>
            Weight: {patientWeight ? `${patientWeight} kg` : "Not entered"}
          </span>
          <span>•</span>
          <span>
            INR: {patientInr ? patientInr.toFixed(1) : "Not entered"}
          </span>
        </div>

        {!patientWeight && (
          <span className="text-amber-700 dark:text-amber-400 text-xs font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>Enter weight in patient bar to compute doses</span>
          </span>
        )}
      </div>

      {/* Reversal Agents List */}
      <div className="space-y-3">
        {result.agents.map((agent, idx) => (
          <div
            key={idx}
            className={`p-4 sm:p-5 rounded-xl border transition-all ${
              darkMode
                ? "bg-slate-950/40 border-slate-800"
                : "bg-slate-50/70 border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                  {agent.agent}
                </span>

                {/* VN Availability Badge (renders ONLY if present in data) */}
                {agent.vn_available !== undefined && (
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                      agent.vn_available
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300"
                    }`}
                  >
                    VN Market Available: {agent.vn_available ? "Yes" : "No"}
                  </span>
                )}
              </div>

              {agent.refs && agent.refs.length > 0 && (
                <SourcePopover
                  refs={agent.refs}
                  sources={sources}
                  label="Source"
                  darkMode={darkMode}
                />
              )}
            </div>

            {/* Dose Rule */}
            <div className="text-sm text-slate-800 dark:text-slate-200 space-y-2 leading-relaxed">
              <div>
                <span className="font-extrabold text-xs sm:text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Dose Rule:{" "}
                </span>
                <span className="font-medium">{agent.dose_rule}</span>
              </div>

              {/* Computed Dose (Only shown when weight is provided) */}
              {agent.computed_dose && (
                <div
                  className={`mt-2.5 p-3.5 sm:p-4 rounded-xl border flex flex-col gap-1.5 ${
                    darkMode
                      ? "bg-rose-950/20 border-rose-900/50 text-rose-300"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                      Computed Dose
                    </span>
                    {agent.computed_dose.capped && (
                      <span className="text-xs px-2 py-0.5 rounded font-extrabold bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/30">
                        Capped at Max 100 kg
                      </span>
                    )}
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold tracking-tight">
                    {agent.computed_dose.amount_exact !== undefined
                      ? `${agent.computed_dose.amount_exact.toLocaleString()} ${agent.computed_dose.unit}`
                      : `${agent.computed_dose.amount_min?.toLocaleString()} to ${agent.computed_dose.amount_max?.toLocaleString()} ${agent.computed_dose.unit}`}
                  </div>
                  <p className="text-xs sm:text-sm font-medium opacity-90 leading-relaxed">
                    {agent.computed_dose.explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
