"use client";

import React, { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  AlertOctagon,
  FileText,
  Layers,
  HelpCircle,
} from "lucide-react";
import type { DrugRecord, Source } from "@/types/neurorx";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import { useNeuroRxStore } from "@/store/useNeuroRxStore";
import { resolveRenalFunction } from "@/lib/neurorx/patient";
import { PatientBar } from "./PatientBar";
import { DoseCard } from "./DoseCard";
import { SourcePopover } from "./SourcePopover";
import { ToolsRow } from "./ToolsRow";
import { DrugAccordions } from "./DrugAccordions";
import { AuditTrail } from "./AuditTrail";

interface DrugDetailProps {
  drugItem: DrugWithEffectiveStatus;
  sources?: Source[];
  onBack: () => void;
  darkMode?: boolean;
}

export function DrugDetail({
  drugItem,
  sources = [],
  onBack,
  darkMode = false,
}: DrugDetailProps) {
  const searchParams = useSearchParams();
  const { initFromSearchParams, patientParsed } = useNeuroRxStore();

  // Initialize store patient inputs from URL query params (if present, e.g. from Omnibar)
  useEffect(() => {
    initFromSearchParams(searchParams);
  }, [searchParams, initFromSearchParams]);

  const drug = drugItem.drug;
  const isVerified = drugItem.effectiveStatus === "verified";
  const tallManName = drug.tall_man?.value || drug.generic_name;

  // Resolve renal function for DoseCards
  const renalBasis = drug.renal_basis?.value || "cg_abw";
  const renalResult = resolveRenalFunction(patientParsed, renalBasis);

  // Split regimens by clinical setting
  const acuteRegimens = drug.regimens.filter((r) => r.setting === "acute_inpatient");
  const maintRegimens = drug.regimens.filter((r) => r.setting === "maintenance_outpatient");

  // Clinical indicators
  const mgSafety = drug.mg_safety?.value;
  const ngTube = drug.ng_tube?.value;
  const blackBox = drug.black_box?.value;

  return (
    <div className="space-y-6">
      {/* 1. Back Navigation Button */}
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
          darkMode
            ? "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
            : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-sm"
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to drug directory</span>
      </button>

      {/* 2. Tier 1 Header */}
      <div
        className={`p-6 sm:p-7 rounded-2xl border transition-colors ${
          darkMode
            ? "bg-slate-900/90 border-slate-800"
            : "bg-white border-slate-200/90 shadow-sm"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-wide text-slate-900 dark:text-white">
                {tallManName}
              </h1>

              {/* Source Popover for Tall Man */}
              <SourcePopover
                refs={drug.tall_man?.refs}
                sources={sources}
                label="ISMP"
                darkMode={darkMode}
              />

              {/* Verification Status */}
              {isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Pending verification</span>
                </span>
              )}
            </div>

            {/* Vietnam Marketed Products */}
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {drug.vn_products?.value && drug.vn_products.value.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    VN Formulations:
                  </span>
                  {drug.vn_products.value.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium"
                    >
                      {p.brand} ({p.strength} {p.form})
                    </span>
                  ))}
                  <SourcePopover
                    refs={drug.vn_products?.refs}
                    sources={sources}
                    label="Source"
                    darkMode={darkMode}
                  />
                </div>
              ) : (
                <span className="italic text-slate-400">VN Products: No data yet</span>
              )}
            </div>

            {/* Drug Classes */}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {drug.classes.join(" • ")}
            </p>
          </div>

          {/* Clinical Alert Badges (MG-safety & NG-tube) */}
          <div className="flex flex-wrap md:flex-col gap-2 items-start md:items-end">
            {/* Myasthenia Gravis Safety Badge */}
            {mgSafety && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                    mgSafety === "safe"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                      : mgSafety === "caution"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                      : "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25"
                  }`}
                >
                  <span>
                    {mgSafety === "safe"
                      ? "🛡️ MG: Safe"
                      : mgSafety === "caution"
                      ? "⚠️ MG: Caution"
                      : "🛑 MG: Avoid/May Worsen"}
                  </span>
                </span>
                <SourcePopover
                  refs={drug.mg_safety?.refs}
                  sources={sources}
                  darkMode={darkMode}
                />
              </div>
            )}

            {/* NG-Tube Guidance Badge */}
            {ngTube && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                    ngTube.crushable
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                  }`}
                  title={ngTube.instructions}
                >
                  <span>
                    {ngTube.crushable ? "✓ NG-Tube: Crushable" : "🚫 NG-Tube: Do Not Crush"}
                  </span>
                </span>
                <SourcePopover
                  refs={drug.ng_tube?.refs}
                  sources={sources}
                  darkMode={darkMode}
                />
              </div>
            )}
          </div>
        </div>

        {/* Black-Box Warning Banner */}
        {blackBox && blackBox.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-900 dark:text-rose-200 text-xs sm:text-sm font-semibold flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold uppercase tracking-wider block text-rose-700 dark:text-rose-400 mb-1">
                  FDA Boxed Warning:
                </span>
                <p className="whitespace-pre-line leading-relaxed">
                  {blackBox.join("\n")}
                </p>
              </div>
            </div>
            <SourcePopover
              refs={drug.black_box?.refs}
              sources={sources}
              darkMode={darkMode}
            />
          </div>
        )}
      </div>

      {/* DRAFT GATE (User story 5): If unverified, lock all dosing cards & numbers */}
      {!isVerified ? (
        <div
          className={`p-8 rounded-2xl border text-center space-y-3 ${
            darkMode ? "bg-amber-950/20 border-amber-900/40" : "bg-amber-50/70 border-amber-200"
          }`}
        >
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 mb-1">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
            Pending Verification — Dosing Locked
          </h3>
          <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-300 max-w-lg mx-auto font-medium">
            This drug record is currently in <strong>draft</strong> status or has an unsealed hash. Under clinical safety guardrails (G1 &amp; G2), all numeric dosage calculators, titration schedules, and copy actions are locked until an administrator reviews and verifies the record against the official source document.
          </p>
        </div>
      ) : (
        <>
          {/* 3. Patient Context Bar */}
          <PatientBar drug={drug} darkMode={darkMode} />

          {/* 4. Tier 2: Two Dose Cards (Side-by-Side on Desktop, Stacked on Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <DoseCard
              drug={drug}
              regimens={acuteRegimens}
              setting="acute_inpatient"
              patient={patientParsed}
              renal={renalResult}
              darkMode={darkMode}
            />

            <DoseCard
              drug={drug}
              regimens={maintRegimens}
              setting="maintenance_outpatient"
              patient={patientParsed}
              renal={renalResult}
              darkMode={darkMode}
            />
          </div>

          {/* 5. Tier 3: Contextual Tools Row */}
          <ToolsRow
            drug={drug}
            sources={sources}
            patient={patientParsed}
            renal={renalResult}
            darkMode={darkMode}
          />

          {/* 6. Tier 3: Reference & Pharmacology Accordions */}
          <DrugAccordions drug={drug} sources={sources} darkMode={darkMode} />

          {/* 7. Tier 3: Cryptographic Audit Trail & Citations Footer */}
          <AuditTrail
            drug={drug}
            effectiveStatus={drugItem.effectiveStatus}
            hashMatches={drugItem.hashMatches}
            sources={sources}
            darkMode={darkMode}
          />
        </>
      )}
    </div>
  );
}
