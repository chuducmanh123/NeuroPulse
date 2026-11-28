"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Droplets,
  ExternalLink,
  Gauge,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  ShieldAlert,
  TrendingDown,
  X,
} from "lucide-react";
import {
  EXTRAVASATION_STEPS,
  NEURO_TARGET_PROFILES,
  VASO_REFERENCES,
  VASO_UI_TEXT,
  VASOPRESSOR_CATALOG,
  VASOPRESSOR_ORDER,
  t,
  type AccessRoute,
  type ClinicalSeverity,
  type DoseUnitMode,
  type NeuroTargetProfileId,
  type VasoLang,
  type VasopressorId,
} from "@/lib/neurocalc/tools/vasopressorI18n";
import { CustomSelect } from "@/components/ecosystem/CustomSelect";
import {
  computeNeeAndVis,
  computeSmartDrip,
  evaluateWeaningCoach,
  type ActiveAgentDoses,
  type DripDirection,
  type LactateTrend,
} from "@/lib/neurocalc/tools/vasopressorEngine";

interface VasopressorToolProps {
  onBack: () => void;
  initialDrugId?: string;
}

type ToolTab = "drip" | "nee_vis" | "wean";

function parsePosNum(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseNumAllowZero(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function resolveInitialDrug(id?: string): VasopressorId {
  if (id && id in VASOPRESSOR_CATALOG) {
    return id as VasopressorId;
  }
  return "norepinephrine";
}

function severityBannerClass(tone: ClinicalSeverity): string {
  switch (tone) {
    case "danger":
      return "border-l-4 border-l-rose-600 border-[var(--border-hairline)] bg-rose-500/8";
    case "warning":
      return "border-l-4 border-l-amber-500 border-[var(--border-hairline)] bg-amber-500/8";
    case "ok":
      return "border-l-4 border-l-emerald-600 border-[var(--border-hairline)] bg-emerald-500/8";
    default:
      return "border-l-4 border-l-[#0E7490] border-[var(--border-hairline)] bg-[#0E7490]/8";
  }
}

export function VasopressorTool({ onBack, initialDrugId }: VasopressorToolProps) {
  const [lang, setLang] = useState<VasoLang>("en");
  const [activeTab, setActiveTab] = useState<ToolTab>("drip");
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showRefsModal, setShowRefsModal] = useState(false);

  // Shared Clinical Context
  const [weightDraft, setWeightDraft] = useState<string>("");
  const [targetProfile, setTargetProfile] = useState<NeuroTargetProfileId>("septic");
  const [accessRoute, setAccessRoute] = useState<AccessRoute>("cvc");

  // Module 1: Smart Drip & Titration
  const [drugId, setDrugId] = useState<VasopressorId>(() => resolveInitialDrug(initialDrugId));
  const [presetId, setPresetId] = useState<string>(() => {
    const d = resolveInitialDrug(initialDrugId);
    const def =
      VASOPRESSOR_CATALOG[d].presets.find((p) => p.isDefault) ??
      VASOPRESSOR_CATALOG[d].presets[0];
    return def.id;
  });
  const [customAmountDraft, setCustomAmountDraft] = useState<string>("");
  const [customVolumeDraft, setCustomVolumeDraft] = useState<string>("");
  const [direction, setDirection] = useState<DripDirection>("dose_to_rate");
  const [unitMode, setUnitMode] = useState<DoseUnitMode>(
    () => VASOPRESSOR_CATALOG[resolveInitialDrug(initialDrugId)].defaultUnitMode
  );
  const [doseDraft, setDoseDraft] = useState<string>("");
  const [rateDraft, setRateDraft] = useState<string>("");
  const [syncedBadge, setSyncedBadge] = useState<boolean>(false);

  // Module 2: NEE & VIS Active Agents
  const [agentDrafts, setAgentDrafts] = useState<Record<VasopressorId, string>>({
    norepinephrine: "",
    epinephrine: "",
    vasopressin: "",
    dopamine: "",
    dobutamine: "",
  });

  // Module 3: Weaning Coach Inputs
  const [mapDraft, setMapDraft] = useState<string>("");
  const [icpDraft, setIcpDraft] = useState<string>("");
  const [stableHours, setStableHours] = useState<number>(2);
  const [lactateTrend, setLactateTrend] = useState<LactateTrend>("normal_or_falling");
  const [perfusionOk, setPerfusionOk] = useState<boolean>(true);
  const [sourceVolumeAddressed, setSourceVolumeAddressed] = useState<boolean>(true);

  useEffect(() => {
    if (initialDrugId && initialDrugId in VASOPRESSOR_CATALOG) {
      const next = initialDrugId as VasopressorId;
      setDrugId(next);
      const spec = VASOPRESSOR_CATALOG[next];
      const def = spec.presets.find((p) => p.isDefault) ?? spec.presets[0];
      setPresetId(def.id);
      setUnitMode(spec.defaultUnitMode);
    }
  }, [initialDrugId]);

  const activeSpec = VASOPRESSOR_CATALOG[drugId];
  const activeProfile = NEURO_TARGET_PROFILES[targetProfile];
  const weightKg = parsePosNum(weightDraft);

  const handleSelectDrug = (nextId: VasopressorId) => {
    setDrugId(nextId);
    const spec = VASOPRESSOR_CATALOG[nextId];
    const def = spec.presets.find((p) => p.isDefault) ?? spec.presets[0];
    setPresetId(def.id);
    setUnitMode(spec.defaultUnitMode);
    setDoseDraft("");
    setRateDraft("");
  };

  const handleResetAll = () => {
    setWeightDraft("");
    setTargetProfile("septic");
    setAccessRoute("cvc");
    setDoseDraft("");
    setRateDraft("");
    setCustomAmountDraft("");
    setCustomVolumeDraft("");
    setAgentDrafts({
      norepinephrine: "",
      epinephrine: "",
      vasopressin: "",
      dopamine: "",
      dobutamine: "",
    });
    setMapDraft("");
    setIcpDraft("");
    setStableHours(2);
    setLactateTrend("normal_or_falling");
    setPerfusionOk(true);
    setSourceVolumeAddressed(true);
  };

  // Resolve drugAmount & volumeMl from preset or custom
  const { drugAmount, volumeMl } = useMemo(() => {
    if (presetId === "custom") {
      return {
        drugAmount: parsePosNum(customAmountDraft),
        volumeMl: parsePosNum(customVolumeDraft),
      };
    }
    const found =
      activeSpec.presets.find((p) => p.id === presetId) ?? activeSpec.presets[0];
    return {
      drugAmount: found.drugAmount,
      volumeMl: found.volumeMl,
    };
  }, [presetId, customAmountDraft, customVolumeDraft, activeSpec]);

  const smartDripResult = useMemo(
    () =>
      computeSmartDrip({
        drugId,
        weightKg,
        drugAmount,
        volumeMl,
        direction,
        unitMode,
        targetDose: parsePosNum(doseDraft),
        pumpRateMlHr: parsePosNum(rateDraft),
        accessRoute,
      }),
    [drugId, weightKg, drugAmount, volumeMl, direction, unitMode, doseDraft, rateDraft, accessRoute]
  );

  const activeAgents: ActiveAgentDoses = useMemo(
    () => ({
      norepinephrine: parsePosNum(agentDrafts.norepinephrine),
      epinephrine: parsePosNum(agentDrafts.epinephrine),
      vasopressin: parsePosNum(agentDrafts.vasopressin),
      dopamine: parsePosNum(agentDrafts.dopamine),
      dobutamine: parsePosNum(agentDrafts.dobutamine),
    }),
    [agentDrafts]
  );

  const neeVisResult = useMemo(
    () => computeNeeAndVis(activeAgents, weightKg),
    [activeAgents, weightKg]
  );

  const weaningResult = useMemo(
    () =>
      evaluateWeaningCoach({
        agents: activeAgents,
        targetProfile,
        currentMap: parseNumAllowZero(mapDraft),
        currentIcp: parseNumAllowZero(icpDraft),
        stableHours,
        lactateTrend,
        perfusionOk,
        sourceVolumeAddressed,
      }),
    [
      activeAgents,
      targetProfile,
      mapDraft,
      icpDraft,
      stableHours,
      lactateTrend,
      perfusionOk,
      sourceVolumeAddressed,
    ]
  );

  const handleNudge = (delta: number) => {
    if (direction === "dose_to_rate") {
      const current = parsePosNum(doseDraft) ?? activeSpec.typicalStart;
      const step =
        unitMode === "mcg_min" && drugId !== "vasopressin"
          ? 1
          : activeSpec.titrationStep;
      const next = Math.max(0.005, Math.round((current + delta * step) * 1000) / 1000);
      setDoseDraft(String(next));
    } else {
      const current = parsePosNum(rateDraft) ?? 1;
      const next = Math.max(0.1, Math.round((current + delta * 0.5) * 100) / 100);
      setRateDraft(String(next));
    }
  };

  const handleSyncToNeeVis = () => {
    if (!smartDripResult.valid || smartDripResult.dosePrimary === null) return;
    let normalizedDose: number | null = smartDripResult.dosePrimary;
    if (smartDripResult.dosePrimaryUnit === "mcg_min") {
      normalizedDose = weightKg
        ? Math.round((smartDripResult.dosePrimary / weightKg) * 1000) / 1000
        : null;
    }
    if (normalizedDose === null) return;
    setAgentDrafts((prev) => ({
      ...prev,
      [drugId]: String(normalizedDose),
    }));
    setSyncedBadge(true);
    setTimeout(() => setSyncedBadge(false), 1800);
  };

  const unitLabel =
    drugId === "vasopressin"
      ? "U/min"
      : unitMode === "mcg_min"
      ? "mcg/min"
      : "mcg/kg/min";

  const needsWeightForDrip =
    drugId !== "vasopressin" && unitMode === "mcg_kg_min";

  return (
    <div className="space-y-3.5">
      {/* Compact Top Toolbar */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {t(lang, VASO_UI_TEXT.backToTools.en, VASO_UI_TEXT.backToTools.vi)}
            </span>
          </button>
          <h2 className="text-sm sm:text-base font-bold text-[var(--text-ink)] tracking-tight truncate">
            {t(lang, VASO_UI_TEXT.toolTitle.en, VASO_UI_TEXT.toolTitle.vi)}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Bilingual Toggle EN | VI */}
          <div
            role="group"
            aria-label="Language toggle"
            className="inline-flex rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0.5"
          >
            {(["en", "vi"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors cursor-pointer ${
                  lang === code
                    ? "bg-[#0E7490] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetAll}
            title={t(lang, VASO_UI_TEXT.resetBtn.en, VASO_UI_TEXT.resetBtn.vi)}
            aria-label={t(lang, VASO_UI_TEXT.resetBtn.en, VASO_UI_TEXT.resetBtn.vi)}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t(lang, VASO_UI_TEXT.resetBtn.en, VASO_UI_TEXT.resetBtn.vi)}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSafetyModal(true)}
            title={t(lang, VASO_UI_TEXT.lineSafetyBtn.en, VASO_UI_TEXT.lineSafetyBtn.vi)}
            aria-label={t(lang, VASO_UI_TEXT.lineSafetyBtn.en, VASO_UI_TEXT.lineSafetyBtn.vi)}
            className="inline-flex items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/8 p-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowRefsModal(true)}
            title={t(lang, VASO_UI_TEXT.refsBtn.en, VASO_UI_TEXT.refsBtn.vi)}
            aria-label={t(lang, VASO_UI_TEXT.refsBtn.en, VASO_UI_TEXT.refsBtn.vi)}
            className="inline-flex items-center justify-center rounded-xl border border-[#0E7490]/30 bg-[#0E7490]/8 p-1.5 text-xs font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/15 transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Layout: Left Controls & Inputs (col-span-4) | Right Results (col-span-8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ================================================================= */}
        {/* LEFT SIDEBAR: NAVIGATION TABS + PATIENT CONTEXT + INPUTS          */}
        {/* ================================================================= */}
        <aside className="lg:col-span-4 space-y-3">
          {/* 3-Module Switcher */}
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1 shadow-2xs">
            {(
              [
                {
                  id: "drip" as const,
                  icon: Calculator,
                  label: t(lang, "1. Drip", "1. Pha"),
                },
                {
                  id: "nee_vis" as const,
                  icon: Layers,
                  label: "2. NEE/VIS",
                  badge: neeVisResult.hasAnyActive ? String(neeVisResult.nee) : null,
                },
                {
                  id: "wean" as const,
                  icon: TrendingDown,
                  label: t(lang, "3. Wean", "3. Cai"),
                },
              ] as Array<{
                id: ToolTab;
                icon: React.ComponentType<{ className?: string }>;
                label: string;
                badge?: string | null;
              }>
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 min-h-[40px] cursor-pointer ${
                    active
                      ? "bg-[#0E7490] text-white shadow-2xs"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-ink)]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1 py-0.5 rounded text-[10px] font-mono-tech font-bold leading-none ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Patient & Hemodynamic Context Card */}
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] divide-y divide-[var(--border-hairline)] shadow-2xs">
            {/* Weight */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <label
                htmlFor="vaso-weight"
                className="text-xs font-medium text-[var(--text-ink)] cursor-pointer"
              >
                {t(lang, VASO_UI_TEXT.weightLabel.en, VASO_UI_TEXT.weightLabel.vi)}
              </label>
              <div className="w-[140px] shrink-0 flex items-stretch h-9 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] overflow-hidden focus-within:border-[#0E7490] focus-within:ring-2 focus-within:ring-[#0E7490]/20">
                <input
                  id="vaso-weight"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  min="2"
                  max="300"
                  value={weightDraft}
                  onChange={(e) => setWeightDraft(e.target.value)}
                  placeholder={t(
                    lang,
                    VASO_UI_TEXT.weightPlaceholder.en,
                    VASO_UI_TEXT.weightPlaceholder.vi
                  )}
                  className="min-w-0 flex-1 bg-transparent px-2 text-[13px] font-mono-tech font-medium text-[var(--text-ink)] placeholder:font-sans placeholder:text-[11.5px] placeholder:font-normal placeholder:text-[var(--text-muted)]/55 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="px-2 flex items-center text-[11px] font-semibold text-[var(--text-secondary)] border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70">
                  kg
                </span>
              </div>
            </div>

            {/* Venous Access */}
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--text-ink)]">
                {t(lang, VASO_UI_TEXT.accessRouteLabel.en, VASO_UI_TEXT.accessRouteLabel.vi)}
              </span>
              <div className="w-[140px] shrink-0 grid grid-cols-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-0.5 h-9">
                {(["cvc", "piv"] as const).map((route) => (
                  <button
                    key={route}
                    type="button"
                    onClick={() => setAccessRoute(route)}
                    className={`rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                      accessRoute === route
                        ? route === "piv"
                          ? "bg-amber-500 text-white"
                          : "bg-[#0E7490] text-white"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-ink)]"
                    }`}
                  >
                    {route.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Profile Select */}
            <div className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
              <span className="text-xs font-medium text-[var(--text-ink)] shrink-0">
                {t(lang, "Target", "Đích BP")}
              </span>
              <CustomSelect
                value={targetProfile}
                onChange={(val) =>
                  setTargetProfile(val as NeuroTargetProfileId)
                }
                options={(Object.keys(NEURO_TARGET_PROFILES) as NeuroTargetProfileId[]).map(
                  (pid) => {
                    const prof = NEURO_TARGET_PROFILES[pid];
                    return {
                      value: pid,
                      label: t(lang, prof.labelEn, prof.labelVi),
                      badge: prof.badge,
                    };
                  }
                )}
                ariaLabel={t(lang, "Target", "Đích BP")}
                accent="teal"
                align="right"
                size="form-sm"
                showIndicator="check"
                className="w-full sm:flex-1 sm:min-w-0 sm:max-w-[260px]"
                buttonClassName="!bg-[var(--bg-paper)] text-xs font-semibold"
                menuClassName="w-full sm:w-max sm:min-w-[280px]"
              />
            </div>
          </div>

          {/* TAB 1 INPUTS: SMART DRIP */}
          {activeTab === "drip" && (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 space-y-3 shadow-2xs">
              {/* Compact 5-Drug Pill Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t(lang, "Agent", "Thuốc")}
                  </span>
                  <a
                    href={`/neurorx?drug=${activeSpec.neurorxSlug}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F855A] dark:text-emerald-400 hover:underline"
                  >
                    <span>NeuroRx</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {VASOPRESSOR_ORDER.map((id) => {
                    const spec = VASOPRESSOR_CATALOG[id];
                    const selected = drugId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => handleSelectDrug(id)}
                        title={t(lang, spec.nameEn, spec.nameVi)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer min-h-[40px] ${
                          selected
                            ? "bg-[#0E7490] border-[#0E7490] text-white"
                            : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-ink)]"
                        }`}
                      >
                        {spec.shortLabel}
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-semibold text-[var(--text-ink)] truncate">
                  {t(lang, activeSpec.nameEn, activeSpec.nameVi)}{" "}
                  <span className="font-mono-tech text-[11px] font-normal text-[#0E7490] dark:text-cyan-400">
                    ({activeSpec.receptorProfile})
                  </span>
                </div>
              </div>

              {/* Preparation Selector */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-hairline)]">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="vaso-preset"
                    className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]"
                  >
                    {t(lang, "Dilution Mix", "Cách pha")}
                  </label>
                  {smartDripResult.concentrationPerMl !== null && (
                    <span className="text-[11px] font-mono-tech font-bold text-[#0E7490] dark:text-cyan-300">
                      {smartDripResult.concentrationPerMl} {smartDripResult.concentrationUnit}
                    </span>
                  )}
                </div>
                <select
                  id="vaso-preset"
                  value={presetId}
                  onChange={(e) => setPresetId(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-xs font-semibold text-[var(--text-ink)] focus:outline-none focus:border-[#0E7490]"
                >
                  {activeSpec.presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {t(lang, preset.labelEn, preset.labelVi)}
                    </option>
                  ))}
                  <option value="custom">
                    {t(lang, "Custom concentration...", "Tự nhập nồng độ pha...")}
                  </option>
                </select>

                {presetId === "custom" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-[var(--text-muted)] mb-0.5">
                        {drugId === "vasopressin" ? "Units" : "mg"}
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={customAmountDraft}
                        onChange={(e) => setCustomAmountDraft(e.target.value)}
                        placeholder={drugId === "vasopressin" ? "20" : "4"}
                        className="w-full h-9 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[13px] font-mono-tech font-medium text-[var(--text-ink)] placeholder:font-sans placeholder:text-[11.5px] placeholder:font-normal placeholder:text-[var(--text-muted)]/55 focus:outline-none focus:border-[#0E7490] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-[var(--text-muted)] mb-0.5">
                        mL
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={customVolumeDraft}
                        onChange={(e) => setCustomVolumeDraft(e.target.value)}
                        placeholder="50"
                        className="w-full h-9 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[13px] font-mono-tech font-medium text-[var(--text-ink)] placeholder:font-sans placeholder:text-[11.5px] placeholder:font-normal placeholder:text-[var(--text-muted)]/55 focus:outline-none focus:border-[#0E7490] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Direction & Dose/Rate Input */}
              <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="grid grid-cols-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-0.5 flex-1">
                    <button
                      type="button"
                      onClick={() => setDirection("dose_to_rate")}
                      className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                        direction === "dose_to_rate"
                          ? "bg-[#0E7490] text-white"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {t(lang, "Dose → mL/h", "Liều → mL/h")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection("rate_to_dose")}
                      className={`py-1.5 px-2 rounded-md text-[11px] font-semibold cursor-pointer ${
                        direction === "rate_to_dose"
                          ? "bg-[#0E7490] text-white"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {t(lang, "mL/h → Dose", "mL/h → Liều")}
                    </button>
                  </div>

                  {activeSpec.supportsFixedMcgMin && (
                    <button
                      type="button"
                      onClick={() =>
                        setUnitMode((u) =>
                          u === "mcg_kg_min" ? "mcg_min" : "mcg_kg_min"
                        )
                      }
                      title={t(lang, "Switch dose unit", "Đổi đơn vị liều")}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)] cursor-pointer shrink-0"
                    >
                      <ArrowLeftRight className="w-3 h-3 text-[#0E7490]" />
                      <span>{unitLabel}</span>
                    </button>
                  )}
                </div>

                {needsWeightForDrip && weightKg === null && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {t(
                        lang,
                        "Enter weight (kg) above for kg-based calculation.",
                        "Nhập cân nặng (kg) ở trên để tính theo kg."
                      )}
                    </span>
                  </div>
                )}

                <div className="flex items-stretch gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleNudge(-1)}
                    aria-label="Decrease"
                    className="w-10 h-10 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-ink)] cursor-pointer shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 flex items-stretch h-10 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] overflow-hidden focus-within:border-[#0E7490] focus-within:ring-2 focus-within:ring-[#0E7490]/20">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={direction === "dose_to_rate" ? doseDraft : rateDraft}
                      onChange={(e) =>
                        direction === "dose_to_rate"
                          ? setDoseDraft(e.target.value)
                          : setRateDraft(e.target.value)
                      }
                      placeholder={
                        direction === "dose_to_rate"
                          ? `${t(lang, "e.g.", "vd:")} ${activeSpec.typicalStart}`
                          : "4.5"
                      }
                      className="min-w-0 flex-1 bg-transparent px-2.5 text-[13px] font-mono-tech font-medium text-[var(--text-ink)] placeholder:font-sans placeholder:text-[11.5px] placeholder:font-normal placeholder:text-[var(--text-muted)]/55 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="px-2 flex items-center text-[11px] font-mono-tech font-semibold text-[var(--text-secondary)] border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 whitespace-nowrap">
                      {direction === "dose_to_rate" ? unitLabel : "mL/h"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNudge(1)}
                    aria-label="Increase"
                    className="w-10 h-10 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-ink)] cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 INPUTS: NEE & VIS */}
          {activeTab === "nee_vis" && (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] divide-y divide-[var(--border-hairline)] shadow-2xs">
              {VASOPRESSOR_ORDER.map((id) => {
                const spec = VASOPRESSOR_CATALOG[id];
                const isVaso = id === "vasopressin";
                return (
                  <div
                    key={id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-[var(--text-ink)] truncate">
                          {spec.shortLabel} · {spec.tallMan}
                        </span>
                        <a
                          href={`/neurorx?drug=${spec.neurorxSlug}`}
                          title="Open in NeuroRx"
                          className="text-[#2F855A] dark:text-emerald-400 hover:opacity-80"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-[10.5px] text-[var(--text-muted)]">
                        {isVaso
                          ? "NEE ×2.5"
                          : id === "dobutamine"
                          ? "VIS ×1 (No NEE)"
                          : id === "dopamine"
                          ? "NEE ÷100"
                          : "NEE ×1 · VIS ×100"}
                      </div>
                    </div>

                    <div className="w-[148px] shrink-0 flex items-stretch h-9 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] overflow-hidden focus-within:border-[#0E7490] focus-within:ring-2 focus-within:ring-[#0E7490]/20">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="any"
                        value={agentDrafts[id]}
                        onChange={(e) =>
                          setAgentDrafts((prev) => ({
                            ...prev,
                            [id]: e.target.value,
                          }))
                        }
                        placeholder={String(spec.typicalStart)}
                        className="min-w-0 flex-1 bg-transparent px-2 text-[13px] font-mono-tech font-medium text-[var(--text-ink)] placeholder:font-sans placeholder:text-[11.5px] placeholder:font-normal placeholder:text-[var(--text-muted)]/55 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="px-1.5 flex items-center text-[10px] font-mono-tech font-medium text-[var(--text-secondary)] border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 whitespace-nowrap">
                        {isVaso ? "U/min" : "mcg/kg/m"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3 INPUTS: WEANING COACH */}
          {activeTab === "wean" && (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[var(--text-ink)]">
                  {t(lang, "Current MAP", "MAP hiện tại")}
                </label>
                <div className="w-[130px] flex items-stretch h-9 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] overflow-hidden focus-within:border-[#0E7490]">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={mapDraft}
                    onChange={(e) => setMapDraft(e.target.value)}
                    placeholder={String(activeProfile.minMap)}
                    className="min-w-0 flex-1 bg-transparent px-2 text-[13px] font-mono-tech font-medium text-[var(--text-ink)] placeholder:font-sans placeholder:text-[11.5px] placeholder:font-normal placeholder:text-[var(--text-muted)]/55 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="px-2 flex items-center text-[10.5px] font-semibold text-[var(--text-secondary)] border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70">
                    mmHg
                  </span>
                </div>
              </div>

              {activeProfile.usesCpp && (
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-[var(--text-ink)]">
                    {t(lang, "Current ICP", "ICP hiện tại")}
                  </label>
                  <div className="w-[130px] flex items-stretch h-9 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] overflow-hidden focus-within:border-[#0E7490]">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={icpDraft}
                      onChange={(e) => setIcpDraft(e.target.value)}
                      placeholder="12"
                      className="min-w-0 flex-1 bg-transparent px-2 text-[13px] font-mono-tech font-medium text-[var(--text-ink)] placeholder:font-sans placeholder:text-[11.5px] placeholder:font-normal placeholder:text-[var(--text-muted)]/55 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="px-2 flex items-center text-[10.5px] font-semibold text-[var(--text-secondary)] border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70">
                      mmHg
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-xs font-medium text-[var(--text-ink)]">
                  {t(lang, "Stable", "Ổn định")}
                </span>
                <div className="grid grid-cols-3 gap-1 w-[150px]">
                  {[
                    { val: 0, label: "<2h" },
                    { val: 2, label: "2–4h" },
                    { val: 6, label: "≥6h" },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setStableHours(opt.val)}
                      className={`h-8 rounded-lg text-[11px] font-mono-tech font-semibold border cursor-pointer ${
                        stableHours === opt.val
                          ? "bg-[#0E7490] border-[#0E7490] text-white"
                          : "bg-[var(--bg-paper)] border-[var(--border-hairline)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--text-ink)]">
                  {t(lang, "Lactate", "Lactat")}
                </span>
                <div className="grid grid-cols-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-0.5 w-[150px]">
                  <button
                    type="button"
                    onClick={() => setLactateTrend("normal_or_falling")}
                    className={`py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      lactateTrend === "normal_or_falling"
                        ? "bg-emerald-600 text-white"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {t(lang, "Falling", "Giảm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLactateTrend("flat_or_rising")}
                    className={`py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                      lactateTrend === "flat_or_rising"
                        ? "bg-rose-600 text-white"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {t(lang, "Rising", "Tăng")}
                  </button>
                </div>
              </div>

              <label className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-hairline)] cursor-pointer">
                <span className="text-xs text-[var(--text-ink)]">
                  {t(lang, "CRT <3s & UOP ≥0.5 mL/kg/h", "CRT <3s & Nước tiểu ≥0.5 mL/kg/h")}
                </span>
                <input
                  type="checkbox"
                  checked={perfusionOk}
                  onChange={(e) => setPerfusionOk(e.target.checked)}
                  className="w-4 h-4 accent-[#0E7490]"
                />
              </label>

              <label className="flex items-center justify-between gap-2 cursor-pointer">
                <span className="text-xs text-[var(--text-ink)]">
                  {t(lang, "Euvolemia & source controlled", "Đủ dịch & kiểm soát nguyên nhân")}
                </span>
                <input
                  type="checkbox"
                  checked={sourceVolumeAddressed}
                  onChange={(e) => setSourceVolumeAddressed(e.target.checked)}
                  className="w-4 h-4 accent-[#0E7490]"
                />
              </label>
            </div>
          )}
        </aside>

        {/* ================================================================= */}
        {/* RIGHT MAIN AREA: PRIMARY CALCULATIONS & CLINICAL GUIDANCE         */}
        {/* ================================================================= */}
        <section className="lg:col-span-8 space-y-3.5">
          {/* Slim Context Strip */}
          <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-2 flex flex-wrap items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
              <span className="px-2 py-0.5 rounded-md bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300 font-mono-tech font-bold shrink-0">
                {activeProfile.badge}
              </span>
              <span className="text-[var(--text-secondary)] leading-snug">
                {t(lang, activeProfile.noteEn, activeProfile.noteVi)}
              </span>
            </div>
            <span className="text-[11px] font-mono-tech font-semibold text-[var(--text-muted)] shrink-0">
              {accessRoute.toUpperCase()} {weightKg ? `· ${weightKg} kg` : ""}
            </span>
          </div>

          {/* TAB 1 OUTPUT: SMART DRIP */}
          {activeTab === "drip" && (
            <>
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {direction === "dose_to_rate"
                        ? t(lang, "Infusion Pump Rate", "Tốc độ Bơm tiêm điện")
                        : t(lang, "Delivered Dose", "Liều đang truyền")}
                    </span>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {t(lang, activeSpec.roleEn, activeSpec.roleVi)}
                    </div>
                  </div>
                  {smartDripResult.syringeDurationHours !== null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-subtle)] px-3 py-1 text-xs font-mono-tech font-semibold text-[var(--text-ink)]">
                      <Droplets className="w-3.5 h-3.5 text-[#0E7490]" />
                      <span>
                        ~{smartDripResult.syringeDurationHours}h / {volumeMl} mL
                      </span>
                    </span>
                  )}
                </div>

                {smartDripResult.valid ? (
                  <div className="flex flex-wrap items-end justify-between gap-4 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-4xl sm:text-5xl font-extrabold font-mono-tech tabular-nums text-[#0E7490] dark:text-cyan-400">
                          {direction === "dose_to_rate"
                            ? smartDripResult.rateMlHr
                            : smartDripResult.dosePrimary}
                        </span>
                        <span className="text-base font-bold text-[var(--text-secondary)]">
                          {direction === "dose_to_rate" ? "mL/h" : unitLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tech text-[var(--text-secondary)]">
                        <span>
                          {direction === "dose_to_rate"
                            ? `= ${smartDripResult.dosePrimary} ${unitLabel}`
                            : `= ${smartDripResult.rateMlHr} mL/h`}
                        </span>
                        {smartDripResult.doseSecondaryLabel && (
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-ink)]">
                            {smartDripResult.doseSecondaryLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSyncToNeeVis}
                      disabled={
                        smartDripResult.dosePrimaryUnit === "mcg_min" &&
                        weightKg === null
                      }
                      className="px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-[#0E7490]/35 bg-[#0E7490]/10 hover:bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300 transition-colors flex items-center gap-1.5 min-h-[40px] cursor-pointer disabled:opacity-45"
                    >
                      {syncedBadge ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{t(lang, "Synced to NEE/VIS", "Đã đưa sang NEE/VIS")}</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4" />
                          <span>{t(lang, "Send to NEE/VIS", "Đưa sang NEE/VIS")}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs sm:text-sm text-[var(--text-muted)]">
                    {t(
                      lang,
                      "Select drug & mix on the left, enter weight (if kg-based) and target dose or mL/h.",
                      "Chọn thuốc & cách pha bên trái, nhập cân nặng (nếu tính theo kg) và liều hoặc mL/giờ."
                    )}
                  </div>
                )}

                {smartDripResult.alerts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
                    {smartDripResult.alerts.map((al, i) => (
                      <div
                        key={i}
                        className={`rounded-r-xl border px-3.5 py-2.5 text-xs ${severityBannerClass(
                          al.severity
                        )}`}
                      >
                        <div className="font-bold text-[var(--text-ink)]">
                          {t(lang, al.titleEn, al.titleVi)}
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                          {t(lang, al.detailEn, al.detailVi)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clickable Quick Titration Table */}
              {smartDripResult.titrationTable.length > 0 && (
                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {t(lang, "Quick Titration Reference", "Bảng tra nhanh chỉnh liều")}
                    </h4>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {t(lang, "Titrate", "Chỉnh")}:{" "}
                      {t(
                        lang,
                        activeSpec.titrationIntervalEn,
                        activeSpec.titrationIntervalVi
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {smartDripResult.titrationTable.map((row) => (
                      <button
                        key={row.dose}
                        type="button"
                        onClick={() => {
                          setDirection("dose_to_rate");
                          setDoseDraft(String(row.dose));
                        }}
                        className="text-left p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:border-[#0E7490] transition-colors cursor-pointer"
                      >
                        <div className="text-[11px] font-mono-tech text-[var(--text-muted)]">
                          {row.dose} {unitLabel}
                        </div>
                        <div className="text-sm font-extrabold font-mono-tech text-[#0E7490] dark:text-cyan-400">
                          {row.rateMlHr ?? "—"} <span className="text-[10px] font-normal">mL/h</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Compact Diluent & Y-Site Card */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-3 text-xs text-[var(--text-secondary)] space-y-1">
                <div>
                  <strong className="text-[var(--text-ink)]">
                    {t(lang, "Diluent:", "Dung môi:")}
                  </strong>{" "}
                  {t(lang, activeSpec.preferredDiluentEn, activeSpec.preferredDiluentVi)}
                </div>
                <div>
                  <strong className="text-[var(--text-ink)]">
                    {t(lang, "Y-site:", "Tương kỵ chạc Y:")}
                  </strong>{" "}
                  {t(lang, activeSpec.ySiteIncompatibleEn, activeSpec.ySiteIncompatibleVi)}
                </div>
              </div>
            </>
          )}

          {/* TAB 2 OUTPUT: NEE & VIS */}
          {activeTab === "nee_vis" && (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Norepinephrine Equivalent (NEE · Kotani 2023)
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold font-mono-tech tabular-nums text-[#0E7490] dark:text-cyan-400">
                      {neeVisResult.nee}
                    </span>
                    <span className="text-xs font-mono-tech text-[var(--text-secondary)]">
                      mcg/kg/min
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Vasoactive-Inotropic Score (VIS · Gaies 2010)
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold font-mono-tech tabular-nums text-[var(--text-ink)]">
                      {neeVisResult.vis ?? "—"}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {neeVisResult.visMissingWeightForVaso
                        ? t(lang, "Partial (need weight)", "Thiếu cân nặng")
                        : neeVisResult.visTier}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-[var(--border-hairline)]">
                <span className="font-semibold text-[var(--text-secondary)]">
                  {t(lang, "Vasopressor Burden Tier:", "Mức độ gánh nặng vận mạch:")}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[11px] ${
                    neeVisResult.shockTier === "refractory"
                      ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                      : neeVisResult.shockTier === "high"
                      ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                      : neeVisResult.shockTier === "moderate"
                      ? "bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {neeVisResult.shockTier}
                </span>
              </div>

              {neeVisResult.contributions.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t(lang, "Agent Breakdown", "Đóng góp từng thuốc")}
                  </div>
                  {neeVisResult.contributions.map((c) => (
                    <div
                      key={c.drugId}
                      className="flex items-center justify-between text-xs font-mono-tech bg-[var(--bg-paper)] rounded-lg px-3 py-2 border border-[var(--border-hairline)]"
                    >
                      <span className="text-[var(--text-ink)] font-semibold">
                        {VASOPRESSOR_CATALOG[c.drugId].shortLabel} ({c.dose} {c.unitLabel})
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        NEE +{c.neeContribution} · VIS +{c.visContribution ?? "?"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                  {t(
                    lang,
                    "Enter active infusion doses on the left (or sync from Drip tab).",
                    "Nhập liều các thuốc đang truyền ở cột trái (hoặc đồng bộ từ tab Pha)."
                  )}
                </div>
              )}

              {neeVisResult.escalationAlerts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
                  {neeVisResult.escalationAlerts.map((al, i) => (
                    <div
                      key={i}
                      className={`rounded-r-xl border px-3.5 py-2.5 text-xs ${severityBannerClass(
                        al.severity
                      )}`}
                    >
                      <div className="font-bold text-[var(--text-ink)]">
                        {t(lang, al.titleEn, al.titleVi)}
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                        {t(lang, al.detailEn, al.detailVi)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3 OUTPUT: WEANING COACH */}
          {activeTab === "wean" && (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-[#0E7490]" />
                  <h4 className="text-sm font-bold text-[var(--text-ink)]">
                    {t(lang, "De-escalation Plan", "Phác đồ Giảm liều & Cai vận mạch")}
                  </h4>
                </div>
                {weaningResult.computedCpp !== null && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300 text-xs font-mono-tech font-bold">
                    CPP {weaningResult.computedCpp} mmHg
                  </span>
                )}
              </div>

              <div
                className={`rounded-r-xl border px-3.5 py-3 text-xs ${severityBannerClass(
                  weaningResult.readiness === "ready"
                    ? "ok"
                    : weaningResult.readiness === "caution"
                    ? "warning"
                    : weaningResult.readiness === "hold"
                    ? "danger"
                    : "info"
                )}`}
              >
                <div className="font-bold text-[var(--text-ink)]">
                  {weaningResult.readiness === "ready"
                    ? t(lang, "READY TO WEAN", "ĐỦ ĐIỀU KIỆN GIẢM LIỀU")
                    : weaningResult.readiness === "caution"
                    ? t(lang, "PROCEED WITH CAUTION", "THẬN TRỌNG KHI GIẢM LIỀU")
                    : weaningResult.readiness === "hold"
                    ? t(lang, "HOLD WEANING — STABILIZE FIRST", "CHƯA NÊN CAI — ỔN ĐỊNH HUYẾT ĐỘNG TRƯỚC")
                    : t(
                        lang,
                        "No active agents entered in NEE/VIS tab",
                        "Chưa nhập thuốc đang truyền ở tab NEE/VIS"
                      )}
                </div>
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {weaningResult.checklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11.5px]">
                      {item.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                      )}
                      <span className="text-[var(--text-secondary)]">
                        {t(lang, item.labelEn, item.labelVi)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {weaningResult.orderedSteps.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t(lang, "Recommended Tapering Sequence", "Thứ tự giảm liều ưu tiên")}
                  </div>
                  {weaningResult.orderedSteps.map((step) => (
                    <div
                      key={step.drugId}
                      className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3 space-y-1"
                    >
                      <div className="text-xs sm:text-sm font-bold text-[#0E7490] dark:text-cyan-400">
                        {t(lang, step.actionTitleEn, step.actionTitleVi)}
                      </div>
                      <div className="text-xs font-semibold text-[var(--text-ink)]">
                        {t(lang, step.stepRuleEn, step.stepRuleVi)}
                      </div>
                      <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
                        {t(lang, step.rationaleEn, step.rationaleVi)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3 space-y-1.5">
                <div className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {t(lang, "Stop & Re-escalate Triggers", "Dấu hiệu cần ngừng cai & tăng lại liều")}
                  </span>
                </div>
                <ul className="space-y-1 text-[11.5px] text-[var(--text-secondary)] list-disc pl-4">
                  {(lang === "vi"
                    ? weaningResult.reboundFlagsVi
                    : weaningResult.reboundFlagsEn
                  ).map((flag, i) => (
                    <li key={i}>{flag}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* MODAL: LINE SAFETY & EXTRAVASATION RESCUE */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-[var(--text-ink)]">
                  {t(
                    lang,
                    "Line Safety & Extravasation Rescue Protocol",
                    "An toàn đường truyền & Xử trí Thoát mạch"
                  )}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSafetyModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-900 dark:text-rose-200 font-medium">
              {t(
                lang,
                EXTRAVASATION_STEPS.vasopressinWarningEn,
                EXTRAVASATION_STEPS.vasopressinWarningVi
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {t(lang, "Immediate Bedside Steps", "Xử trí cấp cứu tại giường")}
              </h4>
              <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[var(--text-ink)] leading-relaxed">
                {(lang === "vi"
                  ? EXTRAVASATION_STEPS.immediateVi
                  : EXTRAVASATION_STEPS.immediateEn
                ).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>

            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3.5 space-y-1">
              <div className="text-xs font-bold text-[#0E7490] dark:text-cyan-400">
                {t(lang, "Antidote: Phentolamine / Fallback", "Thuốc giải độc: Phentolamine / Thay thế")}
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t(lang, EXTRAVASATION_STEPS.antidoteEn, EXTRAVASATION_STEPS.antidoteVi)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FORMULAS & REFERENCES */}
      {showRefsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#0E7490]" />
                <h3 className="text-base font-bold text-[var(--text-ink)]">
                  {t(lang, "Formulas & Clinical References", "Công thức & Tài liệu tham khảo")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRefsModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono-tech bg-[var(--bg-paper)] p-3.5 rounded-xl border border-[var(--border-hairline)]">
              <div>
                <strong>Pump Rate (mL/h)</strong> = (Dose [mcg/kg/min] × Weight [kg] × 60) ÷ Conc [mcg/mL]
              </div>
              <div>
                <strong>NEE (Kotani 2023)</strong> = NE + Epi + (Dopamine ÷ 100) + (Vasopressin [U/min] × 2.5)
              </div>
              <div>
                <strong>VIS (Gaies 2010)</strong> = Dopamine + Dobutamine + 100×Epi + 100×NE + 10,000×Vasopressin [U/kg/min]
              </div>
            </div>

            <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
              {VASO_REFERENCES.map((r) => (
                <li key={r.id} className="leading-relaxed">
                  • {r.citation}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
