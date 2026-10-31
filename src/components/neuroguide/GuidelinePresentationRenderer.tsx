"use client";

import React, { useState } from "react";
import { AhaGuidelineTable, type AhaGuidelineSection, type AhaRecommendationItem } from "./AhaGuidelineTable";
import { EsoGuidelineTable, type EsoPicoItem, type EsoEvidenceQuality, type EsoRecommendationStrength } from "./EsoGuidelineTable";
import type { GuidelineDoc, PracticeChangeDetail } from "@/types/neuroguide";

interface GuidelinePresentationRendererProps {
  doc: GuidelineDoc;
  darkMode?: boolean;
  allowEdit?: boolean;
  onEditChange?: (item: PracticeChangeDetail) => void;
}

/**
 * Extracts COR (e.g. "1", "2a", "2b", "3: No Benefit", "3: Harm") and LOE (e.g. "A", "B-R", "B-NR", "C-LD", "C-EO")
 * from standard strings like "Class I, Level A", "Class 2a, Level B-NR", "Class 3: Harm, Level C-EO"
 */
function parseAhaGrade(gradeStr: string): { cor: string; loe: string } {
  let cor = "2a";
  let loe = "B-NR";

  if (!gradeStr) return { cor, loe };

  // Parse COR
  const corMatch = gradeStr.match(/Class\s+([I|V|X|1|2|3]+[a-b]?(\s*:\s*[A-Za-z\s]+)?)/i);
  if (corMatch && corMatch[1]) {
    cor = corMatch[1].trim();
    // Normalize Roman numerals to modern AHA standard numbers
    if (cor === "I") cor = "1";
    else if (cor === "IIa") cor = "2a";
    else if (cor === "IIb") cor = "2b";
    else if (cor === "III") cor = "3";
  }

  // Parse LOE
  const loeMatch = gradeStr.match(/Level\s+(of\s+Evidence\s+)?([A-C](-[A-Z]+)?)/i);
  if (loeMatch && loeMatch[2]) {
    loe = loeMatch[2].trim();
  }

  return { cor, loe };
}

/**
 * Parses ESO GRADE metadata from strings like:
 * "GRADE Strong for intervention (Evidence: High)"
 * "GRADE Weak for intervention (Evidence: Very Low, Voting: 8/8)"
 */
function parseEsoGrade(gradeStr: string): {
  strength: EsoRecommendationStrength;
  quality: EsoEvidenceQuality;
  voting?: string;
} {
  let strength: EsoRecommendationStrength = "Weak for intervention";
  let quality: EsoEvidenceQuality = "Moderate";
  let voting: string | undefined = undefined;

  if (!gradeStr) return { strength, quality, voting };

  const lower = gradeStr.toLowerCase();

  // Strength
  if (lower.includes("strong against")) strength = "Strong against intervention";
  else if (lower.includes("weak against") || lower.includes("suggest against")) strength = "Weak against intervention";
  else if (lower.includes("strong for") || lower.includes("recommend for")) strength = "Strong for intervention";
  else if (lower.includes("weak for") || lower.includes("suggest for")) strength = "Weak for intervention";

  // Quality
  if (lower.includes("very low")) quality = "Very low";
  else if (lower.includes("low") && !lower.includes("very low")) quality = "Low";
  else if (lower.includes("moderate")) quality = "Moderate";
  else if (lower.includes("high")) quality = "High";

  // Voting
  const voteMatch = gradeStr.match(/Voting:\s*([0-9]+\/[0-9]+|Unanimous)/i);
  if (voteMatch && voteMatch[1]) {
    voting = `Vote: ${voteMatch[1]}`;
  }

  return { strength, quality, voting };
}

