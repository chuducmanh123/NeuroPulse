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
  TrendingUp,
  Pause,
  Table2,
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
  type AgentActionType,
  type DripDirection,
  type LactateTrend,
} from "@/lib/neurocalc/tools/vasopressorEngine";

interface VasopressorToolProps {
  onBack: () => void;
  initialDrugId?: string;
}

type ToolTab = "infusion" | "wean";

interface DrugDripState {
  enabled: boolean;
  presetId: string;
  customAmountDraft: string;
  customVolumeDraft: string;
  direction: DripDirection;
  unitMode: DoseUnitMode;
  doseDraft: string;
  rateDraft: string;
}

function createInitialDripStates(initialDrugId?: string): Record<VasopressorId, DrugDripState> {
  const initial = resolveInitialDrug(initialDrugId);
  const entries = VASOPRESSOR_ORDER.map((id) => {
    const spec = VASOPRESSOR_CATALOG[id];
    const def = spec.presets.find((p) => p.isDefault) ?? spec.presets[0];
    return [
      id,
      {
        enabled: id === initial,
        presetId: def.id,
        customAmountDraft: "",
        customVolumeDraft: "",
        direction: "dose_to_rate" as DripDirection,
        unitMode: spec.defaultUnitMode,
        doseDraft: "",
        rateDraft: "",
      },
    ];
  });
  return Object.fromEntries(entries) as Record<VasopressorId, DrugDripState>;
}

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

function agentActionBadge(action: AgentActionType, lang: VasoLang) {
  switch (action) {
    case "increase":
      return {
        label: t(lang, "INCREASE", "TĂNG LIỀU"),
        cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
      };
    case "wean":
      return {
        label: t(lang, "WEAN", "GIẢM LIỀU"),
        cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      };
    case "stop":
      return {
        label: t(lang, "STOP / TRIAL OFF", "NGƯNG THUỐC"),
        cls: "bg-emerald-600 text-white border-emerald-600",
      };
    case "switch":
      return {
        label: t(lang, "SWITCH", "ĐỔI THUỐC"),
        cls: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
      };
    default:
      return {
        label: t(lang, "MAINTAIN", "DUY TRÌ"),
        cls: "bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300 border-[#0E7490]/30",
      };
  }
}

