"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { Search, X, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import type { ParsedOmnibarQuery, ParsedPatientParams, SearchResult } from "@/lib/neurorx/omnibar";

interface OmnibarProps {
  query: string;
  onQueryChange: (q: string) => void;
  parsed: ParsedOmnibarQuery;
  results: SearchResult[];
  onSelectDrug: (drugId: string, patient: ParsedPatientParams) => void;
  darkMode?: boolean;
}

export function Omnibar({
  query,
  onQueryChange,
  parsed,
  results,
  onSelectDrug,
  darkMode = false,
}: OmnibarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < results.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const item = results[selectedIndex];
        onSelectDrug(item.drug.id, parsed.patient);
        setIsOpen(false);
      } else if (results.length > 0) {
        // Select first result if enter is pressed with query
        onSelectDrug(results[0].drug.id, parsed.patient);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onQueryChange("");
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removePatientParam = (type: "weight" | "crcl" | "scr" | "age" | "sex") => {
    // Reconstruct query without that param token
    let newQuery = query;
    if (type === "weight") {
      newQuery = newQuery.replace(/\b(\d+(?:\.\d+)?)\s*(?:kg|kilos?)\b/gi, "").trim();
    } else if (type === "crcl") {
      newQuery = newQuery
        .replace(/\b(?:crcl|clcr|cr_cl)\s*[:=]?\s*(\d+(?:\.\d+)?)(?:\s*ml\s*\/?\s*min)?\b/gi, "")
        .replace(/\b(\d+(?:\.\d+)?)\s*ml\s*\/?\s*min\b/gi, "")
        .trim();
    } else if (type === "scr") {
      newQuery = newQuery
        .replace(
          /\b(?:scr|serum\s*cr(?:eatinine)?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(umol\/l|µmol\/l|micromol\/l|mg\/dl)?\b/gi,
          ""
        )
        .trim();
    } else if (type === "age") {
      newQuery = newQuery
        .replace(/\b(?:age\s*[:=]?\s*(\d{1,3})|(\d{1,3})\s*(?:y|yo|yr|yrs|years?(?:\s*old)?))\b/gi, "")
        .trim();
    } else if (type === "sex") {
      newQuery = newQuery
        .replace(/\b(?:sex\s*[:=]?\s*(female|male|f|m)|(female|male))\b/gi, "")
        .trim();
    }
    onQueryChange(newQuery.replace(/\s+/g, " ").trim());
  };

  const hasPatientParams =
    parsed.patient.weightKg !== undefined ||
    parsed.patient.crcl !== undefined ||
    parsed.patient.scr !== undefined ||
    parsed.patient.age !== undefined ||
    parsed.patient.sex !== undefined;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* 1. Main Search Bar */}
      <div
        className={`relative flex items-center w-full rounded-2xl border transition-all ${
          isOpen
            ? "border-cyan-500 ring-2 ring-cyan-500/20 shadow-md shadow-cyan-500/10"
            : darkMode
            ? "border-slate-800 hover:border-slate-700 bg-slate-900/90"
            : "border-slate-200 hover:border-slate-300 bg-white shadow-xs"
        }`}
      >
        <div className="pl-4 pr-2 text-slate-400">
          <Search className="w-5 h-5 text-cyan-500" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search drug, brand, class, reverse AE or type 'keppra 60kg crcl 35'..."
          className="w-full py-3.5 pr-10 text-sm sm:text-base bg-transparent focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 font-medium"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={
            selectedIndex >= 0 ? `omnibar-opt-${selectedIndex}` : undefined
          }
        />

        {query.trim().length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1.5 mr-3 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. Parsed Patient Context Chips */}
      {hasPatientParams && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2 px-1">
          <span className="text-xs font-bold tracking-wider uppercase text-slate-600 dark:text-slate-400 mr-1">
            Parsed:
          </span>

          {parsed.patient.weightKg !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
              <span>⚖️ {parsed.patient.weightKg} kg</span>
              <button
                type="button"
                onClick={() => removePatientParam("weight")}
                className="hover:text-cyan-900 dark:hover:text-white p-0.5 rounded-full"
                aria-label="Remove weight parameter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {parsed.patient.crcl !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
              <span>💧 CrCl {parsed.patient.crcl} mL/min</span>
              <button
                type="button"
                onClick={() => removePatientParam("crcl")}
                className="hover:text-blue-900 dark:hover:text-white p-0.5 rounded-full"
                aria-label="Remove CrCl parameter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {parsed.patient.scr !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
              <span>
                🩸 SCr {parsed.patient.scr.value} {parsed.patient.scr.unit}
              </span>
              <button
                type="button"
                onClick={() => removePatientParam("scr")}
                className="hover:text-violet-900 dark:hover:text-white p-0.5 rounded-full"
                aria-label="Remove SCr parameter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {parsed.patient.age !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
              <span>👤 {parsed.patient.age} yrs</span>
              <button
                type="button"
                onClick={() => removePatientParam("age")}
                className="hover:text-amber-900 dark:hover:text-white p-0.5 rounded-full"
                aria-label="Remove age parameter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {parsed.patient.sex !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              <span>
                ⚧ {parsed.patient.sex === "female" ? "Female" : "Male"}
              </span>
              <button
                type="button"
                onClick={() => removePatientParam("sex")}
                className="hover:text-emerald-900 dark:hover:text-white p-0.5 rounded-full"
                aria-label="Remove sex parameter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* 3. Autocomplete / Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute z-30 w-full mt-2 rounded-2xl border shadow-xl overflow-hidden max-h-96 overflow-y-auto transition-colors ${
            darkMode
              ? "bg-slate-900 border-slate-700/80 divide-slate-800"
              : "bg-white border-slate-200 divide-slate-100"
          } divide-y`}
        >
          {results.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
              No matching drugs found for &ldquo;{query.trim()}&rdquo;.
            </div>
          ) : (
            results.map((res, index) => {
              const drug = res.drug;
              const isSelected = selectedIndex === index;
              const tallManName = drug.tall_man?.value || drug.generic_name;
              const isVerified = res.effectiveStatus === "verified";

              return (
                <div
                  key={drug.id}
                  id={`omnibar-opt-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSelectDrug(drug.id, parsed.patient);
                    setIsOpen(false);
                  }}
                  className={`p-3.5 sm:p-4 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                    isSelected
                      ? darkMode
                        ? "bg-slate-800/90 text-white"
                        : "bg-cyan-50/90 text-slate-900"
                      : darkMode
                      ? "hover:bg-slate-800/50 text-slate-200"
                      : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                        {tallManName}
                      </span>

                      {/* Brand Match or Product Hint */}
                      {drug.vn_products?.value && drug.vn_products.value.length > 0 && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                          Brand: {drug.vn_products.value.map((p) => p.brand).join(", ")}
                        </span>
                      )}

                      {/* Verification Status Badge */}
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Pending verification</span>
                        </span>
                      )}
                    </div>

                    {/* Classes & Match Reason */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                      <span>{drug.classes.join(" • ")}</span>

                      {res.matchedBy === "ae_tag" && (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
                          AE Tag: {res.matchedText}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 whitespace-nowrap pl-2">
                    Open &rarr;
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
