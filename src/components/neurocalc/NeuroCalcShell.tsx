"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Calculator,
  ClipboardList,
  Layers,
  Moon,
  RefreshCw,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AdminButton } from "@/components/ecosystem/AdminButton";
import { AppSwitcher } from "@/components/ecosystem/AppSwitcher";
import { MedicalDisclaimerFooter } from "@/components/ecosystem/MedicalDisclaimerFooter";
import { useNeuroCalcScales } from "@/hooks/useNeuroCalcScales";
import type { ScaleKind } from "@/types/neurocalc";
import { getStoredAdminToken } from "@/utils/clientAuth";
import {
  getEcosystemDarkMode,
  setEcosystemDarkMode,
  subscribeEcosystemDarkMode,
} from "@/utils/themeSync";
import { ScaleDirectory } from "./ScaleDirectory";
import { ScaleWorkspace } from "./ScaleWorkspace";

export function NeuroCalcShell() {
  const searchParams = useSearchParams();
  const syncState = useNeuroCalcScales({ enabled: true });

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

  const scaleParam = searchParams.get("scale") || "";
  const [selectedSlug, setSelectedSlug] = useState<string>(scaleParam);
  const [activeTab, setActiveTab] = useState<"all" | ScaleKind>("all");

  useEffect(() => {
    setSelectedSlug(scaleParam);
  }, [scaleParam]);

  useEffect(() => {
    const handleScaleUpdated = () => {
      void syncState.refresh();
    };
    window.addEventListener("neurocalc_scale_updated", handleScaleUpdated);
    return () =>
      window.removeEventListener("neurocalc_scale_updated", handleScaleUpdated);
  }, [syncState.refresh]);

  useEffect(() => {
    const handlePopState = () => {
      const nextScale =
        new URLSearchParams(window.location.search).get("scale") || "";
      setSelectedSlug(nextScale);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToScale = (slug: string | null) => {
    const nextSlug = slug ?? "";
    setSelectedSlug(nextSlug);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (nextSlug) {
        params.set("scale", nextSlug);
      } else {
        params.delete("scale");
      }
      const qs = params.toString();
      window.history.pushState(null, "", qs ? `/neurocalc?${qs}` : "/neurocalc");
    }
  };

  const activeScale = useMemo(() => {
    if (!selectedSlug) return null;
    return (
      syncState.scales.find((entry) => entry.scale.id === selectedSlug) ?? null
    );
  }, [syncState.scales, selectedSlug]);

  const tabCounts = useMemo(() => {
    let pointSum = 0;
    let ordinalGrade = 0;
    let formula = 0;
    for (const entry of syncState.scales) {
      const kind = entry.scale.metadata.kind;
      if (kind === "point_sum") pointSum += 1;
      else if (kind === "ordinal_grade") ordinalGrade += 1;
      else if (kind === "formula") formula += 1;
    }
    return {
      all: syncState.scales.length,
      point_sum: pointSum,
      ordinal_grade: ordinalGrade,
      formula,
    };
  }, [syncState.scales]);

  const navTabs = [
    {
      id: "all" as const,
      label: "All Scales",
      mobileLabel: "All",
      icon: Calculator,
      badge: tabCounts.all,
    },
    {
      id: "point_sum" as const,
      label: "Point Scales",
      mobileLabel: "Scales",
      icon: ClipboardList,
      badge: tabCounts.point_sum,
    },
    {
      id: "ordinal_grade" as const,
      label: "Ordinal Grades",
      mobileLabel: "Grades",
      icon: Layers,
      badge: tabCounts.ordinal_grade,
    },
    {
      id: "formula" as const,
      label: "Bedside Formulas",
      mobileLabel: "Formulas",
      icon: Activity,
      badge: tabCounts.formula,
    },
  ];

  return (
    <div
      className={`min-h-screen bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors duration-200 overflow-x-clip ${
        activeScale ? "pb-36 sm:pb-40" : "pb-10"
      }`}
    >
      {/* Unified Sticky App Header (Cyan-Teal #0E7490 Accent) */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 px-4 py-3.5 backdrop-blur-md transition-colors sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0E7490] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0E7490]"></span>
              </span>
              <span>CLINICAL SCALES &amp; BEDSIDE CALCULATORS</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => navigateToScale(null)}
                className="text-left hover:opacity-85 transition-opacity cursor-pointer"
              >
                <h1 className="font-journal text-xl font-bold tracking-tight text-[var(--text-ink)] sm:text-2xl">
                  NEUROCALC
                </h1>
              </button>
              <span className="rounded-md bg-[#0E7490] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                BETA
              </span>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs font-mono-tech font-medium text-[var(--text-secondary)]">
                {syncState.status === "offline" ? (
                  <WifiOff className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                ) : (
                  <Wifi className="w-3.5 h-3.5 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
                )}
                <span>
                  {syncState.status} · #{syncState.lastSeq}
                </span>
                <button
                  type="button"
                  onClick={() => void syncState.refresh()}
                  className="ml-0.5 p-0.5 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                  title="Sync now"
                  aria-label="Sync now"
                >
                  <RefreshCw className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            )}

            {/* Mobile-only Night Shift & Admin controls (Desktop uses Left Rail) */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] flex items-center gap-1"
                title="Toggle Night Shift Mode"
                aria-label="Toggle Night Shift Mode"
              >
                {darkMode ? (
                  <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
              <AdminButton darkMode={darkMode} />
            </div>

            <AppSwitcher currentApp="neurocalc" darkMode={darkMode} />
          </div>
        </div>
      </header>

      {/* Unified Underline Tabs (Cyan-Teal #0E7490 Accent) */}
      <nav className="border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto scrollbar-none -mb-px">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (selectedSlug) {
                    navigateToScale(null);
                  }
                }}
                className={`group relative shrink-0 pb-2.5 pt-2 text-[12px] sm:text-[13px] transition-colors ${
                  isActive
                    ? "font-semibold text-[#0E7490] dark:text-cyan-400"
                    : "font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                }`}
              >
                <span className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg transition-colors group-hover:bg-[var(--bg-subtle)]">
                  <Icon
                    size={15}
                    strokeWidth={1.75}
                    className={
                      isActive
                        ? "text-[#0E7490] dark:text-cyan-400"
                        : "text-[var(--text-muted)] group-hover:text-[var(--text-ink)]"
                    }
                  />
                  <span className="sm:hidden whitespace-nowrap">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono-tech leading-none ${
                      isActive
                        ? "bg-[#0E7490]/15 text-[#0E7490] dark:bg-cyan-500/20 dark:text-cyan-300"
                        : "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </span>
                {isActive && (
                  <span className="absolute inset-x-1 bottom-0 h-[2px] rounded-full bg-[#0E7490] dark:bg-cyan-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-5">
        <main className="min-h-[500px]">
          {activeScale ? (
            <ScaleWorkspace
              scaleEntry={activeScale}
              isAdmin={isAdmin}
              onBack={() => navigateToScale(null)}
            />
          ) : (
            <ScaleDirectory
              scales={syncState.scales}
              selectedKind={activeTab}
              onResetKind={() => setActiveTab("all")}
              onSelectScale={(slug) => navigateToScale(slug)}
              isLoading={syncState.status === "loading"}
              isAdmin={isAdmin}
              darkMode={darkMode}
            />
          )}
        </main>

        <MedicalDisclaimerFooter darkMode={darkMode} />
      </div>
    </div>
  );
}