export function GuidelinePresentationRenderer({
  doc,
  darkMode = false,
  allowEdit = false,
  onEditChange,
}: GuidelinePresentationRendererProps) {
  const [viewMode, setViewMode] = useState<"society" | "card">("society");

  const isAha = doc.society?.includes("AHA") || doc.society?.includes("ASA") || doc.society?.includes("ACC");
  const isEso = doc.society?.includes("ESO");

  // ==========================================
  // 1. PREPARE AHA SECTIONS (Hình 2 structure)
  // ==========================================
  const ahaSections: AhaGuidelineSection[] = React.useMemo(() => {
    if (!doc.allPracticeChanges) return [];

    const categories = Array.from(
      new Set(doc.allPracticeChanges.map((c) => c.category || "Recommendations"))
    );

    return categories.map((catName) => {
      const itemsInCat = doc.allPracticeChanges.filter(
        (c) => (c.category || "Recommendations") === catName
      );

      const recommendations: AhaRecommendationItem[] = itemsInCat.map((item) => {
        const { cor, loe } = parseAhaGrade(item.currentGrade);
        return {
          id: item.id,
          cor: cor,
          loe: loe,
          statement: item.currentText,
          drivingTrials: item.drivingTrials,
        };
      });

      return {
        sectionTitle: catName,
        recommendations,
      };
    });
  }, [doc.allPracticeChanges]);

  // ==========================================
  // 2. PREPARE ESO PICO ITEMS (Hình 3 structure)
  // ==========================================
  const esoPicoItems: EsoPicoItem[] = React.useMemo(() => {
    if (!doc.allPracticeChanges) return [];

    // Group changes by PICO if present, or group by Topic/Category
    return doc.allPracticeChanges.map((item, idx) => {
      const { strength, quality, voting } = parseEsoGrade(item.currentGrade);

      // Check if topic is formulated as a PICO question
      const isTopicPico = item.topic.toLowerCase().startsWith("pico");
      const picoNumber = isTopicPico
        ? item.topic.replace(/pico\s*([0-9]+).*/i, "$1") || `${idx + 1}`
        : `${idx + 1}`;

      const questionText = isTopicPico
        ? item.topic.replace(/pico\s*[0-9]+:?\s*/i, "")
        : item.topic;

      return {
        picoNumber,
        picoQuestion: questionText.endsWith("?") ? questionText : `${questionText}?`,
        recommendations: [
          {
            statement: item.currentText,
            qualityOfEvidence: quality,
            strengthOfRecommendation: strength,
          },
        ],
        expertConsensusStatement: item.previousText || (item.drivingTrials && item.drivingTrials.length > 0 ? `Driving Evidence: ${item.drivingTrials.join(", ")}` : undefined),
        voting: voting || "Vote: 10/10",
      };
    });
  }, [doc.allPracticeChanges]);

  return (
    <div className="space-y-3">
      {/* View Switcher Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Presentation Format:
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
            isAha
              ? "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30"
              : isEso
              ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30"
              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          }`}>
            {isAha ? "AHA/ASA Official Standard (Figures 1 & 2)" : isEso ? "ESO Official GRADE Standard (Figure 3)" : "Standard Format"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode("society")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === "society"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            📋 Society Matrix Table ({isAha ? "AHA" : isEso ? "ESO" : "Table"})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("card")}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === "card"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            🗂️ Summary Cards
          </button>
        </div>
      </div>

      {/* RENDER VIEW */}
      {viewMode === "society" ? (
        isAha ? (
          <AhaGuidelineTable
            title={`Recommendations: ${doc.title}`}
            sections={ahaSections}
            darkMode={darkMode}
            allowEdit={allowEdit}
            onEditRec={(rec) => {
              const matchedChange = doc.allPracticeChanges.find((c) => c.id === rec.id);
              if (matchedChange && onEditChange) onEditChange(matchedChange);
            }}
          />
        ) : isEso ? (
          <EsoGuidelineTable
            title={doc.title}
            picoItems={esoPicoItems}
            darkMode={darkMode}
            allowEdit={allowEdit}
          />
        ) : (
          /* Fallback for other societies: default to AHA-style structured table */
          <AhaGuidelineTable
            title={`Recommendations: ${doc.title}`}
            sections={ahaSections}
            darkMode={darkMode}
            allowEdit={allowEdit}
          />
        )
      ) : (
        /* Legacy / Compact Card View */
        <div className="space-y-2.5">
          {doc.allPracticeChanges.map((change) => (
            <div
              key={change.id}
              className={`p-3.5 rounded-xl border text-xs leading-relaxed transition-all ${
                darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-slate-900 dark:text-slate-100">{change.topic}</span>
                <span className="font-mono text-[10.5px] font-black px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {change.currentGrade}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300">{change.currentText}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
