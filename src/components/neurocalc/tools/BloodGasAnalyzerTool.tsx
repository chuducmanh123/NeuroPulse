"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  FlaskConical,
  HeartPulse,
  Printer,
  RotateCcw,
  ShieldAlert,
  Stethoscope,
  X,
} from "lucide-react";
import {
  BLOODGAS_UI_TEXT,
  KASSIRER_BLEICH_TABLE,
  SAMPLE_REFERENCE_RANGES,
  type AlbuminUnit,
  type BloodGasLang,
  type ClinicalSeverity,
  type GlucoseUnit,
  type PhosphateUnit,
  type PressureUnit,
  type SampleType,
  type UreaUnit,
  t,
} from "@/lib/neurocalc/tools/bloodGasI18n";
import {
  createDefaultBloodGasInputs,
  evaluateBloodGas,
  formatBloodGasReport,
  getBloodGasParamStates,
  kpaToMmHg,
  mmHgToKpa,
  type BloodGasInputs,
  type ParamStatusPill,
} from "@/lib/neurocalc/tools/bloodGasEngine";

interface BloodGasAnalyzerToolProps {
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

function parseOptional(raw: string, min: number, max: number): number | null {
  if (raw.trim() === "") return null;
  const parsed = parseFloat(raw);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}

interface NumericRowProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  unitLabel: string;
  onToggleUnit?: () => void;
  step?: string;
  pill?: ParamStatusPill | null;
}

