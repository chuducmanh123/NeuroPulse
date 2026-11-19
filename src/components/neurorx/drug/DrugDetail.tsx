"use client";

import React, { useState, useEffect } from "react";
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
  Activity,
  ChevronDown,
  Edit,
} from "lucide-react";
import type { DrugRecord, Source } from "@/types/neurorx";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import { useNeuroRxStore } from "@/store/useNeuroRxStore";
import { resolveRenalFunction } from "@/lib/neurorx/patient";
import { getStoredAdminToken } from "@/utils/clientAuth";
import { PatientBar } from "./PatientBar";
import { DoseCard } from "./DoseCard";
import { SourcePopover } from "./SourcePopover";
import { TallManHint } from "../TallManHint";
import { ToolsRow } from "./ToolsRow";
import { DrugAccordions } from "./DrugAccordions";
import { AuditTrail } from "./AuditTrail";
import { EditDrugModal } from "@/components/neurorx/admin/EditDrugModal";
import { HistoryPanel } from "@/components/neurorx/admin/HistoryPanel";
import type { SyncRow } from "@/lib/neurorx/sync/types";

interface DrugDetailProps {
  drugItem: DrugWithEffectiveStatus;
  sources?: Source[];
  onBack: () => void;
  darkMode?: boolean;
  syncRow?: SyncRow | null;
  onApplyLocalWrite?: (row: SyncRow) => Promise<void> | void;
}

