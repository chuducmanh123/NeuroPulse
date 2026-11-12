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
} from "lucide-react";
import type { DrugRecord, Source } from "@/types/neurorx";
import { SourcePopover } from "./SourcePopover";

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
        rep.postpartum?.value ||
        rep.contraception?.value ||
        rep.lactation_summary?.value ||
        rep.lactation_rid?.value)
  );

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

  // 4. Ecosystem Links check
  const links = drug.links;
  const hasLinks = Boolean(
    links &&
      (links.neuroguide ||
        links.neurocase ||
        links.neurovision ||
        links.neuropulse)
  );

  return (
    <div className="space-y-3 pt-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
        Clinical Reference & Pharmacology Accordions
      </h3>

      {/* Accordion 1: Pregnancy & Lactation (Rose Theme) */}
      {hasPregnancyData && rep && (
        <div
          className={`rounded-2xl border border-l-4 border-l-rose-500 transition-colors overflow-hidden ${
            darkMode ? "bg-slate-900/80 border-rose-900/40" : "bg-white border-rose-200/80 shadow-sm"
          }`}
        >
          <button
            type="button"
            onClick={() => toggleSection("pregnancy")}
            className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base transition-colors ${
              openSections.pregnancy
                ? darkMode
                  ? "bg-rose-950/25 text-rose-300"
                  : "bg-rose-50/60 text-rose-900"
                : darkMode
                ? "hover:bg-rose-950/20"
                : "hover:bg-rose-50/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <Baby className="w-4 h-4" />
              </div>
              <span className="text-slate-900 dark:text-white">
                🤰 Pregnancy &amp; Lactation Guidance
              </span>
              {rep.tier?.value && (
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${
                    rep.tier.value === "preferred"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : rep.tier.value === "caution"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {rep.tier.value}
                </span>
              )}
            </div>
            {openSections.pregnancy ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSections.pregnancy && (
            <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm">
              {/* Reproductive Tier & Folic Acid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Pregnancy Safety Tier:
                    </span>
                    <SourcePopover refs={rep.tier?.refs} sources={sources} darkMode={darkMode} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {rep.tier?.value ? `Classification: ${rep.tier.value}` : "No recommendation in sources"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Folic Acid Supplementation:
                    </span>
                    <SourcePopover refs={rep.folic_acid?.refs} sources={sources} darkMode={darkMode} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {rep.folic_acid?.value || "No recommendation in sources"}
                  </p>
                </div>
              </div>

              {/* Major Congenital Malformations (MCM) */}
              {rep.mcm && rep.mcm.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    Major Congenital Malformation (MCM) Registries:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {rep.mcm.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {m.registry}:
                          </span>
                          <span className="font-mono font-bold text-rose-600 dark:text-rose-400 ml-1.5">
                            {m.percent}%
                          </span>
                          {m.ci95 && <span className="text-slate-400 text-[11px] ml-1">({m.ci95})</span>}
                        </div>
                        <SourcePopover refs={m.refs} sources={sources} darkMode={darkMode} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lactation & Postpartum */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Lactation &amp; Breastfeeding:
                    </span>
                    <SourcePopover refs={rep.lactation_summary?.refs} sources={sources} darkMode={darkMode} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {rep.lactation_summary?.value || "No recommendation in sources"}
                  </p>
                  {rep.lactation_rid?.value && (
                    <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                      Relative Infant Dose (RID): {rep.lactation_rid.value}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Postpartum &amp; Contraception:
                    </span>
                    <SourcePopover refs={rep.postpartum?.refs} sources={sources} darkMode={darkMode} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">
                    {rep.postpartum?.value || "No recommendation in sources"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accordion 2: Neuro Clinical Notes & Pharmacogenomics (Amber Theme) */}
      {hasNeuroNotes && (
        <div
          className={`rounded-2xl border border-l-4 border-l-amber-500 transition-colors overflow-hidden ${
            darkMode ? "bg-slate-900/80 border-amber-900/40" : "bg-white border-amber-200/80 shadow-sm"
          }`}
        >
          <button
            type="button"
            onClick={() => toggleSection("neuro")}
            className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base transition-colors ${
              openSections.neuro
                ? darkMode
                  ? "bg-amber-950/25 text-amber-300"
                  : "bg-amber-50/60 text-amber-900"
                : darkMode
                ? "hover:bg-amber-950/20"
                : "hover:bg-amber-50/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="text-slate-900 dark:text-white">
                ⚠️ Neuro Clinical Notes &amp; Pharmacogenomics
              </span>
            </div>
            {openSections.neuro ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSections.neuro && (
            <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm">
              {/* Mechanism of Action */}
              {drug.mechanism_of_action?.value && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1 mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Mechanism of Action:
                    </span>
                    <SourcePopover refs={drug.mechanism_of_action?.refs} sources={sources} darkMode={darkMode} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {drug.mechanism_of_action.value}
                  </p>
                </div>
              )}

              {/* Adverse Effect Tags */}
              {drug.ae_tags?.value && drug.ae_tags.value.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Adverse Effect Classification Tags:
                    </span>
                    <SourcePopover refs={drug.ae_tags?.refs} sources={sources} darkMode={darkMode} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {drug.ae_tags.value.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20"
                      >
                        {tag.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Serious & Most Common Adverse Reactions */}
              {(drug.adverse_effects?.serious?.value || drug.adverse_effects?.most_common?.value) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {drug.adverse_effects?.serious?.value && (
                    <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-800 dark:text-rose-300">
                          Serious Adverse Reactions:
                        </span>
                        <SourcePopover refs={drug.adverse_effects.serious.refs} sources={sources} darkMode={darkMode} />
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 text-xs">
                        {drug.adverse_effects.serious.value.map((ae, idx) => (
                          <li key={idx}>{ae}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {drug.adverse_effects?.most_common?.value && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Most Common Reactions (≥ 5%):
                        </span>
                        <SourcePopover refs={drug.adverse_effects.most_common.refs} sources={sources} darkMode={darkMode} />
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 text-xs">
                        {drug.adverse_effects.most_common.value.map((ae, idx) => (
                          <li key={idx}>{ae}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Pharmacogenomics (PGx) */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                    <Dna className="w-4 h-4 text-sky-500" />
                    <span>Pharmacogenomics (PGx):</span>
                  </div>
                  <SourcePopover refs={drug.pgx?.refs} sources={sources} darkMode={darkMode} />
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                  {drug.pgx?.value || "No recommendation in sources (No testing required by FDA label)"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accordion 3: Pharmacokinetics & Hepatic (Sky Theme) */}
      {hasPkData && (
        <div
          className={`rounded-2xl border border-l-4 border-l-sky-500 transition-colors overflow-hidden ${
            darkMode ? "bg-slate-900/80 border-sky-900/40" : "bg-white border-sky-200/80 shadow-sm"
          }`}
        >
          <button
            type="button"
            onClick={() => toggleSection("pk")}
            className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base transition-colors ${
              openSections.pk
                ? darkMode
                  ? "bg-sky-950/25 text-sky-300"
                  : "bg-sky-50/60 text-sky-900"
                : darkMode
                ? "hover:bg-sky-950/20"
                : "hover:bg-sky-50/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <FlaskConical className="w-4 h-4" />
              </div>
              <span className="text-slate-900 dark:text-white">
                🧪 Pharmacokinetics, Renal, Hepatic &amp; Metabolism
              </span>
            </div>
            {openSections.pk ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSections.pk && (
            <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm">
              {/* Renal Impairment Guidance */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Renal Impairment Guidance:
                  </span>
                  <SourcePopover
                    refs={drug.renal_impairment?.refs || drug.renal_basis?.refs}
                    sources={sources}
                    darkMode={darkMode}
                  />
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
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
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Renal Dosage Adjustments ({drug.renal_basis?.value || "cg_abw"}):
                    </span>
                    <div className="space-y-1 text-xs">
                      {drug.renal_impairment.bands.map((b, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2"
                        >
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {b.min === null
                              ? `< ${b.max}`
                              : b.max === null
                              ? `> ${b.min}`
                              : `${b.min} – ${b.max}`}{" "}
                            mL/min:
                          </span>
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            {b.dose_text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hemodialysis note */}
                {drug.renal_impairment?.hemodialysis?.value && (
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                      Hemodialysis / ESRD:
                    </span>
                    <span className="font-medium text-slate-600 dark:text-slate-400 text-right">
                      {drug.renal_impairment.hemodialysis.value}
                    </span>
                  </div>
                )}
              </div>

              {/* Hepatic Impairment */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Hepatic Impairment Guidance:
                  </span>
                  <SourcePopover refs={drug.hepatic?.refs} sources={sources} darkMode={darkMode} />
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {drug.hepatic?.value || "No dosage adjustment necessary for hepatic impairment."}
                </p>
              </div>

              {/* Enzyme & Interaction Profile - Hiển thị dạng chữ nổi bật, không kẻ bảng */}
              {enz && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      CYP &amp; Transporter Metabolism Profile:
                    </span>
                    <SourcePopover refs={drug.enzyme_profile?.refs} sources={sources} darkMode={darkMode} />
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-0.5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-medium text-slate-500 dark:text-slate-400">CYP3A4:</span>
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
                      <span className="font-medium text-slate-500 dark:text-slate-400">CYP2C19:</span>
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
                      <span className="font-medium text-slate-500 dark:text-slate-400">P-gp:</span>
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
                      <span className="font-medium text-slate-500 dark:text-slate-400">QT Risk:</span>
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
                          <span className="font-medium text-slate-500 dark:text-slate-400">ACB Score:</span>
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
                        <span className="font-bold text-purple-600 dark:text-purple-400">
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

      {/* Accordion 4: Ecosystem Links (Indigo Theme) */}
      {hasLinks && links && (
        <div
          className={`rounded-2xl border border-l-4 border-l-indigo-500 transition-colors overflow-hidden ${
            darkMode ? "bg-slate-900/80 border-indigo-900/40" : "bg-white border-indigo-200/80 shadow-sm"
          }`}
        >
          <button
            type="button"
            onClick={() => toggleSection("ecosystem")}
            className={`w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left font-bold text-sm sm:text-base transition-colors ${
              openSections.ecosystem
                ? darkMode
                  ? "bg-indigo-950/25 text-indigo-300"
                  : "bg-indigo-50/60 text-indigo-900"
                : darkMode
                ? "hover:bg-indigo-950/20"
                : "hover:bg-indigo-50/40"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <LinkIcon className="w-4 h-4" />
              </div>
              <span className="text-slate-900 dark:text-white">
                🔗 NeuroPulse Ecosystem Integration
              </span>
            </div>
            {openSections.ecosystem ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>

          {openSections.ecosystem && (
            <div className="p-4 sm:p-5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm">
              {links.neuroguide && (
                <a
                  href={`/neuroguide?q=${encodeURIComponent(drug.generic_name)}`}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 transition-colors flex items-center justify-between mt-3"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">NeuroGuide</span>
                    <span className="text-slate-500 text-xs">Clinical practice guidelines</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-amber-500" />
                </a>
              )}

              {links.neurocase && (
                <a
                  href={`/neurocase?q=${encodeURIComponent(drug.generic_name)}`}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors flex items-center justify-between mt-3"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">NeuroCase</span>
                    <span className="text-slate-500 text-xs">Real-world case discussions</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-indigo-500" />
                </a>
              )}

              {links.neuropulse && (
                <a
                  href={`/?q=${encodeURIComponent(drug.generic_name)}`}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">NeuroPulse Monitor</span>
                    <span className="text-slate-500 text-xs">Pivotal trials &amp; literature</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-rose-500" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
