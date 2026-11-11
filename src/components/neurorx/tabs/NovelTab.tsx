"use client";

import React, { useState } from "react";
import { Sparkles, Info, BookOpen } from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import type { Source, Subspecialty } from "@/types/neurorx";
import { NovelCard } from "./NovelCard";

interface NovelTabProps {
  drugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  darkMode?: boolean;
}

const SUBSPECIALTY_LABELS: Record<string, string> = {
  stroke: "Stroke & Cerebrovascular",
  epilepsy: "Epilepsy & Seizures",
  movement_disorders: "Movement Disorders & Parkinson's",
  headache: "Headache & Migraine Biologics",
  neuroimmunology: "Neuroimmunology & Multiple Sclerosis",
  neuromuscular: "Neuromuscular & Myasthenia",
  neuro_oncology: "Neuro-Oncology",
  neurocritical_care: "Neurocritical Care",
  dementia: "Dementia & Cognitive Biologics (AD)",
  general_neurology: "General Neurology",
};

export function NovelTab({
  drugs,
  sources = [],
  darkMode = false,
}: NovelTabProps) {
  // Drugs with a novel block
  const novelDrugs = drugs.filter((d) => Boolean(d.drug.novel));

  // Extract available subspecialties from novel drugs
  const subspecialties = Array.from(
    new Set(novelDrugs.flatMap((d) => d.drug.subspecialties))
  );

  const [activeSubspecialty, setActiveSubspecialty] = useState<string>("all");

  const displayedDrugs =
    activeSubspecialty === "all"
      ? novelDrugs
      : novelDrugs.filter((d) => d.drug.subspecialties.includes(activeSubspecialty as Subspecialty));

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <span>Novel Neuro-Therapeutics & Monoclonal Protocols</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Administration schedules, ARIA MRI safety monitoring timelines, and genomic/antibody screening prerequisites.
          </p>
        </div>
      </div>

      {/* 2. Empty State when no novel records in current wave */}
      {novelDrugs.length === 0 ? (
        <div
          className={`p-10 rounded-2xl border text-center transition-colors ${
            darkMode
              ? "bg-slate-900/40 border-slate-800"
              : "bg-white border-slate-200/80 shadow-sm"
          }`}
        >
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Novel therapy records arrive in Data Waves 2–3
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Wave 1 encompasses core acute stroke, antithrombotic, and acute ASM therapies. Anti-amyloid monoclonal antibodies (e.g. lecanemab, donanemab), FcRn blockers (efgartigimod), and CGRP antagonists will be ingested in subsequent data waves.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subspecialty Filter Pills */}
          {subspecialties.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveSubspecialty("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  activeSubspecialty === "all"
                    ? darkMode
                      ? "bg-indigo-950 border-indigo-600 text-indigo-300"
                      : "bg-indigo-50 border-indigo-300 text-indigo-700"
                    : darkMode
                    ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({novelDrugs.length})
              </button>

              {subspecialties.map((sub) => {
                const count = novelDrugs.filter((d) => d.drug.subspecialties.includes(sub as Subspecialty)).length;
                const isSelected = activeSubspecialty === sub;
                const label = SUBSPECIALTY_LABELS[sub] || sub;

                return (
                  <button
                    key={sub}
                    onClick={() => setActiveSubspecialty(sub)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                      isSelected
                        ? darkMode
                          ? "bg-indigo-950 border-indigo-600 text-indigo-300"
                          : "bg-indigo-50 border-indigo-300 text-indigo-700"
                        : darkMode
                        ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                        : "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{label}</span>
                    <span className="ml-1.5 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Cards List */}
          <div className="space-y-5">
            {displayedDrugs.map((drugItem) => (
              <NovelCard
                key={drugItem.drug.id}
                drugItem={drugItem}
                sources={sources}
                darkMode={darkMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
