"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ChevronDown,
  Edit3,
  GitBranch,
  Layers,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import type { ClinicalPathwayDoc } from "../../types/clinicalPathways";
import { NEUROLOGY_SUBSPECIALTIES } from "../../types/neuroguide";
import { filterCatalogPathways } from "../../lib/neuroguide/pathwayRunnerUtils";
import { getAdminHeaders } from "../../utils/clientAuth";
import { CustomSelect } from "../ecosystem/CustomSelect";
import { PathwayStepRunner } from "./pathways/PathwayStepRunner";

const PathwayAdminModal = dynamic(
  () => import("./pathways/PathwayAdminModal").then((m) => m.PathwayAdminModal),
  { ssr: false }
);

interface ClinicalPathwaysTabProps {
  syncPathways: ClinicalPathwayDoc[];
  isAdminVerified: boolean;
  darkMode: boolean;
  onRequestAdminAuth?: () => void;
  onOpenAdminCreate?: () => void;
  onOpenAdminEdit?: (pathway: ClinicalPathwayDoc) => void;
  onPathwaysMutated?: () => void;
}

const DOMAIN_OPTIONS = [
  { value: "ALL", label: "All Domains" },
  { value: "diagnosis", label: "Diagnosis" },
  { value: "treatment", label: "Treatment" },
  { value: "combined", label: "Combined" },
] as const;

