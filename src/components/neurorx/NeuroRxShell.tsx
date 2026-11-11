"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Moon,
  Sun,
  Pill,
  Zap,
  Baby,
  Sparkles,
} from "lucide-react";
import { AdminButton } from "@/components/ecosystem/AdminButton";
import { AppSwitcher } from "@/components/ecosystem/AppSwitcher";
import type { Source, Interaction } from "@/types/neurorx";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import { LookupTab } from "./tabs/LookupTab";
import { InteractionsTab } from "./tabs/InteractionsTab";
import { PregnancyTab } from "./tabs/PregnancyTab";
import { NovelTab } from "./tabs/NovelTab";

export type NeuroRxTab = "lookup" | "interactions" | "pregnancy" | "novel";

interface NeuroRxShellProps {
  initialDrugs: DrugWithEffectiveStatus[];
  totalSourcesCount: number;
  sources?: Source[];
  interactions?: Interaction[];
  dataVersionHash?: string;
}

export function NeuroRxShell({
  initialDrugs,
  totalSourcesCount,
  sources = [],
  interactions = [],
  dataVersionHash = "v1-live",
}: NeuroRxShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Dark Mode State (Night Shift) - Synced with local storage and html class
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const isDark =
      localStorage.getItem("neurorx_theme") === "dark" ||
      localStorage.getItem("neurocase_theme") === "dark" ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("neurorx_theme", next ? "dark" : "light");
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  // Tab State synced with ?tab= query parameter
  const tabParam = (searchParams.get("tab") as NeuroRxTab) || "lookup";
  const [activeTab, setActiveTab] = useState<NeuroRxTab>(
    ["lookup", "interactions", "pregnancy", "novel"].includes(tabParam)
      ? tabParam
      : "lookup"
  );

  // Live Drugs State — synced with initial server render and live updates
  const [drugs, setDrugs] = useState<DrugWithEffectiveStatus[]>(initialDrugs);

  useEffect(() => {
    const handleDrugUpdated = () => {
      fetch("/api/neurorx/drugs")
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && Array.isArray(data.drugs)) {
            setDrugs(data.drugs);
          }
        })
        .catch(() => {});
    };
    window.addEventListener("neurorx_drug_updated", handleDrugUpdated);
    return () => window.removeEventListener("neurorx_drug_updated", handleDrugUpdated);
  }, []);

  useEffect(() => {
    if (["lookup", "interactions", "pregnancy", "novel"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: NeuroRxTab) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`/neurorx?${params.toString()}`, { scroll: false });
  };

  // Count verified drugs and stats
  const verifiedCount = drugs.filter((d) => d.effectiveStatus === "verified").length;
  const novelCount = drugs.filter((d) => Boolean(d.drug.novel)).length;

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-[#F8FAFC] text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* =========================================================================
            HEADER: Thiết kế chuẩn đồng bộ với NeuroPulse & NeuroGuide
           ========================================================================= */}
        <header className="mb-6 pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-cyan-500 shadow-sm shadow-cyan-500/50"></span>
              </span>
              <span
                className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${
                  darkMode ? "text-cyan-400" : "text-cyan-600"
                }`}
              >
                CLINICAL PHARMACOLOGY &amp; BEDSIDE DOSING SUITE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <h1
                className={`text-xl sm:text-3xl font-black uppercase tracking-tight ${
                  darkMode ? "text-white" : "text-slate-900"
                }`}
              >
                NEURORX
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold uppercase bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
                BETA
              </span>
            </div>
          </div>

          {/* Quick Header Badges & Actions */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
            {/* Night Shift Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                darkMode
                  ? "bg-cyan-950/70 text-cyan-300 border-cyan-800 hover:bg-cyan-900/80"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
              title="Toggle Night Shift Mode"
              aria-label="Toggle Night Shift Mode"
            >
              <span>{darkMode ? "☀️" : "🌙"}</span>
              <span className="hidden sm:inline">{darkMode ? "Light" : "Night Shift"}</span>
            </button>

            {/* Admin Button */}
            <AdminButton darkMode={darkMode} />

            {/* 9-Dots Ecosystem App Switcher */}
            <AppSwitcher currentApp="neurorx" darkMode={darkMode} />
          </div>
        </header>

        {/* =========================================================================
            NAVIGATION: 4 Clean Clinical Pill Tabs
           ========================================================================= */}
        <nav className="mb-6">
          <div
            className={`p-1.5 rounded-2xl border transition-all flex items-center justify-start sm:justify-center overflow-x-auto gap-1 sm:gap-2 scrollbar-none ${
              darkMode ? "bg-slate-900/90 border-slate-800" : "bg-slate-200/60 border-slate-300/70"
            }`}
            role="tablist"
          >
            {/* Tab 1: Drug Directory */}
            <button
              onClick={() => handleTabChange("lookup")}
              role="tab"
              aria-selected={activeTab === "lookup"}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === "lookup"
                  ? darkMode
                    ? "bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "bg-white text-cyan-700 border border-cyan-500/30 shadow-sm"
                  : darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Pill className="w-4 h-4 text-cyan-500" />
              <span>💊 Drug Lookup &amp; Dosing</span>
              {verifiedCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 font-bold">
                  {verifiedCount}
                </span>
              )}
            </button>

            {/* Tab 2: Interactions */}
            <button
              onClick={() => handleTabChange("interactions")}
              role="tab"
              aria-selected={activeTab === "interactions"}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === "interactions"
                  ? darkMode
                    ? "bg-slate-800 text-amber-300 border border-amber-500/30 shadow-sm"
                    : "bg-white text-amber-700 border border-amber-500/30 shadow-sm"
                  : darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>⚡ Interactions</span>
            </button>

            {/* Tab 3: Pregnancy & Lactation */}
            <button
              onClick={() => handleTabChange("pregnancy")}
              role="tab"
              aria-selected={activeTab === "pregnancy"}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === "pregnancy"
                  ? darkMode
                    ? "bg-slate-800 text-rose-300 border border-rose-500/30 shadow-sm"
                    : "bg-white text-rose-700 border border-rose-500/30 shadow-sm"
                  : darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Baby className="w-4 h-4 text-rose-500" />
              <span>🤰 Pregnancy &amp; Lactation</span>
            </button>

            {/* Tab 4: Novel Therapies */}
            <button
              onClick={() => handleTabChange("novel")}
              role="tab"
              aria-selected={activeTab === "novel"}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap min-h-[44px] ${
                activeTab === "novel"
                  ? darkMode
                    ? "bg-slate-800 text-indigo-300 border border-indigo-500/30 shadow-sm"
                    : "bg-white text-indigo-700 border border-indigo-500/30 shadow-sm"
                  : darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>🆕 Novel Therapies</span>
              {novelCount > 0 && (
                <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold">
                  {novelCount}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* =========================================================================
            TAB CONTENT PANES
           ========================================================================= */}
        <main className="min-h-[500px]">
          {activeTab === "lookup" && (
            <LookupTab drugs={drugs} sources={sources} darkMode={darkMode} />
          )}

          {activeTab === "interactions" && (
            <InteractionsTab
              drugs={drugs}
              interactions={interactions}
              sources={sources}
              darkMode={darkMode}
            />
          )}

          {activeTab === "pregnancy" && (
            <PregnancyTab
              drugs={drugs}
              sources={sources}
              darkMode={darkMode}
            />
          )}

          {activeTab === "novel" && (
            <NovelTab
              drugs={drugs}
              sources={sources}
              darkMode={darkMode}
            />
          )}
        </main>

        {/* =========================================================================
            GLOBAL CLINICAL CDSS FOOTER
           ========================================================================= */}
        <footer className="mt-12 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 text-center text-[11px] text-slate-500 dark:text-slate-400">
          <p>
            NeuroRx is a Clinical Decision Support System (CDSS) for licensed physicians. All calculations must be verified against current official product labelling.
          </p>
        </footer>
      </div>
    </div>
  );
}
