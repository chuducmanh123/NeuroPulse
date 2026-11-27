"use client";

import React from "react";
import {
  Activity,
  ArrowRight,
  Droplets,
  FlaskConical,
  Syringe,
} from "lucide-react";

interface ClinicalToolCardItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}

const CLINICAL_TOOLS: ClinicalToolCardItem[] = [
  {
    id: "abg-analyzer",
    title: "Arterial Blood Gas (ABG) Analyzer",
    description:
      "Stepwise acid-base interpretation including primary disorder, Winters/expected compensation, anion gap, and delta-delta ratio.",
    icon: FlaskConical,
    available: false,
  },
  {
    id: "insulin-titration",
    title: "Insulin Dosing & Titration",
    description:
      "Premixed NovoMix 30 / Actrapid inpatient titration (06:00 & 18:00/night) and JBDS/ADA DKA–HHS emergency protocol with EN/VI support.",
    icon: Syringe,
    available: true,
  },
  {
    id: "electrolyte-fluid",
    title: "Electrolyte & Fluid Correction",
    description:
      "Free-water deficit, sodium correction rate tracking, and potassium/magnesium replacement calculators.",
    icon: Droplets,
    available: false,
  },
  {
    id: "osmotherapy-infusion",
    title: "Neuro-ICU Osmotherapy & Infusion Helpers",
    description:
      "Hypertonic saline / mannitol dosing checks and weight-based continuous infusion rate helpers.",
    icon: Activity,
    available: false,
  },
];

interface ClinicalToolsTabProps {
  onSelectTool: (toolId: string) => void;
}

export function ClinicalToolsTab({ onSelectTool }: ClinicalToolsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {CLINICAL_TOOLS.map((tool) => {
        const Icon = tool.icon;
        if (tool.available) {
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              className="group text-left rounded-2xl border border-[var(--border-hairline)] hover:border-[#0E7490] dark:hover:border-cyan-400/60 bg-[var(--bg-surface)] p-4 sm:p-5 shadow-2xs flex items-start gap-3.5 transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-[#0E7490]/12 border border-[#0E7490]/25 flex items-center justify-center text-[#0E7490] dark:text-cyan-400 shrink-0">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[var(--text-ink)] group-hover:text-[#0E7490] dark:group-hover:text-cyan-300 leading-snug transition-colors">
                    {tool.title}
                  </h3>
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-[#0E7490]/30 bg-[#0E7490]/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#0E7490] dark:text-cyan-300">
                    <span>Available</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </button>
          );
        }

        return (
          <div
            key={tool.id}
            className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-2xs flex items-start gap-3.5"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0E7490]/10 border border-[#0E7490]/20 flex items-center justify-center text-[#0E7490] dark:text-cyan-400 shrink-0">
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[var(--text-ink)] leading-snug">
                  {tool.title}
                </h3>
                <span className="shrink-0 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Planned
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                {tool.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
