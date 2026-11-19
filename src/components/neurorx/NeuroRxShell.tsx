"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Pill,
  Zap,
  Baby,
  Sparkles,
} from "lucide-react";
import { AdminButton } from "@/components/ecosystem/AdminButton";
import { AppSwitcher } from "@/components/ecosystem/AppSwitcher";
import { MedicalDisclaimerFooter } from "@/components/ecosystem/MedicalDisclaimerFooter";
import { OfflineStatus } from "@/components/neurorx/OfflineStatus";
import { useNeuroRxDrugs } from "@/hooks/useNeuroRxDrugs";
import { getStoredAdminToken } from "@/utils/clientAuth";
import type { Source, Interaction } from "@/types/neurorx";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import { LookupTab } from "./tabs/LookupTab";
import { InteractionsTab } from "./tabs/InteractionsTab";
import { PregnancyTab } from "./tabs/PregnancyTab";
import { NovelTab } from "./tabs/NovelTab";

export type NeuroRxTab = "lookup" | "interactions" | "pregnancy" | "novel";

interface NeuroRxShellProps {
  initialDrugs?: DrugWithEffectiveStatus[];
  totalSourcesCount: number;
  sources?: Source[];
  interactions?: Interaction[];
  dataVersionHash?: string;
}

export function NeuroRxShell({
  initialDrugs = [],
  totalSourcesCount,
  sources = [],
  interactions = [],
  dataVersionHash = "v2-live",
}: NeuroRxShellProps) {
  const searchParams = useSearchParams();
  const syncState = useNeuroRxDrugs({
    initialDrugs,
    enabled: true,
  });

  // Dark Mode State (Night Shift) - Synced with local storage and html class
  const [darkMode, setDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = () => {
      setIsAdmin(Boolean(getStoredAdminToken()));
    };
    checkAdmin();
    window.addEventListener("storage", checkAdmin);
    return () => window.removeEventListener("storage", checkAdmin);
  }, []);

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

  const refreshSync = syncState.refresh;

  useEffect(() => {
    const handleDrugUpdated = () => {
      void refreshSync();
    };
    window.addEventListener("neurorx_drug_updated", handleDrugUpdated);
    return () => window.removeEventListener("neurorx_drug_updated", handleDrugUpdated);
  }, [refreshSync]);

  useEffect(() => {
    if (["lookup", "interactions", "pregnancy", "novel"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const handlePopState = () => {
      const nextTab = (new URLSearchParams(window.location.search).get("tab") as NeuroRxTab) || "lookup";
      if (["lookup", "interactions", "pregnancy", "novel"].includes(nextTab)) {
        setActiveTab(nextTab);
      } else {
        setActiveTab("lookup");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleTabChange = (tab: NeuroRxTab) => {
    setActiveTab(tab);
    const currentSearch =
      typeof window !== "undefined" ? window.location.search : searchParams.toString();
    const params = new URLSearchParams(currentSearch);
    params.set("tab", tab);
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/neurorx?${params.toString()}`);
    }
  };

  const activeDrugs = syncState.drugs;

  // Count verified drugs and stats
  const verifiedCount = activeDrugs.filter((d) => d.effectiveStatus === "verified").length;
  const novelCount = activeDrugs.filter((d) => Boolean(d.drug.novel)).length;

  const navTabs: Array<{
    id: NeuroRxTab;
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    mobileLabel: string;
    desktopLabel: string;
    badge?: number;
  }> = [
    {
      id: "lookup",
      icon: Pill,
      mobileLabel: "Drug Lookup",
      desktopLabel: "Drug Lookup",
      badge: verifiedCount,
    },
    {
      id: "interactions",
      icon: Zap,
      mobileLabel: "Interactions",
      desktopLabel: "Interactions",
    },
    {
      id: "pregnancy",
      icon: Baby,
      mobileLabel: "Pregnancy & Lact.",
      desktopLabel: "Pregnancy & Lactation",
    },
    {
      id: "novel",
      icon: Sparkles,
      mobileLabel: "Novel Therapies",
      desktopLabel: "Novel Therapies",
      badge: novelCount,
    },
  ];

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
        <header className="mb-4 sm:mb-6 pt-1 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-4">
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
            {isAdmin && (
              <OfflineStatus
                dataHash={dataVersionHash}
                darkMode={darkMode}
                syncV2={true}
                syncStatus={syncState.status}
                lastSyncAt={syncState.lastSyncAt}
                lastChangeCount={syncState.lastChangeCount}
                lastSeq={syncState.lastSeq}
                onRefresh={syncState.refresh}
              />
            )}

            {/* Night Shift Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`min-h-[36px] sm:min-h-[44px] px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
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
            NAVIGATION BAR: GitHub-style Underline Tabs with NeuroRx Cyan Accent
           ========================================================================= */}
        <nav
          className={`mb-4 sm:mb-6 border-b ${
            darkMode ? "border-slate-800" : "border-slate-200"
          }`}
        >
          <div
            className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px"
            role="tablist"
          >
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={`group relative shrink-0 pb-2.5 pt-1 text-[12px] sm:text-[13px] transition-colors ${
                    isActive
                      ? darkMode
                        ? "font-semibold text-white"
                        : "font-semibold text-slate-900"
                      : darkMode
                      ? "font-medium text-slate-400 hover:text-slate-200"
                      : "font-medium text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span
                    className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-md transition-colors ${
                      darkMode ? "group-hover:bg-slate-800/80" : "group-hover:bg-slate-200/70"
                    }`}
                  >
                    <Icon
                      size={15}
                      strokeWidth={1.75}
                      className={
                        isActive
                          ? darkMode
                            ? "text-cyan-400"
                            : "text-cyan-600"
                          : darkMode
                          ? "text-slate-500 group-hover:text-slate-300"
                          : "text-slate-400 group-hover:text-slate-600"
                      }
                    />
                    <span className="sm:hidden whitespace-nowrap">{tab.mobileLabel}</span>
                    <span className="hidden sm:inline whitespace-nowrap">{tab.desktopLabel}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none ${
                          isActive
                            ? darkMode
                              ? "bg-cyan-500/20 text-cyan-300"
                              : "bg-cyan-50 text-cyan-700"
                            : darkMode
                            ? "bg-slate-800 text-slate-300"
                            : "bg-slate-200/80 text-slate-700"
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </span>
                  {isActive && (
                    <span
                      className={`absolute inset-x-1 bottom-0 h-[2px] rounded-full ${
                        darkMode ? "bg-cyan-400" : "bg-cyan-600"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* =========================================================================
            TAB CONTENT PANES
           ========================================================================= */}
        <main className="min-h-[500px]">
          {syncState.status === "loading" && activeDrugs.length === 0 ? (
            <div role="status" aria-live="polite" className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Loading drug directory…
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`h-28 rounded-2xl border animate-pulse ${
                      darkMode
                        ? "bg-slate-900/60 border-slate-800"
                        : "bg-white border-slate-200"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeTab === "lookup" && (
                <LookupTab
                  drugs={activeDrugs}
                  sources={sources}
                  darkMode={darkMode}
                  syncRowsBySlug={syncState.rowsBySlug}
                  onApplyLocalWrite={syncState.applyLocalWrite}
                />
              )}

              {activeTab === "interactions" && (
                <InteractionsTab
                  drugs={activeDrugs}
                  interactions={interactions}
                  sources={sources}
                  darkMode={darkMode}
                />
              )}

              {activeTab === "pregnancy" && (
                <PregnancyTab
                  drugs={activeDrugs}
                  sources={sources}
                  darkMode={darkMode}
                />
              )}

              {activeTab === "novel" && (
                <NovelTab
                  drugs={activeDrugs}
                  sources={sources}
                  darkMode={darkMode}
                />
              )}
            </>
          )}
        </main>

        {/* =========================================================================
            GLOBAL CLINICAL CDSS FOOTER
           ========================================================================= */}
        <MedicalDisclaimerFooter darkMode={darkMode} />
      </div>
    </div>
  );
}
