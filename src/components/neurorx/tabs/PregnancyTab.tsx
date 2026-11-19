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
          className="inline-flex p-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]"
          role="tablist"
          aria-label="Pregnancy and Lactation sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "pregnancy"}
            onClick={() => setActiveSubTab("pregnancy")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "pregnancy"
                ? "bg-[var(--bg-surface)] text-[#2F855A] dark:text-emerald-300 shadow-2xs border border-[var(--border-hairline)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
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
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "lactation"
                ? "bg-[var(--bg-surface)] text-[#2F855A] dark:text-emerald-300 shadow-2xs border border-[var(--border-hairline)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
            }`}
          >
            <Milk className="w-4 h-4" />
            <span>Lactation</span>
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px] order-last sm:order-none">
          <Search
            className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2F855A] dark:text-emerald-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drug, brand, or class..."
            aria-label="Search drugs in Pregnancy and Lactation"
            className="w-full min-h-[38px] pl-10 pr-9 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)] hover:border-stone-400 transition-colors focus:outline-none focus:border-[#2F855A] focus:ring-2 focus:ring-[#2F855A]/20"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              title="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
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
