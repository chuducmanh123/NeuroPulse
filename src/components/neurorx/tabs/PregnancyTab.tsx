"use client";

import React, { useState } from "react";
import {
  Layers,
  Activity,
  Brain,
  Shield,
  HeartPulse,
  Sparkles,
  AlertTriangle,
  Footprints,
  Clock,
  Bug,
  Baby,
  Milk,
} from "lucide-react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import type { Source, Subspecialty } from "@/types/neurorx";
import { ReproBoard } from "./ReproBoard";
import { ReproDetail } from "./ReproDetail";

interface PregnancyTabProps {
  drugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  darkMode?: boolean;
}

export type ReproSubspecialty =
  | "all"
  | "stroke"
  | "neurocritical_care"
  | "epilepsy"
  | "headache"
  | "neuroimmunology"
  | "neuromuscular"
  | "movement_disorders"
  | "dementia"
  | "neuro_infectious";

// Backward compatibility alias for legacy imports
export type ReproDiseaseGroup = ReproSubspecialty | "migraine" | "ms_nmosd" | "myasthenia";

interface DiseaseGroupConfig {
  id: ReproSubspecialty;
  label: string;
  icon: React.ReactNode;
  match: (item: DrugWithEffectiveStatus) => boolean;
}

const GROUPS: DiseaseGroupConfig[] = [
  {
    id: "all",
    label: "All Subspecialties",
    icon: <Layers className="w-3.5 h-3.5" />,
    match: () => true,
  },
  {
    id: "stroke",
    label: "Stroke",
    icon: <Activity className="w-3.5 h-3.5" />,
    match: (item) =>
      item.drug.subspecialties.includes("stroke") ||
      item.drug.classes.some((c) => {
        const lower = c.toLowerCase();
        return (
          lower.includes("anticoagulant") ||
          lower.includes("antiplatelet") ||
          lower.includes("thrombolytic") ||
          lower.includes("calcium channel blocker")
        );
      }),
  },
  {
    id: "neurocritical_care",
    label: "Neurocritical Care",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    match: (item) => item.drug.subspecialties.includes("neurocritical_care"),
  },
  {
    id: "epilepsy",
    label: "Epilepsy (ASM)",
    icon: <Brain className="w-3.5 h-3.5" />,
    match: (item) =>
      item.drug.subspecialties.includes("epilepsy") ||
      item.drug.classes.some((c) => {
        const lower = c.toLowerCase();
        return (
          lower.includes("anticonvulsant") ||
          lower.includes("antiepileptic") ||
          /\basm\b/.test(lower)
        );
      }),
  },
  {
    id: "headache",
    label: "Headache & Pain",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    match: (item) =>
      item.drug.subspecialties.includes("headache") ||
      item.drug.classes.some((c) => {
        const lower = c.toLowerCase();
        return (
          lower.includes("triptan") ||
          lower.includes("cgrp") ||
          lower.includes("migraine")
        );
      }),
  },
  {
    id: "neuroimmunology",
    label: "Neuroimmunology",
    icon: <Shield className="w-3.5 h-3.5" />,
    match: (item) => item.drug.subspecialties.includes("neuroimmunology"),
  },
  {
    id: "neuromuscular",
    label: "Neuromuscular",
    icon: <HeartPulse className="w-3.5 h-3.5" />,
    match: (item) => item.drug.subspecialties.includes("neuromuscular"),
  },
  {
    id: "movement_disorders",
    label: "Movement Disorders",
    icon: <Footprints className="w-3.5 h-3.5" />,
    match: (item) =>
      item.drug.subspecialties.includes("movement_disorders") ||
      item.drug.classes.some((c) => {
        const lower = c.toLowerCase();
        return (
          lower.includes("dopamine") ||
          lower.includes("antiparkinson") ||
          lower.includes("levodopa")
        );
      }),
  },
  {
    id: "dementia",
    label: "Dementia & Cognitive",
    icon: <Clock className="w-3.5 h-3.5" />,
    match: (item) =>
      item.drug.subspecialties.includes("dementia") ||
      item.drug.classes.some((c) => {
        const lower = c.toLowerCase();
        return (
          lower.includes("alzheimer") ||
          lower.includes("anti-amyloid") ||
          lower.includes("nmda receptor antagonist")
        );
      }),
  },
  {
    id: "neuro_infectious",
    label: "CNS Infections",
    icon: <Bug className="w-3.5 h-3.5" />,
    match: (item) =>
      item.drug.subspecialties.includes("neuro_infectious") ||
      item.drug.classes.some((c) => {
        const lower = c.toLowerCase();
        return (
          lower.includes("antibiotic") ||
          lower.includes("antiviral") ||
          lower.includes("cephalosporin")
        );
      }),
  },
];

