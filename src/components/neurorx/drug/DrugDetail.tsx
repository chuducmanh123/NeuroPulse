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
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import { useNeuroRxStore } from "@/store/useNeuroRxStore";
import { resolveRenalFunction } from "@/lib/neurorx/patient";
import { getStoredAdminToken } from "@/utils/clientAuth";
import { PatientBar } from "./PatientBar";
import { DoseCard } from "./DoseCard";
import { SourcePopover } from "./SourcePopover";
import { ToolsRow } from "./ToolsRow";
import { DrugAccordions } from "./DrugAccordions";
import { AuditTrail } from "./AuditTrail";
import { EditDrugModal } from "@/components/neurorx/admin/EditDrugModal";

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

  const [currentDrugItem, setCurrentDrugItem] = useState(drugItem);
  const [showPatientVars, setShowPatientVars] = useState(false);
  const [selectedRegimenIndex, setSelectedRegimenIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const handleSaveDrug = async (updatedDrug: DrugRecord, oldId?: string): Promise<boolean> => {
    let token = getStoredAdminToken();
    if (!token) {
      const input = window.prompt("Enter Admin Passcode to save drug updates (default: @neuro2026):");
      if (!input) return false;
      token = input.trim();
      try {
        sessionStorage.setItem("adminToken", token);
      } catch {}
    }
    try {
      const res = await fetch("/api/neurorx/manage-drug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ action: "save", drug: updatedDrug, old_id: oldId }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        alert("Save failed: " + (json.error || "Unable to save changes"));
        return false;
      }
      alert(json.message || "✓ Drug saved successfully!");
      setCurrentDrugItem({
        drug: updatedDrug,
        effectiveStatus: updatedDrug.status === "verified" ? "verified" : "draft",
        hashMatches: true,
      });
      window.dispatchEvent(new CustomEvent("neurorx_drug_updated"));
      return true;
    } catch (err: any) {
      alert("Error saving drug: " + err?.message);
      return false;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Back Navigation Button */}
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[38px] sm:min-h-[44px] ${
          darkMode
            ? "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
            : "bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-sm"
        }`}
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
        <span>Back to drug directory</span>
      </button>

      {/* 2. Tier 1 Header - Medical Blue Identity Block */}
      <div
        className={`p-4 sm:p-7 rounded-xl sm:rounded-2xl border border-l-4 border-l-blue-500 transition-colors ${
          darkMode
            ? "bg-gradient-to-br from-blue-950/20 via-slate-900 to-slate-900 border-blue-900/40"
            : "bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/20 border-blue-200/80 shadow-sm"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 sm:gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white break-words">
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
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Pending verification</span>
                </span>
              )}

              {/* Edit Drug Button - Only visible for authenticated admin */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-bold border border-sky-400/50 hover:border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shadow-xs hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all cursor-pointer shrink-0"
                  title="Edit drug details and dosing regimens"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
            </div>

            {/* Vietnam Marketed Products */}
            <div className="text-sm text-slate-700 dark:text-slate-300">
              {drug.vn_products?.value && drug.vn_products.value.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold uppercase tracking-wide text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                    VN Formulations:
                  </span>
                  {drug.vn_products.value.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs sm:text-sm break-words border border-slate-200/60 dark:border-slate-700/60"
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
                <span className="italic text-slate-400 text-xs sm:text-sm">VN Products: No data yet</span>
              )}
            </div>

            {/* Drug Classes */}
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 break-words">
              {drug.classes.join(" • ")}
            </p>
          </div>

          {/* Clinical Alert Badges (MG-safety & NG-tube) */}
          <div className="flex flex-wrap md:flex-col gap-2 items-start md:items-end shrink-0">
            {/* Myasthenia Gravis Safety Badge */}
            {mgSafety && (
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold border ${
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold border ${
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
          <div className="mt-4 p-4 sm:p-5 rounded-xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-950 dark:text-rose-100 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <AlertOctagon className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="min-w-0 break-words">
                <span className="font-extrabold uppercase tracking-wide block text-sm sm:text-base text-rose-800 dark:text-rose-300 mb-1.5">
                  FDA Boxed Warning:
                </span>
                <p className="whitespace-pre-line leading-relaxed text-sm sm:text-base font-medium">
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
      </div>

      {/* 4. Bedside Patient Variables & Computed Dosage (Thông số bệnh nhân & Liều tính toán tại giường) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowPatientVars((prev) => !prev)}
          className={`w-full p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-l-4 border-l-cyan-500 transition-all flex items-center justify-between gap-3 text-left ${
            showPatientVars
              ? darkMode
                ? "bg-gradient-to-r from-cyan-950/30 via-slate-900 to-slate-900 border-cyan-800 shadow-sm ring-1 ring-cyan-500/20"
                : "bg-gradient-to-r from-cyan-50/70 via-white to-white border-cyan-300 shadow-sm ring-1 ring-cyan-400/20"
              : darkMode
              ? "bg-slate-900/70 border-slate-800 hover:border-cyan-800/80 hover:bg-slate-900"
              : "bg-white border-slate-200 hover:border-cyan-300 shadow-xs"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2 rounded-xl shrink-0 ${
                darkMode ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-50 text-cyan-600"
              }`}
            >
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-slate-900 dark:text-slate-100 truncate">
                  Bedside Patient Variables &amp; Computed Dosage
                </span>
                {renalResult.value !== null && (
                  <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shrink-0">
                    CrCl: {renalResult.value} mL/min
                  </span>
                )}
                {patientParsed.weightKg !== undefined && (
                  <span className="text-xs sm:text-sm px-2.5 py-0.5 rounded-full font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
                    {patientParsed.weightKg} kg
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mt-1 line-clamp-1 sm:line-clamp-none">
                {showPatientVars
                  ? "Click to collapse patient variables & computed dosage"
                  : "Click to enter patient variables (Weight, Age, Sex, Creatinine, CrCl...) & view computed dosage"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 shrink-0">
            <span className="text-xs sm:text-sm font-bold hidden sm:inline">
              {showPatientVars ? "Collapse" : "Adjust"}
            </span>
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ${
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
        />
      )}
    </div>
  );
}
