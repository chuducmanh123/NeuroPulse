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
    <div
      className={`p-6 rounded-2xl border ${
        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      }`}
    >
      {!examStarted ? (
        <div className="text-center max-w-2xl mx-auto py-6 space-y-6">
          <div className="space-y-2">
            <span className="text-4xl">⏱️</span>
            <h2 className="text-xl font-black">Exam Simulation Mode</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
              Timed clinical vignettes with a <strong>90-second per case</strong> countdown timer.
              Select one or multiple subspecialty domains below to customize your board exam block.
            </p>
          </div>

          {/* Subspecialty Domain Multi-Selection */}
          <div
            className={`p-4 rounded-2xl border text-left space-y-3 ${
              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50/80 border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-indigo-500 flex items-center gap-1.5">
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
                  className="text-[11px] font-bold text-indigo-500 hover:underline"
                >
                  Select All
                </button>
                <span className="text-slate-400 text-xs">|</span>
                <button
                  type="button"
                  onClick={() => {
                    const first = subspecialtyTabs.find((t) => t.value !== "All")?.value || "Vascular & Stroke";
                    onSetSelectedSpecialties(() => [first]);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:underline"
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
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : darkMode
                          ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span>{isChecked ? "☑" : "☐"}</span>
                      <span>{tab.label}</span>
                      <span className="text-[10px] opacity-75">({matchingCount})</span>
                    </button>
                  );
                })}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              * Available Board Questions matching your domain filter:{" "}
              <strong>{eligibleExamCases.length} cases</strong>
            </p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              disabled={eligibleExamCases.length === 0}
              onClick={onStartExam}
              className="px-6 py-3 rounded-xl text-sm font-black bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              Start Timed Simulation ({Math.min(5, eligibleExamCases.length)} Questions)
            </button>
          </div>
        </div>
      ) : examFinished ? (
        <div className="text-center max-w-xl mx-auto py-8 space-y-6">
          <div className="space-y-2">
            <span className="text-5xl">🏆</span>
            <h2 className="text-2xl font-black">Exam Results</h2>
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
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  }`}
                >
                  <p className="text-4xl font-black mb-1">{pct}%</p>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {correctCount} / {totalExam} Questions Correct
                  </p>
                </div>

                <div className="space-y-2 text-left">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
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
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-rose-500/5 border-rose-500/20"
                        }`}
                      >
                        <div>
                          <span className="font-bold mr-2">Q{idx + 1}:</span>
                          <span>{c.title}</span>
                        </div>
                        <span className="font-black shrink-0 ml-2">
                          {isRight ? "✓ PASS" : `✕ (Answer: ${c.challenge.correct_option})`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={onResetExam}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700"
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
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white">
                    Question {examCurrentIdx + 1} of {examCaseIds.length}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {currentExamCase.subspecialty}
                  </span>
                </div>

                {/* Countdown Timer */}
                <div
                  className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-black flex items-center gap-1.5 ${
                    examTimeLeftSec <= 15
                      ? "bg-rose-500/20 text-rose-500 border-rose-500/40 animate-pulse"
                      : "bg-slate-800 text-slate-200 border-slate-700"
                  }`}
                >
                  <span>⏱️</span>
                  <span>
                    {Math.floor(examTimeLeftSec / 60)}:
                    {(examTimeLeftSec % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Imaging Viewer in Exam Mode */}
              {currentExamCase.presentation.imaging.length > 0 && (
                <NeuroImagingViewer
                  imagingList={currentExamCase.presentation.imaging}
                  isSolved={false}
                  darkMode={darkMode}
                />
              )}

              {/* Clinical Vignette */}
              <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
                <p>
                  {currentExamCase.presentation.history_of_present_illness}{" "}
                  {currentExamCase.presentation.neuro_exam}{" "}
                  {currentExamCase.presentation.key_labs_csf}
                </p>
                <p className="font-bold pt-1">{currentExamCase.challenge.question}</p>
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
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : darkMode
                          ? "bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-800"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
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

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={examCurrentIdx === 0}
                  onClick={() => onSetExamCurrentIdx((i) => Math.max(0, i - 1))}
                  className="px-4 py-2 rounded-lg text-xs font-bold border disabled:opacity-40"
                >
                  ← Previous
                </button>

                {examCurrentIdx < examCaseIds.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => onSetExamCurrentIdx((i) => i + 1)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white"
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetExamFinished(true)}
                    className="px-5 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white"
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