export function DrugDetail({
  drugItem,
  sources = [],
  onBack,
  darkMode = false,
  syncRow = null,
  onApplyLocalWrite,
}: DrugDetailProps) {
  const searchParams = useSearchParams();
  const { initFromSearchParams, patientParsed } = useNeuroRxStore();

  const [currentDrugItem, setCurrentDrugItem] = useState(drugItem);
  const [showPatientVars, setShowPatientVars] = useState(false);
  const [selectedRegimenIndex, setSelectedRegimenIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [historyRow, setHistoryRow] = useState<SyncRow | null>(null);

  useEffect(() => {
    setCurrentDrugItem(drugItem);
  }, [drugItem]);

  useEffect(() => {
    const checkAdmin = () => {
      setIsAdmin(Boolean(getStoredAdminToken()));
    };
    checkAdmin();
    window.addEventListener("storage", checkAdmin);
    return () => window.removeEventListener("storage", checkAdmin);
  }, []);

  // Initialize store patient inputs from URL query params (if present, e.g. from Omnibar)
  useEffect(() => {
    initFromSearchParams(searchParams);
  }, [searchParams, initFromSearchParams]);

  const drug = currentDrugItem.drug;
  const isVerified = currentDrugItem.effectiveStatus === "verified";
  const tallManName = drug.tall_man?.value || drug.generic_name;

  // Resolve renal function for DoseCards
  const renalBasis = drug.renal_basis?.value || "cg_abw";
  const renalResult = resolveRenalFunction(patientParsed, renalBasis);

  // Clinical indicators
  const mgSafety = drug.mg_safety?.value;
  const ngTube = drug.ng_tube?.value;
  const blackBox = drug.black_box?.value;

  const handleSaveDrug = async (updatedDrug: DrugRecord): Promise<boolean> => {
    setCurrentDrugItem({
      drug: updatedDrug,
      effectiveStatus: updatedDrug.status === "verified" ? "verified" : "draft",
      hashMatches: true,
    });
    window.dispatchEvent(new CustomEvent("neurorx_drug_updated"));
    return true;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Back Navigation Button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-ink)] shadow-2xs transition-all min-h-[38px] sm:min-h-[42px]"
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
        <span>Back to drug directory</span>
      </button>

      {/* 2. Tier 1 Header - Sage Emerald Identity Block */}
      <div className="p-4 sm:p-6 rounded-2xl border border-[var(--border-hairline)] border-l-4 border-l-[#2F855A] bg-[var(--bg-surface)] shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-[var(--text-ink)] break-words">
                {tallManName}
              </h1>

              <TallManHint
                tallMan={drug.tall_man}
                genericName={drug.generic_name}
                darkMode={darkMode}
              />

              {/* Source Popover for Tall Man */}
              <SourcePopover
                refs={drug.tall_man?.refs}
                sources={sources}
                label="ISMP"
                darkMode={darkMode}
              />

              {/* Verification Status */}
              {isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Pending verification</span>
                </span>
              )}

              {/* Edit Drug Button - Only visible for authenticated admin */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-bold border border-[#2F855A]/40 hover:border-[#2F855A] bg-[#2F855A]/10 text-[#2F855A] dark:text-emerald-400 shadow-2xs hover:bg-[#2F855A]/15 transition-all cursor-pointer shrink-0"
                  title="Edit drug details and dosing regimens"
                >
                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Vietnam Marketed Products */}
            <div className="text-sm text-[var(--text-secondary)]">
              {drug.vn_products?.value && drug.vn_products.value.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold uppercase tracking-wide text-xs sm:text-sm text-[var(--text-secondary)]">
                    VN Formulations:
                  </span>
                  {drug.vn_products.value.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-ink)] font-semibold text-xs sm:text-sm break-words border border-[var(--border-hairline)]"
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
                <span className="italic text-[var(--text-muted)] text-xs sm:text-sm">VN Products: No data yet</span>
              )}
            </div>

            {/* Drug Classes */}
            <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] break-words">
              {drug.classes.join(" • ")}
            </p>
          </div>
        </div>

        {/* Black-Box Warning Banner */}
        {blackBox && blackBox.length > 0 && (
          <div className="mt-4 p-3.5 sm:p-5 rounded-xl bg-rose-50/90 dark:bg-rose-950/35 border border-rose-300 dark:border-rose-500/40 text-rose-950 dark:text-rose-100 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide text-xs sm:text-sm text-rose-800 dark:text-rose-300">
                  FDA Boxed Warning:
                </span>
              </div>
              <SourcePopover
                refs={drug.black_box?.refs}
                sources={sources}
                darkMode={darkMode}
              />
            </div>
            <p className="whitespace-pre-line leading-relaxed text-xs sm:text-sm font-medium break-words">
              {blackBox.join("\n")}
            </p>
          </div>
        )}
      </div>

      {/* 3. Dosing Section: Unified Dosing Card (Chỉ định, Hướng dẫn dùng thuốc lâm sàng & Chế độ điều trị) */}
      <div className="space-y-4">
        {!isVerified && (
          <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center gap-3 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong className="font-bold">Draft Record:</strong> This drug record is currently in draft status.
              {isAdmin && " You can review the dosing guidance below or click Edit to finalize."}
            </span>
          </div>
        )}

        {/* Unified Dose Card */}
        <DoseCard
          drug={drug}
          regimens={drug.regimens || []}
          setting="unified"
          patient={patientParsed}
          renal={renalResult}
          selectedIndex={selectedRegimenIndex}
          onSelectIndex={setSelectedRegimenIndex}
          darkMode={darkMode}
        />

        {/* Myasthenia Gravis Safety & Nasogastric Tube Administration */}
        {(mgSafety || ngTube) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {mgSafety && (
              <div
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-colors flex items-start justify-between gap-3 ${
                  mgSafety === "safe"
                    ? darkMode
                      ? "bg-emerald-950/20 border-emerald-800/50 text-emerald-200"
                      : "bg-emerald-50/60 border-emerald-200/80 text-emerald-900"
                    : mgSafety === "caution"
                    ? darkMode
                      ? "bg-amber-950/20 border-amber-800/50 text-amber-200"
                      : "bg-amber-50/60 border-amber-200/80 text-amber-900"
                    : darkMode
                    ? "bg-rose-950/20 border-rose-800/50 text-rose-200"
                    : "bg-rose-50/60 border-rose-200/80 text-rose-900"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {mgSafety === "safe" ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : mgSafety === "caution" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                      Myasthenia Gravis Safety
                    </div>
                    <p className="text-xs sm:text-sm font-semibold">
                      {mgSafety === "safe"
                        ? "Safe"
                        : mgSafety === "caution"
                        ? "Caution"
                        : "Avoid / May Worsen"}
                    </p>
                  </div>
                </div>
                <SourcePopover
                  refs={drug.mg_safety?.refs}
                  sources={sources}
                  darkMode={darkMode}
                />
              </div>
            )}

            {ngTube && (
              <div
                className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border transition-colors flex items-start justify-between gap-3 ${
                  ngTube.crushable
                    ? darkMode
                      ? "bg-emerald-950/20 border-emerald-800/50 text-emerald-200"
                      : "bg-emerald-50/60 border-emerald-200/80 text-emerald-900"
                    : darkMode
                    ? "bg-amber-950/20 border-amber-800/50 text-amber-200"
                    : "bg-amber-50/60 border-amber-200/80 text-amber-900"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {ngTube.crushable ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                      Nasogastric Tube Administration
                    </div>
                    <p className="text-xs sm:text-sm font-semibold">
                      {ngTube.crushable ? "Crushable" : "Do Not Crush"}
                    </p>
                    {ngTube.instructions && (
                      <p className="text-xs sm:text-sm opacity-90 break-words leading-relaxed">
                        {ngTube.instructions}
                      </p>
                    )}
                  </div>
                </div>
                <SourcePopover
                  refs={drug.ng_tube?.refs}
                  sources={sources}
                  darkMode={darkMode}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Bedside Patient Variables & Computed Dosage (Thông số bệnh nhân & Liều tính toán tại giường) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowPatientVars((prev) => !prev)}
          className={`w-full p-4 sm:p-5 rounded-2xl border border-l-4 border-l-[#2F855A] transition-all flex items-center justify-between gap-3 text-left ${
            showPatientVars
              ? "bg-emerald-50/45 dark:bg-emerald-950/20 border-[#2F855A]/60 shadow-sm ring-1 ring-[#2F855A]/20"
              : "bg-[var(--bg-surface)] border-[var(--border-hairline)] hover:border-[#2F855A] shadow-2xs"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl shrink-0 bg-[#2F855A]/10 text-[#2F855A] dark:bg-emerald-500/15 dark:text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-[var(--text-ink)] truncate">
                  Bedside Patient Variables &amp; Computed Dosage
                </span>
                {renalResult.value !== null && (
                  <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-full font-bold bg-[#2F855A]/15 text-[#2F855A] dark:text-emerald-300 border border-[#2F855A]/30 shrink-0">
                    CrCl: {renalResult.value} mL/min
                  </span>
                )}
                {patientParsed.weightKg !== undefined && (
                  <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-full font-bold bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-ink)] shrink-0">
                    {patientParsed.weightKg} kg
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-[var(--text-muted)] mt-1 line-clamp-1 sm:line-clamp-none">
                {showPatientVars
                  ? "Click to collapse patient variables & computed dosage"
                  : "Click to enter patient variables (Weight, Age, Sex, Creatinine, CrCl...) & view computed dosage"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[#2F855A]/10 text-[#2F855A] dark:bg-emerald-500/15 dark:text-emerald-300 hidden sm:inline">
              {showPatientVars ? "Collapse" : "Adjust"}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-[var(--text-muted)] transition-transform duration-200 ${
                showPatientVars ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {showPatientVars && (
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <PatientBar
              drug={drug}
              regimens={drug.regimens || []}
              selectedRegimenIndex={selectedRegimenIndex}
              onSelectRegimenIndex={setSelectedRegimenIndex}
              darkMode={darkMode}
            />
          </div>
        )}
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

      {/* 7. Tier 3: Cryptographic Audit Trail & Citations Footer - Only visible for admin */}
      {isAdmin && (
        <AuditTrail
          drug={drug}
          effectiveStatus={currentDrugItem.effectiveStatus}
          hashMatches={currentDrugItem.hashMatches}
          sources={sources}
          darkMode={darkMode}
        />
      )}

      {/* Edit Drug Modal - Admin only */}
      {isAdmin && isEditModalOpen && (
        <EditDrugModal
          drug={drug}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveDrug}
          darkMode={darkMode}
          syncRow={syncRow}
          onApplyLocalWrite={onApplyLocalWrite}
          onOpenHistory={(row) => {
            setIsEditModalOpen(false);
            setHistoryRow(row);
          }}
        />
      )}

      {historyRow && (
        <HistoryPanel
          isOpen={true}
          uid={historyRow.uid}
          drugName={historyRow.data.generic_name || historyRow.slug}
          currentRev={historyRow.rev}
          darkMode={darkMode}
          onClose={() => setHistoryRow(null)}
          onRestored={async (restoredRow) => {
            await onApplyLocalWrite?.(restoredRow);
            setCurrentDrugItem({
              drug: restoredRow.data,
              effectiveStatus:
                restoredRow.data.status === "verified" ? "verified" : "draft",
              hashMatches: false,
            });
            setHistoryRow(restoredRow);
          }}
        />
      )}
    </div>
  );
}
