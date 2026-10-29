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

const NAV_TABS = [
  {
    id: "guidelines",
    label: "🔥 Practice Guidelines",
    badge: `${MOCK_GUIDELINE_DOCS.length}`,
  },
  {
    id: "conf",
    label: "🎙️ Conferences & Late-Breaking Trials",
    badge: `${MOCK_CONFERENCE_EVENTS.length}`,
  },
  {
    id: "matrix",
    label: "⚖️ Clinical Scenarios",
    badge: `${MOCK_CLINICAL_SCENARIOS.length}`,
  },
] as const;

type NavTabId = (typeof NAV_TABS)[number]["id"];

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
  const [expandedGuidelineChanges, setExpandedGuidelineChanges] = useState<Record<string, boolean>>({});

  const matrixContainerRef = useRef<HTMLDivElement>(null);

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

  const toggleGuidelineAccordion = (docId: string) => {
    setExpandedGuidelineChanges((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  // Dynamically derive available societies from guideline documents
  const availableSocieties = useMemo(() => {
    const set = new Set<string>();
    MOCK_GUIDELINE_DOCS.forEach((d) => set.add(d.society));
    return ["ALL", ...Array.from(set)];
  }, []);

  // Filtered Scenarios (Search strictly applies here)
  const filteredScenarios = useMemo(() => {
    return MOCK_CLINICAL_SCENARIOS.filter((scenario) => {
      const matchesSub =
        selectedSubspecialty === "All Subspecialties" ||
        scenario.subspecialty === selectedSubspecialty;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        scenario.title.toLowerCase().includes(q) ||
        scenario.summary.toLowerCase().includes(q) ||
        scenario.keyTags.some((t) => t.toLowerCase().includes(q));
      return matchesSub && matchesSearch;
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

  // Filtered Guidelines
  const filteredGuidelines = useMemo(() => {
    return MOCK_GUIDELINE_DOCS.filter((doc) => {
      if (selectedSocietyFilter === "ALL") return true;
      return doc.society === selectedSocietyFilter;
    });
  }, [selectedSocietyFilter]);

  // Filtered Conferences
  const filteredConferences = useMemo(() => {
    return MOCK_CONFERENCE_EVENTS.filter((conf) => {
      const matchesStatus =
        selectedConfStatus === "ALL" || conf.status === selectedConfStatus;
      const matchesSub =
        selectedSubspecialty === "All Subspecialties" ||
        conf.subspecialties.includes("All Subspecialties") ||
        conf.subspecialties.includes(selectedSubspecialty);
      return matchesStatus && matchesSub;
    });
  }, [selectedConfStatus, selectedSubspecialty]);

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
            <div
              className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                darkMode
                  ? "bg-slate-900 border-slate-700 text-amber-300"
                  : "bg-white border-slate-200 text-slate-800"
              }`}
              title="AHA/ASA, ESO, AAN & VN-MOH Synchronized"
            >
              <span>⚡ Practice Guidelines Synced</span>
            </div>

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
            {NAV_TABS.map((tab) => {
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

          {/* Search ONLY active and visible on the Clinical Scenarios Tab */}
          {activeTab === "matrix" && (
            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search scenarios, trials, drugs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none transition-all ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          )}
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
            TAB 1: PRACTICE GUIDELINES (Pure guidelines view, no redundant subtitles)
           ========================================================================= */}
        {activeTab === "guidelines" && (
          <div className="space-y-4">
            {/* Direct Society Filter Bar without redundant introductory text */}
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

            {/* Guideline Cards */}
            <div className="grid grid-cols-1 gap-4">
              {filteredGuidelines.map((doc) => {
                const isExpanded = !!expandedGuidelineChanges[doc.id];
                const isVietnamese = doc.society === "VN-MOH";
                return (
                  <div
                    key={doc.id}
                    className={`rounded-2xl border transition-all ${
                      darkMode
                        ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="p-5">
                      {/* Meta Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider uppercase ${
                              doc.society === "AHA/ASA"
                                ? "bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30"
                                : doc.society === "ESO"
                                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {doc.society} {doc.year}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {doc.documentType} • {doc.journalTarget}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {isVietnamese ? "Ban hành:" : "Published:"} {doc.publishDate}
                        </span>
                      </div>

                      {/* Title & Executive Summary (Kept in original language) */}
                      <h3 className="text-base sm:text-lg font-bold leading-snug">
                        {doc.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                        {doc.executiveSummary}
                      </p>

                      {/* Practice Changes Accordion */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <span>📋</span>
                            <span>
                              {isVietnamese
                                ? `Các thay đổi thực hành so với bản trước (${doc.previousVersionYear || "trước đây"})`
                                : `Key Practice Changes vs. Previous Version (${doc.previousVersionYear || "Prior"})`}
                            </span>
                          </span>

                          <button
                            onClick={() => toggleGuidelineAccordion(doc.id)}
                            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <span>
                              {isExpanded
                                ? isVietnamese
                                  ? "Thu gọn ▴"
                                  : "Collapse ▴"
                                : isVietnamese
                                ? `Xem toàn bộ ${doc.allPracticeChanges.length} thay đổi ▾`
                                : `View all ${doc.allPracticeChanges.length} changes ▾`}
                            </span>
                          </button>
                        </div>

                        <div className="space-y-2 mt-2">
                          {(isExpanded
                            ? doc.allPracticeChanges
                            : doc.allPracticeChanges.slice(0, 2)
                          ).map((change) => (
                            <div
                              key={change.id}
                              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                                darkMode
                                  ? "bg-slate-950/60 border-slate-800"
                                  : "bg-slate-50 border-slate-200"
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
                      </div>

                      {/* Action Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
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

                        {doc.linkedScenarioIds.length > 0 && (
                          <button
                            onClick={() => handleJumpToScenario(doc.linkedScenarioIds[0])}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <span>⚖️ View in Scenario Matrix</span>
                            <span>➔</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: CONFERENCES & LATE-BREAKING TRIALS (Moved to Tab 2)
           ========================================================================= */}
        {activeTab === "conf" && (
          <div className="space-y-5">
            {/* Direct Filters Bar without redundant introductory headings */}
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

            {/* Conference Cards List */}
            <div className="grid grid-cols-1 gap-6">
              {filteredConferences.map((conf) => (
                <div
                  key={conf.id}
                  className={`rounded-2xl border p-5 sm:p-6 ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl font-black text-amber-500">
                        {conf.acronym}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                          conf.status === "LIVE"
                            ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 animate-pulse"
                            : conf.status === "RECENT"
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                            : "bg-slate-500/20 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {conf.status}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {conf.dates} • {conf.location}
                      </span>
                    </div>

                    <a
                      href={conf.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <span>Official Supplement / Abstracts</span>
                      <span>↗</span>
                    </a>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold mb-2">{conf.name}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {conf.executiveSummary}
                  </p>

                  {/* Stats Bar */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 mb-4 text-center">
                    <div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {conf.stats.totalLateBreakingTrials}
                      </div>
                      <div className="text-[10px] text-slate-500">Late-Breaking</div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                        {conf.stats.positiveTrials} Positive
                      </div>
                      <div className="text-[10px] text-slate-500">Efficacy Met</div>
                    </div>
                    <div>
                      <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                        {conf.stats.practiceChangingCount} ⚡
                      </div>
                      <div className="text-[10px] text-slate-500">Practice-Changing</div>
                    </div>
                  </div>

                  {/* Trials Presentations */}
                  {conf.lateBreakingTrials.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Podium Trial Presentations ({conf.lateBreakingTrials.length})
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {conf.lateBreakingTrials.map((tr) => (
                          <div
                            key={tr.id}
                            className={`p-4 rounded-2xl border flex flex-col justify-between ${
                              darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
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
                                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border text-[11px] font-semibold text-slate-800 dark:text-slate-200">
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
                  )}
                </div>
              ))}
            </div>
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

                      {/* Detail Tabs */}
                      <div className="mt-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                        <button
                          onClick={() => setActiveDetailTab("matrix")}
                          className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                            activeDetailTab === "matrix"
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>TAB 1:</span>
                          <span>Cross-Society Matrix (AHA vs. ESO vs. VN)</span>
                        </button>
                        <button
                          onClick={() => setActiveDetailTab("temporal")}
                          className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                            activeDetailTab === "temporal"
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>TAB 2:</span>
                          <span>Temporal Evolution (Guideline Diff)</span>
                        </button>
                        <button
                          onClick={() => setActiveDetailTab("conf_bridge")}
                          className={`pb-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                            activeDetailTab === "conf_bridge"
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>TAB 3:</span>
                          <span>Late-Breaking Evidence Bridge</span>
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
