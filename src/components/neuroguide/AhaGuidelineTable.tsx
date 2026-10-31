"use client";

import React, { useState } from "react";

export interface AhaRecommendationItem {
  id?: string;
  index?: number;
  cor: "1" | "2a" | "2b" | "3" | "3: Harm" | "3: No Benefit" | string;
  loe: "A" | "B-R" | "B-NR" | "C-LD" | "C-EO" | string;
  statement: string;
  drivingTrials?: string[];
  citations?: string;
}

export interface AhaGuidelineSection {
  sectionTitle: string;
  recommendations: AhaRecommendationItem[];
}

export interface AhaGuidelineTableProps {
  title: string;
  subSupplementText?: string;
  sections: AhaGuidelineSection[];
  darkMode?: boolean;
  className?: string;
  allowEdit?: boolean;
  onEditRec?: (rec: AhaRecommendationItem) => void;
}

/**
 * Returns background & text color classes for AHA Class of Recommendation (COR)
 * Based strictly on standard ACC/AHA Evidence-Based Recommendations scheme (Figures 1 & 2):
 * - Class 1: Green (Benefit >>> Risk)
 * - Class 2a: Yellow / Amber (Benefit >> Risk)
 * - Class 2b: Orange (Benefit >= Risk)
 * - Class 3: No Benefit: Coral / Dark Orange (Benefit = Risk)
 * - Class 3: Harm: Red (Risk > Benefit)
 */
export function getAhaCorStyle(cor: string): { bg: string; text: string; label: string } {
  const norm = (cor || "").trim().toLowerCase();

  if (norm === "1" || norm === "class 1" || norm === "class i" || norm === "i") {
    return {
      bg: "bg-[#5cb85c] text-white",
      text: "text-white",
      label: "1",
    };
  }
  if (norm === "2a" || norm === "class 2a" || norm === "class iia" || norm === "iia") {
    return {
      bg: "bg-[#fed136] text-black",
      text: "text-black",
      label: "2a",
    };
  }
  if (norm === "2b" || norm === "class 2b" || norm === "class iib" || norm === "iib") {
    return {
      bg: "bg-[#f59e0b] text-black",
      text: "text-black",
      label: "2b",
    };
  }
  if (
    norm.includes("no benefit") ||
    norm === "3: no benefit" ||
    norm === "class 3: no benefit"
  ) {
    return {
      bg: "bg-[#ea580c] text-white",
      text: "text-white",
      label: "3: No Benefit",
    };
  }
  if (
    norm.includes("harm") ||
    norm === "3" ||
    norm === "class 3" ||
    norm === "class iii" ||
    norm === "iii" ||
    norm === "3: harm"
  ) {
    return {
      bg: "bg-[#dc2626] text-white",
      text: "text-white",
      label: "3: Harm",
    };
  }

  // Fallback
  return {
    bg: "bg-slate-500 text-white",
    text: "text-white",
    label: cor,
  };
}

/**
 * Returns background & text color classes for AHA Level of Evidence (LOE)
 * Uses the classic AHA steel blue background (#5B9BD5)
 */
export function getAhaLoeStyle(loe: string): { bg: string; text: string } {
  return {
    bg: "bg-[#5B9BD5] text-slate-900",
    text: "text-slate-900",
  };
}

