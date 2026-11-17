"use client";

import React from "react";
import { ChevronDown, Layers } from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import type { Subspecialty } from "@/types/neurorx";

export type SubspecialtyFilter = "all" | Subspecialty;

export const SUBSPECIALTY_OPTIONS: { id: Subspecialty; label: string }[] = [
  { id: "stroke", label: "Stroke" },
  { id: "epilepsy", label: "Epilepsy" },
  { id: "neurocritical_care", label: "Neurocritical Care" },
  { id: "headache", label: "Headache & Pain" },
  { id: "neuroimmunology", label: "Neuroimmunology" },
  { id: "neuromuscular", label: "Neuromuscular" },
  { id: "movement_disorders", label: "Movement Disorders" },
  { id: "dementia", label: "Dementia & Cognitive" },
  { id: "neuro_infectious", label: "CNS Infections" },
  { id: "other", label: "Other (Non-Neurology)" },
];

export function matchesSubspecialty(
  item: DrugWithEffectiveStatus,
  subspecialty: SubspecialtyFilter
): boolean {
  if (subspecialty === "all") return true;
  return item.drug.subspecialties.includes(subspecialty);
}

interface SubspecialtySelectProps {
  value: SubspecialtyFilter;
  onChange: (value: SubspecialtyFilter) => void;
  drugs: DrugWithEffectiveStatus[];
  darkMode?: boolean;
  hideEmpty?: boolean;
  className?: string;
}

export function SubspecialtySelect({
  value,
  onChange,
  drugs,
  darkMode = false,
  hideEmpty = false,
  className = "",
}: SubspecialtySelectProps) {
  const options = SUBSPECIALTY_OPTIONS.map((opt) => ({
    ...opt,
    count: drugs.filter((d) => matchesSubspecialty(d, opt.id)).length,
  })).filter((opt) => !hideEmpty || opt.count > 0 || value === opt.id);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Layers
        className={`w-4 h-4 absolute left-3.5 pointer-events-none ${
          darkMode ? "text-cyan-400" : "text-cyan-600"
        }`}
        aria-hidden="true"
      />
      <select
        aria-label="Filter by subspecialty"
        value={value}
        onChange={(e) => onChange(e.target.value as SubspecialtyFilter)}
        className={`appearance-none min-h-[44px] pl-9 pr-9 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500/40 ${
          darkMode
            ? "bg-slate-900 border-slate-700/80 text-slate-100 hover:border-slate-600"
            : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-sm"
        }`}
      >
        <option value="all">All Subspecialties ({drugs.length})</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label} ({opt.count})
          </option>
        ))}
      </select>
      <ChevronDown
        className="w-4 h-4 absolute right-3 pointer-events-none text-slate-400"
        aria-hidden="true"
      />
    </div>
  );
}
