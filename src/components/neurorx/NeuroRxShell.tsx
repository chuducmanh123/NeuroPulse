"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Moon, Sun, Pill, Zap, Baby, Sparkles, ShieldCheck, AlertCircle } from "lucide-react";
import { AdminButton } from "@/components/ecosystem/AdminButton";
import { AppSwitcher } from "@/components/ecosystem/AppSwitcher";
import { CLINICAL_DISCLAIMER } from "@/lib/neurorx/orderText";
import type { Source, Interaction } from "@/types/neurorx";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/data";
import { LookupTab } from "./tabs/LookupTab";
import { InteractionsTab } from "./tabs/InteractionsTab";
import { PregnancyTab } from "./tabs/PregnancyTab";
import { NovelTab } from "./tabs/NovelTab";
import { OfflineStatus } from "./OfflineStatus";

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

  // Count verified drugs
  const verifiedCount = initialDrugs.filter((d) => d.effectiveStatus === "verified").length;
  const draftCount = initialDrugs.filter((d) => d.effectiveStatus === "draft").length;

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-[#F8FAFC] text-slate-900"
      }`}
    >
      {/* 1. Header (Sticky Top Bar - Single Column Focus) */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
          darkMode
            ? "border-slate-800/80 bg-slate-950/80"
            : "border-slate-200/80 bg-white/80"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left: Branding */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                CLINICAL NEUROPHARMACOLOGY SUITE
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight flex items-center gap-1.5">
              <span>NEURORX</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                v1.0
              </span>
            </h1>
          </div>

          {/* Right: Actions & Ecosystem Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Night Shift Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-xl border transition-all text-xs flex items-center gap-1.5 ${
                darkMode
                  ? "border-slate-800 bg-slate-900 hover:bg-slate-800 text-amber-400"
                  : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-sm"
              }`}
              title="Toggle Night Shift Mode"
              aria-label="Toggle Night Shift Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="hidden sm:inline font-medium text-[11px]">Night Shift</span>
            </button>

            {/* Admin Button */}
            <AdminButton darkMode={darkMode} />

            {/* App Switcher (9-dots) */}
            <AppSwitcher currentApp="neurorx" darkMode={darkMode} />
          </div>
        </div>
      </header>

      {/* 2. Main Content Container (max-w-5xl Single-Column Focus) */}
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        {/* Navigation: 4 Pill-Tabs */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none">
          <div
            className={`inline-flex p-1.5 rounded-2xl border transition-colors ${
              darkMode ? "bg-slate-900/90 border-slate-800" : "bg-slate-200/60 border-slate-300/70"
            }`}
            role="tablist"
          >
            {/* Tab 1: Drug Directory */}
            <button
              onClick={() => handleTabChange("lookup")}
              role="tab"
              aria-selected={activeTab === "lookup"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                activeTab === "lookup"
                  ? darkMode
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-white text-slate-900 shadow-sm"
                  : darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Pill className="w-4 h-4 text-emerald-500" />
              <span>💊 Drug Lookup</span>
              {verifiedCount > 0 && (
                <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                  {verifiedCount}
                </span>
              )}
            </button>

            {/* Tab 2: Interactions */}
            <button
              onClick={() => handleTabChange("interactions")}
              role="tab"
              aria-selected={activeTab === "interactions"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                activeTab === "interactions"
                  ? darkMode
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-white text-slate-900 shadow-sm"
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                activeTab === "pregnancy"
                  ? darkMode
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-white text-slate-900 shadow-sm"
                  : darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Baby className="w-4 h-4 text-rose-500" />
              <span>🤰 Pregnancy & Lactation</span>
            </button>

            {/* Tab 4: Novel Therapies */}
            <button
              onClick={() => handleTabChange("novel")}
              role="tab"
              aria-selected={activeTab === "novel"}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                activeTab === "novel"
                  ? darkMode
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-white text-slate-900 shadow-sm"
                  : darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>🆕 Novel Therapies</span>
            </button>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="mt-6">
          {activeTab === "lookup" && (
            <LookupTab drugs={initialDrugs} sources={sources} darkMode={darkMode} />
          )}

          {activeTab === "interactions" && (
            <InteractionsTab
              drugs={initialDrugs}
              interactions={interactions}
              sources={sources}
              darkMode={darkMode}
            />
          )}

          {activeTab === "pregnancy" && (
            <PregnancyTab
              drugs={initialDrugs}
              sources={sources}
              darkMode={darkMode}
            />
          )}

          {activeTab === "novel" && (
            <NovelTab
              drugs={initialDrugs}
              sources={sources}
              darkMode={darkMode}
            />
          )}
        </div>
      </main>

      {/* 3. Global Clinical Disclaimer Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-8 border-t border-slate-200/60 dark:border-slate-800/60 text-center text-[11px] text-slate-500 dark:text-slate-400 space-y-2">
        <p className="font-medium text-slate-600 dark:text-slate-300">
          ⚠️ {CLINICAL_DISCLAIMER}
        </p>
        <p>
          NeuroRx is a Clinical Decision Support System (CDSS) for licensed physicians. All calculations must be verified against current official product labelling.
        </p>
        <div className="pt-2">
          <OfflineStatus dataHash={dataVersionHash} darkMode={darkMode} />
        </div>
      </footer>
    </div>
  );
}
