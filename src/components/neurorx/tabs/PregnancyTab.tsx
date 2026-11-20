"use client";

import React, { useMemo, useState } from "react";
import { Baby, ChevronRight, Milk, Pill, Search, X } from "lucide-react";
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
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
      {/* Left Column: Mode Switcher, Search, Subspecialty Filter & Drug Names Only */}
      <aside className="md:col-span-4 lg:col-span-3 md:sticky md:top-20">
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-2xs flex flex-col gap-3">
          {/* Pregnancy vs Lactation Switcher */}
          <div
            className="grid grid-cols-2 p-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]"
            role="tablist"
            aria-label="Pregnancy and Lactation sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === "pregnancy"}
              onClick={() => setActiveSubTab("pregnancy")}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "pregnancy"
                  ? "bg-[var(--bg-surface)] text-[#2F855A] dark:text-emerald-300 shadow-2xs border border-[var(--border-hairline)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
              }`}
            >
              <Baby className="w-3.5 h-3.5" />
              <span>Pregnancy</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubTab === "lactation"}
              onClick={() => setActiveSubTab("lactation")}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "lactation"
                  ? "bg-[var(--bg-surface)] text-[#2F855A] dark:text-emerald-300 shadow-2xs border border-[var(--border-hairline)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
              }`}
            >
              <Milk className="w-3.5 h-3.5" />
              <span>Lactation</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#2F855A] dark:text-emerald-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drug, brand, or class..."
              aria-label="Search drugs in Pregnancy and Lactation"
              className="w-full min-h-[38px] pl-9 pr-8 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-xs font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)] hover:border-stone-400 transition-colors focus:outline-none focus:border-[#2F855A] focus:ring-2 focus:ring-[#2F855A]/20"
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                title="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Subspecialty Filter */}
          <SubspecialtySelect
            value={normalizedSubspecialty}
            onChange={(val) => setSelectedGroup(val)}
            drugs={searchedDrugs}
            darkMode={darkMode}
            className="w-full"
          />

          {/* Drug Names Only List (Desktop/iPad) */}
          <div className="hidden md:block border-t border-[var(--border-hairline)] pt-2.5">
            <div className="px-1 pb-1.5 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Medications</span>
              <span>{groupDrugs.length}</span>
            </div>

            {groupDrugs.length === 0 ? (
              <div className="py-8 px-3 text-center">
                <Pill className="w-6 h-6 mx-auto text-[var(--text-muted)] mb-1.5" />
                <p className="text-xs font-semibold text-[var(--text-ink)]">
                  No drugs found
                </p>
              </div>
            ) : (
              <div className="max-h-[calc(100vh-340px)] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {groupDrugs.map((item) => {
                  const tallManName = item.drug.tall_man?.value || item.drug.generic_name;
                  const isSelected = selectedDrug?.drug.id === item.drug.id;

                  return (
                    <button
                      key={item.drug.id}
                      type="button"
                      onClick={() => setSelectedDrug(item)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-[#2F855A] text-white font-semibold shadow-2xs"
                          : "font-medium text-[var(--text-ink)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      <span className="truncate">{tallManName}</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? "text-white/90" : "text-[var(--text-muted)] opacity-60"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Right Column: Selected Drug Reproductive Detail (Inline on md+) or Board Overview */}
      <section className="md:col-span-8 lg:col-span-9 min-w-0">
        {selectedDrug ? (
          <>
            <div className="hidden md:block">
              <ReproDetail
                inline
                mode={activeSubTab}
                drugItem={selectedDrug}
                sources={sources}
                onClose={() => setSelectedDrug(null)}
                darkMode={darkMode}
              />
            </div>
            <div className="md:hidden">
              <ReproBoard
                mode={activeSubTab}
                drugs={groupDrugs}
                sources={sources}
                onSelectDrug={setSelectedDrug}
                darkMode={darkMode}
              />
              <ReproDetail
                mode={activeSubTab}
                drugItem={selectedDrug}
                sources={sources}
                onClose={() => setSelectedDrug(null)}
                darkMode={darkMode}
              />
            </div>
          </>
        ) : (
          <ReproBoard
            mode={activeSubTab}
            drugs={groupDrugs}
            sources={sources}
            onSelectDrug={setSelectedDrug}
            darkMode={darkMode}
          />
        )}
      </section>
    </div>
  );
}
