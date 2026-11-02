"use client";

import React, { useState } from "react";

export type EsoEvidenceQuality =
  | "High"
  | "Moderate"
  | "Low"
  | "Very low"
  | "Uncertain / Ongoing trial"
  | "Uncertain / Ongoing trials"
  | string;
export type EsoRecommendationStrength =
  | "Strong for intervention"
  | "Weak for intervention"
  | "Weak against intervention"
  | "Strong against intervention"
  | string;

export interface EsoRecommendationDetail {
  number?: number;
  statement: string;
  qualityOfEvidence: EsoEvidenceQuality; // High | Moderate | Low | Very low
  strengthOfRecommendation: EsoRecommendationStrength; // Strong for | Weak for | Weak against | Strong against
  drivingTrials?: string[];
  expertConsensusStatement?: string;
  expertConsensusStatements?: string[];
  voting?: string;
}

export interface EsoPicoItem {
  picoNumber: number | string;
  picoQuestion: string; // e.g., "In patients with suspected acute stroke, does pre-hospital blood pressure lowering with any drug, compared to no drug, improve outcome?"
  recommendations: EsoRecommendationDetail[];
  expertConsensusStatement?: string;
  voting?: string; // e.g., "Vote: 10/10"
  drivingTrials?: string[];
}

export interface EsoGuidelineTableProps {
  title?: string;
  picoItems: EsoPicoItem[];
  darkMode?: boolean;
  className?: string;
  allowEdit?: boolean;
  onEditPico?: (pico: EsoPicoItem) => void;
}

/**
 * Returns formatted circle symbols for GRADE Quality of Evidence matching official ESO guideline (Hình 1):
 * - High: ⊕⊕⊕⊕
 * - Moderate: ⊕⊕⊕
 * - Low: ⊕⊕
 * - Very low: ⊕
 */
import {
  ESO_GRADE_QUALITY_CONFIG,
  normalizeEsoStrength,
  parseConsensusList,
  type ParsedConsensusItem,
} from "@/lib/neuroguide/esoPicoGrouper";
export {
  ESO_GRADE_QUALITY_CONFIG,
  normalizeEsoStrength,
  parseConsensusList,
  type ParsedConsensusItem,
};

export function renderGradeQuality(quality: string) {
  const norm = (quality || "").trim().toLowerCase();
  let conf = ESO_GRADE_QUALITY_CONFIG[quality] || ESO_GRADE_QUALITY_CONFIG["Moderate"];

  if (
    norm.includes("uncertain") ||
    norm.includes("not assessable") ||
    norm.includes("ongoing") ||
    norm === "-" ||
    norm === "—" ||
    norm === "–" ||
    norm === "(–)" ||
    norm === "(-)"
  ) {
    conf = ESO_GRADE_QUALITY_CONFIG["Uncertain / Ongoing trial"] || ESO_GRADE_QUALITY_CONFIG["Moderate"];
  } else if (norm.includes("very low")) {
    conf = ESO_GRADE_QUALITY_CONFIG["Very low"];
  } else if (norm.includes("low") && !norm.includes("very low")) {
    conf = ESO_GRADE_QUALITY_CONFIG["Low"];
  } else if (norm.includes("high")) {
    conf = ESO_GRADE_QUALITY_CONFIG["High"];
  }

  return (
    <span
      style={{ color: conf.hex }}
      className="inline-flex items-center gap-1.5 font-bold"
    >
      <span>{conf.label}</span>
      <span className="tracking-tight font-mono text-sm leading-none">{conf.symbols}</span>
    </span>
  );
}

/**
 * Returns styled Strength of Recommendation according to ESO/GRADE standard:
 * - Strong against intervention ↓↓ (Red: #d32f2f)
 * - Weak against intervention ↓ (Orange: #ea580c)
 * - Weak for intervention ↑ (Green: #16a34a)
 * - Strong for intervention ↑↑ (Dark Green: #15803d)
 * - Uncertain / Ongoing trials — (Slate: #64748b)
 */
