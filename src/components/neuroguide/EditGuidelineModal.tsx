"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { GuidelineDoc, PracticeChangeDetail, SubspecialtyType } from "@/types/neuroguide";
import { NEUROLOGY_SUBSPECIALTIES } from "@/types/neuroguide";
import { ESO_GRADE_QUALITY_CONFIG } from "./EsoGuidelineTable";
import { normalizeEsoStrength } from "@/lib/neuroguide/esoPicoGrouper";

interface EditGuidelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  item: PracticeChangeDetail | null;
  guidelineDoc: GuidelineDoc | null;
  onSuccess: (updatedDoc?: GuidelineDoc) => void;
  darkMode: boolean;
}

export type GuidelineFormFormat = "AUTO" | "ESO" | "AHA" | "STANDARD";

export interface EsoRecDraft {
  id: string;
  statement: string; // Full Recommendation Statement
  strength: string; // Strength of Recommendation
  quality: string; // Quality of Evidence (High, Moderate, Low, Very low)
  expertConsensusStatement?: string;
  voting?: string;
  drivingTrials?: string[];
  changeType?: PracticeChangeDetail["changeType"];
}

export interface EsoPicoDraft {
  picoKey: string;
  picoNumber: string;
  picoQuestion: string;
  category: string;
  recommendations: EsoRecDraft[];
}

function parseAhaCor(gradeStr?: string): string {
  if (!gradeStr) return "1";
  const lower = gradeStr.toLowerCase();
  if (lower.includes("no benefit")) return "3: No Benefit";
  if (lower.includes("harm")) return "3: Harm";
  const m = gradeStr.match(/Class\s*([123a-bIVX]+)/i);
  if (m) {
    const c = m[1].toUpperCase();
    if (c === "I") return "1";
    if (c === "IIA") return "2a";
    if (c === "IIB") return "2b";
    if (c === "III") return "3: Harm";
    return m[1];
  }
  return "1";
}

function parseAhaLoe(gradeStr?: string): string {
  if (!gradeStr) return "A";
  const m = gradeStr.match(/Level\s*([A-C](-[A-Z]+)?)/i);
  if (m) return m[1].toUpperCase();
  return "A";
}

function parseEsoQuality(gradeStr?: string): string {
  if (!gradeStr) return "Moderate";
  const lower = gradeStr.toLowerCase();
  if (lower.includes("very low")) return "Very low";
  if (lower.includes("low")) return "Low";
  if (lower.includes("high")) return "High";
  return "Moderate";
}

/**
 * Converts a flat array of PracticeChangeDetail into structured ESO PICO draft groups.
 * Multiple recommendations belonging to the same PICO question are grouped together.
 */
function changesToEsoPicos(changes: PracticeChangeDetail[]): EsoPicoDraft[] {
  if (!changes || changes.length === 0) return [];
  const pMap = new Map<string, EsoPicoDraft>();
  let fallbackCounter = 1;

  changes.forEach((item) => {
    let pNum = "";
    let pQuestion = "";

    const rawTopic = (item.topic || "").trim();
    const rawCat = (item.category || "").trim();

    if (item.picoNumber) {
      pNum = String(item.picoNumber);
      pQuestion = item.picoQuestion || rawTopic;
    } else {
      const matchTopic = rawTopic.match(/^PICO\s*(\d+)[:.\s-]*(.*)/i);
      const matchCat = rawCat.match(/^PICO\s*(\d+)[:.\s-]*(.*)/i);
      if (matchTopic) {
        pNum = matchTopic[1];
        pQuestion = matchTopic[2]?.trim() || rawTopic;
      } else if (matchCat) {
        pNum = matchCat[1];
        pQuestion = matchCat[2]?.trim() || rawTopic;
      } else {
        pNum = String(fallbackCounter++);
        pQuestion = rawTopic || rawCat || `PICO ${pNum}`;
      }
    }

    pQuestion = pQuestion.replace(/^PICO\s*\d+[:.\s-]*/i, "").trim();
    if (!pQuestion) {
      pQuestion = rawTopic.replace(/^PICO\s*\d+[:.\s-]*/i, "").trim() || rawCat;
    }

    const picoKey = `PICO-${pNum}`;
    const strength = normalizeEsoStrength(item.strength || item.currentGrade, item.currentText);
    const quality = item.quality || parseEsoQuality(item.currentGrade);
    const consensus =
      item.expertConsensusStatement ||
      (item.previousText && !item.previousText.startsWith("Driving Evidence:") ? item.previousText : "");
    const voting = item.voting || (consensus ? "Vote: 10/10" : "");

    if (!pMap.has(picoKey)) {
      pMap.set(picoKey, {
        picoKey,
        picoNumber: String(pNum),
        picoQuestion: pQuestion || `Clinical Question for PICO ${pNum}`,
        category: item.category || "Recommendations",
        recommendations: [],
      });
    }

    const targetPico = pMap.get(picoKey)!;
    targetPico.recommendations.push({
      id: item.id || `rec-${pNum}-${targetPico.recommendations.length + 1}`,
      statement: item.currentText || "",
      strength,
      quality,
      expertConsensusStatement: consensus,
      voting,
      drivingTrials: item.drivingTrials || [],
      changeType: item.changeType || "STANDARD",
    });
  });

  return Array.from(pMap.values());
}

/**
 * Converts structured ESO PICO draft groups back into PracticeChangeDetail array for persistence.
 */
