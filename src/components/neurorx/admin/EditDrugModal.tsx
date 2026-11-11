"use client";

import React, { useState } from "react";
import {
  X,
  Save,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Activity,
  Syringe,
  Pill,
  Sparkles,
  Layers,
} from "lucide-react";
import type {
  DrugRecord,
  Subspecialty,
  QtRiskTier,
  Regimen,
  RenalBand,
  DoseSpec,
} from "@/types/neurorx";

interface EditDrugModalProps {
  drug: DrugRecord;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedDrug: DrugRecord, oldId?: string) => Promise<boolean>;
  darkMode?: boolean;
}

const ALL_SUBSPECIALTIES: { id: Subspecialty; label: string }[] = [
  { id: "stroke", label: "Stroke" },
  { id: "epilepsy", label: "Epilepsy" },
  { id: "neurocritical_care", label: "Neurocritical Care (ICU)" },
  { id: "headache", label: "Headache" },
  { id: "movement_disorders", label: "Movement Disorders" },
  { id: "neuromuscular", label: "Neuromuscular" },
  { id: "dementia", label: "Dementia / Cognitive" },
  { id: "neuroimmunology", label: "Neuroimmunology" },
  { id: "neuro_infectious", label: "Neuro-infectious" },
];

export function EditDrugModal({
  drug,
  isOpen,
  onClose,
  onSave,
  darkMode = false,
}: EditDrugModalProps) {
  const [activeTab, setActiveTab] = useState<
    "general" | "dosing" | "renal_hepatic" | "safety"
  >("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states - General
  const [id, setId] = useState(drug.id);
  const [genericName, setGenericName] = useState(drug.generic_name || "");
  const [tallMan, setTallMan] = useState(drug.tall_man?.value || "");
  const [classesText, setClassesText] = useState((drug.classes || []).join(", "));
  const [subspecialties, setSubspecialties] = useState<Subspecialty[]>(
    drug.subspecialties || []
  );
  const [status, setStatus] = useState<"draft" | "verified" | "retired">(
    drug.status || "draft"
  );
  const [verifiedBy, setVerifiedBy] = useState(
    drug.verification?.verified_by || "Admin"
  );

  // Form states - Regimens
  const [regimens, setRegimens] = useState<Regimen[]>(() => {
    if (drug.regimens && drug.regimens.length > 0) {
      return JSON.parse(JSON.stringify(drug.regimens));
    }
    return [
      {
        id: `${drug.id || "drug"}-regimen-1`,
        indication: "Clinical Treatment Regimen",
        setting: "maintenance_outpatient",
        route: "PO",
        refs: [],
        dose: {
          kind: "fixed",
          amount: 500,
          unit: "mg",
          frequency: "twice daily",
        },
        dose_text: "",
      },
    ];
  });

  // Form states - Renal & Hepatic
  const [renalDesc, setRenalDesc] = useState(
    drug.renal_impairment?.description || ""
  );
  const [renalBasis, setRenalBasis] = useState<
    "cg_abw" | "cg_normalized_1_73" | "egfr"
  >(drug.renal_basis?.value || "cg_abw");
  const [renalBands, setRenalBands] = useState<RenalBand[]>(() => {
    if (drug.renal_impairment?.bands && drug.renal_impairment.bands.length > 0) {
      return JSON.parse(JSON.stringify(drug.renal_impairment.bands));
    }
    return [];
  });
  const [hemodialysisText, setHemodialysisText] = useState(
    drug.renal_impairment?.hemodialysis?.value || ""
  );
  const [hepaticText, setHepaticText] = useState(drug.hepatic?.value || "");

  // Form states - IV Infusion protocol
  const [ivDiluent, setIvDiluent] = useState(
    drug.tools?.iv_infusion?.value?.diluent || ""
  );
  const [ivRate, setIvRate] = useState(
    drug.tools?.iv_infusion?.value?.rate || ""
  );
  const [ivInstructions, setIvInstructions] = useState(
    drug.tools?.iv_infusion?.value?.instructions || ""
  );

  // Form states - Safety & Enzymes
  const [blackBoxText, setBlackBoxText] = useState(
    (drug.black_box?.value || []).join("\n")
  );
  const [mgSafety, setMgSafety] = useState<
    "safe" | "caution" | "may_worsen" | "avoid"
  >(drug.mg_safety?.value || "safe");
  const [cyp3a4, setCyp3a4] = useState(
    drug.enzyme_profile?.value?.cyp3a4 || "none"
  );
  const [cyp2c19, setCyp2c19] = useState(
    drug.enzyme_profile?.value?.cyp2c19 || "none"
  );
  const [pgp, setPgp] = useState(drug.enzyme_profile?.value?.pgp || "none");
  const [qtRisk, setQtRisk] = useState<QtRiskTier>(
    drug.enzyme_profile?.value?.qt_risk || "none"
  );
  const [acbScore, setAcbScore] = useState<number>(
    drug.enzyme_profile?.value?.acb_score || 0
  );

  if (!isOpen) return null;

  const toggleSubspecialty = (sub: Subspecialty) => {
    if (subspecialties.includes(sub)) {
      setSubspecialties(subspecialties.filter((s) => s !== sub));
    } else {
      setSubspecialties([...subspecialties, sub]);
    }
  };

  // Regimen management
  const handleAddRegimen = () => {
    const nextIdx = regimens.length + 1;
    const newRegimen: Regimen = {
      id: `${id.trim() || "drug"}-regimen-${nextIdx}`,
      indication: `Clinical Indication #${nextIdx}`,
      setting: "maintenance_outpatient",
      route: "PO",
      refs: [],
      dose: {
        kind: "fixed",
        amount: 500,
        unit: "mg",
        frequency: "twice daily",
      },
      dose_text: "",
    };
    setRegimens([...regimens, newRegimen]);
  };

  const handleRemoveRegimen = (index: number) => {
    if (regimens.length <= 1) return;
    setRegimens(regimens.filter((_, idx) => idx !== index));
  };

  const handleUpdateRegimen = (index: number, patch: Partial<Regimen>) => {
    setRegimens(
      regimens.map((r, idx) => (idx === index ? { ...r, ...patch } : r))
    );
  };

  const handleUpdateRegimenDose = (
    index: number,
    dosePatch: Partial<DoseSpec> | null
  ) => {
    setRegimens(
      regimens.map((r, idx) => {
        if (idx !== index) return r;
        if (dosePatch === null) {
          return { ...r, dose: null };
        }
        return {
          ...r,
          dose: {
            kind: r.dose?.kind || "fixed",
            amount: r.dose?.amount ?? 100,
            unit: r.dose?.unit || "mg",
            frequency: r.dose?.frequency || "twice daily",
            ...dosePatch,
          },
        };
      })
    );
  };

  // Renal band management
  const handleAddRenalBand = () => {
    const newBand: RenalBand = {
      min: 30,
      max: 50,
      dose_text: "50% standard maintenance dose",
      refs: [],
    };
    setRenalBands([...renalBands, newBand]);
  };

  const handleRemoveRenalBand = (index: number) => {
    setRenalBands(renalBands.filter((_, idx) => idx !== index));
  };

  const handleUpdateRenalBand = (index: number, patch: Partial<RenalBand>) => {
    setRenalBands(
      renalBands.map((b, idx) => (idx === index ? { ...b, ...patch } : b))
    );
  };

  const handleLoadStandardCrclBands = () => {
    setRenalBands([
      {
        min: 80,
        max: null,
        dose_text: "Standard maintenance dose (No adjustment)",
        refs: [],
      },
      {
        min: 50,
        max: 80,
        dose_text: "75% of standard dose or normal interval",
        refs: [],
      },
      {
        min: 30,
        max: 50,
        dose_text: "50% of standard dose every 12 to 24 hours",
        refs: [],
      },
      {
        min: null,
        max: 30,
        dose_text: "25% to 50% standard dose, or avoid use",
        refs: [],
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const cleanGeneric = genericName.trim();

    if (!cleanId || !cleanGeneric) {
      setError("Please provide both a Drug ID and a Generic Name.");
      return;
    }

    setLoading(true);

    try {
      // Clean and sanitize regimens
      const cleanRegimens: Regimen[] = regimens.map((r, idx) => ({
        ...r,
        id: r.id?.trim() || `${cleanId}-regimen-${idx + 1}`,
        indication: r.indication?.trim() || `Indication #${idx + 1}`,
        setting: r.setting || "maintenance_outpatient",
        route: r.route || "PO",
        dose: r.dose
          ? {
              kind: r.dose.kind || "fixed",
              amount: Number(r.dose.amount) || 0,
              unit: r.dose.unit || "mg",
              frequency: r.dose.frequency?.trim() || "once",
              max_single: r.dose.max_single
                ? Number(r.dose.max_single)
                : undefined,
              max_daily: r.dose.max_daily
                ? Number(r.dose.max_daily)
                : undefined,
            }
          : null,
        dose_text: r.dose_text?.trim() || undefined,
        refs:
          r.refs && r.refs.length > 0
            ? r.refs
            : [
                {
                  source_id: "system",
                  locator: "admin",
                  quote: r.indication,
                },
              ],
      }));

      // Clean and sanitize renal bands
      const cleanBands: RenalBand[] = renalBands.map((b) => ({
        min:
          b.min === null || b.min === ("" as any) || isNaN(Number(b.min))
            ? null
            : Number(b.min),
        max:
          b.max === null || b.max === ("" as any) || isNaN(Number(b.max))
            ? null
            : Number(b.max),
        dose_text: b.dose_text?.trim() || "Refer to clinical protocol",
        refs:
          b.refs && b.refs.length > 0
            ? b.refs
            : [
                {
                  source_id: "system",
                  locator: "admin",
                  quote: "CrCl band",
                },
              ],
        dose: b.dose,
      }));

      // Build updated drug payload preserving existing valid refs
      const updatedDrug: DrugRecord = {
        ...drug,
        id: cleanId,
        generic_name: cleanGeneric,
        tall_man: {
          value: tallMan.trim() || cleanGeneric,
          refs: drug.tall_man?.refs || [
            { source_id: "system", locator: "admin", quote: cleanGeneric },
          ],
        },
        classes: classesText
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        subspecialties:
          subspecialties.length > 0 ? subspecialties : ["epilepsy"],
        status,
        verification: {
          verified_by:
            status === "verified" ? verifiedBy.trim() || "Admin" : null,
          verified_at:
            status === "verified"
              ? new Date().toISOString().split("T")[0]
              : null,
          content_hash: drug.verification?.content_hash || null,
        },
        regimens: cleanRegimens,
        hepatic: {
          value:
            hepaticText.trim() ||
            "No dosage adjustment necessary for hepatic impairment.",
          refs: drug.hepatic?.refs || [
            {
              source_id: "system",
              locator: "admin",
              quote: "Hepatic adjustment",
            },
          ],
        },
        renal_basis: {
          value: renalBasis,
          refs: drug.renal_basis?.refs || [
            { source_id: "system", locator: "admin", quote: "CrCl" },
          ],
        },
        renal_impairment: {
          description:
            renalDesc.trim() ||
            (cleanBands.length > 0
              ? `Dosing adjustments stratified by renal function (${renalBasis}).`
              : "No dosage adjustment necessary for renal impairment."),
          renal_basis: {
            value: renalBasis,
            refs: drug.renal_basis?.refs || [
              { source_id: "system", locator: "admin", quote: "CrCl" },
            ],
          },
          bands: cleanBands,
          hemodialysis: hemodialysisText.trim()
            ? {
                value: hemodialysisText.trim(),
                refs: drug.renal_impairment?.hemodialysis?.refs || [
                  {
                    source_id: "system",
                    locator: "admin",
                    quote: "Hemodialysis",
                  },
                ],
              }
            : undefined,
          refs: drug.renal_impairment?.refs || [
            { source_id: "system", locator: "admin", quote: "Renal" },
          ],
        },
        black_box: {
          value: blackBoxText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          refs: drug.black_box?.refs || [],
        },
        mg_safety: {
          value: mgSafety,
          refs: drug.mg_safety?.refs || [
            { source_id: "system", locator: "admin", quote: "MG safety" },
          ],
        },
        enzyme_profile: {
          value: {
            ...drug.enzyme_profile?.value,
            cyp3a4: cyp3a4 === "none" ? undefined : (cyp3a4 as any),
            cyp2c19: cyp2c19 === "none" ? undefined : (cyp2c19 as any),
            pgp: pgp === "none" ? undefined : (pgp as any),
            qt_risk: qtRisk,
            acb_score: Number(acbScore) || 0,
          },
          refs: drug.enzyme_profile?.refs || [
            {
              source_id: "system",
              locator: "admin",
              quote: "Enzyme profile",
            },
          ],
        },
        tools: {
          ...drug.tools,
          ...(ivDiluent.trim() || ivRate.trim() || ivInstructions.trim()
            ? {
                iv_infusion: {
                  value: {
                    diluent: ivDiluent.trim(),
                    rate: ivRate.trim(),
                    instructions: ivInstructions.trim(),
                  },
                  refs: drug.tools?.iv_infusion?.refs || [
                    {
                      source_id: "system",
                      locator: "admin",
                      quote: "IV Infusion",
                    },
                  ],
                },
              }
            : {}),
        },
      };

      const ok = await onSave(
        updatedDrug,
        drug.id !== cleanId ? drug.id : undefined
      );
      if (ok) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Error saving drug.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          darkMode
            ? "bg-slate-900 border-slate-800 text-slate-100"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-lg">
              💊
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  Edit Drug: {drug.generic_name}
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    status === "verified"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {status}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                ID: {drug.id}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="px-4 pt-3 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none bg-slate-50/40 dark:bg-slate-950/20 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "general"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            General &amp; Classes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dosing")}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "dosing"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Dosing Regimens ({regimens.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("renal_hepatic")}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "renal_hepatic"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Renal &amp; Hepatic ({renalBands.length} CrCl bands)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("safety")}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === "safety"
                ? "border-sky-600 text-sky-600 dark:text-sky-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Safety &amp; CYP Profile
          </button>
        </div>

        {/* Modal Form Content */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: GENERAL & CLASSES */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Drug ID (unique key)
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. levetiracetam-oral"
                    required
                  />
                  <span className="text-[11px] text-slate-400">
                    Lowercase letters, numbers, hyphens only.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Generic Name
                  </label>
                  <input
                    type="text"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. levetiracetam (oral: tablets & oral solution)"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tall Man / Display Name
                  </label>
                  <input
                    type="text"
                    value={tallMan}
                    onChange={(e) => setTallMan(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                    placeholder="e.g. levetiracetam"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Verification Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="draft">Draft (Bản nháp - Unverified)</option>
                    <option value="verified">
                      Verified (Đã xác thực lâm sàng)
                    </option>
                    <option value="retired">Retired (Đã lưu trữ / ngừng)</option>
                  </select>
                </div>
              </div>

              {status === "verified" && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Verified By (Clinical Reviewer)
                  </label>
                  <input
                    type="text"
                    value={verifiedBy}
                    onChange={(e) => setVerifiedBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    placeholder="e.g. Dr. Nguyen Van A, MD / Admin"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pharmacologic Classes (comma separated)
                </label>
                <input
                  type="text"
                  value={classesText}
                  onChange={(e) => setClassesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  placeholder="e.g. Antiepileptic Drug (AED), SV2A Ligand"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Neurological Subspecialties
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SUBSPECIALTIES.map((sub) => {
                    const active = subspecialties.includes(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubspecialty(sub.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          active
                            ? "bg-sky-500 text-white border-sky-600 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                        }`}
                      >
                        {active && "✓ "}
                        {sub.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOSING REGIMENS */}
          {activeTab === "dosing" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    Clinical Indications &amp; Dosing Regimens ({regimens.length})
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Mỗi chỉ định lâm sàng có liều tính toán và hướng dẫn dùng thuốc riêng biệt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddRegimen}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Indication</span>
                </button>
              </div>

              <div className="space-y-4">
                {regimens.map((reg, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3"
                  >
                    {/* Regimen Card Header */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                          {reg.indication || `Indication #${idx + 1}`}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {reg.route}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {reg.setting === "acute_inpatient"
                            ? "Acute"
                            : "Maintenance"}
                        </span>
                      </div>

                      {regimens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRegimen(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete this regimen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Indication Title */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                        Indication / Clinical Condition:
                      </label>
                      <input
                        type="text"
                        value={reg.indication}
                        onChange={(e) =>
                          handleUpdateRegimen(idx, {
                            indication: e.target.value,
                          })
                        }
                        placeholder="e.g. Partial-Onset Seizures in Adults 16 Years of Age and Older"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    {/* Setting & Route */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Clinical Setting:
                        </label>
                        <select
                          value={reg.setting}
                          onChange={(e) =>
                            handleUpdateRegimen(idx, {
                              setting: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="maintenance_outpatient">
                            Maintenance / Outpatient (Duy trì / Ngoại trú)
                          </option>
                          <option value="acute_inpatient">
                            Acute / Inpatient (Cấp tính / Nội trú)
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          Route of Administration:
                        </label>
                        <select
                          value={reg.route}
                          onChange={(e) =>
                            handleUpdateRegimen(idx, {
                              route: e.target.value as any,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="PO">PO (Oral)</option>
                          <option value="IV">IV (Intravenous)</option>
                          <option value="IM">IM (Intramuscular)</option>
                          <option value="SC">SC (Subcutaneous)</option>
                          <option value="NG">NG (Enteral / Tube)</option>
                          <option value="TD">TD (Transdermal)</option>
                        </select>
                      </div>
                    </div>

                    {/* Computable Dose Section */}
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                          <input
                            type="checkbox"
                            checked={Boolean(reg.dose)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleUpdateRegimenDose(idx, {
                                  kind: "fixed",
                                  amount: 500,
                                  unit: "mg",
                                  frequency: "twice daily",
                                });
                              } else {
                                handleUpdateRegimenDose(idx, null);
                              }
                            }}
                            className="rounded text-sky-600 focus:ring-sky-500"
                          />
                          <span>Enable Bedside Computable Formula</span>
                        </label>
                        {reg.dose && (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                            Formula: {reg.dose.amount} {reg.dose.unit}{" "}
                            {reg.dose.frequency}
                          </span>
                        )}
                      </div>

                      {reg.dose && (
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-xs">
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                              Type:
                            </span>
                            <select
                              value={reg.dose.kind}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  kind: e.target.value as any,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            >
                              <option value="fixed">Fixed</option>
                              <option value="per_kg">Weight (/kg)</option>
                            </select>
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                              Amount:
                            </span>
                            <input
                              type="number"
                              step="any"
                              value={reg.dose.amount}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  amount: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                              Unit:
                            </span>
                            <input
                              type="text"
                              value={reg.dose.unit}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  unit: e.target.value as any,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                              placeholder="mg"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                              Frequency:
                            </span>
                            <input
                              type="text"
                              value={reg.dose.frequency}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  frequency: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                              placeholder="twice daily"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                              Max Single:
                            </span>
                            <input
                              type="number"
                              value={reg.dose.max_single ?? ""}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  max_single: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                              placeholder="Optional"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-semibold text-slate-500 mb-1">
                              Max Daily:
                            </span>
                            <input
                              type="number"
                              value={reg.dose.max_daily ?? ""}
                              onChange={(e) =>
                                handleUpdateRegimenDose(idx, {
                                  max_daily: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                              placeholder="Optional"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Clinical Guidance Text */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        Clinical Administration Guidance &amp; Titration (`dose_text`):
                      </label>
                      <textarea
                        value={reg.dose_text || ""}
                        onChange={(e) =>
                          handleUpdateRegimen(idx, {
                            dose_text: e.target.value,
                          })
                        }
                        placeholder="e.g. Initiate 500 mg twice daily (1000 mg/day). Increase by 500 mg twice daily every 2 weeks to maximum 1500 mg twice daily (3000 mg/day)..."
                        rows={3}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-y"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* IV Infusion Protocol Section */}
              <div className="p-4 rounded-2xl border border-sky-500/20 bg-sky-500/5 space-y-3">
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  <Syringe className="w-4 h-4 text-sky-500" />
                  <span>IV Preparation &amp; Infusion Protocol (Optional for IV drugs)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Diluent &amp; Reconstitution:
                    </label>
                    <input
                      type="text"
                      value={ivDiluent}
                      onChange={(e) => setIvDiluent(e.target.value)}
                      placeholder="e.g. Reconstitute with Sterile Water for Injection (SWFI) to 1 mg/mL"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Infusion Rate:
                    </label>
                    <input
                      type="text"
                      value={ivRate}
                      onChange={(e) => setIvRate(e.target.value)}
                      placeholder="e.g. 10% bolus over 1 min; remainder 90% infused over 60 mins"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1 text-xs">
                    Preparation &amp; Administration Instructions:
                  </label>
                  <textarea
                    value={ivInstructions}
                    onChange={(e) => setIvInstructions(e.target.value)}
                    placeholder="Instructions for infusion solution preparation, extravasation management, and storage..."
                    rows={2}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs resize-y"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RENAL & HEPATIC */}
          {activeTab === "renal_hepatic" && (
            <div className="space-y-5">
              {/* General Renal Impairment Guidance */}
              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Renal Impairment Guidance (General Note)
                  </label>
                  <textarea
                    value={renalDesc}
                    onChange={(e) => setRenalDesc(e.target.value)}
                    placeholder="No dosage adjustment necessary for renal impairment. Or adjust dosage based on patient's estimated Creatinine Clearance (CrCl)..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Renal Clearance Basis
                    </label>
                    <select
                      value={renalBasis}
                      onChange={(e) => setRenalBasis(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none text-xs sm:text-sm font-semibold"
                    >
                      <option value="cg_abw">
                        Cockcroft-Gault (Actual Body Weight - ABW)
                      </option>
                      <option value="cg_normalized_1_73">
                        Cockcroft-Gault normalized to BSA (1.73 m²)
                      </option>
                      <option value="egfr">eGFR (CKD-EPI)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Hemodialysis / ESRD Instructions
                    </label>
                    <input
                      type="text"
                      value={hemodialysisText}
                      onChange={(e) => setHemodialysisText(e.target.value)}
                      placeholder="e.g. Administer 500 - 1000 mg every 24h. Supplemental 250 - 500 mg post-dialysis"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* CrCl RENAL ADJUSTMENT BANDS SECTION */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-sky-500" />
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        CrCl Renal Adjustment Bands ({renalBands.length})
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Phân tầng khoảng CrCl (mL/min) và liều điều trị tương ứng theo chức năng thận.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleLoadStandardCrclBands}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-sky-500 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Load standard CKD staging: >80, 50-80, 30-50, <30 mL/min"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Standard Preset</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRenalBand}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add CrCl Band</span>
                    </button>
                  </div>
                </div>

                {renalBands.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400 space-y-1">
                    <p className="font-medium">Chưa có khoảng chỉnh liều thận nào.</p>
                    <p className="text-[11px]">
                      Bấm <strong>Add CrCl Band</strong> để tạo khoảng hoặc <strong>Standard Preset</strong> để nạp dải 4 mức chuẩn.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {renalBands.map((band, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
                              Band #{idx + 1}
                            </span>
                            <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                              CrCl:{" "}
                              {band.min === null || band.min === ("" as any)
                                ? `< ${band.max}`
                                : band.max === null || band.max === ("" as any)
                                ? `> ${band.min}`
                                : `${band.min} – ${band.max}`}{" "}
                              mL/min
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveRenalBand(idx)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete this CrCl band"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Min and Max CrCl range inputs */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                              Min CrCl (mL/min) <span className="font-normal text-slate-400">(trống nếu &lt; Max)</span>:
                            </label>
                            <input
                              type="number"
                              value={band.min ?? ""}
                              onChange={(e) =>
                                handleUpdateRenalBand(idx, {
                                  min:
                                    e.target.value === ""
                                      ? null
                                      : parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g. 50 (or empty)"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                              Max CrCl (mL/min) <span className="font-normal text-slate-400">(trống nếu &gt; Min)</span>:
                            </label>
                            <input
                              type="number"
                              value={band.max ?? ""}
                              onChange={(e) =>
                                handleUpdateRenalBand(idx, {
                                  max:
                                    e.target.value === ""
                                      ? null
                                      : parseFloat(e.target.value),
                                })
                              }
                              placeholder="e.g. 80 (or empty)"
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                            />
                          </div>
                        </div>

                        {/* Dose Text description for this band */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                            Dose Adjustment Instruction for this Band (`dose_text`):
                          </label>
                          <input
                            type="text"
                            value={band.dose_text}
                            onChange={(e) =>
                              handleUpdateRenalBand(idx, {
                                dose_text: e.target.value,
                              })
                            }
                            placeholder="e.g. 500 to 1,000 mg every 12 hours, or 50% standard maintenance dose"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hepatic Impairment */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs sm:text-sm">
                  Hepatic Impairment Guidance
                </label>
                <textarea
                  value={hepaticText}
                  onChange={(e) => setHepaticText(e.target.value)}
                  placeholder="No dosage adjustment necessary for mild-to-moderate impairment. For severe impairment (Child-Pugh C), reduce maintenance dose by 50% if renal clearance is also reduced."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none text-xs sm:text-sm"
                />
              </div>
            </div>
          )}

          {/* TAB 4: SAFETY & CYP */}
          {activeTab === "safety" && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  FDA Black Box Warnings (one per line)
                </label>
                <textarea
                  value={blackBoxText}
                  onChange={(e) => setBlackBoxText(e.target.value)}
                  placeholder="Leave empty if no black box warning applies"
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    CYP3A4
                  </label>
                  <select
                    value={cyp3a4}
                    onChange={(e) => setCyp3a4(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="none">none</option>
                    <option value="substrate">substrate</option>
                    <option value="inhibitor_weak">inhibitor (weak)</option>
                    <option value="inhibitor_strong">inhibitor (strong)</option>
                    <option value="inducer_weak">inducer (weak)</option>
                    <option value="inducer_strong">inducer (strong)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    CYP2C19
                  </label>
                  <select
                    value={cyp2c19}
                    onChange={(e) => setCyp2c19(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="none">none</option>
                    <option value="substrate">substrate</option>
                    <option value="inhibitor_weak">inhibitor (weak)</option>
                    <option value="inhibitor_strong">inhibitor (strong)</option>
                    <option value="inducer_weak">inducer (weak)</option>
                    <option value="inducer_strong">inducer (strong)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    P-gp
                  </label>
                  <select
                    value={pgp}
                    onChange={(e) => setPgp(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="none">none</option>
                    <option value="substrate">substrate</option>
                    <option value="inhibitor">inhibitor</option>
                    <option value="inducer">inducer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    QT Prolongation
                  </label>
                  <select
                    value={qtRisk}
                    onChange={(e) => setQtRisk(e.target.value as QtRiskTier)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="none">none</option>
                    <option value="conditional">conditional</option>
                    <option value="possible">possible</option>
                    <option value="known">known</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    Myasthenia Gravis Safety
                  </label>
                  <select
                    value={mgSafety}
                    onChange={(e) => setMgSafety(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="safe">safe (An toàn trong Nhược cơ)</option>
                    <option value="caution">caution (Cần thận trọng)</option>
                    <option value="may_worsen">
                      may_worsen (Có thể làm nặng nhược cơ)
                    </option>
                    <option value="avoid">
                      avoid (Chống chỉ định / Tránh dùng)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                    ACB Score (Anticholinergic Burden: 0 - 3)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={acbScore}
                    onChange={(e) =>
                      setAcbScore(parseInt(e.target.value, 10) || 0)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer text-xs sm:text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving &amp; Updating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save &amp; Update Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
