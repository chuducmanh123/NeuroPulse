"use client";

import React from "react";
import { ClinicalCase } from "@/types/clinicalCase";
import { NeuroImagingViewer } from "@/components/neurocase/NeuroImagingViewer";

interface ExamTabProps {
  darkMode: boolean;
  examStarted: boolean;
  examFinished: boolean;
  examTimeLeftSec: number;
  examCaseIds: string[];
  examCurrentIdx: number;
  examAnswers: Record<string, "A" | "B" | "C" | "D">;
  examSelectedSpecialties: string[];
  cases: ClinicalCase[];
  subspecialtyTabs: { label: string; value: string }[];
  onSetSelectedSpecialties: (setter: (prev: string[]) => string[]) => void;
  onSetExamStarted: (val: boolean) => void;
  onSetExamFinished: (val: boolean) => void;
  onSetExamCurrentIdx: (setter: (idx: number) => number) => void;
  onAnswerExamQuestion: (caseId: string, opt: "A" | "B" | "C" | "D") => void;
  onStartExam: () => void;
  onResetExam: () => void;
}

export function ExamTab({
  darkMode,
  examStarted,
  examFinished,
  examTimeLeftSec,
  examCaseIds,
  examCurrentIdx,
  examAnswers,
  examSelectedSpecialties,
  cases,
  subspecialtyTabs,
  onSetSelectedSpecialties,
  onSetExamFinished,
  onSetExamCurrentIdx,
  onAnswerExamQuestion,
  onStartExam,
  onResetExam,
}: ExamTabProps) {
  const eligibleExamCases = cases.filter(
    (c) =>
      (!c.status || c.status === "approved") &&
      (examSelectedSpecialties.length === 0 ||
        examSelectedSpecialties.includes(c.subspecialty) ||
        c.subspecialties?.some((s) => examSelectedSpecialties.includes(s)))
  );

  return (
    <div className="p-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] shadow-2xs transition-colors">
      {!examStarted ? (
        <div className="text-center max-w-2xl mx-auto py-6 space-y-6">
          <div className="space-y-2">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#6D28D9]/10 text-[#6D28D9] dark:text-violet-400 border border-[#6D28D9]/20 text-3xl">
              ⏱️
            </span>
            <h2 className="font-journal text-2xl font-bold text-[var(--text-ink)]">Exam Simulation Mode</h2>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed max-w-lg mx-auto">
              Timed clinical vignettes with a <strong className="text-[var(--text-ink)]">90-second per case</strong> countdown timer.
              Select one or multiple subspecialty domains below to customize your board exam block.
            </p>
          </div>

          {/* Subspecialty Domain Multi-Selection */}
          <div className="p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 text-left space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-[#6D28D9] dark:text-violet-400 flex items-center gap-1.5">
                <span>🎯</span>
                <span>
                  Subspecialty Domains (
                  {examSelectedSpecialties.length === 0
                    ? "All Domains Selected"
                    : `${examSelectedSpecialties.length} Selected`}
                  )
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSetSelectedSpecialties(() => [])}
                  className="text-[11px] font-bold text-[#6D28D9] dark:text-violet-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-[var(--text-muted)] text-xs">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const first = subspecialtyTabs.find((t) => t.value !== "All")?.value || "Vascular & Stroke";
                    onSetSelectedSpecialties(() => [first]);
                  }}
                  className="text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:underline"
                >
                  Reset to 1st
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {subspecialtyTabs
                .filter((t) => t.value !== "All")
                .map((tab) => {
                  const isChecked = examSelectedSpecialties.includes(tab.value);
                  const matchingCount = cases.filter(
                    (c) =>
                      (!c.status || c.status === "approved") &&
                      (c.subspecialty === tab.value || c.subspecialties?.includes(tab.value))
                  ).length;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        onSetSelectedSpecialties((prev) =>
                          prev.includes(tab.value) ? prev.filter((v) => v !== tab.value) : [...prev, tab.value]
                        );
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        isChecked
                          ? "bg-[#6D28D9] text-white border-[#6D28D9] shadow-2xs"
                          : "bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[#6D28D9]/50 hover:text-[var(--text-ink)]"
                      }`}
                    >
                      <span>{isChecked ? "☑" : "☐"}</span>
                      <span>{tab.label}</span>
                      <span className="text-[10px] opacity-75">({matchingCount})</span>
                    </button>
                  );
                })}
            </div>

            <p className="text-[11px] text-[var(--text-muted)] italic">
              * Available Board Questions matching your domain filter:{" "}
              <strong className="text-[var(--text-ink)]">{eligibleExamCases.length} cases</strong>
            </p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={eligibleExamCases.length === 0}
              onClick={onStartExam}
              className="px-6 py-3 rounded-xl text-sm font-black bg-[#6D28D9] text-white hover:bg-[#5B21B6] disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-colors"
            >
              Start Timed Simulation ({Math.min(5, eligibleExamCases.length)} Questions)
            </button>
          </div>
        </div>
      ) : examFinished ? (
        <div className="text-center max-w-xl mx-auto py-8 space-y-6">
          <div className="space-y-2">
            <span className="text-5xl">🏆</span>
            <h2 className="font-journal text-2xl sm:text-3xl font-bold text-[var(--text-ink)]">Exam Results</h2>
          </div>

          {(() => {
            const totalExam = examCaseIds.length;
            let correctCount = 0;
            examCaseIds.forEach((id) => {
              const c = cases.find((item) => item.id === id);
              if (c && examAnswers[id] === c.challenge.correct_option) {
                correctCount += 1;
              }
            });
            const pct = totalExam > 0 ? Math.round((correctCount / totalExam) * 100) : 0;

            return (
              <div className="space-y-4">
                <div
                  className={`p-6 rounded-2xl border ${
                    pct >= 70
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  <p className="text-4xl font-black mb-1">{pct}%</p>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {correctCount} / {totalExam} Questions Correct
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                    Question Breakdown:
                  </h4>
                  {examCaseIds.map((id, idx) => {
                    const c = cases.find((item) => item.id === id);
                    if (!c) return null;
                    const userAns = examAnswers[id];
                    const isRight = userAns === c.challenge.correct_option;
                    return (
                      <div
                        key={id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                          isRight
                            ? "bg-emerald-500/5 border-emerald-500/25 text-[var(--text-ink)]"
                            : "bg-rose-500/5 border-rose-500/25 text-[var(--text-ink)]"
                        }`}
                      >
                        <div>
                          <span className="font-bold mr-2">Q{idx + 1}:</span>
                          <span>{c.title}</span>
                        </div>
                        <span className={`font-black shrink-0 ml-2 ${isRight ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                          {isRight ? "✓ PASS" : `✕ (Answer: ${c.challenge.correct_option})`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={onResetExam}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-[#6D28D9] text-white hover:bg-[#5B21B6] transition-colors"
                >
                  Take Another Simulation
                </button>
              </div>
            );
          })()}
        </div>
      ) : (
        (() => {
          const currentExamCaseId = examCaseIds[examCurrentIdx];
          const currentExamCase = cases.find((c) => c.id === currentExamCaseId);
          if (!currentExamCase) return null;

          return (
            <div className="space-y-5">
              {/* Exam Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-hairline)]">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-[#6D28D9]/15 text-[#6D28D9] dark:text-violet-300 border border-[#6D28D9]/25">
                    Question {examCurrentIdx + 1} of {examCaseIds.length}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-muted)]">
                    {currentExamCase.subspecialty}
                  </span>
                </div>

                {/* Countdown Timer */}
                <div
                  className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-black flex items-center gap-1.5 ${
                    examTimeLeftSec <= 15
                      ? "bg-rose-500/20 text-rose-500 border-rose-500/40 animate-pulse"
                      : "bg-[var(--bg-subtle)] text-[var(--text-ink)] border-[var(--border-hairline)]"
                  }`}
                >
                  <span>⏱️</span>
                  <span>
                    {Math.floor(examTimeLeftSec / 60)}:
                    {(examTimeLeftSec % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Split View in Exam Mode when imaging is present */}
              <div
                className={
                  currentExamCase.presentation.imaging.length > 0
                    ? "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
                    : "space-y-5"
                }
              >
                {currentExamCase.presentation.imaging.length > 0 && (
                  <div className="lg:col-span-5 lg:sticky lg:top-20">
                    <NeuroImagingViewer
                      imagingList={currentExamCase.presentation.imaging}
                      isSolved={false}
                      darkMode={darkMode}
                    />
                  </div>
                )}

                <div
                  className={
                    currentExamCase.presentation.imaging.length > 0
                      ? "lg:col-span-7 space-y-4"
                      : "space-y-4"
                  }
                >
                  {/* Clinical Vignette */}
                  <div className="space-y-2 text-sm sm:text-[15px] leading-relaxed text-[var(--text-secondary)]">
                    <p>
                      {currentExamCase.presentation.history_of_present_illness}{" "}
                      {currentExamCase.presentation.neuro_exam}{" "}
                      {currentExamCase.presentation.key_labs_csf}
                    </p>
                    <p className="font-bold pt-1 text-[var(--text-ink)]">{currentExamCase.challenge.question}</p>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentExamCase.challenge.options.map((opt) => {
                      const isSelected = examAnswers[currentExamCase.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onAnswerExamQuestion(currentExamCase.id, opt.id)}
                          className={`p-3.5 rounded-xl border text-left text-xs font-bold transition-all flex items-start gap-2.5 ${
                            isSelected
                              ? "bg-[#6D28D9] text-white border-[#6D28D9] shadow-sm"
                              : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[#6D28D9]/50 hover:text-[var(--text-ink)]"
                          }`}
                        >
                          <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0 mt-0.5">
                            {opt.id}
                          </span>
                          <span>{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border-hairline)]">
                <button
                  type="button"
                  disabled={examCurrentIdx === 0}
                  onClick={() => onSetExamCurrentIdx((i) => Math.max(0, i - 1))}
                  className="px-4 py-2 rounded-lg text-xs font-bold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-ink)] disabled:opacity-40"
                >
                  ← Previous
                </button>

                {examCurrentIdx < examCaseIds.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => onSetExamCurrentIdx((i) => i + 1)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-[#6D28D9] hover:bg-[#5B21B6] text-white transition-colors"
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetExamFinished(true)}
                    className="px-5 py-2 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    ✓ Submit &amp; Grade Exam
                  </button>
                )}
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