export function AhaGuidelineTable({
  title,
  subSupplementText = "Referenced studies that support recommendations are summarized in online Data Supplement.",
  sections,
  darkMode = false,
  className = "",
  allowEdit = false,
  onEditRec,
}: AhaGuidelineTableProps) {
  const [showMatrixModal, setShowMatrixModal] = useState<boolean>(false);

  // Compute total running index across sections
  let runningIndex = 0;

  return (
    <div className={`w-full font-sans overflow-hidden rounded-xl border ${darkMode ? "border-slate-800 bg-slate-950" : "border-slate-300 bg-white"} shadow-sm ${className}`}>
      {/* 1. TOP HEADER BANNER (AHA Signature Red Header) */}
      <div className="bg-[#b91c1c] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[280px]">
          <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
            {title}
          </h2>
          {subSupplementText && (
            <p className="text-xs text-red-100 font-medium mt-0.5 italic">
              {subSupplementText}
            </p>
          )}
        </div>

        {/* Button to view AHA COR/LOE Evidence Scheme Modal */}
        <button
          type="button"
          onClick={() => setShowMatrixModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs font-bold transition-all border border-white/20 cursor-pointer shadow-xs"
          title="View AHA/ASA COR (Class) & LOE (Level) standard scheme"
        >
          <span>📊</span>
          <span>View COR / LOE Scheme</span>
        </button>
      </div>

      {/* 2. TABLE BODY */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[650px]">
          {/* Table Column Headers */}
          <thead>
            <tr className={`${darkMode ? "bg-slate-800 text-slate-200 border-b border-slate-700" : "bg-slate-300 text-slate-800 border-b border-slate-400"}`}>
              <th className="py-2.5 px-3 text-center text-xs font-black uppercase tracking-wider w-20 border-r border-slate-400 dark:border-slate-700">
                COR
              </th>
              <th className="py-2.5 px-3 text-center text-xs font-black uppercase tracking-wider w-24 border-r border-slate-400 dark:border-slate-700">
                LOE
              </th>
              <th className="py-2.5 px-4 text-xs font-black uppercase tracking-wider">
                Recommendations
              </th>
            </tr>
          </thead>

          <tbody>
            {sections.map((section, sIdx) => (
              <React.Fragment key={`section-${sIdx}`}>
                {/* Section Subheader (Spans full table with gray background) */}
                <tr className={`${darkMode ? "bg-slate-900 border-y border-slate-800 text-slate-200" : "bg-slate-200 border-y border-slate-300 text-slate-800"}`}>
                  <td
                    colSpan={3}
                    className="py-2 px-4 text-xs font-bold tracking-wide"
                  >
                    {section.sectionTitle}
                  </td>
                </tr>

                {/* Recommendations in this Section */}
                {section.recommendations.map((rec, rIdx) => {
                  runningIndex += 1;
                  const itemIndex = rec.index ?? runningIndex;
                  const corStyle = getAhaCorStyle(rec.cor);
                  const loeStyle = getAhaLoeStyle(rec.loe);

                  return (
                    <tr
                      key={rec.id || `rec-${sIdx}-${rIdx}`}
                      className={`border-b transition-colors ${
                        darkMode
                          ? "border-slate-800 hover:bg-slate-900/60"
                          : "border-slate-200 hover:bg-slate-50/80"
                      }`}
                    >
                      {/* COR Column (Color-coded solid background, bold centered) */}
                      <td
                        className={`text-center align-middle font-black text-xs sm:text-sm py-3 px-2 border-r border-slate-300 dark:border-slate-700 select-none ${corStyle.bg}`}
                        style={{ width: "80px" }}
                      >
                        {corStyle.label}
                      </td>

                      {/* LOE Column (Steel blue solid background, bold centered) */}
                      <td
                        className={`text-center align-middle font-black text-xs sm:text-sm py-3 px-2 border-r border-slate-300 dark:border-slate-700 select-none ${loeStyle.bg}`}
                        style={{ width: "95px" }}
                      >
                        {rec.loe || "B-NR"}
                      </td>

                      {/* Recommendations Column (Numbered paragraph text) */}
                      <td className="py-3 px-4 text-xs sm:text-[13px] leading-relaxed align-top">
                        <div className="flex items-start gap-2">
                          <span className="font-extrabold text-slate-900 dark:text-slate-100 flex-shrink-0">
                            {itemIndex}.
                          </span>
                          <div className="flex-1 space-y-1">
                            <p className="text-slate-800 dark:text-slate-200">
                              {rec.statement}
                              {rec.citations && (
                                <sup className="font-bold text-blue-600 dark:text-blue-400 ml-1">
                                  {rec.citations}
                                </sup>
                              )}
                            </p>

                            {/* Driving Clinical Trials / References if available */}
                            {rec.drivingTrials && rec.drivingTrials.length > 0 && (
                              <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="font-semibold">Clinical Evidence: </span>
                                <span className="italic">{rec.drivingTrials.join(", ")}</span>
                              </div>
                            )}

                            {/* Optional Edit Trigger for Human-In-The-Loop review */}
                            {allowEdit && onEditRec && (
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() => onEditRec(rec)}
                                  className="text-[10.5px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                                >
                                  ✏️ Edit this recommendation
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. TABLE FOOTER / LEGEND ABBREVIATIONS */}
      <div className={`p-3 text-[11px] border-t leading-normal ${darkMode ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200 text-slate-600"}`}>
        <p>
          <strong>Abbreviations:</strong> COR = Class of Recommendation; LOE = Level of Evidence; NR = nonrandomized; R = randomized; LD = limited data; EO = expert opinion; RCT = randomized controlled trial.
        </p>
      </div>

      {/* 4. MODAL FOR COR / LOE SCHEME */}
      {showMatrixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl ${darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"}`}>
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-slate-800 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    ACC / AHA Classification of Recommendations &amp; Level of Evidence
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Standard framework for recommendation classes and evidence quality grades
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMatrixModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 2 Columns (COR on left, LOE on right) */}
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* LEFT COLUMN: CLASS (STRENGTH) OF RECOMMENDATION */}
              <div className="space-y-3">
                <div className="bg-slate-200 dark:bg-slate-800 p-2 font-black text-center text-xs uppercase tracking-wider rounded">
                  CLASS (STRENGTH) OF RECOMMENDATION
                </div>

                {/* Class 1 (Strong) */}
                <div className="rounded-lg overflow-hidden border border-emerald-600/30">
                  <div className="bg-[#4CAF50] text-white px-3 py-1.5 font-bold flex justify-between items-center">
                    <span>CLASS 1 (STRONG)</span>
                    <span className="text-[11px] font-black">Benefit &gt;&gt;&gt; Risk</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200">
                    <p className="font-bold text-[11px] mb-1">Suggested phrasing for recommendations:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Is recommended</li>
                      <li>Is indicated / useful / effective / beneficial</li>
                      <li>Should be performed / administered</li>
                      <li>Treatment A is recommended in preference to treatment B</li>
                    </ul>
                  </div>
                </div>

                {/* Class 2a (Moderate) */}
                <div className="rounded-lg overflow-hidden border border-yellow-500/30">
                  <div className="bg-[#fbc02d] text-slate-900 px-3 py-1.5 font-bold flex justify-between items-center">
                    <span>CLASS 2a (MODERATE)</span>
                    <span className="text-[11px] font-black">Benefit &gt;&gt; Risk</span>
                  </div>
                  <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/20 text-slate-800 dark:text-slate-200">
                    <p className="font-bold text-[11px] mb-1">Suggested phrasing for recommendations:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Is reasonable</li>
                      <li>Can be useful / effective / beneficial</li>
                      <li>Treatment A is probably recommended over treatment B</li>
                    </ul>
                  </div>
                </div>

                {/* Class 2b (Weak) */}
                <div className="rounded-lg overflow-hidden border border-amber-500/30">
                  <div className="bg-[#fb8c00] text-slate-900 px-3 py-1.5 font-bold flex justify-between items-center">
                    <span>CLASS 2b (WEAK)</span>
                    <span className="text-[11px] font-black">Benefit ≥ Risk</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 text-slate-800 dark:text-slate-200">
                    <p className="font-bold text-[11px] mb-1">Suggested phrasing for recommendations:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>May / might be reasonable</li>
                      <li>May / might be considered</li>
                      <li>Usefulness / effectiveness is unknown or unclear</li>
                    </ul>
                  </div>
                </div>

                {/* Class 3: No Benefit (Moderate) */}
                <div className="rounded-lg overflow-hidden border border-orange-600/30">
                  <div className="bg-[#e65100] text-white px-3 py-1.5 font-bold flex justify-between items-center">
                    <span>CLASS 3: No Benefit (MODERATE)</span>
                    <span className="text-[11px] font-black">Benefit = Risk</span>
                  </div>
                  <div className="p-2.5 bg-orange-50 dark:bg-orange-950/20 text-slate-800 dark:text-slate-200">
                    <p className="font-bold text-[11px] mb-1">Suggested phrasing for recommendations:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Is not recommended</li>
                      <li>Is not indicated / useful / effective</li>
                      <li>Should not be performed / administered</li>
                    </ul>
                  </div>
                </div>

                {/* Class 3: Harm (Strong) */}
                <div className="rounded-lg overflow-hidden border border-red-600/30">
                  <div className="bg-[#d32f2f] text-white px-3 py-1.5 font-bold flex justify-between items-center">
                    <span>CLASS 3: Harm (STRONG)</span>
                    <span className="text-[11px] font-black">Risk &gt; Benefit</span>
                  </div>
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-slate-800 dark:text-slate-200">
                    <p className="font-bold text-[11px] mb-1">Suggested phrasing for recommendations:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Potentially harmful</li>
                      <li>Causes harm</li>
                      <li>Associated with excess morbidity/mortality</li>
                      <li>Should not be performed</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: LEVEL (QUALITY) OF EVIDENCE */}
              <div className="space-y-3">
                <div className="bg-slate-200 dark:bg-slate-800 p-2 font-black text-center text-xs uppercase tracking-wider rounded">
                  LEVEL (QUALITY) OF EVIDENCE‡
                </div>

                {/* Level A */}
                <div className="rounded-lg overflow-hidden border border-blue-500/30">
                  <div className="bg-[#4682B4] text-white px-3 py-1.5 font-bold">
                    LEVEL A
                  </div>
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-slate-800 dark:text-slate-200">
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>High-quality evidence from more than 1 RCT</li>
                      <li>Meta-analyses of high-quality RCTs</li>
                      <li>1+ RCTs corroborated by high-quality registry studies</li>
                    </ul>
                  </div>
                </div>

                {/* Level B-R */}
                <div className="rounded-lg overflow-hidden border border-blue-500/30">
                  <div className="bg-[#5B9BD5] text-slate-900 px-3 py-1.5 font-bold flex justify-between items-center">
                    <span>LEVEL B-R</span>
                    <span className="text-[11px] italic font-semibold">(Randomized)</span>
                  </div>
                  <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/20 text-slate-800 dark:text-slate-200">
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Moderate-quality evidence from 1 or more RCTs</li>
                      <li>Meta-analyses of moderate-quality RCTs</li>
                    </ul>
                  </div>
                </div>

                {/* Level B-NR */}
                <div className="rounded-lg overflow-hidden border border-blue-400/30">
                  <div className="bg-[#5B9BD5] text-slate-900 px-3 py-1.5 font-bold flex justify-between items-center">
                    <span>LEVEL B-NR</span>
                    <span className="text-[11px] italic font-semibold">(Nonrandomized)</span>
                  </div>
                  <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/20 text-slate-800 dark:text-slate-200">
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Moderate-quality evidence from well-designed nonrandomized, observational, or registry studies</li>
                      <li>Meta-analyses of such studies</li>
                    </ul>
                  </div>
                </div>

                {/* Level C-LD */}
                <div className="rounded-lg overflow-hidden border border-blue-300/30">
                  <div className="bg-[#87CEEB] text-slate-900 px-3 py-1.5 font-bold flex justify-between items-center">
                    <span>LEVEL C-LD</span>
                    <span className="text-[11px] italic font-semibold">(Limited Data)</span>
                  </div>
                  <div className="p-2.5 bg-blue-50/50 dark:bg-blue-950/20 text-slate-800 dark:text-slate-200">
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Observational or registry studies with limitations of design/execution</li>
                      <li>Physiological or mechanistic studies in human subjects</li>
                    </ul>
                  </div>
                </div>

                {/* Level C-EO */}
                <div className="rounded-lg overflow-hidden border border-blue-200/30">
                  <div className="bg-[#B0E0E6] text-slate-900 px-3 py-1.5 font-bold flex justify-between items-center">
                    <span>LEVEL C-EO</span>
                    <span className="text-[11px] italic font-semibold">(Expert Opinion)</span>
                  </div>
                  <div className="p-2.5 bg-blue-50/30 dark:bg-blue-950/20 text-slate-800 dark:text-slate-200">
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li>Consensus of expert opinion based on clinical experience</li>
                    </ul>
                  </div>
                </div>

                {/* Footnote notes */}
                <div className="p-2.5 rounded bg-slate-100 dark:bg-slate-800 text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                  <p>
                    <strong>Principle of Independence:</strong> A recommendation outcome (Class) and evidence grade (Level) are determined independently (any COR can pair with any LOE). LOE C does not imply a weak recommendation!
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-end bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setShowMatrixModal(false)}
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
