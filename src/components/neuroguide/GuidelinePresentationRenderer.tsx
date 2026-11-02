"use client";

import React, { useState } from "react";
import { AhaGuidelineTable, type AhaGuidelineSection, type AhaRecommendationItem } from "./AhaGuidelineTable";
import { EsoGuidelineTable, type EsoPicoItem, type EsoEvidenceQuality, type EsoRecommendationStrength } from "./EsoGuidelineTable";
import { groupPracticeChangesIntoEsoPicos, parseEsoGrade } from "@/lib/neuroguide/esoPicoGrouper";
import { parseAhaCorAndLoe } from "@/lib/neuroguide/notebooklmParser";
import type { GuidelineDoc, PracticeChangeDetail } from "@/types/neuroguide";

export { groupPracticeChangesIntoEsoPicos, parseEsoGrade };

interface GuidelinePresentationRendererProps {
  doc: GuidelineDoc;
  darkMode?: boolean;
  allowEdit?: boolean;
  onEditChange?: (item: PracticeChangeDetail) => void;
}

/**
 * Extracts COR (e.g. "1", "2a", "2b", "3: No Benefit", "3: Harm") and LOE (e.g. "A", "B-R", "B-NR", "C-LD", "C-EO")
 * from standard strings like "Class 1, Level A", "COR 1LOE B-NR", "Class 3: Harm, Level C-EO"
 */
function parseAhaGrade(gradeStr: string, itemCor?: string, itemLoe?: string): { cor: string; loe: string } {
  if (itemCor && itemLoe) {
    const cleanCor = itemCor.replace(/^Class\s*/i, "").trim();
    const cleanLoe = itemLoe.replace(/^Level\s*/i, "").trim();
    return { cor: cleanCor, loe: cleanLoe };
  }
  const parsed = parseAhaCorAndLoe(gradeStr || "");
  return {
    cor: itemCor?.replace(/^Class\s*/i, "").trim() || parsed.cor,
    loe: itemLoe?.replace(/^Level\s*/i, "").trim() || parsed.loe,
  };
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
        const { cor, loe } = parseAhaGrade(item.currentGrade, item.cor, item.loe);
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
  // 2. PREPARE ESO PICO ITEMS (Synoptic Table structure)
  // ==========================================
  const esoPicoItems: EsoPicoItem[] = React.useMemo(() => {
    return groupPracticeChangesIntoEsoPicos(doc.allPracticeChanges || [], doc.title, doc.id);
  }, [doc.allPracticeChanges, doc.title, doc.id]);

  return (
    <div className="space-y-3">
      {/* View Switcher Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Format:
          </span>
          <span className={`px-2 py-0.5 rounded text-[10.5px] sm:text-[11px] font-bold ${
            isAha
              ? "bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30"
              : isEso
              ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30"
              : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          }`}>
            <span className="sm:hidden">{isAha ? "AHA Standard" : isEso ? "ESO GRADE Standard" : "Standard"}</span>
            <span className="hidden sm:inline">{isAha ? "AHA/ASA Official Standard (Figures 1 & 2)" : isEso ? "ESO Official GRADE Standard (Figure 3)" : "Standard Format"}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("society")}
            className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
              viewMode === "society"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            📋 <span className="sm:hidden">Standard ({isAha ? "AHA" : isEso ? "ESO" : "Table"})</span><span className="hidden sm:inline">Society Standard ({isAha ? "AHA" : isEso ? "ESO" : "Table"})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("card")}
            className={`px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
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
            onEditPico={(pico) => {
              const matchedChange = doc.allPracticeChanges.find(
                (c, idx) =>
                  c.id === `rec-${pico.picoNumber}` ||
                  c.id === `pico-${pico.picoNumber}` ||
                  c.topic.includes(`PICO ${pico.picoNumber}`) ||
                  idx === Number(pico.picoNumber) - 1
              );
              if (matchedChange && onEditChange) onEditChange(matchedChange);
            }}
          />
        ) : (
          /* Fallback for other societies: default to AHA-style structured table */
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
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">{change.currentText}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
