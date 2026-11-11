"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Printer, Calendar, ArrowRight, Info, CheckCircle2 } from "lucide-react";
import type { DrugRecord, Source, TitrationSchedule } from "@/types/neurorx";
import { buildSchedule, formatDate, type BuiltSchedule } from "@/lib/neurorx/schedule";
import { SourcePopover } from "../drug/SourcePopover";

interface TitrationModalProps {
  drug: DrugRecord;
  sources?: Source[];
  onClose: () => void;
  darkMode?: boolean;
}

export function TitrationModal({
  drug,
  sources = [],
  onClose,
  darkMode = false,
}: TitrationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const schedules: TitrationSchedule[] = drug.tools?.titration?.schedules || [];

  // Decision rule: NO preselection of schedule, clinician must explicitly choose
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(formatDate(new Date()));

  // Available product strengths
  const productStrengths = (drug.vn_products?.value || []).map((p) => p.strength);

  const activeSchedule = schedules.find((s) => s.id === selectedScheduleId) || null;

  const built: BuiltSchedule | null = activeSchedule
    ? buildSchedule(activeSchedule, startDate, productStrengths)
    : null;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const displayName = drug.tall_man?.value || drug.generic_name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 print:p-0 print:bg-white print:static print:inset-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors print:border-none print:shadow-none print:max-h-none print:overflow-visible print:bg-white print:text-black ${
          darkMode
            ? "bg-slate-900 border-slate-700 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header - Hidden on Print */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>🖨️ Patient Titration Schedule Generator</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate dated, printable titration plan for <strong>{displayName}</strong>
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

        {/* Modal Body / Printable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 print:p-0 print:overflow-visible">
          {/* Controls Bar - Hidden on Print */}
          <div
            className={`p-4 rounded-xl border space-y-4 print:hidden ${
              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Schedule Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  1. Select Clinical Titration Protocol <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedScheduleId || ""}
                  onChange={(e) => setSelectedScheduleId(e.target.value || null)}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-white"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                >
                  <option value="">-- Choose Protocol (Required) --</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.condition_text})
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  2. Regimen Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl border text-xs font-mono font-bold ${
                      darkMode
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            {activeSchedule && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Protocol: <strong>{activeSchedule.condition_text}</strong>
                </span>
                <SourcePopover refs={activeSchedule.refs} sources={sources} darkMode={darkMode} />
              </div>
            )}
          </div>

          {/* Printable Document Sheet */}
          <div ref={printAreaRef} className="print:block space-y-4">
            {/* Header for Printout */}
            <div className="border-b border-slate-300 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 print:text-black">
                    Patient Medication Titration Schedule
                  </h1>
                  <p className="text-sm font-semibold text-sky-700 dark:text-sky-400 print:text-black mt-0.5">
                    Medication: <strong>{displayName}</strong>
                  </p>
                </div>
                {built && (
                  <div className="text-right text-xs text-slate-500 print:text-gray-700">
                    <div>Start Date: <strong>{built.start_date_str}</strong></div>
                    <div>Protocol: {built.label}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Table or Empty State */}
            {!built ? (
              <div
                className={`p-8 rounded-2xl border text-center text-xs text-slate-500 dark:text-slate-400 print:hidden ${
                  darkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <Info className="w-6 h-6 mx-auto mb-2 text-indigo-500 opacity-80" />
                Please select a clinical titration protocol above to preview and print the schedule.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 dark:border-slate-700 print:border-black text-slate-600 dark:text-slate-300 print:text-black">
                      <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Timeframe</th>
                      <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Calendar Dates</th>
                      <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Prescribed Dosage</th>
                      <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Instructions / Tablets</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-gray-300">
                    {built.rows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          idx % 2 === 0
                            ? "bg-slate-50/50 dark:bg-slate-950/30 print:bg-white"
                            : "bg-white dark:bg-slate-900 print:bg-gray-50"
                        }
                      >
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100 print:text-black whitespace-nowrap">
                          {row.week_label}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-600 dark:text-slate-300 print:text-black whitespace-nowrap">
                          {row.start_date_str} <span className="text-slate-400 print:text-black">→</span> {row.end_date_str}
                        </td>
                        <td className="py-3 px-3 font-bold text-sky-700 dark:text-sky-300 print:text-black">
                          {row.dose_text}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300 print:text-black font-medium">
                          {row.tablet_instructions || "Take as directed by prescriber"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Print Footer & Mandatory Disclaimer */}
            <div className="pt-4 border-t border-slate-300 dark:border-slate-800 print:border-black text-[11px] text-slate-500 dark:text-slate-400 print:text-gray-700 space-y-1">
              <p>
                <strong>Medication:</strong> {displayName} · <strong>Protocol Reference:</strong> {activeSchedule?.label || "Clinical Titration Protocol"}
              </p>
              <p className="leading-relaxed">
                <strong>Clinical Disclaimer:</strong> Reference only. Verify against current product labelling. Prescriber is responsible. Do not stop or alter dose without consulting your physician.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer - Hidden on Print */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs flex items-center justify-between gap-3 shrink-0 print:hidden">
          <span className="text-[11px]">
            {built ? "Printout formatted for standard A4 paper." : "Select protocol to enable printing."}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!built}
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print Schedule</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
