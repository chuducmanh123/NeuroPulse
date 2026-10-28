"use client";

import React from "react";
import { ClinicalCase, CaseDifficulty, UserCaseProgress } from "@/types/clinicalCase";
import { Article } from "@/types/article";
import { CaseChallenge } from "@/components/neurocase/CaseChallenge";

interface ArchiveTabProps {
  archiveViewingCase: ClinicalCase | null;
  filteredArchiveCases: ClinicalCase[];
  archiveCurrentIdx: number;
  selectedSub: string;
  selectedDifficulty: string;
  selectedSolvedFilter: "All" | "Unsolved" | "Solved";
  searchQuery: string;
  subspecialtyTabs: { label: string; value: string }[];
  darkMode: boolean;
  difficultyBadges: Record<CaseDifficulty, string>;
  progressMap: Record<string, UserCaseProgress>;
  wrongAttemptsMap: Record<string, string[]>;
  archiveRelatedArticles?: Article[];
  getSpecialtyTheme: (subspecialty: string) => {
    borderLeft: string;
    cardBorder: string;
    cardBg: string;
    badge: string;
    accentText: string;
  };
  onSelectSub: (sub: string) => void;
  onSelectDifficulty: (diff: string) => void;
  onSelectSolvedFilter: (filter: "All" | "Unsolved" | "Solved") => void;
  onSearchQueryChange: (query: string) => void;
  onSelectCaseToView: (caseId: string | null) => void;
  onSelectOption: (caseItem: ClinicalCase, optionId: string) => void;
  onResetCaseAttempt: (caseId: string) => void;
}

export function ArchiveTab({
  archiveViewingCase,
  filteredArchiveCases,
  archiveCurrentIdx,
  selectedSub,
  selectedDifficulty,
  selectedSolvedFilter,
  searchQuery,
  subspecialtyTabs,
  darkMode,
  difficultyBadges,
  progressMap,
  wrongAttemptsMap,
  archiveRelatedArticles = [],
  getSpecialtyTheme,
  onSelectSub,
  onSelectDifficulty,
  onSelectSolvedFilter,
  onSearchQueryChange,
  onSelectCaseToView,
  onSelectOption,
  onResetCaseAttempt,
}: ArchiveTabProps) {
  if (archiveViewingCase) {
    return (
      <div className="space-y-6">
        {/* Archive Navigation & Back Header */}
        <div
          className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectCaseToView(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <span>←</span>
              <span>Back to Case Archive</span>
            </button>
            <span className="text-slate-400">|</span>
            <span className="text-xs font-black text-indigo-500">{archiveViewingCase.case_code}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
              {archiveViewingCase.subspecialty}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                difficultyBadges[archiveViewingCase.difficulty]
              }`}
            >
              {archiveViewingCase.difficulty}
            </span>
          </div>

          {/* Sequential Case Browsing within Filtered Archive */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={archiveCurrentIdx <= 0}
              onClick={() => {
                if (archiveCurrentIdx > 0) {
                  onSelectCaseToView(filteredArchiveCases[archiveCurrentIdx - 1].id);
                }
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              ← Prev Case
            </button>
            <span className="text-xs font-semibold text-slate-400">
              {archiveCurrentIdx >= 0 ? `${archiveCurrentIdx + 1} / ${filteredArchiveCases.length}` : ""}
            </span>
            <button
              type="button"
              disabled={archiveCurrentIdx >= filteredArchiveCases.length - 1}
              onClick={() => {
                if (archiveCurrentIdx < filteredArchiveCases.length - 1) {
                  onSelectCaseToView(filteredArchiveCases[archiveCurrentIdx + 1].id);
                }
              }}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Next Case →
            </button>
          </div>
        </div>

        {/* NEJM-STYLE CLINICAL & IMAGING CHALLENGE CARD (ARCHIVE MODE) */}
        <article
          className={`rounded-2xl border shadow-sm overflow-hidden ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`px-6 py-5 border-b text-center ${
              darkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/50"
            }`}
          >
            <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
                CASE ARCHIVE CHALLENGE
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                {archiveViewingCase.subspecialty}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  difficultyBadges[archiveViewingCase.difficulty]
                }`}
              >
                {archiveViewingCase.difficulty}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
              {archiveViewingCase.title}
            </h2>
          </div>

          {/* Case Challenge (Shared Component for Archive View) */}
          <CaseChallenge
            currentCase={archiveViewingCase}
            darkMode={darkMode}
            progressMap={progressMap}
            wrongAttemptsMap={wrongAttemptsMap}
            onSelectOption={onSelectOption}
            onNextChallenge={() => {
              if (archiveCurrentIdx >= 0 && archiveCurrentIdx < filteredArchiveCases.length - 1) {
                onSelectCaseToView(filteredArchiveCases[archiveCurrentIdx + 1].id);
              } else {
                onSelectCaseToView(null);
              }
            }}
            onResetAttempt={onResetCaseAttempt}
            relatedPulseArticles={archiveRelatedArticles}
            showNextChallengeButton={true}
          />
        </article>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className={`p-4 rounded-2xl border space-y-4 ${
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-wrap gap-1.5">
          {subspecialtyTabs.map((tab) => {
            const active = selectedSub === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onSelectSub(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-xs"
                    : darkMode
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => onSelectDifficulty(e.target.value)}
              aria-label="Filter by difficulty"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <option value="All">All Difficulty Levels</option>
              <option value="Resident">Resident</option>
              <option value="Fellow">Fellow</option>
              <option value="Attending">Attending</option>
            </select>

            <select
              value={selectedSolvedFilter}
              onChange={(e) => onSelectSolvedFilter(e.target.value as typeof selectedSolvedFilter)}
              aria-label="Filter by completion status"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-slate-200"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Unsolved">Unsolved Only</option>
              <option value="Solved">Completed</option>
            </select>
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search symptoms, syndromes, case ID..."
            className={`px-3 py-1.5 rounded-lg text-xs border w-full sm:w-64 ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredArchiveCases.map((c) => {
          const prog = progressMap[c.id];
          const theme = getSpecialtyTheme(c.subspecialty);
          return (
            <div
              key={c.id}
              onClick={() => onSelectCaseToView(c.id)}
              className={`p-5 rounded-2xl border border-l-4 cursor-pointer transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                theme.borderLeft
              } ${theme.cardBorder} ${theme.cardBg}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500">
                      {c.case_code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${theme.badge}`}>
                      {c.subspecialty}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        difficultyBadges[c.difficulty]
                      }`}
                    >
                      {c.difficulty}
                    </span>
                    {c.is_daily_challenge && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        ⭐ Daily ({c.published_date})
                      </span>
                    )}
                  </div>

                  {prog ? (
                    <span
                      className={`text-xs font-black ${
                        prog.isCorrect ? "text-emerald-500" : "text-rose-500"
                      }`}
                    >
                      {prog.isCorrect ? "✓ Solved" : "✗ Review"}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">Unsolved</span>
                  )}
                </div>

                <h3 className="text-sm font-black mb-1.5 leading-snug">{c.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {c.presentation.chief_complaint}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">{c.presentation.demographics}</span>
                <span className={`font-black flex items-center gap-1 ${theme.accentText}`}>
                  <span>Solve Case</span>
                  <span>→</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
