"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  BookmarkPlus,
  Calculator,
  Check,
  CheckCheck,
  Clock,
  Copy,
  Droplets,
  Flame,
  Hourglass,
  Moon,
  Printer,
  RotateCcw,
  ShieldAlert,
  Sun,
  Syringe,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import {
  INSULIN_UI_TEXT,
  TIMEPOINT_CONFIGS,
  type ClinicalSeverity,
  type GlucoseUnit,
  type InsulinLang,
  type InsulinMode,
  type InsulinTimepoint,
  type SyndromeLock,
  type UreaUnit,
  t,
} from "@/lib/neurocalc/tools/insulinI18n";
import {
  computeAutoElapsedHours,
  createDefaultInsulinInputs,
  evaluateInsulinTool,
  formatEmrSummary,
  getEffectiveTddAndIsf,
  getParameterVisualStates,
  type DetailSection,
  type InsulinInputs,
  type ShiftSnapshot,
} from "@/lib/neurocalc/tools/insulinEngine";

interface InsulinTitrationToolProps {
  onBack: () => void;
}

function severityPillClass(tone: ClinicalSeverity): string {
  switch (tone) {
    case "danger":
      return "bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "warning":
      return "bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/30";
    case "ok":
      return "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    default:
      return "bg-[#0E7490]/10 text-[#0E7490] dark:text-cyan-300 border-[#0E7490]/25";
  }
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

interface CompactNumericRowProps {
  id: string;
  label: string;
  value: string;
  onChange: (raw: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  unitLabel: string;
  onToggleUnit?: () => void;
  step?: string;
  min?: number;
  max?: number;
  pill?: { tone: ClinicalSeverity; label: string };
  extraBadge?: string | null;
  disabled?: boolean;
}

function CompactNumericRow({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  unitLabel,
  onToggleUnit,
  step = "any",
  min,
  max,
  pill,
  extraBadge,
  disabled = false,
}: CompactNumericRowProps) {
  return (
    <div
      className={`px-3.5 py-2 sm:px-4 transition-opacity ${
        disabled ? "opacity-45 pointer-events-none" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1 flex items-center gap-1.5 flex-wrap">
          <label
            htmlFor={id}
            className="text-xs sm:text-[13px] font-medium text-[var(--text-ink)] leading-snug cursor-pointer"
          >
            {label}
          </label>
          {pill && (
            <span
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${severityPillClass(
                pill.tone
              )}`}
            >
              {pill.label}
            </span>
          )}
          {extraBadge && (
            <span className="inline-flex items-center rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
              {extraBadge}
            </span>
          )}
        </div>

        <div className="w-[152px] sm:w-[184px] shrink-0 flex items-stretch h-10 sm:h-8.5 rounded-lg border border-[var(--border-hairline)] overflow-hidden bg-[var(--bg-paper)] focus-within:border-[#0E7490] focus-within:ring-2 focus-within:ring-[#0E7490]/20 transition-colors">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step={step}
            min={min}
            max={max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            className="min-w-0 flex-1 bg-transparent px-2.5 text-sm font-mono-tech font-medium text-[var(--text-ink)] placeholder:text-[13px] placeholder:text-[var(--text-muted)]/55 placeholder:font-normal focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 flex items-stretch shrink-0">
            {onToggleUnit ? (
              <button
                type="button"
                onClick={onToggleUnit}
                title="Switch unit"
                className="px-2 flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-ink)] whitespace-nowrap transition-colors"
              >
                <span>{unitLabel}</span>
                <ArrowLeftRight className="w-3 h-3 text-[var(--text-muted)]" />
              </button>
            ) : (
              <span className="px-2 flex items-center text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap">
                {unitLabel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailSectionBlock({ section }: { section: DetailSection }) {
  return (
    <div className="space-y-2">
      <div
        className={`rounded-r-xl border px-3.5 py-2.5 ${severityBannerClass(
          section.tone
        )}`}
      >
        <p className="text-[13px] font-semibold text-[var(--text-ink)] leading-relaxed">
          {section.primaryText}
        </p>
      </div>

      {section.bullets.length > 0 && (
        <ul className="space-y-1 pl-1 text-xs text-[var(--text-secondary)] leading-relaxed">
          {section.bullets.map((bullet, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-[var(--text-muted)] mt-0.5">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {section.detailSteps && section.detailSteps.length > 0 && (
        <details className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/55 px-3 py-2 text-xs text-[var(--text-secondary)]">
          <summary className="font-semibold text-[#0E7490] dark:text-cyan-400 cursor-pointer select-none flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 shrink-0" />
            <span>{section.detailsTitle}</span>
          </summary>
          <ul className="mt-2 pt-2 border-t border-[var(--border-hairline)] space-y-1 leading-relaxed">
            {section.detailSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[var(--text-muted)]">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function parseOptionalNum(
  raw: string,
  min: number,
  max: number
): number | null {
  if (raw.trim() === "") return null;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}

export function InsulinTitrationTool({ onBack }: InsulinTitrationToolProps) {
  const [lang, setLang] = useState<InsulinLang>("en");
  const [inputs, setInputs] = useState<InsulinInputs>(
    createDefaultInsulinInputs
  );
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Bidirectional unit preferences & string drafts (all numeric inputs start empty)
  const [bgUnit, setBgUnit] = useState<GlucoseUnit>("mgdl");
  const [bgDraft, setBgDraft] = useState<string>("");
  const [ureaUnit, setUreaUnit] = useState<UreaUnit>("mmol");
  const [ureaDraft, setUreaDraft] = useState<string>("");
  const [weightDraft, setWeightDraft] = useState<string>("");
  const [mornDraft, setMornDraft] = useState<string>("");
  const [eveDraft, setEveDraft] = useState<string>("");
  const [kDraft, setKDraft] = useState<string>("");
  const [naDraft, setNaDraft] = useState<string>("");
  const [phDraft, setPhDraft] = useState<string>("");
  const [hco3Draft, setHco3Draft] = useState<string>("");
  const [ketoneDraft, setKetoneDraft] = useState<string>("");

  // Strictly in-memory shift log (zero localStorage / IndexedDB)
  const [snapshots, setSnapshots] = useState<ShiftSnapshot[]>([]);
  const [actualNovomix, setActualNovomix] = useState<string>("");
  const [actualActrapid, setActualActrapid] = useState<string>("");
  const [actualIvRate, setActualIvRate] = useState<string>("");
  const [manualDelta, setManualDelta] = useState<string | null>(null);
  const [copiedEmr, setCopiedEmr] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const outputSectionRef = useRef<HTMLElement | null>(null);

  const parsedBgMgDl = useMemo(() => {
    if (bgDraft.trim() === "") return null;
    const raw = parseFloat(bgDraft);
    if (Number.isNaN(raw)) return null;
    const mgdl = bgUnit === "mmol" ? Math.round(raw * 18.0) : Math.round(raw);
    return Math.max(10, Math.min(1500, mgdl));
  }, [bgDraft, bgUnit]);

  const parsedWeight = useMemo(
    () => parseOptionalNum(weightDraft, 20, 250),
    [weightDraft]
  );
  const parsedDoseMorn = useMemo(
    () => parseOptionalNum(mornDraft, 0, 200),
    [mornDraft]
  );
  const parsedDoseEve = useMemo(
    () => parseOptionalNum(eveDraft, 0, 200),
    [eveDraft]
  );
  const parsedK = useMemo(
    () => parseOptionalNum(kDraft, 1.0, 10.0),
    [kDraft]
  );
  const parsedNa = useMemo(
    () => parseOptionalNum(naDraft, 90, 210),
    [naDraft]
  );
  const parsedUreaMmol = useMemo(() => {
    if (ureaDraft.trim() === "") return null;
    const raw = parseFloat(ureaDraft);
    if (Number.isNaN(raw)) return null;
    const mmol = ureaUnit === "bun_mgdl" ? raw / 2.8 : raw;
    return Math.max(0.5, Math.min(100, mmol));
  }, [ureaDraft, ureaUnit]);
  const parsedPh = useMemo(
    () => parseOptionalNum(phDraft, 6.4, 7.8),
    [phDraft]
  );
  const parsedHco3 = useMemo(
    () => parseOptionalNum(hco3Draft, 1.0, 50.0),
    [hco3Draft]
  );
  const parsedKetone = useMemo(
    () => parseOptionalNum(ketoneDraft, 0.0, 20.0),
    [ketoneDraft]
  );

  const missingRequiredLabels = useMemo(() => {
    const missing: string[] = [];
    if (parsedBgMgDl === null) missing.push(INSULIN_UI_TEXT.bgLabel[lang]);

    if (inputs.mode === "dka") {
      if (parsedWeight === null) missing.push(INSULIN_UI_TEXT.weightLabel[lang]);
      if (parsedK === null) missing.push(INSULIN_UI_TEXT.kLabel[lang]);
      if (parsedNa === null) missing.push(INSULIN_UI_TEXT.naLabel[lang]);
      if (parsedUreaMmol === null) missing.push(INSULIN_UI_TEXT.ureaLabel[lang]);
      if (parsedPh === null) missing.push(INSULIN_UI_TEXT.phLabel[lang]);
      if (parsedHco3 === null) missing.push(INSULIN_UI_TEXT.hco3Label[lang]);
      if (parsedKetone === null) missing.push(INSULIN_UI_TEXT.ketoneLabel[lang]);
    } else if (inputs.isNaive) {
      if (
        parsedWeight === null &&
        (inputs.tp === "t0" || (parsedBgMgDl ?? 0) >= 250)
      ) {
        missing.push(INSULIN_UI_TEXT.weightLabel[lang]);
      }
    } else {
      if (inputs.mode === "06h" && inputs.tp === "t0") {
        if (parsedDoseMorn === null)
          missing.push(INSULIN_UI_TEXT.doseMornLabel[lang]);
        if (parsedDoseEve === null)
          missing.push(INSULIN_UI_TEXT.doseEveLabel[lang]);
      } else if (inputs.mode === "18h" && inputs.tp === "t0") {
        if (parsedDoseEve === null)
          missing.push(INSULIN_UI_TEXT.doseEveLabel[lang]);
      }
    }
    return missing;
  }, [
    inputs.mode,
    inputs.tp,
    inputs.isNaive,
    parsedBgMgDl,
    parsedWeight,
    parsedDoseMorn,
    parsedDoseEve,
    parsedK,
    parsedNa,
    parsedUreaMmol,
    parsedPh,
    parsedHco3,
    parsedKetone,
    lang,
  ]);

  const resolvedInputs = useMemo<InsulinInputs | null>(() => {
    if (missingRequiredLabels.length > 0 || parsedBgMgDl === null) {
      return null;
    }
    return {
      ...inputs,
      bgMgDl: parsedBgMgDl,
      weight: parsedWeight ?? 60,
      doseMorn: parsedDoseMorn ?? 0,
      doseEve: parsedDoseEve ?? 0,
      k: parsedK ?? 4.0,
      na: parsedNa ?? 135,
      ureaMmol: parsedUreaMmol ?? 5.0,
      ph: parsedPh ?? 7.4,
      hco3: parsedHco3 ?? 24.0,
      ketone: parsedKetone ?? 0.2,
    };
  }, [
    inputs,
    missingRequiredLabels.length,
    parsedBgMgDl,
    parsedWeight,
    parsedDoseMorn,
    parsedDoseEve,
    parsedK,
    parsedNa,
    parsedUreaMmol,
    parsedPh,
    parsedHco3,
    parsedKetone,
  ]);

  const handleConfirmParameters = () => {
    if (missingRequiredLabels.length > 0) return;
    setIsConfirmed(true);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      window.requestAnimationFrame(() => {
        outputSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  };

  useEffect(() => {
    if (!showSafetyModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSafetyModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSafetyModal]);

  const autoDelta = useMemo(
    () => computeAutoElapsedHours(inputs.mode, inputs.tp, snapshots, lang),
    [inputs.mode, inputs.tp, snapshots, lang]
  );

  const effectiveDeltaHours = useMemo(() => {
    if (manualDelta !== null) {
      const parsed = parseFloat(manualDelta);
      if (!Number.isNaN(parsed)) {
        return Math.max(0.25, Math.min(24, parsed));
      }
    }
    return autoDelta.deltaHours;
  }, [manualDelta, autoDelta.deltaHours]);

  const deltaDisplayValue =
    manualDelta !== null ? manualDelta : String(autoDelta.deltaHours);
  const deltaHint =
    manualDelta !== null
      ? t(
          lang,
          `Manual Δt override: ${effectiveDeltaHours}h.`,
          `Đang dùng Δt chỉnh tay: ${effectiveDeltaHours} giờ.`
        )
      : autoDelta.hint;

  const visualInputs = useMemo<InsulinInputs>(
    () => ({
      ...inputs,
      bgMgDl: parsedBgMgDl ?? 100,
      k: parsedK ?? 4.0,
      na: parsedNa ?? 140,
      ureaMmol: parsedUreaMmol ?? 5.0,
      ph: parsedPh ?? 7.4,
      hco3: parsedHco3 ?? 24.0,
      ketone: parsedKetone ?? 0.2,
    }),
    [
      inputs,
      parsedBgMgDl,
      parsedK,
      parsedNa,
      parsedUreaMmol,
      parsedPh,
      parsedHco3,
      parsedKetone,
    ]
  );

  const paramStates = useMemo(
    () => getParameterVisualStates(visualInputs, lang),
    [visualInputs, lang]
  );

  const tddInfo = useMemo(() => {
    if (inputs.isNaive) {
      if (parsedWeight === null) return null;
      return getEffectiveTddAndIsf({
        ...inputs,
        weight: parsedWeight,
      });
    }
    if (parsedDoseMorn === null && parsedDoseEve === null) return null;
    return getEffectiveTddAndIsf({
      ...inputs,
      doseMorn: parsedDoseMorn ?? 0,
      doseEve: parsedDoseEve ?? 0,
    });
  }, [inputs, parsedWeight, parsedDoseMorn, parsedDoseEve]);

  const evaluation = useMemo(
    () =>
      resolvedInputs
        ? evaluateInsulinTool(resolvedInputs, snapshots, effectiveDeltaHours, lang)
        : null,
    [resolvedInputs, snapshots, effectiveDeltaHours, lang]
  );

  const timepoints = TIMEPOINT_CONFIGS[inputs.mode];
  const currentTpConfig =
    timepoints.find((item) => item.id === inputs.tp) ?? timepoints[0];

  const handleBgChange = (raw: string) => {
    setBgDraft(raw);
    const num = parseFloat(raw);
    if (!Number.isNaN(num)) {
      const mgdl =
        bgUnit === "mmol" ? Math.round(num * 18.0) : Math.round(num);
      const clamped = Math.max(10, Math.min(1500, mgdl));
      setInputs((prev) => ({ ...prev, bgMgDl: clamped }));
    }
  };

  const normalizeBgDraft = () => {
    if (parsedBgMgDl === null) {
      setBgDraft("");
      return;
    }
    if (bgUnit === "mmol") {
      setBgDraft((parsedBgMgDl / 18.0).toFixed(1));
    } else {
      setBgDraft(String(parsedBgMgDl));
    }
  };

  const toggleBgUnit = () => {
    if (bgUnit === "mgdl") {
      setBgUnit("mmol");
      if (parsedBgMgDl !== null) {
        setBgDraft((parsedBgMgDl / 18.0).toFixed(1));
      }
    } else {
      setBgUnit("mgdl");
      if (parsedBgMgDl !== null) {
        setBgDraft(String(parsedBgMgDl));
      }
    }
  };

  const handleUreaChange = (raw: string) => {
    setUreaDraft(raw);
    const num = parseFloat(raw);
    if (!Number.isNaN(num)) {
      const mmol = ureaUnit === "bun_mgdl" ? num / 2.8 : num;
      const clamped = Math.max(0.5, Math.min(100, mmol));
      setInputs((prev) => ({ ...prev, ureaMmol: clamped }));
    }
  };

  const normalizeUreaDraft = () => {
    if (parsedUreaMmol === null) {
      setUreaDraft("");
      return;
    }
    if (ureaUnit === "bun_mgdl") {
      setUreaDraft(String(Math.round(parsedUreaMmol * 2.8)));
    } else {
      setUreaDraft(parsedUreaMmol.toFixed(1));
    }
  };

  const toggleUreaUnit = () => {
    if (ureaUnit === "mmol") {
      setUreaUnit("bun_mgdl");
      if (parsedUreaMmol !== null) {
        setUreaDraft(String(Math.round(parsedUreaMmol * 2.8)));
      }
    } else {
      setUreaUnit("mmol");
      if (parsedUreaMmol !== null) {
        setUreaDraft(parsedUreaMmol.toFixed(1));
      }
    }
  };

  const handleNumericField = (
    raw: string,
    setDraft: (v: string) => void,
    key: keyof InsulinInputs,
    min: number,
    max: number
  ) => {
    setDraft(raw);
    const num = parseFloat(raw);
    if (!Number.isNaN(num)) {
      const clamped = Math.max(min, Math.min(max, num));
      setInputs((prev) => ({ ...prev, [key]: clamped }));
    }
  };

  const normalizeField = (
    raw: string,
    setDraft: (v: string) => void,
    parsedValue: number | null,
    decimals?: number
  ) => {
    if (raw.trim() === "" || parsedValue === null) {
      setDraft("");
      return;
    }
    setDraft(
      typeof decimals === "number"
        ? parsedValue.toFixed(decimals)
        : String(parsedValue)
    );
  };

  const handleSwitchMode = (nextMode: InsulinMode) => {
    setManualDelta(null);
    setInputs((prev) => ({
      ...prev,
      mode: nextMode,
      tp: "t0",
    }));
  };

  const handleSelectTimepoint = (nextTp: InsulinTimepoint) => {
    setManualDelta(null);
    setInputs((prev) => {
      let nextLocked: SyndromeLock = prev.lockedSyndrome;
      if (prev.mode === "dka") {
        if (nextTp === "t0") {
          nextLocked = "auto";
        } else if (
          prev.tp === "t0" &&
          evaluation &&
          evaluation.kind === "dka" &&
          evaluation.classifiedSyndrome !== "NON_DKA"
        ) {
          nextLocked = evaluation.classifiedSyndrome;
        }
      }
      return {
        ...prev,
        tp: nextTp,
        lockedSyndrome: nextLocked,
      };
    });
  };

  const handleResetCase = () => {
    const def = createDefaultInsulinInputs();
    setInputs(def);
    setIsConfirmed(false);
    setBgUnit("mgdl");
    setBgDraft("");
    setUreaUnit("mmol");
    setUreaDraft("");
    setWeightDraft("");
    setMornDraft("");
    setEveDraft("");
    setKDraft("");
    setNaDraft("");
    setPhDraft("");
    setHco3Draft("");
    setKetoneDraft("");
    setSnapshots([]);
    setActualNovomix("");
    setActualActrapid("");
    setActualIvRate("");
    setManualDelta(null);
  };

  const handleFillSuggested = () => {
    if (!evaluation) return;
    if (!isConfirmed) setIsConfirmed(true);
    if (evaluation.kind === "dka") {
      setActualIvRate(String(evaluation.suggestedIvRate || 0));
    } else {
      setActualNovomix(String(evaluation.suggestedNovomix || 0));
      setActualActrapid(String(evaluation.suggestedActrapid || 0));
    }
  };

  const handleSaveSnapshot = () => {
    if (!resolvedInputs || !evaluation) return;
    if (!isConfirmed) setIsConfirmed(true);

    let novomix = Math.max(0, Math.min(200, parseFloat(actualNovomix) || 0));
    let actrapid = Math.max(0, Math.min(100, parseFloat(actualActrapid) || 0));
    let ivRate = Math.max(0, Math.min(50, parseFloat(actualIvRate) || 0));

    if (
      resolvedInputs.mode !== "dka" &&
      novomix === 0 &&
      actrapid === 0 &&
      evaluation.kind === "inpatient" &&
      (evaluation.suggestedNovomix > 0 || evaluation.suggestedActrapid > 0)
    ) {
      novomix = evaluation.suggestedNovomix;
      actrapid = evaluation.suggestedActrapid;
      setActualNovomix(String(novomix));
      setActualActrapid(String(actrapid));
    } else if (
      resolvedInputs.mode === "dka" &&
      ivRate === 0 &&
      evaluation.kind === "dka" &&
      evaluation.suggestedIvRate > 0
    ) {
      ivRate = evaluation.suggestedIvRate;
      setActualIvRate(String(ivRate));
    }

    const osmTotal =
      2 * resolvedInputs.na +
      resolvedInputs.bgMgDl / 18.0 +
      resolvedInputs.ureaMmol;

    const entry: ShiftSnapshot = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timeLabel: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      mode: resolvedInputs.mode,
      tp: resolvedInputs.tp,
      shortTime: currentTpConfig.shortTime,
      tpLabel: lang === "vi" ? currentTpConfig.labelVi : currentTpConfig.labelEn,
      clockHour: currentTpConfig.clockHour,
      dkaHour: currentTpConfig.dkaHour,
      bgMgDl: resolvedInputs.bgMgDl,
      novomix,
      actrapid,
      ivRate,
      ketone: resolvedInputs.mode === "dka" ? resolvedInputs.ketone : null,
      osmTotal: resolvedInputs.mode === "dka" ? osmTotal : null,
    };

    setSnapshots((prev) => [entry, ...prev].slice(0, 20));
    setManualDelta(null);
  };

  const handleCopyEmr = async () => {
    if (!isConfirmed || !resolvedInputs || !evaluation) return;
    const text = formatEmrSummary(resolvedInputs, evaluation, lang);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setCopiedEmr(true);
      window.setTimeout(() => setCopiedEmr(false), 2000);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Compact Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {INSULIN_UI_TEXT.backToTools[lang]}
            </span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-ink)] tracking-tight truncate">
              {INSULIN_UI_TEXT.toolTitle[lang]}
            </h2>
            <span className="hidden sm:inline-flex shrink-0 rounded-md bg-[#0E7490]/12 border border-[#0E7490]/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-300">
              {INSULIN_UI_TEXT.toolBadge[lang]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Bilingual Toggle EN | VI (Default EN) */}
          <div
            role="group"
            aria-label="Language toggle"
            className="inline-flex rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0.5"
          >
            {(["en", "vi"] as const).map((code) => {
              const active = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors ${
                    active
                      ? "bg-[#0E7490] text-white"
                      : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleResetCase}
            aria-label={INSULIN_UI_TEXT.resetCase[lang]}
            title={INSULIN_UI_TEXT.resetCase[lang]}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {INSULIN_UI_TEXT.resetCase[lang]}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSafetyModal(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-amber-500/35 bg-amber-500/8 px-2.5 py-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">
              {INSULIN_UI_TEXT.safetyBtn[lang]}
            </span>
          </button>
        </div>
      </div>

      {/* Sleek Single-Bar Mode & Checkpoint Switcher */}
      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-1.5 sm:p-2 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 print:hidden">
        <div className="grid grid-cols-3 lg:inline-flex rounded-xl bg-[var(--bg-subtle)]/75 p-1 gap-1">
          {(
            [
              { id: "06h", Icon: Sun },
              { id: "18h", Icon: Moon },
              { id: "dka", Icon: AlertTriangle },
            ] as const
          ).map(({ id, Icon }) => {
            const active = inputs.mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSwitchMode(id)}
                className={`inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? "bg-[#0E7490] text-white shadow-2xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-paper)]/60"
                }`}
              >
                <Icon className="hidden sm:inline w-3.5 h-3.5 shrink-0" />
                <span>{INSULIN_UI_TEXT.modesShort[id][lang]}</span>
              </button>
            );
          })}
        </div>

        <div
          className={`grid ${
            timepoints.length === 3 ? "grid-cols-3" : "grid-cols-4"
          } lg:inline-flex rounded-xl bg-[var(--bg-paper)] border border-[var(--border-hairline)] p-1 gap-1`}
        >
          {timepoints.map((tpItem) => {
            const active = inputs.tp === tpItem.id;
            return (
              <button
                key={tpItem.id}
                type="button"
                onClick={() => handleSelectTimepoint(tpItem.id)}
                className={`px-2 sm:px-3 py-1.5 rounded-lg transition-all text-center flex flex-col xl:flex-row xl:items-center xl:gap-1.5 justify-center ${
                  active
                    ? "bg-[#0E7490]/14 text-[#0E7490] dark:bg-cyan-500/20 dark:text-cyan-300 ring-1 ring-[#0E7490]/35"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-ink)]"
                }`}
              >
                <span className="font-mono-tech font-bold text-[11px] sm:text-xs leading-tight">
                  {tpItem.shortTime}
                </span>
                <span className="text-[10px] opacity-80 leading-tight truncate">
                  {lang === "vi" ? tpItem.subVi : tpItem.subEn}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Workspace (Mobile: Inputs -> Output -> Shift Log) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column Wrapper (transparent on mobile via contents) */}
        <div className="contents lg:block lg:col-span-5 lg:space-y-3.5 print:hidden">
          <div className="order-1 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="px-3.5 py-2.5 sm:px-4 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {INSULIN_UI_TEXT.paramsHeader[lang]}
              </h3>
              {isConfirmed && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>{INSULIN_UI_TEXT.confirmedLive[lang]}</span>
                </span>
              )}
            </div>

            <div className="divide-y divide-[var(--border-hairline)]">
              {/* Glucose */}
              <CompactNumericRow
                id="insulin-bg-input"
                label={INSULIN_UI_TEXT.bgLabel[lang]}
                value={bgDraft}
                onChange={handleBgChange}
                onBlur={normalizeBgDraft}
                placeholder={bgUnit === "mgdl" ? "70–140" : "3.9–7.8"}
                unitLabel={bgUnit === "mgdl" ? "mg/dL" : "mmol/L"}
                onToggleUnit={toggleBgUnit}
                step={bgUnit === "mgdl" ? "1" : "0.1"}
                pill={parsedBgMgDl !== null ? paramStates.bg : undefined}
                extraBadge={
                  parsedBgMgDl !== null && paramStates.isBgHi
                    ? INSULIN_UI_TEXT.bgHiBadge[lang]
                    : null
                }
              />

              {/* Weight */}
              <CompactNumericRow
                id="insulin-weight-input"
                label={INSULIN_UI_TEXT.weightLabel[lang]}
                value={weightDraft}
                onChange={(raw) =>
                  handleNumericField(raw, setWeightDraft, "weight", 20, 250)
                }
                onBlur={() =>
                  normalizeField(weightDraft, setWeightDraft, parsedWeight)
                }
                placeholder="50–70"
                unitLabel="kg"
                step="1"
              />

              {/* Inpatient Regimen Fields */}
              {inputs.mode !== "dka" && (
                <>
                  <div className="px-3.5 py-2 sm:px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs sm:text-[13px] font-medium text-[var(--text-ink)]">
                          {INSULIN_UI_TEXT.naiveLabel[lang]}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {INSULIN_UI_TEXT.naiveHint[lang]}
                        </p>
                      </div>
                      <div className="inline-flex rounded-lg border border-[var(--border-hairline)] overflow-hidden shrink-0">
                        {[false, true].map((val) => {
                          const active = inputs.isNaive === val;
                          return (
                            <button
                              key={String(val)}
                              type="button"
                              onClick={() =>
                                setInputs((prev) => ({
                                  ...prev,
                                  isNaive: val,
                                }))
                              }
                              className={`px-3 py-1 text-xs font-semibold transition-colors ${
                                active
                                  ? "bg-[#0E7490] text-white"
                                  : "bg-[var(--bg-paper)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                              }`}
                            >
                              {val
                                ? t(lang, "Yes", "Có")
                                : t(lang, "No", "Không")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <CompactNumericRow
                    id="insulin-morn-input"
                    label={INSULIN_UI_TEXT.doseMornLabel[lang]}
                    value={mornDraft}
                    onChange={(raw) =>
                      handleNumericField(raw, setMornDraft, "doseMorn", 0, 200)
                    }
                    onBlur={() =>
                      normalizeField(mornDraft, setMornDraft, parsedDoseMorn)
                    }
                    placeholder="0–40"
                    unitLabel="units"
                    step="1"
                    disabled={inputs.isNaive}
                  />

                  <CompactNumericRow
                    id="insulin-eve-input"
                    label={INSULIN_UI_TEXT.doseEveLabel[lang]}
                    value={eveDraft}
                    onChange={(raw) =>
                      handleNumericField(raw, setEveDraft, "doseEve", 0, 200)
                    }
                    onBlur={() =>
                      normalizeField(eveDraft, setEveDraft, parsedDoseEve)
                    }
                    placeholder="0–40"
                    unitLabel="units"
                    step="1"
                    disabled={inputs.isNaive}
                  />

                  <div className="px-3.5 py-2 sm:px-4 bg-[var(--bg-subtle)]/35 flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--text-secondary)]">
                      {INSULIN_UI_TEXT.tddSummaryLabel[lang]}
                    </span>
                    <span className="font-mono-tech font-bold text-[#0E7490] dark:text-cyan-400">
                      {tddInfo
                        ? `${inputs.isNaive ? "~" : ""}${tddInfo.effectiveTdd} u/day · ISF ~${tddInfo.isf} mg/dL/u`
                        : "—"}
                    </span>
                  </div>

                  <label className="px-3.5 py-2 sm:px-4 flex items-start gap-2.5 cursor-pointer hover:bg-[var(--bg-subtle)]/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={inputs.isHighRisk}
                      onChange={(e) =>
                        setInputs((prev) => ({
                          ...prev,
                          isHighRisk: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded accent-[#0E7490]"
                    />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-[13px] font-medium text-[var(--text-ink)]">
                        {INSULIN_UI_TEXT.highRiskLabel[lang]}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {INSULIN_UI_TEXT.highRiskHint[lang]}
                      </p>
                    </div>
                  </label>
                </>
              )}

              {/* DKA / HHS Fields */}
              {inputs.mode === "dka" && (
                <>
                  {inputs.tp !== "t0" && (
                    <div className="px-3.5 py-2 sm:px-4">
                      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_184px] items-center gap-1.5 sm:gap-3">
                        <label
                          htmlFor="insulin-syndrome-lock"
                          className="text-xs sm:text-[13px] font-medium text-[var(--text-ink)]"
                        >
                          {INSULIN_UI_TEXT.syndromeLockLabel[lang]}
                        </label>
                        <select
                          id="insulin-syndrome-lock"
                          value={inputs.lockedSyndrome}
                          onChange={(e) =>
                            setInputs((prev) => ({
                              ...prev,
                              lockedSyndrome: e.target.value as SyndromeLock,
                            }))
                          }
                          className="h-8.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 text-xs font-semibold text-[var(--text-ink)] focus:outline-none focus:border-[#0E7490]"
                        >
                          <option value="auto">
                            {INSULIN_UI_TEXT.syndromeAuto[lang]}
                          </option>
                          <option value="DKA">DKA (JBDS 02)</option>
                          <option value="HHS">HHS (JBDS 06)</option>
                          <option value="MIXED">Mixed DKA + HHS</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <CompactNumericRow
                    id="insulin-k-input"
                    label={INSULIN_UI_TEXT.kLabel[lang]}
                    value={kDraft}
                    onChange={(raw) =>
                      handleNumericField(raw, setKDraft, "k", 1.0, 10.0)
                    }
                    onBlur={() => normalizeField(kDraft, setKDraft, parsedK, 1)}
                    placeholder="3.5–5.0"
                    unitLabel="mmol/L"
                    step="0.1"
                    pill={parsedK !== null ? paramStates.k : undefined}
                  />

                  <CompactNumericRow
                    id="insulin-na-input"
                    label={INSULIN_UI_TEXT.naLabel[lang]}
                    value={naDraft}
                    onChange={(raw) =>
                      handleNumericField(raw, setNaDraft, "na", 90, 210)
                    }
                    onBlur={() => normalizeField(naDraft, setNaDraft, parsedNa)}
                    placeholder="135–145"
                    unitLabel="mEq/L"
                    step="1"
                    pill={parsedNa !== null ? paramStates.na : undefined}
                  />

                  <CompactNumericRow
                    id="insulin-urea-input"
                    label={INSULIN_UI_TEXT.ureaLabel[lang]}
                    value={ureaDraft}
                    onChange={handleUreaChange}
                    onBlur={normalizeUreaDraft}
                    placeholder={ureaUnit === "mmol" ? "2.5–7.5" : "7–21"}
                    unitLabel={ureaUnit === "mmol" ? "Urea mmol/L" : "BUN mg/dL"}
                    onToggleUnit={toggleUreaUnit}
                    step={ureaUnit === "mmol" ? "0.5" : "1"}
                    pill={parsedUreaMmol !== null ? paramStates.urea : undefined}
                  />

                  <CompactNumericRow
                    id="insulin-ph-input"
                    label={INSULIN_UI_TEXT.phLabel[lang]}
                    value={phDraft}
                    onChange={(raw) =>
                      handleNumericField(raw, setPhDraft, "ph", 6.4, 7.8)
                    }
                    onBlur={() =>
                      normalizeField(phDraft, setPhDraft, parsedPh, 2)
                    }
                    placeholder="7.35–7.45"
                    unitLabel="pH"
                    step="0.01"
                    pill={parsedPh !== null ? paramStates.ph : undefined}
                  />

                  <CompactNumericRow
                    id="insulin-hco3-input"
                    label={INSULIN_UI_TEXT.hco3Label[lang]}
                    value={hco3Draft}
                    onChange={(raw) =>
                      handleNumericField(raw, setHco3Draft, "hco3", 1.0, 50.0)
                    }
                    onBlur={() =>
                      normalizeField(hco3Draft, setHco3Draft, parsedHco3, 1)
                    }
                    placeholder="22–26"
                    unitLabel="mmol/L"
                    step="0.5"
                    pill={parsedHco3 !== null ? paramStates.hco3 : undefined}
                  />

                  <CompactNumericRow
                    id="insulin-ketone-input"
                    label={INSULIN_UI_TEXT.ketoneLabel[lang]}
                    value={ketoneDraft}
                    onChange={(raw) =>
                      handleNumericField(
                        raw,
                        setKetoneDraft,
                        "ketone",
                        0.0,
                        20.0
                      )
                    }
                    onBlur={() =>
                      normalizeField(ketoneDraft, setKetoneDraft, parsedKetone, 1)
                    }
                    placeholder="< 0.6"
                    unitLabel="mmol/L"
                    step="0.1"
                    pill={
                      parsedKetone !== null ? paramStates.ketone : undefined
                    }
                  />

                  {/* Compact Modifiers Grid */}
                  <div className="px-3.5 py-2.5 sm:px-4 space-y-2 bg-[var(--bg-subtle)]/25">
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {INSULIN_UI_TEXT.modifiersHeader[lang]}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {evaluation?.kind === "dka" &&
                        evaluation.activeSyndrome === "HHS" && (
                          <label
                            className={`sm:col-span-2 flex items-start gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer text-[11px] transition-colors ${
                              inputs.isPlateau
                                ? "border-[#0E7490]/50 bg-[#0E7490]/10"
                                : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={inputs.isPlateau}
                              onChange={(e) =>
                                setInputs((prev) => ({
                                  ...prev,
                                  isPlateau: e.target.checked,
                                }))
                              }
                              className="mt-0.5 h-3.5 w-3.5 rounded accent-[#0E7490]"
                            />
                            <span className="font-medium text-[var(--text-ink)] leading-snug">
                              {INSULIN_UI_TEXT.plateauLabel[lang]}
                            </span>
                          </label>
                        )}

                      <label
                        className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer text-[11px] transition-colors ${
                          inputs.isEuglycemicAllowed
                            ? "border-[#0E7490]/50 bg-[#0E7490]/10"
                            : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={inputs.isEuglycemicAllowed}
                          onChange={(e) =>
                            setInputs((prev) => ({
                              ...prev,
                              isEuglycemicAllowed: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-3.5 w-3.5 rounded accent-[#0E7490]"
                        />
                        <span className="font-medium text-[var(--text-ink)] leading-snug">
                          {t(
                            lang,
                            "SGLT2i / Pregnancy / DM (edDKA)",
                            "SGLT2i / Thai kỳ / ĐTĐ (edDKA)"
                          )}
                        </span>
                      </label>

                      <label
                        className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer text-[11px] transition-colors ${
                          inputs.isLowSbp
                            ? "border-rose-500/50 bg-rose-500/10"
                            : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={inputs.isLowSbp}
                          onChange={(e) =>
                            setInputs((prev) => ({
                              ...prev,
                              isLowSbp: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-3.5 w-3.5 rounded accent-rose-600"
                        />
                        <span className="font-medium text-[var(--text-ink)] leading-snug">
                          {t(
                            lang,
                            "SBP < 90 mmHg (500 mL bolus)",
                            "HA < 90 mmHg (Bolus 500 mL)"
                          )}
                        </span>
                      </label>

                      <label
                        className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer text-[11px] transition-colors ${
                          inputs.hasOliguria
                            ? "border-rose-500/50 bg-rose-500/10"
                            : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={inputs.hasOliguria}
                          onChange={(e) =>
                            setInputs((prev) => ({
                              ...prev,
                              hasOliguria: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-3.5 w-3.5 rounded accent-rose-600"
                        />
                        <span className="font-medium text-[var(--text-ink)] leading-snug">
                          {t(
                            lang,
                            "Oliguria / Severe AKI (No KCl)",
                            "Thiểu niệu / Suy thận (Chặn KCl)"
                          )}
                        </span>
                      </label>

                      <label
                        className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer text-[11px] transition-colors ${
                          inputs.hasCHF
                            ? "border-amber-500/50 bg-amber-500/10"
                            : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={inputs.hasCHF}
                          onChange={(e) =>
                            setInputs((prev) => ({
                              ...prev,
                              hasCHF: e.target.checked,
                            }))
                          }
                          className="mt-0.5 h-3.5 w-3.5 rounded accent-amber-600"
                        />
                        <span className="font-medium text-[var(--text-ink)] leading-snug">
                          {t(
                            lang,
                            "CHF / Elderly / 18–25y (-50% fluid)",
                            "Suy tim / Cao tuổi (-50% dịch)"
                          )}
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>

            {!isConfirmed && (
              <div className="p-3.5 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/30">
                <button
                  type="button"
                  onClick={handleConfirmParameters}
                  disabled={missingRequiredLabels.length > 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#0E7490] hover:bg-[#0c6279] disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{INSULIN_UI_TEXT.confirmBtn[lang]}</span>
                </button>
              </div>
            )}
          </div>

          {/* Compact In-Memory Shift Monitoring Log */}
          <div className="order-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {INSULIN_UI_TEXT.logTitle[lang]}
                </h3>
                <span className="rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                  {INSULIN_UI_TEXT.logPrivacyBadge[lang]}
                </span>
              </div>
              <button
                type="button"
                onClick={handleFillSuggested}
                disabled={!evaluation}
                className="text-xs font-semibold text-[#0E7490] dark:text-cyan-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {INSULIN_UI_TEXT.fillSuggested[lang]}
              </button>
            </div>

            {inputs.mode !== "dka" ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    {INSULIN_UI_TEXT.actualNovoLabel[lang]}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={actualNovomix}
                    placeholder="0"
                    onChange={(e) => setActualNovomix(e.target.value)}
                    className="w-full h-10 sm:h-8.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 text-sm font-mono-tech font-medium text-[var(--text-ink)] placeholder:text-[13px] placeholder:text-[var(--text-muted)]/55 placeholder:font-normal focus:outline-none focus:border-[#0E7490]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                    {INSULIN_UI_TEXT.actualActLabel[lang]}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={actualActrapid}
                    placeholder="0"
                    onChange={(e) => setActualActrapid(e.target.value)}
                    className="w-full h-10 sm:h-8.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 text-sm font-mono-tech font-medium text-[var(--text-ink)] placeholder:text-[13px] placeholder:text-[var(--text-muted)]/55 placeholder:font-normal focus:outline-none focus:border-[#0E7490]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)] mb-1">
                  {INSULIN_UI_TEXT.actualIvLabel[lang]}
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step="0.5"
                  value={actualIvRate}
                  placeholder="0.0"
                  onChange={(e) => setActualIvRate(e.target.value)}
                  className="w-full h-10 sm:h-8.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 text-sm font-mono-tech font-medium text-[var(--text-ink)] placeholder:text-[13px] placeholder:text-[var(--text-muted)]/55 placeholder:font-normal focus:outline-none focus:border-[#0E7490]"
                />
              </div>
            )}

            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="insulin-delta-input"
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-ink)]"
                >
                  <Hourglass className="w-3.5 h-3.5 text-[#0E7490] dark:text-cyan-400" />
                  <span>{INSULIN_UI_TEXT.deltaTLabel[lang]}</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="insulin-delta-input"
                    type="number"
                    min={0.25}
                    max={24}
                    step="0.25"
                    value={deltaDisplayValue}
                    onChange={(e) => setManualDelta(e.target.value)}
                    className="w-16 h-8 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 text-right text-xs font-mono-tech font-bold text-[var(--text-ink)] focus:outline-none focus:border-[#0E7490]"
                  />
                  <span className="text-xs text-[var(--text-muted)]">
                    {INSULIN_UI_TEXT.hoursUnit[lang]}
                  </span>
                </div>
              </div>
              <p className="text-[10.5px] text-[var(--text-muted)]">
                {deltaHint}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveSnapshot}
              disabled={!resolvedInputs || !evaluation}
              className="w-full py-2 px-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-subtle)] disabled:opacity-45 disabled:cursor-not-allowed text-xs font-bold text-[var(--text-ink)] flex items-center justify-center gap-1.5 transition-colors"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-[#0E7490] dark:text-cyan-400" />
              <span>{INSULIN_UI_TEXT.saveSnapshot[lang]}</span>
            </button>

            {snapshots.length > 0 && (
              <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {t(lang, "Shift History", "Lịch sử ca trực")} (
                    {snapshots.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSnapshots([]);
                      setManualDelta(null);
                    }}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    {INSULIN_UI_TEXT.clearHistory[lang]}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-1.5 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text-ink)]">
                          <span className="text-[#0E7490] dark:text-cyan-400">
                            {snap.shortTime}
                          </span>{" "}
                          <span className="text-[var(--text-muted)] font-normal">
                            ({snap.timeLabel})
                          </span>{" "}
                          ·{" "}
                          <span className="font-mono-tech">
                            {snap.bgMgDl >= 800
                              ? "HI (≥800)"
                              : `${snap.bgMgDl} mg/dL`}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] font-mono-tech">
                          {snap.mode === "dka"
                            ? `FRIII ${snap.ivRate} u/h${typeof snap.ketone === "number" ? ` · Ket ${snap.ketone.toFixed(1)}` : ""}${typeof snap.osmTotal === "number" ? ` · Osm ${snap.osmTotal.toFixed(0)}` : ""}`
                            : `NovoMix ${snap.novomix} u · Actrapid ${snap.actrapid} u`}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSnapshots((prev) =>
                            prev.filter((item) => item.id !== snap.id)
                          )
                        }
                        aria-label="Remove snapshot"
                        className="p-1 text-[var(--text-muted)] hover:text-rose-600 dark:hover:text-rose-400 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Decision Support Output */}
        <section
          ref={outputSectionRef}
          className="order-2 lg:order-none lg:col-span-7 space-y-3.5"
        >
          {!isConfirmed || !evaluation ? (
            <div className="rounded-2xl border-2 border-dashed border-[#0E7490]/40 bg-[var(--bg-surface)] p-6 sm:p-8 text-center space-y-3">
              <div className="w-11 h-11 rounded-full bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-400 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-ink)]">
                {missingRequiredLabels.length > 0
                  ? INSULIN_UI_TEXT.enterParamsTitle[lang]
                  : INSULIN_UI_TEXT.gateTitle[lang]}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                {missingRequiredLabels.length > 0
                  ? INSULIN_UI_TEXT.missingFieldsHint[lang]
                  : INSULIN_UI_TEXT.gateBody[lang]}
              </p>
              {missingRequiredLabels.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {missingRequiredLabels.map((lbl) => (
                    <span
                      key={lbl}
                      className="rounded-md border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]"
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmParameters}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E7490] hover:bg-[#0c6279] px-5 py-2 text-xs font-bold text-white transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>{INSULIN_UI_TEXT.gateBtn[lang]}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Warning Banner */}
              {evaluation.warningBanner && (
                <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{evaluation.warningBanner.title}</span>
                  </div>
                  <ul className="space-y-1 text-xs text-[var(--text-ink)] pl-5 list-disc">
                    {evaluation.warningBanner.items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* At-a-Glance Hero Summary Card (Status + EMR/Print + 4-Cell KPI Strip) */}
              <div
                className={`rounded-2xl border bg-[var(--bg-surface)] p-4 space-y-3 ${severityBannerClass(
                  evaluation.status.tone
                )}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${severityPillClass(
                          evaluation.status.tone
                        )}`}
                      >
                        {evaluation.status.tag}
                      </span>
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">
                        {lang === "vi"
                          ? currentTpConfig.labelVi
                          : currentTpConfig.labelEn}
                      </span>
                    </div>
                    <h3 className="mt-1 text-sm sm:text-base font-bold text-[var(--text-ink)] leading-snug">
                      {evaluation.status.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={() => void handleCopyEmr()}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-colors ${
                        copiedEmr
                          ? "bg-emerald-600"
                          : "bg-[#0E7490] hover:bg-[#0c6279]"
                      }`}
                    >
                      {copiedEmr ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedEmr
                          ? INSULIN_UI_TEXT.copiedEmr[lang]
                          : INSULIN_UI_TEXT.copyEmr[lang]}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      aria-label={INSULIN_UI_TEXT.printOrder[lang]}
                      title={INSULIN_UI_TEXT.printOrder[lang]}
                      className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-ink)] transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{INSULIN_UI_TEXT.printOrder[lang]}</span>
                    </button>
                  </div>
                </div>

                {/* 4-Cell KPI Strip */}
                {evaluation.kind === "inpatient" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {INSULIN_UI_TEXT.heroNovoLabel[lang]}
                      </div>
                      <div className="mt-0.5 text-sm font-mono-tech font-bold text-[#0E7490] dark:text-cyan-400">
                        {evaluation.suggestedNovomix > 0
                          ? `${evaluation.suggestedNovomix} u`
                          : "0 u"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {INSULIN_UI_TEXT.heroActLabel[lang]}
                      </div>
                      <div className="mt-0.5 text-sm font-mono-tech font-bold text-rose-600 dark:text-rose-400">
                        {evaluation.suggestedActrapid > 0
                          ? `${evaluation.suggestedActrapid} u`
                          : "0 u"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {INSULIN_UI_TEXT.heroNextCheckLabel[lang]}
                      </div>
                      <div className="mt-0.5 text-xs font-mono-tech font-bold text-[var(--text-ink)] truncate">
                        {evaluation.timeline[0]?.time ?? "--"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {INSULIN_UI_TEXT.tddSummaryLabel[lang]}
                      </div>
                      <div className="mt-0.5 text-xs font-mono-tech font-bold text-[var(--text-ink)]">
                        {evaluation.effectiveTdd} u · ISF ~{evaluation.isf}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {INSULIN_UI_TEXT.heroFriiiLabel[lang]}
                      </div>
                      <div className="mt-0.5 text-sm font-mono-tech font-bold text-indigo-700 dark:text-indigo-300">
                        {evaluation.axes
                          ? `${evaluation.suggestedIvRate.toFixed(1)} u/h`
                          : "0.0 u/h"}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {INSULIN_UI_TEXT.naCorrLabel[lang]}
                      </div>
                      <div className="mt-0.5 text-sm font-mono-tech font-bold text-[var(--text-ink)]">
                        {evaluation.indices.naCorr.toFixed(1)} mEq/L
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {INSULIN_UI_TEXT.osmTotalLabel[lang]}
                      </div>
                      <div className="mt-0.5 text-sm font-mono-tech font-bold text-[#0E7490] dark:text-cyan-400">
                        {evaluation.indices.osmTotal.toFixed(1)} mOsm
                      </div>
                    </div>
                    <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        {INSULIN_UI_TEXT.osmEffLabel[lang]}
                      </div>
                      <div className="mt-0.5 text-sm font-mono-tech font-bold text-[var(--text-ink)]">
                        {evaluation.indices.osmEff.toFixed(1)} mOsm
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Trajectory & IOB Card */}
              {evaluation.traj.hasPrior && (
                <div className="rounded-2xl border border-[#0E7490]/30 bg-[#0E7490]/6 p-3.5 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-300">
                      <Activity className="w-4 h-4" />
                      <span>{INSULIN_UI_TEXT.trajectoryTitle[lang]}</span>
                    </span>
                    <span className="rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-2 py-0.5 text-[11px] font-mono-tech font-semibold text-[var(--text-secondary)]">
                      {evaluation.traj.lastShortTime} ({evaluation.traj.lastTimeStr}) · Δt{" "}
                      {evaluation.traj.deltaHours}h
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-ink)] leading-relaxed font-mono-tech">
                    BG: {evaluation.traj.lastBg} →{" "}
                    {inputs.bgMgDl >= 800
                      ? "HI (≥800)"
                      : `${inputs.bgMgDl} mg/dL`}{" "}
                    ({evaluation.traj.deltaBg > 0 ? "+" : ""}
                    {evaluation.traj.deltaBg} mg/dL ~{" "}
                    {evaluation.traj.rateBgPerHour > 0 ? "+" : ""}
                    {evaluation.traj.rateBgPerHour.toFixed(0)} mg/dL/h)
                  </p>
                  {inputs.mode === "dka" ? (
                    <p className="text-xs text-[var(--text-secondary)] font-mono-tech">
                      Prior FRIII: {evaluation.traj.lastIvRate} u/h · ΔKetone:{" "}
                      {evaluation.traj.rateKetonePerHour !== null
                        ? `${evaluation.traj.rateKetonePerHour > 0 ? "+" : ""}${evaluation.traj.rateKetonePerHour.toFixed(2)} mmol/L/h`
                        : "--"}{" "}
                      · ΔOsm:{" "}
                      {evaluation.traj.rateOsmPerHour !== null
                        ? `${evaluation.traj.rateOsmPerHour > 0 ? "+" : ""}${evaluation.traj.rateOsmPerHour.toFixed(1)} mOsm/kg/h`
                        : "--"}
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {t(
                          lang,
                          `Prior dose: NovoMix ${evaluation.traj.lastNovomix} u + Actrapid ${evaluation.traj.lastActrapid} u · Active IOB: ~${evaluation.traj.iob.activeUnits} u (2h projected BG ~${evaluation.traj.projectedBg2h} mg/dL)`,
                          `Liều mốc trước: Novomix ${evaluation.traj.lastNovomix} u + Actrapid ${evaluation.traj.lastActrapid} u · IOB tồn lưu: ~${evaluation.traj.iob.activeUnits} u (dự báo 2h ~${evaluation.traj.projectedBg2h} mg/dL)`
                        )}
                      </p>
                      {evaluation.traj.iob.protaminePeakWarning && (
                        <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>{INSULIN_UI_TEXT.protaminePeakWarn[lang]}</span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Inpatient 4 Action Pillars */}
              {evaluation.kind === "inpatient" && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400 pb-1.5 border-b border-[var(--border-hairline)]">
                      <Syringe className="w-4 h-4" />
                      <span>{INSULIN_UI_TEXT.pillars.med[lang]}</span>
                    </div>
                    <DetailSectionBlock section={evaluation.medicationOrder} />
                  </div>

                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 pb-1.5 border-b border-[var(--border-hairline)]">
                      <Utensils className="w-4 h-4" />
                      <span>{INSULIN_UI_TEXT.pillars.nutri[lang]}</span>
                    </div>
                    <DetailSectionBlock section={evaluation.nutritionPlan} />
                  </div>

                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400 pb-1.5 border-b border-[var(--border-hairline)]">
                      <Clock className="w-4 h-4" />
                      <span>{INSULIN_UI_TEXT.pillars.timeline[lang]}</span>
                    </div>
                    <div className="space-y-1.5">
                      {evaluation.timeline.map((ev, idx) => (
                        <div
                          key={idx}
                          className={`rounded-xl border px-3 py-2 flex flex-wrap items-center gap-2 text-xs ${
                            ev.critical
                              ? "border-rose-500/35 bg-rose-500/8"
                              : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                          }`}
                        >
                          <span
                            className={`rounded-md px-2 py-0.5 font-mono-tech font-bold text-[11px] ${
                              ev.critical
                                ? "bg-rose-600 text-white"
                                : "bg-[var(--bg-subtle)] text-[var(--text-ink)]"
                            }`}
                          >
                            {ev.time}
                          </span>
                          <span className="font-medium text-[var(--text-ink)]">
                            {ev.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 pb-1.5 border-b border-[var(--border-hairline)]">
                      <Activity className="w-4 h-4" />
                      <span>{INSULIN_UI_TEXT.pillars.adj[lang]}</span>
                    </div>
                    <DetailSectionBlock
                      section={evaluation.regimenAdjustment}
                    />
                  </div>
                </div>
              )}

              {/* DKA / HHS View */}
              {evaluation.kind === "dka" && (
                <>
                  {/* Non-DKA Fallback Panel */}
                  {evaluation.nonDkaFallback && (
                    <div className="rounded-2xl border-2 border-amber-500/50 bg-[var(--bg-surface)] p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border-hairline)]">
                        <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{evaluation.nonDkaFallback.title}</span>
                        </h4>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${severityPillClass(
                            evaluation.nonDkaFallback.tone
                          )}`}
                        >
                          {evaluation.nonDkaFallback.badge}
                        </span>
                      </div>
                      <DetailSectionBlock
                        section={evaluation.nonDkaFallback.section}
                      />
                      {evaluation.nonDkaFallback.showSwitchTo18h && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleSwitchMode("18h")}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0E7490] hover:bg-[#0c6279] px-4 py-2 text-xs font-bold text-white transition-colors"
                          >
                            <span>{INSULIN_UI_TEXT.switchTo18h[lang]}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4 DKA/HHS Axes */}
                  {evaluation.axes && (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-hairline)]">
                          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400">
                            <Droplets className="w-4 h-4" />
                            <span>{INSULIN_UI_TEXT.dkaAxes.fluids[lang]}</span>
                          </span>
                          {evaluation.axes.fluids.badge && (
                            <span className="rounded-md bg-[#0E7490]/12 px-2 py-0.5 text-[11px] font-bold text-[#0E7490] dark:text-cyan-300">
                              {evaluation.axes.fluids.badge}
                            </span>
                          )}
                        </div>
                        <DetailSectionBlock section={evaluation.axes.fluids} />
                      </div>

                      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-hairline)]">
                          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                            <Flame className="w-4 h-4" />
                            <span>{INSULIN_UI_TEXT.dkaAxes.kAcid[lang]}</span>
                          </span>
                          {evaluation.axes.potassiumAcidBase.badge && (
                            <span
                              className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${severityPillClass(
                                evaluation.axes.potassiumAcidBase.tone
                              )}`}
                            >
                              {evaluation.axes.potassiumAcidBase.badge}
                            </span>
                          )}
                        </div>
                        <DetailSectionBlock
                          section={evaluation.axes.potassiumAcidBase}
                        />
                      </div>

                      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-hairline)]">
                          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                            <Syringe className="w-4 h-4" />
                            <span>{INSULIN_UI_TEXT.dkaAxes.insulin[lang]}</span>
                          </span>
                          {evaluation.axes.insulin.badge && (
                            <span className="rounded-md bg-indigo-500/12 border border-indigo-500/25 px-2 py-0.5 text-[11px] font-mono-tech font-bold text-indigo-700 dark:text-indigo-300">
                              {evaluation.axes.insulin.badge}
                            </span>
                          )}
                        </div>
                        <DetailSectionBlock section={evaluation.axes.insulin} />
                      </div>

                      <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-hairline)]">
                          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            <Activity className="w-4 h-4" />
                            <span>
                              {INSULIN_UI_TEXT.dkaAxes.monitoring[lang]}
                            </span>
                          </span>
                          {evaluation.axes.monitoringTransition.badge && (
                            <span className="rounded-md bg-emerald-500/12 border border-emerald-500/25 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                              {evaluation.axes.monitoringTransition.badge}
                            </span>
                          )}
                        </div>
                        <DetailSectionBlock
                          section={evaluation.axes.monitoringTransition}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ISMP Safety & Protocol References Modal */}
      {showSafetyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="insulin-safety-modal-title"
          onClick={() => setShowSafetyModal(false)}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-lg w-full rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-xl space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div
                id="insulin-safety-modal-title"
                className="font-bold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{INSULIN_UI_TEXT.disclaimerTitle[lang]}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSafetyModal(false)}
                aria-label={INSULIN_UI_TEXT.closeBtn[lang]}
                className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {INSULIN_UI_TEXT.disclaimerBody[lang]}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-hairline)] leading-relaxed">
              {INSULIN_UI_TEXT.referencesLabel[lang]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
