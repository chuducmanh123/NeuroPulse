"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ClinicalCase, UserCaseProgress } from "@/types/clinicalCase";
import { Article } from "@/types/article";
import { NeuroImagingViewer } from "@/components/neurocase/NeuroImagingViewer";

interface CaseChallengeProps {
  currentCase: ClinicalCase;
  darkMode: boolean;
  progressMap: Record<string, UserCaseProgress>;
  wrongAttemptsMap: Record<string, string[]>;
  onSelectOption: (caseItem: ClinicalCase, optionId: string) => void;
  onNextChallenge?: () => void;
  onResetAttempt?: (caseId: string) => void;
  relatedPulseArticles?: Article[];
  showNextChallengeButton?: boolean;
}

export function CaseChallenge({
  currentCase,
  darkMode,
  progressMap,
  wrongAttemptsMap,
  onSelectOption,
  onNextChallenge,
  onResetAttempt,
  relatedPulseArticles = [],
  showNextChallengeButton = true,
}: CaseChallengeProps) {
  const [showDetailedWorkup, setShowDetailedWorkup] = useState(false);

  const hasVitals = (vitals?: ClinicalCase["presentation"]["vitals"]) =>
    Boolean(vitals && (vitals.bp || vitals.hr || vitals.rr || vitals.temp || vitals.spo2));

  const isSolved = Boolean(progressMap[currentCase.id]?.isCorrect);
  const wrongList = wrongAttemptsMap[currentCase.id] || [];

  return (
    <div className="space-y-6">
      {/* 2-COLUMN SPLIT VIEW: LEFT = NEUROIMAGING FIGURES | RIGHT = VIGNETTE & MCQ */}
      <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT COLUMN: STICKY NEUROIMAGING VIEWER */}
        <div className="lg:col-span-7 lg:sticky lg:top-6">
          <NeuroImagingViewer
            imagingList={currentCase.presentation.imaging}
            isSolved={isSolved}
            darkMode={darkMode}
          />
        </div>

        {/* RIGHT COLUMN: CLINICAL VIGNETTE + MULTI-ATTEMPT MCQ + ACTION BUTTONS */}
        <div className="lg:col-span-5 space-y-5">
          {/* Clinical Vignette Paragraph (NEJM Style) */}
          <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed">
            <p className={darkMode ? "text-slate-200 font-normal" : "text-slate-800 font-normal"}>
              {currentCase.presentation.history_of_present_illness}{" "}
              {currentCase.presentation.neuro_exam}{" "}
              {currentCase.presentation.key_labs_csf}
            </p>

            {/* Optional Expandable Vitals & PMH Toggle */}
            {(currentCase.presentation.past_medical_history || hasVitals(currentCase.presentation.vitals)) && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowDetailedWorkup((prev) => !prev)}
                  className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"
                >
                  <span>
                    {showDetailedWorkup
                      ? hasVitals(currentCase.presentation.vitals)
                        ? "− Hide Vital Signs & Past Medical History"
                        : "− Hide Past Medical History"
                      : hasVitals(currentCase.presentation.vitals)
                      ? "+ View Vital Signs & Past Medical History"
                      : "+ View Past Medical History"}
                  </span>
                </button>

                {showDetailedWorkup && (
                  <div
                    className={`mt-2.5 p-3.5 rounded-xl border text-xs space-y-2.5 ${
                      darkMode
                        ? "bg-slate-800/60 border-slate-700 text-slate-200"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {currentCase.presentation.demographics && (
                      <div>
                        <strong className="font-bold">Demographics: </strong>
                        {currentCase.presentation.demographics}
                      </div>
                    )}
                    {currentCase.presentation.past_medical_history && (
                      <div>
                        <strong className="font-bold">Past Medical History: </strong>
                        {currentCase.presentation.past_medical_history}
                      </div>
                    )}
                    {hasVitals(currentCase.presentation.vitals) && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1 text-center">
                        {currentCase.presentation.vitals?.bp && (
                          <div className="p-1.5 rounded bg-slate-900 text-white">
                            <span className="text-[9px] text-slate-400 block">BP</span>
                            <span className="font-bold text-[11px] text-emerald-400">
                              {currentCase.presentation.vitals.bp}
                            </span>
                          </div>
                        )}
                        {currentCase.presentation.vitals?.hr && (
                          <div className="p-1.5 rounded bg-slate-900 text-white">
                            <span className="text-[9px] text-slate-400 block">HR</span>
                            <span className="font-bold text-[11px] text-amber-300">
                              {currentCase.presentation.vitals.hr}
                            </span>
                          </div>
                        )}
                        {currentCase.presentation.vitals?.rr && (
                          <div className="p-1.5 rounded bg-slate-900 text-white">
                            <span className="text-[9px] text-slate-400 block">RR</span>
                            <span className="font-bold text-[11px] text-sky-300">
                              {currentCase.presentation.vitals.rr}
                            </span>
                          </div>
                        )}
                        {currentCase.presentation.vitals?.temp && (
                          <div className="p-1.5 rounded bg-slate-900 text-white">
                            <span className="text-[9px] text-slate-400 block">Temp</span>
                            <span className="font-bold text-[11px]">
                              {currentCase.presentation.vitals.temp}
                            </span>
                          </div>
                        )}
                        {currentCase.presentation.vitals?.spo2 && (
                          <div className="p-1.5 rounded bg-slate-900 text-white">
                            <span className="text-[9px] text-slate-400 block">SpO2</span>
                            <span className="font-bold text-[11px] text-cyan-300">
                              {currentCase.presentation.vitals.spo2}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Question Prompt */}
            <p className={`font-bold pt-1 ${darkMode ? "text-white" : "text-slate-900"}`}>
              {currentCase.challenge.question}
            </p>
          </div>

          {/* Option List */}
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
            {currentCase.challenge.options.map((opt) => {
              const isWrongAttempt = wrongList.includes(opt.id);
              const isCorrectOption = opt.id === currentCase.challenge.correct_option;

              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (!isSolved && !isWrongAttempt) {
                      onSelectOption(currentCase, opt.id);
                    }
                  }}
                  className={`py-3.5 px-2 transition-colors ${
                    isSolved || isWrongAttempt
                      ? "cursor-default"
                      : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {isSolved && isCorrectOption ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </span>
                      ) : isWrongAttempt ? (
                        <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                          ✕
                        </span>
                      ) : (
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            darkMode ? "border-slate-600" : "border-slate-300"
                          }`}
                        />
                      )}

                      <div className="space-y-1">
                        <span
                          className={`text-sm leading-snug block ${
                            isSolved && isCorrectOption
                              ? "font-black text-emerald-600 dark:text-emerald-400"
                              : isWrongAttempt
                              ? "font-bold text-rose-600 dark:text-rose-400"
                              : darkMode
                              ? "font-medium text-slate-200"
                              : "font-medium text-slate-700"
                          }`}
                        >
                          {opt.text}
                        </span>

                        {isWrongAttempt && !isSolved && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 animate-fadeIn">
                            <strong className="font-black">Try again!</strong> That is not the correct answer.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Option Rationale */}
                  {isSolved && (
                    <div className="mt-2 pl-8 space-y-1">
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        <strong className={`font-black ${isCorrectOption ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                          {isCorrectOption ? "Correct Answer: " : "Differential Note: "}
                        </strong>
                        {opt.rationale}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {showNextChallengeButton && onNextChallenge && (
              <button
                type="button"
                onClick={onNextChallenge}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-xs font-black uppercase tracking-wider transition-colors ${
                  darkMode
                    ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                    : "border-slate-300 text-slate-800 hover:bg-slate-100"
                }`}
              >
                NEXT CHALLENGE
              </button>
            )}

            {onResetAttempt && (
              <button
                type="button"
                onClick={() => onResetAttempt(currentCase.id)}
                className="py-2.5 px-5 rounded-lg text-xs font-black uppercase tracking-wider bg-sky-800 hover:bg-sky-900 text-white transition-colors flex items-center gap-1.5"
              >
                <span>↻</span>
                <span>TRY AGAIN</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* UNLOCKED RESOLUTION */}
      {isSolved && (
        <div className="p-5 sm:p-7 border-t border-slate-200 dark:border-slate-800 space-y-6 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-500">
              Final Diagnosis, Teaching Points &amp; Clinical Pitfalls
            </h3>

            {currentCase.source_journal && (
              <a
                href={currentCase.source_journal.doi_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-indigo-500 hover:underline"
              >
                Published Source: {currentCase.source_journal.name} (
                {currentCase.source_journal.pmcid || currentCase.source_journal.pub_year}) ↗
              </a>
            )}
          </div>

          {/* Final Diagnosis Box */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white border border-emerald-600/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
              FINAL CLINICAL DIAGNOSIS • {currentCase.case_code}
            </span>
            <p className="text-base sm:text-lg font-black">{currentCase.resolution.final_diagnosis}</p>
          </div>

          {/* Clinical Discussion */}
          <div className="text-xs sm:text-sm leading-relaxed space-y-2 whitespace-pre-line">
            <h4 className="font-black uppercase text-xs text-indigo-500">📖 Clinical Discussion:</h4>
            <p>{currentCase.resolution.clinical_discussion}</p>
          </div>

          {/* Teaching Points & Clinical Pitfalls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-xl border ${
                darkMode ? "bg-emerald-950/30 border-emerald-800/70" : "bg-emerald-50/70 border-emerald-200"
              }`}
            >
              <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 mb-2">
                💡 High-Yield Teaching Points
              </h4>
              <ul className="space-y-2 text-xs leading-relaxed list-disc pl-4">
                {currentCase.resolution.teaching_points.map((tp, i) => (
                  <li key={i}>{tp}</li>
                ))}
              </ul>
            </div>

            <div
              className={`p-4 rounded-xl border ${
                darkMode ? "bg-rose-950/30 border-rose-800/70" : "bg-rose-50/70 border-rose-200"
              }`}
            >
              <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 mb-2">
                ⚠️ Clinical Pitfalls to Avoid
              </h4>
              <ul className="space-y-2 text-xs leading-relaxed list-disc pl-4">
                {currentCase.resolution.clinical_pitfalls.map((pf, i) => (
                  <li key={i}>{pf}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Related Pulse Articles */}
          {relatedPulseArticles.length > 0 && (
            <div
              className={`p-4 rounded-xl border ${
                darkMode ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase text-indigo-500 flex items-center gap-1.5">
                  <span>🔗 Related Literature on NeuroPulse</span>
                </span>
                <Link href="/" className="text-xs font-bold text-indigo-500 hover:underline">
                  Open NeuroPulse →
                </Link>
              </div>
              <div className="space-y-2">
                {relatedPulseArticles.map((art) => (
                  <a
                    key={art.id}
                    href={art.doi_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-3 rounded-lg border block transition-all ${
                      darkMode
                        ? "bg-slate-900 border-slate-700 hover:border-indigo-500"
                        : "bg-white border-slate-200 hover:border-indigo-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                        style={{
                          backgroundColor: art.journal.badge_bg,
                          color: art.journal.badge_text,
                        }}
                      >
                        {art.journal.short_name}
                      </span>
                      <span className="text-[10px] text-slate-400">{art.pub_date}</span>
                    </div>
                    <p className="text-xs font-bold leading-snug">{art.title}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
