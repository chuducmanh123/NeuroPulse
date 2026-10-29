"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  NEUROLOGY_SUBSPECIALTIES,
  SubspecialtyType,
  TIER_CONFIG,
  ClinicalScenario,
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
} from "../../types/neuroguide";
import {
  MOCK_CLINICAL_SCENARIOS,
  MOCK_GUIDELINE_DOCS,
  MOCK_RECOMMENDATION_ATOMS,
  MOCK_CONFERENCE_EVENTS,
} from "../../data/neuroguideMockData";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";
import { AdminButton } from "../../components/ecosystem/AdminButton";

type NavTabId = "guidelines" | "conf" | "matrix";

interface ThemeStyle {
  borderLeft: string;
  cardBg: string;
  cardBorder: string;
  badge: string;
  accentText: string;
}

function getGuidelineTheme(society: string): ThemeStyle {
  const norm = (society || "").toUpperCase();
  if (norm.includes("AHA")) {
    return {
      borderLeft: "border-l-4 border-l-rose-500",
      cardBg: "bg-rose-50/30 dark:bg-rose-950/20",
      cardBorder: "border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-600",
      badge: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800",
      accentText: "text-rose-600 dark:text-rose-400",
    };
  }
  if (norm.includes("ESVS")) {
    return {
      borderLeft: "border-l-4 border-l-teal-600",
      cardBg: "bg-teal-50/30 dark:bg-teal-950/20",
      cardBorder: "border-teal-200 dark:border-teal-900/60 hover:border-teal-400 dark:hover:border-teal-600",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/60 dark:text-teal-300 dark:border-teal-800",
      accentText: "text-teal-600 dark:text-teal-400",
    };
  }
  if (norm.includes("ESC") && !norm.includes("ESOC")) {
    return {
      borderLeft: "border-l-4 border-l-rose-600",
      cardBg: "bg-rose-50/30 dark:bg-rose-950/20",
      cardBorder: "border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-600",
      badge: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800",
      accentText: "text-rose-600 dark:text-rose-400",
    };
  }
  if (norm.includes("ESO")) {
    return {
      borderLeft: "border-l-4 border-l-blue-500",
      cardBg: "bg-blue-50/30 dark:bg-blue-950/20",
      cardBorder: "border-blue-200 dark:border-blue-900/60 hover:border-blue-400 dark:hover:border-blue-600",
      badge: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800",
      accentText: "text-blue-600 dark:text-blue-400",
    };
  }
  if (norm.includes("VN") || norm.includes("MOH") || norm.includes("BỘ Y TẾ")) {
    return {
      borderLeft: "border-l-4 border-l-emerald-500",
      cardBg: "bg-emerald-50/30 dark:bg-emerald-950/20",
      cardBorder: "border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-600",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800",
      accentText: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (norm.includes("AES") || norm.includes("ILAE")) {
    return {
      borderLeft: "border-l-4 border-l-indigo-500",
      cardBg: "bg-indigo-50/30 dark:bg-indigo-950/20",
      cardBorder: "border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-600",
      badge: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800",
      accentText: "text-indigo-600 dark:text-indigo-400",
    };
  }
  if (norm.includes("MDS")) {
    return {
      borderLeft: "border-l-4 border-l-teal-500",
      cardBg: "bg-teal-50/30 dark:bg-teal-950/20",
      cardBorder: "border-teal-200 dark:border-teal-900/60 hover:border-teal-400 dark:hover:border-teal-600",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/60 dark:text-teal-300 dark:border-teal-800",
      accentText: "text-teal-600 dark:text-teal-400",
    };
  }
  if (norm.includes("AHS") || norm.includes("HEADACHE")) {
    return {
      borderLeft: "border-l-4 border-l-orange-500",
      cardBg: "bg-orange-50/30 dark:bg-orange-950/20",
      cardBorder: "border-orange-200 dark:border-orange-900/60 hover:border-orange-400 dark:hover:border-orange-600",
      badge: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/60 dark:text-orange-300 dark:border-orange-800",
      accentText: "text-orange-600 dark:text-orange-400",
    };
  }
  if (norm.includes("ECTRIMS")) {
    return {
      borderLeft: "border-l-4 border-l-cyan-500",
      cardBg: "bg-cyan-50/30 dark:bg-cyan-950/20",
      cardBorder: "border-cyan-200 dark:border-cyan-900/60 hover:border-cyan-400 dark:hover:border-cyan-600",
      badge: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/60 dark:text-cyan-300 dark:border-cyan-800",
      accentText: "text-cyan-600 dark:text-cyan-400",
    };
  }
  if (norm.includes("AANEM")) {
    return {
      borderLeft: "border-l-4 border-l-sky-500",
      cardBg: "bg-sky-50/30 dark:bg-sky-950/20",
      cardBorder: "border-sky-200 dark:border-sky-900/60 hover:border-sky-400 dark:hover:border-sky-600",
      badge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-800",
      accentText: "text-sky-600 dark:text-sky-400",
    };
  }
  if (norm.includes("NCS")) {
    return {
      borderLeft: "border-l-4 border-l-violet-500",
      cardBg: "bg-violet-50/30 dark:bg-violet-950/20",
      cardBorder: "border-violet-200 dark:border-violet-900/60 hover:border-violet-400 dark:hover:border-violet-600",
      badge: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/60 dark:text-violet-300 dark:border-violet-800",
      accentText: "text-violet-600 dark:text-violet-400",
    };
  }
  if (norm.includes("AAN") || norm.includes("EAN")) {
    return {
      borderLeft: "border-l-4 border-l-purple-500",
      cardBg: "bg-purple-50/30 dark:bg-purple-950/20",
      cardBorder: "border-purple-200 dark:border-purple-900/60 hover:border-purple-400 dark:hover:border-purple-600",
      badge: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800",
      accentText: "text-purple-600 dark:text-purple-400",
    };
  }
  return {
    borderLeft: "border-l-4 border-l-amber-500",
    cardBg: "bg-amber-50/30 dark:bg-amber-950/20",
    cardBorder: "border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600",
    badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800",
    accentText: "text-amber-600 dark:text-amber-400",
  };
}

export function getEffectiveConferenceStatus(conf: ConferenceEvent): "LIVE" | "RECENT" | "UPCOMING" {
  if (!conf.startDate) return conf.status;

  const now = new Date();
  const start = new Date(conf.startDate);
  // Default end date is 3 days after start if not provided
  const end = conf.endDate
    ? new Date(conf.endDate)
    : new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);

  const nowTime = now.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime() + 24 * 60 * 60 * 1000; // extend through midnight of end date

  if (nowTime >= startTime && nowTime <= endTime) {
    return "LIVE";
  }
  if (nowTime > endTime) {
    return "RECENT";
  }
  return "UPCOMING";
}

function getConferenceTheme(conf: ConferenceEvent, effectiveStatus?: "LIVE" | "RECENT" | "UPCOMING"): ThemeStyle {
  const status = effectiveStatus || getEffectiveConferenceStatus(conf);
  if (status === "LIVE") {
    return {
      borderLeft: "border-l-4 border-l-red-500",
      cardBg: "bg-red-50/30 dark:bg-red-950/20",
      cardBorder: "border-red-200 dark:border-red-900/60 hover:border-red-400 dark:hover:border-red-600",
      badge: "bg-red-500 text-white border-red-500",
      accentText: "text-red-600 dark:text-red-400",
    };
  }
  if (status === "RECENT") {
    return {
      borderLeft: "border-l-4 border-l-amber-500",
      cardBg: "bg-amber-50/30 dark:bg-amber-950/20",
      cardBorder: "border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600",
      badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800",
      accentText: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    borderLeft: "border-l-4 border-l-indigo-500",
    cardBg: "bg-indigo-50/30 dark:bg-indigo-950/20",
    cardBorder: "border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-600",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800",
    accentText: "text-indigo-600 dark:text-indigo-400",
  };
}

export default function NeuroGuidePage() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTabId>("guidelines");

  // Filters
  const [selectedSubspecialty, setSelectedSubspecialty] = useState<SubspecialtyType>("All Subspecialties");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSocietyFilter, setSelectedSocietyFilter] = useState<string>("ALL");
  const [selectedConfStatus, setSelectedConfStatus] = useState<"ALL" | "LIVE" | "RECENT" | "UPCOMING">("ALL");

  // Selection states
  const [activeScenarioId, setActiveScenarioId] = useState<string>("ais-ivt-tenecteplase-4.5h");
  const [activeDetailTab, setActiveDetailTab] = useState<"matrix" | "temporal" | "conf_bridge">("matrix");

  // Guideline Docs with Periodic Autonomous Online Sync State
  const [guidelineDocs, setGuidelineDocs] = useState<GuidelineDoc[]>(MOCK_GUIDELINE_DOCS);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  // Dynamic Navigation Tabs with Live Counts
  const navTabs = useMemo(() => [
    {
      id: "guidelines" as const,
      label: "🔥 Practice Guidelines",
      badge: `${guidelineDocs.length}`,
    },
    {
      id: "conf" as const,
      label: "🎙️ Conferences & Late-Breaking Trials",
      badge: `${MOCK_CONFERENCE_EVENTS.length}`,
    },
    {
      id: "matrix" as const,
      label: "⚖️ Clinical Scenarios",
      badge: `${MOCK_CLINICAL_SCENARIOS.length}`,
    },
  ], [guidelineDocs.length]);

  // Expandable cards states (details reveal only on click)
  const [expandedGuidelineIds, setExpandedGuidelineIds] = useState<Record<string, boolean>>({});
  const [expandedConferenceIds, setExpandedConferenceIds] = useState<Record<string, boolean>>({});

  // Local Batch Manifest Modal State
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchInputText, setBatchInputText] = useState<string>("");
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchPreviewDocs, setBatchPreviewDocs] = useState<
    (GuidelineDoc & { isAlreadyIndexed: boolean; sourceFilename: string })[]
  >([]);

  const handleParseBatch = async () => {
    if (!batchInputText.trim()) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch("/api/neuroguide/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textManifest: batchInputText }),
      });
      const data = await res.json();
      if (data.status === "success" && data.guidelines) {
        setBatchPreviewDocs(data.guidelines);
      }
    } catch (err) {
      console.error("Batch import error:", err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleCommitBatchImport = () => {
    if (batchPreviewDocs.length === 0) return;
    setGuidelineDocs((prev) => {
      const existingIds = new Set(prev.map((g) => g.id.toLowerCase()));
      const existingTitles = new Set(prev.map((g) => g.title.toLowerCase().trim()));
      const novel = batchPreviewDocs.filter(
        (doc) => !existingIds.has(doc.id.toLowerCase()) && !existingTitles.has(doc.title.toLowerCase().trim())
      );
      const merged = [...novel, ...prev];
      try {
        localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(merged));
      } catch (e) {
        console.warn("Could not save to localStorage:", e);
      }
      setSyncMessage(`Đã nạp thành công ${novel.length} hướng dẫn mới từ danh sách file.`);
      return merged;
    });
    setShowBatchModal(false);
    setBatchPreviewDocs([]);
    setBatchInputText("");
  };

  const matrixContainerRef = useRef<HTMLDivElement>(null);

  // Background Autonomous Sync Method
  const triggerSync = async (isAuto = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/neuroguide/sync-guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPeriodicCron: isAuto }),
      });
      const json = await res.json();
      if (json.status === "success" && json.guidelines && json.guidelines.length > 0) {
        setGuidelineDocs((prev) => {
          const existingIds = new Set(prev.map((g) => g.id.toLowerCase()));
          const existingTitles = new Set(prev.map((g) => g.title.toLowerCase().trim()));
          const novel = json.guidelines.filter(
            (g: GuidelineDoc) =>
              !existingIds.has(g.id.toLowerCase()) && !existingTitles.has(g.title.toLowerCase().trim())
          );
          if (novel.length > 0) {
            const merged = [...novel, ...prev];
            try {
              localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(merged));
            } catch (e) {
              console.warn("Could not save to localStorage:", e);
            }
            setSyncMessage(`Tự động tìm thấy ${novel.length} hướng dẫn mới từ radar trực tuyến.`);
            return merged;
          } else {
            if (!isAuto) {
              setSyncMessage("Radar đã đồng bộ: Thư viện hiện tại đã cập nhật đầy đủ các hướng dẫn mới nhất.");
            }
            return prev;
          }
        });
        const nowStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        setLastSyncedTime(nowStr);
        localStorage.setItem("neuroguide_last_sync_timestamp", Date.now().toString());
      }
    } catch (err) {
      console.warn("Background radar sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Periodic autonomous radar sync
  useEffect(() => {
    try {
      const cached = localStorage.getItem("neuroguide_cached_guidelines");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= MOCK_GUIDELINE_DOCS.length) {
          setGuidelineDocs(parsed);
        }
      }
    } catch (e) {}

    const lastSync = localStorage.getItem("neuroguide_last_sync_timestamp");
    const now = Date.now();
    const FOUR_HOURS = 4 * 60 * 60 * 1000;
    if (!lastSync || now - parseInt(lastSync, 10) > FOUR_HOURS) {
      triggerSync(true);
    }

    const interval = setInterval(() => {
      triggerSync(true);
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Sync dark mode with ecosystem standards (both neuro_dark_mode and neuropulse_theme)
  useEffect(() => {
    const savedDark =
      localStorage.getItem("neuro_dark_mode") === "true" ||
      localStorage.getItem("neuropulse_theme") === "dark";
    setDarkMode(savedDark);
    if (savedDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("neuro_dark_mode", "true");
        localStorage.setItem("neuropulse_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("neuro_dark_mode", "false");
        localStorage.setItem("neuropulse_theme", "light");
      }
      return next;
    });
  };

  const toggleGuideline = (docId: string) => {
    setExpandedGuidelineIds((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const toggleConference = (confId: string) => {
    setExpandedConferenceIds((prev) => ({
      ...prev,
      [confId]: !prev[confId],
    }));
  };

  // Dynamically derive available societies from guideline documents
  const availableSocieties = useMemo(() => {
    const set = new Set<string>();
    guidelineDocs.forEach((d) => set.add(d.society));
    return ["ALL", ...Array.from(set)];
  }, [guidelineDocs]);

  // Filtered Scenarios (Multi-token search with diacritics normalization)
  const filteredScenarios = useMemo(() => {
    const rawQ = searchQuery.toLowerCase().trim();
    const tokens = rawQ.split(/\s+/).filter(Boolean);

    return MOCK_CLINICAL_SCENARIOS.filter((scenario) => {
      const matchesSub =
        selectedSubspecialty === "All Subspecialties" ||
        scenario.subspecialty === selectedSubspecialty;

      if (!matchesSub) return false;
      if (tokens.length === 0) return true;

      const rawHaystack = `${scenario.id} ${scenario.title} ${scenario.summary} ${scenario.keyTags.join(" ")} ${scenario.subspecialty} ${scenario.statusBadge} ${scenario.confAlertText || ""}`.toLowerCase();
      const normHaystack = rawHaystack.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return tokens.every((token) => {
        const normToken = token.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return rawHaystack.includes(token) || normHaystack.includes(normToken);
      });
    });
  }, [selectedSubspecialty, searchQuery]);

  // Current Scenario
  const currentScenario = useMemo(() => {
    return (
      filteredScenarios.find((s) => s.id === activeScenarioId) ||
      filteredScenarios[0] ||
      null
    );
  }, [filteredScenarios, activeScenarioId]);

  // Current Scenario's Recommendation Atoms
  const scenarioRecommendations = useMemo(() => {
    if (!currentScenario) return [];
    return MOCK_RECOMMENDATION_ATOMS.filter(
      (atom) => atom.scenarioId === currentScenario.id && atom.isLatestForSociety
    );
  }, [currentScenario]);

  // Filtered Guidelines: Multi-token Search + Diacritics Normalization + Direct Subspecialty + Chronological Sort
  const filteredGuidelines = useMemo(() => {
    const rawQ = searchQuery.toLowerCase().trim();
    const tokens = rawQ.split(/\s+/).filter(Boolean);

    const list = guidelineDocs.filter((doc) => {
      const matchesSociety =
        selectedSocietyFilter === "ALL" || doc.society === selectedSocietyFilter;
      const matchesSub =
        selectedSubspecialty === "All Subspecialties" ||
        doc.subspecialty === selectedSubspecialty ||
        (doc.subspecialties && doc.subspecialties.includes(selectedSubspecialty)) ||
        MOCK_CLINICAL_SCENARIOS.some(
          (s) => doc.linkedScenarioIds.includes(s.id) && s.subspecialty === selectedSubspecialty
        );

      if (!matchesSociety || !matchesSub) return false;
      if (tokens.length === 0) return true;

      const changesText = doc.allPracticeChanges
        .map(
          (c) =>
            `${c.topic} ${c.currentText} ${c.category} ${c.previousText || ""} ${
              c.drivingTrials?.join(" ") || ""
            } ${c.currentGrade} ${c.previousGrade || ""}`
        )
        .join(" ");

      const rawHaystack = `${doc.id} ${doc.title} ${doc.society} ${doc.journalTarget} ${doc.documentType} ${doc.executiveSummary} ${doc.year} ${doc.publishDate} ${doc.subspecialty} ${changesText}`.toLowerCase();
      const normHaystack = rawHaystack.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return tokens.every((token) => {
        const normToken = token.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return rawHaystack.includes(token) || normHaystack.includes(normToken);
      });
    });

    // CHRONOLOGICAL SORTING: Newest publishDate first, then year descending
    return list.sort((a, b) => {
      if (b.publishDate && a.publishDate) {
        return b.publishDate.localeCompare(a.publishDate);
      }
      return b.year - a.year;
    });
  }, [selectedSocietyFilter, selectedSubspecialty, searchQuery, guidelineDocs]);

  // Filtered Conferences: Multi-token Search + Diacritics Normalization + Dynamic Live Status + Chronological Sort
  const filteredConferences = useMemo(() => {
    const rawQ = searchQuery.toLowerCase().trim();
    const tokens = rawQ.split(/\s+/).filter(Boolean);

    const list = MOCK_CONFERENCE_EVENTS.filter((conf) => {
      const liveStatus = getEffectiveConferenceStatus(conf);
      const matchesStatus =
        selectedConfStatus === "ALL" || liveStatus === selectedConfStatus;
      const matchesSub =
        selectedSubspecialty === "All Subspecialties" ||
        conf.subspecialties.includes("All Subspecialties") ||
        conf.subspecialties.includes(selectedSubspecialty);

      if (!matchesStatus || !matchesSub) return false;
      if (tokens.length === 0) return true;

      const trialsText = conf.lateBreakingTrials
        .map(
          (tr) =>
            `${tr.trialAcronym} ${tr.title} ${tr.primaryOutcome} ${tr.populationSummary} ${
              tr.bottomLineTakeaway
            } ${tr.publishedJournal || ""} ${tr.safetyOutcome} ${tr.studyDesign}`
        )
        .join(" ");

      const rawHaystack = `${conf.id} ${conf.name} ${conf.acronym} ${conf.location} ${conf.dates} ${conf.executiveSummary} ${liveStatus} ${conf.year} ${conf.startDate || ""} ${conf.subspecialties.join(" ")} ${trialsText}`.toLowerCase();
      const normHaystack = rawHaystack.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return tokens.every((token) => {
        const normToken = token.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return rawHaystack.includes(token) || normHaystack.includes(normToken);
      });
    });

    // CHRONOLOGICAL SORTING: LIVE events first, then by startDate descending
    return list.sort((a, b) => {
      const statusA = getEffectiveConferenceStatus(a);
      const statusB = getEffectiveConferenceStatus(b);
      if (statusA === "LIVE" && statusB !== "LIVE") return -1;
      if (statusB === "LIVE" && statusA !== "LIVE") return 1;

      if (b.startDate && a.startDate) {
        return b.startDate.localeCompare(a.startDate);
      }
      return b.year - a.year;
    });
  }, [selectedConfStatus, selectedSubspecialty, searchQuery]);

  // Jump from Guideline or Trial to Scenario Matrix
  const handleJumpToScenario = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    setActiveTab("matrix");
    setActiveDetailTab("matrix");
    setTimeout(() => {
      matrixContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <main
      className={`min-h-screen py-8 px-4 sm:px-8 transition-colors duration-200 ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* =========================================================================
            HEADER: Identical design language to NeuroPulse & NeuroCase
           ========================================================================= */}
        <header className="mb-6 pt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-600 shadow-sm shadow-amber-500/50"></span>
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-widest ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                CLINICAL PRACTICE GUIDELINES &amp; CONFERENCE RADAR
              </span>
            </div>
            <h1
              className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              NEUROGUIDE
            </h1>
          </div>

          {/* Quick Header Badges & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                darkMode
                  ? "bg-amber-950 text-amber-300 border-amber-800 hover:bg-amber-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{darkMode ? "☀️ Light" : "🌙 Night Shift"}</span>
            </button>

            <AdminButton darkMode={darkMode} />

            {/* 9-DOTS ECOSYSTEM APP SWITCHER */}
            <AppSwitcher currentApp="neuroguide" darkMode={darkMode} />
          </div>
        </header>

        {/* =========================================================================
            NAVIGATION BAR (3 Tabs in user-specified order + Contextual Search)
           ========================================================================= */}
        <nav
          className={`mb-6 p-1.5 rounded-xl border flex flex-wrap items-center justify-between gap-1.5 ${
            darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          {/* Tab 1: Guidelines | Tab 2: Conferences | Tab 3: Scenarios */}
          <div className="flex flex-wrap items-center gap-1.5">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-amber-500 text-white shadow-sm"
                      : darkMode
                      ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : darkMode
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Universal Search Input active across Guidelines, Conferences & Scenarios */}
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder={
                activeTab === "guidelines"
                  ? "Search guidelines, trials, topics..."
                  : activeTab === "conf"
                  ? "Search conferences, late-breaking trials..."
                  : "Search clinical scenarios..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border outline-none transition-all ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </nav>

        {/* =========================================================================
            SUBSPECIALTY FILTER CHIPS (Horizontal Scroll Bar)
           ========================================================================= */}
        <div
          className={`mb-6 p-2 rounded-xl border overflow-x-auto scrollbar-none flex items-center gap-1.5 ${
            darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap ml-1 mr-1">
            Subspecialty:
          </span>
          {NEUROLOGY_SUBSPECIALTIES.map((sub) => {
            const isSelected = selectedSubspecialty === sub;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubspecialty(sub)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-amber-500 text-white shadow-xs font-bold"
                    : darkMode
                    ? "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            TAB 1: PRACTICE GUIDELINES (Distinct theme colors, details revealed on click)
           ========================================================================= */}
        {activeTab === "guidelines" && (
          <div className="space-y-4">
            {/* Direct Society Filter Bar */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold text-slate-400 mr-1 whitespace-nowrap">
                  Society:
                </span>
                {availableSocieties.map((soc) => (
                  <button
                    key={soc}
                    onClick={() => setSelectedSocietyFilter(soc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedSocietyFilter === soc
                        ? "bg-amber-500 text-white"
                        : darkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {soc === "ALL" ? "All Societies" : soc}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400 font-medium hidden sm:block">
                Showing {filteredGuidelines.length} documents
              </div>
            </div>

            {/* Guideline Cards (Colored by Society, Click to Expand Details) */}
            {filteredGuidelines.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                <span className="text-3xl block mb-2">🔍</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No guidelines match &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for &ldquo;Tenecteplase&rdquo;, &ldquo;Thrombectomy&rdquo;, &ldquo;Blood Pressure&rdquo;, or &ldquo;AHA&rdquo;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSocietyFilter("ALL");
                    setSelectedSubspecialty("All Subspecialties");
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredGuidelines.map((doc) => {
                  const isExpanded = !!expandedGuidelineIds[doc.id];
                  const isVietnamese = doc.society === "VN-MOH";
                  const theme = getGuidelineTheme(doc.society);

                  return (
                    <div
                      key={doc.id}
                      className={`rounded-2xl border transition-all ${theme.borderLeft} ${theme.cardBg} ${theme.cardBorder} shadow-xs`}
                    >
                    {/* Clickable Header / Card Summary */}
                    <div
                      onClick={() => toggleGuideline(doc.id)}
                      className="p-4 sm:p-5 cursor-pointer select-none"
                    >
                      {/* Meta Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider uppercase border ${theme.badge}`}
                          >
                            {doc.society} {doc.year}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {doc.documentType} • {doc.journalTarget}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {isVietnamese ? "Ban hành:" : "Published:"} {doc.publishDate}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-bold leading-snug">
                        {doc.title}
                      </h3>

                      {/* Bottom Prompt Bar: Changes Badge + Click Indicator */}
                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <span>📋</span>
                          <span>
                            {isVietnamese
                              ? `${doc.allPracticeChanges.length} điểm thay đổi thực hành`
                              : `${doc.allPracticeChanges.length} Key Practice Changes`}
                          </span>
                        </span>

                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <span>
                            {isExpanded
                              ? isVietnamese
                                ? "Thu gọn ▴"
                                : "Collapse details ▴"
                              : isVietnamese
                              ? "Bấm để xem chi tiết ▾"
                              : "Click to view details ▾"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* EXPANDED SECTION: Detailed information revealed only upon click */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                        {/* Executive Summary */}
                        <div className="mb-4">
                          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            {isVietnamese ? "Tóm tắt cốt lõi:" : "Executive Summary:"}
                          </span>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
                            {doc.executiveSummary}
                          </p>
                        </div>

                        {/* All Practice Changes List */}
                        <div className="space-y-2 mb-4">
                          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block">
                            {isVietnamese
                              ? `Toàn bộ thay đổi so với bản trước (${doc.previousVersionYear || "trước đây"}):`
                              : `Practice Changes Breakdown vs. Previous Version (${doc.previousVersionYear || "Prior"}):`}
                          </span>

                          {doc.allPracticeChanges.map((change) => (
                            <div
                              key={change.id}
                              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                                darkMode
                                  ? "bg-slate-950/70 border-slate-800"
                                  : "bg-white border-slate-200"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                      change.changeType === "UPGRADED"
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        : change.changeType === "NEW"
                                        ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                    }`}
                                  >
                                    {change.changeType}
                                  </span>
                                  <span className="font-bold">{change.topic}</span>
                                </div>

                                <div className="flex items-center gap-2 text-[11px]">
                                  {change.previousGrade && (
                                    <span className="text-slate-400 line-through">
                                      {change.previousGrade}
                                    </span>
                                  )}
                                  <span className="font-extrabold text-amber-600 dark:text-amber-400">
                                    ➔ {change.currentGrade}
                                  </span>
                                </div>
                              </div>

                              <p className="text-slate-700 dark:text-slate-300">
                                {change.currentText}
                              </p>

                              {change.drivingTrials && change.drivingTrials.length > 0 && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                                  <span className="font-semibold">
                                    {isVietnamese ? "Chứng cứ thúc đẩy:" : "Supporting Evidence:"}
                                  </span>
                                  <span>{change.drivingTrials.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action Bar */}
                        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={doc.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-500 flex items-center gap-1"
                          >
                            <span>
                              {isVietnamese
                                ? `Xem văn bản gốc trên ${doc.journalTarget}`
                                : `Read original article on ${doc.journalTarget}`}
                            </span>
                            <span>↗</span>
                          </a>

                          <div className="flex items-center gap-2">
                            {doc.linkedScenarioIds.length > 0 && (
                              <button
                                onClick={() => handleJumpToScenario(doc.linkedScenarioIds[0])}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <span>⚖️ View in Scenario Matrix</span>
                                <span>➔</span>
                              </button>
                            )}

                            <button
                              onClick={() => toggleGuideline(doc.id)}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              {isVietnamese ? "Thu gọn ▴" : "Collapse ▴"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: CONFERENCES & LATE-BREAKING TRIALS (Distinct theme colors, details on click)
           ========================================================================= */}
        {activeTab === "conf" && (
          <div className="space-y-4">
            {/* Direct Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 mr-1">Status:</span>
                {(["ALL", "LIVE", "RECENT", "UPCOMING"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedConfStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedConfStatus === st
                        ? "bg-amber-500 text-white"
                        : darkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {st === "ALL"
                      ? "All Events"
                      : st === "LIVE"
                      ? "🔴 LIVE"
                      : st === "RECENT"
                      ? "🟡 Recent"
                      : "⚪ Upcoming"}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {filteredConferences.length} Major Conferences Monitored
              </div>
            </div>

            {/* Conference Cards List (Colored by Status, Click to Expand Details) */}
            {filteredConferences.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                <span className="text-3xl block mb-2">🔍</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No conferences or trials match &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for trial acronyms like &ldquo;LASTE&rdquo;, &ldquo;TRACE-III&rdquo;, &ldquo;ESCAPE-MeVO&rdquo;, or &ldquo;ESOC&rdquo;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedConfStatus("ALL");
                    setSelectedSubspecialty("All Subspecialties");
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredConferences.map((conf) => {
                const isExpanded = !!expandedConferenceIds[conf.id];
                const liveStatus = getEffectiveConferenceStatus(conf);
                const theme = getConferenceTheme(conf, liveStatus);

                return (
                  <div
                    key={conf.id}
                    className={`rounded-2xl border transition-all ${theme.borderLeft} ${theme.cardBg} ${theme.cardBorder} shadow-xs`}
                  >
                    {/* Clickable Header / Conference Summary */}
                    <div
                      onClick={() => toggleConference(conf.id)}
                      className="p-4 sm:p-5 cursor-pointer select-none"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-xl font-black ${theme.accentText}`}>
                            {conf.acronym}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase border ${theme.badge}`}
                          >
                            {liveStatus === "LIVE"
                              ? "🔴 LIVE"
                              : liveStatus === "RECENT"
                              ? "🟡 RECENT"
                              : "⚪ UPCOMING"}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {conf.dates} • {conf.location}
                          </span>
                        </div>

                        <a
                          href={conf.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <span>Official Website</span>
                          <span>↗</span>
                        </a>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold leading-snug">
                        {conf.name}
                      </h3>

                      {/* Bottom Prompt Bar: Stats Pill + Click Indicator */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {conf.stats.totalLateBreakingTrials} Late-Breaking Trials
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {conf.stats.positiveTrials} Positive
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {conf.stats.practiceChangingCount} ⚡ Practice-Changing
                          </span>
                        </div>

                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <span>
                            {isExpanded
                              ? "Collapse trials & details ▴"
                              : "Click to view trials & details ▾"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* EXPANDED SECTION: Detailed trial presentations revealed only upon click */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                        {/* Executive Summary */}
                        <div className="mb-4">
                          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Conference Intelligence Summary:
                          </span>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
                            {conf.executiveSummary}
                          </p>
                        </div>

                        {/* Trials Grid */}
                        <div className="space-y-3">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                            Podium Trial Presentations ({conf.lateBreakingTrials.length}):
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {conf.lateBreakingTrials.map((tr) => (
                              <div
                                key={tr.id}
                                className={`p-4 rounded-2xl border flex flex-col justify-between ${
                                  darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-base font-black text-amber-600 dark:text-amber-400">
                                      {tr.trialAcronym}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        {tr.studyDesign}
                                      </span>
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                        {tr.verdict}
                                      </span>
                                    </div>
                                  </div>

                                  <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                                    {tr.title}
                                  </h5>

                                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                                    <div>
                                      <span className="font-bold text-slate-400">Population (P):</span>{" "}
                                      {tr.populationSummary}
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-400">Intervention vs. Control:</span>{" "}
                                      {tr.interventionGroup} vs {tr.controlGroup}
                                    </div>
                                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                      🎯 {tr.primaryOutcome}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      🛡️ {tr.safetyOutcome}
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold truncate">
                                    💡 {tr.bottomLineTakeaway}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {tr.fullTextUrl && (
                                      <a
                                        href={tr.fullTextUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10.5px] font-bold text-slate-400 hover:text-amber-500 hover:underline flex items-center gap-0.5"
                                      >
                                        <span>Paper</span>
                                        <span>↗</span>
                                      </a>
                                    )}
                                    {tr.impactedScenarioId && (
                                      <button
                                        onClick={() => handleJumpToScenario(tr.impactedScenarioId!)}
                                        className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap ml-1"
                                      >
                                        Matrix ➔
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                          <a
                            href={conf.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <span>Official Supplement / Abstracts</span>
                            <span>↗</span>
                          </a>

                          <button
                            onClick={() => toggleConference(conf.id)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            Collapse trials ▴
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: CLINICAL SCENARIOS MATRIX (Master-Detail 2-Column Layout)
           ========================================================================= */}
        {activeTab === "matrix" && (
          <div ref={matrixContainerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {filteredScenarios.length === 0 ? (
              /* Robust Empty State when search/filter returns 0 items */
              <div className="lg:col-span-12 p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                <span className="text-3xl block mb-2">🔍</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No clinical scenarios found
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  No matching scenarios for &ldquo;{searchQuery}&rdquo; in {selectedSubspecialty}.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSubspecialty("All Subspecialties");
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                {/* LEFT COLUMN (4/12): Scenario Explorer */}
                <aside className="lg:col-span-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Clinical Scenarios ({filteredScenarios.length})
                    </span>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      {selectedSubspecialty}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[850px] overflow-y-auto pr-1">
                    {filteredScenarios.map((scenario) => {
                      const isSelected = scenario.id === activeScenarioId;
                      return (
                        <button
                          key={scenario.id}
                          onClick={() => setActiveScenarioId(scenario.id)}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                            isSelected
                              ? darkMode
                                ? "bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md shadow-amber-500/10"
                                : "bg-amber-50/80 border-amber-500 text-slate-900 ring-1 ring-amber-500/40 shadow-md shadow-amber-500/10"
                              : darkMode
                              ? "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200"
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {scenario.subspecialty}
                            </span>

                            {scenario.statusBadge && (
                              <span
                                className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-full ${
                                  scenario.statusBadge === "PRACTICE_CHANGING"
                                    ? "bg-amber-500 text-slate-950"
                                    : scenario.statusBadge === "UPGRADED"
                                    ? "bg-emerald-500 text-white"
                                    : "bg-blue-500 text-white"
                                }`}
                              >
                                {scenario.statusBadge === "PRACTICE_CHANGING"
                                  ? "⚡ Practice-Changing"
                                  : scenario.statusBadge}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2">
                            {scenario.title}
                          </h4>

                          {scenario.hasConfAlert && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 px-2 py-0.5 rounded-md">
                              <span>🔔</span>
                              <span className="truncate">{scenario.confAlertText}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </aside>

                {/* RIGHT COLUMN (8/12): Detailed Comparison Dashboard */}
                <section className="lg:col-span-8 space-y-5">
                  {currentScenario && (
                    <div
                      className={`rounded-2xl border p-5 transition-all ${
                        darkMode
                          ? "bg-slate-900 border-slate-800"
                          : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      {/* Scenario Header */}
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                            {currentScenario.subspecialty}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            ID: {currentScenario.id}
                          </span>
                        </div>

                        <h2 className="text-lg sm:text-xl font-black leading-snug">
                          {currentScenario.title}
                        </h2>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                          {currentScenario.summary}
                        </p>

                        {/* Ecosystem Deep Links with dead # prevention */}
                        {currentScenario.ecosystemLinks && (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                              Cross-Ecosystem Clinical Tools:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {currentScenario.ecosystemLinks.map((link, idx) => (
                                <Link
                                  key={idx}
                                  href={link.href}
                                  onClick={(e) => {
                                    if (link.href === "#") {
                                      e.preventDefault();
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    link.href === "#" ? "cursor-default" : ""
                                  } ${
                                    link.app === "NeuroRx"
                                      ? "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
                                      : link.app === "NeuroCalc"
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                      : link.app === "NeuroVision"
                                      ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                                      : "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                                  }`}
                                >
                                  <span>👉 {link.app}:</span>
                                  <span>{link.label}</span>
                                  {link.badge && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 border font-extrabold">
                                      {link.badge}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Detail Tabs - Clean & Concise */}
                      <div className="mt-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
                        <button
                          onClick={() => setActiveDetailTab("matrix")}
                          className={`pb-2.5 px-1.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            activeDetailTab === "matrix"
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>⚖️</span>
                          <span>Cross-Society Matrix</span>
                        </button>
                        <button
                          onClick={() => setActiveDetailTab("temporal")}
                          className={`pb-2.5 px-1.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            activeDetailTab === "temporal"
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>⏳</span>
                          <span>Guideline Diff</span>
                        </button>
                        <button
                          onClick={() => setActiveDetailTab("conf_bridge")}
                          className={`pb-2.5 px-1.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            activeDetailTab === "conf_bridge"
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>⚡</span>
                          <span>Evidence Bridge</span>
                        </button>
                      </div>

                      {/* TAB 1: CROSS-SOCIETY MATRIX */}
                      {activeDetailTab === "matrix" && (
                        <div className="mt-5 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                            {scenarioRecommendations.map((atom) => {
                              const tier = TIER_CONFIG[atom.normalizedTier];
                              return (
                                <div
                                  key={atom.id}
                                  className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                                    darkMode
                                      ? "bg-slate-950/70 border-slate-800"
                                      : "bg-slate-50/90 border-slate-200"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-2.5">
                                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                        {atom.society} ({atom.year})
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${tier.badgeBg} ${tier.textColor} ${tier.borderColor}`}
                                      >
                                        Tier {atom.normalizedTier}
                                      </span>
                                    </div>

                                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-2">
                                      {atom.originalGrade}
                                    </div>

                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium mb-3">
                                      {atom.recommendationText}
                                    </p>

                                    {atom.eligibilityCriteria && (
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                                        <span className="font-bold">
                                          {atom.society === "VN-MOH"
                                            ? "Điều kiện áp dụng:"
                                            : "Eligibility Criteria:"}
                                        </span>{" "}
                                        {atom.eligibilityCriteria}
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                      {atom.society === "VN-MOH"
                                        ? "Thử nghiệm / Dữ liệu trích dẫn:"
                                        : "Pivotal Trials Cited:"}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {atom.citedTrials.map((tr, i) => (
                                        <span
                                          key={i}
                                          className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border text-slate-600 dark:text-slate-300 font-semibold"
                                        >
                                          {tr}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* TAB 2: TEMPORAL EVOLUTION */}
                      {activeDetailTab === "temporal" && (
                        <div className="mt-5 space-y-4">
                          {currentScenario.temporalEvolution &&
                          currentScenario.temporalEvolution.length > 0 ? (
                            <div className="space-y-3">
                              {currentScenario.temporalEvolution.map((evol, idx) => (
                                <div
                                  key={idx}
                                  className={`p-4 rounded-2xl border ${
                                    darkMode
                                      ? "bg-slate-950/60 border-slate-800"
                                      : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                      {evol.society} Evolution Timeline
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                      ⬆️ {evol.shiftDirection}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2.5">
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                      <div className="text-[11px] text-slate-400 font-bold mb-1">
                                        PREVIOUS VERSION ({evol.previousYear}):
                                      </div>
                                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {evol.previousGrade}
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mb-1">
                                        CURRENT GUIDELINE ({evol.currentYear}):
                                      </div>
                                      <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                        {evol.currentGrade}
                                      </div>
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {evol.evolutionNarrative}
                                  </p>

                                  <div className="mt-2 text-[11px] text-slate-500">
                                    <span className="font-bold">Driving Phase 3 Trials:</span>{" "}
                                    {evol.drivingTrials.join(" • ")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-slate-400">
                              Recommendations remained stable across sequential guideline releases.
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 3: LATE-BREAKING EVIDENCE BRIDGE */}
                      {activeDetailTab === "conf_bridge" && (
                        <div className="mt-5 space-y-4">
                          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                            <span className="text-xl">⚡</span>
                            <div>
                              <h4 className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">
                                Evidence-to-Guideline Bridge (Guideline Watch)
                              </h4>
                              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                                Phase 3 randomized trials recently reported at international podiums (ISC / ESOC / AAN) that anticipate or prompt future guideline modifications.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {MOCK_CONFERENCE_EVENTS.flatMap((c) => c.lateBreakingTrials)
                              .filter(
                                (tr) =>
                                  tr.impactedScenarioId === currentScenario.id ||
                                  tr.subspecialty === currentScenario.subspecialty
                              )
                              .map((tr) => (
                                <div
                                  key={tr.id}
                                  className={`p-3.5 rounded-2xl border text-xs ${
                                    darkMode
                                      ? "bg-slate-950/60 border-slate-800"
                                      : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1.5">
                                    <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                                      {tr.trialAcronym}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                      {tr.verdict}
                                    </span>
                                  </div>

                                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                                    {tr.title}
                                  </p>

                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                                    {tr.populationSummary}
                                  </p>

                                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border text-[11px] space-y-1 mb-2">
                                    <div>
                                      <span className="font-bold">Primary Endpoint:</span>{" "}
                                      {tr.primaryOutcome}
                                    </div>
                                    <div>
                                      <span className="font-bold">Safety Profile:</span>{" "}
                                      {tr.safetyOutcome}
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                    💡 {tr.bottomLineTakeaway}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* BOTTOM AI APPRAISAL BOX */}
                      <div className="mt-6 p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent">
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-base">🧠</span>
                          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            AI Clinical Appraisal &amp; Practice Verdict
                          </h4>
                        </div>

                        <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-slate-400 whitespace-nowrap">
                              ⚖️ Consensus:
                            </span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                              {currentScenario.aiSynthesisAppraisal.consensusLevel ===
                              "HIGH_CONCORDANCE"
                                ? "High Concordance across Major Societies"
                                : "Moderate Variation / Conditional Discordance"}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="font-bold text-slate-400 whitespace-nowrap">
                              🔍 Root Cause:
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {currentScenario.aiSynthesisAppraisal.whyGuidelinesDiffer}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold">
                            <span className="font-extrabold">💡 Clinical Bottom-Line:</span>{" "}
                            {currentScenario.aiSynthesisAppraisal.clinicalBottomLine}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            FOOTER
           ========================================================================= */}
        <footer
          className={`border-t mt-12 py-6 text-center text-xs transition-colors ${
            darkMode
              ? "bg-slate-950 border-slate-800 text-slate-500"
              : "bg-slate-100 border-slate-200 text-slate-400"
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-500">NEUROGUIDE</span>
              <span>• Part of the Neuro Ecosystem</span>
            </div>
            <div>
              Clinical Practice Guidelines, Consensus Statements &amp; Conference Intelligence Radar
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
