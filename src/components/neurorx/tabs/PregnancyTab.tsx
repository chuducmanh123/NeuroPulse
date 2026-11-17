"use client";

import React, { useState } from "react";
import { Baby, Milk } from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import type { Source, Subspecialty } from "@/types/neurorx";
import { ReproBoard } from "./ReproBoard";
import { ReproDetail } from "./ReproDetail";
import {
  SubspecialtySelect,
  matchesSubspecialty,
  type SubspecialtyFilter,
} from "./SubspecialtySelect";

interface PregnancyTabProps {
  drugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  darkMode?: boolean;
}

export type ReproSubspecialty = "all" | Subspecialty;

// Backward compatibility alias for legacy imports
export type ReproDiseaseGroup = ReproSubspecialty | "migraine" | "ms_nmosd" | "myasthenia";

function normalizeGroup(group: ReproDiseaseGroup): SubspecialtyFilter {
  if (group === "migraine") return "headache";
  if (group === "ms_nmosd") return "neuroimmunology";
  if (group === "myasthenia") return "neuromuscular";
  return group;
}

export function PregnancyTab({
  drugs,
  sources = [],
  darkMode = false,
}: PregnancyTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pregnancy" | "lactation">("pregnancy");
  const [selectedGroup, setSelectedGroup] = useState<ReproDiseaseGroup>("all");
  const [selectedDrug, setSelectedDrug] = useState<DrugWithEffectiveStatus | null>(null);

  const normalizedSubspecialty = normalizeGroup(selectedGroup);
  const groupDrugs = drugs.filter((d) => matchesSubspecialty(d, normalizedSubspecialty));

  return (
    <div className="space-y-5">
      {/* 1. Sub-tab Switcher (Pregnancy vs Lactation) & Subspecialty Dropdown */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={`inline-flex p-1 rounded-xl border ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100/80 border-slate-200"
          }`}
          role="tablist"
          aria-label="Pregnancy and Lactation sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "pregnancy"}
            onClick={() => setActiveSubTab("pregnancy")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "pregnancy"
                ? darkMode
                  ? "bg-rose-950/70 text-rose-300 shadow-sm border border-rose-800/60"
                  : "bg-white text-rose-700 shadow-sm border border-rose-200/80"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Baby className="w-4 h-4" />
            <span>Pregnancy</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "lactation"}
            onClick={() => setActiveSubTab("lactation")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "lactation"
                ? darkMode
                  ? "bg-amber-950/70 text-amber-300 shadow-sm border border-amber-800/60"
                  : "bg-white text-amber-700 shadow-sm border border-amber-200/80"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Milk className="w-4 h-4" />
            <span>Lactation</span>
          </button>
        </div>

        <SubspecialtySelect
          value={normalizedSubspecialty}
          onChange={(val) => setSelectedGroup(val)}
          drugs={drugs}
          darkMode={darkMode}
          className="w-full sm:w-auto"
        />
      </div>

      {/* 2. Repro Board */}
      <ReproBoard
        mode={activeSubTab}
        drugs={groupDrugs}
        sources={sources}
        onSelectDrug={setSelectedDrug}
        darkMode={darkMode}
      />

      {/* 3. Drug Detail Modal */}
      {selectedDrug && (
        <ReproDetail
          mode={activeSubTab}
          drugItem={selectedDrug}
          sources={sources}
          onClose={() => setSelectedDrug(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
