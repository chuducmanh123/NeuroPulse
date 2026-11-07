"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type {
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
  ClinicalScenario,
  PivotalTrialRecord,
  RecommendationLabelOutput,
  OntologyFacetId,
  NavigatorQuery,
  NormalizedTier,
} from "../../types/neuroguide";
import { TIER_CONFIG } from "../../types/neuroguide";
import type { Article } from "../../types/article";
import { STROKE_ONTOLOGY } from "../../lib/neuroguide/ontologyValidator";
import {
  runClinicalNavigatorQuery,
  NAVIGATOR_QUICK_PRESETS,
  type IndexedNavigatorRecommendation,
} from "../../lib/neuroguide/clinicalNavigatorEngine";
import { PivotalTrialModal } from "./PivotalTrialModal";
import { getAdminHeaders } from "@/utils/clientAuth";

interface ClinicalNavigatorTabProps {
  guidelines: GuidelineDoc[];
  recommendationAtoms: RecommendationAtom[];
  conferences: ConferenceEvent[];
  scenarios: ClinicalScenario[];
  pivotalTrials: PivotalTrialRecord[];
  customRecLabels: Record<string, RecommendationLabelOutput>;
  neuroPulseArticles: Article[];
  isAdminVerified: boolean;
  initialPresetOrQuery?: NavigatorQuery | null;
  onPivotalTrialsUpdated: (trials: PivotalTrialRecord[]) => void;
  onScenarioSaved?: (scenarios: ClinicalScenario[], atoms: RecommendationAtom[]) => void;
}

const ORDERED_FACETS: OntologyFacetId[] = [
  "condition",
  "phase",
  "intervention_type",
  "drug_or_procedure",
  "time_window",
  "age_group",
  "special_populations",
  "outcome_target",
  "direction",
];

type RightSectionFilter =
  | "ALL"
  | "MATRIX"
  | "DIFF"
  | "TRIALS"
  | "CONCORDANCE"
  | "LITERATURE";