export function PregnancyTab({
  drugs,
  sources = [],
  darkMode = false,
}: PregnancyTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"pregnancy" | "lactation">("pregnancy");
  const [selectedGroup, setSelectedGroup] = useState<ReproDiseaseGroup>("all");
  const [selectedDrug, setSelectedDrug] = useState<DrugWithEffectiveStatus | null>(null);

  const activeGroupConfig =
    GROUPS.find((g) => g.id === selectedGroup) ||
    (selectedGroup === "migraine" ? GROUPS.find((g) => g.id === "headache") : undefined) ||
    (selectedGroup === "ms_nmosd" ? GROUPS.find((g) => g.id === "neuroimmunology") : undefined) ||
    (selectedGroup === "myasthenia" ? GROUPS.find((g) => g.id === "neuromuscular") : undefined) ||
    GROUPS[0];
  const groupDrugs = drugs.filter((d) => activeGroupConfig.match(d));

  return (
    <div className="space-y-5">
      {/* 1. Sub-tab Switcher: Pregnancy vs Lactation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className={`inline-flex p-1 rounded-xl border ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-100/80 border-slate-200"
          }`}
          role="tablist"
          aria-label="Pregnancy and Lactation sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "pregnancy"}
            onClick={() => setActiveSubTab("pregnancy")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "pregnancy"
                ? darkMode
                  ? "bg-rose-950/70 text-rose-300 shadow-sm border border-rose-800/60"
                  : "bg-white text-rose-700 shadow-sm border border-rose-200/80"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Baby className="w-4 h-4" />
            <span>Pregnancy</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "lactation"}
            onClick={() => setActiveSubTab("lactation")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeSubTab === "lactation"
                ? darkMode
                  ? "bg-amber-950/70 text-amber-300 shadow-sm border border-amber-800/60"
                  : "bg-white text-amber-700 shadow-sm border border-amber-200/80"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Milk className="w-4 h-4" />
            <span>Lactation</span>
          </button>
        </div>
      </div>

      {/* 2. Disease Group Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {GROUPS.map((grp) => {
          const isSelected = selectedGroup === grp.id;
          const count = drugs.filter((d) => grp.match(d)).length;

          return (
            <button
              key={grp.id}
              onClick={() => setSelectedGroup(grp.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap min-h-[40px] ${
                isSelected
                  ? darkMode
                    ? "bg-rose-950/60 border-rose-600/70 text-rose-300 shadow-sm"
                    : "bg-rose-50 border-rose-300 text-rose-700 shadow-sm"
                  : darkMode
                  ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
              }`}
            >
              <span className={isSelected ? "text-rose-500" : "text-slate-400"}>
                {grp.icon}
              </span>
              <span>{grp.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Repro Board */}
      <ReproBoard
        mode={activeSubTab}
        drugs={groupDrugs}
        sources={sources}
        onSelectDrug={setSelectedDrug}
        darkMode={darkMode}
      />

      {/* 4. Drug Detail Modal */}
      {selectedDrug && (
        <ReproDetail
          mode={activeSubTab}
          drugItem={selectedDrug}
          sources={sources}
          onClose={() => setSelectedDrug(null)}
          darkMode={darkMode}
        />
      )}
    </div>
  );
}
