"use client";

import React from "react";
import {
  AlertTriangle,
  AlertOctagon,
  Info,
  ArrowRightLeft,
  Activity,
  Dna,
} from "lucide-react";
import type {
  CuratedHit,
  MechanismFlag,
  MgHit,
} from "@/lib/neurorx/interactions";
import type { InteractionAlternative, Source } from "@/types/neurorx";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import { SourcePopover } from "../drug/SourcePopover";

interface InteractionCardProps {
  hit?: CuratedHit;
  flag?: MechanismFlag;
  mg?: MgHit;
  allDrugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  onSimulateSwap?: (
    fromId: string,
    toId: string,
    alternative: InteractionAlternative
  ) => void;
  darkMode?: boolean;
}

export function InteractionCard({
  hit,
  flag,
  mg,
  allDrugs,
  sources = [],
  onSimulateSwap,
  darkMode = false,
}: InteractionCardProps) {
  const getDrugName = (id: string): string => {
    const item = allDrugs.find((d) => d.drug.id === id);
    if (!item) return id;
    const tall = item.drug.tall_man?.value;
    return tall || item.drug.generic_name;
  };

  // 1. Curated Interaction Card
  if (hit) {
    const drugAName = getDrugName(hit.drug_a);
    const drugBName = getDrugName(hit.drug_b);

    const severityConfig = {
      contraindicated: {
        badge: "🔴 Contraindicated",
        border: darkMode ? "border-rose-900/60 bg-rose-950/20" : "border-rose-200 bg-rose-50/50",
        badgeColor: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
        icon: <AlertOctagon className="w-4 h-4 text-rose-500" />,
      },
      major: {
        badge: "🟠 Major Interaction",
        border: darkMode ? "border-amber-900/60 bg-amber-950/20" : "border-amber-200 bg-amber-50/50",
        badgeColor: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
        icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      },
      moderate: {
        badge: "🟡 Moderate Interaction",
        border: darkMode ? "border-yellow-900/60 bg-yellow-950/20" : "border-yellow-200 bg-yellow-50/50",
        badgeColor: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
        icon: <Info className="w-4 h-4 text-yellow-500" />,
      },
      minor: {
        badge: "🟡 Minor Interaction",
        border: darkMode ? "border-slate-800 bg-slate-900/30" : "border-slate-200 bg-slate-50/50",
        badgeColor: "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
        icon: <Info className="w-4 h-4 text-slate-400" />,
      },
    }[hit.severity];

    return (
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-sm ${severityConfig.border}`}
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border uppercase tracking-wider ${severityConfig.badgeColor}`}
            >
              {severityConfig.icon}
              <span>{severityConfig.badge}</span>
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
              {drugAName} + {drugBName}
            </span>
          </div>

          <SourcePopover
            refs={hit.refs}
            sources={sources}
            label="Source"
            darkMode={darkMode}
          />
        </div>

        {/* Structured Body: Mechanism -> Clinical Effect -> Management */}
        <div className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Mechanism:{" "}
            </span>
            <span>{hit.mechanism}</span>
          </div>

          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Clinical Effect:{" "}
            </span>
            <span>{hit.clinical_effect}</span>
          </div>

          <div
            className={`p-3 rounded-xl border mt-2 ${
              darkMode
                ? "bg-slate-900/70 border-slate-800 text-slate-200"
                : "bg-white/80 border-slate-200/90 text-slate-800"
            }`}
          >
            <div className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-100 mb-1">
              <span>💡 Clinical Management</span>
            </div>
            <p className="leading-relaxed">{hit.management}</p>
          </div>
        </div>

        {/* Alternatives / Simulate Swap Buttons */}
        {hit.alternatives && hit.alternatives.length > 0 && onSimulateSwap && (
          <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Curated Alternatives:
            </span>
            {hit.alternatives.map((alt, idx) => {
              const altName = getDrugName(alt.drug_id);
              // Target can swap drug_a or drug_b depending on alternative context
              const targetFromId = hit.drug_a;
              const targetFromName = drugAName;

              return (
                <button
                  key={`${alt.drug_id}-${idx}`}
                  onClick={() => onSimulateSwap(targetFromId, alt.drug_id, alt)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    darkMode
                      ? "border-indigo-700/60 bg-indigo-950/40 text-indigo-300 hover:bg-indigo-900/50"
                      : "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                  title={alt.rationale}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>
                    Simulate swap: {targetFromName} → {altName}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 2. Mechanism-Based Flag Card (No severity field per SPEC §6)
  if (flag) {
    const contributingNames = flag.drugs.map(getDrugName).join(" + ");

    return (
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-sm ${
          darkMode
            ? "border-sky-900/60 bg-sky-950/20 text-slate-300"
            : "border-sky-200 bg-sky-50/50 text-slate-700"
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border uppercase tracking-wider ${
                darkMode
                  ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
                  : "bg-sky-500/10 text-sky-800 border-sky-300/60"
              }`}
            >
              <Activity className="w-4 h-4 text-sky-500" />
              <span>🔵 {flag.label}</span>
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
              {flag.title}
            </span>
          </div>

          <SourcePopover
            refs={flag.refs}
            sources={sources}
            label="Sources"
            darkMode={darkMode}
          />
        </div>

        <div className="text-xs sm:text-sm space-y-1.5">
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Contributing Agents:{" "}
            </span>
            <span className="font-semibold">{contributingNames}</span>
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              Mechanism & Clinical Assessment:{" "}
            </span>
            <span>{flag.description}</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Myasthenia Gravis Safety Card
  if (mg) {
    const drugName = getDrugName(mg.drug_id);
    const isAvoid = mg.status === "avoid";

    return (
      <div
        className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-sm ${
          darkMode
            ? "border-purple-900/60 bg-purple-950/20 text-slate-300"
            : "border-purple-200 bg-purple-50/50 text-slate-700"
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border uppercase tracking-wider ${
                darkMode
                  ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                  : "bg-purple-500/10 text-purple-800 border-purple-300/60"
              }`}
            >
              <Dna className="w-4 h-4 text-purple-500" />
              <span>💪 May Worsen Myasthenia</span>
            </span>
            <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100">
              {drugName} ({isAvoid ? "Avoid in MG" : "Caution / May Worsen MG"})
            </span>
          </div>

          <SourcePopover
            refs={mg.refs}
            sources={sources}
            label="Source"
            darkMode={darkMode}
          />
        </div>

        <div className="text-xs sm:text-sm">
          <span className="font-bold text-slate-900 dark:text-slate-100">
            Clinical Guidance:{" "}
          </span>
          <span>
            {mg.note ||
              "May exacerbate neuromuscular transmission impairment, increase weakness, or precipitate acute myasthenic respiratory crisis. Use alternative agents whenever possible."}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