function getSocietyBadgeStyle(society: string): string {
  const s = (society || "").toUpperCase();
  if (s.includes("AHA") || s.includes("ASA")) {
    return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
  }
  if (s.includes("ESO")) {
    return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
  }
  if (s.includes("VN") || s.includes("MOH")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (s.includes("NCS")) {
    return "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800";
  }
  if (s.includes("AAN") || s.includes("ILAE")) {
    return "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800";
  }
  return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700";
}

function getDirectionBadge(dir: string) {
  switch (dir) {
    case "for":
      return {
        label: "Recommended (FOR)",
        cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      };
    case "against":
      return {
        label: "Harm / Contraindicated (AGAINST)",
        cls: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      };
    case "no_benefit":
      return {
        label: "No Benefit (Class III)",
        cls: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
      };
    case "uncertain":
      return {
        label: "Uncertain / Conditional",
        cls: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800",
      };
    default:
      return {
        label: "Mixed / Nuanced",
        cls: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
      };
  }
}

export function ClinicalNavigatorTab({
  guidelines,
  recommendationAtoms,
  conferences,
  scenarios,
  pivotalTrials,
  customRecLabels,
  neuroPulseArticles,
  isAdminVerified,
  initialPresetOrQuery,
  onPivotalTrialsUpdated,
  onScenarioSaved,
}: ClinicalNavigatorTabProps) {
  // Query State (Defaults to first preset so the user immediately sees a rich synthesis)
  const [searchText, setSearchText] = useState<string>(
    initialPresetOrQuery?.searchText || ""
  );
  const [selectedFacets, setSelectedFacets] = useState<
    Partial<Record<OntologyFacetId, string[]>>
  >(
    initialPresetOrQuery?.facets || NAVIGATOR_QUICK_PRESETS[0].query.facets
  );
  const [selectedSocieties, setSelectedSocieties] = useState<string[]>(
    initialPresetOrQuery?.societies || []
  );
  const [includeAiChecked, setIncludeAiChecked] = useState<boolean>(
    initialPresetOrQuery?.includeAiChecked ?? true
  );
  const [onlyPracticeChanges, setOnlyPracticeChanges] = useState<boolean>(
    initialPresetOrQuery?.onlyPracticeChanges ?? false
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(
    initialPresetOrQuery ? null : NAVIGATOR_QUICK_PRESETS[0].id
  );

  // UI Collapsible & Section States
  const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>({
    condition: true,
    phase: false,
    intervention_type: true,
    drug_or_procedure: true,
    time_window: false,
    age_group: false,
    special_populations: false,
    outcome_target: false,
    direction: false,
  });
  const [sectionView, setSectionView] = useState<RightSectionFilter>("ALL");
  const [showSupportingBySociety, setShowSupportingBySociety] = useState<
    Record<string, boolean>
  >({});

  // Admin Modals
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [editingTrial, setEditingTrial] = useState<PivotalTrialRecord | null>(null);
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const activeQuery: NavigatorQuery = useMemo(
    () => ({
      searchText,
      facets: selectedFacets,
      societies: selectedSocieties.length > 0 ? selectedSocieties : undefined,
      includeAiChecked,
      onlyPracticeChanges,
    }),
    [searchText, selectedFacets, selectedSocieties, includeAiChecked, onlyPracticeChanges]
  );

  // Execute memoized Clinical Navigator Engine
  const navResult = useMemo(() => {
    return runClinicalNavigatorQuery({
      guidelines,
      recommendationAtoms,
      conferences,
      scenarios,
      customPivotalTrials: pivotalTrials,
      customRecLabels,
      neuroPulseArticles,
      query: activeQuery,
    });
  }, [
    guidelines,
    recommendationAtoms,
    conferences,
    scenarios,
    pivotalTrials,
    customRecLabels,
    neuroPulseArticles,
    activeQuery,
  ]);

  const handleApplyPreset = (presetId: string) => {
    const preset = NAVIGATOR_QUICK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setSearchText(preset.query.searchText || "");
    setSelectedFacets(preset.query.facets || {});
    setSelectedSocieties(preset.query.societies || []);
    setIncludeAiChecked(preset.query.includeAiChecked ?? true);
    setOnlyPracticeChanges(preset.query.onlyPracticeChanges ?? false);
  };

  const handleToggleFacetValue = (facetId: OntologyFacetId, valueId: string) => {
    setActivePresetId(null);
    setSelectedFacets((prev) => {
      const current = prev[facetId] || [];
      const exists = current.includes(valueId);
      const next = exists ? current.filter((v) => v !== valueId) : [...current, valueId];
      const copy = { ...prev };
      if (next.length === 0) {
        delete copy[facetId];
      } else {
        copy[facetId] = next;
      }
      return copy;
    });
  };

  const handleClearAllFilters = () => {
    setActivePresetId(null);
    setSearchText("");
    setSelectedFacets({});
    setSelectedSocieties([]);
    setOnlyPracticeChanges(false);
  };

  const handleToggleSociety = (soc: string) => {
    setSelectedSocieties((prev) =>
      prev.includes(soc) ? prev.filter((s) => s !== soc) : [...prev, soc]
    );
  };

  // Active Filter Chips for Top Bar
  const activeFilterChips = useMemo(() => {
    const chips: { facetId: OntologyFacetId; valueId: string; labelEn: string }[] = [];
    for (const [fid, vals] of Object.entries(selectedFacets) as [OntologyFacetId, string[]][]) {
      const fDef = STROKE_ONTOLOGY.facets[fid];
      for (const vid of vals || []) {
        const vDef = fDef?.values.find((x) => x.id === vid);
        chips.push({
          facetId: fid,
          valueId: vid,
          labelEn: vDef?.label_en || vDef?.label_vi || vid,
        });
      }
    }
    return chips;
  }, [selectedFacets]);

  const handleSaveAsScenario = async () => {
    if (navResult.coreRecommendations.length === 0) return;
    setIsSavingScenario(true);
    setStatusBanner(null);
    try {
      const titleFromChips =
        activeFilterChips.length > 0
          ? activeFilterChips.map((c) => c.labelEn).join(" • ")
          : searchText.trim() || "Custom Clinical Navigator Synthesis";

      const scenarioId = `sc-nav-${Date.now()}`;
      const topRecs = navResult.coreRecommendations.slice(0, 10);
      const newAtoms: RecommendationAtom[] = topRecs.map((r, i) => ({
        id: `atom-nav-${Date.now()}-${i}`,
        scenarioId,
        guidelineDocId: r.guidelineId,
        society: r.society,
        year: r.year,
        originalGrade: r.rawGrade,
        normalizedTier: r.normalizedTier,
        recommendationText: r.text,
        eligibilityCriteria: r.sectionPath,
        citedTrials: r.drivingTrials.length > 0 ? r.drivingTrials : ["Guideline Consensus"],
        isLatestForSociety: true,
        notes: r.officialUrl,
      }));

      const consensusMap = {
        HIGH_CONCORDANCE: "HIGH_CONCORDANCE",
        SINGLE_SOCIETY_EVIDENCE: "HIGH_CONCORDANCE",
        MODERATE_VARIATION: "MODERATE_VARIATION",
        MAJOR_DIVERGENCE: "MAJOR_DIVERGENCE",
        NO_MATCHING_EVIDENCE: "MODERATE_VARIATION",
      } as const;

      const newScenario: ClinicalScenario = {
        id: scenarioId,
        title: titleFromChips,
        titleEn: titleFromChips,
        subspecialty: topRecs[0]?.subspecialty || "Stroke",
        summary: navResult.concordanceAppraisal.headline,
        keyTags: activeFilterChips.map((c) => c.labelEn).slice(0, 6),
        statusBadge: "PRACTICE_CHANGING",
        aiSynthesisAppraisal: {
          consensusLevel: consensusMap[navResult.concordanceAppraisal.consensusLevel],
          whyGuidelinesDiffer: navResult.concordanceAppraisal.divergencePoints.join(" "),
          clinicalBottomLine: navResult.concordanceAppraisal.clinicalBottomLine,
          lastAppraisedAt: new Date().toISOString().slice(0, 10),
        },
        temporalEvolution: navResult.intraSocietyDiffs.slice(0, 5).map((d) => ({
          society: d.society,
          previousYear: d.previousYear || d.currentYear - 4,
          previousGrade: d.previousGrade,
          currentYear: d.currentYear,
          currentGrade: d.currentGrade,
          shiftDirection: d.shiftDirection,
          drivingTrials: d.drivingTrials,
          evolutionNarrative: d.currentText,
        })),
        ecosystemLinks: navResult.ecosystemLinks,
      };

      const res = await fetch("/api/neuroguide/navigator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({
          action: "save_scenario",
          scenario: newScenario,
          recommendationAtoms: newAtoms,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusBanner({
          type: "success",
          text: `Saved "${newScenario.title}" to Clinical Scenarios!`,
        });
        if (onScenarioSaved && data.scenarios && data.recommendationAtoms) {
          onScenarioSaved(data.scenarios, data.recommendationAtoms);
        }
      } else {
        setStatusBanner({
          type: "error",
          text: data.error || "Failed to save query as Clinical Scenario.",
        });
      }
    } catch (err: any) {
      setStatusBanner({
        type: "error",
        text: err?.message || "Network error while saving Clinical Scenario.",
      });
    } finally {
      setIsSavingScenario(false);
    }
  };

  const concordanceTheme = useMemo(() => {
    switch (navResult.concordanceAppraisal.consensusLevel) {
      case "HIGH_CONCORDANCE":
        return {
          badge: "HIGH INTERNATIONAL CONCORDANCE",
          bg: "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/70",
          pill: "bg-emerald-600 text-white",
          text: "text-emerald-900 dark:text-emerald-200",
        };
      case "MODERATE_VARIATION":
        return {
          badge: "MODERATE VARIATION IN GRADING / THRESHOLDS",
          bg: "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70",
          pill: "bg-amber-500 text-white",
          text: "text-amber-900 dark:text-amber-200",
        };
      case "MAJOR_DIVERGENCE":
        return {
          badge: "MAJOR CROSS-SOCIETY DIVERGENCE",
          bg: "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/70",
          pill: "bg-rose-600 text-white",
          text: "text-rose-900 dark:text-rose-200",
        };
      case "SINGLE_SOCIETY_EVIDENCE":
        return {
          badge: "SINGLE-SOCIETY GUIDELINE COVERAGE",
          bg: "bg-sky-50/70 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800/70",
          pill: "bg-sky-600 text-white",
          text: "text-sky-900 dark:text-sky-200",
        };
      default:
        return {
          badge: "NO MATCHING RECOMMENDATIONS",
          bg: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800",
          pill: "bg-slate-600 text-white",
          text: "text-slate-700 dark:text-slate-300",
        };
    }
  }, [navResult.concordanceAppraisal.consensusLevel]);

  return (
    <div className="space-y-6">
      {/* Top Intro Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 shadow-lg border border-indigo-500/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                🧭 Clinical Navigator • Ontology v{STROKE_ONTOLOGY.ontology_version}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {navResult.totalIndexedCount} Verbatim Recommendations Indexed
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                {pivotalTrials.length} Landmark & Late-Breaking Trials
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
              Evidence-Based Guideline & Pivotal Trial Navigator
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Query across international neurology guidelines (AHA/ASA, ESO, VN-MOH, AAN, NCS, ILAE) using controlled 9-facet clinical ontology tags, inspect intra-society version shifts, review compact PICO landmark trials, and evaluate deterministic evidence concordance.
            </p>
          </div>

          {isAdminVerified && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingTrial(null);
                  setIsTrialModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
              >
                <span>＋</span> Add Pivotal Trial
              </button>
              <button
                type="button"
                onClick={handleSaveAsScenario}
                disabled={isSavingScenario || navResult.coreRecommendations.length === 0}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow transition flex items-center gap-1.5"
              >
                <span>💾</span>{" "}
                {isSavingScenario ? "Saving..." : "Save Query as Scenario"}
              </button>
            </div>
          )}
        </div>

        {statusBanner && (
          <div
            className={`mt-4 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              statusBanner.type === "success"
                ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
                : "bg-rose-500/20 text-rose-200 border border-rose-400/40"
            }`}
          >
            <span>{statusBanner.text}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-white/70 hover:text-white ml-4"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Main 12-Column Split Layout: Left Search & Facets (4 cols) | Right Evidence Synthesis (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Search, Quick Clinical Presets & 9-Facet Ontology Explorer */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          {/* 1. Keyword / Trial / Drug Search Box */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                🔍 Search Keywords, Drugs, or Trials
              </label>
              {(searchText || activeFilterChips.length > 0 || selectedSocieties.length > 0) && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setActivePresetId(null);
                  setSearchText(e.target.value);
                }}
                placeholder="e.g., Tenecteplase, SELECT2, Nimodipine, MeVO, DAPT..."
                className="w-full pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Verification & Practice-Change Toggles */}
            <div className="pt-1 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Verification Level:
                </span>
                <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIncludeAiChecked(true)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                      includeAiChecked
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    All Verified (AI + Clinician)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIncludeAiChecked(false)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                      !includeAiChecked
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Clinician Approved Only
                  </button>
                </div>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Only New / Upgraded / Revised Recs:
                </span>
                <input
                  type="checkbox"
                  checked={onlyPracticeChanges}
                  onChange={(e) => setOnlyPracticeChanges(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
              </label>
            </div>

            {/* Society Filter Pills */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                Filter by Guideline Society:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedSocieties([])}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                    selectedSocieties.length === 0
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  ALL ({navResult.availableSocieties.length})
                </button>
                {navResult.availableSocieties.map((soc) => {
                  const active = selectedSocieties.includes(soc);
                  return (
                    <button
                      key={soc}
                      type="button"
                      onClick={() => handleToggleSociety(soc)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        active
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      {soc}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Quick Clinical Presets */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                ⚡ High-Yield Clinical Topics
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">1-Click Presets</span>
            </div>
            <div className="space-y-1.5">
              {NAVIGATOR_QUICK_PRESETS.map((preset) => {
                const isSelected = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition flex flex-col gap-1 ${
                      isSelected
                        ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-500 shadow-sm"
                        : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                        {preset.title}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 shrink-0">
                        {preset.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {preset.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. 9-Facet Controlled Ontology Explorer */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                🧬 9-Facet Clinical Ontology Filter
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                AND across facets • OR within
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {ORDERED_FACETS.map((facetId) => {
                const facetDef = STROKE_ONTOLOGY.facets[facetId];
                if (!facetDef) return null;
                const isExpanded = Boolean(expandedFacets[facetId]);
                const selectedForFacet = selectedFacets[facetId] || [];
                const countsForFacet = navResult.facetValueCounts[facetId] || {};

                return (
                  <div key={facetId} className="py-2 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFacets((prev) => ({
                          ...prev,
                          [facetId]: !prev[facetId],
                        }))
                      }
                      className="w-full flex items-center justify-between py-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {facetDef.label_en || facetId}
                        </span>
                        {selectedForFacet.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                            {selectedForFacet.length}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {isExpanded ? "▾" : "▸"}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {facetDef.values
                          .filter((v) => v.id !== "unspecified")
                          .map((val) => {
                            const isChecked = selectedForFacet.includes(val.id);
                            const count = countsForFacet[val.id] || 0;
                            return (
                              <button
                                key={val.id}
                                type="button"
                                onClick={() => handleToggleFacetValue(facetId, val.id)}
                                title={val.def}
                                className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition flex items-center gap-1.5 ${
                                  isChecked
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                    : count > 0
                                    ? "bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                                    : "bg-slate-50/40 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800/60"
                                }`}
                              >
                                <span>{val.label_en || val.label_vi}</span>
                                <span
                                  className={`text-[10px] px-1 rounded ${
                                    isChecked
                                      ? "bg-indigo-500 text-white"
                                      : "bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  {count}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT PANE: 5-Section Evidence Synthesis Dashboard */}
        <section className="lg:col-span-8 space-y-6">
          {/* Active Query & KPI Summary Bar */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            {/* Active Filter Chips */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Active Query:
                </span>
                {searchText && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    Keyword: &ldquo;{searchText}&rdquo;
                    <button
                      type="button"
                      onClick={() => setSearchText("")}
                      className="hover:text-rose-600"
                    >
                      ×
                    </button>
                  </span>
                )}
                {activeFilterChips.map((chip) => (
                  <span
                    key={`${chip.facetId}:${chip.valueId}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800"
                  >
                    <span className="text-[10px] uppercase text-indigo-500 dark:text-indigo-400">
                      {chip.facetId.replace(/_/g, " ")}:
                    </span>
                    {chip.labelEn}
                    <button
                      type="button"
                      onClick={() => handleToggleFacetValue(chip.facetId, chip.valueId)}
                      className="hover:text-rose-600 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {!searchText && activeFilterChips.length === 0 && (
                  <span className="text-xs text-slate-500 italic">
                    Showing all indexed guideline recommendations across societies
                  </span>
                )}
              </div>

              {/* Ecosystem Quick Links (Calculators / NeuroCase) */}
              {navResult.ecosystemLinks.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {navResult.ecosystemLinks.slice(0, 2).map((link, idx) => (
                    <Link
                      key={`${link.app}-${idx}`}
                      href={link.href}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition"
                    >
                      🔗 {link.label} →
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Section View Switcher Tabs */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {(
                [
                  {
                    id: "ALL",
                    label: "All 5 Synthesis Sections",
                    count: null,
                  },
                  {
                    id: "MATRIX",
                    label: "1. Cross-Society Matrix",
                    count: navResult.coreRecommendations.length,
                  },
                  {
                    id: "DIFF",
                    label: "2. Version Evolution",
                    count: navResult.intraSocietyDiffs.length,
                  },
                  {
                    id: "TRIALS",
                    label: "3. Pivotal Trials",
                    count:
                      navResult.pivotalTrials.length +
                      navResult.lateBreakingTrials.length,
                  },
                  {
                    id: "CONCORDANCE",
                    label: "4. Evidence Concordance",
                    count: navResult.concordanceAppraisal.societyStances.length,
                  },
                  {
                    id: "LITERATURE",
                    label: "5. NeuroPulse Literature",
                    count: navResult.relatedArticles.length,
                  },
                ] as const
              ).map((tab) => {
                const active = sectionView === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSectionView(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          active
                            ? "bg-indigo-500 text-white"
                            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* =====================================================================
              SECTION 1: CROSS-SOCIETY GUIDELINE MATRIX
             ===================================================================== */}
          {(sectionView === "ALL" || sectionView === "MATRIX") && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🏛️ 1. Cross-Society Guideline Matrix</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                      {navResult.coreRecommendations.length} Core •{" "}
                      {navResult.supportingRecommendations.length} Supporting
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Side-by-side comparison across societies. Original COR/LOE and GRADE levels are preserved verbatim alongside Normalized Evidence Tiers (1–5).
                  </p>
                </div>
              </div>

              {navResult.crossSocietyMatrix.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No core guideline recommendations matched this exact filter combination.
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Try removing one ontology facet filter or selecting a High-Yield Clinical Preset on the left.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {navResult.crossSocietyMatrix.map((socGroup) => {
                    const tierMeta =
                      TIER_CONFIG[socGroup.highestTier] || TIER_CONFIG[2];
                    const dirMeta = getDirectionBadge(socGroup.dominantDirection);
                    const showSupporting = Boolean(
                      showSupportingBySociety[socGroup.society]
                    );

                    return (
                      <div
                        key={socGroup.society}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                      >
                        {/* Society Group Header */}
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${getSocietyBadgeStyle(
                                socGroup.society
                              )}`}
                            >
                              {socGroup.society}
                            </span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                               Editions: {socGroup.yearsPresent.join(", ")}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${dirMeta.cls}`}
                            >
                              {dirMeta.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tierMeta.badgeBg} ${tierMeta.textColor} ${tierMeta.borderColor}`}
                            >
                              Highest: Tier {tierMeta.tier}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {socGroup.coreRecommendations.length} Core Recs
                            </span>
                          </div>
                        </div>

                        {/* Core Recommendations List */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {socGroup.coreRecommendations.map((rec) => (
                            <RecommendationMatrixCard
                              key={rec.recId}
                              rec={rec}
                            />
                          ))}
                        </div>

                        {/* Supporting Context Recommendations Toggle */}
                        {socGroup.supportingRecommendations.length > 0 && (
                          <div className="bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() =>
                                setShowSupportingBySociety((prev) => ({
                                  ...prev,
                                  [socGroup.society]: !prev[socGroup.society],
                                }))
                              }
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                            >
                              <span>{showSupporting ? "▾" : "▸"}</span>
                              <span>
                                {showSupporting ? "Hide" : "Show"}{" "}
                                {socGroup.supportingRecommendations.length} Supporting
                                Same-Section / Related PICO Recommendations
                              </span>
                            </button>
                            {showSupporting && (
                              <div className="mt-3 space-y-2.5">
                                {socGroup.supportingRecommendations.map((sRec) => (
                                  <RecommendationMatrixCard
                                    key={sRec.recId}
                                    rec={sRec}
                                    isSupporting
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              SECTION 2: SEQUENTIAL GUIDELINE DIFF (INTRA-SOCIETY EVOLUTION)
             ===================================================================== */}
          {(sectionView === "ALL" || sectionView === "DIFF") && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>📈 2. Sequential Guideline Diff (Intra-Society Version Evolution)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                    {navResult.intraSocietyDiffs.length} Practice Shifts
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tracks how recommendations within the same society evolved from prior editions to the latest guideline release, highlighting the pivotal trials that drove each upgrade or revision.
                </p>
              </div>

              {navResult.intraSocietyDiffs.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">
                  No intra-society version upgrades or revisions recorded for this filter selection.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {navResult.intraSocietyDiffs.map((diff) => {
                    const shiftBadge =
                      diff.shiftDirection === "UPGRADED"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : diff.shiftDirection === "NEW"
                        ? "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : diff.shiftDirection === "DOWNGRADED"
                        ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
                        : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300";

                    return (
                      <div
                        key={diff.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-extrabold border ${getSocietyBadgeStyle(
                                diff.society
                              )}`}
                            >
                              {diff.society}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${shiftBadge}`}
                            >
                              {diff.shiftDirection}
                            </span>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {diff.topic}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            [{diff.sourceRecId}]
                          </span>
                        </div>

                        {/* Grade Evolution Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold uppercase text-slate-400">
                                {diff.previousYear
                                  ? `Previous Edition (${diff.previousYear})`
                                  : "Previous Guideline Stance"}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {diff.previousGrade}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {diff.previousText ||
                                "Not previously established or carried a lower/conditional recommendation."}
                            </p>
                          </div>

                          <div className="p-3 rounded-lg bg-indigo-50/40 dark:bg-indigo-950/25 border border-indigo-200 dark:border-indigo-900/60">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-bold uppercase text-indigo-700 dark:text-indigo-300">
                                Current Edition ({diff.currentYear})
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-600 text-white">
                                {diff.currentGrade}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                              {diff.currentText}
                            </p>
                          </div>
                        </div>

                        {diff.drivingTrials.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[11px] font-bold text-slate-500">
                              Driving Trials:
                            </span>
                            {diff.drivingTrials.map((tr) => (
                              <span
                                key={tr}
                                className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              >
                                🔬 {tr}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              SECTION 3: PIVOTAL TRIALS & CONFERENCE EVIDENCE BRIDGE
             ===================================================================== */}
          {(sectionView === "ALL" || sectionView === "TRIALS") && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🔬 3. Pivotal Clinical Trials & Late-Breaking Evidence Bridge</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      {navResult.pivotalTrials.length} Published •{" "}
                      {navResult.lateBreakingTrials.length} Late-Breaking
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ultra-compact PICO cards (~700 bytes/trial) storing quantitative primary efficacy and safety endpoints for landmark RCTs driving current guideline recommendations.
                  </p>
                </div>
                {isAdminVerified && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTrial(null);
                      setIsTrialModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0"
                  >
                    ＋ Add Landmark Trial
                  </button>
                )}
              </div>

              {/* 3A. Peer-Reviewed Published Landmark Trials */}
              {navResult.pivotalTrials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {navResult.pivotalTrials.map((trial) => (
                    <PivotalTrialCard
                      key={trial.id}
                      trial={trial}
                      isAdminVerified={isAdminVerified}
                      onEdit={(t) => {
                        setEditingTrial(t);
                        setIsTrialModalOpen(true);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  No peer-reviewed pivotal trials matched the active filter tags.
                </p>
              )}

              {/* 3B. Conference Late-Breaking Trials */}
              {navResult.lateBreakingTrials.length > 0 && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      🎙️ Conference / Late-Breaking Evidence (Pre-Guideline Integration)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {navResult.lateBreakingTrials.map((trial) => (
                      <PivotalTrialCard
                        key={trial.id}
                        trial={trial}
                        isAdminVerified={isAdminVerified}
                        onEdit={(t) => {
                          setEditingTrial(t);
                          setIsTrialModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              SECTION 4: EVIDENCE CONCORDANCE & APPRAISAL SUMMARY
             ===================================================================== */}
          {(sectionView === "ALL" || sectionView === "CONCORDANCE") && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  ⚖️ 4. Cross-Society Evidence Concordance & Appraisal Summary
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Deterministic evaluation of agreement and divergence across societies. Disagreements are never auto-reconciled; every synthesis statement cites its underlying recommendation IDs.
                </p>
              </div>

              {/* Concordance Headline Banner */}
              <div
                className={`p-4 rounded-xl border ${concordanceTheme.bg} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${concordanceTheme.pill}`}
                    >
                      {concordanceTheme.badge}
                    </span>
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                      Concordance Score: {navResult.concordanceAppraisal.concordanceScore}%
                    </span>
                  </div>
                  <p className={`text-sm font-bold ${concordanceTheme.text}`}>
                    {navResult.concordanceAppraisal.headline}
                  </p>
                </div>
              </div>

              {/* Society Stance Comparison Table */}
              {navResult.concordanceAppraisal.societyStances.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3 font-bold">Society</th>
                        <th className="py-2.5 px-3 font-bold">Latest Year</th>
                        <th className="py-2.5 px-3 font-bold">Core Recs</th>
                        <th className="py-2.5 px-3 font-bold">Dominant Stance</th>
                        <th className="py-2.5 px-3 font-bold">Highest Evidence Tier</th>
                        <th className="py-2.5 px-3 font-bold">Original Grades Present</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {navResult.concordanceAppraisal.societyStances.map((st) => {
                        const dirMeta = getDirectionBadge(st.dominantDirection);
                        const tierMeta =
                          TIER_CONFIG[st.highestTier] || TIER_CONFIG[2];
                        return (
                          <tr
                            key={st.society}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                          >
                            <td className="py-2.5 px-3 font-extrabold">
                              <span
                                className={`px-2 py-0.5 rounded border ${getSocietyBadgeStyle(
                                  st.society
                                )}`}
                              >
                                {st.society}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-700 dark:text-slate-300">
                              {st.latestYear}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                              {st.recCount}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${dirMeta.cls}`}
                              >
                                {dirMeta.label}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold border ${tierMeta.badgeBg} ${tierMeta.textColor} ${tierMeta.borderColor}`}
                              >
                                Tier {tierMeta.tier}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-medium">
                              {st.rawGradesSummary.slice(0, 3).join(" • ")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Points of Agreement & Points of Divergence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    ✓ Points of Cross-Society Agreement
                  </h4>
                  {navResult.concordanceAppraisal.agreementPoints.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Single society or insufficient multi-society overlap.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                      {navResult.concordanceAppraisal.agreementPoints.map((pt, i) => (
                        <li key={i} className="leading-relaxed">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    ⚡ Nuances & Cross-Society Divergence
                  </h4>
                  {navResult.concordanceAppraisal.divergencePoints.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No directional conflicts detected across matched guidelines.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 list-disc pl-4">
                      {navResult.concordanceAppraisal.divergencePoints.map((pt, i) => (
                        <li key={i} className="leading-relaxed">
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Clinical Bottom Line */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                  🎯 Grounded Clinical Bottom Line
                </div>
                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                  {navResult.concordanceAppraisal.clinicalBottomLine}
                </p>
              </div>
            </div>
          )}

          {/* =====================================================================
              SECTION 5: RELATED NEUROPULSE LITERATURE
             ===================================================================== */}
          {(sectionView === "ALL" || sectionView === "LITERATURE") && (
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📰 5. Related NeuroPulse Literature</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                      {navResult.relatedArticles.length} Articles Matched
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Recent peer-reviewed studies from the NeuroPulse literature feed matching the active clinical condition, drug/procedure, or pivotal trial DOIs.
                  </p>
                </div>
                <Link
                  href="/"
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                >
                  Open NeuroPulse Feed →
                </Link>
              </div>

              {navResult.relatedArticles.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">
                  No matching articles found in the local NeuroPulse feed for this filter combination.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {navResult.relatedArticles.map(({ article, matchReasons }) => (
                    <div
                      key={article.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                            {article.journal?.short_name || article.journal?.name || "Journal"}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {article.pub_date} • {article.article_type}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                          {article.title}
                        </h4>

                        {(article.ai_takeaways?.clinical_significance || article.abstract) && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {article.ai_takeaways?.clinical_significance || article.abstract}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap gap-1">
                          {matchReasons.map((reason) => (
                            <span
                              key={reason}
                              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                        {article.doi_url && (
                          <a
                            href={article.doi_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            DOI / Source ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Admin Add/Edit Pivotal Trial Modal */}
      <PivotalTrialModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        initialTrial={editingTrial}
        defaultOntologyTags={selectedFacets}
        onSaved={(updatedTrials, saved) => {
          onPivotalTrialsUpdated(updatedTrials);
          setStatusBanner({
            type: "success",
            text: `Saved pivotal trial "${saved.acronym} (${saved.year})" to NeuroGuide storage!`,
          });
        }}
      />
    </div>
  );
}

/* ============================================================================
   SUB-COMPONENT: RecommendationMatrixCard
   ============================================================================ */
function RecommendationMatrixCard({
  rec,
  isSupporting = false,
}: {
  rec: IndexedNavigatorRecommendation;
  isSupporting?: boolean;
}) {
  const tierMeta = TIER_CONFIG[rec.normalizedTier] || TIER_CONFIG[2];
  const dirValue = rec.labels.labels.direction?.value || "for";
  const dirMeta = getDirectionBadge(dirValue);

  // Collect verbatim evidence spans across facets to display grounded provenance chips
  const evidenceChips = useMemo(() => {
    const chips: { facet: string; labelEn: string; span: string }[] = [];
    for (const [fid, items] of Object.entries(rec.labels.labels)) {
      if (fid === "direction") continue;
      if (!Array.isArray(items)) continue;
      const fDef = STROKE_ONTOLOGY.facets[fid as OntologyFacetId];
      for (const it of items) {
        if (it.value === "unspecified" || !it.evidence_span) continue;
        const vDef = fDef?.values.find((x) => x.id === it.value);
        chips.push({
          facet: fid,
          labelEn: vDef?.label_en || it.value,
          span: it.evidence_span,
        });
      }
    }
    return chips.slice(0, 6);
  }, [rec.labels]);

  return (
    <div
      className={`p-4 space-y-2.5 ${
        isSupporting
          ? "rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          : "bg-white dark:bg-slate-900"
      }`}
    >
      {/* Top Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Original Grade Badge */}
          <span className="px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
            {rec.rawGrade}
          </span>

          {/* Normalized Tier Badge */}
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${tierMeta.badgeBg} ${tierMeta.textColor} ${tierMeta.borderColor}`}
          >
            Tier {tierMeta.tier}
          </span>

          {/* Direction Badge */}
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${dirMeta.cls}`}
          >
            {dirMeta.label}
          </span>

          {/* Practice Change Status */}
          {rec.changeType !== "STANDARD" && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
              {rec.changeType}
            </span>
          )}
        </div>

        {/* Verification Badge + Rec ID */}
        <div className="flex items-center gap-2">
          {rec.validationStatus === "human_approved" ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              ✓ Clinician Approved
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
              🛡️ AI Checked (Verbatim Span Verified)
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-400">
            [{rec.recId}]
          </span>
        </div>
      </div>

      {/* Section / PICO Provenance */}
      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
        <span>
          {rec.guidelineTitle} ({rec.year})
        </span>
        <span>•</span>
        <span className="text-slate-700 dark:text-slate-300">
          {rec.sectionPath}
        </span>
        {rec.picoNumber && (
          <>
            <span>•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              PICO #{rec.picoNumber}
            </span>
          </>
        )}
      </div>

      {/* Verbatim Recommendation Statement */}
      <blockquote className="pl-3 border-l-2 border-indigo-500 text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium leading-relaxed">
        &ldquo;{rec.text}&rdquo;
      </blockquote>

      {rec.expertConsensusStatement && (
        <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300">
          <span className="font-bold text-indigo-700 dark:text-indigo-300">
            Expert Consensus Companion:{" "}
          </span>
          {rec.expertConsensusStatement}
        </div>
      )}

      {/* Grounded Evidence Span Chips & Cited Trials */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {evidenceChips.map((chip, idx) => (
            <span
              key={`${chip.facet}-${idx}`}
              title={`Verbatim span: "${chip.span}"`}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            >
              <strong className="text-indigo-600 dark:text-indigo-400">
                {chip.labelEn}:
              </strong>{" "}
              &ldquo;{chip.span}&rdquo;
            </span>
          ))}

          {rec.drivingTrials.map((tr) => (
            <span
              key={tr}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
            >
              🔬 {tr}
            </span>
          ))}
        </div>

        {rec.officialUrl && (
          <a
            href={rec.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
          >
            Official Guideline ↗
          </a>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   SUB-COMPONENT: PivotalTrialCard
   ============================================================================ */
function PivotalTrialCard({
  trial,
  isAdminVerified,
  onEdit,
}: {
  trial: PivotalTrialRecord;
  isAdminVerified: boolean;
  onEdit: (t: PivotalTrialRecord) => void;
}) {
  const verdictStyle =
    trial.primaryEndpoint.verdict === "POSITIVE"
      ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
      : trial.primaryEndpoint.verdict === "NON_INFERIOR"
      ? "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300"
      : trial.primaryEndpoint.verdict === "NEGATIVE"
      ? "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300"
      : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300";

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 flex flex-col justify-between gap-3">
      <div className="space-y-2.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300">
                {trial.acronym}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                ({trial.journal} {trial.year})
              </span>
              {trial.sampleSize && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                  N={trial.sampleSize.toLocaleString()}
                </span>
              )}
              {trial.evidenceSource === "CONFERENCE_LATE_BREAKING" && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500 text-white">
                  LATE-BREAKING
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 line-clamp-2">
              {trial.title}
            </p>
          </div>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold border shrink-0 ${verdictStyle}`}
          >
            {trial.primaryEndpoint.verdict.replace("_", "-")}
          </span>
        </div>

        {/* Compact PICO Box */}
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1">
          <div>
            <strong className="text-slate-500">P:</strong>{" "}
            <span className="text-slate-800 dark:text-slate-200">
              {trial.pico.population}
            </span>
          </div>
          <div>
            <strong className="text-indigo-600 dark:text-indigo-400">I:</strong>{" "}
            <span className="text-slate-800 dark:text-slate-200 font-medium">
              {trial.pico.intervention}
            </span>{" "}
            <strong className="text-slate-400">vs. C:</strong>{" "}
            <span className="text-slate-600 dark:text-slate-400">
              {trial.pico.comparator}
            </span>
          </div>
        </div>

        {/* Primary & Safety Endpoints */}
        <div className="space-y-1 text-xs">
          <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/50">
            <span className="font-bold text-emerald-800 dark:text-emerald-300">
              Primary ({trial.primaryEndpoint.metric}):{" "}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {trial.primaryEndpoint.resultStats}
            </span>
          </div>

          {(trial.safetyEndpoint.sICH ||
            trial.safetyEndpoint.mortality90d ||
            trial.safetyEndpoint.note) && (
            <div className="px-2 py-1 text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
              {trial.safetyEndpoint.sICH && (
                <span>
                  <strong>sICH:</strong> {trial.safetyEndpoint.sICH}
                </span>
              )}
              {trial.safetyEndpoint.mortality90d && (
                <span>
                  <strong>90d Mortality:</strong>{" "}
                  {trial.safetyEndpoint.mortality90d}
                </span>
              )}
              {trial.safetyEndpoint.note && (
                <span>• {trial.safetyEndpoint.note}</span>
              )}
            </div>
          )}
        </div>

        {/* Bottom Line */}
        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
          💡 {trial.bottomLine}
        </p>
      </div>

      {/* Footer Links */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 dark:border-slate-800 text-[11px]">
        <div className="flex items-center gap-3">
          {trial.pmid && (
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${trial.pmid}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              PMID: {trial.pmid} ↗
            </a>
          )}
          {trial.doi && (
            <a
              href={`https://doi.org/${trial.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-slate-600 dark:text-slate-400 hover:underline"
            >
              DOI ↗
            </a>
          )}
        </div>

        {isAdminVerified && (
          <button
            type="button"
            onClick={() => onEdit(trial)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            ✎ Edit Trial
          </button>
        )}
      </div>
    </div>
  );
}
