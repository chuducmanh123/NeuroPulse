"use client";

import React, { useMemo, useState } from "react";
import {
  Filter,
  Layers,
  Search,
  X,
} from "lucide-react";
import { CustomSelect } from "@/components/ecosystem/CustomSelect";
import { DrawLoader } from "@/components/ecosystem/DrawLoader";
import { SUBSPECIALTY_LIST } from "@/constants/subspecialties";
import type { ScaleKind, ScaleWithEffectiveStatus } from "@/types/neurocalc";

type QuickFilter = "ALL" | "GUIDES" | "VERIFIED" | "DRAFT";

interface ScaleDirectoryProps {
  scales: ScaleWithEffectiveStatus[];
  selectedKind: "all" | ScaleKind;
  onResetKind: () => void;
  onSelectScale: (slug: string) => void;
  isLoading: boolean;
  isAdmin: boolean;
  darkMode: boolean;
}

const KIND_LABELS: Record<ScaleKind, string> = {
  point_sum: "Point Scale",
  ordinal_grade: "Ordinal Grade",
  formula: "Bedside Formula",
};

const QUICK_FILTER_OPTIONS: Array<{ value: QuickFilter; label: string }> = [
  { value: "ALL", label: "All Scales" },
  { value: "GUIDES", label: "With Guides" },
  { value: "VERIFIED", label: "Verified" },
  { value: "DRAFT", label: "Draft" },
];

interface SubspecialtyTheme {
  borderLeft: string;
  cardBg: string;
  cardBorder: string;
  badge: string;
}

function getSubspecialtyTheme(subspecialty: string | undefined): SubspecialtyTheme {
  switch (subspecialty) {
    case "Stroke":
      return {
        borderLeft: "border-l-4 border-l-cyan-600",
        cardBg: "bg-[var(--bg-surface)]",
        cardBorder:
          "border-[var(--border-hairline)] hover:border-cyan-400 dark:hover:border-cyan-600",
        badge:
          "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-200 dark:border-cyan-800",
      };
    case "Neurocritical Care":
      return {
        borderLeft: "border-l-4 border-l-rose-500",
        cardBg: "bg-[var(--bg-surface)]",
        cardBorder:
          "border-[var(--border-hairline)] hover:border-rose-400 dark:hover:border-rose-600",
        badge:
          "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-200 dark:border-rose-800",
      };
    case "Epilepsy":
      return {
        borderLeft: "border-l-4 border-l-indigo-500",
        cardBg: "bg-[var(--bg-surface)]",
        cardBorder:
          "border-[var(--border-hairline)] hover:border-indigo-400 dark:hover:border-indigo-600",
        badge:
          "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-800",
      };
    case "Neuromuscular":
      return {
        borderLeft: "border-l-4 border-l-blue-500",
        cardBg: "bg-[var(--bg-surface)]",
        cardBorder:
          "border-[var(--border-hairline)] hover:border-blue-400 dark:hover:border-blue-600",
        badge:
          "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800",
      };
    case "Movement Disorders":
      return {
        borderLeft: "border-l-4 border-l-teal-600",
        cardBg: "bg-[var(--bg-surface)]",
        cardBorder:
          "border-[var(--border-hairline)] hover:border-teal-400 dark:hover:border-teal-600",
        badge:
          "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-200 dark:border-teal-800",
      };
    default:
      return {
        borderLeft: "border-l-4 border-l-slate-500",
        cardBg: "bg-[var(--bg-surface)]",
        cardBorder:
          "border-[var(--border-hairline)] hover:border-slate-400 dark:hover:border-slate-600",
        badge:
          "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
      };
  }
}