export function renderGradeStrength(strength: string, statement?: string) {
  const canonical = normalizeEsoStrength(strength, statement);

  switch (canonical) {
    case "Strong against intervention":
      return (
        <span className="font-extrabold text-[#d32f2f] dark:text-red-400 inline-flex items-center gap-1">
          <span>Strong against intervention</span>
          <span className="font-black text-sm tracking-tight">↓↓</span>
        </span>
      );

    case "Weak against intervention":
      return (
        <span className="font-extrabold text-[#ea580c] dark:text-orange-400 inline-flex items-center gap-1">
          <span>Weak against intervention</span>
          <span className="font-black text-sm tracking-tight">↓</span>
        </span>
      );

    case "Strong for intervention":
      return (
        <span className="font-extrabold text-[#15803d] dark:text-emerald-400 inline-flex items-center gap-1">
          <span>Strong for intervention</span>
          <span className="font-black text-sm tracking-tight">↑↑</span>
        </span>
      );

    case "Uncertain / Ongoing trials":
      return (
        <span className="font-extrabold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
          <span>Uncertain / Ongoing trials</span>
          <span className="font-black text-sm tracking-tight">—</span>
        </span>
      );

    case "Weak for intervention":
    default:
      return (
        <span className="font-extrabold text-[#16a34a] dark:text-emerald-400 inline-flex items-center gap-1">
          <span>Weak for intervention</span>
          <span className="font-black text-sm tracking-tight">↑</span>
        </span>
      );
  }
}

