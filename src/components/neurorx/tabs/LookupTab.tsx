"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Pill,
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Filter,
  Activity,
  Layers,
} from "lucide-react";
import type { Subspecialty, DrugRecord, Source } from "@/types/neurorx";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import { parseQuery, searchDrugs, type ParsedPatientParams } from "@/lib/neurorx/omnibar";
import { buildDrugSelectionSearchParams } from "@/lib/neurorx/sync/lookupHelpers";
import type { SyncRow } from "@/lib/neurorx/sync/types";
import { useNeuroRxStore } from "@/store/useNeuroRxStore";
import { Omnibar } from "@/components/neurorx/Omnibar";
import { TallManHint } from "@/components/neurorx/TallManHint";
import { DrugDetail } from "@/components/neurorx/drug/DrugDetail";
import {
  SubspecialtySelect,
  matchesSubspecialty,
  type SubspecialtyFilter,
} from "./SubspecialtySelect";

export { buildDrugSelectionSearchParams };

interface LookupTabProps {
  drugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  darkMode?: boolean;
  syncRowsBySlug?: ReadonlyMap<string, SyncRow>;
  onApplyLocalWrite?: (row: SyncRow) => Promise<void> | void;
}

export function LookupTab({
  drugs,
  sources = [],
  darkMode = false,
  syncRowsBySlug,
  onApplyLocalWrite,
}: LookupTabProps) {
  const searchParams = useSearchParams();
  const selectMarkRef = useRef<{ drugId: string; startMs: number } | null>(null);

  // Search input state
  const [query, setQuery] = useState("");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState<SubspecialtyFilter>("all");

  // Parse omnibar query in real time
  const parsed = useMemo(() => parseQuery(query), [query]);

  // Selected drug from URL (?drug=<id>) with instant client override
  const searchParamDrugId = searchParams.get("drug");
  const [clientDrugId, setClientDrugId] = useState<string | null>(searchParamDrugId);

  useEffect(() => {
    setClientDrugId(searchParamDrugId);
  }, [searchParamDrugId]);

  useEffect(() => {
    const handlePopState = () => {
      setClientDrugId(new URLSearchParams(window.location.search).get("drug"));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const selectedDrugId = clientDrugId;
  const selectedDrugItem = useMemo(() => {
    if (!selectedDrugId) return null;
    return drugs.find((d) => d.drug.id === selectedDrugId) || null;
  }, [selectedDrugId, drugs]);

  useEffect(() => {
    if (!selectedDrugItem || typeof performance === "undefined") {
      return;
    }
    const pending = selectMarkRef.current;
    if (pending && pending.drugId === selectedDrugItem.drug.id) {
      performance.mark?.("neurorx:drug-detail-render");
      if (typeof performance.measure === "function") {
        try {
          performance.measure(
            "neurorx:click-to-detail",
            "neurorx:drug-select-start",
            "neurorx:drug-detail-render",
          );
        } catch {
          // Ignore missing mark in synthetic environments
        }
      }
      selectMarkRef.current = null;
    }
  }, [selectedDrugItem]);

  // Filter and rank drugs
  const searchResults = useMemo(() => {
    return searchDrugs(parsed.terms, drugs);
  }, [drugs, parsed.terms]);

  const filteredResults = useMemo(() => {
    return searchResults.filter((d) => matchesSubspecialty(d, selectedSubspecialty));
  }, [searchResults, selectedSubspecialty]);

  // Handle selecting a drug from Omnibar or Card click
  const handleSelectDrug = (drugId: string, patientParams?: ParsedPatientParams) => {
    const p = patientParams || parsed.patient;
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : searchParams.toString();
    const nextQuery = buildDrugSelectionSearchParams(currentSearch, drugId, p);

    if (typeof window !== "undefined") {
      if (typeof performance !== "undefined") {
        performance.mark?.("neurorx:drug-select-start");
        selectMarkRef.current = { drugId, startMs: performance.now() };
      }
      useNeuroRxStore.getState().initFromSearchParams(new URLSearchParams(nextQuery));
      setClientDrugId(drugId);
      window.history.pushState(null, "", `/neurorx?${nextQuery}`);
    }
  };

  // Back to directory
  const handleBackToDirectory = () => {
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : searchParams.toString();
    const nextQuery = buildDrugSelectionSearchParams(currentSearch, null);

    if (typeof window !== "undefined") {
      setClientDrugId(null);
      window.history.pushState(null, "", nextQuery ? `/neurorx?${nextQuery}` : "/neurorx");
    }
  };

  // If a drug is selected, render full Tier 1 & Tier 2 DrugDetail
  if (selectedDrugItem) {
    return (
      <DrugDetail
        drugItem={selectedDrugItem}
        sources={sources}
        onBack={handleBackToDirectory}
        darkMode={darkMode}
        syncRow={syncRowsBySlug?.get(selectedDrugItem.drug.id) ?? null}
        onApplyLocalWrite={onApplyLocalWrite}
      />
    );
  }

  // Drug Directory List View
  return (
    <div className="space-y-6">
      {/* 1. Clinical Omnibar & Subspecialty Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          <Omnibar
            query={query}
            onQueryChange={setQuery}
            parsed={parsed}
            results={searchResults}
            onSelectDrug={handleSelectDrug}
            darkMode={darkMode}
          />
        </div>
        <SubspecialtySelect
          value={selectedSubspecialty}
          onChange={setSelectedSubspecialty}
          drugs={searchResults}
          darkMode={darkMode}
          className="w-full sm:w-auto shrink-0 sm:mt-1"
        />
      </div>

      {/* 2. Drug Cards Grid */}
      <div className="space-y-3">
        {filteredResults.length === 0 ? (
          <div className="p-10 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-center shadow-2xs">
            <Pill className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-sm font-semibold text-[var(--text-ink)]">
              No drugs found matching criteria
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Try adjusting your search terms or filter selection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredResults.map((res) => {
              const drug = res.drug;
              const isVerified = res.effectiveStatus === "verified";
              const tallManName = drug.tall_man?.value || drug.generic_name;

              return (
                <div
                  key={drug.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectDrug(drug.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectDrug(drug.id);
                    }
                  }}
                  className="group min-h-[44px] p-4 sm:p-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[#2F855A] dark:hover:border-emerald-500/60 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-4 hover:-translate-y-0.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-extrabold text-base sm:text-xl tracking-tight text-[var(--text-ink)] group-hover:text-[#2F855A] dark:group-hover:text-emerald-400 transition-colors">
                        {tallManName}
                      </span>

                      <TallManHint
                        tallMan={drug.tall_man}
                        genericName={drug.generic_name}
                        darkMode={darkMode}
                      />

                      {/* Brand tags */}
                      {drug.vn_products?.value && drug.vn_products.value.length > 0 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-semibold border border-[var(--border-hairline)]">
                          Brand: {drug.vn_products.value.map((p) => p.brand).join(", ")}
                        </span>
                      )}

                      {/* Verification Badge */}
                      {isVerified ? (
                        <span
                          className="inline-flex items-center text-emerald-600 dark:text-emerald-400 shrink-0"
                          title="Verified"
                          aria-label="Verified"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Pending verification</span>
                        </span>
                      )}
                    </div>

                    {/* Classes */}
                    <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)] mt-1">
                      {drug.classes.join(" • ")}
                    </p>

                    {/* Subspecialties pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {drug.subspecialties?.map((sub) => (
                        <span
                          key={sub}
                          className="px-2.5 py-0.5 rounded text-xs font-bold bg-[var(--bg-subtle)]/80 text-[var(--text-secondary)] uppercase tracking-wide border border-[var(--border-hairline)]"
                        >
                          {sub.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center text-[var(--text-muted)] group-hover:text-[#2F855A] dark:group-hover:text-emerald-400 pl-2">
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
