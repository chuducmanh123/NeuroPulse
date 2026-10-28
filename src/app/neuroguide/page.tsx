"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  NEUROLOGY_SUBSPECIALTIES,
  SubspecialtyType,
  TIER_CONFIG,
  NormalizedTier,
  ClinicalScenario,
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
  LateBreakingTrial,
} from "../../types/neuroguide";
import {
  MOCK_CLINICAL_SCENARIOS,
  MOCK_GUIDELINE_DOCS,
  MOCK_RECOMMENDATION_ATOMS,
  MOCK_CONFERENCE_EVENTS,
} from "../../data/neuroguideMockData";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";

export default function NeuroGuidePage() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeMainView, setActiveMainView] = useState<"radar" | "matrix" | "conf">("radar");

  // Filter States
  const [selectedSubspecialty, setSelectedSubspecialty] = useState<SubspecialtyType>("All Subspecialties");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSocietyFilter, setSelectedSocietyFilter] = useState<string>("ALL");
  const [selectedConfStatus, setSelectedConfStatus] = useState<"ALL" | "LIVE" | "RECENT" | "UPCOMING">("ALL");

  // Selection States
  const [activeScenarioId, setActiveScenarioId] = useState<string>("ais-ivt-tenecteplase-4.5h");
  const [activeDetailTab, setActiveDetailTab] = useState<"matrix" | "temporal" | "conf_bridge">("matrix");
  const [expandedGuidelineChanges, setExpandedGuidelineChanges] = useState<Record<string, boolean>>({});
  const [selectedConfModal, setSelectedConfModal] = useState<ConferenceEvent | null>(null);

  // Sync Dark Mode with body/html
  useEffect(() => {
    const saved = localStorage.getItem("neuropulse_theme");
    if (saved === "dark") {
      setDarkMode(true);
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
        localStorage.setItem("neuropulse_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
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

  // Filtered Scenarios
  const filteredScenarios = useMemo(() => {
    return MOCK_CLINICAL_SCENARIOS.filter((scenario) => {
      const matchesSub =
        selectedSubspecialty === "All Subspecialties" ||
        scenario.subspecialty === selectedSubspecialty;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        scenario.titleVi.toLowerCase().includes(q) ||
        scenario.titleEn.toLowerCase().includes(q) ||
        scenario.summaryVi.toLowerCase().includes(q) ||
        scenario.keyTags.some((t) => t.toLowerCase().includes(q));
      return matchesSub && matchesSearch;
    });
  }, [selectedSubspecialty, searchQuery]);

  // Currently Active Scenario
  const currentScenario = useMemo(() => {
    return (
      MOCK_CLINICAL_SCENARIOS.find((s) => s.id === activeScenarioId) ||
      MOCK_CLINICAL_SCENARIOS[0]
    );
  }, [activeScenarioId]);

  // Current Scenario's Recommendation Atoms
  const scenarioRecommendations = useMemo(() => {
    if (!currentScenario) return [];
    return MOCK_RECOMMENDATION_ATOMS.filter(
      (atom) => atom.scenarioId === currentScenario.id && atom.isLatestForSociety
    );
  }, [currentScenario]);

  // Filtered Guidelines for Live Stream
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

  // Jump from Guideline or Trial to Scenario
  const handleJumpToScenario = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    setActiveMainView("matrix");
    setActiveDetailTab("matrix");
    window.scrollTo({ top: 380, behavior: "smooth" });
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* =========================================================================
          1. HEADER (Ecosystem Synchronized with Amber/Orange Branding)
         ========================================================================= */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md px-3 sm:px-6 py-3 transition-colors ${
          darkMode
            ? "bg-slate-900/90 border-slate-800"
            : "bg-white/95 border-slate-200 shadow-xs"
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/neuroguide"
              className="flex items-center gap-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-700 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-amber-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                    NeuroGuide
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    GUIDELINES & CONF
                  </span>
                </div>
                <p className="text-[10.5px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  Clinical Scenarios, Cross-Society Matrix & Late-Breaking Radar
                </p>
              </div>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Tra cứu tình huống, thuốc, thử nghiệm (VD: Tenecteplase, ASPECTS 3-5, LASTE)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border transition-all outline-none ${
                darkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  : "bg-slate-100/90 border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            {/* Dark Mode Switcher */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
              title={darkMode ? "Chuyển sang Day Shift" : "Chuyển sang Night Shift"}
            >
              {darkMode ? (
                <>
                  <span>☀️</span>
                  <span className="hidden lg:inline text-xs">Day</span>
                </>
              ) : (
                <>
                  <span>🌙</span>
                  <span className="hidden lg:inline text-xs">Night</span>
                </>
              )}
            </button>

            {/* 9-DOTS ECOSYSTEM APP SWITCHER */}
            <AppSwitcher currentApp="neuroguide" darkMode={darkMode} />
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. TOP VIEW SELECTOR & HERO RADAR BANNER
         ========================================================================= */}
      <section
        className={`border-b transition-colors ${
          darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Main View Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveMainView("radar")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                activeMainView === "radar"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                  : darkMode
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🔥</span>
              <span>Live Guideline & Conf Radar</span>
            </button>
            <button
              onClick={() => setActiveMainView("matrix")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                activeMainView === "matrix"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                  : darkMode
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>⚖️</span>
              <span>Ma trận Đối chiếu Tình huống</span>
            </button>
            <button
              onClick={() => setActiveMainView("conf")}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                activeMainView === "conf"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/30"
                  : darkMode
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🎙️</span>
              <span>Sóng Hội nghị & Thử nghiệm</span>
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>AHA 2026 / ESO 2024 Synced</span>
            </span>
            <span>•</span>
            <span>7 Core Scenarios</span>
            <span>•</span>
            <span>5 Major Conferences</span>
          </div>
        </div>

        {/* SUBSPECIALTY CHIPS (HORIZONTAL SCROLL BAR) */}
        <div className="border-t max-w-7xl mx-auto px-3 sm:px-6 py-2 overflow-x-auto scrollbar-none flex items-center gap-1.5 border-slate-200/60 dark:border-slate-800/80">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap mr-1">
            Chuyên khoa:
          </span>
          {NEUROLOGY_SUBSPECIALTIES.map((sub) => {
            const isSelected = selectedSubspecialty === sub;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubspecialty(sub)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-amber-500 text-white shadow-xs"
                    : darkMode
                    ? "bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          VIEW A: LIVE GUIDELINE & CONF RADAR (Default Landing Screen)
         ========================================================================= */}
      {activeMainView === "radar" && (
        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-8">
          {/* 1. Breaking Guidelines Stream */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔥</span>
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    Live Guideline Radar (Vừa Ban Hành & Cập Nhật)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Theo dõi thời gian thực các văn bản Hướng dẫn & Đồng thuận từ AHA/ASA, ESO, AAN và Bộ Y tế
                </p>
              </div>

              {/* Society Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {["ALL", "AHA/ASA", "ESO", "VN-MOH"].map((soc) => (
                  <button
                    key={soc}
                    onClick={() => setSelectedSocietyFilter(soc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedSocietyFilter === soc
                        ? "bg-amber-500 text-white"
                        : darkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200/70 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {soc === "ALL" ? "Tất cả Hiệp hội" : soc}
                  </button>
                ))}
              </div>
            </div>

            {/* Guideline Cards Grid */}
            <div className="grid grid-cols-1 gap-4">
              {filteredGuidelines.map((doc) => {
                const isExpanded = !!expandedGuidelineChanges[doc.id];
                return (
                  <div
                    key={doc.id}
                    className={`rounded-2xl border transition-all ${
                      darkMode
                        ? "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                        : "bg-white border-slate-200/90 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      {/* Top Meta Line */}
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
                          <span className="text-[11px] font-semibold text-slate-400">
                            {doc.documentType} • {doc.journalTarget}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Ban hành: {doc.publishDate}
                        </span>
                      </div>

                      {/* Titles */}
                      <h3 className="text-base sm:text-lg font-bold leading-snug">
                        {doc.titleVi || doc.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-0.5">
                        {doc.title}
                      </p>

                      {/* Executive Summary */}
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                        {doc.executiveSummaryVi}
                      </p>

                      {/* COMPREHENSIVE PRACTICE CHANGES ACCORDION */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <span>📋</span>
                            <span>
                              Thay đổi thực hành so với bản trước ({doc.previousVersionYear || "trước đây"})
                            </span>
                          </span>

                          <button
                            onClick={() => toggleGuidelineAccordion(doc.id)}
                            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <span>
                              {isExpanded
                                ? "Thu gọn ▴"
                                : `Xem toàn bộ ${doc.allPracticeChanges.length} thay đổi ▾`}
                            </span>
                          </button>
                        </div>

                        {/* List of Changes */}
                        <div className="space-y-2 mt-2">
                          {(isExpanded
                            ? doc.allPracticeChanges
                            : doc.allPracticeChanges.slice(0, 2)
                          ).map((change) => (
                            <div
                              key={change.id}
                              className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
                                darkMode
                                  ? "bg-slate-950/60 border-slate-800"
                                  : "bg-slate-50/80 border-slate-200"
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
                                  <span className="font-semibold">Bằng chứng thúc đẩy:</span>
                                  <span>{change.drivingTrials.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Links Bar */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <a
                          href={doc.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-500 flex items-center gap-1"
                        >
                          <span>Mở bài báo gốc trên {doc.journalTarget}</span>
                          <span>↗</span>
                        </a>

                        {doc.linkedScenarioIds.length > 0 && (
                          <button
                            onClick={() => handleJumpToScenario(doc.linkedScenarioIds[0])}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
                          >
                            <span>⚖️ Đi tới Ma trận Đối chiếu Tình huống</span>
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

          {/* 2. Conference Late-Breaking Science Radar */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎙️</span>
                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                    Conference Intelligence Radar (Sóng Hội Nghị & Late-Breaking Trials)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Bắt sóng các thử nghiệm lâm sàng đột phá vừa được báo cáo tại hội trường (ISC, ESOC, AAN, AAIC)
                </p>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1.5">
                {(["ALL", "LIVE", "RECENT", "UPCOMING"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedConfStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedConfStatus === st
                        ? "bg-amber-500 text-white"
                        : darkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200/70 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {st === "ALL"
                      ? "Tất cả"
                      : st === "LIVE"
                      ? "🔴 LIVE"
                      : st === "RECENT"
                      ? "🟡 Gần đây"
                      : "⚪ Sắp diễn ra"}
                  </button>
                ))}
              </div>
            </div>

            {/* Conference Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredConferences.map((conf) => (
                <div
                  key={conf.id}
                  className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                    darkMode
                      ? "bg-slate-900/90 border-slate-800"
                      : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-amber-500">
                          {conf.acronym}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            conf.status === "LIVE"
                              ? "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 animate-pulse"
                              : conf.status === "RECENT"
                              ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40"
                              : "bg-slate-500/20 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {conf.status === "LIVE"
                            ? "🔴 ĐANG DIỄN RA"
                            : conf.status === "RECENT"
                            ? "🟡 VỪA DIỄN RA"
                            : "⚪ SẮP TỚI"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        {conf.dates}
                      </span>
                    </div>

                    <h4 className="text-sm sm:text-base font-bold leading-tight mb-1">
                      {conf.name}
                    </h4>
                    <p className="text-xs text-slate-400 mb-2.5">
                      📍 {conf.location}
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                      {conf.executiveSummary}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 mb-3 text-center">
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
                        <div className="text-[10px] text-slate-500">Kết quả tốt</div>
                      </div>
                      <div>
                        <div className="text-sm font-black text-amber-600 dark:text-amber-400">
                          {conf.stats.practiceChangingCount} ⚡
                        </div>
                        <div className="text-[10px] text-slate-500">Đổi thực hành</div>
                      </div>
                    </div>

                    {/* Late-Breaking Trial Highlights */}
                    {conf.lateBreakingTrials.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                          Thử nghiệm then chốt được báo cáo:
                        </span>
                        {conf.lateBreakingTrials.map((tr) => (
                          <div
                            key={tr.id}
                            className={`p-2.5 rounded-xl border text-xs ${
                              darkMode
                                ? "bg-slate-950/40 border-slate-800"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-extrabold text-amber-600 dark:text-amber-400">
                                {tr.trialAcronym}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9.5px] font-black ${
                                  tr.verdict === "POSITIVE"
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "bg-slate-500/20 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {tr.verdict}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                              {tr.primaryOutcome}
                            </p>
                            {tr.guidelineImpactWarning && (
                              <div className="mt-1 text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
                                ⚡ {tr.guidelineImpactWarning}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <a
                      href={conf.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-slate-400 hover:text-amber-500 flex items-center gap-1"
                    >
                      <span>Trang chủ Hội nghị</span>
                      <span>↗</span>
                    </a>
                    <button
                      onClick={() => setSelectedConfModal(conf)}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Xem toàn văn báo cáo thử nghiệm ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* =========================================================================
          VIEW B: 2-COLUMN MASTER-DETAIL CLINICAL SCENARIO MATRIX
         ========================================================================= */}
      {activeMainView === "matrix" && (
        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* CỘT TRÁI (30% Width - 4/12 Cols): Danh sách Tình huống lâm sàng */}
            <aside className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Bản đồ Tình huống ({filteredScenarios.length})
                </span>
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  {selectedSubspecialty}
                </span>
              </div>

              {/* Scenario List */}
              <div className="space-y-2.5 max-h-[800px] overflow-y-auto pr-1">
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
                      {/* Subspecialty & Badges */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {scenario.subspecialty}
                        </span>

                        <div className="flex items-center gap-1">
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
                      </div>

                      {/* Scenario Title */}
                      <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2">
                        {scenario.titleVi}
                      </h4>

                      {/* Conference Alert Pill */}
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

            {/* CỘT PHẢI (70% Width - 8/12 Cols): Bảng Điều Khiển Đối Chiếu Lâm Sàng */}
            <section className="lg:col-span-8 space-y-5">
              {currentScenario && (
                <div
                  className={`rounded-2xl border p-5 transition-all ${
                    darkMode
                      ? "bg-slate-900/90 border-slate-800"
                      : "bg-white border-slate-200 shadow-xs"
                  }`}
                >
                  {/* Scenario Header Bar */}
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
                      {currentScenario.titleVi}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic mt-0.5">
                      {currentScenario.titleEn}
                    </p>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                      {currentScenario.summaryVi}
                    </p>

                    {/* Ecosystem Cross-App Action Links (Deep Linking) */}
                    {currentScenario.ecosystemLinks && (
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                          Hành động liên kết trong Hệ sinh thái (Ecosystem Bridges):
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          {currentScenario.ecosystemLinks.map((link, idx) => (
                            <Link
                              key={idx}
                              href={link.href}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
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

                  {/* Detail Tabs Bar */}
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
                      <span>Ma trận Đối chiếu Quốc tế (AHA vs ESO vs VN)</span>
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
                      <span>Thay đổi theo Thời gian (Temporal Diff)</span>
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
                      <span>Sóng Hội nghị & RCTs (& Conf)</span>
                    </button>
                  </div>

                  {/* TAB 1: MA TRẬN ĐỐI CHIẾU 3 CỘT (AHA vs ESO vs VN) */}
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
                                {/* Society Header */}
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

                                {/* Original Grade */}
                                <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-2">
                                  {atom.originalGrade}
                                </div>

                                {/* Core Recommendation */}
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium mb-3">
                                  {atom.recommendationText}
                                </p>

                                {/* Eligibility Criteria */}
                                {atom.eligibilityCriteria && (
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                                    <span className="font-bold">Điều kiện áp dụng:</span>{" "}
                                    {atom.eligibilityCriteria}
                                  </div>
                                )}
                              </div>

                              {/* Cited Trials */}
                              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                                <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                  Thử nghiệm trích dẫn:
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

                  {/* TAB 2: THAY ĐỔI THEO THỜI GIAN (TEMPORAL DIFF) */}
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
                                  {evol.society} Timeline
                                </span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                  ⬆️ {evol.shiftDirection}
                                </span>
                              </div>

                              {/* Before vs After */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2.5">
                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <div className="text-[11px] text-slate-400 font-bold mb-1">
                                    BẢN CŨ ({evol.previousYear}):
                                  </div>
                                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    {evol.previousGrade}
                                  </div>
                                </div>
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mb-1">
                                    BẢN HIỆN HÀNH ({evol.currentYear}):
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
                                <span className="font-bold">Các RCT thúc đẩy bước chuyển:</span>{" "}
                                {evol.drivingTrials.join(" • ")}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400">
                          Khuyến cáo duy trì tính ổn định qua các phiên bản cập nhật.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: BẰNG CHỨNG HỘI NGHỊ & EVIDENCE BRIDGE */}
                  {activeDetailTab === "conf_bridge" && (
                    <div className="mt-5 space-y-4">
                      {/* Live Bridge Alert */}
                      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                        <span className="text-xl">⚡</span>
                        <div>
                          <h4 className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">
                            Cầu nối Bằng chứng Hội nghị (Late-Breaking Evidence Watch)
                          </h4>
                          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                            Các thử nghiệm lâm sàng Pha 3 vừa công bố tại hội nghị quốc tế (ISC / ESOC / AAN) nhưng văn bản Guideline chính thức chưa kịp xuất bản cập nhật.
                          </p>
                        </div>
                      </div>

                      {/* Related Late Breaking Trials */}
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
                                  <span className="font-bold">Kết cục chính:</span>{" "}
                                  {tr.primaryOutcome}
                                </div>
                                <div>
                                  <span className="font-bold">An toàn:</span>{" "}
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

                  {/* BOTTOM: AI CLINICAL APPRAISAL & PRACTICE VERDICT BOX */}
                  <div className="mt-6 p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-base">🧠</span>
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        AI Clinical Appraisal & Practice Verdict (Biện luận & Chốt thực hành)
                      </h4>
                    </div>

                    <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-slate-400 whitespace-nowrap">
                          ⚖️ Đồng thuận:
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {currentScenario.aiSynthesisAppraisal.consensusLevel ===
                          "HIGH_CONCORDANCE"
                            ? "Đồng thuận cao (High Concordance)"
                            : "Có khác biệt điều kiện (Moderate Variation)"}
                        </span>
                      </div>

                      <div className="flex items-start gap-2">
                        <span className="font-bold text-slate-400 whitespace-nowrap">
                          🔍 Lý giải khác biệt:
                        </span>
                        <span className="text-slate-700 dark:text-slate-300">
                          {currentScenario.aiSynthesisAppraisal.whyGuidelinesDiffer}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold">
                        <span className="font-extrabold">💡 Chốt thực hành cho bác sĩ trực:</span>{" "}
                        {currentScenario.aiSynthesisAppraisal.clinicalBottomLine}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      )}

      {/* =========================================================================
          VIEW C: CONFERENCE INTELLIGENCE HUB (Full Screen Event Explorer)
         ========================================================================= */}
      {activeMainView === "conf" && (
        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight flex items-center gap-2">
                <span>🎙️</span>
                <span>Trung tâm Hội nghị Thần kinh học (Conference Intelligence Hub)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tổng hợp báo cáo thử nghiệm lâm sàng then chốt (Late-Breaking Science) đa chuyên ngành
              </p>
            </div>

            {/* Subspecialty Filter in Conf View */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">
                Lọc chuyên khoa:
              </span>
              <button
                onClick={() => setSelectedSubspecialty("All Subspecialties")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  selectedSubspecialty === "All Subspecialties"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                Tất cả
              </button>
              {["Stroke", "Dementia", "Epilepsy", "Neuromuscular"].map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubspecialty(sub as SubspecialtyType)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    selectedSubspecialty === sub
                      ? "bg-amber-500 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredConferences.map((conf) => (
              <div
                key={conf.id}
                className={`rounded-2xl border p-5 sm:p-6 ${
                  darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl font-black text-amber-500">
                      {conf.acronym}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
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
                    <span>Trang chủ Kỷ yếu</span>
                    <span>↗</span>
                  </a>
                </div>

                <h3 className="text-base sm:text-lg font-bold mb-2">{conf.name}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  {conf.executiveSummary}
                </p>

                {/* Late Breaking Trials Grid */}
                <div className="space-y-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Báo cáo thử nghiệm lâm sàng tại hội trường ({conf.lateBreakingTrials.length})
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
                              <span className="font-bold text-slate-400">Dân số (P):</span>{" "}
                              {tr.populationSummary}
                            </div>
                            <div>
                              <span className="font-bold text-slate-400">Can thiệp (I vs C):</span>{" "}
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
                          {tr.impactedScenarioId && (
                            <button
                              onClick={() => handleJumpToScenario(tr.impactedScenarioId!)}
                              className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap ml-2"
                            >
                              Ma trận ➔
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* =========================================================================
          FOOTER (Ecosystem Synchronized)
         ========================================================================= */}
      <footer
        className={`border-t mt-12 py-6 text-center text-xs transition-colors ${
          darkMode
            ? "bg-slate-950 border-slate-800 text-slate-500"
            : "bg-white border-slate-200 text-slate-400"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-500">NeuroGuide</span>
            <span>• Part of the Neuro Ecosystem</span>
          </div>
          <div>
            Clinical Practice Guidelines & Consensus Statements • Peer-Reviewed Neurology Radar
          </div>
        </div>
      </footer>
    </div>
  );
}
