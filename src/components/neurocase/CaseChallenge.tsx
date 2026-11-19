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
    <div className="space-y-4">
      {/* 2-COLUMN SPLIT VIEW: LEFT = NEUROIMAGING FIGURES | RIGHT = VIGNETTE & MCQ */}
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-7 items-start">
        {/* LEFT COLUMN: STICKY NEUROIMAGING VIEWER */}
        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <NeuroImagingViewer
            imagingList={currentCase.presentation.imaging}
            isSolved={isSolved}
            darkMode={darkMode}
          />
        </div>

        {/* RIGHT COLUMN: CLINICAL VIGNETTE + MULTI-ATTEMPT MCQ + ACTION BUTTONS */}
        <div className="lg:col-span-7 space-y-4">
          {/* Clinical Vignette Paragraph */}
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="text-[var(--text-secondary)] font-normal">
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
                  className="text-xs font-bold text-[#6D28D9] dark:text-violet-400 hover:underline flex items-center gap-1"
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
                  <div className="mt-2.5 p-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 text-[var(--text-secondary)] text-xs space-y-2.5">
                    {currentCase.presentation.demographics && (
                      <div>
                        <strong className="font-bold text-[var(--text-ink)]">Demographics: </strong>
                        {currentCase.presentation.demographics}
                      </div>
                    )}
                    {currentCase.presentation.past_medical_history && (
                      <div>
                        <strong className="font-bold text-[var(--text-ink)]">Past Medical History: </strong>
                        {currentCase.presentation.past_medical_history}
                      </div>
                    )}
                    {hasVitals(currentCase.presentation.vitals) && (
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1 text-center">
                        {currentCase.presentation.vitals?.bp && (
                          <div className="p-1.5 rounded-lg bg-[#1C1917] text-white">
                            <span className="text-[9px] text-stone-400 block">BP</span>
                            <span className="font-bold text-[11px] text-emerald-400">
                              {currentCase.presentation.vitals.bp}
                            </span>
                          </div>
                        )}
                        {currentCase.presentation.vitals?.hr && (
                          <div className="p-1.5 rounded-lg bg-[#1C1917] text-white">
                            <span className="text-[9px] text-stone-400 block">HR</span>
                            <span className="font-bold text-[11px] text-amber-300">
                              {currentCase.presentation.vitals.hr}
                            </span>
                          </div>
                        )}
                        {currentCase.presentation.vitals?.rr && (
                          <div className="p-1.5 rounded-lg bg-[#1C1917] text-white">
                            <span className="text-[9px] text-stone-400 block">RR</span>
                            <span className="font-bold text-[11px] text-sky-300">
                              {currentCase.presentation.vitals.rr}
                            </span>
                          </div>
                        )}
                        {currentCase.presentation.vitals?.temp && (
                          <div className="p-1.5 rounded-lg bg-[#1C1917] text-white">
                            <span className="text-[9px] text-stone-400 block">Temp</span>
                            <span className="font-bold text-[11px]">
                              {currentCase.presentation.vitals.temp}
                            </span>
                          </div>
                        )}
                        {currentCase.presentation.vitals?.spo2 && (
                          <div className="p-1.5 rounded-lg bg-[#1C1917] text-white">
                            <span className="text-[9px] text-stone-400 block">SpO2</span>
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
            <p className="font-bold pt-2 border-t border-[var(--border-hairline)] text-[var(--text-ink)]">
              {currentCase.challenge.question}
            </p>
          </div>

          {/* Option List */}
          <div className="space-y-2">
            {currentCase.challenge.options.map((opt, idx) => {
              const isWrongAttempt = wrongList.includes(opt.id);
              const isCorrectOption = opt.id === currentCase.challenge.correct_option;
              const letter = String.fromCharCode(65 + idx);

              let cardClasses =
                "border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:border-[#6D28D9]";
              if (isSolved && isCorrectOption) {
                cardClasses =
                  "border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/40 dark:border-emerald-500";
              } else if (isWrongAttempt) {
                cardClasses =
                  "border-rose-500 bg-rose-50/90 dark:bg-rose-950/40 dark:border-rose-500";
              }

              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    if (!isSolved && !isWrongAttempt) {
                      onSelectOption(currentCase, opt.id);
                    }
                  }}
                  className={`rounded-xl border px-4 py-3 transition-all ${cardClasses} ${
                    isSolved || isWrongAttempt ? "cursor-default" : "cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {isSolved && isCorrectOption ? (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          ✓
                        </span>
                      ) : isWrongAttempt ? (
                        <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          ✕
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {letter}
                        </span>
                      )}

                      <div className="space-y-1">
                        <span
                          className={`text-xs sm:text-sm leading-snug block ${
                            isSolved && isCorrectOption
                              ? "font-bold text-emerald-900 dark:text-emerald-300"
                              : isWrongAttempt
                              ? "font-semibold text-rose-800 dark:text-rose-300"
                              : "font-medium text-[var(--text-ink)]"
                          }`}
                        >
                          {opt.text}
                        </span>

                        {isWrongAttempt && !isSolved && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 animate-fadeIn">
                            <strong className="font-bold">Try again!</strong> That is not the correct answer.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Option Rationale */}
                  {isSolved && (
                    <div className="mt-2 pl-8 space-y-1">
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        <strong
                          className={`font-bold ${
                            isCorrectOption
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-[var(--text-ink)]"
                          }`}
                        >
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
                className="flex-1 py-2.5 px-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-xs font-bold uppercase tracking-wider text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                NEXT CHALLENGE
              </button>
            )}

            {onResetAttempt && (
              <button
                type="button"
                onClick={() => onResetAttempt(currentCase.id)}
                className="py-2.5 px-5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#6D28D9] hover:bg-[#5B21B6] text-white transition-colors flex items-center gap-1.5"
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
        <div className="p-4 sm:p-6 border-t border-[var(--border-hairline)] space-y-5 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Final Diagnosis, Teaching Points &amp; Clinical Pitfalls
            </h3>

            {currentCase.source_journal && (
              <a
                href={currentCase.source_journal.doi_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#6D28D9] dark:text-violet-400 hover:underline"
              >
                Published Source: {currentCase.source_journal.name} (
                {currentCase.source_journal.pmcid || currentCase.source_journal.pub_year}) ↗
              </a>
            )}
          </div>

          {/* Final Diagnosis Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#141824] via-[#1E192B] to-[#1A2922] text-white border border-emerald-600/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              FINAL CLINICAL DIAGNOSIS • {currentCase.case_code}
            </span>
            <p className="text-base sm:text-lg font-bold">{currentCase.resolution.final_diagnosis}</p>
          </div>

          {/* Clinical Discussion */}
          <div className="text-xs sm:text-sm leading-relaxed space-y-2 whitespace-pre-line text-[var(--text-secondary)]">
            <h4 className="font-bold uppercase text-xs text-[#6D28D9] dark:text-violet-400">
              📖 Clinical Discussion:
            </h4>
            <p>{currentCase.resolution.clinical_discussion}</p>
          </div>

          {/* Teaching Points & Clinical Pitfalls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/75 dark:bg-emerald-950/30">
              <h4 className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400 mb-2">
                💡 High-Yield Teaching Points
              </h4>
              <ul className="space-y-2 text-xs leading-relaxed list-disc pl-4 text-[var(--text-ink)]">
                {currentCase.resolution.teaching_points.map((tp, i) => (
                  <li key={i}>{tp}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/75 dark:bg-rose-950/30">
              <h4 className="text-xs font-bold uppercase text-rose-700 dark:text-rose-400 mb-2">
                ⚠️ Clinical Pitfalls to Avoid
              </h4>
              <ul className="space-y-2 text-xs leading-relaxed list-disc pl-4 text-[var(--text-ink)]">
                {currentCase.resolution.clinical_pitfalls.map((pf, i) => (
                  <li key={i}>{pf}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Related Pulse Articles */}
          {relatedPulseArticles.length > 0 && (
            <div className="p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/65">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-[#6D28D9] dark:text-violet-400 flex items-center gap-1.5">
                  <span>🔗 Related Literature on NeuroPulse</span>
                </span>
                <Link
                  href="/neuropulse"
                  className="text-xs font-bold text-[#6D28D9] dark:text-violet-400 hover:underline"
                >
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
                    className="p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[#6D28D9] block transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                        style={{
                          backgroundColor: art.journal.badge_bg,
                          color: art.journal.badge_text,
                        }}
                      >
                        {art.journal.short_name}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{art.pub_date}</span>
                    </div>
                    <p className="text-xs font-bold leading-snug text-[var(--text-ink)]">{art.title}</p>
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