function esoPicosToChanges(picos: EsoPicoDraft[]): PracticeChangeDetail[] {
  const changes: PracticeChangeDetail[] = [];
  picos.forEach((pico) => {
    pico.recommendations.forEach((rec, rIdx) => {
      const computedGrade = `GRADE ${rec.strength} (Evidence: ${rec.quality}${rec.voting ? `, Voting: ${rec.voting}` : ""})`;
      changes.push({
        id: rec.id || `rec-${pico.picoNumber}-${rIdx + 1}`,
        category: pico.category || "Recommendations",
        topic: `PICO ${pico.picoNumber}: ${pico.picoQuestion}`,
        picoNumber: pico.picoNumber,
        picoQuestion: pico.picoQuestion,
        currentGrade: computedGrade,
        currentText: rec.statement,
        strength: rec.strength,
        quality: rec.quality,
        expertConsensusStatement: rec.expertConsensusStatement?.trim() || undefined,
        voting: rec.voting?.trim() || undefined,
        drivingTrials: rec.drivingTrials || [],
        changeType: rec.changeType || "STANDARD",
        previousText: rec.expertConsensusStatement?.trim() || undefined,
      });
    });
  });
  return changes;
}

export function EditGuidelineModal({
  isOpen,
  onClose,
  docId,
  item,
  guidelineDoc,
  onSuccess,
  darkMode,
}: EditGuidelineModalProps) {
  // Active Tab: metadata | takeaways | recommendations
  const [activeTab, setActiveTab] = useState<"metadata" | "takeaways" | "recommendations">(
    item ? "recommendations" : "metadata"
  );

  // Guideline Metadata State
  const [docTitle, setDocTitle] = useState("");
  const [docSociety, setDocSociety] = useState("");
  const [docYear, setDocYear] = useState("");
  const [docSubspecialty, setDocSubspecialty] = useState<SubspecialtyType>("Stroke");
  const [docSummary, setDocSummary] = useState("");
  const [docOfficialUrl, setDocOfficialUrl] = useState("");

  // Top Takeaways State
  const [takeaways, setTakeaways] = useState<string[]>([]);
  const [newTakeawayText, setNewTakeawayText] = useState("");

  // Form Format mode (Manual override or Auto-detect)
  const [formFormat, setFormFormat] = useState<GuidelineFormFormat>("AUTO");

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // ESO PICO State (Multiple recommendations per PICO)
  const [esoPicos, setEsoPicos] = useState<EsoPicoDraft[]>([]);
  const [selectedPicoIndex, setSelectedPicoIndex] = useState<number>(0);

  // Standard / AHA State (Flat recommendations)
  const [practiceChanges, setPracticeChanges] = useState<PracticeChangeDetail[]>([]);
  const [selectedRecIndex, setSelectedRecIndex] = useState<number>(0);
  const [recCategory, setRecCategory] = useState("");
  const [recTopic, setRecTopic] = useState("");
  const [recStatement, setRecStatement] = useState("");
  const [recTrialsStr, setRecTrialsStr] = useState("");
  const [recChangeType, setRecChangeType] = useState<PracticeChangeDetail["changeType"]>("STANDARD");
  const [recPrevGrade, setRecPrevGrade] = useState("");
  const [recPrevText, setRecPrevText] = useState("");
  const [ahaCor, setAhaCor] = useState<string>("1");
  const [ahaLoe, setAhaLoe] = useState<string>("A");
  const [generalGrade, setGeneralGrade] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Determine Form Type based on society, title, item content
  const currentSociety = (docSociety || guidelineDoc?.society || "").toUpperCase();
  const currentTitle = (docTitle || guidelineDoc?.title || "").toLowerCase();

  const isDetectedEso = useMemo(() => {
    if (currentSociety.includes("ESO") || currentSociety.includes("EUROPEAN STROKE")) return true;
    if (
      currentTitle.includes("eso") ||
      currentTitle.includes("european stroke") ||
      currentTitle.includes("blood pressure management in acute")
    ) {
      return true;
    }
    if (docId?.toLowerCase().includes("eso")) return true;
    if (item?.quality || item?.strength || item?.picoNumber || item?.voting) return true;
    if (item?.currentGrade?.toLowerCase().includes("grade") || item?.topic?.toLowerCase().includes("pico")) return true;
    if (
      practiceChanges.some(
        (p) =>
          p.currentGrade?.toLowerCase().includes("grade") ||
          p.quality ||
          p.strength ||
          p.topic?.toLowerCase().includes("pico")
      )
    ) {
      return true;
    }
    return false;
  }, [currentSociety, currentTitle, docId, item, practiceChanges]);

  const isDetectedAha = useMemo(() => {
    if (currentSociety.includes("AHA") || currentSociety.includes("ASA") || currentSociety.includes("ACC")) return true;
    if (currentTitle.includes("aha") || currentTitle.includes("american heart") || currentTitle.includes("stroke association")) return true;
    if (item?.currentGrade?.toLowerCase().includes("class ") || item?.currentGrade?.toLowerCase().includes("level ")) return true;
    return false;
  }, [currentSociety, currentTitle, item]);

  const isEso = formFormat === "ESO" || (formFormat === "AUTO" && isDetectedEso);
  const isAha = formFormat === "AHA" || (formFormat === "AUTO" && !isDetectedEso && isDetectedAha);

  // Sync state when modal opens or props change
  useEffect(() => {
    if (!isOpen) return;

    if (guidelineDoc) {
      setDocTitle(guidelineDoc.title || "");
      setDocSociety(guidelineDoc.society || "AHA/ASA");
      setDocYear(String(guidelineDoc.year || new Date().getFullYear()));
      setDocSubspecialty(guidelineDoc.subspecialty || "Stroke");
      setDocSummary(guidelineDoc.executiveSummary || guidelineDoc.executiveSummaryVi || "");
      setDocOfficialUrl(guidelineDoc.officialUrl || "");
      setTakeaways(guidelineDoc.topTakeaways || []);

      const list = guidelineDoc.allPracticeChanges || [];
      setPracticeChanges(list);

      // Initialize ESO PICOs
      const picos = changesToEsoPicos(list);
      setEsoPicos(picos);

      if (item) {
        // Find in ESO picos
        const pNumStr = String(item.picoNumber || "").trim();
        const foundPicoIdx = picos.findIndex(
          (p) =>
            (pNumStr && p.picoNumber === pNumStr) ||
            p.recommendations.some((r) => r.id === item.id || r.statement === item.currentText)
        );
        setSelectedPicoIndex(foundPicoIdx >= 0 ? foundPicoIdx : 0);

        // Find in Standard list
        const foundRecIdx = list.findIndex((r) => r.id === item.id);
        const idx = foundRecIdx >= 0 ? foundRecIdx : 0;
        setSelectedRecIndex(idx);
        loadStandardRecIntoForm(list[idx] || item);
        setActiveTab("recommendations");
      } else {
        setSelectedPicoIndex(0);
        setSelectedRecIndex(0);
        if (list.length > 0) {
          loadStandardRecIntoForm(list[0]);
        }
        setActiveTab("metadata");
      }
    } else if (item) {
      const isItemEso =
        item.currentGrade?.toLowerCase().includes("grade") ||
        item.topic?.toLowerCase().includes("pico") ||
        item.quality ||
        item.strength ||
        docId?.toLowerCase().includes("eso");

      if (isItemEso) {
        setDocSociety("ESO");
        setDocTitle("ESO Clinical Practice Guideline");
      }
      setPracticeChanges([item]);
      const picos = changesToEsoPicos([item]);
      setEsoPicos(picos);
      setSelectedPicoIndex(0);
      setSelectedRecIndex(0);
      loadStandardRecIntoForm(item);
      setActiveTab("recommendations");
    }

    setErrorMessage(null);
  }, [isOpen, guidelineDoc, item]);

  // Load a standard / AHA recommendation into flat form fields
  const loadStandardRecIntoForm = (rec: PracticeChangeDetail) => {
    if (!rec) return;
    setRecCategory(rec.category || "Recommendations");
    setRecTopic(rec.topic || "");
    setRecStatement(rec.currentText || "");
    setRecTrialsStr(rec.drivingTrials?.join(", ") || "");
    setRecChangeType(rec.changeType || "STANDARD");
    setRecPrevGrade(rec.previousGrade || "");
    setRecPrevText(rec.previousText || "");

    setAhaCor(parseAhaCor(rec.currentGrade));
    setAhaLoe(parseAhaLoe(rec.currentGrade));
    setGeneralGrade(rec.currentGrade || "Level A");
  };

  const syncStandardRecToMemory = () => {
    if (practiceChanges.length === 0 || selectedRecIndex < 0 || selectedRecIndex >= practiceChanges.length) {
      return;
    }

    let computedGrade = generalGrade;
    if (isAha) {
      computedGrade = `Class ${ahaCor}, Level ${ahaLoe}`;
    }

    const trials = recTrialsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updated: PracticeChangeDetail = {
      ...practiceChanges[selectedRecIndex],
      category: recCategory || "Recommendations",
      topic: recTopic || `Recommendation ${selectedRecIndex + 1}`,
      currentGrade: computedGrade,
      currentText: recStatement,
      drivingTrials: trials,
      changeType: recChangeType,
      previousGrade: recPrevGrade || undefined,
      previousText: recPrevText || undefined,
    };

    const nextList = [...practiceChanges];
    nextList[selectedRecIndex] = updated;
    setPracticeChanges(nextList);
  };

  // --- ESO PICO Handlers ---
  const updateCurrentPicoMeta = (patch: Partial<EsoPicoDraft>) => {
    setEsoPicos((prev) => {
      const next = [...prev];
      if (!next[selectedPicoIndex]) return prev;
      next[selectedPicoIndex] = { ...next[selectedPicoIndex], ...patch };
      return next;
    });
  };

  const updateEsoRec = (recIdx: number, patch: Partial<EsoRecDraft>) => {
    setEsoPicos((prev) => {
      const next = [...prev];
      const curPico = next[selectedPicoIndex];
      if (!curPico) return prev;
      const nextRecs = [...curPico.recommendations];
      if (!nextRecs[recIdx]) return prev;
      nextRecs[recIdx] = { ...nextRecs[recIdx], ...patch };
      next[selectedPicoIndex] = { ...curPico, recommendations: nextRecs };
      return next;
    });
  };

  const handleAddRecToCurrentPico = () => {
    setEsoPicos((prev) => {
      const next = [...prev];
      const curPico = next[selectedPicoIndex];
      if (!curPico) return prev;
      const newRec: EsoRecDraft = {
        id: `rec-${curPico.picoNumber}-${Date.now().toString().slice(-4)}`,
        statement: "",
        strength: "Weak for intervention",
        quality: "Low",
        expertConsensusStatement: "",
        voting: "Vote: 10/10",
        drivingTrials: [],
        changeType: "NEW",
      };
      next[selectedPicoIndex] = {
        ...curPico,
        recommendations: [...curPico.recommendations, newRec],
      };
      return next;
    });
  };

  const handleRemoveRecFromCurrentPico = (recIdx: number) => {
    if (!window.confirm("Are you sure you want to remove this recommendation from this PICO?")) return;
    setEsoPicos((prev) => {
      const next = [...prev];
      const curPico = next[selectedPicoIndex];
      if (!curPico || curPico.recommendations.length <= 1) return prev;
      const nextRecs = curPico.recommendations.filter((_, idx) => idx !== recIdx);
      next[selectedPicoIndex] = { ...curPico, recommendations: nextRecs };
      return next;
    });
  };

  const handleAddNewPico = () => {
    const nextNum = `${esoPicos.length + 1}`;
    const newPico: EsoPicoDraft = {
      picoKey: `PICO-${nextNum}`,
      picoNumber: nextNum,
      picoQuestion: `In hospitalised patients with acute stroke, does intervention improve outcome?`,
      category: "Clinical Recommendations",
      recommendations: [
        {
          id: `rec-${nextNum}-1`,
          statement: "",
          strength: "Weak for intervention",
          quality: "Moderate",
          expertConsensusStatement: "",
          voting: "Vote: 10/10",
          drivingTrials: [],
          changeType: "NEW",
        },
      ],
    };
    setEsoPicos((prev) => [...prev, newPico]);
    setSelectedPicoIndex(esoPicos.length);
  };

  const handleDeletePico = (pIdx: number) => {
    if (!window.confirm("Are you sure you want to delete this PICO question and all its recommendations?")) return;
    setEsoPicos((prev) => {
      const next = prev.filter((_, idx) => idx !== pIdx);
      return next;
    });
    setSelectedPicoIndex((prev) => Math.max(0, prev - 1));
  };

  // --- Standard / AHA Recommendation Handlers ---
  const handleSelectStandardRec = (newIndex: number) => {
    syncStandardRecToMemory();
    setSelectedRecIndex(newIndex);
    if (practiceChanges[newIndex]) {
      loadStandardRecIntoForm(practiceChanges[newIndex]);
    }
  };

  const handleAddNewStandardRec = () => {
    syncStandardRecToMemory();
    const newId = `rec-${Date.now().toString().slice(-5)}`;
    const newRec: PracticeChangeDetail = {
      id: newId,
      category: "Recommendations",
      topic: `Recommendation #${practiceChanges.length + 1}`,
      currentGrade: "Class 1, Level A",
      currentText: "",
      changeType: "NEW",
      drivingTrials: [],
    };
    const nextList = [...practiceChanges, newRec];
    setPracticeChanges(nextList);
    setSelectedRecIndex(nextList.length - 1);
    loadStandardRecIntoForm(newRec);
  };

  const handleDeleteStandardRec = (indexToDelete: number) => {
    if (!window.confirm("Are you sure you want to delete this recommendation from the guideline?")) return;
    const nextList = practiceChanges.filter((_, idx) => idx !== indexToDelete);
    setPracticeChanges(nextList);
    const newIdx = Math.max(0, indexToDelete - 1);
    setSelectedRecIndex(newIdx);
    if (nextList.length > 0 && nextList[newIdx]) {
      loadStandardRecIntoForm(nextList[newIdx]);
    }
  };

  // --- Takeaways Handlers ---
  const handleAddTakeaway = () => {
    if (!newTakeawayText.trim()) return;
    setTakeaways([...takeaways, newTakeawayText.trim()]);
    setNewTakeawayText("");
  };

  const handleRemoveTakeaway = (idxToRemove: number) => {
    setTakeaways(takeaways.filter((_, idx) => idx !== idxToRemove));
  };

  const handleTakeawayChange = (idx: number, text: string) => {
    const updated = [...takeaways];
    updated[idx] = text;
    setTakeaways(updated);
  };

  // --- Delete Guideline Entirely ---
  const handleDeleteFromModal = async () => {
    const title = docTitle || guidelineDoc?.title || docId;
    const confirmDel = window.confirm(
      `Are you sure you want to permanently DELETE guideline:\n\n"${title}"?\n\nThis will remove the guideline from all clinical repositories.`
    );
    if (!confirmDel) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/neuroguide/delete-guideline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideline_id: docId, title }),
      });
      const data = await res.json();
      if (data.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(data.error || "Failed to delete guideline.");
      }
    } catch {
      setErrorMessage("Network error while deleting guideline.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Save All Changes ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    let finalizedChanges: PracticeChangeDetail[] = [];
    if (isEso) {
      finalizedChanges = esoPicosToChanges(esoPicos);
    } else {
      syncStandardRecToMemory();
      finalizedChanges = [...practiceChanges];
    }

    try {
      const payload = {
        action: "EDIT_GUIDELINE",
        doc_id: docId || guidelineDoc?.id,
        title: docTitle,
        society: docSociety,
        year: parseInt(docYear, 10) || new Date().getFullYear(),
        subspecialty: docSubspecialty,
        executiveSummary: docSummary,
        officialUrl: docOfficialUrl,
        topTakeaways: takeaways,
        allPracticeChanges: finalizedChanges,
      };

      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        onSuccess(data.guideline);
        onClose();
      } else {
        setErrorMessage(data.error || "Failed to save guideline updates.");
      }
    } catch {
      setErrorMessage("Network error while saving guideline changes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered ESO PICOs
  const filteredEsoPicos = useMemo(() => {
    if (!searchTerm.trim()) return esoPicos;
    const term = searchTerm.toLowerCase();
    return esoPicos.filter(
      (p) =>
        p.picoNumber.toLowerCase().includes(term) ||
        p.picoQuestion.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.recommendations.some(
          (r) =>
            r.statement.toLowerCase().includes(term) ||
            r.strength.toLowerCase().includes(term) ||
            (r.expertConsensusStatement && r.expertConsensusStatement.toLowerCase().includes(term))
        )
    );
  }, [esoPicos, searchTerm]);

  // Filtered Standard Recommendations
  const filteredStandardRecs = useMemo(() => {
    if (!searchTerm.trim()) return practiceChanges;
    const term = searchTerm.toLowerCase();
    return practiceChanges.filter(
      (r) =>
        r.topic.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        r.currentText.toLowerCase().includes(term) ||
        r.currentGrade.toLowerCase().includes(term)
    );
  }, [practiceChanges, searchTerm]);

  if (!isOpen) return null;

  const currentPico = esoPicos[selectedPicoIndex];
  const totalEsoRecommendationsCount = esoPicos.reduce((acc, p) => acc + p.recommendations.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div
        className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* HEADER */}
        <div className="px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl flex-shrink-0">✏️</span>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate">
                Edit Guideline: {docTitle || guidelineDoc?.title || "Clinical Practice Guideline"}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isEso
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                      : isAha
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {isEso ? "🔵 ESO GRADE (PICO) Format" : isAha ? "🔴 AHA/ASA (COR & LOE) Format" : `🟢 Standard Format (${docSociety || "Standard"})`}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {isEso ? `${esoPicos.length} PICOs (${totalEsoRecommendationsCount} recommendations)` : `${practiceChanges.length} recommendations`} • {takeaways.length} key takeaways
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Form Format Selector */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setFormFormat("AUTO")}
                className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  formFormat === "AUTO"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
                title="Automatically detect format from document title or society"
              >
                Auto ({isDetectedEso ? "ESO" : isDetectedAha ? "AHA" : "Standard"})
              </button>
              <button
                type="button"
                onClick={() => setFormFormat("ESO")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  formFormat === "ESO"
                    ? "bg-blue-600 text-white shadow-2xs font-extrabold"
                    : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                }`}
                title="Use ESO GRADE PICO format"
              >
                ESO Format
              </button>
              <button
                type="button"
                onClick={() => setFormFormat("AHA")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  formFormat === "AHA"
                    ? "bg-rose-600 text-white shadow-2xs font-extrabold"
                    : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
                title="Use ACC/AHA COR & LOE format"
              >
                AHA Format
              </button>
              <button
                type="button"
                onClick={() => setFormFormat("STANDARD")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  formFormat === "STANDARD"
                    ? "bg-slate-700 text-white shadow-2xs font-extrabold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
                title="Use standard general recommendation format"
              >
                Standard
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold cursor-pointer p-1"
              title="Close window"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="px-5 pt-3 border-b dark:border-slate-800 flex items-center gap-2 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/30">
          <button
            type="button"
            onClick={() => {
              if (!isEso) syncStandardRecToMemory();
              setActiveTab("metadata");
            }}
            className={`px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "metadata"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>📋</span>
            <span>1. General Information &amp; Scope</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isEso) syncStandardRecToMemory();
              setActiveTab("takeaways");
            }}
            className={`px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "takeaways"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>🌟</span>
            <span>2. Key Takeaways ({takeaways.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("recommendations");
            }}
            className={`px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "recommendations"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>⚖️</span>
            <span>
              3. {isEso ? `PICO Questions & Recommendations (${esoPicos.length})` : `Recommendations (${practiceChanges.length})`}
            </span>
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden text-xs">
          <div className="flex-1 overflow-y-auto p-5">
            {/* TAB 1: METADATA */}
            {activeTab === "metadata" && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    Guideline Title:
                  </label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="e.g. 2025 ESO guideline on blood pressure management in acute ischaemic stroke and intracerebral haemorrhage"
                    className={`w-full p-2.5 rounded-xl border font-medium ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Medical Society:
                    </label>
                    <input
                      type="text"
                      required
                      value={docSociety}
                      onChange={(e) => setDocSociety(e.target.value)}
                      placeholder="e.g. ESO, AHA/ASA, AAN..."
                      className={`w-full p-2.5 rounded-xl border font-medium ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Publication Year:
                    </label>
                    <input
                      type="number"
                      required
                      value={docYear}
                      onChange={(e) => setDocYear(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border font-medium ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Subspecialty:
                    </label>
                    <select
                      value={docSubspecialty}
                      onChange={(e) => setDocSubspecialty(e.target.value as SubspecialtyType)}
                      className={`w-full p-2.5 rounded-xl border font-bold ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {NEUROLOGY_SUBSPECIALTIES.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    Executive Summary &amp; Clinical Scope:
                  </label>
                  <textarea
                    rows={4}
                    value={docSummary}
                    onChange={(e) => setDocSummary(e.target.value)}
                    placeholder="Describe clinical scope, target patient populations, and overall objectives..."
                    className={`w-full p-2.5 rounded-xl border font-medium leading-relaxed ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    Official URL / Source:
                  </label>
                  <input
                    type="text"
                    value={docOfficialUrl}
                    onChange={(e) => setDocOfficialUrl(e.target.value)}
                    placeholder="https://journals.sagepub.com/doi/... or https://pubmed.ncbi.nlm.nih.gov/..."
                    className={`w-full p-2.5 rounded-xl border font-medium font-mono text-[11px] ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* TAB 2: TAKEAWAYS */}
            {activeTab === "takeaways" && (
              <div className="space-y-4 max-w-3xl">
                <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-200">
                      🌟 Top Take-Home Messages
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Core clinical takeaways that clinicians must master from this guideline.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                    {takeaways.length} items
                  </span>
                </div>

                <div className="space-y-2.5">
                  {takeaways.map((takeaway, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    >
                      <span className="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[11px] mt-1">
                        {idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        value={takeaway}
                        onChange={(e) => handleTakeawayChange(idx, e.target.value)}
                        className={`flex-1 p-2 rounded-lg border font-medium leading-relaxed ${
                          darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTakeaway(idx)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                        title="Remove this takeaway"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {takeaways.length === 0 && (
                    <p className="text-slate-400 italic text-center py-6">
                      No key takeaways added yet. Add your first takeaway below.
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={newTakeawayText}
                    onChange={(e) => setNewTakeawayText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTakeaway();
                      }
                    }}
                    placeholder="Enter new key takeaway message..."
                    className={`flex-1 p-2.5 rounded-xl border font-medium ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddTakeaway}
                    className="px-4 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    ➕ Add Takeaway
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: RECOMMENDATIONS MANAGER */}
            {activeTab === "recommendations" && (
              isEso ? (
                /* ==============================================================
                   ESO PICO MANAGER: 1 PICO with multiple recommendations inside
                   ============================================================== */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-[500px]">
                  {/* LEFT COLUMN: LIST OF PICOS */}
                  <div className="md:col-span-4 flex flex-col border rounded-xl overflow-hidden dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="p-2.5 border-b dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        PICO Questions ({esoPicos.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddNewPico}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Add a new PICO Question"
                      >
                        <span>➕ Add PICO</span>
                      </button>
                    </div>

                    <div className="p-2 border-b dark:border-slate-800">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="🔍 Search PICO questions or statements..."
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                          darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                        }`}
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 max-h-[520px]">
                      {filteredEsoPicos.map((pico) => {
                        const realIndex = esoPicos.findIndex((p) => p.picoKey === pico.picoKey);
                        const isSelected = realIndex === selectedPicoIndex;

                        return (
                          <div
                            key={pico.picoKey}
                            onClick={() => setSelectedPicoIndex(realIndex)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "bg-blue-500/10 border-blue-500/50 shadow-2xs dark:bg-blue-500/15"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-extrabold text-[11px] text-blue-700 dark:text-blue-400">
                                PICO {pico.picoNumber}
                              </span>
                              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                                {pico.recommendations.length} rec{pico.recommendations.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                              {pico.picoQuestion || `(PICO ${pico.picoNumber})`}
                            </p>
                            {pico.recommendations[0]?.statement && (
                              <p className="text-slate-500 dark:text-slate-400 text-[10.5px] line-clamp-1 mt-1 italic">
                                1. {pico.recommendations[0].statement}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {esoPicos.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                          No PICO questions yet. Click <b>➕ Add PICO</b> to create.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: PICO DETAILS & MULTIPLE RECOMMENDATIONS */}
                  <div className="md:col-span-8 flex flex-col border rounded-xl p-4 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto max-h-[580px]">
                    {currentPico ? (
                      <div className="space-y-4">
                        {/* PICO HEADER BAR */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-black text-xs">
                              PICO {currentPico.picoNumber}
                            </span>
                            <span className="font-extrabold uppercase text-xs text-blue-600 dark:text-blue-400">
                              ESO GRADE Recommendation Structure
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeletePico(selectedPicoIndex)}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-300 dark:border-rose-800 cursor-pointer transition-colors"
                            title="Delete this entire PICO question"
                          >
                            🗑️ Delete PICO
                          </button>
                        </div>

                        {/* PICO QUESTION & CATEGORY */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Section / Topic:
                            </label>
                            <input
                              type="text"
                              required
                              value={currentPico.category}
                              onChange={(e) => updateCurrentPicoMeta({ category: e.target.value })}
                              placeholder="e.g. Blood Pressure Management"
                              className={`w-full p-2 rounded-xl border font-medium ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              PICO Clinical Question / Population:
                            </label>
                            <input
                              type="text"
                              required
                              value={currentPico.picoQuestion}
                              onChange={(e) => updateCurrentPicoMeta({ picoQuestion: e.target.value })}
                              placeholder="e.g. In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis..."
                              className={`w-full p-2 rounded-xl border font-medium ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>
                        </div>

                        {/* RECOMMENDATIONS SECTION HEADER */}
                        <div className="pt-2 flex items-center justify-between border-t dark:border-slate-800">
                          <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800 dark:text-slate-200">
                            <span>⚖️</span>
                            <span>Recommendations for this PICO ({currentPico.recommendations.length})</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddRecToCurrentPico}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                            title="Add another recommendation under this PICO question"
                          >
                            <span>➕ Add Recommendation</span>
                          </button>
                        </div>

                        {/* REPEATABLE RECOMMENDATIONS LIST */}
                        <div className="space-y-4">
                          {currentPico.recommendations.map((rec, rIdx) => {
                            const qualityConfig = ESO_GRADE_QUALITY_CONFIG[rec.quality] || ESO_GRADE_QUALITY_CONFIG["Moderate"];

                            return (
                              <div
                                key={rec.id || `rec-${rIdx}`}
                                className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3"
                              >
                                {/* REC HEADER */}
                                <div className="flex items-center justify-between gap-2 pb-2 border-b border-blue-200/60 dark:border-blue-900/40">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-[10px]">
                                      {rIdx + 1}
                                    </span>
                                    <span className="font-extrabold text-blue-900 dark:text-blue-200 text-xs">
                                      Recommendation #{rIdx + 1}
                                    </span>
                                  </div>

                                  {currentPico.recommendations.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRecFromCurrentPico(rIdx)}
                                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
                                      title="Remove this recommendation"
                                    >
                                      🗑️ Remove Recommendation
                                    </button>
                                  )}
                                </div>

                                {/* 1. FULL RECOMMENDATION STATEMENT (PLACED FIRST!) */}
                                <div>
                                  <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200 text-xs">
                                    Full Recommendation Statement:
                                  </label>
                                  <textarea
                                    rows={3}
                                    required
                                    value={rec.statement}
                                    onChange={(e) => updateEsoRec(rIdx, { statement: e.target.value })}
                                    placeholder="e.g. In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis, we suggest maintaining blood pressure below 185/110 mmHg..."
                                    className={`w-full p-2.5 rounded-xl border font-medium text-xs leading-relaxed ${
                                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                    }`}
                                  />
                                </div>

                                {/* 2. STRENGTH OF RECOMMENDATION & QUALITY OF EVIDENCE */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                      Strength of Recommendation:
                                    </label>
                                    <select
                                      value={rec.strength}
                                      onChange={(e) => updateEsoRec(rIdx, { strength: e.target.value })}
                                      className={`w-full p-2 rounded-xl border font-extrabold text-xs ${
                                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                      }`}
                                    >
                                      <option value="Strong for intervention">Strong for intervention (↑↑)</option>
                                      <option value="Weak for intervention">Weak for intervention (↑)</option>
                                      <option value="Weak against intervention">Weak against intervention (↓)</option>
                                      <option value="Strong against intervention">Strong against intervention (↓↓)</option>
                                      <option value="Uncertain / Ongoing trials">Uncertain / Ongoing trials (—)</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                      Quality of Evidence (GRADE):
                                    </label>
                                    <select
                                      value={rec.quality}
                                      onChange={(e) => updateEsoRec(rIdx, { quality: e.target.value })}
                                      className={`w-full p-2 rounded-xl border font-extrabold text-xs ${
                                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                      }`}
                                    >
                                      <option value="High">High (⊕⊕⊕⊕)</option>
                                      <option value="Moderate">Moderate (⊕⊕⊕)</option>
                                      <option value="Low">Low (⊕⊕)</option>
                                      <option value="Very low">Very low (⊕)</option>
                                    </select>

                                    {/* DISTINCT COLOR PREVIEW BADGE */}
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                        Evidence Level:
                                      </span>
                                      <span
                                        style={{
                                          color: qualityConfig?.hex || "#0284c7",
                                          backgroundColor: qualityConfig?.bgLight || "rgba(2, 132, 199, 0.1)",
                                          borderColor: qualityConfig?.borderLight || "rgba(2, 132, 199, 0.3)",
                                        }}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-black border"
                                      >
                                        <span>{qualityConfig?.label || rec.quality}</span>
                                        <span className="font-mono tracking-tight text-xs">
                                          {qualityConfig?.symbols || "⊕⊕⊕"}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* 3. EXPERT CONSENSUS STATEMENT (PLACED AFTER RECOMMENDATION STATEMENT) */}
                                <div>
                                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                    Expert Consensus Statement:
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={rec.expertConsensusStatement || ""}
                                    onChange={(e) => updateEsoRec(rIdx, { expertConsensusStatement: e.target.value })}
                                    placeholder="Enter clinical consensus statement from the expert panel (if applicable)..."
                                    className={`w-full p-2 rounded-xl border font-medium text-xs leading-relaxed ${
                                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                    }`}
                                  />
                                </div>

                                {/* 4. CONSENSUS VOTING & DRIVING TRIALS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                      Consensus Voting Ratio:
                                    </label>
                                    <input
                                      type="text"
                                      value={rec.voting || ""}
                                      onChange={(e) => updateEsoRec(rIdx, { voting: e.target.value })}
                                      placeholder="e.g. Vote: 10/10 or Unanimous"
                                      className={`w-full p-1.5 rounded-lg border font-medium text-xs ${
                                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                      }`}
                                    />
                                  </div>

                                  <div>
                                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                      Driving Clinical Trials (comma-separated):
                                    </label>
                                    <input
                                      type="text"
                                      value={rec.drivingTrials?.join(", ") || ""}
                                      onChange={(e) =>
                                        updateEsoRec(rIdx, {
                                          drivingTrials: e.target.value
                                            .split(",")
                                            .map((t) => t.trim())
                                            .filter(Boolean),
                                        })
                                      }
                                      placeholder="e.g. ENCHANTED, OPTIMAL-BP, BP-TARGET"
                                      className={`w-full p-1.5 rounded-lg border font-mono text-[11px] ${
                                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                      }`}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
                        <span className="text-3xl mb-2">📋</span>
                        <p>Select a PICO question from the left or click Add PICO.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ==============================================================
                   STANDARD / AHA RECOMMENDATIONS MANAGER
                   ============================================================== */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-[480px]">
                  {/* LEFT COLUMN: LIST OF RECOMMENDATIONS */}
                  <div className="md:col-span-5 flex flex-col border rounded-xl overflow-hidden dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="p-2.5 border-b dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        Recommendations List ({practiceChanges.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddNewStandardRec}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Add new recommendation"
                      >
                        <span>➕ Add New</span>
                      </button>
                    </div>

                    <div className="p-2 border-b dark:border-slate-800">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="🔍 Search recommendations..."
                        className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                          darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                        }`}
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 max-h-[400px]">
                      {filteredStandardRecs.map((rec) => {
                        const realIndex = practiceChanges.findIndex((r) => r.id === rec.id);
                        const isSelected = realIndex === selectedRecIndex;

                        return (
                          <div
                            key={rec.id}
                            onClick={() => handleSelectStandardRec(realIndex)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "bg-amber-500/10 border-amber-500/50 shadow-2xs dark:bg-amber-500/15"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-extrabold text-[10.5px] text-slate-500 dark:text-slate-400">
                                #{realIndex + 1} • {rec.category}
                              </span>
                              <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                {rec.currentGrade}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {rec.topic}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                              {rec.currentText || "(No recommendation statement entered)"}
                            </p>
                          </div>
                        );
                      })}

                      {practiceChanges.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                          No recommendations yet. Click <b>➕ Add New</b> to create.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: RECOMMENDATION DETAILS */}
                  <div className="md:col-span-7 flex flex-col border rounded-xl p-4 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto max-h-[500px]">
                    {practiceChanges.length > 0 && selectedRecIndex >= 0 && selectedRecIndex < practiceChanges.length ? (
                      <div className="space-y-3.5">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-[10.5px]">
                              {selectedRecIndex + 1}
                            </span>
                            <span className="font-extrabold uppercase text-xs text-amber-600 dark:text-amber-400">
                              {isAha ? "AHA/ASA Recommendation Structure" : "Standard Recommendation Structure"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteStandardRec(selectedRecIndex)}
                            className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-300 dark:border-rose-800 cursor-pointer transition-colors"
                            title="Delete this recommendation"
                          >
                            🗑️ Delete
                          </button>
                        </div>

                        {/* SECTION & TOPIC */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Section / Topic:
                            </label>
                            <input
                              type="text"
                              required
                              value={recCategory}
                              onChange={(e) => setRecCategory(e.target.value)}
                              placeholder="e.g. Reperfusion Therapy or Blood Pressure..."
                              className={`w-full p-2 rounded-xl border font-medium ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Clinical Question / Population:
                            </label>
                            <input
                              type="text"
                              required
                              value={recTopic}
                              onChange={(e) => setRecTopic(e.target.value)}
                              placeholder="e.g. Acute Ischemic Stroke Patients within 4.5h"
                              className={`w-full p-2 rounded-xl border font-medium ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>
                        </div>

                        {/* 1. FULL RECOMMENDATION STATEMENT (PLACED FIRST!) */}
                        <div>
                          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                            Full Recommendation Statement:
                          </label>
                          <textarea
                            rows={4}
                            required
                            value={recStatement}
                            onChange={(e) => setRecStatement(e.target.value)}
                            placeholder="Enter the full text of the clinical recommendation..."
                            className={`w-full p-2.5 rounded-xl border font-medium leading-relaxed ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                            }`}
                          />
                        </div>

                        {/* AHA GRADING FIELDS */}
                        {isAha && (
                          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
                            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                              <span>🔴 ACC/AHA RECOMMENDATION GRADING</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block font-bold mb-1">
                                  Class of Recommendation (COR):
                                </label>
                                <select
                                  value={ahaCor}
                                  onChange={(e) => setAhaCor(e.target.value)}
                                  className={`w-full p-2 rounded-xl border font-extrabold ${
                                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                  }`}
                                >
                                  <option value="1">Class 1 (Strong - Benefit &gt;&gt;&gt; Risk)</option>
                                  <option value="2a">Class 2a (Moderate - Benefit &gt;&gt; Risk)</option>
                                  <option value="2b">Class 2b (Weak - Benefit &gt;= Risk)</option>
                                  <option value="3: No Benefit">Class 3: No Benefit</option>
                                  <option value="3: Harm">Class 3: Harm</option>
                                </select>
                              </div>

                              <div>
                                <label className="block font-bold mb-1">
                                  Level of Evidence (LOE):
                                </label>
                                <select
                                  value={ahaLoe}
                                  onChange={(e) => setAhaLoe(e.target.value)}
                                  className={`w-full p-2 rounded-xl border font-extrabold ${
                                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                  }`}
                                >
                                  <option value="A">Level A (High-quality RCTs)</option>
                                  <option value="B-R">Level B-R (Randomized trials)</option>
                                  <option value="B-NR">Level B-NR (Non-randomized studies)</option>
                                  <option value="C-LD">Level C-LD (Limited data / registries)</option>
                                  <option value="C-EO">Level C-EO (Expert opinion)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {!isAha && (
                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Grade / Level of Evidence:
                            </label>
                            <input
                              type="text"
                              value={generalGrade}
                              onChange={(e) => setGeneralGrade(e.target.value)}
                              placeholder="e.g. Level A, Level B, Good Practice Point..."
                              className={`w-full p-2 rounded-xl border font-bold ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>
                        )}

                        {/* DRIVING TRIALS & CHANGE TYPE */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Driving Clinical Trials (comma-separated):
                            </label>
                            <input
                              type="text"
                              value={recTrialsStr}
                              onChange={(e) => setRecTrialsStr(e.target.value)}
                              placeholder="e.g. EXTEND-IA, SWIFT PRIME, DAWN, DEFUSE 3"
                              className={`w-full p-2 rounded-xl border font-mono text-[11px] ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Recommendation Change Type:
                            </label>
                            <select
                              value={recChangeType || "STANDARD"}
                              onChange={(e) => setRecChangeType(e.target.value as PracticeChangeDetail["changeType"])}
                              className={`w-full p-2 rounded-xl border font-bold ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <option value="STANDARD">STANDARD (Maintained standard practice)</option>
                              <option value="NEW">NEW (Newly introduced recommendation)</option>
                              <option value="UPGRADED">UPGRADED (Class / Grade upgraded)</option>
                              <option value="DOWNGRADED">DOWNGRADED (Class / Grade downgraded)</option>
                              <option value="REVISED">REVISED (Wording or threshold revised)</option>
                            </select>
                          </div>
                        </div>

                        {recChangeType && recChangeType !== "STANDARD" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <div>
                              <label className="block font-bold mb-1">Previous Grade:</label>
                              <input
                                type="text"
                                value={recPrevGrade}
                                onChange={(e) => setRecPrevGrade(e.target.value)}
                                placeholder="e.g. Class 2b, Level C"
                                className={`w-full p-1.5 rounded-lg border text-xs ${
                                  darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-300"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block font-bold mb-1">Previous Text:</label>
                              <input
                                type="text"
                                value={recPrevText}
                                onChange={(e) => setRecPrevText(e.target.value)}
                                placeholder="Previous wording of this recommendation..."
                                className={`w-full p-1.5 rounded-lg border text-xs ${
                                  darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-300"
                                }`}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
                        <span className="text-3xl mb-2">📋</span>
                        <p>Select a recommendation from the left or click Add New.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          {/* FOOTER ACTION BAR */}
          <div className="px-5 py-3 border-t dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-950/60">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleDeleteFromModal}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>🗑️ Delete Guideline</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLoading ? (
                  <span>Saving changes...</span>
                ) : (
                  <span>✓ Save All Changes</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
