"use client";

import React, { useState, useMemo } from "react";
import type { PivotalTrialRecord, SubspecialtyType } from "@/types/neuroguide";
import { SUBSPECIALTY_LIST } from "@/constants/subspecialties";

interface PivotalTrialsAdminTabProps {
  darkMode: boolean;
  trials: PivotalTrialRecord[];
  onRefresh: () => void;
  onAddNewTrial: () => void;
  onEditTrial: (trial: PivotalTrialRecord) => void;
  onDeleteTrial: (trial: PivotalTrialRecord) => Promise<void>;
}

export function PivotalTrialsAdminTab({
  darkMode,
  trials,
  onRefresh,
  onAddNewTrial,
  onEditTrial,
  onDeleteTrial,
}: PivotalTrialsAdminTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState<string>("ALL");
  const [selectedSource, setSelectedSource] = useState<string>("ALL");
  const [selectedVerdict, setSelectedVerdict] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Statistics calculation for Executive Dashboard
  const stats = useMemo(() => {
    const total = trials.length;
    const published = trials.filter(
      (t) => t.evidenceSource === "PEER_REVIEWED_PUBLISHED"
    ).length;
    const lateBreaking = trials.filter(
      (t) => t.evidenceSource === "CONFERENCE_LATE_BREAKING"
    ).length;
    const positive = trials.filter(
      (t) => t.primaryEndpoint?.verdict === "POSITIVE"
    ).length;
    const nonInferior = trials.filter(
      (t) => t.primaryEndpoint?.verdict === "NON_INFERIOR"
    ).length;
    const negative = trials.filter(
      (t) => t.primaryEndpoint?.verdict === "NEGATIVE"
    ).length;
    const neutral = trials.filter(
      (t) => t.primaryEndpoint?.verdict === "NEUTRAL"
    ).length;
    const withCitation = trials.filter((t) => Boolean(t.doi || t.pmid)).length;
    const totalPatients = trials.reduce(
      (acc, t) => acc + (Number(t.sampleSize) || 0),
      0
    );
    const favorableCount = positive + nonInferior;
    const favorableRate = total > 0 ? Math.round((favorableCount / total) * 100) : 0;
    const verifiedPercent = total > 0 ? Math.round((withCitation / total) * 100) : 0;

    return {
      total,
      published,
      lateBreaking,
      positive,
      nonInferior,
      negative,
      neutral,
      withCitation,
      totalPatients,
      favorableCount,
      favorableRate,
      verifiedPercent,
    };
  }, [trials]);

  // Filtered Trials
  const filteredTrials = useMemo(() => {
    return trials.filter((t) => {
      if (
        selectedSubspecialty !== "ALL" &&
        t.subspecialty !== selectedSubspecialty
      ) {
        return false;
      }
      if (selectedSource !== "ALL" && t.evidenceSource !== selectedSource) {
        return false;
      }
      if (
        selectedVerdict !== "ALL" &&
        t.primaryEndpoint?.verdict !== selectedVerdict
      ) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchAcronym = (t.acronym || "").toLowerCase().includes(q);
      const matchTitle = (t.title || "").toLowerCase().includes(q);
      const matchJournal = (t.journal || "").toLowerCase().includes(q);
      const matchPmid = (t.pmid || "").toLowerCase().includes(q);
      const matchDoi = (t.doi || "").toLowerCase().includes(q);
      const matchPop = (t.pico?.population || "").toLowerCase().includes(q);
      const matchInt = (t.pico?.intervention || "").toLowerCase().includes(q);
      const matchComp = (t.pico?.comparator || "").toLowerCase().includes(q);
      const matchBottom = (t.bottomLine || "").toLowerCase().includes(q);

      return (
        matchAcronym ||
        matchTitle ||
        matchJournal ||
        matchPmid ||
        matchDoi ||
        matchPop ||
        matchInt ||
        matchComp ||
        matchBottom
      );
    });
  }, [trials, searchQuery, selectedSubspecialty, selectedSource, selectedVerdict]);

  const handleDelete = async (trial: PivotalTrialRecord) => {
    setDeletingId(trial.id);
    try {
      await onDeleteTrial(trial);
    } finally {
      setDeletingId(null);
    }
  };

  const getVerdictBadgeStyle = (verdict?: string) => {
    switch (verdict) {
      case "POSITIVE":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
      case "NON_INFERIOR":
        return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
      case "NEGATIVE":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
      case "NEUTRAL":
      default:
        return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. STATS OVERVIEW CARDS (EXECUTIVE DASHBOARD)
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Clinical Trials</span>
            <span className="text-indigo-500">🔬</span>
          </div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
            {stats.totalPatients > 0
              ? `~${stats.totalPatients.toLocaleString()} patients enrolled`
              : "Landmark RCTs registry"}
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Evidence Hierarchy</span>
            <span className="text-emerald-500">📑</span>
          </div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {stats.published} <span className="text-xs font-normal text-slate-400">Pub</span> •{" "}
            {stats.lateBreaking} <span className="text-xs font-normal text-slate-400">Late</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            Peer-reviewed vs Conference trials
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Efficacy Verdicts</span>
            <span className="text-amber-500">🎯</span>
          </div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {stats.favorableRate}% <span className="text-xs font-semibold text-slate-400">Favorable</span>
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
            {stats.positive} Pos • {stats.nonInferior} Non-Inf • {stats.negative} Neg
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Citations &amp; PMID/DOI</span>
            <span className="text-purple-500">⚡</span>
          </div>
          <div className="text-2xl font-black mt-1 text-purple-600 dark:text-purple-400">
            {stats.verifiedPercent}%
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
            {stats.withCitation} / {stats.total} with verified citation
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. TOOLBAR & REPOSITORY CONTROLS
         ========================================================================= */}
      <div
        className={`p-5 rounded-2xl border border-l-4 border-l-indigo-600 space-y-4 ${
          darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>🔬 Landmark Clinical Trials &amp; Late-Breaking Registry</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                {filteredTrials.length} / {trials.length} Active
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Structured quantitative PICO endpoints (~700 bytes/trial) driving evidence-based guideline recommendations
            </p>
          </div>

          {/* Action buttons: Add Trial & Refresh */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddNewTrial}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Add a new clinical trial manually or auto-fill with PMID/DOI"
            >
              <span>+</span>
              <span>Add Pivotal Trial</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
              title="Refresh trials from storage"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by trial acronym, title, PMID, DOI, PICO..."
              className={`w-full pl-7 pr-7 py-1.5 text-xs rounded-xl border outline-none transition-all ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Subspecialty Filter */}
          <select
            value={selectedSubspecialty}
            onChange={(e) => setSelectedSubspecialty(e.target.value)}
            className={`px-3 py-1.5 text-xs rounded-xl border outline-none ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-white"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <option value="ALL">All Subspecialties</option>
            {SUBSPECIALTY_LIST.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          {/* Evidence Source Filter */}
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className={`px-3 py-1.5 text-xs rounded-xl border outline-none ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-white"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <option value="ALL">All Evidence Sources</option>
            <option value="PEER_REVIEWED_PUBLISHED">Peer-Reviewed Published</option>
            <option value="CONFERENCE_LATE_BREAKING">Conference Late-Breaking</option>
          </select>

          {/* Verdict Filter */}
          <select
            value={selectedVerdict}
            onChange={(e) => setSelectedVerdict(e.target.value)}
            className={`px-3 py-1.5 text-xs rounded-xl border outline-none ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-white"
                : "bg-slate-50 border-slate-200 text-slate-900"
            }`}
          >
            <option value="ALL">All Verdicts</option>
            <option value="POSITIVE">Positive</option>
            <option value="NON_INFERIOR">Non-Inferior</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="NEGATIVE">Negative</option>
          </select>
        </div>

        {/* =========================================================================
            3. TRIALS LIST / CARDS GRID
           ========================================================================= */}
        <div className="space-y-3.5">
          {filteredTrials.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No clinical trials found matching your filter criteria.
            </div>
          ) : (
            filteredTrials.map((trial) => {
              const isDeleting = deletingId === trial.id;
              const verdictStyle = getVerdictBadgeStyle(trial.primaryEndpoint?.verdict);

              return (
                <div
                  key={trial.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    darkMode
                      ? "bg-slate-800/40 border-slate-700/60 hover:border-indigo-500/40"
                      : "bg-slate-50/80 border-slate-200 hover:border-indigo-400 hover:shadow-xs"
                  }`}
                >
                  {/* Top Bar: Acronym, Badges, Verdict, and Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                        {trial.acronym}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        ({trial.journal || "Journal"} {trial.year})
                      </span>

                      {trial.sampleSize && (
                        <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                          N={Number(trial.sampleSize).toLocaleString()}
                        </span>
                      )}

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {trial.subspecialty}
                      </span>

                      {trial.evidenceSource === "CONFERENCE_LATE_BREAKING" ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-500 text-white">
                          LATE-BREAKING
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          PUBLISHED
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10.5px] font-black border ${verdictStyle}`}
                      >
                        {trial.primaryEndpoint?.verdict?.replace("_", "-") || "POSITIVE"}
                      </span>

                      <button
                        type="button"
                        onClick={() => onEditTrial(trial)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        title="Edit trial details, PICO, and endpoints"
                      >
                        <span>✏️</span>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(trial)}
                        className="px-2 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        title="Delete trial from library"
                      >
                        <span>{isDeleting ? "..." : "🗑️"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Full Title */}
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {trial.title}
                  </div>

                  {/* Compact PICO Box */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11.5px] space-y-1">
                    <div>
                      <strong className="text-slate-500 font-bold">P (Population):</strong>{" "}
                      <span className="text-slate-800 dark:text-slate-200">
                        {trial.pico?.population || "Not specified"}
                      </span>
                    </div>
                    <div>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-bold">
                        I (Intervention):
                      </strong>{" "}
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {trial.pico?.intervention || "Not specified"}
                      </span>{" "}
                      <strong className="text-slate-400 font-bold">vs. C (Comparator):</strong>{" "}
                      <span className="text-slate-600 dark:text-slate-400">
                        {trial.pico?.comparator || "Standard care"}
                      </span>
                    </div>
                    {trial.pico?.timeWindow && (
                      <div className="text-slate-500 text-[10.5px]">
                        <strong>Time Window:</strong> {trial.pico.timeWindow}
                      </div>
                    )}
                  </div>

                  {/* Primary & Safety Endpoints */}
                  <div className="space-y-1.5 text-xs">
                    <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/50">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300">
                        Primary ({trial.primaryEndpoint?.metric || "Outcome"}):{" "}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {trial.primaryEndpoint?.resultStats || "Reported in trial"}
                      </span>
                    </div>

                    {(trial.safetyEndpoint?.sICH ||
                      trial.safetyEndpoint?.mortality90d ||
                      trial.safetyEndpoint?.note) && (
                      <div className="px-2 py-0.5 text-[11px] text-slate-600 dark:text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 font-medium">
                        {trial.safetyEndpoint.sICH && (
                          <span>
                            <strong>sICH:</strong> {trial.safetyEndpoint.sICH}
                          </span>
                        )}
                        {trial.safetyEndpoint.mortality90d && (
                          <span>
                            <strong>90d Mortality:</strong> {trial.safetyEndpoint.mortality90d}
                          </span>
                        )}
                        {trial.safetyEndpoint.note && <span>• {trial.safetyEndpoint.note}</span>}
                      </div>
                    )}
                  </div>

                  {/* Bottom-Line Clinical Takeaway */}
                  {trial.bottomLine && (
                    <div className="text-[11.5px] text-amber-900 dark:text-amber-200 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 font-medium">
                      💡 <span className="font-bold">Takeaway:</span> {trial.bottomLine}
                    </div>
                  )}

                  {/* Footer Citation Links & Ontology Tags */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-3">
                      {trial.pmid && (
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${trial.pmid}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>PMID: {trial.pmid}</span>
                          <span>↗</span>
                        </a>
                      )}
                      {trial.doi && (
                        <a
                          href={`https://doi.org/${trial.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-0.5"
                        >
                          <span>DOI: {trial.doi}</span>
                          <span>↗</span>
                        </a>
                      )}
                    </div>

                    {/* Ontology Tags Summary Pill */}
                    {trial.ontologyTags && Object.keys(trial.ontologyTags).length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {Object.entries(trial.ontologyTags).flatMap(([facet, tags]) =>
                          (tags || []).slice(0, 3).map((tag) => (
                            <span
                              key={`${facet}-${tag}`}
                              className="px-1.5 py-0.2 rounded text-[9.5px] font-mono bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
