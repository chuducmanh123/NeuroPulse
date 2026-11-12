"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  X,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Syringe,
  AlertCircle,
} from "lucide-react";
import type { DrugRecord, Source } from "@/types/neurorx";
import { holdPlan, type CompassProcedure, type HoldPlanEntry } from "@/lib/neurorx/compass";
import { SourcePopover } from "../drug/SourcePopover";

interface HoldRestartModalProps {
  drug: DrugRecord;
  sources?: Source[];
  renal?: { crcl?: number };
  onClose: () => void;
  darkMode?: boolean;
}

export function HoldRestartModal({
  drug,
  sources = [],
  renal,
  onClose,
  darkMode = false,
}: HoldRestartModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [procedure, setProcedure] = useState<CompassProcedure>("lumbar_puncture");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const displayName = drug.tall_man?.value || drug.generic_name;
  const entries: HoldPlanEntry[] = holdPlan(drug, procedure, renal);

  // Group entries by source
  const entriesBySource = new Map<string, HoldPlanEntry[]>();
  for (const entry of entries) {
    const list = entriesBySource.get(entry.source_id) || [];
    list.push(entry);
    entriesBySource.set(entry.source_id, list);
  }

  // Check if multiple sources differ in hold recommendations
  const distinctSourcesCount = entriesBySource.size;
  const sourcesDiffer =
    distinctSourcesCount > 1 &&
    new Set(entries.map((e) => e.hold_hours)).size > 1;

  const getSourceTitle = (sourceId: string): string => {
    const s = sources.find((src) => src.id === sourceId);
    return s?.title || sourceId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        ref={modalRef}
        className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-2xl transition-all ${
          darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                ⏱️ Hold / Restart Antithrombotic Compass
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Per-source procedural interruption protocols for <strong>{displayName}</strong>
                {renal?.crcl !== undefined && (
                  <span className="ml-1 text-indigo-600 dark:text-indigo-400 font-semibold">
                    (Patient CrCl: {renal.crcl.toFixed(1)} mL/min)
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Procedure Selector Toggle */}
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Procedure Type:
          </span>
          <div
            className={`inline-flex p-1 rounded-xl border ${
              darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-100 border-slate-200"
            }`}
          >
            <button
              onClick={() => setProcedure("lumbar_puncture")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                procedure === "lumbar_puncture"
                  ? darkMode
                    ? "bg-sky-900/60 text-sky-300 shadow-sm"
                    : "bg-white text-sky-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Lumbar Puncture / Neuraxial
            </button>
            <button
              onClick={() => setProcedure("neurosurgery")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                procedure === "neurosurgery"
                  ? darkMode
                    ? "bg-sky-900/60 text-sky-300 shadow-sm"
                    : "bg-white text-sky-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Major Neurosurgery / Cranial
            </button>
          </div>
        </div>

        {/* Disagreement Warning if sources differ */}
        {sourcesDiffer && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">
              Sources differ — choose per local protocol
            </span>
          </div>
        )}

        {/* Source Columns (side-by-side on desktop, stacked on mobile) */}
        {entries.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No specific procedural hold data registered for this medication in current sources.
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(entriesBySource.entries()).map(([sourceId, sourceEntries]) => {
              const title = getSourceTitle(sourceId);

              return (
                <div
                  key={sourceId}
                  className={`p-4 sm:p-5 rounded-2xl border transition-colors ${
                    darkMode
                      ? "bg-slate-950/40 border-slate-800"
                      : "bg-slate-50/80 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                    <div className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Source: {title}
                    </div>
                    {sourceEntries[0]?.refs && (
                      <SourcePopover
                        refs={sourceEntries[0].refs}
                        sources={sources}
                        label="Source"
                        darkMode={darkMode}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    {sourceEntries.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all ${
                          item.crcl_matched
                            ? darkMode
                              ? "bg-sky-950/30 border-sky-600/50"
                              : "bg-sky-50/60 border-sky-300"
                            : darkMode
                            ? "bg-slate-900 border-slate-800"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                            {item.procedure_label}
                          </span>
                          {item.crcl_matched && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                              Matched Renal Stratum
                            </span>
                          )}
                        </div>

                        {/* Visual Timeline: Last Dose / Hold -> Intervention -> Restart */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-sm pt-2">
                          {/* Step 1: Hold */}
                          <div
                            className={`p-3 rounded-xl border ${
                              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <span className="text-xs font-extrabold uppercase tracking-wider text-rose-500 block">
                              1. Pre-Procedure Hold
                            </span>
                            <span className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-100 block mt-1">
                              {item.hold_hours}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                              Hold prior to procedure
                            </span>
                          </div>

                          {/* Step 2: Procedure */}
                          <div
                            className={`p-3 rounded-xl border ${
                              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500 block">
                              2. Intervention
                            </span>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block mt-1">
                              {procedure === "lumbar_puncture"
                                ? "Lumbar Puncture"
                                : "Neurosurgery"}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                              Confirm adequate hemostasis
                            </span>
                          </div>

                          {/* Step 3: Restart */}
                          <div
                            className={`p-3 rounded-xl border ${
                              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-500 block">
                              3. Post-Procedure Restart
                            </span>
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block mt-1 leading-snug">
                              {item.restart_timing}
                            </span>
                          </div>
                        </div>

                        {item.note && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic mt-2.5">
                            {item.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 italic font-medium">
            Reference only. Always confirm local institutional protocol and individual hemostatic risk.
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              darkMode
                ? "border-slate-700 hover:bg-slate-800 text-slate-300"
                : "border-slate-200 hover:bg-slate-100 text-slate-700"
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
