"use client";

import React, { useMemo, useState } from "react";
import { Baby, Milk, Search, X } from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import { searchDrugs } from "@/lib/neurorx/omnibar";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrug, setSelectedDrug] = useState<DrugWithEffectiveStatus | null>(null);

  const searchedDrugs = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return drugs;
    return searchDrugs(trimmed.split(/\s+/), drugs).map((res) => ({
      drug: res.drug,
      effectiveStatus: res.effectiveStatus,
      hashMatches: res.hashMatches,
    }));
  }, [drugs, searchQuery]);

  const normalizedSubspecialty = normalizeGroup(selectedGroup);
  const groupDrugs = searchedDrugs.filter((d) => matchesSubspecialty(d, normalizedSubspecialty));

  return (
    <div className="space-y-5">
      {/* 1. Sub-tab Switcher (Pregnancy vs Lactation), Drug Search & Subspecialty Dropdown */}
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

        <div className="relative flex-1 min-w-[200px] order-last sm:order-none">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drug, brand, or class..."
            aria-label="Search drugs in Pregnancy and Lactation"
            className={`w-full min-h-[44px] pl-10 pr-9 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
              darkMode
                ? "bg-slate-900 border-slate-700/80 text-slate-100 placeholder:text-slate-500 hover:border-slate-600"
                : "bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 hover:border-slate-300 shadow-sm"
            }`}
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              title="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <SubspecialtySelect
          value={normalizedSubspecialty}
          onChange={(val) => setSelectedGroup(val)}
          drugs={searchedDrugs}
          darkMode={darkMode}
          className="w-full sm:w-auto shrink-0"
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
