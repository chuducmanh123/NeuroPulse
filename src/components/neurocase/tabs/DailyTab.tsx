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
    <div className="space-y-4">
      {/* Quick Case Selector Strip */}
      <div className="px-4 py-2.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          {dailyChallengeCases.slice(0, 7).map((c, idx) => {
            const prog = progressMap[c.id];
            const isSelected = c.id === currentCase.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCase(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                  isSelected
                    ? "bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs"
                    : prog
                    ? prog.isCorrect
                      ? darkMode
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : darkMode
                      ? "bg-rose-950/60 text-rose-300 border-rose-800"
                      : "bg-rose-50 text-rose-800 border-rose-200"
                    : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                <span>{idx === 0 ? "★ Daily" : c.published_date}</span>
                {prog && <span>{prog.isCorrect ? "✓" : "✗"}</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onBrowseArchive}
          className="text-xs font-bold text-[#6D28D9] dark:text-violet-400 hover:underline shrink-0"
        >
          Browse Archive ({approvedCases.length}) →
        </button>
      </div>

      {/* MAIN CLINICAL & IMAGING CHALLENGE CARD */}
      <article className="rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-xs overflow-hidden">
        {/* Centered Challenge Date Header */}
        <div className="px-5 py-4 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#B91C1C] dark:text-rose-400">
              CLINICAL &amp; IMAGING CHALLENGE
            </span>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="text-[11px] font-bold text-[#6D28D9] dark:text-violet-400">
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
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-ink)]">
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