const SOURCE_OPTIONS = [
  { value: "ALL", label: "All Sources" },
  { value: "guideline", label: "Guideline" },
  { value: "textbook", label: "Textbook" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
  { value: "deleted", label: "Deleted" },
] as const;

export function ClinicalPathwaysTab({
  syncPathways,
  isAdminVerified,
  darkMode,
  onOpenAdminCreate,
  onOpenAdminEdit,
  onPathwaysMutated,
}: ClinicalPathwaysTabProps) {
  const [apiPathways, setApiPathways] = useState<ClinicalPathwayDoc[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [subspecialty, setSubspecialty] = useState<string>("All Subspecialties");
  const [domain, setDomain] = useState<string>("ALL");
  const [sourceType, setSourceType] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "published" | "draft" | "archived" | "deleted"
  >("active");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);
  const [adminModal, setAdminModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    pathway: ClinicalPathwayDoc | null;
  }>({ open: false, mode: "create", pathway: null });

  const fetchPathways = useCallback(async () => {
    setIsLoading(true);
    try {
      const qs = isAdminVerified
        ? "?includeDrafts=1&includeArchived=1&includeDeleted=1"
        : "";
      const res = await fetch(`/api/neuroguide/pathways${qs}`, {
        headers: isAdminVerified ? getAdminHeaders() : undefined,
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        ok?: boolean;
        pathways?: ClinicalPathwayDoc[];
      };
      if (data?.ok && Array.isArray(data.pathways)) {
        setApiPathways(data.pathways);
      }
    } catch {
      // Offline: rely on syncPathways from IndexedDB
    } finally {
      setIsLoading(false);
    }
  }, [isAdminVerified]);

  useEffect(() => {
    fetchPathways();
  }, [fetchPathways]);

  const mergedPathways = useMemo(() => {
    const map = new Map<string, ClinicalPathwayDoc>();
    for (const p of syncPathways) {
      map.set(p.uid, p);
    }
    for (const p of apiPathways) {
      const existing = map.get(p.uid);
      if (!existing || p.rev >= existing.rev) {
        map.set(p.uid, p);
      }
    }
    return Array.from(map.values());
  }, [syncPathways, apiPathways]);

  const subspecialtyCounts = useMemo(() => {
    const baseVisible = filterCatalogPathways(mergedPathways, {
      query: "",
      subspecialty: "All Subspecialties",
      domain: "ALL",
      sourceType: "ALL",
      statusFilter,
      isAdmin: isAdminVerified,
    });
    const counts = new Map<string, number>();
    counts.set("All Subspecialties", baseVisible.length);
    for (const p of baseVisible) {
      counts.set(p.subspecialty, (counts.get(p.subspecialty) ?? 0) + 1);
    }
    return counts;
  }, [mergedPathways, statusFilter, isAdminVerified]);

  const filteredPathways = useMemo(
    () =>
      filterCatalogPathways(mergedPathways, {
        query: searchQuery,
        subspecialty,
        domain,
        sourceType,
        statusFilter,
        isAdmin: isAdminVerified,
      }),
    [
      mergedPathways,
      searchQuery,
      subspecialty,
      domain,
      sourceType,
      statusFilter,
      isAdminVerified,
    ]
  );

  const selectedPathway = useMemo(
    () =>
      selectedUid
        ? mergedPathways.find((p) => p.uid === selectedUid) ?? null
        : null,
    [selectedUid, mergedPathways]
  );

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      subspecialty !== "All Subspecialties" ||
      domain !== "ALL" ||
      sourceType !== "ALL" ||
      (isAdminVerified && statusFilter !== "active")
  );

  const secondaryFilterCount =
    (domain !== "ALL" ? 1 : 0) +
    (sourceType !== "ALL" ? 1 : 0) +
    (isAdminVerified && statusFilter !== "active" ? 1 : 0);

  const resetAllFilters = () => {
    setSearchQuery("");
    setSubspecialty("All Subspecialties");
    setDomain("ALL");
    setSourceType("ALL");
    setStatusFilter("active");
  };

  const handleDelete = async (pathway: ClinicalPathwayDoc) => {
    if (!isAdminVerified) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Soft-delete pathway "${pathway.title.en}"?`)
    ) {
      return;
    }
    setBusyUid(pathway.uid);
    setActionErr(null);
    setActionMsg(null);
    try {
      const res = await fetch(
        `/api/neuroguide/pathways/${pathway.uid}?baseRev=${pathway.rev}`,
        {
          method: "DELETE",
          headers: getAdminHeaders(),
        }
      );
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        setActionErr(body?.error || "Failed to delete pathway.");
      } else {
        setActionMsg(
          `Moved "${pathway.title.en}" to Deleted (30-day retention).`
        );
        if (selectedUid === pathway.uid) setSelectedUid(null);
        await fetchPathways();
        onPathwaysMutated?.();
      }
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusyUid(null);
    }
  };

  const handleRestore = async (pathway: ClinicalPathwayDoc) => {
    if (!isAdminVerified) return;
    setBusyUid(pathway.uid);
    setActionErr(null);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/neuroguide/pathways/${pathway.uid}/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({ baseRev: pathway.rev }),
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        setActionErr(body?.error || "Failed to restore pathway.");
      } else {
        setActionMsg(`Restored "${pathway.title.en}" as Draft.`);
        await fetchPathways();
        onPathwaysMutated?.();
      }
    } catch (err) {
      setActionErr(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusyUid(null);
    }
  };

  const openCreateModal = () => {
    if (onOpenAdminCreate) {
      onOpenAdminCreate();
      return;
    }
    setAdminModal({ open: true, mode: "create", pathway: null });
  };

  const openEditModal = (pathway: ClinicalPathwayDoc) => {
    if (onOpenAdminEdit) {
      onOpenAdminEdit(pathway);
      return;
    }
    setAdminModal({ open: true, mode: "edit", pathway });
  };

  const handleModalSaved = async (saved: ClinicalPathwayDoc) => {
    setApiPathways((prev) => {
      const rest = prev.filter((x) => x.uid !== saved.uid);
      return [saved, ...rest];
    });
    setActionMsg(
      saved.status === "published"
        ? `Published pathway "${saved.title.en}".`
        : `Saved draft "${saved.title.en}" (rev ${saved.rev}).`
    );
    await fetchPathways();
    onPathwaysMutated?.();
  };

  const adminModalElement = isAdminVerified && adminModal.open && (
    <PathwayAdminModal
      isOpen={adminModal.open}
      mode={adminModal.mode}
      initialPathway={adminModal.pathway}
      darkMode={darkMode}
      onClose={() => setAdminModal((prev) => ({ ...prev, open: false }))}
      onSaved={handleModalSaved}
    />
  );

  if (selectedPathway) {
    return (
      <>
        <PathwayStepRunner
          pathway={selectedPathway}
          darkMode={darkMode}
          onBack={() => setSelectedUid(null)}
          isAdminVerified={isAdminVerified}
          onEdit={() => openEditModal(selectedPathway)}
        />
        {adminModalElement}
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
      {/* Desktop Left Sticky Sidebar Tree Filter (3 cols — matches Practice Guidelines tab) */}
      <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-20">
        <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              SUBSPECIALTY TREE
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-[11px] font-semibold text-[#C25934] hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="mt-2.5 space-y-1">
            {NEUROLOGY_SUBSPECIALTIES.map((sub) => {
              const active = subspecialty === sub;
              const count = subspecialtyCounts.get(sub) ?? 0;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSubspecialty(sub)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                    active
                      ? "bg-[#C25934] text-white font-semibold"
                      : "font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  <span className="truncate pr-2">{sub}</span>
                  <span
                    className={`text-[10px] ${
                      active ? "opacity-90 font-bold" : "opacity-65"
                    }`}
                  >
                    {count > 0 ? count : "•"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--border-hairline)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            CLINICAL DOMAIN
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {DOMAIN_OPTIONS.map((opt) => {
              const active = domain === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDomain(opt.value)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? "border-[#C25934] bg-[#C25934]/15 text-[#C25934] dark:text-orange-300"
                      : "border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--border-hairline)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            SOURCE TYPE
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SOURCE_OPTIONS.map((opt) => {
              const active = sourceType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSourceType(opt.value)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? "border-[#C25934] bg-[#C25934]/15 text-[#C25934] dark:text-orange-300"
                      : "border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {isAdminVerified && (
            <>
              <div className="mt-5 pt-4 border-t border-[var(--border-hairline)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                ADMIN STATUS
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const active = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatusFilter(opt.value)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                        active
                          ? "border-[#C25934] bg-[#C25934]/15 text-[#C25934] dark:text-orange-300"
                          : "border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Right Column: Search, Mobile Compact Filters & Pathway List (9 cols) */}
      <div className="lg:col-span-9 flex flex-col gap-4 min-w-0">
        {/* Search & Action Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C25934] dark:text-orange-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pathways, symptoms, drugs, guideline or textbook..."
              aria-label="Search clinical pathways"
              className="w-full min-h-[40px] pl-10 pr-9 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)] hover:border-stone-400 focus:outline-none focus:border-[#C25934] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isAdminVerified && (filteredPathways.length > 0 || hasActiveFilters) && (
            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[#C25934] hover:bg-[#A64827] text-white shadow-2xs transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Upload Flowchart</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile-Only Compact Collapsible Filter Controls */}
        <div className="flex flex-col gap-2 lg:hidden">
          <div className="flex items-center gap-2">
            <CustomSelect
              value={subspecialty}
              onChange={setSubspecialty}
              options={NEUROLOGY_SUBSPECIALTIES.map((sub) => ({
                value: sub,
                label: sub,
                ...(subspecialtyCounts.get(sub)
                  ? { badge: subspecialtyCounts.get(sub) }
                  : {}),
              }))}
              ariaLabel="Filter by subspecialty"
              darkMode={darkMode}
              accent="amber"
              align="left"
              compact={true}
              className="flex-1 min-w-0"
              icon={
                <Layers
                  className="w-4 h-4 text-[#C25934] dark:text-orange-400"
                  aria-hidden="true"
                />
              }
            />

            <button
              type="button"
              onClick={() => setMobileFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 cursor-pointer ${
                mobileFiltersOpen || secondaryFilterCount > 0
                  ? "border-[#C25934]/50 bg-[#C25934]/12 text-[#C25934] dark:text-orange-300"
                  : "border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filters</span>
              {secondaryFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#C25934] text-white">
                  {secondaryFilterCount}
                </span>
              )}
              <ChevronDown
                size={13}
                className={`transition-transform ${
                  mobileFiltersOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {mobileFiltersOpen && (
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect
                  value={domain}
                  onChange={setDomain}
                  ariaLabel="Filter by clinical domain"
                  darkMode={darkMode}
                  accent="amber"
                  compact={true}
                  options={DOMAIN_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
                <CustomSelect
                  value={sourceType}
                  onChange={setSourceType}
                  ariaLabel="Filter by source type"
                  darkMode={darkMode}
                  accent="amber"
                  compact={true}
                  align="right"
                  options={SOURCE_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              </div>
              {isAdminVerified && (
                <CustomSelect
                  value={statusFilter}
                  onChange={(v) =>
                    setStatusFilter(
                      v as "active" | "published" | "draft" | "archived" | "deleted"
                    )
                  }
                  ariaLabel="Filter by status"
                  darkMode={darkMode}
                  accent="amber"
                  compact={true}
                  options={STATUS_OPTIONS.map((o) => ({
                    value: o.value,
                    label: `Status: ${o.label}`,
                  }))}
                />
              )}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[11px] font-semibold text-[#C25934] hover:underline cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Banners */}
        {actionMsg && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-2">
            <span>{actionMsg}</span>
            <button
              type="button"
              onClick={() => setActionMsg(null)}
              className="font-bold px-1.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
        {actionErr && (
          <div className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-2">
            <span>{actionErr}</span>
            <button
              type="button"
              onClick={() => setActionErr(null)}
              className="font-bold px-1.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stacked Pathway Cards (matches Guidelines tab card rhythm) */}
        {filteredPathways.length === 0 ? (
          <div className="p-10 sm:p-12 text-center rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70">
            <div className="w-11 h-11 mx-auto mb-2.5 rounded-xl bg-[#C25934]/10 text-[#C25934] flex items-center justify-center">
              <GitBranch size={20} />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-ink)]">
              {hasActiveFilters
                ? "No Clinical Pathways Match Your Filters"
                : "No Clinical Pathways Available Yet"}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto leading-relaxed">
              {hasActiveFilters
                ? "Try clearing your search query or selecting All Subspecialties."
                : isAdminVerified
                  ? "Upload a guideline or textbook flowchart image to extract and publish an interactive step-by-step pathway."
                  : "Published diagnostic and treatment pathways will appear here once reviewed and approved."}
            </p>
            <div className="mt-3.5 flex items-center justify-center gap-2">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#C25934] text-white hover:bg-[#A64827] transition-colors cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              {isAdminVerified && !hasActiveFilters && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#C25934] text-white hover:bg-[#A64827] transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Upload Flowchart</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {filteredPathways.map((p) => {
              const isDeleted = Boolean(p.deletedAt);
              const isGuideline = p.source.sourceType === "guideline";
              return (
                <div
                  key={p.uid}
                  onClick={() => {
                    if (!isDeleted) setSelectedUid(p.uid);
                  }}
                  className={`rounded-2xl border border-l-4 transition-all shadow-xs bg-[var(--bg-surface)] border-[var(--border-hairline)] ${
                    isGuideline
                      ? "border-l-[#C25934] hover:border-[#C25934]/70"
                      : "border-l-indigo-500 hover:border-indigo-400/70"
                  } ${!isDeleted ? "cursor-pointer" : ""}`}
                >
                  <div className="p-3.5 sm:p-5 space-y-2.5">
                    {/* Meta Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10.5px] sm:text-[11px] font-black tracking-wider uppercase border ${
                            isGuideline
                              ? "bg-[#C25934]/12 text-[#C25934] border-[#C25934]/30 dark:bg-orange-500/20 dark:text-orange-300"
                              : "bg-indigo-500/12 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/20 dark:text-indigo-300"
                          }`}
                        >
                          {isGuideline ? "Guideline" : "Textbook"} {p.source.year}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-hairline)]">
                          {p.subspecialty}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-hairline)] capitalize">
                          {p.domain}
                        </span>
                        <span className="text-[11px] font-medium text-[var(--text-muted)]">
                          {p.nodes.length} steps
                        </span>
                        {isAdminVerified && p.status !== "published" && !isDeleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            {p.status}
                          </span>
                        )}
                        {isDeleted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            Deleted
                          </span>
                        )}
                      </div>

                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isDeleted && (
                          <button
                            type="button"
                            onClick={() => setSelectedUid(p.uid)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#C25934] hover:bg-[#A64827] text-white transition-colors cursor-pointer"
                          >
                            <span>Start Pathway</span>
                            <ArrowRight size={13} />
                          </button>
                        )}
                        {isAdminVerified && !isDeleted && (
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                            title="Edit pathway"
                          >
                            <Edit3 size={14} />
                          </button>
                        )}
                        {isAdminVerified && !isDeleted && (
                          <button
                            type="button"
                            disabled={busyUid === p.uid}
                            onClick={() => handleDelete(p)}
                            className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-40"
                            title="Delete pathway"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {isAdminVerified && isDeleted && (
                          <button
                            type="button"
                            disabled={busyUid === p.uid}
                            onClick={() => handleRestore(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition-colors cursor-pointer disabled:opacity-40"
                            title="Restore pathway as Draft"
                          >
                            <RotateCcw size={12} />
                            <span>Restore</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title & Summary */}
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-ink)] leading-snug">
                        {p.title.en}
                      </h3>
                      {p.title.vi && (
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {p.title.vi}
                        </p>
                      )}
                      {p.summary?.en && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                          {p.summary.en}
                        </p>
                      )}
                    </div>

                    <p className="text-[11px] text-[var(--text-muted)]">
                      {p.source.title} · {p.source.organizationOrAuthor} ({p.source.year})
                      {p.source.figureRef ? ` · ${p.source.figureRef}` : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {adminModalElement}
    </div>
  );
}
