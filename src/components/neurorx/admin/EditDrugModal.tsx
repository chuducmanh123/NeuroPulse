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
} from "lucide-react";
import type { DrugRecord, Subspecialty, QtRiskTier } from "@/types/neurorx";

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
  const [activeTab, setActiveTab] = useState<"general" | "dosing" | "renal_hepatic" | "safety">("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [id, setId] = useState(drug.id);
  const [genericName, setGenericName] = useState(drug.generic_name || "");
  const [tallMan, setTallMan] = useState(drug.tall_man?.value || "");
  const [classesText, setClassesText] = useState((drug.classes || []).join(", "));
  const [subspecialties, setSubspecialties] = useState<Subspecialty[]>(drug.subspecialties || []);
  const [status, setStatus] = useState<"draft" | "verified" | "retired">(drug.status || "draft");
  const [verifiedBy, setVerifiedBy] = useState(drug.verification?.verified_by || "Admin");

  // Dosing
  const initialDosing = React.useMemo(() => {
    const texts = (drug.regimens || [])
      .map((r) => r.dose_text?.trim())
      .filter(Boolean) as string[];
    return Array.from(new Set(texts)).join("\n\n");
  }, [drug.regimens]);
  const [dosingText, setDosingText] = useState(initialDosing);

  // Renal & Hepatic
  const [renalDesc, setRenalDesc] = useState(drug.renal_impairment?.description || "");
  const [renalBasis, setRenalBasis] = useState<"cg_abw" | "cg_normalized_1_73" | "egfr">(
    drug.renal_basis?.value || "cg_abw"
  );
  const [hemodialysisText, setHemodialysisText] = useState(
    drug.renal_impairment?.hemodialysis?.value || ""
  );
  const [hepaticText, setHepaticText] = useState(drug.hepatic?.value || "");

  // Safety & Enzymes
  const [blackBoxText, setBlackBoxText] = useState((drug.black_box?.value || []).join("\n"));
  const [mgSafety, setMgSafety] = useState<"safe" | "caution" | "may_worsen" | "avoid">(
    drug.mg_safety?.value || "safe"
  );
  const [cyp3a4, setCyp3a4] = useState(drug.enzyme_profile?.value?.cyp3a4 || "none");
  const [cyp2c19, setCyp2c19] = useState(drug.enzyme_profile?.value?.cyp2c19 || "none");
  const [pgp, setPgp] = useState(drug.enzyme_profile?.value?.pgp || "none");
  const [qtRisk, setQtRisk] = useState<QtRiskTier>(drug.enzyme_profile?.value?.qt_risk || "none");
  const [acbScore, setAcbScore] = useState<number>(drug.enzyme_profile?.value?.acb_score || 0);

  if (!isOpen) return null;

  const toggleSubspecialty = (sub: Subspecialty) => {
    if (subspecialties.includes(sub)) {
      setSubspecialties(subspecialties.filter((s) => s !== sub));
    } else {
      setSubspecialties([...subspecialties, sub]);
    }
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
      // Build updated drug payload preserving existing valid refs
      const updatedDrug: DrugRecord = {
        ...drug,
        id: cleanId,
        generic_name: cleanGeneric,
        tall_man: {
          value: tallMan.trim() || cleanGeneric,
          refs: drug.tall_man?.refs || [{ source_id: "system", locator: "admin", quote: cleanGeneric }],
        },
        classes: classesText
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        subspecialties: subspecialties.length > 0 ? subspecialties : ["epilepsy"],
        status,
        verification: {
          verified_by: status === "verified" ? verifiedBy.trim() || "Admin" : null,
          verified_at: status === "verified" ? new Date().toISOString().split("T")[0] : null,
          content_hash: drug.verification?.content_hash || null,
        },
        hepatic: {
          value: hepaticText.trim() || "No dosage adjustment necessary for hepatic impairment.",
          refs: drug.hepatic?.refs || [{ source_id: "system", locator: "admin", quote: "Hepatic adjustment" }],
        },
        renal_basis: {
          value: renalBasis,
          refs: drug.renal_basis?.refs || [{ source_id: "system", locator: "admin", quote: "CrCl" }],
        },
        renal_impairment: {
          description: renalDesc.trim() || "Dosing adjustments stratified by renal function.",
          renal_basis: {
            value: renalBasis,
            refs: drug.renal_basis?.refs || [{ source_id: "system", locator: "admin", quote: "CrCl" }],
          },
          bands: drug.renal_impairment?.bands || [],
          hemodialysis: hemodialysisText.trim()
            ? {
                value: hemodialysisText.trim(),
                refs: drug.renal_impairment?.hemodialysis?.refs || [{ source_id: "system", locator: "admin", quote: "Hemodialysis" }],
              }
            : undefined,
          refs: drug.renal_impairment?.refs || [{ source_id: "system", locator: "admin", quote: "Renal" }],
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
          refs: drug.mg_safety?.refs || [{ source_id: "system", locator: "admin", quote: "MG safety" }],
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
          refs: drug.enzyme_profile?.refs || [{ source_id: "system", locator: "admin", quote: "Enzyme profile" }],
        },
      };

      // Update unified dosing regimen text
      if (dosingText.trim()) {
        const firstReg = updatedDrug.regimens?.[0];
        updatedDrug.regimens = [
          {
            id: firstReg?.id || `${cleanId}-regimen`,
            indication: firstReg?.indication || "Clinical Dosing Regimen",
            setting: firstReg?.setting || "maintenance_outpatient",
            route: firstReg?.route || "PO/IV",
            refs:
              firstReg?.refs && firstReg.refs.length > 0
                ? firstReg.refs
                : [{ source_id: "system", locator: "admin", quote: dosingText.trim().slice(0, 300) }],
            dose: firstReg?.dose || null,
            dose_text: dosingText.trim(),
            renal_bands: firstReg?.renal_bands,
          },
        ];
      }

      const ok = await onSave(updatedDrug, drug.id !== cleanId ? drug.id : undefined);
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
          darkMode ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
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
              <span className="text-xs text-slate-400 font-mono">ID: {drug.id}</span>
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
            Dosing (Liều dùng)
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
            Renal &amp; Hepatic Adjustments
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: GENERAL INFO */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Generic Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Drug ID Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "-"))}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Storage file identifier (lowercase, hyphens only)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tall Man Name (ISMP sound-alike prevention)
                  </label>
                  <input
                    type="text"
                    value={tallMan}
                    onChange={(e) => setTallMan(e.target.value)}
                    placeholder="e.g. LEVETIRAcetam"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Review Status
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="verified"
                        checked={status === "verified"}
                        onChange={() => setStatus("verified")}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Verified</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        value="draft"
                        checked={status === "draft"}
                        onChange={() => setStatus("draft")}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span className="font-bold text-amber-600 dark:text-amber-400">Draft</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pharmacologic Classes (comma separated)
                </label>
                <input
                  type="text"
                  value={classesText}
                  onChange={(e) => setClassesText(e.target.value)}
                  placeholder="anticonvulsant, SV2A vesicle protein inhibitor"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Relevant Neurological Subspecialties
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_SUBSPECIALTIES.map((sub) => {
                    const active = subspecialties.includes(sub.id);
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSubspecialty(sub.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          active
                            ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-sky-400"
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

          {/* TAB 2: DOSING */}
          {activeTab === "dosing" && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Dosing Regimens &amp; Schedule (Liều dùng &amp; Chế độ điều trị)
                </label>
                <textarea
                  value={dosingText}
                  onChange={(e) => setDosingText(e.target.value)}
                  placeholder="Nhập chi tiết liều dùng: liều khởi đầu, liều nạp, liều duy trì, cách dùng, chỉnh liều..."
                  rows={8}
                  className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-y"
                />
                <span className="text-[11px] text-slate-400">
                  Hiển thị trực tiếp trên thẻ Liều dùng lâm sàng của NeuroRx.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: RENAL & HEPATIC */}
          {activeTab === "renal_hepatic" && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Renal Impairment Guidance
                </label>
                <textarea
                  value={renalDesc}
                  onChange={(e) => setRenalDesc(e.target.value)}
                  placeholder="Adjust dosage based on patient's estimated Creatinine Clearance (CrCl)..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
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
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="cg_abw">Cockcroft-Gault (Actual Body Weight - ABW)</option>
                    <option value="cg_normalized_1_73">Cockcroft-Gault normalized to BSA (1.73 m²)</option>
                    <option value="egfr">eGFR (CKD-EPI)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hemodialysis Instructions
                  </label>
                  <input
                    type="text"
                    value={hemodialysisText}
                    onChange={(e) => setHemodialysisText(e.target.value)}
                    placeholder="e.g. Administer 250 - 500 mg supplemental dose following each dialysis session"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Hepatic Impairment Guidance
                </label>
                <textarea
                  value={hepaticText}
                  onChange={(e) => setHepaticText(e.target.value)}
                  placeholder="No dosage adjustment necessary for mild-to-moderate impairment. For severe impairment (Child-Pugh C), reduce maintenance dose by 50% if renal clearance is also reduced."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CYP3A4</label>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CYP2C19</label>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">P-glycoprotein (P-gp)</label>
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">QT Prolongation Risk</label>
                  <select
                    value={qtRisk}
                    onChange={(e) => setQtRisk(e.target.value as any)}
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
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Myasthenia Gravis (MG) Safety
                  </label>
                  <select
                    value={mgSafety}
                    onChange={(e) => setMgSafety(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  >
                    <option value="safe">safe (Safe)</option>
                    <option value="caution">caution (Caution)</option>
                    <option value="may_worsen">may_worsen (May Exacerbate Weakness)</option>
                    <option value="avoid">avoid (Contraindicated / Avoid)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Anticholinergic Cognitive Burden (ACB Score: 0 - 3)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="3"
                    value={acbScore}
                    onChange={(e) => setAcbScore(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500 focus:outline-none"
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
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving &amp; Sealing...</span>
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