function NumericRow({
  id,
  label,
  required,
  value,
  onChange,
  placeholder,
  unitLabel,
  onToggleUnit,
  step = "any",
  pill,
}: NumericRowProps) {
  return (
    <div className="px-3 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1 flex items-center gap-1 flex-wrap">
          <label
            htmlFor={id}
            className="text-xs font-medium text-[var(--text-ink)] leading-snug cursor-pointer"
          >
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
          {pill && (
            <span
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold leading-none ${severityPillClass(
                pill.tone
              )}`}
            >
              {pill.label}
            </span>
          )}
        </div>

        <div className="w-[132px] sm:w-[140px] shrink-0 flex items-stretch h-10 sm:h-8 rounded-lg border border-[var(--border-hairline)] overflow-hidden bg-[var(--bg-paper)] focus-within:border-[#0E7490] focus-within:ring-2 focus-within:ring-[#0E7490]/20 transition-colors">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step={step}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent px-2 text-[13px] font-mono-tech font-medium text-[var(--text-ink)] placeholder:text-[11.5px] placeholder:text-[var(--text-muted)]/55 placeholder:font-normal focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

export function BloodGasAnalyzerTool({ onBack }: BloodGasAnalyzerToolProps) {
  const [lang, setLang] = useState<BloodGasLang>("en");
  const [sampleType, setSampleType] = useState<SampleType>("abg");
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>("mmhg");
  const [albuminUnit, setAlbuminUnit] = useState<AlbuminUnit>("gdl");
  const [phosphateUnit, setPhosphateUnit] = useState<PhosphateUnit>("mgdl");
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>("mmol");
  const [ureaUnit, setUreaUnit] = useState<UreaUnit>("mmol");

  // All numeric inputs start empty (no prefilled placeholder data)
  const [phDraft, setPhDraft] = useState("");
  const [pco2Draft, setPco2Draft] = useState("");
  const [hco3Draft, setHco3Draft] = useState("");
  const [tco2Draft, setTco2Draft] = useState("");
  const [po2Draft, setPo2Draft] = useState("");
  const [fio2Draft, setFio2Draft] = useState("21");
  const [sao2Draft, setSao2Draft] = useState("");
  const [beDraft, setBeDraft] = useState("");
  const [ageDraft, setAgeDraft] = useState("");
  const [tempDraft, setTempDraft] = useState("");

  // Electrolytes & metabolic
  const [naDraft, setNaDraft] = useState("");
  const [clDraft, setClDraft] = useState("");
  const [kDraft, setKDraft] = useState("");
  const [albuminDraft, setAlbuminDraft] = useState("");
  const [lactateDraft, setLactateDraft] = useState("");

  // Extended
  const [showExtended, setShowExtended] = useState(false);
  const [phosphateDraft, setPhosphateDraft] = useState("");
  const [glucoseDraft, setGlucoseDraft] = useState("");
  const [ureaDraft, setUreaDraft] = useState("");
  const [measuredOsmDraft, setMeasuredOsmDraft] = useState("");
  const [hbDraft, setHbDraft] = useState("");
  const [coDraft, setCoDraft] = useState("");
  const [uNaDraft, setUNaDraft] = useState("");
  const [uKDraft, setUKDraft] = useState("");
  const [uClDraft, setUClDraft] = useState("");

  // Pre-analytical artefacts
  const [showArtefacts, setShowArtefacts] = useState(false);
  const [artefactAirBubble, setArtefactAirBubble] = useState(false);
  const [artefactExcessHeparin, setArtefactExcessHeparin] = useState(false);
  const [artefactDelayedOrHighWbc, setArtefactDelayedOrHighWbc] = useState(false);
  const [artefactTourniquet, setArtefactTourniquet] = useState(false);

  const [copied, setCopied] = useState(false);
  const [showRefsModal, setShowRefsModal] = useState(false);
  const [showCalculation, setShowCalculation] = useState(false);
  const [showAdditionalGas, setShowAdditionalGas] = useState(false);
  const resultSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!showRefsModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowRefsModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showRefsModal]);

  const parsedPh = useMemo(() => parseOptional(phDraft, 6.4, 7.85), [phDraft]);
  const parsedPco2MmHg = useMemo(() => {
    const raw = parseOptional(pco2Draft, 1, 200);
    if (raw === null) return null;
    return pressureUnit === "kpa" ? kpaToMmHg(raw) : raw;
  }, [pco2Draft, pressureUnit]);
  const parsedPo2MmHg = useMemo(() => {
    const raw = parseOptional(po2Draft, 1, 750);
    if (raw === null) return null;
    return pressureUnit === "kpa" ? kpaToMmHg(raw) : raw;
  }, [po2Draft, pressureUnit]);
  const parsedHco3 = useMemo(() => parseOptional(hco3Draft, 1, 80), [hco3Draft]);
  const parsedTco2 = useMemo(() => parseOptional(tco2Draft, 1, 85), [tco2Draft]);
  const parsedFio2 = useMemo(() => parseOptional(fio2Draft, 21, 100) ?? 21, [fio2Draft]);
  const parsedSao2 = useMemo(() => parseOptional(sao2Draft, 10, 100), [sao2Draft]);
  const parsedBe = useMemo(() => parseOptional(beDraft, -40, 40), [beDraft]);
  const parsedAge = useMemo(() => parseOptional(ageDraft, 0, 120), [ageDraft]);
  const parsedTemp = useMemo(() => parseOptional(tempDraft, 25, 44), [tempDraft]);

  const parsedNa = useMemo(() => parseOptional(naDraft, 80, 210), [naDraft]);
  const parsedCl = useMemo(() => parseOptional(clDraft, 50, 160), [clDraft]);
  const parsedK = useMemo(() => parseOptional(kDraft, 1.0, 12.0), [kDraft]);
  const parsedAlbuminGDl = useMemo(() => {
    const raw = parseOptional(albuminDraft, 0.5, 80);
    if (raw === null) return null;
    return albuminUnit === "gl" ? raw / 10 : raw;
  }, [albuminDraft, albuminUnit]);
  const parsedLactate = useMemo(() => parseOptional(lactateDraft, 0, 40), [lactateDraft]);

  const parsedPhosphateMgDl = useMemo(() => {
    const raw = parseOptional(phosphateDraft, 0.1, 30);
    if (raw === null) return null;
    return phosphateUnit === "mmol" ? raw * 3.097 : raw;
  }, [phosphateDraft, phosphateUnit]);
  const parsedGlucoseMmol = useMemo(() => {
    const raw = parseOptional(glucoseDraft, 0.5, 1500);
    if (raw === null) return null;
    return glucoseUnit === "mgdl" ? raw / 18 : raw;
  }, [glucoseDraft, glucoseUnit]);
  const parsedUreaMmol = useMemo(() => {
    const raw = parseOptional(ureaDraft, 0.2, 200);
    if (raw === null) return null;
    return ureaUnit === "bun_mgdl" ? raw / 2.8 : raw;
  }, [ureaDraft, ureaUnit]);
  const parsedMeasuredOsm = useMemo(
    () => parseOptional(measuredOsmDraft, 150, 500),
    [measuredOsmDraft]
  );
  const parsedHb = useMemo(() => parseOptional(hbDraft, 1, 25), [hbDraft]);
  const parsedCo = useMemo(() => parseOptional(coDraft, 0.5, 20), [coDraft]);
  const parsedUNa = useMemo(() => parseOptional(uNaDraft, 0, 300), [uNaDraft]);
  const parsedUK = useMemo(() => parseOptional(uKDraft, 0, 200), [uKDraft]);
  const parsedUCl = useMemo(() => parseOptional(uClDraft, 0, 300), [uClDraft]);

  const togglePressureUnit = () => {
    const next: PressureUnit = pressureUnit === "mmhg" ? "kpa" : "mmhg";
    if (parsedPco2MmHg !== null) {
      setPco2Draft(
        next === "kpa"
          ? mmHgToKpa(parsedPco2MmHg).toFixed(1)
          : parsedPco2MmHg.toFixed(0)
      );
    }
    if (parsedPo2MmHg !== null) {
      setPo2Draft(
        next === "kpa"
          ? mmHgToKpa(parsedPo2MmHg).toFixed(1)
          : parsedPo2MmHg.toFixed(0)
      );
    }
    setPressureUnit(next);
  };

  const toggleAlbuminUnit = () => {
    const next: AlbuminUnit = albuminUnit === "gdl" ? "gl" : "gdl";
    if (parsedAlbuminGDl !== null) {
      setAlbuminDraft(
        next === "gl"
          ? (parsedAlbuminGDl * 10).toFixed(0)
          : parsedAlbuminGDl.toFixed(1)
      );
    }
    setAlbuminUnit(next);
  };

  const togglePhosphateUnit = () => {
    const next: PhosphateUnit = phosphateUnit === "mgdl" ? "mmol" : "mgdl";
    if (parsedPhosphateMgDl !== null) {
      setPhosphateDraft(
        next === "mmol"
          ? (parsedPhosphateMgDl / 3.097).toFixed(2)
          : parsedPhosphateMgDl.toFixed(1)
      );
    }
    setPhosphateUnit(next);
  };

  const toggleGlucoseUnit = () => {
    const next: GlucoseUnit = glucoseUnit === "mmol" ? "mgdl" : "mmol";
    if (parsedGlucoseMmol !== null) {
      setGlucoseDraft(
        next === "mgdl"
          ? (parsedGlucoseMmol * 18).toFixed(0)
          : parsedGlucoseMmol.toFixed(1)
      );
    }
    setGlucoseUnit(next);
  };

  const toggleUreaUnit = () => {
    const next: UreaUnit = ureaUnit === "mmol" ? "bun_mgdl" : "mmol";
    if (parsedUreaMmol !== null) {
      setUreaDraft(
        next === "bun_mgdl"
          ? (parsedUreaMmol * 2.8).toFixed(0)
          : parsedUreaMmol.toFixed(1)
      );
    }
    setUreaUnit(next);
  };

  const paramStates = useMemo(
    () =>
      getBloodGasParamStates(
        {
          sampleType,
          ph: parsedPh ?? undefined,
          pco2MmHg: parsedPco2MmHg ?? undefined,
          po2MmHg: parsedPo2MmHg ?? undefined,
          hco3: parsedHco3 ?? undefined,
          tco2: parsedTco2 ?? undefined,
          be: parsedBe ?? undefined,
          sao2Pct: parsedSao2 ?? undefined,
          na: parsedNa ?? undefined,
          k: parsedK ?? undefined,
          cl: parsedCl ?? undefined,
          albuminGDl: parsedAlbuminGDl ?? undefined,
          lactate: parsedLactate ?? undefined,
        },
        lang
      ),
    [
      sampleType,
      parsedPh,
      parsedPco2MmHg,
      parsedPo2MmHg,
      parsedHco3,
      parsedTco2,
      parsedBe,
      parsedSao2,
      parsedNa,
      parsedK,
      parsedCl,
      parsedAlbuminGDl,
      parsedLactate,
      lang,
    ]
  );

  const missingCoreFields = useMemo(() => {
    const missing: string[] = [];
    if (parsedPh === null) missing.push("pH");
    if (parsedPco2MmHg === null) missing.push("PCO2");
    if (parsedHco3 === null && parsedTco2 === null) {
      missing.push("HCO3- / tCO2");
    }
    return missing;
  }, [parsedPh, parsedPco2MmHg, parsedHco3, parsedTco2]);

  const resolvedInputs = useMemo<BloodGasInputs | null>(() => {
    if (missingCoreFields.length > 0 || parsedPh === null || parsedPco2MmHg === null) {
      return null;
    }
    return {
      ...createDefaultBloodGasInputs(),
      sampleType,
      ph: parsedPh,
      pco2MmHg: parsedPco2MmHg,
      hco3: parsedHco3,
      tco2: parsedTco2,
      po2MmHg: parsedPo2MmHg,
      fio2Pct: parsedFio2,
      sao2Pct: parsedSao2,
      be: parsedBe,
      ageYears: parsedAge,
      tempC: parsedTemp,
      hbGDl: parsedHb,
      cardiacOutputLMin: parsedCo,
      na: parsedNa,
      k: parsedK,
      cl: parsedCl,
      albuminGDl: parsedAlbuminGDl,
      lactate: parsedLactate,
      phosphateMgDl: parsedPhosphateMgDl,
      glucoseMmol: parsedGlucoseMmol,
      ureaMmol: parsedUreaMmol,
      measuredOsm: parsedMeasuredOsm,
      uNa: parsedUNa,
      uK: parsedUK,
      uCl: parsedUCl,
      artefactAirBubble,
      artefactExcessHeparin,
      artefactDelayedOrHighWbc,
      artefactTourniquet,
    };
  }, [
    missingCoreFields.length,
    sampleType,
    parsedPh,
    parsedPco2MmHg,
    parsedHco3,
    parsedTco2,
    parsedPo2MmHg,
    parsedFio2,
    parsedSao2,
    parsedBe,
    parsedAge,
    parsedTemp,
    parsedHb,
    parsedCo,
    parsedNa,
    parsedK,
    parsedCl,
    parsedAlbuminGDl,
    parsedLactate,
    parsedPhosphateMgDl,
    parsedGlucoseMmol,
    parsedUreaMmol,
    parsedMeasuredOsm,
    parsedUNa,
    parsedUK,
    parsedUCl,
    artefactAirBubble,
    artefactExcessHeparin,
    artefactDelayedOrHighWbc,
    artefactTourniquet,
  ]);

  const evaluation = useMemo(
    () => (resolvedInputs ? evaluateBloodGas(resolvedInputs, lang) : null),
    [resolvedInputs, lang]
  );

  const handleReset = () => {
    setPhDraft("");
    setPco2Draft("");
    setHco3Draft("");
    setTco2Draft("");
    setPo2Draft("");
    setFio2Draft("21");
    setSao2Draft("");
    setBeDraft("");
    setAgeDraft("");
    setTempDraft("");
    setNaDraft("");
    setClDraft("");
    setKDraft("");
    setAlbuminDraft("");
    setLactateDraft("");
    setPhosphateDraft("");
    setGlucoseDraft("");
    setUreaDraft("");
    setMeasuredOsmDraft("");
    setHbDraft("");
    setCoDraft("");
    setUNaDraft("");
    setUKDraft("");
    setUClDraft("");
    setArtefactAirBubble(false);
    setArtefactExcessHeparin(false);
    setArtefactDelayedOrHighWbc(false);
    setArtefactTourniquet(false);
  };

  const handleCopyReport = async () => {
    if (!resolvedInputs || !evaluation) return;
    const text = formatBloodGasReport(resolvedInputs, evaluation, lang);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const refRange = SAMPLE_REFERENCE_RANGES[sampleType];

  return (
    <div className="space-y-3.5">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-2 print:hidden">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {BLOODGAS_UI_TEXT.backToTools[lang]}
            </span>
          </button>

          <h2 className="text-sm sm:text-base font-bold text-[var(--text-ink)] tracking-tight truncate">
            {BLOODGAS_UI_TEXT.toolTitle[lang]}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Language Toggle EN | VI */}
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
                className={`px-2 py-1 rounded-lg text-[11px] font-bold uppercase transition-colors ${
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
            onClick={handleReset}
            aria-label={BLOODGAS_UI_TEXT.resetCase[lang]}
            title={BLOODGAS_UI_TEXT.resetCase[lang]}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{BLOODGAS_UI_TEXT.resetCase[lang]}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRefsModal(true)}
            aria-label={BLOODGAS_UI_TEXT.refsBtn[lang]}
            title={BLOODGAS_UI_TEXT.refsBtn[lang]}
            className="inline-flex items-center justify-center rounded-xl border border-[#0E7490]/30 bg-[#0E7490]/8 p-1.5 text-xs font-semibold text-[#0E7490] dark:text-cyan-300 hover:bg-[#0E7490]/15 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Compact Inputs */}
        <div className="lg:col-span-4 space-y-2.5 print:hidden">
          {/* Core Blood Gas Card */}
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40 flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] truncate">
                {BLOODGAS_UI_TEXT.coreHeader[lang]}
              </h3>
              <button
                type="button"
                onClick={togglePressureUnit}
                title="Switch mmHg / kPa"
                className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5 text-[11px] font-mono-tech font-semibold text-[var(--text-ink)] hover:border-[#0E7490] transition-colors"
              >
                <span>{pressureUnit === "mmhg" ? "mmHg" : "kPa"}</span>
                <ArrowLeftRight className="w-3 h-3 text-[#0E7490] dark:text-cyan-400" />
              </button>
            </div>

            <div className="divide-y divide-[var(--border-hairline)]">
              {/* Sample Source Dropdown */}
              <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="bg-sample-type"
                  className="text-xs font-medium text-[var(--text-ink)]"
                >
                  {BLOODGAS_UI_TEXT.sampleTypeLabel[lang]}
                </label>
                <select
                  id="bg-sample-type"
                  value={sampleType}
                  onChange={(e) => setSampleType(e.target.value as SampleType)}
                  className="w-[172px] sm:w-[162px] h-10 sm:h-8 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 text-xs font-semibold text-[var(--text-ink)] focus:outline-none focus:border-[#0E7490]"
                >
                  {(["abg", "pvbg", "mvbg"] as const).map((st) => {
                    const cfg = SAMPLE_REFERENCE_RANGES[st];
                    return (
                      <option key={st} value={st}>
                        {lang === "vi" ? cfg.labelVi : cfg.labelEn}
                      </option>
                    );
                  })}
                </select>
              </div>
              <NumericRow
                id="bg-ph"
                label="pH"
                required
                value={phDraft}
                onChange={setPhDraft}
                placeholder={`${refRange.ph[0].toFixed(2)}–${refRange.ph[1].toFixed(2)}`}
                unitLabel="pH"
                step="0.01"
                pill={paramStates.ph}
              />
              <NumericRow
                id="bg-pco2"
                label="PCO2"
                required
                value={pco2Draft}
                onChange={setPco2Draft}
                placeholder={
                  pressureUnit === "mmhg"
                    ? `${refRange.pco2MmHg[0]}–${refRange.pco2MmHg[1]}`
                    : `${mmHgToKpa(refRange.pco2MmHg[0]).toFixed(1)}–${mmHgToKpa(refRange.pco2MmHg[1]).toFixed(1)}`
                }
                unitLabel={pressureUnit === "mmhg" ? "mmHg" : "kPa"}
                onToggleUnit={togglePressureUnit}
                step="0.1"
                pill={paramStates.pco2}
              />
              <NumericRow
                id="bg-hco3"
                label="HCO3-"
                required
                value={hco3Draft}
                onChange={setHco3Draft}
                placeholder={`${refRange.hco3[0]}–${refRange.hco3[1]}`}
                unitLabel="mEq/L"
                step="0.1"
                pill={paramStates.hco3}
              />
              <NumericRow
                id="bg-po2"
                label="PO2"
                value={po2Draft}
                onChange={setPo2Draft}
                placeholder={
                  pressureUnit === "mmhg"
                    ? `${refRange.po2MmHg[0]}–${refRange.po2MmHg[1]}`
                    : `${mmHgToKpa(refRange.po2MmHg[0]).toFixed(1)}–${mmHgToKpa(refRange.po2MmHg[1]).toFixed(1)}`
                }
                unitLabel={pressureUnit === "mmhg" ? "mmHg" : "kPa"}
                onToggleUnit={togglePressureUnit}
                step="0.1"
                pill={paramStates.po2}
              />

              {/* FiO2 with quick chips */}
              <div className="px-3 py-1.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="bg-fio2"
                    className="text-xs font-medium text-[var(--text-ink)]"
                  >
                    FiO2
                  </label>
                  <div className="w-[132px] sm:w-[140px] shrink-0 flex items-stretch h-10 sm:h-8 rounded-lg border border-[var(--border-hairline)] overflow-hidden bg-[var(--bg-paper)] focus-within:border-[#0E7490]">
                    <input
                      id="bg-fio2"
                      type="number"
                      inputMode="decimal"
                      min={21}
                      max={100}
                      value={fio2Draft}
                      onChange={(e) => setFio2Draft(e.target.value)}
                      placeholder="21"
                      className="min-w-0 flex-1 bg-transparent px-2 text-[13px] font-mono-tech font-medium text-[var(--text-ink)] focus:outline-none"
                    />
                    <span className="border-l border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 px-2 flex items-center text-[11px] font-medium text-[var(--text-secondary)]">
                      %
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-1 justify-end">
                  {[21, 28, 40, 60, 100].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFio2Draft(String(v))}
                      className={`px-2 py-1 sm:px-1.5 sm:py-0.5 rounded text-[10.5px] sm:text-[10px] font-mono-tech font-semibold border transition-colors ${
                        parsedFio2 === v
                          ? "border-[#0E7490] bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300"
                          : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                      }`}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              <NumericRow
                id="bg-sao2"
                label="SaO2 / SpO2"
                value={sao2Draft}
                onChange={setSao2Draft}
                placeholder={`${refRange.so2[0]}–${refRange.so2[1]}`}
                unitLabel="%"
                step="1"
                pill={paramStates.sao2}
              />

              {/* Collapsible Additional Core Fields (tCO2, BE, Age, Temp) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdditionalGas((p) => !p)}
                  className="w-full px-3 py-2 flex items-center justify-between text-left bg-[var(--bg-subtle)]/25 hover:bg-[var(--bg-subtle)]/50 transition-colors"
                >
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    {BLOODGAS_UI_TEXT.additionalGasHeader[lang]}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform ${
                      showAdditionalGas ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showAdditionalGas && (
                  <div className="divide-y divide-[var(--border-hairline)] border-t border-[var(--border-hairline)]">
                    <NumericRow
                      id="bg-tco2"
                      label={t(lang, "Serum tCO2 (if no HCO3-)", "tCO2 (nếu thiếu HCO3-)")}
                      value={tco2Draft}
                      onChange={setTco2Draft}
                      placeholder="23–27"
                      unitLabel="mmol/L"
                      step="0.1"
                    />
                    <NumericRow
                      id="bg-be"
                      label="Base Excess (BE)"
                      value={beDraft}
                      onChange={setBeDraft}
                      placeholder="-2 to +2"
                      unitLabel="mEq/L"
                      step="0.1"
                      pill={paramStates.be}
                    />
                    <NumericRow
                      id="bg-age"
                      label={t(lang, "Patient Age (for A-aDO2)", "Tuổi (tính A-aDO2)")}
                      value={ageDraft}
                      onChange={setAgeDraft}
                      placeholder="e.g. 60"
                      unitLabel={t(lang, "yrs", "tuổi")}
                      step="1"
                    />
                    <NumericRow
                      id="bg-temp"
                      label={t(lang, "Body Temperature", "Nhiệt độ cơ thể")}
                      value={tempDraft}
                      onChange={setTempDraft}
                      placeholder="37.0"
                      unitLabel="°C"
                      step="0.1"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Quick Jump to Result */}
          {evaluation && (
            <button
              type="button"
              onClick={() =>
                resultSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="lg:hidden w-full rounded-xl border border-[#0E7490]/35 bg-[#0E7490]/10 px-3.5 py-2.5 flex items-center justify-between gap-2 text-left"
            >
              <span className="text-xs font-bold text-[#0E7490] dark:text-cyan-300 truncate">
                {evaluation.summary.primaryLabel}
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-300">
                <span>{BLOODGAS_UI_TEXT.jumpToResult[lang]}</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </span>
            </button>
          )}

          {/* Electrolytes & Metabolic Markers */}
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
            <div className="px-3.5 py-2.5 sm:px-4 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]/40">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {BLOODGAS_UI_TEXT.electrolytesHeader[lang]}
              </h3>
            </div>
            <div className="divide-y divide-[var(--border-hairline)]">
              <NumericRow
                id="bg-na"
                label="Na+"
                value={naDraft}
                onChange={setNaDraft}
                placeholder="135–145"
                unitLabel="mEq/L"
                step="1"
                pill={paramStates.na}
              />
              <NumericRow
                id="bg-cl"
                label="Cl-"
                value={clDraft}
                onChange={setClDraft}
                placeholder="96–108"
                unitLabel="mEq/L"
                step="1"
                pill={paramStates.cl}
              />
              <NumericRow
                id="bg-k"
                label="K+"
                value={kDraft}
                onChange={setKDraft}
                placeholder="3.5–5.0"
                unitLabel="mmol/L"
                step="0.1"
                pill={paramStates.k}
              />
              <NumericRow
                id="bg-alb"
                label="Albumin"
                value={albuminDraft}
                onChange={setAlbuminDraft}
                placeholder={albuminUnit === "gdl" ? "4.0–4.4" : "40–44"}
                unitLabel={albuminUnit === "gdl" ? "g/dL" : "g/L"}
                onToggleUnit={toggleAlbuminUnit}
                step="0.1"
                pill={paramStates.albumin}
              />
              <NumericRow
                id="bg-lac"
                label="Lactate"
                value={lactateDraft}
                onChange={setLactateDraft}
                placeholder="≤ 2.0"
                unitLabel="mmol/L"
                step="0.1"
                pill={paramStates.lactate}
              />
            </div>
          </div>

          {/* Extended Metabolic, Osmolality, Hb & Urine */}
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowExtended((p) => !p)}
              className="w-full px-3.5 py-2.5 sm:px-4 flex items-center justify-between text-left bg-[var(--bg-subtle)]/35 hover:bg-[var(--bg-subtle)]/60 transition-colors"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {BLOODGAS_UI_TEXT.extendedHeader[lang]}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                  showExtended ? "rotate-180" : ""
                }`}
              />
            </button>
            {showExtended && (
              <div className="divide-y divide-[var(--border-hairline)] border-t border-[var(--border-hairline)]">
                <NumericRow
                  id="bg-po4"
                  label="Phosphate"
                  value={phosphateDraft}
                  onChange={setPhosphateDraft}
                  placeholder={phosphateUnit === "mgdl" ? "2.5–4.5" : "0.8–1.5"}
                  unitLabel={phosphateUnit === "mgdl" ? "mg/dL" : "mmol/L"}
                  onToggleUnit={togglePhosphateUnit}
                />
                <NumericRow
                  id="bg-glu"
                  label="Glucose"
                  value={glucoseDraft}
                  onChange={setGlucoseDraft}
                  placeholder={glucoseUnit === "mmol" ? "3.9–5.6" : "70–100"}
                  unitLabel={glucoseUnit === "mmol" ? "mmol/L" : "mg/dL"}
                  onToggleUnit={toggleGlucoseUnit}
                />
                <NumericRow
                  id="bg-urea"
                  label={ureaUnit === "mmol" ? "Urea" : "BUN"}
                  value={ureaDraft}
                  onChange={setUreaDraft}
                  placeholder={ureaUnit === "mmol" ? "2.5–7.5" : "7–21"}
                  unitLabel={ureaUnit === "mmol" ? "mmol/L" : "mg/dL"}
                  onToggleUnit={toggleUreaUnit}
                />
                <NumericRow
                  id="bg-osm"
                  label={t(lang, "Measured Osmolality", "ALTT máu đo thực tế")}
                  value={measuredOsmDraft}
                  onChange={setMeasuredOsmDraft}
                  placeholder="275–295"
                  unitLabel="mOsm/kg"
                />
                <NumericRow
                  id="bg-hb"
                  label="Hemoglobin (Hb)"
                  value={hbDraft}
                  onChange={setHbDraft}
                  placeholder="12–16"
                  unitLabel="g/dL"
                />
                <NumericRow
                  id="bg-co"
                  label={t(lang, "Cardiac Output (for DO2)", "Cung lượng tim (DO2)")}
                  value={coDraft}
                  onChange={setCoDraft}
                  placeholder="4.0–6.0"
                  unitLabel="L/min"
                />
                <NumericRow
                  id="bg-una"
                  label={t(lang, "Urine Na+", "Natri niệu (Urine Na+)")}
                  value={uNaDraft}
                  onChange={setUNaDraft}
                  placeholder="mEq/L"
                  unitLabel="mEq/L"
                />
                <NumericRow
                  id="bg-uk"
                  label={t(lang, "Urine K+", "Kali niệu (Urine K+)")}
                  value={uKDraft}
                  onChange={setUKDraft}
                  placeholder="mEq/L"
                  unitLabel="mEq/L"
                />
                <NumericRow
                  id="bg-ucl"
                  label={t(lang, "Urine Cl-", "Clo niệu (Urine Cl-)")}
                  value={uClDraft}
                  onChange={setUClDraft}
                  placeholder="mEq/L"
                  unitLabel="mEq/L"
                />
              </div>
            )}
          </div>

          {/* Pre-Analytical Artefacts Checklist */}
          <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowArtefacts((p) => !p)}
              className="w-full px-3.5 py-2.5 sm:px-4 flex items-center justify-between text-left bg-[var(--bg-subtle)]/35 hover:bg-[var(--bg-subtle)]/60 transition-colors"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {BLOODGAS_UI_TEXT.artefactsHeader[lang]}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                  showArtefacts ? "rotate-180" : ""
                }`}
              />
            </button>
            {showArtefacts && (
              <div className="p-3 sm:px-4 space-y-2 border-t border-[var(--border-hairline)]">
                {[
                  {
                    checked: artefactAirBubble,
                    set: setArtefactAirBubble,
                    en: "Air bubble in syringe (↓PaCO2, ↑pH, PaO2 → ~150 mmHg)",
                    vi: "Có bọt khí trong bơm tiêm (↓PaCO2, ↑pH, PaO2 → ~150 mmHg)",
                  },
                  {
                    checked: artefactExcessHeparin,
                    set: setArtefactExcessHeparin,
                    en: "Excess liquid heparin dilution (falsely ↓PaCO2 & ↓HCO3-)",
                    vi: "Dư Heparin lỏng pha loãng (↓PaCO2 & ↓HCO3- giả tạo)",
                  },
                  {
                    checked: artefactDelayedOrHighWbc,
                    set: setArtefactDelayedOrHighWbc,
                    en: "Delayed >15–30m at room temp or extreme WBC/platelets",
                    vi: "Để mẫu lâu >15–30p nhiệt độ phòng hoặc BC/TC tăng rất cao",
                  },
                  {
                    checked: artefactTourniquet,
                    set: setArtefactTourniquet,
                    en: "Prolonged tourniquet >1 min (local ↑Lactate, ↓HCO3-)",
                    vi: "Buộc garo lâu >1 phút (tăng Lactate & giảm HCO3- tại chỗ)",
                  },
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2 text-xs text-[var(--text-ink)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.set(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded accent-[#0E7490]"
                    />
                    <span>{lang === "vi" ? item.vi : item.en}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Clinical Report */}
        <section ref={resultSectionRef} className="lg:col-span-8 space-y-3.5 scroll-mt-20">
          {!evaluation || !resolvedInputs ? (
            <div className="rounded-2xl border-2 border-dashed border-[#0E7490]/40 bg-[var(--bg-surface)] p-6 sm:p-10 text-center space-y-3">
              <div className="w-11 h-11 rounded-full bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-400 flex items-center justify-center mx-auto">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[var(--text-ink)]">
                {BLOODGAS_UI_TEXT.enterCoreTitle[lang]}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                {BLOODGAS_UI_TEXT.enterCoreHint[lang]}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {missingCoreFields.map((f) => (
                  <span
                    key={f}
                    className="rounded-md border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-0.5 text-[11px] font-mono-tech font-semibold text-[var(--text-secondary)]"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {/* Urgent Red Flags Top Alert */}
              {evaluation.redFlags.length > 0 && (
                <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{BLOODGAS_UI_TEXT.part3Title[lang]}</span>
                  </div>
                  <div className="space-y-1.5">
                    {evaluation.redFlags.map((rf) => (
                      <div
                        key={rf.id}
                        className="rounded-xl border border-rose-500/25 bg-[var(--bg-surface)]/80 px-3 py-2 text-xs"
                      >
                        <div className="font-bold text-rose-700 dark:text-rose-300">
                          {rf.title}
                        </div>
                        <div className="text-[var(--text-secondary)] mt-0.5">
                          {rf.detail}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Part 1: Overall Conclusion Hero Card */}
              <div
                className={`rounded-2xl border bg-[var(--bg-surface)] p-4 space-y-3 ${severityBannerClass(
                  evaluation.summary.tone
                )}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${severityPillClass(
                          evaluation.summary.tone
                        )}`}
                      >
                        {evaluation.summary.patternTag}
                      </span>
                      <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--text-secondary)]">
                        {evaluation.summary.gasExchangeLabel}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--text-ink)] leading-snug">
                      {evaluation.summary.primaryLabel}
                    </h3>
                    {evaluation.summary.notes.length > 0 && (
                      <div className="space-y-0.5 pt-0.5">
                        {evaluation.summary.notes.map((note, idx) => (
                          <p
                            key={idx}
                            className="text-xs font-medium text-[var(--text-secondary)]"
                          >
                            {note}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={() => void handleCopyReport()}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition-colors ${
                        copied
                          ? "bg-emerald-600"
                          : "bg-[#0E7490] hover:bg-[#0c6279]"
                      }`}
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copied
                          ? BLOODGAS_UI_TEXT.copiedReport[lang]
                          : BLOODGAS_UI_TEXT.copyReport[lang]}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:bg-[var(--bg-subtle)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-ink)] transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{BLOODGAS_UI_TEXT.printReport[lang]}</span>
                    </button>
                  </div>
                </div>

                {/* 4-Cell KPI Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      [H+] Calc / Meas
                    </div>
                    <div className="mt-0.5 text-xs sm:text-sm font-mono-tech font-bold text-[var(--text-ink)]">
                      {evaluation.step1.hPlusCalc.toFixed(1)} /{" "}
                      {evaluation.step1.hPlusMeasured.toFixed(1)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      P/F · A-aDO2
                    </div>
                    <div className="mt-0.5 text-xs sm:text-sm font-mono-tech font-bold text-[#0E7490] dark:text-cyan-400">
                      {evaluation.step2.isVbg
                        ? "VBG N/A"
                        : `${evaluation.step2.pfRatio !== null ? evaluation.step2.pfRatio.toFixed(0) : "—"} · ${evaluation.step2.aaGradientMmHg !== null ? evaluation.step2.aaGradientMmHg.toFixed(0) : "—"}`}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      AG / AGc
                    </div>
                    <div className="mt-0.5 text-xs sm:text-sm font-mono-tech font-bold text-[var(--text-ink)]">
                      {evaluation.step5.ag !== null
                        ? `${evaluation.step5.ag.toFixed(1)}${evaluation.step5.agAlbuminCorrected !== null ? ` / ${evaluation.step5.agAlbuminCorrected.toFixed(1)}` : ""}`
                        : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      BG / Delta Ratio
                    </div>
                    <div className="mt-0.5 text-xs sm:text-sm font-mono-tech font-bold text-[var(--text-ink)]">
                      {evaluation.step5.bicarbonateGap !== null
                        ? `${evaluation.step5.bicarbonateGap >= 0 ? "+" : ""}${evaluation.step5.bicarbonateGap.toFixed(1)}`
                        : "—"}{" "}
                      ·{" "}
                      {evaluation.step5.deltaRatio !== null
                        ? evaluation.step5.deltaRatio.toFixed(2)
                        : "—"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Show / Hide 6-Step Calculation */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setShowCalculation((prev) => !prev)}
                  aria-expanded={showCalculation}
                  className="w-full rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]/50 px-4 py-2.5 flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 shrink-0" />
                    <span>
                      {showCalculation
                        ? t(lang, "Hide Calculation", "Ẩn Chi tiết Tính toán")
                        : t(lang, "Show Calculation", "Xem Chi tiết Tính toán")}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${
                      showCalculation ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showCalculation && (
                  <div className="space-y-3">
                    {/* Step 1 */}
                    <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-hairline)]">
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400">
                          <ShieldAlert className="w-4 h-4 shrink-0" />
                          <span>{BLOODGAS_UI_TEXT.step1Title[lang]}</span>
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${severityPillClass(
                            evaluation.step1.isConsistent ? "ok" : "danger"
                          )}`}
                        >
                          {evaluation.step1.isConsistent
                            ? t(lang, "VALIDATED", "HỢP LỆ")
                            : t(lang, "MISMATCH", "SAI LỆCH")}
                        </span>
                      </div>
                      <ul className="space-y-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                        <li>
                          •{" "}
                          {t(
                            lang,
                            `Kassirer-Bleich: [H+] calc = ${evaluation.step1.hPlusCalc.toFixed(1)} nmol/L (predicted pH ${evaluation.step1.predictedPh.toFixed(2)}; linear KB ${evaluation.step1.kassirerBleichPh.toFixed(2)}) vs measured pH ${resolvedInputs.ph.toFixed(2)} ([H+] ${evaluation.step1.hPlusMeasured.toFixed(1)} nmol/L, diff ${evaluation.step1.hPlusPctDiff.toFixed(1)}%).`,
                            `Kassirer-Bleich: [H+] tính toán = ${evaluation.step1.hPlusCalc.toFixed(1)} nmol/L (pH dự đoán ${evaluation.step1.predictedPh.toFixed(2)}; KB tuyến tính ${evaluation.step1.kassirerBleichPh.toFixed(2)}) so với pH đo ${resolvedInputs.ph.toFixed(2)} ([H+] ${evaluation.step1.hPlusMeasured.toFixed(1)} nmol/L, lệch ${evaluation.step1.hPlusPctDiff.toFixed(1)}%).`
                          )}
                        </li>
                        {evaluation.step1.beCheck && (
                          <li>
                            •{" "}
                            {t(
                              lang,
                              `Hasan §9.2 (ΔPCO2 12 ⇆ ΔpH 0.1 ⇆ ΔBE 6): Predicted pH = 7.40 ${evaluation.step1.beCheck.deltaPhFromPco2 >= 0 ? "+" : ""}${evaluation.step1.beCheck.deltaPhFromPco2.toFixed(2)} (PCO2) ${evaluation.step1.beCheck.deltaPhFromBe >= 0 ? "+" : ""}${evaluation.step1.beCheck.deltaPhFromBe.toFixed(2)} (BE) = ${evaluation.step1.beCheck.estimatedPh.toFixed(2)}.`,
                              `Hasan §9.2 (ΔPCO2 12 ⇆ ΔpH 0.1 ⇆ ΔBE 6): pH ước tính = 7.40 ${evaluation.step1.beCheck.deltaPhFromPco2 >= 0 ? "+" : ""}${evaluation.step1.beCheck.deltaPhFromPco2.toFixed(2)} (PCO2) ${evaluation.step1.beCheck.deltaPhFromBe >= 0 ? "+" : ""}${evaluation.step1.beCheck.deltaPhFromBe.toFixed(2)} (BE) = ${evaluation.step1.beCheck.estimatedPh.toFixed(2)}.`
                            )}
                          </li>
                        )}
                        {evaluation.step1.tempAdjustment && (
                          <li className="text-amber-800 dark:text-amber-300 font-medium">
                            • {evaluation.step1.tempAdjustment.note}
                          </li>
                        )}
                        {evaluation.step1.artefactNotes.map((n, i) => (
                          <li
                            key={`art-${i}`}
                            className="text-amber-800 dark:text-amber-300 font-medium"
                          >
                            • {n}
                          </li>
                        ))}
                        {evaluation.step1.vbgAndLactateNotes.map((n, i) => (
                          <li key={`vbg-${i}`}>• {n}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Step 2 */}
                    <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-hairline)]">
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                          <HeartPulse className="w-4 h-4 shrink-0" />
                          <span>{BLOODGAS_UI_TEXT.step2Title[lang]}</span>
                        </span>
                        <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--text-ink)] shrink-0">
                          {evaluation.summary.gasExchangeLabel}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-ink)]">
                        {evaluation.step2.respiratoryFailureSummary}
                      </p>
                      <ul className="space-y-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                        {evaluation.step2.bullets.map((b, i) => (
                          <li key={i}>• {b}</li>
                        ))}
                        {evaluation.step2.anemiaHypoxiaWarning && (
                          <li className="text-rose-700 dark:text-rose-300 font-semibold">
                            • {evaluation.step2.anemiaHypoxiaWarning}
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Steps 3 & 4 */}
                    <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-hairline)]">
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400">
                          <Activity className="w-4 h-4 shrink-0" />
                          <span>{BLOODGAS_UI_TEXT.step34Title[lang]}</span>
                        </span>
                        <span className="rounded-md bg-[#0E7490]/10 px-2 py-0.5 text-[10.5px] font-bold uppercase text-[#0E7490] dark:text-cyan-300 shrink-0">
                          Track: {evaluation.summary.track}
                        </span>
                      </div>
                      <ul className="space-y-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                        {evaluation.step3and4.bullets.map((b, i) => (
                          <li key={i}>• {b}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Step 5 */}
                    <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-[var(--border-hairline)]">
                        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                          <FlaskConical className="w-4 h-4 shrink-0" />
                          <span>{BLOODGAS_UI_TEXT.step5Title[lang]}</span>
                        </span>
                      </div>
                      {evaluation.step5.bullets.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">
                          {t(
                            lang,
                            "Enter Na+, Cl-, Albumin, Lactate, Osmolality, or Urine Electrolytes on the left to unlock Anion Gap, Delta Ratio / Bicarbonate Gap, Osmolal Gap, and UAG/UCl.",
                            "Nhập Na+, Cl-, Albumin, Lactate, ALTT hoặc Điện giải niệu ở cột trái để tính Anion Gap, Delta Ratio / Bicarbonate Gap, Osmolal Gap và UAG/UCl."
                          )}
                        </p>
                      ) : (
                        <ul className="space-y-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                          {evaluation.step5.bullets.map((b, i) => (
                            <li key={i}>• {b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Part 3 All-Clear Banner when no Red Flags */}
              {evaluation.redFlags.length === 0 && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/8 px-3.5 py-2.5 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{BLOODGAS_UI_TEXT.noRedFlags[lang]}</span>
                </div>
              )}

              {/* Part 4: Clinical Etiology & Recommended Workup */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3.5 sm:p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 pb-1.5 border-b border-[var(--border-hairline)]">
                  <Stethoscope className="w-4 h-4" />
                  <span>{BLOODGAS_UI_TEXT.part4Title[lang]}</span>
                </div>

                {evaluation.clinicalGuidance.etiologyGroups.map((grp, idx) => (
                  <div key={idx} className="space-y-1">
                    <h4 className="text-xs font-bold text-[var(--text-ink)]">
                      {grp.category}
                    </h4>
                    <ul className="space-y-1 pl-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                      {grp.items.map((it, j) => (
                        <li key={j}>• {it}</li>
                      ))}
                    </ul>
                  </div>
                ))}

                <div className="pt-2 border-t border-[var(--border-hairline)] space-y-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400">
                    {t(
                      lang,
                      "Recommended Next Labs & Bedside Checks",
                      "Đề xuất Cận lâm sàng & Đánh giá Tiếp theo"
                    )}
                  </h4>
                  <ul className="space-y-1 pl-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                    {evaluation.clinicalGuidance.recommendedWorkup.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Reference & Formulas Modal */}
      {showRefsModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowRefsModal(false)}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-bold text-sm text-[#0E7490] dark:text-cyan-300 flex items-center gap-2">
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>{BLOODGAS_UI_TEXT.refsModalTitle[lang]}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRefsModal(false)}
                aria-label={BLOODGAS_UI_TEXT.closeBtn[lang]}
                className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-hairline)] text-left text-[var(--text-muted)]">
                    <th className="py-1.5 pr-2">Param</th>
                    <th className="py-1.5 pr-2">ABG</th>
                    <th className="py-1.5 pr-2">Peripheral VBG</th>
                    <th className="py-1.5">Mixed / Central VBG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-hairline)] font-mono-tech text-[11.5px]">
                  <tr>
                    <td className="py-1.5 pr-2 font-sans font-semibold">pH</td>
                    <td className="py-1.5 pr-2">7.35–7.45</td>
                    <td className="py-1.5 pr-2">7.31–7.42</td>
                    <td className="py-1.5">7.32–7.36</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 font-sans font-semibold">PCO2</td>
                    <td className="py-1.5 pr-2">35–45 mmHg</td>
                    <td className="py-1.5 pr-2">38–52 mmHg</td>
                    <td className="py-1.5">44–46 mmHg</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 font-sans font-semibold">PO2</td>
                    <td className="py-1.5 pr-2">&gt;80 mmHg</td>
                    <td className="py-1.5 pr-2">28–48 mmHg</td>
                    <td className="py-1.5">38–42 mmHg</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 font-sans font-semibold">HCO3-</td>
                    <td className="py-1.5 pr-2">22–26 mEq/L</td>
                    <td className="py-1.5 pr-2">19–27 mEq/L</td>
                    <td className="py-1.5">24–30 mEq/L</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-2 font-sans font-semibold">SO2</td>
                    <td className="py-1.5 pr-2">&gt;95%</td>
                    <td className="py-1.5 pr-2">65–75%</td>
                    <td className="py-1.5">&gt;70%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[var(--text-ink)]">
                Compensation Rules &amp; Physiological Limits (Step 4)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-hairline)] text-left text-[var(--text-muted)]">
                      <th className="py-1 pr-2">Disorder</th>
                      <th className="py-1 pr-2">Expected Compensation</th>
                      <th className="py-1">Physiological Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-hairline)]">
                    <tr>
                      <td className="py-1 pr-2 font-semibold">Metabolic Acidosis</td>
                      <td className="py-1 pr-2 font-mono-tech">PaCO2 = 1.5×HCO3 + 8 (±2)</td>
                      <td className="py-1">Min ~10 mmHg (12–24h)</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold">Metabolic Alkalosis</td>
                      <td className="py-1 pr-2 font-mono-tech">PaCO2 = 0.7×HCO3 + 21</td>
                      <td className="py-1">Max ~60 mmHg (1–2d)</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold">Resp Acidosis (Acute)</td>
                      <td className="py-1 pr-2 font-mono-tech">HCO3 = 24 + 0.1×ΔCO2 (ΔH+/ΔCO2 &gt;0.7)</td>
                      <td className="py-1">Max 30–32 mEq/L (1–2h)</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold">Resp Acidosis (Chronic)</td>
                      <td className="py-1 pr-2 font-mono-tech">HCO3 = 24 + 0.4×ΔCO2 (ΔH+/ΔCO2 &lt;0.3)</td>
                      <td className="py-1">Max 45 mmol/L (2–5d)</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold">Resp Alkalosis (Acute)</td>
                      <td className="py-1 pr-2 font-mono-tech">HCO3 = 24 - 0.2×ΔCO2</td>
                      <td className="py-1">Min 18 mEq/L (&lt;12h)</td>
                    </tr>
                    <tr>
                      <td className="py-1 pr-2 font-semibold">Resp Alkalosis (Chronic)</td>
                      <td className="py-1 pr-2 font-mono-tech">HCO3 = 24 - 0.5×ΔCO2</td>
                      <td className="py-1">Min 12 mmol/L (7–10d)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[var(--text-ink)]">
                Kassirer-Bleich pH ↔ [H+] &amp; Hasan §9.2 Rule
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono-tech text-[11px]">
                {KASSIRER_BLEICH_TABLE.map((row) => (
                  <span
                    key={row.ph}
                    className="rounded-md border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5"
                  >
                    pH {row.ph} → {row.hPlus}
                  </span>
                ))}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                ΔPCO2 12 mmHg ⇆ ΔpH 0.1 ⇆ ΔBE 6 mEq/L (Baseline: PCO2 40 ⇆ pH 7.40 ⇆ BE 0).
              </p>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-hairline)] leading-relaxed">
              {BLOODGAS_UI_TEXT.refsCitation[lang]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
