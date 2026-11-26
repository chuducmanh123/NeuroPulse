"use client";

import React, { useMemo, useState } from "react";
import {
  Edit3,
  Eye,
  GitBranch,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { ClinicalPathwayDoc } from "../../../types/clinicalPathways";
import { NEUROLOGY_SUBSPECIALTIES } from "../../../types/neuroguide";
import { filterCatalogPathways } from "../../../lib/neuroguide/pathwayRunnerUtils";

interface ClinicalPathwaysAdminTabProps {
  darkMode: boolean;
  pathways: ClinicalPathwayDoc[];
  isLoading: boolean;
  busyUid: string | null;
  onRefresh: () => void;
  onCreateNew: () => void;
  onEdit: (pathway: ClinicalPathwayDoc) => void;
  onPreview: (pathway: ClinicalPathwayDoc) => void;
  onDelete: (pathway: ClinicalPathwayDoc) => void;
  onRestore: (pathway: ClinicalPathwayDoc) => void;
}

const STATUS_PILLS = [
  { value: "active", label: "Active" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
  { value: "deleted", label: "Deleted" },
] as const;

export function ClinicalPathwaysAdminTab({
  darkMode,
  pathways,
  isLoading,
  busyUid,
  onRefresh,
  onCreateNew,
  onEdit,
  onPreview,
  onDelete,
  onRestore,
}: ClinicalPathwaysAdminTabProps) {
  const [query, setQuery] = useState("");
  const [subspecialty, setSubspecialty] = useState("All Subspecialties");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "published" | "draft" | "archived" | "deleted"
  >("active");

  const filtered = useMemo(
    () =>
      filterCatalogPathways(pathways, {
        query,
        subspecialty,
        domain: "ALL",
        sourceType: "ALL",
        statusFilter,
        isAdmin: true,
      }),
    [pathways, query, subspecialty, statusFilter]
  );

  const counts = useMemo(() => {
    let active = 0;
    let published = 0;
    let draft = 0;
    let archived = 0;
    let deleted = 0;
    for (const p of pathways) {
      if (p.deletedAt) {
        deleted++;
      } else {
        if (p.status !== "archived") active++;
        if (p.status === "published") published++;
        if (p.status === "draft") draft++;
        if (p.status === "archived") archived++;
      }
    }
    return { active, published, draft, archived, deleted };
  }, [pathways]);

  return (
    <div
      className={`p-5 sm:p-6 rounded-2xl border border-l-4 border-l-[#C25934] space-y-4 ${
        darkMode
          ? "bg-slate-900/60 border-slate-800"
          : "bg-white border-slate-200 shadow-xs"
      }`}
    >
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-black flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#C25934]" />
            <span>Clinical Pathways Repository ({counts.active} active)</span>
          </h3>
          <p className="text-xs opacity-70 mt-0.5">
            Upload guideline flowcharts, edit AHA-style interactive steps, preview, and publish.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#C25934] hover:bg-[#A64827] text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Flowchart</span>
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pathways by title, source, step..."
              className={`w-full min-h-[36px] pl-9 pr-8 py-1.5 rounded-xl text-xs font-medium border ${
                darkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-100 placeholder:text-slate-400"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
              }`}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={subspecialty}
            onChange={(e) => setSubspecialty(e.target.value)}
            className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              darkMode
                ? "bg-slate-800/80 border-slate-700 text-slate-100"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            {NEUROLOGY_SUBSPECIALTIES.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_PILLS.map((pill) => {
            const active = statusFilter === pill.value;
            const c = counts[pill.value];
            return (
              <button
                key={pill.value}
                type="button"
                onClick={() => setStatusFilter(pill.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  active
                    ? "bg-[#C25934] text-white border-[#C25934]"
                    : darkMode
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {pill.label} ({c})
              </button>
            );
          })}
        </div>
      </div>

      {/* Pathways List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-xs font-bold opacity-75">
            No clinical pathways match your current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((p) => {
            const isDeleted = Boolean(p.deletedAt);
            const compoundCount = p.nodes.filter(
              (n) => n.compoundItems && n.compoundItems.length > 0
            ).length;
            const abbrCount = (p.abbreviations?.length ?? 0) + (p.footnotes?.length ?? 0);

            return (
              <div
                key={p.uid}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  darkMode
                    ? "bg-slate-800/40 border-slate-700/80"
                    : "bg-slate-50/70 border-slate-200"
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isDeleted
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                          : p.status === "published"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : p.status === "draft"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                              : "bg-slate-500/15 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {isDeleted ? "Deleted" : p.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C25934]/12 text-[#C25934] dark:text-orange-300">
                      {p.subspecialty}
                    </span>
                    <span className="text-[11px] opacity-65">
                      {p.source.organizationOrAuthor} ({p.source.year})
                      {p.source.figureRef ? ` · ${p.source.figureRef}` : ""}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold leading-snug">{p.title.en}</h4>
                  {p.title.vi && (
                    <p className="text-xs opacity-70 truncate">{p.title.vi}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-[11px] opacity-65 pt-0.5">
                    <span>{p.nodes.length} steps</span>
                    {compoundCount > 0 && <span>{compoundCount} AND/OR</span>}
                    {abbrCount > 0 && <span>{abbrCount} abbr/notes</span>}
                    <span className="font-mono">rev {p.rev}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isDeleted && (
                    <>
                      <button
                        type="button"
                        onClick={() => onPreview(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          darkMode
                            ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                        title="Live Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#C25934]/12 text-[#C25934] dark:text-orange-300 border border-[#C25934]/30 hover:bg-[#C25934]/20 cursor-pointer"
                        title="Edit pathway"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={busyUid === p.uid}
                        onClick={() => onDelete(p)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-40 cursor-pointer"
                        title="Soft-delete pathway"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {isDeleted && (
                    <button
                      type="button"
                      disabled={busyUid === p.uid}
                      onClick={() => onRestore(p)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-40 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
