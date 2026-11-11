"use client";

import React, { useState } from "react";
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
      {novelDrugs.length > 0 && (
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
