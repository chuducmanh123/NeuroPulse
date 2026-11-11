"use client";

import React, { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import { parseQuery, searchDrugs, type ParsedPatientParams } from "@/lib/neurorx/omnibar";
import { Omnibar } from "@/components/neurorx/Omnibar";
import { DrugDetail } from "@/components/neurorx/drug/DrugDetail";

interface LookupTabProps {
  drugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  darkMode?: boolean;
}

export function LookupTab({ drugs, sources = [], darkMode = false }: LookupTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search input state
  const [query, setQuery] = useState("");

  // Parse omnibar query in real time
  const parsed = useMemo(() => parseQuery(query), [query]);

  // Selected drug from URL (?drug=<id>)
  const selectedDrugId = searchParams.get("drug");
  const selectedDrugItem = useMemo(() => {
    if (!selectedDrugId) return null;
    return drugs.find((d) => d.drug.id === selectedDrugId) || null;
  }, [selectedDrugId, drugs]);

  // Filter and rank drugs
  const searchResults = useMemo(() => {
    return searchDrugs(parsed.terms, drugs);
  }, [drugs, parsed.terms]);

  // Handle selecting a drug from Omnibar or Card click
  const handleSelectDrug = (drugId: string, patientParams?: ParsedPatientParams) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "lookup");
    params.set("drug", drugId);

    const p = patientParams || parsed.patient;
    if (p.weightKg !== undefined) params.set("w", String(p.weightKg));
    if (p.crcl !== undefined) params.set("crcl", String(p.crcl));
    if (p.scr !== undefined) {
      params.set(
        "scr",
        `${p.scr.value}${p.scr.unit === "mg/dL" ? "mgdl" : ""}`
      );
    }
    if (p.age !== undefined) params.set("age", String(p.age));
    if (p.sex !== undefined) params.set("sex", p.sex);

    router.push(`/neurorx?${params.toString()}`);
  };

  // Back to directory
  const handleBackToDirectory = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("drug");
    router.push(`/neurorx?${params.toString()}`);
  };

  // If a drug is selected, render full Tier 1 & Tier 2 DrugDetail
  if (selectedDrugItem) {
    return (
      <DrugDetail
        drugItem={selectedDrugItem}
        sources={sources}
        onBack={handleBackToDirectory}
        darkMode={darkMode}
      />
    );
  }

  // Drug Directory List View
  return (
    <div className="space-y-6">
      {/* 1. Clinical Omnibar */}
      <Omnibar
        query={query}
        onQueryChange={setQuery}
        parsed={parsed}
        results={searchResults}
        onSelectDrug={handleSelectDrug}
        darkMode={darkMode}
      />

      {/* 2. Drug Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Available Drugs ({searchResults.length})
          </span>
        </div>

        {searchResults.length === 0 ? (
          <div
            className={`p-10 rounded-2xl border text-center ${
              darkMode ? "bg-slate-900/40 border-slate-800" : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <Pill className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No drugs found matching criteria
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Try adjusting your search terms or filter selection.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {searchResults.map((res) => {
              const drug = res.drug;
              const isVerified = res.effectiveStatus === "verified";
              const tallManName = drug.tall_man?.value || drug.generic_name;

              return (
                <div
                  key={drug.id}
                  onClick={() => handleSelectDrug(drug.id)}
                  className={`group p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 hover:-translate-y-0.5 ${
                    darkMode
                      ? "bg-slate-900/70 border-slate-800/90 hover:border-cyan-500/50 hover:bg-slate-900 hover:shadow-lg hover:shadow-cyan-950/20"
                      : "bg-white border-slate-200/90 hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-100/40"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-base sm:text-lg tracking-wide font-mono text-slate-900 dark:text-white">
                        {tallManName}
                      </span>

                      {/* Brand tags */}
                      {drug.vn_products?.value && drug.vn_products.value.length > 0 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          Brand: {drug.vn_products.value.map((p) => p.brand).join(", ")}
                        </span>
                      )}

                      {/* Verification Badge */}
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Pending verification</span>
                        </span>
                      )}
                    </div>

                    {/* Classes */}
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {drug.classes.join(" • ")}
                    </p>

                    {/* Subspecialties pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {drug.subspecialties?.map((sub) => (
                        <span
                          key={sub}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                        >
                          {sub.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center text-slate-400 group-hover:text-cyan-500 pl-2">
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
