"use client";

import React, { useState } from "react";

export type EsoEvidenceQuality = "High" | "Moderate" | "Low" | "Very low" | string;
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
import { ESO_GRADE_QUALITY_CONFIG, normalizeEsoStrength } from "@/lib/neuroguide/esoPicoGrouper";
export { ESO_GRADE_QUALITY_CONFIG, normalizeEsoStrength };

export function renderGradeQuality(quality: string) {
  const norm = (quality || "").trim().toLowerCase();
  let conf = ESO_GRADE_QUALITY_CONFIG["Moderate"];

  if (norm.includes("very low")) {
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
 * Returns styled Strength of Recommendation according to ESO/GRADE standard (Table 11):
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
        <div className="bg-[#1e40af] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">
              Table 11 Synoptic table of all recommendations and expert consensus statements
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowGradeModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-xs"
            title="View European Stroke Organisation (ESO) GRADE methodology and definitions"
          >
            <span>🇪🇺</span>
            <span>ESO GRADE Methodology</span>
          </button>
        </div>
      )}

      {/* Main ESO Guideline Table */}
      <div className="overflow-x-auto">
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
            {picoItems.map((pico, idx) => (
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
                      <span>
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

                {/* CONTENT ROW UNDER PICO */}
                <tr
                  className={`border-b transition-colors ${
                    darkMode
                      ? "border-slate-800 hover:bg-slate-900/40"
                      : "border-slate-200 hover:bg-slate-50/50"
                  }`}
                >
                  {/* LEFT COLUMN: RECOMMENDATION (GRADE Format) */}
                  <td
                    className="py-4 px-4 text-xs sm:text-[12.5px] leading-relaxed align-top border-r border-slate-300 dark:border-slate-800 space-y-4"
                    style={{ width: "62%" }}
                  >
                    {pico.recommendations.map((rec, rIdx) => (
                      <div key={rIdx} className="space-y-1.5">
                        <div className="flex items-start gap-2">
                          {pico.recommendations.length > 1 && (
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 flex-shrink-0">
                              {rec.number || rIdx + 1}.
                            </span>
                          )}
                          <p className="text-slate-800 dark:text-slate-200 font-normal leading-relaxed">
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

                          {/* Related Studies / Driving Trials ("Kèm theo các nghiên cứu liên quan") */}
                          {((rec.drivingTrials && rec.drivingTrials.length > 0) || (pico.drivingTrials && pico.drivingTrials.length > 0)) && (
                            <div className="pt-2 flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                Nghiên cứu liên quan:
                              </span>
                              {(rec.drivingTrials && rec.drivingTrials.length > 0 ? rec.drivingTrials : pico.drivingTrials || []).map((study, sIdx) => (
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
                    ))}
                  </td>

                  {/* RIGHT COLUMN: EXPERT CONSENSUS STATEMENT & VOTING */}
                  <td
                    className="py-4 px-4 text-xs sm:text-[12.5px] leading-relaxed align-top space-y-3"
                    style={{ width: "38%" }}
                  >
                    {pico.expertConsensusStatement ? (
                      <div className="space-y-3">
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                          {pico.expertConsensusStatement}
                        </p>
                        {pico.voting && (
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 italic">
                            {pico.voting.startsWith("Vote:") ? pico.voting : `Vote: ${pico.voting}`}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Blank whitespace matching official guideline */
                      <div className="min-h-[1rem]"></div>
                    )}
                  </td>
                </tr>
              </React.Fragment>
            ))}
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
