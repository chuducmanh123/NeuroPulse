"use client";

import React, { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Search, Sparkles, X } from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import { searchDrugs } from "@/lib/neurorx/omnibar";
import type { Source } from "@/types/neurorx";
import { NovelCard } from "./NovelCard";
import {
  SubspecialtySelect,
  matchesSubspecialty,
  type SubspecialtyFilter,
} from "./SubspecialtySelect";

interface NovelTabProps {
  drugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  darkMode?: boolean;
}

export function NovelTab({
  drugs,
  sources = [],
  darkMode = false,
}: NovelTabProps) {
  // Drugs with a novel block
  const novelDrugs = useMemo(
    () => drugs.filter((d) => Boolean(d.drug.novel)),
    [drugs]
  );

  const [activeSubspecialty, setActiveSubspecialty] = useState<SubspecialtyFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDrugId, setSelectedDrugId] = useState<string | null>(null);

  const searchedDrugs = useMemo(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return novelDrugs;
    return searchDrugs(trimmed.split(/\s+/), novelDrugs).map((res) => ({
      drug: res.drug,
      effectiveStatus: res.effectiveStatus,
      hashMatches: res.hashMatches,
    }));
  }, [novelDrugs, searchQuery]);

  const displayedDrugs = useMemo(
    () =>
      searchedDrugs.filter((d) =>
        matchesSubspecialty(d, activeSubspecialty)
      ),
    [searchedDrugs, activeSubspecialty]
  );

  const selectedDrug = useMemo(() => {
    if (!selectedDrugId) return null;
    return novelDrugs.find((d) => d.drug.id === selectedDrugId) ?? null;
  }, [novelDrugs, selectedDrugId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
      {/* Left Column: Search, Subspecialty Filter & Therapy Names */}
      <aside
        className={`md:col-span-4 lg:col-span-3 md:sticky md:top-20 ${
          selectedDrug ? "hidden md:block" : "block"
        }`}
      >
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-2xs flex flex-col gap-3">
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
              placeholder="Search therapy, brand, or class..."
              aria-label="Search novel therapies"
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
            value={activeSubspecialty}
            onChange={setActiveSubspecialty}
            drugs={searchedDrugs}
            darkMode={darkMode}
            hideEmpty
            className="w-full"
          />

          {/* Therapy Names List */}
          <div className="border-t border-[var(--border-hairline)] pt-2.5">
            <div className="px-1 pb-1.5 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Novel Therapies</span>
              <span>{displayedDrugs.length}</span>
            </div>

            {displayedDrugs.length === 0 ? (
              <div className="py-8 px-3 text-center">
                <Sparkles className="w-6 h-6 mx-auto text-[var(--text-muted)] mb-1.5" />
                <p className="text-xs font-semibold text-[var(--text-ink)]">
                  No therapies found
                </p>
              </div>
            ) : (
              <div className="max-h-[58vh] md:max-h-[calc(100vh-290px)] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {displayedDrugs.map((item) => {
                  const tallManName = item.drug.tall_man?.value || item.drug.generic_name;
                  const isSelected = selectedDrug?.drug.id === item.drug.id;

                  return (
                    <button
                      key={item.drug.id}
                      type="button"
                      onClick={() => setSelectedDrugId(item.drug.id)}
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

      {/* Right Column: Selected Novel Therapy Detail */}
      <section
        className={`md:col-span-8 lg:col-span-9 min-w-0 ${
          selectedDrug ? "block" : "hidden md:block"
        }`}
      >
        {selectedDrug ? (
          <div className="space-y-4 sm:space-y-5">
            <button
              type="button"
              onClick={() => setSelectedDrugId(null)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-ink)] shadow-2xs transition-all min-h-[38px] sm:min-h-[42px] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Back to novel therapies</span>
            </button>

            <NovelCard
              drugItem={selectedDrug}
              sources={sources}
              darkMode={darkMode}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70 p-12 text-center">
            <Sparkles className="w-9 h-9 mx-auto text-[#2F855A] dark:text-emerald-400 mb-3 opacity-80" />
            <h3 className="text-sm font-bold text-[var(--text-ink)]">
              Select a novel therapy from the left list
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
              Choose any therapy to view regulatory approvals, patient eligibility criteria, administration protocols, monitoring timelines, and pre-treatment screenings.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
