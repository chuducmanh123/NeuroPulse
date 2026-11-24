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
import { DrawLoaderIcon } from "@/components/ecosystem/DrawLoader";
import { MedicalDisclaimerFooter } from "@/components/ecosystem/MedicalDisclaimerFooter";
import { OfflineStatus } from "@/components/neurorx/OfflineStatus";
import { useNeuroRxDrugs } from "@/hooks/useNeuroRxDrugs";
import { getStoredAdminToken } from "@/utils/clientAuth";
import {
  getEcosystemDarkMode,
  setEcosystemDarkMode,
  subscribeEcosystemDarkMode,
} from "@/utils/themeSync";
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
    const initialDark =
      getEcosystemDarkMode() ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(initialDark);
    document.documentElement.classList.toggle("dark", initialDark);
    document.documentElement.classList.toggle("night-shift", initialDark);
    return subscribeEcosystemDarkMode(setDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    setEcosystemDarkMode(next);
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
    <div className="min-h-screen bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors duration-200 pb-10">
      {/* Unified Sticky App Header (Sage Emerald #2F855A Accent) */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 px-4 py-3.5 backdrop-blur-md transition-colors sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2F855A] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2F855A]"></span>
              </span>
              <span className="text-[#2F855A] dark:text-emerald-400">
                CLINICAL PHARMACOLOGY &amp; BEDSIDE DOSING SUITE
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2.5">
              <h1 className="font-journal text-xl font-bold tracking-tight text-[var(--text-ink)] sm:text-2xl">
                NEURORX
              </h1>
              <span className="rounded-md bg-[#2F855A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                BETA
              </span>
            </div>
          </div>

          {/* Quick Header Badges & Actions */}
          <div className="flex flex-wrap items-center gap-2">
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

            {/* Mobile-only Night Shift & Admin controls (Desktop uses Left Rail) */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <button
                onClick={toggleDarkMode}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] flex items-center gap-1"
                title="Toggle Night Shift Mode"
                aria-label="Toggle Night Shift Mode"
              >
                <span>{darkMode ? "☀️" : "🌙"}</span>
              </button>
              <AdminButton darkMode={darkMode} />
            </div>

            {/* 9-Dots Ecosystem App Switcher */}
            <AppSwitcher currentApp="neurorx" darkMode={darkMode} />
          </div>
        </div>
      </header>

      {/* Unified Underline Tabs (Sage Emerald #2F855A Accent) */}
      <nav className="border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 transition-colors sm:px-8">
        <div
          className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto no-scrollbar -mb-px"
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
                className={`group relative shrink-0 pb-2.5 pt-2 text-[12px] sm:text-[13px] transition-colors ${
                  isActive
                    ? "font-semibold text-[#2F855A] dark:text-emerald-400"
                    : "font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                }`}
              >
                <span className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg transition-colors group-hover:bg-[var(--bg-subtle)]">
                  <Icon
                    size={15}
                    strokeWidth={1.75}
                    className={
                      isActive
                        ? "text-[#2F855A] dark:text-emerald-400"
                        : "text-[var(--text-muted)] group-hover:text-[var(--text-ink)]"
                    }
                  />
                  <span className="sm:hidden whitespace-nowrap">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline whitespace-nowrap">{tab.desktopLabel}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none ${
                        isActive
                          ? "bg-[#2F855A]/15 text-[#2F855A] dark:bg-emerald-500/20 dark:text-emerald-300"
                          : "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </span>
                {isActive && (
                  <span className="absolute inset-x-1 bottom-0 h-[2px] rounded-full bg-[#2F855A] dark:bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* =========================================================================
            TAB CONTENT PANES
           ========================================================================= */}
        <main className="min-h-[500px]">
          {syncState.status === "loading" && activeDrugs.length === 0 ? (
            <div role="status" aria-live="polite" className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <DrawLoaderIcon
                  variant="rx"
                  className="w-5 h-5 text-teal-700 dark:text-teal-400 shrink-0"
                />
                <span>Loading drug directory…</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className="h-28 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] animate-pulse"
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