export function renderConsensusStatements(items: ParsedConsensusItem[]) {
  if (!items || items.length === 0) {
    return <div className="min-h-[1rem]"></div>;
  }

  if (items.length === 1 && !items[0].number) {
    const item = items[0];
    return (
      <div className="space-y-2">
        <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
          {item.statement}
        </p>
        {item.voting && (
          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 italic">
            {item.voting.startsWith("Vote:") ? item.voting : `Vote: ${item.voting}`}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={idx}
          className={
            items.length > 1
              ? "pb-2.5 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 last:pb-0 space-y-1"
              : "space-y-1"
          }
        >
          <div className="flex items-start gap-2">
            {items.length > 1 && (
              <span className="font-extrabold text-[#1e40af] dark:text-cyan-400 text-xs flex-shrink-0 mt-0.5">
                {item.number ? `${item.number}.` : `${idx + 1}.`}
              </span>
            )}
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line flex-1">
              {item.statement}
            </p>
          </div>
          {item.voting && (
            <div className="pl-4 sm:pl-5 text-[11.5px] font-bold text-slate-600 dark:text-slate-400 italic">
              {item.voting.startsWith("Vote:") ? item.voting : `Vote: ${item.voting}`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function EsoGuidelineTable({
  title,
  picoItems,
  darkMode = false,
  className = "",
  allowEdit = false,
  onEditPico,
}: EsoGuidelineTableProps) {
  const [showGradeModal, setShowGradeModal] = useState<boolean>(false);

  return (
    <div
      className={`w-full font-sans overflow-hidden rounded-xl border ${
        darkMode ? "border-slate-800 bg-slate-950" : "border-slate-300 bg-white"
      } shadow-sm ${className}`}
    >
      {/* Optional Top Title Bar */}
      {title && (
        <div className="bg-[#1e40af] text-white px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-[11px] font-bold text-blue-200 uppercase tracking-wider">
              Synoptic table of all recommendations and expert consensus statements
            </div>
            <h2 className="text-xs sm:text-base font-extrabold tracking-wide uppercase leading-snug mt-0.5">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowGradeModal(true)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-[11px] sm:text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-xs shrink-0"
            title="View European Stroke Organisation (ESO) GRADE methodology and definitions"
          >
            <span>🇪🇺</span>
            <span>ESO GRADE Methodology</span>
          </button>
        </div>
      )}

      {/* 2A. MOBILE PICO COMPACT CARDS (Mobile-First, zero horizontal overflow) */}
      <div className="block md:hidden divide-y divide-slate-200 dark:divide-slate-800">
        {picoItems.map((pico, idx) => {
          const recs = Array.isArray(pico.recommendations) && pico.recommendations.length > 0
            ? pico.recommendations
            : [
                {
                  statement: "No evidence-based recommendation can be made.",
                  qualityOfEvidence: "Uncertain / Ongoing trial",
                  strengthOfRecommendation: "Uncertain / Ongoing trials",
                },
              ];

          const hasPerRecConsensus = recs.some(
            (r) =>
              Boolean(
                r.expertConsensusStatement?.trim() ||
                  (r.expertConsensusStatements && r.expertConsensusStatements.length > 0)
              )
          );

          const picoConsensusItems = parseConsensusList(
            pico.expertConsensusStatement,
            undefined,
            pico.voting
          );

          return (
            <div key={`mob-pico-${idx}`} className="bg-transparent">
              {/* PICO Question Header */}
              <div
                className={`p-3 text-xs leading-snug border-b font-black ${
                  darkMode
                    ? "bg-[#163b52] border-[#245474] text-cyan-100"
                    : "bg-[#d0e8f7] border-[#b8ddf0] text-slate-900"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="whitespace-pre-line font-bold">
                    PICO {pico.picoNumber} {pico.picoQuestion}
                  </span>
                  {allowEdit && onEditPico && (
                    <button
                      type="button"
                      onClick={() => onEditPico(pico)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-white cursor-pointer shadow-2xs"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Recommendations under this PICO */}
              <div className="divide-y divide-slate-100 dark:divide-slate-900">
                {recs.map((rec, rIdx) => {
                  const recConsensusItems = hasPerRecConsensus
                    ? parseConsensusList(
                        rec.expertConsensusStatement,
                        rec.expertConsensusStatements,
                        rec.voting
                      )
                    : [];

                  return (
                    <div
                      key={`mob-rec-${idx}-${rIdx}`}
                      className={`p-3.5 space-y-2.5 transition-colors ${
                        darkMode ? "hover:bg-slate-900/50" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start gap-1.5">
                          {recs.length > 1 && (
                            <span className="font-black text-slate-900 dark:text-slate-100 text-xs mt-0.5 flex-shrink-0 px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800">
                              {rec.number || rIdx + 1}
                            </span>
                          )}
                          <p className="text-xs sm:text-[13px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                            {rec.statement}
                          </p>
                        </div>

                        {/* GRADE Metadata */}
                        <div className="pl-2 sm:pl-3 space-y-1 pt-1 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                              Evidence Quality:
                            </span>
                            {renderGradeQuality(rec.qualityOfEvidence)}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
                              Recommendation:
                            </span>
                            {renderGradeStrength(rec.strengthOfRecommendation, rec.statement)}
                          </div>

                          {/* Related Studies */}
                          {((rec.drivingTrials && rec.drivingTrials.length > 0) ||
                            (pico.drivingTrials && pico.drivingTrials.length > 0)) && (
                            <div className="pt-1.5 flex flex-wrap items-center gap-1 text-xs">
                              <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400">
                                Nghiên cứu:
                              </span>
                              {(rec.drivingTrials && rec.drivingTrials.length > 0
                                ? rec.drivingTrials
                                : pico.drivingTrials || []
                              ).map((study, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-[#1d72b8] dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                >
                                  📊 {study}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Per-rec Consensus Statement */}
                      {hasPerRecConsensus && recConsensusItems.length > 0 && (
                        <div className="mt-2 p-2.5 rounded-lg border-l-4 border-l-[#1e40af] bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs">
                          <div className="text-[10.5px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1 flex items-center gap-1">
                            <span>🇪🇺</span>
                            <span>Expert Consensus Statement</span>
                          </div>
                          {renderConsensusStatements(recConsensusItems)}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* PICO-level Consensus Statement (when shared across all recs in PICO) */}
                {!hasPerRecConsensus && picoConsensusItems.length > 0 && (
                  <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 border-t border-slate-100 dark:border-slate-800">
                    <div className="p-2.5 rounded-lg border-l-4 border-l-[#1e40af] bg-white/70 dark:bg-slate-900/70 border border-blue-100 dark:border-blue-900/40 text-xs">
                      <div className="text-[10.5px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-1.5 flex items-center gap-1">
                        <span>🇪🇺</span>
                        <span>Expert Consensus Statement &amp; Voting</span>
                      </div>
                      {renderConsensusStatements(picoConsensusItems)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 2B. DESKTOP OFFICIAL 2-COLUMN TABLE (Preserved for Tablets & Desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          {/* Main 2-Column Headers (Matching Hình 1) */}
          <thead>
            <tr
              className={`border-b ${
                darkMode
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-slate-100 border-slate-300 text-slate-900"
              }`}
            >
              <th
                className="py-3 px-4 font-black text-xs sm:text-sm tracking-wide border-r border-slate-300 dark:border-slate-700"
                style={{ width: "62%" }}
              >
                Recommendation
              </th>
              <th
                className="py-3 px-4 font-black text-xs sm:text-sm tracking-wide"
                style={{ width: "38%" }}
              >
                Expert consensus statement
              </th>
            </tr>
          </thead>

          <tbody>
            {picoItems.map((pico, idx) => {
              const recs = Array.isArray(pico.recommendations) && pico.recommendations.length > 0
                ? pico.recommendations
                : [
                    {
                      statement: "No evidence-based recommendation can be made.",
                      qualityOfEvidence: "Uncertain / Ongoing trial",
                      strengthOfRecommendation: "Uncertain / Ongoing trials",
                    },
                  ];

              // Check if any recommendation has its own explicit consensus statement
              const hasPerRecConsensus = recs.some(
                (r) =>
                  Boolean(
                    r.expertConsensusStatement?.trim() ||
                      (r.expertConsensusStatements && r.expertConsensusStatements.length > 0)
                  )
              );

              const picoConsensusItems = parseConsensusList(
                pico.expertConsensusStatement,
                undefined,
                pico.voting
              );

              return (
                <React.Fragment key={`pico-${idx}`}>
                  {/* PICO FULL-WIDTH SUBHEADER BAR (Exact light-cyan/blue background #d0e8f7 matching Hình 1) */}
                  <tr
                    className={`border-t border-b ${
                      darkMode
                        ? "bg-[#163b52] border-[#245474] text-cyan-100"
                        : "bg-[#d0e8f7] border-[#b8ddf0] text-slate-900"
                    }`}
                  >
                    <td colSpan={2} className="py-2 px-4 font-black text-xs sm:text-[13px] leading-snug">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="whitespace-pre-line">
                          PICO {pico.picoNumber} {pico.picoQuestion}
                        </span>
                        {allowEdit && onEditPico && (
                          <button
                            type="button"
                            onClick={() => onEditPico(pico)}
                            className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-white/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-white cursor-pointer transition-colors shadow-2xs"
                          >
                            ✏️ Edit PICO
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* RECOMMENDATION ROWS UNDER PICO (Matching official 2-column synoptic format) */}
                  {recs.map((rec, rIdx) => {
                    const isFirst = rIdx === 0;
                    const isLast = rIdx === recs.length - 1;
                    const recConsensusItems = hasPerRecConsensus
                      ? parseConsensusList(
                          rec.expertConsensusStatement,
                          rec.expertConsensusStatements,
                          rec.voting
                        )
                      : isFirst
                      ? picoConsensusItems
                      : [];

                    return (
                      <tr
                        key={rIdx}
                        className={`transition-colors ${
                          isLast ? "border-b" : "border-b border-dashed"
                        } ${
                          darkMode
                            ? isLast
                              ? "border-slate-800 hover:bg-slate-900/40"
                              : "border-slate-800/60 hover:bg-slate-900/40"
                            : isLast
                            ? "border-slate-200 hover:bg-slate-50/50"
                            : "border-slate-200/80 hover:bg-slate-50/50"
                        }`}
                      >
                        {/* LEFT COLUMN: RECOMMENDATION (GRADE Format) */}
                        <td
                          className="py-4 px-4 text-xs sm:text-[12.5px] leading-relaxed align-top border-r border-slate-300 dark:border-slate-800 space-y-3"
                          style={{ width: "62%" }}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-start gap-2">
                              {recs.length > 1 && (
                                <span className="font-extrabold text-slate-900 dark:text-slate-100 flex-shrink-0">
                                  {rec.number || rIdx + 1}.
                                </span>
                              )}
                              <p className="text-slate-800 dark:text-slate-200 font-normal leading-relaxed whitespace-pre-line">
                                {rec.statement}
                              </p>
                            </div>

                            {/* GRADE Metadata: Quality of evidence & Strength of recommendation */}
                            <div className="pl-4 sm:pl-5 space-y-1 pt-1 text-xs">
                              <div>
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  Quality of evidence:{" "}
                                </span>
                                {renderGradeQuality(rec.qualityOfEvidence)}
                              </div>
                              <div>
                                <span className="text-slate-600 dark:text-slate-400 font-medium">
                                  Strength of recommendation:{" "}
                                </span>
                                {renderGradeStrength(rec.strengthOfRecommendation, rec.statement)}
                              </div>

                              {/* Related Studies / Driving Trials */}
                              {((rec.drivingTrials && rec.drivingTrials.length > 0) ||
                                (pico.drivingTrials && pico.drivingTrials.length > 0)) && (
                                <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                    Nghiên cứu liên quan:
                                  </span>
                                  {(rec.drivingTrials && rec.drivingTrials.length > 0
                                    ? rec.drivingTrials
                                    : pico.drivingTrials || []
                                  ).map((study, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-[#1d72b8] dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-2xs"
                                    >
                                      <span>📊</span>
                                      <span>{study}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* RIGHT COLUMN: EXPERT CONSENSUS STATEMENT & VOTING */}
                        {hasPerRecConsensus ? (
                          <td
                            className="py-4 px-4 text-xs sm:text-[12.5px] leading-relaxed align-top space-y-3"
                            style={{ width: "38%" }}
                          >
                            {renderConsensusStatements(recConsensusItems)}
                          </td>
                        ) : isFirst ? (
                          <td
                            rowSpan={recs.length}
                            className="py-4 px-4 text-xs sm:text-[12.5px] leading-relaxed align-top space-y-3"
                            style={{ width: "38%" }}
                          >
                            {renderConsensusStatements(picoConsensusItems)}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Guideline Table Footer */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 italic">
        <span>European Stroke Organisation (ESO) Synoptic Recommendations</span>
        <span>(continued)</span>
      </div>

      {/* MODAL FOR GRADE & ESO METHODOLOGY */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
          <div
            className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${
              darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between p-4 border-b bg-slate-800 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">🇪🇺</span>
                <h3 className="font-black text-sm uppercase tracking-wide">
                  European Stroke Organisation (ESO) GRADE System
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGradeModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <h4 className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                  1. PICO Framework (Population, Intervention, Comparator, Outcome)
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every ESO clinical guideline recommendation stems from a structured PICO clinical question spanning the full width of the consensus table.
                </p>
              </div>

              <div>
                <h4 className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                  2. Quality of Evidence (GRADE)
                </h4>
                <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                  <li><strong className="text-blue-600">High ⊕⊕⊕⊕:</strong> We are very confident that the true effect lies close to that of the estimate of the effect.</li>
                  <li><strong className="text-blue-600">Moderate ⊕⊕⊕⊝:</strong> We are moderately confident in the effect estimate.</li>
                  <li><strong className="text-blue-600">Low ⊕⊕⊝⊝:</strong> Confidence in the effect estimate is limited; true effect may be substantially different.</li>
                  <li><strong className="text-blue-600">Very low ⊕⊝⊝⊝:</strong> We have very little confidence in the effect estimate.</li>
                  <li><strong className="text-slate-500">Uncertain / Ongoing trial -:</strong> Trials are ongoing or evidence is not available to assess quality.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                  3. Strength of Recommendation
                </h4>
                <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li><strong className="text-emerald-600">Strong for intervention ↑↑:</strong> Most patients should receive the recommended course of action.</li>
                  <li><strong className="text-emerald-500">Weak for intervention ↑?:</strong> Suggested for majority of patients; requires individualized decision-making.</li>
                  <li><strong className="text-orange-500">Weak against intervention ↓?:</strong> Suggestion not to implement routinely.</li>
                  <li><strong className="text-red-600">Strong against intervention ↓↓:</strong> Strongly recommend against this intervention.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                  4. Expert Consensus Statement &amp; Vote
                </h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Formulated when randomized controlled trial evidence is insufficient but clinical practice requires clear guidance. Displays the exact voting consensus ratio among guideline module authors (e.g. Vote: 10/10).
                </p>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setShowGradeModal(false)}
                className="px-4 py-2 rounded-lg font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
