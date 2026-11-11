"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, X, Plus, AlertCircle } from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";

interface RegimenTagInputProps {
  selectedDrugIds: string[];
  onAddDrug: (drugId: string) => void;
  onRemoveDrug: (drugId: string) => void;
  onClearAll: () => void;
  allDrugs: DrugWithEffectiveStatus[];
  darkMode?: boolean;
}

export function RegimenTagInput({
  selectedDrugIds,
  onAddDrug,
  onRemoveDrug,
  onClearAll,
  allDrugs,
  darkMode = false,
}: RegimenTagInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to get drug displayName
  const getDrugName = (id: string): string => {
    const item = allDrugs.find((d) => d.drug.id === id);
    if (!item) return id;
    const tall = item.drug.tall_man?.value;
    return tall || item.drug.generic_name;
  };

  // Filter available drugs (excluding already selected ones)
  const availableDrugs = allDrugs.filter(
    (d) => !selectedDrugIds.includes(d.drug.id)
  );

  const filteredDrugs = query.trim()
    ? availableDrugs.filter((d) => {
        const q = query.trim().toLowerCase();
        const generic = d.drug.generic_name.toLowerCase();
        const tall = (d.drug.tall_man?.value || "").toLowerCase();
        const classes = d.drug.classes.map((c) => c.toLowerCase()).join(" ");
        const brands = (d.drug.vn_products?.value || [])
          .map((p) => (p.brand || "").toLowerCase())
          .join(" ");

        return (
          generic.includes(q) ||
          tall.includes(q) ||
          classes.includes(q) ||
          brands.includes(q)
        );
      })
    : [];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (drugId: string) => {
    onAddDrug(drugId);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredDrugs.length === 0) {
      if (e.key === "ArrowDown" && filteredDrugs.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredDrugs.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev <= 0 ? filteredDrugs.length - 1 : prev - 1
      );
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < filteredDrugs.length) {
      e.preventDefault();
      handleSelect(filteredDrugs[activeIndex].drug.id);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`p-4 sm:p-5 rounded-2xl border transition-colors shadow-sm ${
        darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>Regimen Medications</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {selectedDrugIds.length} {selectedDrugIds.length === 1 ? "drug" : "drugs"}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Add 2 or more drugs to analyze pairwise DDIs, mechanism flags, and myasthenia gravis safety.
          </p>
        </div>

        {selectedDrugIds.length > 0 && (
          <button
            onClick={onClearAll}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
              darkMode
                ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
                : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
            }`}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected Drug Chips */}
      {selectedDrugIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedDrugIds.map((id) => {
            const item = allDrugs.find((d) => d.drug.id === id);
            const isDraft = item?.effectiveStatus === "draft";
            const name = getDrugName(id);

            return (
              <span
                key={id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200"
                    : "bg-slate-100 border-slate-200 text-slate-800"
                }`}
              >
                <span>{name}</span>
                {isDraft && (
                  <span
                    className="text-[10px] px-1 py-0.2 rounded font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    title="Draft record: enzyme profile excluded"
                  >
                    draft
                  </span>
                )}
                <button
                  onClick={() => onRemoveDrug(id)}
                  className="p-0.5 rounded-md hover:bg-slate-300/60 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors ml-0.5"
                  aria-label={`Remove ${name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Autocomplete Input */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type drug name (e.g., Warfarin, Aspirin, Phenobarbital, Apixaban)..."
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors outline-none focus:ring-2 focus:ring-indigo-500/30 ${
              darkMode
                ? "bg-slate-950/60 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-indigo-500"
                : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500"
            }`}
          />
        </div>

        {/* Dropdown Results */}
        {isOpen && query.trim() && (
          <div
            className={`absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-xl border z-30 shadow-xl scrollbar-thin transition-colors ${
              darkMode
                ? "bg-slate-900 border-slate-700 divide-slate-800"
                : "bg-white border-slate-200 divide-slate-100 shadow-slate-200/50"
            }`}
          >
            {filteredDrugs.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                No matching medications found
              </div>
            ) : (
              filteredDrugs.slice(0, 10).map((item, idx) => {
                const isSelected = activeIndex === idx;
                const tall = item.drug.tall_man?.value;
                const name = tall || item.drug.generic_name;
                const classes = item.drug.classes.slice(0, 2).join(", ");

                return (
                  <button
                    key={item.drug.id}
                    onClick={() => handleSelect(item.drug.id)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors ${
                      isSelected
                        ? darkMode
                          ? "bg-indigo-950/50 text-indigo-300"
                          : "bg-indigo-50/80 text-indigo-900"
                        : darkMode
                        ? "text-slate-200 hover:bg-slate-800/60"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{name}</span>
                        {item.effectiveStatus === "draft" && (
                          <span className="text-[10px] px-1 py-0.2 rounded font-normal bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            draft
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {classes}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
