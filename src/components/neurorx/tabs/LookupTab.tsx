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

  const handleClearSelection = () => {
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : searchParams.toString();
    const nextQuery = buildDrugSelectionSearchParams(currentSearch, null);

    if (typeof window !== "undefined") {
      setClientDrugId(null);
      window.history.pushState(null, "", nextQuery ? `/neurorx?${nextQuery}` : "/neurorx");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
      {/* Left Column: Search, Subspecialty Filter & Drug Names Only */}
      <aside
        className={`md:col-span-4 lg:col-span-3 md:sticky md:top-20 ${
          selectedDrugItem ? "hidden md:block" : "block"
        }`}
      >
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 shadow-2xs flex flex-col gap-3">
          <Omnibar
            query={query}
            onQueryChange={setQuery}
            parsed={parsed}
            results={searchResults}
            onSelectDrug={handleSelectDrug}
            darkMode={darkMode}
          />

          <SubspecialtySelect
            value={selectedSubspecialty}
            onChange={setSelectedSubspecialty}
            drugs={searchResults}
            darkMode={darkMode}
            className="w-full"
          />

          <div className="border-t border-[var(--border-hairline)] pt-2.5">
            <div className="px-1 pb-1.5 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              <span>Medications</span>
              <span>{filteredResults.length}</span>
            </div>

            {filteredResults.length === 0 ? (
              <div className="py-8 px-3 text-center">
                <Pill className="w-6 h-6 mx-auto text-[var(--text-muted)] mb-1.5" />
                <p className="text-xs font-semibold text-[var(--text-ink)]">
                  No drugs found
                </p>
              </div>
            ) : (
              <div className="max-h-[58vh] md:max-h-[calc(100vh-290px)] overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {filteredResults.map((res) => {
                  const drug = res.drug;
                  const tallManName = drug.tall_man?.value || drug.generic_name;
                  const isSelected = selectedDrugItem?.drug.id === drug.id;

                  return (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() => handleSelectDrug(drug.id)}
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

      {/* Right Column: Selected Drug Detail */}
      <section
        className={`md:col-span-8 lg:col-span-9 min-w-0 ${
          selectedDrugItem ? "block" : "hidden md:block"
        }`}
      >
        {selectedDrugItem ? (
          <DrugDetail
            drugItem={selectedDrugItem}
            sources={sources}
            onBack={handleClearSelection}
            darkMode={darkMode}
            syncRow={syncRowsBySlug?.get(selectedDrugItem.drug.id) ?? null}
            onApplyLocalWrite={onApplyLocalWrite}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70 p-12 text-center">
            <Pill className="w-9 h-9 mx-auto text-[#2F855A] dark:text-emerald-400 mb-3 opacity-80" />
            <h3 className="text-sm font-bold text-[var(--text-ink)]">
              Select a medication from the left list
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
              Choose any drug to view bedside dosing, renal/hepatic adjustments, contraindications, and monitoring protocols.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
