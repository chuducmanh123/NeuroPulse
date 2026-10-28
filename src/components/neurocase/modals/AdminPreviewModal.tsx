"use client";

import React from "react";
import { ClinicalCase, CaseDifficulty } from "@/types/clinicalCase";
import { NeuroImagingViewer } from "@/components/neurocase/NeuroImagingViewer";

interface AdminPreviewModalProps {
  adminPreviewCase: ClinicalCase | null;
  onClose: () => void;
  darkMode: boolean;
  difficultyBadges: Record<CaseDifficulty, string>;
  adminScheduleDates: Record<string, string>;
  onStartFullEdit: (caseItem: ClinicalCase) => void;
  onAdminUpdateStatus: (caseId: string, status: "approved" | "rejected" | "pending", makeDaily: boolean, targetDate?: string) => void;
}

export function AdminPreviewModal({
  adminPreviewCase,
  onClose,
  darkMode,
  difficultyBadges,
  adminScheduleDates,
  onStartFullEdit,
  onAdminUpdateStatus,
}: AdminPreviewModalProps) {
  if (!adminPreviewCase) return null;

  const hasVitals = (vitals?: ClinicalCase["presentation"]["vitals"]) =>
    Boolean(vitals && (vitals.bp || vitals.hr || vitals.rr || vitals.temp || vitals.spo2));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className={`relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl p-5 sm:p-7 space-y-6 animate-fadeIn ${
          darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white">
                Admin Case Preview
              </span>
              <span className="text-xs font-black">{adminPreviewCase.case_code}</span>
              <span className="text-slate-400">•</span>
              <span className="text-xs font-bold text-indigo-500">{adminPreviewCase.subspecialty}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  difficultyBadges[adminPreviewCase.difficulty]
                }`}
              >
                {adminPreviewCase.difficulty}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                  adminPreviewCase.status === "approved"
                    ? "bg-emerald-600 text-white"
                    : adminPreviewCase.status === "rejected"
                    ? "bg-rose-600 text-white"
                    : "bg-amber-400 text-slate-950"
                }`}
              >
                Status: {adminPreviewCase.status || "approved"}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black">{adminPreviewCase.title}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const caseToEdit = adminPreviewCase;
                onClose();
                onStartFullEdit(caseToEdit);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1 transition-colors"
            >
              <span>✏️</span>
              <span>Edit Full Case</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-black bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              ✕ Close Preview
            </button>
          </div>
        </div>

        {/* 2-Column Split View Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <NeuroImagingViewer
              imagingList={adminPreviewCase.presentation.imaging}
              isSolved={true}
              darkMode={darkMode}
            />
          </div>

          <div className="lg:col-span-5 space-y-4 text-xs sm:text-sm">
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Clinical Vignette (HPI, Exam &amp; Labs)
              </span>
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                {adminPreviewCase.presentation.history_of_present_illness}{" "}
                {adminPreviewCase.presentation.neuro_exam}{" "}
                {adminPreviewCase.presentation.key_labs_csf}
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 bg-slate-50/50 dark:bg-slate-800/30">
              {adminPreviewCase.presentation.demographics && (
                <div>
                  <strong>Demographics: </strong> {adminPreviewCase.presentation.demographics}
                </div>
              )}
              {adminPreviewCase.presentation.past_medical_history && (
                <div>
                  <strong>PMH: </strong> {adminPreviewCase.presentation.past_medical_history}
                </div>
              )}
              {hasVitals(adminPreviewCase.presentation.vitals) && (
                <div>
                  <strong>Vitals: </strong> BP {adminPreviewCase.presentation.vitals?.bp} • HR{" "}
                  {adminPreviewCase.presentation.vitals?.hr} • RR{" "}
                  {adminPreviewCase.presentation.vitals?.rr} • Temp{" "}
                  {adminPreviewCase.presentation.vitals?.temp} • SpO2{" "}
                  {adminPreviewCase.presentation.vitals?.spo2}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Question &amp; Multiple Choice Options
              </span>
              <p className="font-bold text-slate-900 dark:text-white">
                {adminPreviewCase.challenge.question}
              </p>

              <div className="space-y-2 pt-1">
                {adminPreviewCase.challenge.options.map((opt) => {
                  const isCorrect = opt.id === adminPreviewCase.challenge.correct_option;
                  return (
                    <div
                      key={opt.id}
                      className={`p-2.5 rounded-lg border text-xs ${
                        isCorrect
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold"
                          : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                            isCorrect ? "bg-emerald-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                        {isCorrect && (
                          <span className="ml-auto text-[10px] font-black uppercase bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                            Correct Answer
                          </span>
                        )}
                      </div>
                      {opt.rationale && (
                        <p className="mt-1.5 pl-7 text-[11px] opacity-90 leading-relaxed font-normal">
                          {opt.rationale}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Resolution Section Preview */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4 text-xs sm:text-sm">
          <div
            className={`p-4 rounded-xl border ${
              darkMode ? "bg-emerald-950/20 border-emerald-900/60" : "bg-emerald-50 border-emerald-200"
            }`}
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
              Definitive Diagnosis
            </span>
            <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
              {adminPreviewCase.resolution.final_diagnosis}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
              Clinical Discussion &amp; Correlation
            </span>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              {adminPreviewCase.resolution.clinical_discussion}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              className={`p-3.5 rounded-xl border space-y-1.5 ${
                darkMode ? "bg-indigo-950/20 border-indigo-900/50" : "bg-indigo-50 border-indigo-200"
              }`}
            >
              <span className="font-bold text-indigo-500 block">💡 High-Yield Teaching Points:</span>
              <ul className="space-y-1">
                {adminPreviewCase.resolution.teaching_points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-indigo-500 font-bold">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={`p-3.5 rounded-xl border space-y-1.5 ${
                darkMode ? "bg-rose-950/20 border-rose-900/50" : "bg-rose-50 border-rose-200"
              }`}
            >
              <span className="font-bold text-rose-500 block">⚠️ Clinical Pitfalls:</span>
              <ul className="space-y-1">
                {adminPreviewCase.resolution.clinical_pitfalls.map((pf, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rose-500 font-bold">•</span>
                    <span>{pf}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {adminPreviewCase.source_journal && (
            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
              <span>
                Source: {adminPreviewCase.source_journal.name} ({adminPreviewCase.source_journal.pub_year})
              </span>
              {adminPreviewCase.source_journal.doi_url && (
                <a
                  href={adminPreviewCase.source_journal.doi_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-500 hover:underline"
                >
                  {adminPreviewCase.source_journal.doi_url} ↗
                </a>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer with Direct Moderation Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {adminPreviewCase.status !== "approved" && (
              <button
                type="button"
                onClick={() => {
                  onAdminUpdateStatus(adminPreviewCase.id, "approved", false);
                  onClose();
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700"
              >
                📚 Approve to Case Archive
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onAdminUpdateStatus(
                  adminPreviewCase.id,
                  "approved",
                  true,
                  adminScheduleDates[adminPreviewCase.id] || adminPreviewCase.published_date
                );
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700"
            >
              🔥 Publish as Daily Challenge ({adminScheduleDates[adminPreviewCase.id] || adminPreviewCase.published_date})
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-600/40 hover:bg-slate-800 text-slate-300"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