export function ScaleDirectory({
  scales,
  selectedKind,
  onResetKind,
  onSelectScale,
  isLoading,
  isAdmin,
  darkMode,
}: ScaleDirectoryProps) {
  const [query, setQuery] = useState("");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState<string>(
    "All Subspecialties"
  );
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ALL");

  const subspecialtyCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of scales) {
      if (selectedKind !== "all" && entry.scale.metadata.kind !== selectedKind) {
        continue;
      }
      for (const sub of entry.scale.metadata.subspecialties) {
        counts.set(sub, (counts.get(sub) ?? 0) + 1);
      }
    }
    return counts;
  }, [scales, selectedKind]);

  const kindFilteredTotal = useMemo(() => {
    if (selectedKind === "all") return scales.length;
    return scales.filter((e) => e.scale.metadata.kind === selectedKind).length;
  }, [scales, selectedKind]);

  const filteredScales = useMemo(() => {
    const rawQ = query.trim().toLowerCase();
    const tokens = rawQ.split(/\s+/).filter(Boolean);

    return scales.filter((entry) => {
      const m = entry.scale.metadata;

      if (selectedKind !== "all" && m.kind !== selectedKind) {
        return false;
      }
      if (
        selectedSubspecialty !== "All Subspecialties" &&
        !m.subspecialties.includes(selectedSubspecialty)
      ) {
        return false;
      }
      if (quickFilter === "GUIDES" && entry.scale.assessment_guides.length === 0) {
        return false;
      }
      if (quickFilter === "VERIFIED" && entry.effectiveStatus !== "verified") {
        return false;
      }
      if (quickFilter === "DRAFT" && entry.effectiveStatus === "verified") {
        return false;
      }

      if (tokens.length === 0) return true;

      const haystack = `${m.short_name} ${m.name} ${m.summary} ${m.aliases.join(" ")} ${m.subspecialties.join(" ")} ${KIND_LABELS[m.kind]}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [scales, query, selectedSubspecialty, selectedKind, quickFilter]);

  const handleResetFilters = () => {
    setQuery("");
    setSelectedSubspecialty("All Subspecialties");
    setQuickFilter("ALL");
    onResetKind();
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
      {/* Desktop Left Sidebar Tree Filter (3 cols — matching NeuroGuide) */}
      <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-20">
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-2xs">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            SUBSPECIALTY TREE
          </div>
          <div className="mt-2.5 space-y-1">
            {SUBSPECIALTY_LIST.map((sub) => {
              const active = selectedSubspecialty === sub;
              const count =
                sub === "All Subspecialties"
                  ? kindFilteredTotal
                  : (subspecialtyCounts.get(sub) ?? 0);
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedSubspecialty(sub)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                    active
                      ? "bg-[#0E7490] text-white font-semibold"
                      : "font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  <span className="truncate pr-2">{sub}</span>
                  {count > 0 || sub === "All Subspecialties" ? (
                    <span className="font-mono-tech text-[11px] opacity-80">
                      {count}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-50">•</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--border-hairline)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            FILTER BY FEATURES
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {QUICK_FILTER_OPTIONS.map((opt) => {
              const active = quickFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setQuickFilter(opt.value)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? "border-[#0E7490] bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300"
                      : "border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Right Column: Search, Mobile Dropdowns & Stacked Scale Cards (9 cols) */}
      <div className="lg:col-span-9 flex flex-col gap-4 min-w-0">
        {/* Search & Mobile Dropdown Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0E7490] dark:text-cyan-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search clinical scales, formulas, aliases, subspecialties (e.g., NIHSS, mRS, ABC/2, GCS)..."
              aria-label="Search clinical scales"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full min-h-[40px] pl-10 pr-9 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)] hover:border-stone-400 focus:outline-none focus:border-[#0E7490] transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="flex lg:hidden flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <CustomSelect
              value={selectedSubspecialty}
              onChange={(val) => setSelectedSubspecialty(val)}
              options={SUBSPECIALTY_LIST.map((sub) => ({
                value: sub,
                label: sub,
              }))}
              ariaLabel="Filter by subspecialty"
              darkMode={darkMode}
              accent="teal"
              align="left"
              compact={true}
              className="flex-1 sm:flex-initial"
              icon={
                <Layers
                  className="w-4 h-4 text-[#0E7490] dark:text-cyan-400"
                  aria-hidden="true"
                />
              }
            />

            <CustomSelect
              value={quickFilter}
              onChange={(val) => setQuickFilter(val as QuickFilter)}
              options={QUICK_FILTER_OPTIONS}
              ariaLabel="Filter by features"
              darkMode={darkMode}
              accent="teal"
              align="right"
              compact={true}
              className="flex-1 sm:flex-initial"
              icon={
                <Filter
                  className="w-4 h-4 text-[#0E7490] dark:text-cyan-400"
                  aria-hidden="true"
                />
              }
            />
          </div>
        </div>

        {/* Scale Cards (Single-Column Stacked Editorial List matching NeuroGuide) */}
        {isLoading && scales.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70">
            <DrawLoader
              variant="calc"
              label="Synchronizing clinical scales & calculators..."
              accentClassName="text-[#0E7490] dark:text-cyan-400"
            />
          </div>
        ) : filteredScales.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70">
            <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-[#0E7490]/10 border border-[#0E7490]/20 flex items-center justify-center text-[#0E7490] dark:text-cyan-400">
              <Search className="w-5 h-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-ink)]">
              {scales.length === 0
                ? "No clinical scales synced yet"
                : query
                  ? `No scales match “${query}”`
                  : "No matching scales found"}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto leading-relaxed">
              {scales.length === 0
                ? isAdmin
                  ? "Seed Wave 1 scales to Supabase Sync v2 or verify drafts in /admin."
                  : "Scale definitions are currently being synchronized from the clinical repository."
                : "Try searching for “NIHSS”, “mRS”, “ABC/2”, “GCS”, or reset your active filters."}
            </p>
            {scales.length > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0E7490] text-white hover:bg-[#0B5E75] transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredScales.map((entry) => {
              const { scale } = entry;
              const m = scale.metadata;
              const primarySub = m.subspecialties[0];
              const theme = getSubspecialtyTheme(primarySub);

              return (
                <button
                  key={scale.id}
                  type="button"
                  onClick={() => onSelectScale(scale.id)}
                  className={`group w-full rounded-2xl border transition-all text-left cursor-pointer shadow-xs px-4 py-3.5 sm:px-5 sm:py-4 ${theme.borderLeft} ${theme.cardBg} ${theme.cardBorder}`}
                >
                  <h3 className="text-sm sm:text-base font-bold leading-snug text-[var(--text-ink)] group-hover:text-[#0E7490] dark:group-hover:text-cyan-400 transition-colors">
                    {m.name}
                  </h3>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