export function VasopressorTool({ onBack, initialDrugId }: VasopressorToolProps) {
  const [lang, setLang] = useState<VasoLang>("en");
  const [activeTab, setActiveTab] = useState<ToolTab>("infusion");
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showRefsModal, setShowRefsModal] = useState(false);

  // Shared Clinical Context
  const [weightDraft, setWeightDraft] = useState<string>("");
  const [targetProfile, setTargetProfile] = useState<NeuroTargetProfileId>("septic");
  const [accessRoute, setAccessRoute] = useState<AccessRoute>("cvc");

  // Unified Multi-Agent Drip & NEE/VIS State
  const [dripStates, setDripStates] = useState<Record<VasopressorId, DrugDripState>>(() =>
    createInitialDripStates(initialDrugId)
  );
  const [openTitrationByDrug, setOpenTitrationByDrug] = useState<
    Partial<Record<VasopressorId, boolean>>
  >({});

  // Module 2 (Wean): Clinical Status Inputs
  const [mapDraft, setMapDraft] = useState<string>("");
  const [icpDraft, setIcpDraft] = useState<string>("");
  const [stableHours, setStableHours] = useState<number>(2);
  const [lactateTrend, setLactateTrend] = useState<LactateTrend>("normal_or_falling");
  const [perfusionOk, setPerfusionOk] = useState<boolean>(true);
  const [sourceVolumeAddressed, setSourceVolumeAddressed] = useState<boolean>(true);

  useEffect(() => {
    if (initialDrugId && initialDrugId in VASOPRESSOR_CATALOG) {
      const next = initialDrugId as VasopressorId;
      setDripStates((prev) => ({
        ...prev,
        [next]: { ...prev[next], enabled: true },
      }));
    }
  }, [initialDrugId]);

  const activeProfile = NEURO_TARGET_PROFILES[targetProfile];
  const weightKg = parsePosNum(weightDraft);

  const enabledDrugs = useMemo(
    () => VASOPRESSOR_ORDER.filter((id) => dripStates[id].enabled),
    [dripStates]
  );

  const toggleDrug = (id: VasopressorId) => {
    setDripStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled },
    }));
  };

  const updateDrugState = (id: VasopressorId, patch: Partial<DrugDripState>) => {
    setDripStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  };

  const handleResetAll = () => {
    setWeightDraft("");
    setTargetProfile("septic");
    setAccessRoute("cvc");
    setDripStates(createInitialDripStates(initialDrugId));
    setMapDraft("");
    setIcpDraft("");
    setStableHours(2);
    setLactateTrend("normal_or_falling");
    setPerfusionOk(true);
    setSourceVolumeAddressed(true);
  };

  const smartDripResults = useMemo(() => {
    const out = {} as Record<
      VasopressorId,
      ReturnType<typeof computeSmartDrip> & { drugAmount: number | null; volumeMl: number | null }
    >;
    for (const id of VASOPRESSOR_ORDER) {
      const st = dripStates[id];
      const spec = VASOPRESSOR_CATALOG[id];
      let drugAmount: number | null = null;
      let volumeMl: number | null = null;
      if (st.presetId === "custom") {
        drugAmount = parsePosNum(st.customAmountDraft);
        volumeMl = parsePosNum(st.customVolumeDraft);
      } else {
        const found = spec.presets.find((p) => p.id === st.presetId) ?? spec.presets[0];
        drugAmount = found.drugAmount;
        volumeMl = found.volumeMl;
      }
      const res = computeSmartDrip({
        drugId: id,
        weightKg,
        drugAmount,
        volumeMl,
        direction: st.direction,
        unitMode: st.unitMode,
        targetDose: parsePosNum(st.doseDraft),
        pumpRateMlHr: parsePosNum(st.rateDraft),
        accessRoute,
      });
      out[id] = { ...res, drugAmount, volumeMl };
    }
    return out;
  }, [dripStates, weightKg, accessRoute]);

  const activeAgents: ActiveAgentDoses = useMemo(() => {
    const getNormalizedDose = (id: VasopressorId): number | null => {
      const st = dripStates[id];
      if (!st.enabled) return null;
      const res = smartDripResults[id];
      if (res.valid && res.dosePrimary !== null) {
        if (res.dosePrimaryUnit === "mcg_min") {
          return weightKg ? Math.round((res.dosePrimary / weightKg) * 1000) / 1000 : null;
        }
        return res.dosePrimary;
      }
      // Fallback: if user typed dose in dose_to_rate mode with mcg_kg_min or units_min (e.g. without weight in Tab 2)
      if (st.direction === "dose_to_rate" && st.unitMode !== "mcg_min") {
        return parsePosNum(st.doseDraft);
      }
      return null;
    };
    return {
      norepinephrine: getNormalizedDose("norepinephrine"),
      epinephrine: getNormalizedDose("epinephrine"),
      vasopressin: getNormalizedDose("vasopressin"),
      dopamine: getNormalizedDose("dopamine"),
      dobutamine: getNormalizedDose("dobutamine"),
    };
  }, [dripStates, smartDripResults, weightKg]);

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

  const handleNudgeDrug = (id: VasopressorId, delta: number) => {
    const st = dripStates[id];
    const spec = VASOPRESSOR_CATALOG[id];
    if (st.direction === "dose_to_rate") {
      const current = parsePosNum(st.doseDraft) ?? spec.typicalStart;
      const step =
        st.unitMode === "mcg_min" && id !== "vasopressin" ? 1 : spec.titrationStep;
      const next = Math.max(0.005, Math.round((current + delta * step) * 1000) / 1000);
      updateDrugState(id, { doseDraft: String(next) });
    } else {
      const current = parsePosNum(st.rateDraft) ?? 1;
      const next = Math.max(0.1, Math.round((current + delta * 0.5) * 100) / 100);
      updateDrugState(id, { rateDraft: String(next) });
    }
  };

  const handleTab2DoseChange = (id: VasopressorId, raw: string) => {
    const parsed = parsePosNum(raw);
    const isVaso = id === "vasopressin";
    updateDrugState(id, {
      enabled: raw.trim() !== "" && (parsed === null || parsed > 0),
      direction: "dose_to_rate",
      unitMode: isVaso ? "units_min" : "mcg_kg_min",
      doseDraft: raw,
    });
  };

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
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 sm:px-2.5 py-1.5 min-h-[36px] min-w-[36px] text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t(lang, VASO_UI_TEXT.resetBtn.en, VASO_UI_TEXT.resetBtn.vi)}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSafetyModal(true)}
            title={t(lang, VASO_UI_TEXT.lineSafetyBtn.en, VASO_UI_TEXT.lineSafetyBtn.vi)}
            aria-label={t(lang, VASO_UI_TEXT.lineSafetyBtn.en, VASO_UI_TEXT.lineSafetyBtn.vi)}
            className="inline-flex items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/8 p-1.5 min-h-[36px] min-w-[36px] text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 transition-colors cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowRefsModal(true)}
            title={t(lang, VASO_UI_TEXT.refsBtn.en, VASO_UI_TEXT.refsBtn.vi)}
            aria-label={t(lang, VASO_UI_TEXT.refsBtn.en, VASO_UI_TEXT.refsBtn.vi)}
            className="inline-flex items-center justify-center rounded-xl border border-[#0E7490]/30 bg-[#0E7490]/8 p-1.5 min-h-[36px] min-w-[36px] text-xs font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/15 transition-colors cursor-pointer"
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
          {/* 2-Module Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1 shadow-2xs">
            {(
              [
                {
                  id: "infusion" as const,
                  icon: Calculator,
                  label: t(lang, "1. Infusion & NEE", "1. Pha & NEE/VIS"),
                  badge: neeVisResult.hasAnyActive ? `NEE ${neeVisResult.nee}` : null,
                },
                {
                  id: "wean" as const,
                  icon: TrendingDown,
                  label: t(lang, "2. Titrate & Wean", "2. Chỉnh & Cai"),
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
                  className={`px-1.5 sm:px-2 py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors flex items-center justify-center gap-1 min-h-[44px] cursor-pointer ${
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

          {/* TAB 1 INPUTS: MULTI-AGENT SELECTOR */}
          {activeTab === "infusion" && (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {t(lang, "Active Vasopressors (Multi-Select)", "Chọn thuốc vận mạch (1 hoặc nhiều)")}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300 text-[10.5px] font-mono-tech font-bold">
                  {enabledDrugs.length}/5
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1.5">
                {VASOPRESSOR_ORDER.map((id) => {
                  const spec = VASOPRESSOR_CATALOG[id];
                  const st = dripStates[id];
                  const res = smartDripResults[id];
                  const isVaso = id === "vasopressin";
                  const uLabel = isVaso
                    ? "U/min"
                    : st.unitMode === "mcg_min"
                    ? "mcg/min"
                    : "mcg/kg/min";
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleDrug(id)}
                      className={`w-full px-2.5 lg:px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-1.5 lg:gap-2 min-h-[44px] ${
                        st.enabled
                          ? "border-[#0E7490] bg-[#0E7490]/10"
                          : "border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              st.enabled ? "bg-[#0E7490]" : "bg-[var(--border-hairline)]"
                            }`}
                          />
                          <span className="text-xs font-bold text-[var(--text-ink)] truncate">
                            <span className="lg:hidden">{spec.shortLabel}</span>
                            <span className="hidden lg:inline">
                              {spec.shortLabel} · {t(lang, spec.nameEn, spec.nameVi)}
                            </span>
                          </span>
                        </div>
                        <div className="text-[10px] lg:text-[10.5px] text-[var(--text-muted)] pl-3.5 truncate">
                          {st.enabled && res.valid
                            ? `${res.rateMlHr} mL/h · ${res.dosePrimary} ${uLabel}`
                            : spec.receptorProfile}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          st.enabled
                            ? "bg-[#0E7490] text-white"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {st.enabled ? t(lang, "ON", "BẬT") : "+"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2 INPUTS: ACTIVE PRESSORS + HEMODYNAMICS */}
          {activeTab === "wean" && (
            <div className="space-y-3">
              {/* Compact Active Vasopressors Card (synced with Tab 1) */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t(lang, "Current Vasopressors", "Vận mạch đang dùng")}
                  </span>
                  {weaningResult.nee > 0 && (
                    <span className="text-[11px] font-mono-tech font-bold text-[#0E7490] dark:text-cyan-300">
                      NEE {weaningResult.nee}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-1.5">
                  {VASOPRESSOR_ORDER.map((id) => {
                    const spec = VASOPRESSOR_CATALOG[id];
                    const st = dripStates[id];
                    const isVaso = id === "vasopressin";
                    const displayDose =
                      !st.enabled
                        ? ""
                        : st.direction === "dose_to_rate" && st.unitMode !== "mcg_min"
                        ? st.doseDraft
                        : activeAgents[id] !== null
                        ? String(activeAgents[id])
                        : "";
                    return (
                      <div key={id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-2">
                        <span className="text-[11.5px] lg:text-xs font-semibold text-[var(--text-ink)] truncate">
                          {spec.shortLabel} · {spec.nameEn.split(" ")[0]}
                        </span>
                        <div className="w-full lg:w-[132px] shrink-0 flex items-stretch h-9 lg:h-8 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] overflow-hidden focus-within:border-[#0E7490]">
                          <input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={displayDose}
                            onChange={(e) => handleTab2DoseChange(id, e.target.value)}
                            placeholder="0"
                            className="min-w-0 flex-1 bg-transparent px-2 text-xs font-mono-tech font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)]/45 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="px-1.5 flex items-center text-[10px] font-mono-tech font-medium text-[var(--text-secondary)] border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 whitespace-nowrap">
                            {isVaso ? "U/m" : "mcg/kg/m"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

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
            </div>
          )}
        </aside>

        {/* ================================================================= */}
        {/* RIGHT MAIN AREA: PRIMARY CALCULATIONS & CLINICAL GUIDANCE         */}
        {/* ================================================================= */}
        <section id="vaso-results" className="lg:col-span-8 space-y-3.5 scroll-mt-4">
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

          {/* TAB 1 OUTPUT: MULTI-AGENT INFUSION + AUTO NEE/VIS */}
          {activeTab === "infusion" && (
            <div className="space-y-3.5">
              {enabledDrugs.length === 0 ? (
                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-6 text-center text-xs sm:text-sm text-[var(--text-muted)]">
                  {t(
                    lang,
                    "Select one or more vasopressors on the left to calculate infusion rates and NEE/VIS.",
                    "Chọn một hoặc nhiều thuốc vận mạch ở cột trái để tính tốc độ truyền và chỉ số NEE/VIS."
                  )}
                </div>
              ) : (
                enabledDrugs.map((id) => {
                  const spec = VASOPRESSOR_CATALOG[id];
                  const st = dripStates[id];
                  const res = smartDripResults[id];
                  const isVaso = id === "vasopressin";
                  const uLabel = isVaso
                    ? "U/min"
                    : st.unitMode === "mcg_min"
                    ? "mcg/min"
                    : "mcg/kg/min";
                  const needsWeight = !isVaso && st.unitMode === "mcg_kg_min";

                  return (
                    <div
                      key={id}
                      className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-xs space-y-3"
                    >
                      {/* Drug Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-hairline)]">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[var(--text-ink)]">
                              {t(lang, spec.nameEn, spec.nameVi)}
                            </span>
                            <span className="font-mono-tech text-[11px] text-[#0E7490] dark:text-cyan-400">
                              ({spec.receptorProfile})
                            </span>
                            <a
                              href={`/neurorx?drug=${spec.neurorxSlug}`}
                              title="Open in NeuroRx"
                              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#2F855A] dark:text-emerald-400 hover:underline"
                            >
                              <span>NeuroRx</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <div className="text-[11.5px] text-[var(--text-secondary)]">
                            {t(lang, spec.roleEn, spec.roleVi)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {res.syringeDurationHours !== null && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2.5 py-1 text-[11px] font-mono-tech font-semibold text-[var(--text-ink)]">
                              <Droplets className="w-3 h-3 text-[#0E7490]" />
                              <span>
                                ~{res.syringeDurationHours}h / {res.volumeMl} mL
                              </span>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleDrug(id)}
                            title={t(lang, "Remove agent", "Bỏ thuốc này")}
                            aria-label={t(lang, "Remove agent", "Bỏ thuốc này")}
                            className="p-1.5 rounded-lg border border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-rose-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Dilution Mix + Input + Output */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                        <div className="md:col-span-7 space-y-2.5">
                          {/* Dilution Mix */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                {t(lang, "Dilution Mix", "Cách pha")}
                              </span>
                              {res.concentrationPerMl !== null && (
                                <span className="text-[11px] font-mono-tech font-bold text-[#0E7490] dark:text-cyan-300">
                                  {res.concentrationPerMl} {res.concentrationUnit}
                                </span>
                              )}
                            </div>
                            <select
                              value={st.presetId}
                              onChange={(e) =>
                                updateDrugState(id, { presetId: e.target.value })
                              }
                              aria-label={`${spec.shortLabel} dilution`}
                              className="w-full h-10 lg:h-9 px-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-xs font-semibold text-[var(--text-ink)] focus:outline-none focus:border-[#0E7490]"
                            >
                              {spec.presets.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                  {t(lang, preset.labelEn, preset.labelVi)}
                                </option>
                              ))}
                              <option value="custom">
                                {t(lang, "Custom concentration...", "Tự nhập nồng độ pha...")}
                              </option>
                            </select>

                            {st.presetId === "custom" && (
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  value={st.customAmountDraft}
                                  onChange={(e) =>
                                    updateDrugState(id, { customAmountDraft: e.target.value })
                                  }
                                  placeholder={isVaso ? "Units (e.g. 20)" : "mg (e.g. 4)"}
                                  className="w-full h-8 px-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-xs font-mono-tech text-[var(--text-ink)] focus:outline-none focus:border-[#0E7490]"
                                />
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="any"
                                  value={st.customVolumeDraft}
                                  onChange={(e) =>
                                    updateDrugState(id, { customVolumeDraft: e.target.value })
                                  }
                                  placeholder="mL (e.g. 50)"
                                  className="w-full h-8 px-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-xs font-mono-tech text-[var(--text-ink)] focus:outline-none focus:border-[#0E7490]"
                                />
                              </div>
                            )}
                          </div>

                          {/* Single-Row Input + Direction Toggle + Unit Toggle */}
                          <div className="space-y-1.5">
                            {needsWeight && weightKg === null && (
                              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  {t(
                                    lang,
                                    "Enter weight (kg) on the left.",
                                    "Nhập cân nặng (kg) ở cột trái."
                                  )}
                                </span>
                              </div>
                            )}

                            <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-1.5">
                              <div className="flex items-stretch gap-1 flex-1 min-w-[160px]">
                                <button
                                  type="button"
                                  onClick={() => handleNudgeDrug(id, -1)}
                                  aria-label="Decrease"
                                  className="w-10 h-10 lg:w-9 lg:h-9 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-ink)] cursor-pointer shrink-0"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <div className="flex-1 flex items-stretch h-10 lg:h-9 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] overflow-hidden focus-within:border-[#0E7490] focus-within:ring-2 focus-within:ring-[#0E7490]/20">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    value={
                                      st.direction === "dose_to_rate"
                                        ? st.doseDraft
                                        : st.rateDraft
                                    }
                                    onChange={(e) =>
                                      updateDrugState(
                                        id,
                                        st.direction === "dose_to_rate"
                                          ? { doseDraft: e.target.value }
                                          : { rateDraft: e.target.value }
                                      )
                                    }
                                    placeholder={
                                      st.direction === "dose_to_rate"
                                        ? `${t(lang, "e.g.", "vd:")} ${spec.typicalStart}`
                                        : "4.5"
                                    }
                                    className="min-w-0 flex-1 bg-transparent px-2.5 text-[14px] lg:text-[13px] font-mono-tech font-medium text-[var(--text-ink)] placeholder:font-sans placeholder:text-[11.5px] placeholder:font-normal placeholder:text-[var(--text-muted)]/55 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  {(st.direction === "rate_to_dose" || !spec.supportsFixedMcgMin) && (
                                    <span className="px-2 flex items-center text-[10.5px] font-mono-tech font-semibold text-[var(--text-secondary)] border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 whitespace-nowrap">
                                      {st.direction === "dose_to_rate" ? uLabel : "mL/h"}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleNudgeDrug(id, 1)}
                                  aria-label="Increase"
                                  className="w-10 h-10 lg:w-9 lg:h-9 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-ink)] cursor-pointer shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-stretch gap-1.5 w-full sm:w-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateDrugState(id, {
                                      direction:
                                        st.direction === "dose_to_rate"
                                          ? "rate_to_dose"
                                          : "dose_to_rate",
                                    })
                                  }
                                  title={t(lang, "Switch calculation direction", "Đổi chiều tính toán")}
                                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-2.5 h-10 lg:h-9 rounded-xl border border-[#0E7490]/35 bg-[#0E7490]/10 hover:bg-[#0E7490]/15 text-[11px] font-semibold text-[#0E7490] dark:text-cyan-300 cursor-pointer whitespace-nowrap"
                                >
                                  <ArrowLeftRight className="w-3 h-3 shrink-0" />
                                  <span>
                                    {st.direction === "dose_to_rate"
                                      ? t(lang, "Dose → mL/h", "Liều → mL/h")
                                      : t(lang, "mL/h → Dose", "mL/h → Liều")}
                                  </span>
                                </button>

                                {spec.supportsFixedMcgMin && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateDrugState(id, {
                                        unitMode:
                                          st.unitMode === "mcg_kg_min"
                                            ? "mcg_min"
                                            : "mcg_kg_min",
                                      })
                                    }
                                    title={t(lang, "Switch dose unit", "Đổi đơn vị liều")}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-2.5 h-10 lg:h-9 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-subtle)] text-[11px] font-semibold text-[var(--text-ink)] cursor-pointer whitespace-nowrap"
                                  >
                                    <ArrowLeftRight className="w-3 h-3 text-[#0E7490] shrink-0" />
                                    <span>{uLabel}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Result Box inside Card */}
                        <div
                          className={`md:col-span-5 rounded-xl border p-3.5 flex flex-col justify-between h-full min-h-[124px] relative transition-colors ${
                            res.valid
                              ? "border-[#0E7490]/40 bg-[#0E7490]/[0.07] dark:bg-[#0E7490]/15 shadow-2xs"
                              : "border-[#0E7490]/20 bg-[#0E7490]/[0.03]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400">
                              {st.direction === "dose_to_rate"
                                ? t(lang, "Pump Rate", "Tốc độ bơm")
                                : t(lang, "Delivered Dose", "Liều truyền")}
                            </span>
                            {res.titrationTable.length > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenTitrationByDrug((prev) => ({
                                    ...prev,
                                    [id]: !prev[id],
                                  }))
                                }
                                title={t(lang, "Quick Titration Reference", "Bảng tra nhanh chỉnh liều")}
                                aria-label={t(lang, "Quick Titration Reference", "Bảng tra nhanh chỉnh liều")}
                                aria-expanded={Boolean(openTitrationByDrug[id])}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  openTitrationByDrug[id]
                                    ? "bg-[#0E7490] border-[#0E7490] text-white"
                                    : "border-[#0E7490]/25 bg-[var(--bg-surface)] text-[#0E7490] dark:text-cyan-300 hover:border-[#0E7490]/60"
                                }`}
                              >
                                <Table2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {res.valid ? (
                            <div className="mt-2 space-y-1.5">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl sm:text-4xl font-extrabold font-mono-tech tabular-nums text-[#0E7490] dark:text-cyan-300">
                                  {st.direction === "dose_to_rate"
                                    ? res.rateMlHr
                                    : res.dosePrimary}
                                </span>
                                <span className="text-xs font-bold text-[#0E7490]/80 dark:text-cyan-200/80">
                                  {st.direction === "dose_to_rate" ? "mL/h" : uLabel}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono-tech text-[var(--text-secondary)]">
                                <span className="font-semibold text-[var(--text-ink)]">
                                  {st.direction === "dose_to_rate"
                                    ? `= ${res.dosePrimary} ${uLabel}`
                                    : `= ${res.rateMlHr} mL/h`}
                                </span>
                                {res.doseSecondaryLabel && (
                                  <span className="px-2 py-0.5 rounded-md bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300 font-semibold">
                                    {res.doseSecondaryLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="my-auto py-2 text-xs text-[var(--text-muted)]">
                              {t(
                                lang,
                                "Enter dose or mL/h to calculate.",
                                "Nhập liều hoặc mL/giờ để tính."
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Clickable Quick Titration Reference (toggled from result box corner icon) */}
                      {res.titrationTable.length > 0 && openTitrationByDrug[id] && (
                        <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1.5">
                          <div className="flex items-center justify-between text-[10.5px] text-[var(--text-muted)]">
                            <span className="font-bold uppercase tracking-wider">
                              {t(lang, "Quick Titration", "Tra nhanh liều")}
                            </span>
                            <span>
                              {t(lang, "Titrate", "Chỉnh")}:{" "}
                              {t(lang, spec.titrationIntervalEn, spec.titrationIntervalVi)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                            {res.titrationTable.map((row) => (
                              <button
                                key={row.dose}
                                type="button"
                                onClick={() =>
                                  updateDrugState(id, {
                                    direction: "dose_to_rate",
                                    doseDraft: String(row.dose),
                                  })
                                }
                                className="text-left px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:border-[#0E7490] transition-colors cursor-pointer"
                              >
                                <div className="text-[10.5px] font-mono-tech text-[var(--text-muted)]">
                                  {row.dose} {uLabel}
                                </div>
                                <div className="text-xs font-extrabold font-mono-tech text-[#0E7490] dark:text-cyan-400">
                                  {row.rateMlHr ?? "—"} <span className="text-[10px] font-normal">mL/h</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Per-Drug Alerts */}
                      {res.alerts.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[var(--border-hairline)]">
                          {res.alerts.map((al, i) => (
                            <div
                              key={i}
                              className={`rounded-r-xl border px-3 py-2 text-xs ${severityBannerClass(
                                al.severity
                              )}`}
                            >
                              <div className="font-bold text-[var(--text-ink)]">
                                {t(lang, al.titleEn, al.titleVi)}
                              </div>
                              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                {t(lang, al.detailEn, al.detailVi)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* AUTO-COMPUTED NEE & VIS SUMMARY CARD */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#0E7490]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {t(lang, "Auto-Calculated NEE & VIS", "Chỉ số NEE & VIS (Tự động tính)")}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10.5px] ${
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
                    {neeVisResult.hasAnyActive && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("wean")}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/20 cursor-pointer"
                      >
                        {t(lang, "Titrate / Wean →", "Chỉnh / Cai →")}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#0E7490]/30 bg-[#0E7490]/[0.06] dark:bg-[#0E7490]/12 p-3.5">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400">
                      Norepinephrine Equivalent (NEE · Kotani 2023)
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono-tech tabular-nums text-[#0E7490] dark:text-cyan-300">
                        {neeVisResult.nee}
                      </span>
                      <span className="text-xs font-mono-tech text-[#0E7490]/80 dark:text-cyan-200/80">
                        mcg/kg/min
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/[0.06] dark:bg-indigo-500/12 p-3.5">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      Vasoactive-Inotropic Score (VIS · Gaies 2010)
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold font-mono-tech tabular-nums text-indigo-700 dark:text-indigo-300">
                        {neeVisResult.vis ?? "—"}
                      </span>
                      <span className="text-xs font-semibold text-indigo-600/80 dark:text-indigo-200/80">
                        {neeVisResult.visMissingWeightForVaso
                          ? t(lang, "Partial (need weight)", "Thiếu cân nặng")
                          : neeVisResult.visTier}
                      </span>
                    </div>
                  </div>
                </div>

                {neeVisResult.contributions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {neeVisResult.contributions.map((c) => (
                      <span
                        key={c.drugId}
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono-tech bg-[var(--bg-paper)] rounded-lg px-2.5 py-1 border border-[var(--border-hairline)]"
                      >
                        <strong className="text-[var(--text-ink)]">
                          {VASOPRESSOR_CATALOG[c.drugId].shortLabel}
                        </strong>
                        <span className="text-[var(--text-muted)]">
                          ({c.dose} {c.unitLabel})
                        </span>
                        <span className="text-[#0E7490] dark:text-cyan-400">
                          NEE +{c.neeContribution} · VIS +{c.visContribution ?? "?"}
                        </span>
                      </span>
                    ))}
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
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-bold text-[var(--text-ink)]">
                            {t(lang, al.titleEn, al.titleVi)}
                          </div>
                          {al.titleEn.includes("Vasopressin") && !dripStates.vasopressin.enabled && (
                            <button
                              type="button"
                              onClick={() =>
                                updateDrugState("vasopressin", {
                                  enabled: true,
                                  doseDraft: "0.03",
                                  direction: "dose_to_rate",
                                })
                              }
                              className="px-2 py-0.5 rounded-md bg-[#0E7490] text-white text-[10.5px] font-bold shrink-0 cursor-pointer hover:opacity-90"
                            >
                              {t(lang, "+ Add Vasopressin", "+ Thêm Vasopressin")}
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                          {t(lang, al.detailEn, al.detailVi)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3 OUTPUT: ACTIVE TITRATION & WEANING COACH */}
          {activeTab === "wean" && (
            <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-[#0E7490]" />
                  <h4 className="text-sm font-bold text-[var(--text-ink)]">
                    {t(
                      lang,
                      "Clinical Decision & Titration Plan",
                      "Quyết định lâm sàng & Chỉnh liều vận mạch"
                    )}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  {weaningResult.nee > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-ink)] text-xs font-mono-tech font-bold">
                      NEE {weaningResult.nee}
                    </span>
                  )}
                  {weaningResult.computedCpp !== null && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300 text-xs font-mono-tech font-bold">
                      CPP {weaningResult.computedCpp} mmHg
                    </span>
                  )}
                </div>
              </div>

              {/* Primary Clinical Action Verdict */}
              <div
                className={`rounded-r-xl border px-3.5 py-3 text-xs space-y-2 ${severityBannerClass(
                  weaningResult.actionVerdict === "escalate"
                    ? "danger"
                    : weaningResult.actionVerdict === "wean"
                    ? "ok"
                    : weaningResult.actionVerdict === "caution_wean"
                    ? "warning"
                    : "info"
                )}`}
              >
                <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-ink)]">
                  {weaningResult.actionVerdict === "escalate" ? (
                    <TrendingUp className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : weaningResult.actionVerdict === "wean" ? (
                    <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : weaningResult.actionVerdict === "caution_wean" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : (
                    <Pause className="w-4 h-4 text-[#0E7490] dark:text-cyan-400 shrink-0" />
                  )}
                  <span>
                    {t(lang, weaningResult.verdictTitleEn, weaningResult.verdictTitleVi)}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  {t(lang, weaningResult.verdictSummaryEn, weaningResult.verdictSummaryVi)}
                </p>

                <ul className="pt-1.5 border-t border-[var(--border-hairline)]/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {weaningResult.checklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11.5px]">
                      {item.passed ? (
                        <CheckCircle2
                          className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <AlertTriangle
                          className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-[var(--text-secondary)]">
                        {t(lang, item.labelEn, item.labelVi)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Add / Remove / Switch Medication Recommendations */}
              {weaningResult.regimenChanges.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t(lang, "Regimen Changes (Add / Remove / Switch)", "Thay đổi phác đồ (Thêm / Bỏ / Đổi thuốc)")}
                  </div>
                  {weaningResult.regimenChanges.map((chg, idx) => (
                    <div
                      key={idx}
                      className={`rounded-r-xl border px-3.5 py-2.5 text-xs ${severityBannerClass(
                        chg.severity
                      )}`}
                    >
                      <div className="flex items-center gap-2 font-bold text-[var(--text-ink)]">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tech uppercase ${
                            chg.kind === "add"
                              ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                              : chg.kind === "remove"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          {chg.kind === "add"
                            ? t(lang, "+ ADD", "+ THÊM")
                            : chg.kind === "remove"
                            ? t(lang, "− STOP", "− NGƯNG")
                            : t(lang, "⇄ SWITCH", "⇄ ĐỔI")}
                        </span>
                        <span>{t(lang, chg.titleEn, chg.titleVi)}</span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                        {t(lang, chg.detailEn, chg.detailVi)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Agent-by-Agent Action Plan */}
              {weaningResult.agentActions.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t(lang, "Agent-by-Agent Action Plan", "Hướng dẫn xử trí từng thuốc")}
                  </div>
                  {weaningResult.agentActions.map((act) => {
                    const badge = agentActionBadge(act.action, lang);
                    const spec = VASOPRESSOR_CATALOG[act.drugId];
                    return (
                      <div
                        key={act.drugId}
                        className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3 space-y-1.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono-tech font-bold px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-ink)]">
                              {act.priority}. {spec.shortLabel} ({act.currentDose} {act.unitLabel})
                            </span>
                            <span className="text-xs sm:text-sm font-bold text-[var(--text-ink)]">
                              {t(lang, act.titleEn, act.titleVi)}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#0E7490] dark:text-cyan-400">
                          {t(lang, act.instructionEn, act.instructionVi)}
                        </div>
                        <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">
                          {t(lang, act.rationaleEn, act.rationaleVi)}
                        </p>
                      </div>
                    );
                  })}
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

      {/* STICKY MOBILE SUMMARY BAR */}
      {(neeVisResult.hasAnyActive || activeTab === "wean") && (
        <div className="lg:hidden sticky bottom-2 z-30 print:hidden">
          <button
            type="button"
            onClick={() => {
              document
                .getElementById("vaso-results")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="w-full rounded-2xl border border-[#0E7490]/35 bg-[var(--bg-surface)]/95 backdrop-blur-md px-3.5 py-2.5 shadow-lg flex items-center justify-between gap-2 text-left cursor-pointer"
          >
            {activeTab === "infusion" ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300 text-[11px] font-mono-tech font-bold shrink-0">
                    NEE {neeVisResult.nee}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-ink)] truncate">
                    VIS {neeVisResult.vis ?? "—"} · {neeVisResult.shockTier}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#0E7490] dark:text-cyan-300 shrink-0">
                  {t(lang, "View ↓", "Xem ↓")}
                </span>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300 text-[11px] font-mono-tech font-bold shrink-0">
                    NEE {weaningResult.nee}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-ink)] truncate">
                    {t(lang, weaningResult.verdictTitleEn, weaningResult.verdictTitleVi)}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#0E7490] dark:text-cyan-300 shrink-0">
                  {t(lang, "Plan ↓", "Phác đồ ↓")}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* MODAL: INFUSION SAFETY, COMPATIBILITY & EXTRAVASATION PROTOCOL */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] sm:max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-2xl space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--border-hairline)]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#0E7490]" />
                <h3 className="text-base font-bold text-[var(--text-ink)]">
                  {t(
                    lang,
                    "Infusion Safety, Compatibility & Extravasation Protocol",
                    "An toàn Đường truyền, Tương kỵ & Xử trí Thoát mạch"
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

            {/* Section 1: IV Access Rules */}
            <section className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {t(lang, "1. Venous Access & Line Safety", "1. Nguyên tắc Đường truyền tĩnh mạch")}
              </h4>
              <ul className="space-y-1 text-xs text-[var(--text-secondary)] list-disc pl-5 leading-relaxed">
                <li>
                  <strong className="text-[var(--text-ink)]">
                    {t(lang, "Central Venous Catheter (CVC):", "Đường truyền trung tâm (CVC):")}
                  </strong>{" "}
                  {t(
                    lang,
                    "Preferred for all concentrated 50 mL syringe infusions and mandatory for Vasopressin.",
                    "Ưu tiên cho mọi bơm tiêm điện đậm đặc 50 mL và bắt buộc đối với Vasopressin."
                  )}
                </li>
                <li>
                  <strong className="text-[var(--text-ink)]">
                    {t(lang, "Peripheral IV (PIV) Bridge:", "Đường truyền ngoại biên (PIV) tạm thời:")}
                  </strong>{" "}
                  {t(
                    lang,
                    "SSC 2026: Start vasopressors peripherally rather than delaying for CVC. Use ≥18–20G catheter in/proximal to the antecubital fossa, diluted 250 mL bags (≤ max PIV conc), inspect q1–2h, and transition to CVC when practical.",
                    "SSC 2026: Khởi trị vận mạch qua PIV ngay thay vì trì hoãn chờ đặt CVC. Đặt kim ≥18–20G từ nếp khuỷu trở lên, dùng túi pha loãng 250 mL (≤ nồng độ PIV tối đa), kiểm tra mỗi 1–2 giờ và chuyển CVC khi thuận lợi."
                  )}
                </li>
              </ul>
            </section>

            {/* Section 2: Diluent & Y-Site Compatibility */}
            <section className="space-y-2 pt-3 border-t border-[var(--border-hairline)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {t(
                  lang,
                  "2. Diluents & Y-Site Compatibility",
                  "2. Dung môi pha & Tương kỵ chạc Y"
                )}
              </h4>
              <div className="divide-y divide-[var(--border-hairline)] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)]">
                {VASOPRESSOR_ORDER.map((id) => {
                  const spec = VASOPRESSOR_CATALOG[id];
                  const isActive = dripStates[id].enabled;
                  return (
                    <div key={id} className="p-3 space-y-1 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--text-ink)]">
                            {t(lang, spec.nameEn, spec.nameVi)}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.5 rounded bg-[#0E7490]/15 text-[#0E7490] dark:text-cyan-300 text-[10px] font-bold">
                              {t(lang, "Active", "Đang chọn")}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono-tech text-[var(--text-muted)]">
                          {spec.pivSafe
                            ? `PIV ≤ ${spec.maxPivConcMcgPerMl} mcg/mL`
                            : t(lang, "CVC Only", "Chỉ truyền CVC")}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-ink)]">
                          {t(lang, "Diluent:", "Dung môi:")}
                        </strong>{" "}
                        {t(lang, spec.preferredDiluentEn, spec.preferredDiluentVi)}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-secondary)]">
                        <strong className="text-[var(--text-ink)]">
                          {t(lang, "Y-site:", "Tương kỵ chạc Y:")}
                        </strong>{" "}
                        {t(lang, spec.ySiteIncompatibleEn, spec.ySiteIncompatibleVi)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Section 3: Extravasation Rescue Protocol */}
            <section className="space-y-3 pt-3 border-t border-[var(--border-hairline)]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {t(
                  lang,
                  "3. Extravasation Rescue Protocol",
                  "3. Xử trí cấp cứu Thoát mạch"
                )}
              </h4>
              <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[var(--text-ink)] leading-relaxed">
                {(lang === "vi"
                  ? EXTRAVASATION_STEPS.immediateVi
                  : EXTRAVASATION_STEPS.immediateEn
                ).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>

              <div className="space-y-2 text-xs leading-relaxed">
                <div className="rounded-r-xl border-l-4 border-l-[#0E7490] border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3.5 py-2.5">
                  <div className="font-bold text-[#0E7490] dark:text-cyan-400">
                    {t(
                      lang,
                      "Catecholamine Antidote (Phentolamine / Fallback)",
                      "Thuốc giải độc Catecholamin (Phentolamine / Thay thế)"
                    )}
                  </div>
                  <p className="mt-0.5 text-[var(--text-secondary)]">
                    {t(lang, EXTRAVASATION_STEPS.antidoteEn, EXTRAVASATION_STEPS.antidoteVi)}
                  </p>
                </div>

                <div className="rounded-r-xl border-l-4 border-l-rose-600 border border-[var(--border-hairline)] bg-rose-500/8 px-3.5 py-2.5 text-rose-900 dark:text-rose-200">
                  {t(
                    lang,
                    EXTRAVASATION_STEPS.vasopressinWarningEn,
                    EXTRAVASATION_STEPS.vasopressinWarningVi
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* MODAL: FORMULAS & REFERENCES */}
      {showRefsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] sm:max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 sm:p-5 shadow-2xl space-y-4">
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
