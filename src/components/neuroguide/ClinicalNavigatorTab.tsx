"use client";

import React, { useState, useMemo, useDeferredValue, useEffect } from "react";
import Link from "next/link";
import type {
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
  PivotalTrialRecord,
  RecommendationLabelOutput,
  NavigatorQuery,
  SubspecialtyType,
} from "../../types/neuroguide";
import { TIER_CONFIG } from "../../types/neuroguide";
import type { Article } from "../../types/article";
import {
  NAVIGATOR_SUBSPECIALTIES_V3,
  DIAGNOSIS_CATEGORIES_V3,
  getConditionsForSubspecialtyV3,
  getConditionByIdV3,
  getTreatmentSchemaForScopeV3,
  getPreventionSchemaForScopeV3,
  getTagLabelByIdV3,
  type Subspecialty,
  type ClinicalDomainV3,
  type DirectionFilterV3,
  type TaxonomyTagV3,
} from "../../data/clinicalNavigatorTaxonomyV3";
import {
  runClinicalNavigatorQuery,
  hasActiveNavigatorQuery,
  NAVIGATOR_QUICK_PRESETS,
  type IndexedNavigatorRecommendation,
} from "../../lib/neuroguide/clinicalNavigatorEngine";
import { PivotalTrialModal } from "./PivotalTrialModal";
import { getAdminHeaders } from "@/utils/clientAuth";

interface ClinicalNavigatorTabProps {
  guidelines: GuidelineDoc[];
  recommendationAtoms: RecommendationAtom[];
  conferences: ConferenceEvent[];
  pivotalTrials: PivotalTrialRecord[];
  customRecLabels: Record<string, RecommendationLabelOutput>;
  neuroPulseArticles: Article[];
  isAdminVerified: boolean;
  initialPresetOrQuery?: NavigatorQuery | null;
  onPivotalTrialsUpdated: (trials: PivotalTrialRecord[]) => void;
}

const INITIAL_VISIBLE_RECS_PER_SOCIETY = 10;
const LOAD_MORE_RECS_STEP = 15;

type RightSectionFilter =
  | "MATRIX"
  | "DIFF"
  | "TRIALS"
  | "CONCORDANCE"
  | "LITERATURE";

export interface SocietyTheme {
  cardBorder: string;
  headerBg: string;
  headerBorder: string;
  badge: string;
  yearBadge: string;
  quoteBorder: string;
  buttonBg: string;
  accentLeft: string;
}

export function getSocietyTheme(society: string): SocietyTheme {
  const s = (society || "").toUpperCase().trim();

  // 1. AHA / ASA - Rose/Red theme
  if (s.includes("AHA") || s.includes("ASA")) {
    return {
      cardBorder: "border-rose-300 dark:border-rose-800",
      headerBg: "bg-rose-50/90 dark:bg-rose-950/40",
      headerBorder: "border-rose-200 dark:border-rose-800/60",
      badge: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700",
      yearBadge: "bg-rose-100/70 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
      quoteBorder: "border-l-rose-500",
      buttonBg: "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 hover:bg-rose-100 border-rose-200 dark:border-rose-800",
      accentLeft: "border-l-rose-500",
    };
  }

  // 2. ESO - Blue theme
  if (s.includes("ESO")) {
    return {
      cardBorder: "border-blue-300 dark:border-blue-800",
      headerBg: "bg-blue-50/90 dark:bg-blue-950/40",
      headerBorder: "border-blue-200 dark:border-blue-800/60",
      badge: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-700",
      yearBadge: "bg-blue-100/70 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
      quoteBorder: "border-l-blue-500",
      buttonBg: "bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 hover:bg-blue-100 border-blue-200 dark:border-blue-800",
      accentLeft: "border-l-blue-500",
    };
  }

  // 3. MOH / Vietnam / BYT - Emerald/Green theme
  if (s.includes("VN") || s.includes("MOH") || s.includes("BYT")) {
    return {
      cardBorder: "border-emerald-300 dark:border-emerald-800",
      headerBg: "bg-emerald-50/90 dark:bg-emerald-950/40",
      headerBorder: "border-emerald-200 dark:border-emerald-800/60",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700",
      yearBadge: "bg-emerald-100/70 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
      quoteBorder: "border-l-emerald-500",
      buttonBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-800",
      accentLeft: "border-l-emerald-500",
    };
  }

  // 4. NCS (Neurocritical Care) - Violet/Purple theme
  if (s.includes("NCS")) {
    return {
      cardBorder: "border-violet-300 dark:border-violet-800",
      headerBg: "bg-violet-50/90 dark:bg-violet-950/40",
      headerBorder: "border-violet-200 dark:border-violet-800/60",
      badge: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/80 dark:text-violet-200 dark:border-violet-700",
      yearBadge: "bg-violet-100/70 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
      quoteBorder: "border-l-violet-500",
      buttonBg: "bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300 hover:bg-violet-100 border-violet-200 dark:border-violet-800",
      accentLeft: "border-l-violet-500",
    };
  }

  // 5. AAN (American Academy of Neurology) - Amber/Orange theme
  if (s.includes("AAN")) {
    return {
      cardBorder: "border-amber-300 dark:border-amber-800",
      headerBg: "bg-amber-50/90 dark:bg-amber-950/40",
      headerBorder: "border-amber-200 dark:border-amber-800/60",
      badge: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700",
      yearBadge: "bg-amber-100/70 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300",
      quoteBorder: "border-l-amber-500",
      buttonBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 hover:bg-amber-100 border-amber-200 dark:border-amber-800",
      accentLeft: "border-l-amber-500",
    };
  }

  // 6. EAN (European Academy of Neurology) - Cyan/Sky theme
  if (s.includes("EAN")) {
    return {
      cardBorder: "border-cyan-300 dark:border-cyan-800",
      headerBg: "bg-cyan-50/90 dark:bg-cyan-950/40",
      headerBorder: "border-cyan-200 dark:border-cyan-800/60",
      badge: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/80 dark:text-cyan-200 dark:border-cyan-700",
      yearBadge: "bg-cyan-100/70 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
      quoteBorder: "border-l-cyan-500",
      buttonBg: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300 hover:bg-cyan-100 border-cyan-200 dark:border-cyan-800",
      accentLeft: "border-l-cyan-500",
    };
  }

  // 7. ILAE (Epilepsy) - Indigo theme
  if (s.includes("ILAE")) {
    return {
      cardBorder: "border-indigo-300 dark:border-indigo-800",
      headerBg: "bg-indigo-50/90 dark:bg-indigo-950/40",
      headerBorder: "border-indigo-200 dark:border-indigo-800/60",
      badge: "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700",
      yearBadge: "bg-indigo-100/70 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300",
      quoteBorder: "border-l-indigo-500",
      buttonBg: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 hover:bg-indigo-100 border-indigo-200 dark:border-indigo-800",
      accentLeft: "border-l-indigo-500",
    };
  }

  // 8. MDS (Movement Disorders) - Teal theme
  if (s.includes("MDS")) {
    return {
      cardBorder: "border-teal-300 dark:border-teal-800",
      headerBg: "bg-teal-50/90 dark:bg-teal-950/40",
      headerBorder: "border-teal-200 dark:border-teal-800/60",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/80 dark:text-teal-200 dark:border-teal-700",
      yearBadge: "bg-teal-100/70 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300",
      quoteBorder: "border-l-teal-500",
      buttonBg: "bg-teal-50 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300 hover:bg-teal-100 border-teal-200 dark:border-teal-800",
      accentLeft: "border-l-teal-500",
    };
  }

  // Fallback palettes for other societies
  const FALLBACKS: SocietyTheme[] = [
    {
      cardBorder: "border-fuchsia-300 dark:border-fuchsia-800",
      headerBg: "bg-fuchsia-50/90 dark:bg-fuchsia-950/40",
      headerBorder: "border-fuchsia-200 dark:border-fuchsia-800/60",
      badge: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-950/80 dark:text-fuchsia-200 dark:border-fuchsia-700",
      yearBadge: "bg-fuchsia-100/70 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-300",
      quoteBorder: "border-l-fuchsia-500",
      buttonBg: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/70 dark:text-fuchsia-300 hover:bg-fuchsia-100 border-fuchsia-200 dark:border-fuchsia-800",
      accentLeft: "border-l-fuchsia-500",
    },
    {
      cardBorder: "border-lime-300 dark:border-lime-800",
      headerBg: "bg-lime-50/90 dark:bg-lime-950/40",
      headerBorder: "border-lime-200 dark:border-lime-800/60",
      badge: "bg-lime-100 text-lime-900 border-lime-300 dark:bg-lime-950/80 dark:text-lime-200 dark:border-lime-700",
      yearBadge: "bg-lime-100/70 text-lime-900 dark:bg-lime-900/50 dark:text-lime-300",
      quoteBorder: "border-l-lime-500",
      buttonBg: "bg-lime-50 text-lime-700 dark:bg-lime-950/70 dark:text-lime-300 hover:bg-lime-100 border-lime-200 dark:border-lime-800",
      accentLeft: "border-l-lime-500",
    },
    {
      cardBorder: "border-sky-300 dark:border-sky-800",
      headerBg: "bg-sky-50/90 dark:bg-sky-950/40",
      headerBorder: "border-sky-200 dark:border-sky-800/60",
      badge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/80 dark:text-sky-200 dark:border-sky-700",
      yearBadge: "bg-sky-100/70 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
      quoteBorder: "border-l-sky-500",
      buttonBg: "bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 hover:bg-sky-100 border-sky-200 dark:border-sky-800",
      accentLeft: "border-l-sky-500",
    },
  ];

  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FALLBACKS.length;
  return FALLBACKS[idx];
}

