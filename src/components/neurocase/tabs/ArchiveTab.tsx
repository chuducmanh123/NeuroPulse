"use client";

import React from "react";
import { ChevronRight, Layers, Search, X } from "lucide-react";
import { ClinicalCase, CaseDifficulty, UserCaseProgress } from "@/types/clinicalCase";
import { Article } from "@/types/article";
import { CaseChallenge } from "@/components/neurocase/CaseChallenge";
import { CustomSelect } from "@/components/ecosystem/CustomSelect";

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
  onSelectSub,
  onSelectDifficulty,
  onSelectSolvedFilter,
  onSearchQueryChange,
  onSelectCaseToView,
  onSelectOption,
  onResetCaseAttempt,
}: ArchiveTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
      {/* Left Column: Search, Subspecialty/Filters & Case Titles Only */}
      <aside
        className={`md:col-span-4 lg:col-span-3 md:sticky md:top-20 ${
          archiveViewingCase ? "hidden md:block" : "block"
        }`}
      >
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-2xs flex flex-col gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6D28D9] dark:text-violet-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search cases, ID..."
              aria-label="Search clinical cases"
              className="w-full min-h-[38px] pl-9 pr-8 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-xs font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#6D28D9]"
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subspecialty Dropdown */}
          <CustomSelect
            value={selectedSub}
            onChange={onSelectSub}
            options={subspecialtyTabs.map((t) => ({ value: t.value, label: t.label }))}
            ariaLabel="Filter by subspecialty"
            darkMode={darkMode}
            accent="teal"
            compact={true}
            className="w-full"
            icon={<Layers className="w-3.5 h-3.5 text-[#6D28D9] dark:text-violet-400" />}
          />

          {/* Difficulty & Completion Filters */}
          <div className="grid grid-cols-2 gap-2">
            <CustomSelect
              value={selectedDifficulty}
              onChange={onSelectDifficulty}
              options={[
                { value: "All", label: "All Levels" },
                { value: "Resident", label: "Resident" },
                { value: "Fellow", label: "Fellow" },
                { value: "Attending", label: "Attending" },
              ]}
              ariaLabel="Filter by difficulty"
              darkMode={darkMode}
              accent="teal"
              compact={true}
              className="w-full"
            />

            <CustomSelect
              value={selectedSolvedFilter}
              onChange={(val) => onSelectSolvedFilter(val as typeof selectedSolvedFilter)}
              options={[
                { value: "All", label: "All Status" },
                { value: "Unsolved", label: "Unsolved" },
                { value: "Solved", label: "Solved" },
              ]}
              ariaLabel="Filter by completion status"
              darkMode={darkMode}
              accent="teal"
              align="right"
              compact={true}
              className="w-full"
            />
          </div>

          {/* Case Names List */}
          <div className="border-t border-[var(--border-hairline)] pt-2.5">
            <div className="px-1 pb-1.5 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Clinical Cases</span>
              <span>{filteredArchiveCases.length}</span>
            </div>

            {filteredArchiveCases.length === 0 ? (
              <div className="py-8 px-3 text-center">
                <p className="text-xs font-semibold text-[var(--text-ink)]">
                  No cases match filters
                </p>
              </div>
            ) : (
              <div className="max-h-[58vh] md:max-h-[calc(100vh-335px)] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {filteredArchiveCases.map((c) => {
                  const isSelected = archiveViewingCase?.id === c.id;
                  const prog = progressMap[c.id];

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectCaseToView(c.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-[#6D28D9] text-white font-semibold shadow-2xs"
                          : "font-medium text-[var(--text-ink)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      <span className="truncate">{c.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {prog && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isSelected
                                ? "bg-white"
                                : prog.isCorrect
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                            title={prog.isCorrect ? "Solved" : "Reviewed"}
                          />
                        )}
                        <ChevronRight
                          className={`w-3.5 h-3.5 ${
                            isSelected ? "text-white/90" : "text-[var(--text-muted)] opacity-60"
                          }`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Right Column: Selected Case Challenge */}
      <section
        className={`md:col-span-8 lg:col-span-9 min-w-0 ${
          archiveViewingCase ? "block" : "hidden md:block"
        }`}
      >
        {archiveViewingCase ? (
          <div className="flex flex-col gap-5">
            {/* Archive Navigation & Back Header */}
            <div className="p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectCaseToView(null)}
                  className="md:hidden px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#6D28D9] text-white hover:bg-[#5B21B6] flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span>←</span>
                  <span>Back to Cases</span>
                </button>
                <span className="text-xs font-bold text-[#6D28D9] dark:text-violet-400">
                  {archiveViewingCase.case_code}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
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
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  ← Prev Case
                </button>
                <span className="text-xs font-semibold text-[var(--text-muted)]">
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
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  Next Case →
                </button>
              </div>
            </div>

            {/* CLINICAL & IMAGING CHALLENGE CARD (ARCHIVE MODE) */}
            <article className="rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-xs overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 text-center">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#B91C1C] dark:text-rose-400">
                    CASE ARCHIVE CHALLENGE
                  </span>
                  <span className="text-[var(--text-muted)]">•</span>
                  <span className="text-[11px] font-bold text-[#6D28D9] dark:text-violet-400">
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
                <h2 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-ink)]">
                  {archiveViewingCase.title}
                </h2>
              </div>

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
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70 p-12 text-center">
            <Layers className="w-9 h-9 mx-auto text-[#6D28D9] dark:text-violet-400 mb-3 opacity-80" />
            <h3 className="text-sm font-bold text-[var(--text-ink)]">
              Select a clinical case from the left list
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
              Filter by subspecialty, difficulty, or completion status, then click any case title to open its imaging and clinical challenge.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
