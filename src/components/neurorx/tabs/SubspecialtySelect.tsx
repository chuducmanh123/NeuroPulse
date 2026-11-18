"use client";

import React from "react";
import { Layers } from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "@/components/ecosystem/CustomSelect";
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

  const selectOptions: CustomSelectOption<SubspecialtyFilter>[] = [
    { value: "all", label: "All Subspecialties", badge: drugs.length },
    ...options.map((opt) => ({
      value: opt.id,
      label: opt.label,
      badge: opt.count,
    })),
  ];

  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={selectOptions}
      ariaLabel="Filter by subspecialty"
      darkMode={darkMode}
      accent="cyan"
      align="right"
      className={className}
      icon={
        <Layers
          className={`w-4 h-4 ${darkMode ? "text-cyan-400" : "text-cyan-600"}`}
          aria-hidden="true"
        />
      }
    />
  );
}