function getSocietyBadgeStyle(society: string): string {
  return getSocietyTheme(society).badge;
}

function getDirectionBadge(dir: string) {
  switch (dir) {
    case "for":
    case "recommended":
      return {
        label: "Recommended (Class I / IIa)",
        cls: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      };
    case "against":
    case "no_benefit":
    case "harm":
      return {
        label: "Contraindicated / Harm (Class III)",
        cls: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
      };
    case "uncertain":
    case "conditional":
      return {
        label: "Conditional (Class IIb)",
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
  pivotalTrials,
  customRecLabels,
  neuroPulseArticles,
  isAdminVerified,
  initialPresetOrQuery,
  onPivotalTrialsUpdated,
}: ClinicalNavigatorTabProps) {
  // Right-Pane Content Search Bar state
  const [searchText, setSearchText] = useState<string>(
    initialPresetOrQuery?.searchText || ""
  );
  const deferredSearchText = useDeferredValue(searchText);

  // V3.0 Dual-Primary Axis Filter State
  const [selectedSubspecialty, setSelectedSubspecialty] = useState<Subspecialty | "all">(
    initialPresetOrQuery?.subspecialty &&
      initialPresetOrQuery.subspecialty !== "all" &&
      initialPresetOrQuery.subspecialty !== "All Subspecialties"
      ? (initialPresetOrQuery.subspecialty as Subspecialty)
      : initialPresetOrQuery?.conditionId && initialPresetOrQuery.conditionId !== "all"
      ? (getConditionByIdV3(initialPresetOrQuery.conditionId)?.subspecialties[0] as Subspecialty) || "all"
      : "all"
  );
  const [selectedConditionId, setSelectedConditionId] = useState<string | "all">(
    initialPresetOrQuery?.conditionId || "all"
  );
  const [selectedDomain, setSelectedDomain] = useState<ClinicalDomainV3>(
    initialPresetOrQuery?.domain || "all"
  );
  const [selectedDiagnosisTags, setSelectedDiagnosisTags] = useState<string[]>(
    initialPresetOrQuery?.diagnosisTags || []
  );
  const [selectedTimeWindowId, setSelectedTimeWindowId] = useState<string | "all">(
    initialPresetOrQuery?.timeWindowId || "all"
  );
  const [selectedInterventionTags, setSelectedInterventionTags] = useState<string[]>(
    initialPresetOrQuery?.interventionTags || []
  );
  const [selectedDirectionFilter, setSelectedDirectionFilter] = useState<DirectionFilterV3>(
    initialPresetOrQuery?.directionFilter || "all"
  );
  const [selectedSocieties, setSelectedSocieties] = useState<string[]>(
    initialPresetOrQuery?.societies || []
  );
  const [onlyPracticeChanges, setOnlyPracticeChanges] = useState<boolean>(
    initialPresetOrQuery?.onlyPracticeChanges ?? false
  );
  const [verificationFilter, setVerificationFilter] = useState<"all" | "approved" | "unlabeled_or_review">(
    initialPresetOrQuery?.verificationFilter || "all"
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Sync when initialPresetOrQuery changes
  useEffect(() => {
    if (initialPresetOrQuery) {
      setSearchText(initialPresetOrQuery.searchText || "");
      const resolvedSub =
        initialPresetOrQuery.subspecialty &&
        initialPresetOrQuery.subspecialty !== "all" &&
        initialPresetOrQuery.subspecialty !== "All Subspecialties"
          ? (initialPresetOrQuery.subspecialty as Subspecialty)
          : initialPresetOrQuery.conditionId && initialPresetOrQuery.conditionId !== "all"
          ? (getConditionByIdV3(initialPresetOrQuery.conditionId)?.subspecialties[0] as Subspecialty) || "all"
          : "all";
      setSelectedSubspecialty(resolvedSub);
      setSelectedConditionId(initialPresetOrQuery.conditionId || "all");
      setSelectedDomain(initialPresetOrQuery.domain || "all");
      setSelectedDiagnosisTags(initialPresetOrQuery.diagnosisTags || []);
      setSelectedTimeWindowId(initialPresetOrQuery.timeWindowId || "all");
      setSelectedInterventionTags(initialPresetOrQuery.interventionTags || []);
      setSelectedDirectionFilter(initialPresetOrQuery.directionFilter || "all");
      setSelectedSocieties(initialPresetOrQuery.societies || []);
      setOnlyPracticeChanges(initialPresetOrQuery.onlyPracticeChanges ?? false);
      setVerificationFilter(initialPresetOrQuery.verificationFilter || "all");
      setActivePresetId(null);
    }
  }, [initialPresetOrQuery]);

  // Left-Pane Filter Quick-Search State: Searches V3.0 filter tags only
  const [filterSearchTerm, setFilterSearchTerm] = useState<string>("");
  const normalizedFilterSearch = filterSearchTerm.trim().toLowerCase();
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);
  const [isTopicsExpanded, setIsTopicsExpanded] = useState<boolean>(false);
  const [sectionView, setSectionView] = useState<RightSectionFilter>("MATRIX");
  const [showSupportingBySociety, setShowSupportingBySociety] = useState<
    Record<string, boolean>
  >({});
  const [visibleCountBySociety, setVisibleCountBySociety] = useState<
    Record<string, number>
  >({});

  // Admin Modals
  const [isTrialModalOpen, setIsTrialModalOpen] = useState(false);
  const [editingTrial, setEditingTrial] = useState<PivotalTrialRecord | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const activeQuery: NavigatorQuery = useMemo(
    () => ({
      searchText: deferredSearchText,
      subspecialty: selectedSubspecialty,
      conditionId: selectedConditionId,
      domain: selectedDomain,
      diagnosisTags: selectedDiagnosisTags.length > 0 ? selectedDiagnosisTags : undefined,
      timeWindowId: selectedTimeWindowId !== "all" ? selectedTimeWindowId : undefined,
      interventionTags: selectedInterventionTags.length > 0 ? selectedInterventionTags : undefined,
      directionFilter: selectedDirectionFilter !== "all" ? selectedDirectionFilter : undefined,
      societies: selectedSocieties.length > 0 ? selectedSocieties : undefined,
      includeAiChecked: true,
      onlyPracticeChanges,
      verificationFilter,
    }),
    [
      deferredSearchText,
      selectedSubspecialty,
      selectedConditionId,
      selectedDomain,
      selectedDiagnosisTags,
      selectedTimeWindowId,
      selectedInterventionTags,
      selectedDirectionFilter,
      selectedSocieties,
      onlyPracticeChanges,
      verificationFilter,
    ]
  );

  const isQueryActive = useMemo(
    () => hasActiveNavigatorQuery(activeQuery),
    [activeQuery]
  );

  const navResult = useMemo(() => {
    return runClinicalNavigatorQuery({
      guidelines,
      recommendationAtoms,
      conferences,
      customPivotalTrials: pivotalTrials,
      customRecLabels,
      neuroPulseArticles,
      query: activeQuery,
    });
  }, [
    guidelines,
    recommendationAtoms,
    conferences,
    pivotalTrials,
    customRecLabels,
    neuroPulseArticles,
    activeQuery,
  ]);

  // Dynamic conditions for Axis 1
  const availableConditions = useMemo(() => {
    const conds = getConditionsForSubspecialtyV3(selectedSubspecialty);
    if (!normalizedFilterSearch) return conds;
    return conds.filter((c) => c.label.toLowerCase().includes(normalizedFilterSearch));
  }, [selectedSubspecialty, normalizedFilterSearch]);

  // Dynamic Treatment & Prevention schemas for Axis 2
  const treatmentSchema = useMemo(
    () => getTreatmentSchemaForScopeV3(selectedSubspecialty, selectedConditionId),
    [selectedSubspecialty, selectedConditionId]
  );
  const preventionSchema = useMemo(
    () => getPreventionSchemaForScopeV3(selectedSubspecialty, selectedConditionId),
    [selectedSubspecialty, selectedConditionId]
  );

  const filterTagsBySearch = (tags: TaxonomyTagV3[]) => {
    if (!normalizedFilterSearch) return tags;
    return tags.filter((t) => t.label.toLowerCase().includes(normalizedFilterSearch));
  };

  const handleSelectSubspecialty = (sub: Subspecialty | "all") => {
    setActivePresetId(null);
    setVisibleCountBySociety({});
    setSelectedSubspecialty(sub);
    // Keep condition only if it also belongs to the new subspecialty (Multi-Parent support)
    if (sub !== "all" && selectedConditionId !== "all") {
      const cond = getConditionByIdV3(selectedConditionId);
      if (!cond || !cond.subspecialties.includes(sub)) {
        setSelectedConditionId("all");
        setSelectedTimeWindowId("all");
        setSelectedInterventionTags([]);
      }
    }
  };

  const handleSelectCondition = (condId: string | "all") => {
    setActivePresetId(null);
    setVisibleCountBySociety({});
    setSelectedConditionId(condId);
    setSelectedTimeWindowId("all");
    // Preserve cross-domain or shared tags that also exist in the newly selected condition
    if (condId !== "all") {
      const cond = getConditionByIdV3(condId);
      if (cond) {
        // Auto-switch Axis 1A to corresponding subspecialty
        if (cond.subspecialties && cond.subspecialties.length > 0) {
          if (selectedSubspecialty === "all" || !cond.subspecialties.includes(selectedSubspecialty)) {
            setSelectedSubspecialty(cond.subspecialties[0]);
          }
        }

        const validIds = new Set([
          ...cond.treatment.drugs.map((t) => t.id),
          ...cond.treatment.interventions.map((t) => t.id),
          ...cond.treatment.otherCare.map((t) => t.id),
          ...cond.prevention.pharmacologicalProphylaxis.map((t) => t.id),
          ...cond.prevention.proceduralDevice.map((t) => t.id),
          ...cond.prevention.lifestyleRehabMonitoring.map((t) => t.id),
        ]);
        setSelectedInterventionTags((prev) => prev.filter((id) => validIds.has(id)));
      }
    }
  };

  const handleSelectDomain = (dom: ClinicalDomainV3) => {
    setActivePresetId(null);
    setVisibleCountBySociety({});
    setSelectedDomain(dom);
    // Note: Per Rule 2 (Cross-Domain Single Label Principle), we preserve `selectedInterventionTags`
    // when switching between Treatment, Prevention, and All Domains so tags like `DOAC`, `SAPT`, `VP Shunt` seamlessly pivot!
    if (dom === "diagnosis") {
      setSelectedTimeWindowId("all");
    }
  };

  const handleToggleDiagnosisTag = (tagId: string) => {
    setActivePresetId(null);
    setVisibleCountBySociety({});
    setSelectedDiagnosisTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleToggleInterventionTag = (tagId: string) => {
    setActivePresetId(null);
    setVisibleCountBySociety({});
    setSelectedInterventionTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleApplyPreset = (presetId: string) => {
    const preset = NAVIGATOR_QUICK_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setSearchText(preset.query.searchText || "");
    setFilterSearchTerm("");
    setSelectedSubspecialty(
      preset.query.subspecialty &&
        preset.query.subspecialty !== "all" &&
        preset.query.subspecialty !== "All Subspecialties"
        ? (preset.query.subspecialty as Subspecialty)
        : "all"
    );
    setSelectedConditionId(preset.query.conditionId || "all");
    setSelectedDomain(preset.query.domain || "all");
    setSelectedDiagnosisTags(preset.query.diagnosisTags || []);
    setSelectedTimeWindowId(preset.query.timeWindowId || "all");
    setSelectedInterventionTags(preset.query.interventionTags || []);
    setSelectedDirectionFilter(preset.query.directionFilter || "all");
    setSelectedSocieties(preset.query.societies || []);
    setOnlyPracticeChanges(preset.query.onlyPracticeChanges ?? false);
    setVerificationFilter(preset.query.verificationFilter || "all");
    setVisibleCountBySociety({});
  };

  const handleClearAllFilters = () => {
    setActivePresetId(null);
    setSearchText("");
    setFilterSearchTerm("");
    setSelectedSubspecialty("all");
    setSelectedConditionId("all");
    setSelectedDomain("all");
    setSelectedDiagnosisTags([]);
    setSelectedTimeWindowId("all");
    setSelectedInterventionTags([]);
    setSelectedDirectionFilter("all");
    setSelectedSocieties([]);
    setOnlyPracticeChanges(false);
    setVerificationFilter("all");
    setVisibleCountBySociety({});
  };

  const handleToggleSociety = (soc: string) => {
    setActivePresetId(null);
    setVisibleCountBySociety({});
    setSelectedSocieties((prev) =>
      prev.includes(soc) ? prev.filter((s) => s !== soc) : [...prev, soc]
    );
  };

  const activeFilterSummaryChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void; color: string }[] = [];
    if (selectedSubspecialty !== "all") {
      chips.push({
        id: `sub:${selectedSubspecialty}`,
        label: selectedSubspecialty,
        color: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900",
        onRemove: () => handleSelectSubspecialty("all"),
      });
    }
    if (selectedConditionId !== "all") {
      const cond = getConditionByIdV3(selectedConditionId);
      chips.push({
        id: `cond:${selectedConditionId}`,
        label: cond?.label || selectedConditionId,
        color: "bg-indigo-600 text-white",
        onRemove: () => handleSelectCondition("all"),
      });
    }
    if (selectedDomain !== "all") {
      const domLabel =
        selectedDomain === "diagnosis"
          ? "1. Diagnosis"
          : selectedDomain === "treatment"
          ? "2. Treatment"
          : "3. Prevention & Secondary Care";
      chips.push({
        id: `dom:${selectedDomain}`,
        label: domLabel,
        color: "bg-violet-600 text-white",
        onRemove: () => handleSelectDomain("all"),
      });
    }
    if (selectedTimeWindowId !== "all") {
      chips.push({
        id: `tw:${selectedTimeWindowId}`,
        label: `⏱ ${getTagLabelByIdV3(selectedTimeWindowId)}`,
        color: "bg-amber-600 text-white",
        onRemove: () => setSelectedTimeWindowId("all"),
      });
    }
    for (const dt of selectedDiagnosisTags) {
      chips.push({
        id: `diag:${dt}`,
        label: getTagLabelByIdV3(dt),
        color: "bg-cyan-700 text-white",
        onRemove: () => handleToggleDiagnosisTag(dt),
      });
    }
    for (const it of selectedInterventionTags) {
      chips.push({
        id: `int:${it}`,
        label: getTagLabelByIdV3(it),
        color: "bg-teal-600 text-white",
        onRemove: () => handleToggleInterventionTag(it),
      });
    }
    if (selectedDirectionFilter !== "all") {
      const dirLabel =
        selectedDirectionFilter === "recommended"
          ? "Class I / IIa (Recommended)"
          : selectedDirectionFilter === "conditional"
          ? "Class IIb (Conditional)"
          : "Class III (Contraindicated / Harm)";
      chips.push({
        id: `dir:${selectedDirectionFilter}`,
        label: dirLabel,
        color:
          selectedDirectionFilter === "harm"
            ? "bg-rose-600 text-white"
            : "bg-emerald-600 text-white",
        onRemove: () => setSelectedDirectionFilter("all"),
      });
    }
    if (verificationFilter !== "all") {
      chips.push({
        id: `verif:${verificationFilter}`,
        label: verificationFilter === "approved" ? "✓ Đã kiểm duyệt" : "⚠️ Chưa gắn nhãn / Cần kiểm duyệt",
        color: verificationFilter === "approved" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white",
        onRemove: () => setVerificationFilter("all"),
      });
    }
    return chips;
  }, [
    selectedSubspecialty,
    selectedConditionId,
    selectedDomain,
    selectedTimeWindowId,
    selectedDiagnosisTags,
    selectedInterventionTags,
    selectedDirectionFilter,
    verificationFilter,
  ]);

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

  const renderInterventionGroup = (
    groupTitle: string,
    items: TaxonomyTagV3[],
    accentCls = "bg-teal-600 text-white border-teal-600"
  ) => {
    const filtered = filterTagsBySearch(items);
    // Rule 4: Hide empty `[]` groups automatically
    if (filtered.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {groupTitle}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {filtered.map((item) => {
            const active = selectedInterventionTags.includes(item.id);
            const count = navResult.v3Counts.interventionTags[item.id] || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleToggleInterventionTag(item.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1.5 ${
                  active
                    ? `${accentCls} shadow-sm`
                    : count > 0
                    ? "bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                    : "bg-slate-50/50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800/70 hover:border-slate-300"
                }`}
              >
                <span>{item.label}</span>
                {count > 0 && (
                  <span
                    className={`text-[10px] px-1 rounded ${
                      active
                        ? "bg-black/20 text-white"
                        : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {statusBanner && (
        <div
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
            statusBanner.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border border-rose-300 dark:border-rose-800"
          }`}
        >
          <span>{statusBanner.text}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="opacity-70 hover:opacity-100 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 12-Column Split Layout: Left V3.0 Dual-Primary Axis Filter (4 cols) | Right Search + Evidence Synthesis (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: 1. V3.0 Dual-Primary Axis Filter -> 2. High-Yield Clinical Topics */}
        <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          {/* 1. V3.0 DUAL-PRIMARY AXIS FILTER CARD */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsFilterExpanded((prev) => !prev)}
                className="flex-1 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    🧭 Clinical Filter (V3.0)
                  </h3>
                  {isQueryActive && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                      {activeFilterSummaryChips.length +
                        selectedSocieties.length +
                        (searchText.trim().length >= 2 ? 1 : 0) +
                        (onlyPracticeChanges ? 1 : 0)}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 ml-2">
                  {isFilterExpanded ? "▾" : "▸"}
                </span>
              </button>
              {isQueryActive && (
                <button
                  type="button"
                  onClick={handleClearAllFilters}
                  className="ml-3 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline shrink-0"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* Active Query Chips Summary */}
            {isQueryActive && (
              <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Active Filter Matrix
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    {navResult.coreRecommendations.length} Core Recs
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {searchText.trim().length >= 2 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      🔍 &ldquo;{searchText.trim()}&rdquo;
                      <button
                        type="button"
                        onClick={() => setSearchText("")}
                        className="hover:text-rose-600 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {activeFilterSummaryChips.map((chip) => (
                    <span
                      key={chip.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${chip.color}`}
                    >
                      {chip.label}
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        className="hover:opacity-75 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {selectedSocieties.map((soc) => (
                    <span
                      key={soc}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {soc}
                      <button
                        type="button"
                        onClick={() => handleToggleSociety(soc)}
                        className="hover:text-rose-600 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {onlyPracticeChanges && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                      New / Upgraded Only
                      <button
                        type="button"
                        onClick={() => setOnlyPracticeChanges(false)}
                        className="hover:text-rose-600 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}

            {isFilterExpanded && (
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 max-h-[75vh] overflow-y-auto pr-1">
                {/* Filter Tag Quick-Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={filterSearchTerm}
                    onChange={(e) => setFilterSearchTerm(e.target.value)}
                    placeholder="Filter tags..."
                    className="w-full pl-3.5 pr-8 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {filterSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setFilterSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                      title="Clear filter search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* =========================================================
                    AXIS 1: SUBSPECIALTY -> CLINICAL CONDITION
                   ========================================================= */}
                <div className="space-y-2.5">
                  <div>
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
                      Axis 1A • Subspecialty (10)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectSubspecialty("all")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          selectedSubspecialty === "all"
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                        }`}
                      >
                        All Subspecialties
                      </button>
                      {NAVIGATOR_SUBSPECIALTIES_V3.map((sub) => {
                        const active = selectedSubspecialty === sub;
                        const count = navResult.v3Counts.subspecialties[sub] || 0;
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => handleSelectSubspecialty(sub)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                              active
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                            }`}
                          >
                            <span>{sub}</span>
                            {count > 0 && (
                              <span
                                className={`text-[10px] px-1 rounded ${
                                  active
                                    ? "bg-indigo-500 text-white"
                                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clinical Condition Pills */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
                      Axis 1B • Clinical Condition ({availableConditions.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => handleSelectCondition("all")}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                          selectedConditionId === "all"
                            ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        All Conditions
                      </button>
                      {availableConditions.map((cond) => {
                        const active = selectedConditionId === cond.id;
                        const count = navResult.v3Counts.conditions[cond.id] || 0;
                        const isMultiParent = cond.subspecialties.length > 1;
                        return (
                          <button
                            key={cond.id}
                            type="button"
                            onClick={() => handleSelectCondition(cond.id)}
                            title={
                              isMultiParent
                                ? `Shared across: ${cond.subspecialties.join(" & ")}`
                                : cond.label
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                              active
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : count > 0
                                ? "bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400"
                                : "bg-slate-50/50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200/70 dark:border-slate-800 hover:border-indigo-400"
                            }`}
                          >
                            <span>{cond.label}</span>
                            {count > 0 && (
                              <span
                                className={`text-[10px] px-1 rounded ${
                                  active
                                    ? "bg-indigo-500 text-white"
                                    : "bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* =========================================================
                    AXIS 2: CLINICAL DOMAIN & DYNAMIC SUB-FILTERS
                   ========================================================= */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  <div>
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1.5">
                      Axis 2 • Clinical Domain
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: "all", label: "All Domains" },
                          { id: "diagnosis", label: "1. Diagnosis" },
                          { id: "treatment", label: "2. Treatment" },
                          { id: "prevention", label: "3. Prevention & Care" },
                        ] as const
                      ).map((dom) => {
                        const active = selectedDomain === dom.id;
                        const count =
                          dom.id === "all"
                            ? null
                            : navResult.v3Counts.domains[dom.id] || 0;
                        return (
                          <button
                            key={dom.id}
                            type="button"
                            onClick={() => handleSelectDomain(dom.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition flex items-center justify-between ${
                              active
                                ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-violet-400"
                            }`}
                          >
                            <span className="truncate">{dom.label}</span>
                            {count !== null && count > 0 && (
                              <span
                                className={`text-[10px] px-1.5 rounded-full ml-1 ${
                                  active
                                    ? "bg-violet-500 text-white"
                                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* BRANCH 1: 1. DIAGNOSIS (System-Wide Canonical 5 Modalities) */}
                  {(selectedDomain === "diagnosis" ||
                    (selectedDomain === "all" && normalizedFilterSearch.length > 0)) && (
                    <div className="p-3 rounded-xl bg-cyan-50/40 dark:bg-cyan-950/20 border border-cyan-200/70 dark:border-cyan-900/50 space-y-2.5">
                      <span className="block text-[11px] font-extrabold text-cyan-800 dark:text-cyan-300">
                        🔬 1. Diagnosis Modalities (System-Wide Canonical)
                      </span>
                      {DIAGNOSIS_CATEGORIES_V3.map((cat) => {
                        const visibleItems = filterTagsBySearch(cat.items);
                        if (visibleItems.length === 0) return null;
                        return (
                          <div key={cat.id} className="space-y-1">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {cat.label}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {visibleItems.map((item) => {
                                const active = selectedDiagnosisTags.includes(item.id);
                                const count = navResult.v3Counts.diagnosisTags[item.id] || 0;
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleToggleDiagnosisTag(item.id)}
                                    className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                                      active
                                        ? "bg-cyan-700 text-white border-cyan-700 shadow-sm"
                                        : count > 0
                                        ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-cyan-400"
                                        : "bg-white/60 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800"
                                    }`}
                                  >
                                    <span>{item.label}</span>
                                    {count > 0 && (
                                      <span
                                        className={`text-[10px] px-1 rounded ${
                                          active
                                            ? "bg-cyan-600 text-white"
                                            : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                                        }`}
                                      >
                                        {count}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* BRANCH 2: 2. TREATMENT (Condition-Specific Time Window + Drug / Surgical / Other) */}
                  {(selectedDomain === "treatment" ||
                    (selectedDomain === "all" &&
                      (selectedConditionId !== "all" || normalizedFilterSearch.length > 0))) && (
                    <div className="p-3 rounded-xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/70 dark:border-teal-900/50 space-y-3">
                      <span className="block text-[11px] font-extrabold text-teal-800 dark:text-teal-300">
                        💊 2. Treatment &amp; Acute Management
                      </span>

                      {/* Condition-Specific Time Window Filter */}
                      {treatmentSchema.timeWindows.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            ⏱ Time Window
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedTimeWindowId("all")}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition ${
                                selectedTimeWindowId === "all"
                                  ? "bg-amber-600 text-white border-amber-600"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              All Phases
                            </button>
                            {treatmentSchema.timeWindows.map((tw) => {
                              const active = selectedTimeWindowId === tw.id;
                              const count = navResult.v3Counts.timeWindows[tw.id] || 0;
                              return (
                                <button
                                  key={tw.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedTimeWindowId(active ? "all" : tw.id)
                                  }
                                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                                    active
                                      ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                                  }`}
                                >
                                  <span>{tw.label}</span>
                                  {count > 0 && (
                                    <span className="text-[10px] px-1 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200">
                                      {count}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {renderInterventionGroup(
                        "Drug",
                        treatmentSchema.drugs,
                        "bg-teal-600 text-white border-teal-600"
                      )}
                      {renderInterventionGroup(
                        "Intervention / Surgical",
                        treatmentSchema.interventions,
                        "bg-indigo-600 text-white border-indigo-600"
                      )}
                      {renderInterventionGroup(
                        "Other (ICU, Care & Monitoring)",
                        treatmentSchema.otherCare,
                        "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900"
                      )}
                    </div>
                  )}

                  {/* BRANCH 3: 3. PREVENTION & SECONDARY CARE */}
                  {(selectedDomain === "prevention" ||
                    (selectedDomain === "all" &&
                      (selectedConditionId !== "all" || normalizedFilterSearch.length > 0))) && (
                    <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-3">
                      <span className="block text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300">
                        🛡️ 3. Prevention &amp; Secondary Care
                      </span>
                      {renderInterventionGroup(
                        "Pharmacological Prophylaxis",
                        preventionSchema.pharmacologicalProphylaxis,
                        "bg-emerald-600 text-white border-emerald-600"
                      )}
                      {renderInterventionGroup(
                        "Procedural & Device Interventions",
                        preventionSchema.proceduralDevice,
                        "bg-indigo-600 text-white border-indigo-600"
                      )}
                      {renderInterventionGroup(
                        "Lifestyle, Rehab & Monitoring",
                        preventionSchema.lifestyleRehabMonitoring,
                        "bg-teal-700 text-white border-teal-700"
                      )}
                    </div>
                  )}
                </div>

                {/* =========================================================
                    SECONDARY FILTERS: DIRECTION / HARM, SOCIETY & UPDATES
                   ========================================================= */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-3">
                  {/* Recommendation Direction / Harm Filter (Rule 5) */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Recommendation Direction / Harm Filter
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: "all", label: "All Directions" },
                          { id: "recommended", label: "✓ Class I / IIa (FOR)" },
                          { id: "conditional", label: "◐ Class IIb (Conditional)" },
                          { id: "harm", label: "⛔ Class III (Harm / Against)" },
                        ] as const
                      ).map((d) => {
                        const active = selectedDirectionFilter === d.id;
                        const count =
                          d.id === "all"
                            ? null
                            : navResult.v3Counts.directions[d.id] || 0;
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setSelectedDirectionFilter(d.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition flex items-center justify-between ${
                              active
                                ? d.id === "harm"
                                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                                  : "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <span className="truncate">{d.label}</span>
                            {count !== null && count > 0 && (
                              <span className="text-[10px] px-1 rounded bg-black/10 dark:bg-white/10 ml-1">
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Society Filter */}
                  <div>
                    <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Society
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

                  {/* Practice Changes Filter Checkbox */}
                  <label className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between cursor-pointer">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Only New / Upgraded Recs:
                    </span>
                    <input
                      type="checkbox"
                      checked={onlyPracticeChanges}
                      onChange={(e) => setOnlyPracticeChanges(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                    />
                  </label>

                  {/* Labeling & Verification Status Filter */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Trạng thái gắn nhãn &amp; duyệt:
                      </span>
                      {navResult.unlabeledCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          {navResult.unlabeledCount} cần nhãn
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setVerificationFilter("all")}
                        className={`px-1.5 py-1 rounded text-[10px] font-semibold border transition-all text-center ${
                          verificationFilter === "all"
                            ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                        }`}
                      >
                        Tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerificationFilter("approved")}
                        className={`px-1.5 py-1 rounded text-[10px] font-semibold border transition-all text-center ${
                          verificationFilter === "approved"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400"
                        }`}
                      >
                        ✓ Đã duyệt
                      </button>
                      <button
                        type="button"
                        onClick={() => setVerificationFilter("unlabeled_or_review")}
                        className={`px-1.5 py-1 rounded text-[10px] font-semibold border transition-all text-center ${
                          verificationFilter === "unlabeled_or_review"
                            ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400"
                        }`}
                        title="Lọc các khuyến cáo chưa được gắn nhãn đầy đủ hoặc chưa được chuyên gia phê duyệt"
                      >
                        ⚠️ Cần nhãn
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. HIGH-YIELD CLINICAL TOPICS (1-Click Presets) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <button
              type="button"
              onClick={() => setIsTopicsExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                ⚡ High-Yield Clinical Topics
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400">
                  1-Click Presets
                </span>
                <span className="text-xs text-slate-400">
                  {isTopicsExpanded ? "▾" : "▸"}
                </span>
              </div>
            </button>

            {isTopicsExpanded && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
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
            )}
          </div>
        </aside>

        {/* RIGHT PANE: Persistent Right-Pane Content Search Bar + Evidence Synthesis Dashboard */}
        <section className="lg:col-span-8 space-y-5">
          {/* PERSISTENT RIGHT-PANE CONTENT SEARCH BAR (Combines via AND logic with Left-Pane V3.0 Filters) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="navigator-right-content-search"
                className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
              >
                <span>🔍 Search Guideline Content, Dosing, Thresholds &amp; Trials</span>
              </label>
              {isQueryActive && (
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {navResult.coreRecommendations.length} matching recommendations •{" "}
                  {navResult.pivotalTrials.length + navResult.lateBreakingTrials.length} trials
                </span>
              )}
            </div>
            <div className="relative">
              <input
                id="navigator-right-content-search"
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setVisibleCountBySociety({});
                }}
                placeholder="Search recommendations, dosing, targets, or trials..."
                className="w-full pl-4 pr-20 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-white text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-rose-100 hover:text-rose-700 transition"
                >
                  Clear ✕
                </button>
              )}
            </div>
          </div>

          {!isQueryActive ? (
            /* ZERO-QUERY EMPTY STATE */
            <div className="p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 space-y-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl">
                🧭
              </div>
              <div className="space-y-1.5 max-w-lg mx-auto">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Select a Clinical Filter on the Left or Search Content Above
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose a Subspecialty &amp; Condition (Axis 1), Clinical Domain (Axis 2: Diagnosis, Treatment, or Prevention), or type a clinical keyword in the search bar above.
                </p>
              </div>

              {/* Quick Start Topic Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {NAVIGATOR_QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset.id)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 border border-indigo-200 dark:border-indigo-800/80 transition flex items-center gap-1.5"
                  >
                    <span>⚡</span>
                    <span>{preset.title}</span>
                  </button>
                ))}
              </div>

              {isAdminVerified && (
                <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTrial(null);
                      setIsTrialModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    <span>＋</span> Add Pivotal Trial
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Section View Switcher Bar + Ecosystem Links + Admin Actions */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
                {/* Cross-Ecosystem & Admin Utility Bar */}
                {(navResult.ecosystemLinks.length > 0 || isAdminVerified) && (
                  <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
                    {/* Cross-Ecosystem Quick Tools */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                        <span>🔗</span> Cross-Ecosystem:
                      </span>
                      {navResult.ecosystemLinks.slice(0, 3).map((link, idx) => (
                        <Link
                          key={`${link.app}-${idx}`}
                          href={link.href}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all flex items-center gap-1 shadow-2xs"
                        >
                          <span>👉 {link.app}:</span>
                          <span>{link.label}</span>
                        </Link>
                      ))}
                    </div>

                    {/* Admin Actions */}
                    {isAdminVerified && (
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTrial(null);
                            setIsTrialModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <span>＋</span> Add Trial
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Modern Clean Tab Navigation */}
                <div className="px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-6 overflow-x-auto scrollbar-none">
                  {(
                    [
                      {
                        id: "MATRIX",
                        label: "Guideline Recommendations",
                        icon: "⚖️",
                        count: navResult.coreRecommendations.length,
                      },
                      {
                        id: "DIFF",
                        label: "Guideline Updates",
                        icon: "⏳",
                        count: navResult.intraSocietyDiffs.length,
                      },
                      {
                        id: "TRIALS",
                        label: "Clinical Trials",
                        icon: "🔬",
                        count:
                          navResult.pivotalTrials.length +
                          navResult.lateBreakingTrials.length,
                      },
                      {
                        id: "CONCORDANCE",
                        label: "Consensus & Divergence",
                        icon: "⚡",
                        count: navResult.concordanceAppraisal.societyStances.length,
                      },
                      {
                        id: "LITERATURE",
                        label: "Related Literature",
                        icon: "📚",
                        count: navResult.relatedArticles.length,
                      },
                    ] as const
                  ).map((tab) => {
                    const active = sectionView === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSectionView(tab.id as RightSectionFilter)}
                        className={`pb-3 pt-3 px-1 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 -mb-px ${
                          active
                            ? "border-amber-500 text-amber-600 dark:text-amber-400"
                            : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <span className="text-base leading-none">{tab.icon}</span>
                        <span>{tab.label}</span>
                        {tab.count !== null && (
                          <span
                            className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold transition-all ${
                              active
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
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
                  SECTION 1: GUIDELINE RECOMMENDATIONS (With Per-Society Pagination)
                 ===================================================================== */}
              {sectionView === "MATRIX" && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
                      {navResult.coreRecommendations.length} Core •{" "}
                      {navResult.supportingRecommendations.length} Supporting
                    </span>
                  </div>

                  {navResult.crossSocietyMatrix.length === 0 ? (
                    <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        No core guideline recommendations matched this filter combination.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Try removing one filter tag in the left panel.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {navResult.crossSocietyMatrix.map((socGroup) => {
                        const theme = getSocietyTheme(socGroup.society);
                        const tierMeta =
                          TIER_CONFIG[socGroup.highestTier] || TIER_CONFIG[2];
                        const dirMeta = getDirectionBadge(socGroup.dominantDirection);
                        const showSupporting = Boolean(
                          showSupportingBySociety[socGroup.society]
                        );
                        const visibleCap =
                          visibleCountBySociety[socGroup.society] ||
                          INITIAL_VISIBLE_RECS_PER_SOCIETY;
                        const visibleCoreRecs = socGroup.coreRecommendations.slice(
                          0,
                          visibleCap
                        );
                        const remainingCount =
                          socGroup.coreRecommendations.length -
                          visibleCoreRecs.length;

                        return (
                          <div
                            key={socGroup.society}
                            className={`rounded-2xl border-2 border-l-[6px] overflow-hidden shadow-xs transition-all ${theme.cardBorder} ${theme.accentLeft} bg-white dark:bg-slate-900`}
                          >
                            {/* Society Group Header */}
                            <div
                              className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2 ${theme.headerBg} ${theme.headerBorder}`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-3 py-1 rounded-lg text-xs font-black border shadow-xs ${theme.badge}`}
                                >
                                  🏛️ {socGroup.society}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-xs font-bold ${theme.yearBadge}`}
                                >
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

                            {/* Paginated Core Recommendations List */}
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                              {visibleCoreRecs.map((rec) => (
                                <RecommendationMatrixCard
                                  key={rec.recId}
                                  rec={rec}
                                  theme={theme}
                                />
                              ))}
                            </div>

                            {/* Load More Core Recommendations Button (Prevents DOM lag on large result sets) */}
                            {remainingCount > 0 && (
                              <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisibleCountBySociety((prev) => ({
                                      ...prev,
                                      [socGroup.society]:
                                        visibleCap + LOAD_MORE_RECS_STEP,
                                    }))
                                  }
                                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${theme.buttonBg}`}
                                >
                                  Show more {socGroup.society} recommendations (+
                                  {remainingCount} remaining) ▾
                                </button>
                              </div>
                            )}

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
                                        theme={theme}
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
                  SECTION 2: GUIDELINE UPDATES & PRACTICE SHIFTS
                 ===================================================================== */}
              {sectionView === "DIFF" && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                      {navResult.intraSocietyDiffs.length} Practice Shifts
                    </span>
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
                  SECTION 3: CLINICAL TRIALS & LATE-BREAKING EVIDENCE
                 ===================================================================== */}
              {sectionView === "TRIALS" && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      {navResult.pivotalTrials.length} Published •{" "}
                      {navResult.lateBreakingTrials.length} Late-Breaking
                    </span>
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
                  SECTION 4: CONSENSUS & DIVERGENCE SUMMARY
                 ===================================================================== */}
              {sectionView === "CONCORDANCE" && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
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
                  SECTION 5: RELATED LITERATURE
                 ===================================================================== */}
              {sectionView === "LITERATURE" && (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300">
                      {navResult.relatedArticles.length} Articles Matched
                    </span>
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
            </>
          )}
        </section>
      </div>

      {/* Admin Add/Edit Pivotal Trial Modal */}
      <PivotalTrialModal
        isOpen={isTrialModalOpen}
        onClose={() => setIsTrialModalOpen(false)}
        initialTrial={editingTrial}
        defaultOntologyTags={{}}
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
  theme,
}: {
  rec: IndexedNavigatorRecommendation;
  isSupporting?: boolean;
  theme?: SocietyTheme;
}) {
  const tierMeta = TIER_CONFIG[rec.normalizedTier] || TIER_CONFIG[2];
  const dirValue = rec.v3Labels?.direction || "recommended";
  const dirMeta = getDirectionBadge(dirValue);

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

          {/* Time Window Badges */}
          {rec.v3Labels?.timeWindowIds &&
            rec.v3Labels.timeWindowIds.length > 0 &&
            rec.v3Labels.timeWindowIds.map((twId) => (
              <span
                key={twId}
                className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1"
              >
                <span>⏱️</span>
                <span>{getTagLabelByIdV3(twId)}</span>
              </span>
            ))}
        </div>

        {/* Verification Badge + Rec ID */}
        <div className="flex items-center gap-2">
          {rec.validationStatus === "human_approved" ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              ✓ Clinician Approved
            </span>
          ) : rec.isUnlabeled ? (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
              title={rec.missingLabelReasons?.join(" • ") || "Chưa gắn nhãn hoàn chỉnh"}
            >
              ⚠️ Chưa gắn nhãn đầy đủ
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
              🛡️ AI Auto-labeled
            </span>
          )}
          <span className="text-[10px] font-mono text-slate-400">
            [{rec.recId}]
          </span>
        </div>
      </div>

      {/* Unlabeled / Incomplete Label Warning for Clinicians */}
      {rec.isUnlabeled && rec.missingLabelReasons && rec.missingLabelReasons.length > 0 && (
        <div className="text-[10.5px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/60 flex items-center gap-1.5">
          <span className="shrink-0">⚠️</span>
          <span>
            <strong className="font-semibold">Cần bổ sung nhãn:</strong> {rec.missingLabelReasons.join(" • ")}
          </span>
        </div>
      )}

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
      <blockquote
        className={`pl-3 border-l-4 ${
          theme?.quoteBorder || "border-l-indigo-500"
        } text-xs sm:text-sm text-slate-900 dark:text-slate-100 font-medium leading-relaxed`}
      >
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

      {/* Cited Trials & Official Guideline Link (Tags/labels hidden to avoid visual clutter) */}
      {(rec.drivingTrials.length > 0 || rec.officialUrl) && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
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
      )}
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
          {trial.pico.timeWindow && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-amber-700 dark:text-amber-400">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 font-bold">
                ⏱ Cửa sổ: {trial.pico.timeWindow}
              </span>
            </div>
          )}
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
