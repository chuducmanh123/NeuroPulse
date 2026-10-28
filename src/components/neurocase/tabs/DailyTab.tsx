"use client";

import React from "react";
import { ClinicalCase, CaseDifficulty, UserCaseProgress } from "@/types/clinicalCase";
import { Article } from "@/types/article";
import { CaseChallenge } from "@/components/neurocase/CaseChallenge";

interface DailyTabProps {
  currentCase: ClinicalCase;
  dailyChallengeCases: ClinicalCase[];
  approvedCases: ClinicalCase[];
  progressMap: Record<string, UserCaseProgress>;
  wrongAttemptsMap: Record<string, string[]>;
  darkMode: boolean;
  difficultyBadges: Record<CaseDifficulty, string>;
  formatChallengeDate: (dateStr: string) => string;
  onSelectCase: (caseId: string) => void;
  onSelectOption: (caseItem: ClinicalCase, optionId: string) => void;
  onNextChallenge: () => void;
  onResetCaseAttempt: (caseId: string) => void;
  onBrowseArchive: () => void;
  relatedPulseArticles?: Article[];
}

export function DailyTab({
  currentCase,
  dailyChallengeCases,
  approvedCases,
  progressMap,
  wrongAttemptsMap,
  darkMode,
  difficultyBadges,
  formatChallengeDate,
  onSelectCase,
  onSelectOption,
  onNextChallenge,
  onResetCaseAttempt,
  onBrowseArchive,
  relatedPulseArticles = [],
}: DailyTabProps) {
  return (
    <div className="space-y-6">
      {/* Quick Case Selector Strip */}
      <div
        className={`p-3 rounded-xl border flex items-center justify-between gap-2 overflow-x-auto ${
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          {dailyChallengeCases.slice(0, 7).map((c, idx) => {
            const prog = progressMap[c.id];
            const isSelected = c.id === currentCase.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCase(c.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                    : prog
                    ? prog.isCorrect
                      ? darkMode
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : darkMode
                      ? "bg-rose-950/60 text-rose-300 border-rose-800"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                    : darkMode
                    ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>{idx === 0 ? "⭐ Daily" : c.published_date}</span>
                {prog && <span>{prog.isCorrect ? "✓" : "✗"}</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onBrowseArchive}
          className="text-xs font-bold text-indigo-500 hover:underline shrink-0"
        >
          Browse Archive ({approvedCases.length}) →
        </button>
      </div>

      {/* MAIN NEJM-STYLE CLINICAL & IMAGING CHALLENGE CARD */}
      <article
        className={`rounded-2xl border shadow-sm overflow-hidden ${
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        {/* Centered Challenge Date Header */}
        <div
          className={`px-6 py-5 border-b text-center ${
            darkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/50"
          }`}
        >
          <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
              CLINICAL &amp; IMAGING CHALLENGE
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              {currentCase.subspecialty}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                difficultyBadges[currentCase.difficulty]
              }`}
            >
              {currentCase.difficulty}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
            {formatChallengeDate(currentCase.published_date)}
          </h2>
        </div>

        {/* Case Challenge (Shared Component) */}
        <CaseChallenge
          currentCase={currentCase}
          darkMode={darkMode}
          progressMap={progressMap}
          wrongAttemptsMap={wrongAttemptsMap}
          onSelectOption={onSelectOption}
          onNextChallenge={onNextChallenge}
          onResetAttempt={onResetCaseAttempt}
          relatedPulseArticles={relatedPulseArticles}
          showNextChallengeButton={true}
        />
      </article>
    </div>
  );
}
