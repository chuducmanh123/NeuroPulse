"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Baby,
  AlertTriangle,
  FlaskConical,
  Link as LinkIcon,
  ExternalLink,
  ShieldAlert,
  Info,
  Dna,
  HeartPulse,
  ArrowRightLeft,
} from "lucide-react";
import type { DrugRecord, Source, Sourced } from "@/types/neurorx";
import {
  REPRO_TIER_LABELS,
  isReproNotApplicable,
} from "@/lib/neurorx/reproductive";
import { SourcePopover } from "./SourcePopover";
import { PregnancyFlowchartPanel } from "./PregnancyFlowchartPanel";

interface DrugAccordionsProps {
  drug: DrugRecord;
  sources?: Source[];
  darkMode?: boolean;
}

export function DrugAccordions({
  drug,
  sources = [],
  darkMode = false,
}: DrugAccordionsProps) {
  // Accordion open/close state (all collapsed by default per specification)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pregnancy: false,
    neuro: false,
    pk: false,
    interactions: false,
    ecosystem: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Pregnancy & Lactation Data check
  const rep = drug.reproductive;
  const hasPregnancyData = Boolean(
    rep &&
      (rep.tier?.value ||
        (rep.mcm && rep.mcm.length > 0) ||
        rep.folic_acid?.value ||
        rep.pregnancy_pk?.value ||
        rep.postpartum?.value ||
        rep.contraception?.value ||
        rep.lactation_summary?.value ||
        rep.lactation_rid?.value)
  );

  const renderReproFieldValue = (
    field: Sourced<string> | undefined,
    fallback = "No recommendation in sources"
  ) => {
    if (isReproNotApplicable(field)) {
      return (
        <span className="text-slate-400 dark:text-slate-500 italic">
          Not clinically applicable
        </span>
      );
    }
    if (field?.value) {
      return field.value;
    }
    return (
      <span className="text-slate-400 dark:text-slate-500 italic">
        {fallback}
      </span>
    );
  };

  // 2. Neuro Clinical Notes & PGx Data check
  const hasNeuroNotes = Boolean(
    drug.mechanism_of_action?.value ||
      (drug.ae_tags?.value && drug.ae_tags.value.length > 0) ||
      (drug.adverse_effects?.most_common?.value &&
        drug.adverse_effects.most_common.value.length > 0) ||
      (drug.adverse_effects?.serious?.value &&
        drug.adverse_effects.serious.value.length > 0) ||
      drug.pgx?.value ||
      (drug.black_box?.value && drug.black_box.value.length > 0)
  );

  // 3. PK & Hepatic Data check
  const enz = drug.enzyme_profile?.value;
  const hasPkData = Boolean(
    drug.hepatic?.value ||
      drug.renal_impairment?.description ||
      enz
  );

  // 4. FDA Drug Interactions (Section 7) check
  const fdaInteractions = drug.fda_interactions;
  const hasInteractionsData = Boolean(
    fdaInteractions?.value && fdaInteractions.value.length > 0
  );

  // 5. Ecosystem Links check
  const links = drug.links;
  const hasLinks = Boolean(
    links &&
      (links.neuroguide ||
        links.neurocase ||
        links.neurovision ||
        links.neuropulse)
  );

  return (
    <div className="space-y-4 pt-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] px-1">
        Clinical Reference &amp; Pharmacology Accordions
      </h3>

      {/* Accordion 1: Pregnancy & Lactation (Rose Theme) */}
      {hasPregnancyData && rep && (
        <div className="rounded-2xl border border-[var(--border-hairline)] border-l-4 border-l-rose-500 bg-[var(--bg-surface)] shadow-xs transition-colors overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("pregnancy")}
            className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base transition-colors ${
              openSections.pregnancy
                ? darkMode
                  ? "bg-rose-950/25 text-rose-300"
                  : "bg-rose-50/60 text-rose-900"
                : darkMode
                ? "hover:bg-rose-950/20 text-slate-800 dark:text-slate-200"
                : "hover:bg-rose-50/40 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                <Baby className="w-5 h-5" />
              </div>
              <span className="text-slate-900 dark:text-white font-bold text-sm sm:text-base break-words">
                Pregnancy &amp; Lactation Guidance
              </span>
              {rep.tier?.value && (
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider shrink-0 ${
                    rep.tier.value === "preferred"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : rep.tier.value === "caution"
                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {rep.tier.value}
                </span>
              )}
            </div>
            {openSections.pregnancy ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
          </button>

          {openSections.pregnancy && (
            <div className="p-4 sm:p-5 divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80">
              {/* Preconception Planning */}
              <div className="pb-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Preconception Planning
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Folic Acid Supplementation
                      </span>
                      <SourcePopover refs={rep.folic_acid?.refs} sources={sources} darkMode={darkMode} />
                    </div>
                    <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {renderReproFieldValue(rep.folic_acid)}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Contraceptive Interactions
                      </span>
                      <SourcePopover refs={rep.contraception?.refs} sources={sources} darkMode={darkMode} />
                    </div>
                    <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {renderReproFieldValue(rep.contraception)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pregnancy Safety, Pharmacokinetics & Malformations */}
              <div className="py-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Pregnancy Safety, Pharmacokinetics &amp; Malformations
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Pregnancy Safety Tier
                      </span>
                      <SourcePopover refs={rep.tier?.refs} sources={sources} darkMode={darkMode} />
                    </div>
                    <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed">
                      {rep.tier?.value ? (
                        REPRO_TIER_LABELS[rep.tier.value]
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">
                          Not specified in sources
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Pregnancy Pharmacokinetics &amp; Therapeutic Drug Monitoring
                      </span>
                      <SourcePopover refs={rep.pregnancy_pk?.refs} sources={sources} darkMode={darkMode} />
                    </div>
                    <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {renderReproFieldValue(rep.pregnancy_pk)}
                    </p>
                  </div>

                  <PregnancyFlowchartPanel drugId={drug.id} darkMode={darkMode} />

                  {rep.mcm && rep.mcm.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-bold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400 block">
                        Major Congenital Malformations (MCM per Registry)
                      </span>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {rep.mcm.map((m, idx) => (
                          <div
                            key={idx}
                            className="py-2 flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                {m.registry}:
                              </span>
                              <span className="font-bold text-rose-600 dark:text-rose-400 ml-1.5 text-sm sm:text-base">
                                {m.percent}%
                              </span>
                              {m.ci95 && <span className="text-slate-500 text-xs ml-1 font-medium">(95% CI: {m.ci95})</span>}
                              {(m.n_exposed || m.dose_stratum) && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                  {m.n_exposed ? `n = ${m.n_exposed}` : ""}
                                  {m.n_exposed && m.dose_stratum ? " • " : ""}
                                  {m.dose_stratum || ""}
                                </div>
                              )}
                            </div>
                            <SourcePopover refs={m.refs} sources={sources} darkMode={darkMode} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Postpartum */}
              <div className="py-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Postpartum
                </h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      Postpartum Management
                    </span>
                    <SourcePopover refs={rep.postpartum?.refs} sources={sources} darkMode={darkMode} />
                  </div>
                  <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {renderReproFieldValue(rep.postpartum, "No specific postpartum dose reduction schedule in sources")}
                  </p>
                </div>
              </div>

              {/* Lactation & Infant Exposure */}
              <div className="pt-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Lactation &amp; Infant Exposure
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Relative Infant Dose (RID)
                      </span>
                      <SourcePopover refs={rep.lactation_rid?.refs} sources={sources} darkMode={darkMode} />
                    </div>
                    <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {renderReproFieldValue(rep.lactation_rid, "No RID percentage reported in sources")}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs uppercase tracking-wide text-slate-600 dark:text-slate-400">
                        Lactation Safety Summary
                      </span>
                      <SourcePopover refs={rep.lactation_summary?.refs} sources={sources} darkMode={darkMode} />
                    </div>
                    <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {renderReproFieldValue(rep.lactation_summary, "No lactation summary in sources")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accordion 2: Neuro Clinical Notes & Pharmacogenomics (Amber Theme) */}
      {hasNeuroNotes && (
        <div className="rounded-2xl border border-[var(--border-hairline)] border-l-4 border-l-amber-500 bg-[var(--bg-surface)] shadow-xs transition-colors overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("neuro")}
            className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base transition-colors ${
              openSections.neuro
                ? darkMode
                  ? "bg-amber-950/25 text-amber-300"
                  : "bg-amber-50/60 text-amber-900"
                : darkMode
                ? "hover:bg-amber-950/20 text-slate-800 dark:text-slate-200"
                : "hover:bg-amber-50/40 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-slate-900 dark:text-white font-bold text-sm sm:text-base break-words">
                Neuro Clinical Notes &amp; Pharmacogenomics
              </span>
            </div>
            {openSections.neuro ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
          </button>

          {openSections.neuro && (
            <div className="p-4 sm:p-5 divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80">
              {/* Mechanism of Action */}
              {drug.mechanism_of_action?.value && (
                <div className="pb-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Mechanism of Action
                    </span>
                    <SourcePopover refs={drug.mechanism_of_action?.refs} sources={sources} darkMode={darkMode} />
                  </div>
                  <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed">
                    {drug.mechanism_of_action.value}
                  </p>
                </div>
              )}

              {/* Adverse Effect Tags */}
              {drug.ae_tags?.value && drug.ae_tags.value.length > 0 && (
                <div className="py-4 first:pt-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Adverse Effect Classification Tags
                    </span>
                    <SourcePopover refs={drug.ae_tags?.refs} sources={sources} darkMode={darkMode} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {drug.ae_tags.value.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-lg text-xs sm:text-sm font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                      >
                        {tag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Serious & Most Common Adverse Reactions */}
              {(drug.adverse_effects?.serious?.value || drug.adverse_effects?.most_common?.value) && (
                <div className="py-4 first:pt-0 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {drug.adverse_effects?.serious?.value && (
                    <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs uppercase tracking-wider text-rose-800 dark:text-rose-300">
                          Serious Adverse Reactions
                        </span>
                        <SourcePopover refs={drug.adverse_effects.serious.refs} sources={sources} darkMode={darkMode} />
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-normal">
                        {drug.adverse_effects.serious.value.map((ae, idx) => (
                          <li key={idx}>{ae}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {drug.adverse_effects?.most_common?.value && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Most Common Reactions (≥ 5%)
                        </span>
                        <SourcePopover refs={drug.adverse_effects.most_common.refs} sources={sources} darkMode={darkMode} />
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-800 dark:text-slate-200 text-sm leading-relaxed font-normal">
                        {drug.adverse_effects.most_common.value.map((ae, idx) => (
                          <li key={idx}>{ae}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Pharmacogenomics (PGx) */}
              <div className="pt-4 first:pt-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <Dna className="w-4 h-4 text-sky-500" />
                    <span>Pharmacogenomics (PGx)</span>
                  </div>
                  <SourcePopover refs={drug.pgx?.refs} sources={sources} darkMode={darkMode} />
                </div>
                <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed">
                  {drug.pgx?.value || "No recommendation in sources (No testing required by FDA label)"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accordion 3: Pharmacokinetics & Hepatic (Sky Theme) */}
      {hasPkData && (
        <div className="rounded-2xl border border-[var(--border-hairline)] border-l-4 border-l-sky-500 bg-[var(--bg-surface)] shadow-xs transition-colors overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("pk")}
            className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base transition-colors ${
              openSections.pk
                ? darkMode
                  ? "bg-sky-950/25 text-sky-300"
                  : "bg-sky-50/60 text-sky-900"
                : darkMode
                ? "hover:bg-sky-950/20 text-slate-800 dark:text-slate-200"
                : "hover:bg-sky-50/40 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                <FlaskConical className="w-5 h-5" />
              </div>
              <span className="text-slate-900 dark:text-white font-bold text-sm sm:text-base break-words">
                Pharmacokinetics, Renal, Hepatic &amp; Metabolism
              </span>
            </div>
            {openSections.pk ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
          </button>

          {openSections.pk && (
            <div className="p-4 sm:p-5 divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80">
              {/* Renal Impairment Guidance */}
              <div className="pb-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Renal Impairment Guidance
                  </span>
                  <SourcePopover
                    refs={drug.renal_impairment?.refs || drug.renal_basis?.refs}
                    sources={sources}
                    darkMode={darkMode}
                  />
                </div>
                <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed">
                  {(() => {
                    const desc = drug.renal_impairment?.description?.trim();
                    const hasBands = Boolean(
                      drug.renal_impairment?.bands && drug.renal_impairment.bands.length > 0
                    );
                    const basisValue = drug.renal_basis?.value;
                    const isNone = (basisValue as any) === "none" || !basisValue;

                    if (isNone && !hasBands) {
                      return "No dosage adjustment necessary for renal impairment.";
                    }
                    if (
                      desc &&
                      desc !== "Dosing adjustments stratified by renal function." &&
                      desc !== "Adjust dosage based on patient's estimated Creatinine Clearance (CrCl)..."
                    ) {
                      return desc;
                    }
                    if (hasBands && !isNone) {
                      return `Dosing adjustments stratified by renal function (${basisValue || "cg_abw"}).`;
                    }
                    return "No dosage adjustment necessary for renal impairment.";
                  })()}
                </p>

                {/* Renal bands summary if available */}
                {drug.renal_impairment?.bands && drug.renal_impairment.bands.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                      Renal Dosage Adjustments ({drug.renal_basis?.value || "cg_abw"}):
                    </span>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border-t border-b border-slate-100 dark:border-slate-800/60">
                      {drug.renal_impairment.bands.map((b, idx) => (
                        <div
                          key={idx}
                          className="py-2 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 text-sm text-left"
                        >
                          <span className="font-bold text-slate-900 dark:text-slate-100 sm:w-44 shrink-0">
                            {b.min === null
                              ? `< ${b.max}`
                              : b.max === null
                              ? `> ${b.min}`
                              : `${b.min} – ${b.max}`}{" "}
                            mL/min:
                          </span>
                          <span className="font-normal text-slate-700 dark:text-slate-300 text-left">
                            {b.dose_text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hemodialysis note */}
                {drug.renal_impairment?.hemodialysis?.value && (
                  <div className="pt-1 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 text-sm text-left">
                    <span className="font-bold text-slate-800 dark:text-slate-200 sm:w-44 shrink-0">
                      Hemodialysis / ESRD:
                    </span>
                    <span className="font-normal text-slate-700 dark:text-slate-300 text-left">
                      {drug.renal_impairment.hemodialysis.value}
                    </span>
                  </div>
                )}
              </div>

              {/* Hepatic Impairment */}
              <div className="py-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Hepatic Impairment Guidance
                  </span>
                  <SourcePopover refs={drug.hepatic?.refs} sources={sources} darkMode={darkMode} />
                </div>
                <p className="text-sm font-normal text-slate-800 dark:text-slate-200 leading-relaxed">
                  {drug.hepatic?.value || "No dosage adjustment necessary for hepatic impairment."}
                </p>
              </div>

              {/* Enzyme & Interaction Profile */}
              {enz && (
                <div className="pt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      CYP &amp; Transporter Metabolism Profile
                    </span>
                    <SourcePopover refs={drug.enzyme_profile?.refs} sources={sources} darkMode={darkMode} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700 dark:text-slate-300 pt-0.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-bold text-slate-600 dark:text-slate-400">CYP3A4:</span>
                      <span
                        className={
                          enz.cyp3a4
                            ? "font-extrabold uppercase text-amber-600 dark:text-amber-400"
                            : "font-semibold text-slate-800 dark:text-slate-200"
                        }
                      >
                        {enz.cyp3a4 || "none"}
                      </span>
                    </span>

                    <span className="text-slate-300 dark:text-slate-700">•</span>

                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-bold text-slate-600 dark:text-slate-400">CYP2C19:</span>
                      <span
                        className={
                          enz.cyp2c19
                            ? "font-extrabold uppercase text-amber-600 dark:text-amber-400"
                            : "font-semibold text-slate-800 dark:text-slate-200"
                        }
                      >
                        {enz.cyp2c19 || "none"}
                      </span>
                    </span>

                    <span className="text-slate-300 dark:text-slate-700">•</span>

                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-bold text-slate-600 dark:text-slate-400">P-gp:</span>
                      <span
                        className={
                          enz.pgp
                            ? "font-extrabold uppercase text-amber-600 dark:text-amber-400"
                            : "font-semibold text-slate-800 dark:text-slate-200"
                        }
                      >
                        {enz.pgp || "none"}
                      </span>
                    </span>

                    <span className="text-slate-300 dark:text-slate-700">•</span>

                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-bold text-slate-600 dark:text-slate-400">QT Risk:</span>
                      <span
                        className={
                          enz.qt_risk && enz.qt_risk !== "none"
                            ? "font-extrabold capitalize text-rose-600 dark:text-rose-400"
                            : "font-semibold capitalize text-slate-800 dark:text-slate-200"
                        }
                      >
                        {enz.qt_risk || "none"}
                      </span>
                    </span>

                    {enz.acb_score !== undefined && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="font-bold text-slate-600 dark:text-slate-400">ACB Score:</span>
                          <span
                            className={
                              enz.acb_score > 0
                                ? "font-extrabold text-amber-600 dark:text-amber-400"
                                : "font-semibold text-slate-800 dark:text-slate-200"
                            }
                          >
                            {enz.acb_score}
                          </span>
                        </span>
                      </>
                    )}

                    {enz.serotonergic && (
                      <>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="font-extrabold text-purple-600 dark:text-purple-400">
                          ⚡ Serotonergic Activity
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Accordion 4: Drug Interactions (FDA Prescribing Information) (Purple Theme) */}
      {hasInteractionsData && fdaInteractions && fdaInteractions.value && (
        <div className="rounded-2xl border border-[var(--border-hairline)] border-l-4 border-l-purple-500 bg-[var(--bg-surface)] shadow-xs transition-colors overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("interactions")}
            className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base transition-colors ${
              openSections.interactions
                ? darkMode
                  ? "bg-purple-950/25 text-purple-300"
                  : "bg-purple-50/60 text-purple-900"
                : darkMode
                ? "hover:bg-purple-950/20 text-slate-800 dark:text-slate-200"
                : "hover:bg-purple-50/40 text-slate-800"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <span className="text-slate-900 dark:text-white font-bold text-sm sm:text-base break-words">
                Drug Interactions (FDA Prescribing Information)
              </span>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 shrink-0">
                {fdaInteractions.value.length} {fdaInteractions.value.length === 1 ? "Class" : "Classes"}
              </span>
            </div>
            {openSections.interactions ? (
              <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
            )}
          </button>

          {openSections.interactions && (
            <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between pt-3">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Key pharmacokinetic &amp; pharmacodynamic drug interactions from FDA Section 7, including non-neurology co-medications (antimicrobials, contraceptives, cardiac agents).
                </p>
                <SourcePopover refs={fdaInteractions.refs} sources={sources} darkMode={darkMode} />
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {fdaInteractions.value.map((item, idx) => {
                  const sev = item.severity;
                  return (
                    <div
                      key={idx}
                      className="py-3.5 first:pt-0 last:pb-0 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                            {item.drug_or_class}
                          </span>
                          {sev && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                                sev === "contraindicated"
                                  ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30"
                                  : sev === "major"
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                  : "bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30"
                              }`}
                            >
                              {sev}
                            </span>
                          )}
                        </div>
                        {item.refs && item.refs.length > 0 && (
                          <SourcePopover refs={item.refs} sources={sources} darkMode={darkMode} />
                        )}
                      </div>

                      <div className="text-sm space-y-1.5 leading-relaxed">
                        <div>
                          <span className="font-semibold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Effect / Mechanism:{" "}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-normal">{item.effect}</span>
                        </div>
                        <div className="pt-0.5">
                          <span className="font-semibold text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Clinical Management:{" "}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 font-normal">
                            {item.management}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accordion 5: Ecosystem Links (Indigo Theme) */}
      {hasLinks && links && (
        <div className="rounded-2xl border border-[var(--border-hairline)] border-l-4 border-l-indigo-500 bg-[var(--bg-surface)] shadow-xs transition-colors overflow-hidden">
          <button
            type="button"
            onClick={() => toggleSection("ecosystem")}
            className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base transition-colors ${
              openSections.ecosystem
                ? "bg-indigo-50/60 dark:bg-indigo-950/25 text-indigo-900 dark:text-indigo-300"
                : "hover:bg-[var(--bg-subtle)] text-[var(--text-ink)]"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0">
                <LinkIcon className="w-5 h-5" />
              </div>
              <span className="text-[var(--text-ink)] font-bold text-sm sm:text-base break-words">
                NeuroPulse Ecosystem Integration
              </span>
            </div>
            {openSections.ecosystem ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)] shrink-0" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)] shrink-0" />}
          </button>

          {openSections.ecosystem && (
            <div className="p-4 sm:p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-[var(--border-hairline)]">
              {links.neuroguide && (
                <a
                  href={`/neuroguide?q=${encodeURIComponent(drug.generic_name)}`}
                  className="p-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:border-[#C25934] transition-colors flex items-center justify-between mt-3"
                >
                  <div>
                    <span className="font-extrabold text-[var(--text-ink)] text-sm sm:text-base block">NeuroGuide</span>
                    <span className="text-[var(--text-muted)] text-xs sm:text-sm font-medium">Clinical practice guidelines</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#C25934]" />
                </a>
              )}

              {links.neurocase && (
                <a
                  href={`/neurocase?q=${encodeURIComponent(drug.generic_name)}`}
                  className="p-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:border-[#6D28D9] transition-colors flex items-center justify-between mt-3"
                >
                  <div>
                    <span className="font-extrabold text-[var(--text-ink)] text-sm sm:text-base block">NeuroCase</span>
                    <span className="text-[var(--text-muted)] text-xs sm:text-sm font-medium">Real-world case discussions</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#6D28D9]" />
                </a>
              )}

              {links.neuropulse && (
                <a
                  href={`/neuropulse?q=${encodeURIComponent(drug.generic_name)}`}
                  className="p-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:border-[#B91C1C] transition-colors flex items-center justify-between mt-3"
                >
                  <div>
                    <span className="font-extrabold text-[var(--text-ink)] text-sm sm:text-base block">NeuroPulse Monitor</span>
                    <span className="text-[var(--text-muted)] text-xs sm:text-sm font-medium">Pivotal trials &amp; literature</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#B91C1C]" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
