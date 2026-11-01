"use client";

import React, { useState, useEffect, useMemo } from "react";
import type { GuidelineDoc, PracticeChangeDetail, SubspecialtyType } from "@/types/neuroguide";
import { NEUROLOGY_SUBSPECIALTIES } from "@/types/neuroguide";
import { ESO_GRADE_QUALITY_CONFIG } from "./EsoGuidelineTable";

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

function parseEsoStrength(gradeStr?: string): string {
  if (!gradeStr) return "Weak against intervention";
  const lower = gradeStr.toLowerCase();
  if (lower.includes("uncertain") || lower.includes("—") || lower === "-") return "Uncertain / Ongoing trials";
  if (lower.includes("strong against")) return "Strong against intervention";
  if (lower.includes("weak against") || lower.includes("suggest against")) return "Weak against intervention";
  if (lower.includes("strong for") || lower.includes("recommend for")) return "Strong for intervention";
  if (lower.includes("weak for") || lower.includes("suggest for")) return "Weak for intervention";
  return "Weak against intervention";
}

function parseEsoQuality(gradeStr?: string): string {
  if (!gradeStr) return "Moderate";
  const lower = gradeStr.toLowerCase();
  if (lower.includes("very low")) return "Very low";
  if (lower.includes("low")) return "Low";
  if (lower.includes("high")) return "High";
  return "Moderate";
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

  // Recommendations List State
  const [practiceChanges, setPracticeChanges] = useState<PracticeChangeDetail[]>([]);
  const [selectedRecIndex, setSelectedRecIndex] = useState<number>(0);
  const [searchRecTerm, setSearchRecTerm] = useState("");

  // Form Format mode (Manual override or Auto-detect)
  const [formFormat, setFormFormat] = useState<GuidelineFormFormat>("AUTO");

  // Recommendation Edit Form Fields (for the selected recommendation)
  const [recCategory, setRecCategory] = useState("");
  const [recTopic, setRecTopic] = useState("");
  const [recStatement, setRecStatement] = useState("");
  const [recTrialsStr, setRecTrialsStr] = useState("");
  const [recChangeType, setRecChangeType] = useState<PracticeChangeDetail["changeType"]>("STANDARD");
  const [recPrevGrade, setRecPrevGrade] = useState("");
  const [recPrevText, setRecPrevText] = useState("");

  // AHA Form Specific
  const [ahaCor, setAhaCor] = useState<string>("1");
  const [ahaLoe, setAhaLoe] = useState<string>("A");

  // ESO Form Specific
  const [esoStrength, setEsoStrength] = useState<string>("Weak against intervention");
  const [esoQuality, setEsoQuality] = useState<string>("Moderate");
  const [esoVoting, setEsoVoting] = useState<string>("Vote: 10/10");
  const [esoConsensus, setEsoConsensus] = useState<string>("");

  // General Form Specific
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

      if (item) {
        const foundIdx = list.findIndex((r) => r.id === item.id);
        const idx = foundIdx >= 0 ? foundIdx : 0;
        setSelectedRecIndex(idx);
        loadRecIntoForm(list[idx] || item);
        setActiveTab("recommendations");
      } else if (list.length > 0) {
        setSelectedRecIndex(0);
        loadRecIntoForm(list[0]);
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
        setDocTitle("2025 ESO guideline on blood pressure management in acute ischaemic stroke and intracerebral haemorrhage");
      }
      setPracticeChanges([item]);
      setSelectedRecIndex(0);
      loadRecIntoForm(item);
      setActiveTab("recommendations");
    }

    setErrorMessage(null);
  }, [isOpen, guidelineDoc, item]);

  const loadRecIntoForm = (rec: PracticeChangeDetail) => {
    if (!rec) return;
    setRecCategory(rec.category || "Recommendations");
    setRecTopic(rec.topic || "");
    setRecStatement(rec.currentText || "");
    setRecTrialsStr(rec.drivingTrials?.join(", ") || "");
    setRecChangeType(rec.changeType || "STANDARD");
    setRecPrevGrade(rec.previousGrade || "");
    setRecPrevText(rec.previousText || "");

    // Load AHA
    setAhaCor(parseAhaCor(rec.currentGrade));
    setAhaLoe(parseAhaLoe(rec.currentGrade));

    // Load ESO: prioritize direct fields first
    setEsoStrength(rec.strength || parseEsoStrength(rec.currentGrade));
    setEsoQuality(rec.quality || parseEsoQuality(rec.currentGrade));
    setEsoVoting(rec.voting || "Vote: 10/10");
    setEsoConsensus(rec.expertConsensusStatement || rec.previousText || "");

    // Load General
    setGeneralGrade(rec.currentGrade || "Level A");
  };

  // Sync current form fields back to practiceChanges array in memory
  const syncCurrentRecToMemory = () => {
    if (practiceChanges.length === 0 || selectedRecIndex < 0 || selectedRecIndex >= practiceChanges.length) {
      return;
    }

    let computedGrade = generalGrade;
    if (isAha) {
      computedGrade = `Class ${ahaCor}, Level ${ahaLoe}`;
    } else if (isEso) {
      computedGrade = `GRADE ${esoStrength} (Evidence: ${esoQuality}${esoVoting ? `, Voting: ${esoVoting}` : ""})`;
    }

    const trials = recTrialsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    let pNum: string | undefined = undefined;
    let pQuestion: string | undefined = undefined;
    if (isEso) {
      const matchPico = (recTopic || "").match(/^PICO\s*(\d+)[:.\s-]*(.*)/i);
      if (matchPico) {
        pNum = matchPico[1];
        pQuestion = matchPico[2]?.trim() || recTopic;
      } else {
        pNum = `${selectedRecIndex + 1}`;
        pQuestion = recTopic;
      }
    }

    const updated: PracticeChangeDetail = {
      ...practiceChanges[selectedRecIndex],
      category: recCategory || "Recommendations",
      topic: recTopic || `Recommendation ${selectedRecIndex + 1}`,
      currentGrade: computedGrade,
      currentText: recStatement,
      drivingTrials: trials,
      changeType: recChangeType,
      previousGrade: recPrevGrade || undefined,
      previousText: isEso ? esoConsensus : recPrevText || undefined,
      voting: isEso ? esoVoting : undefined,
      quality: isEso ? esoQuality : undefined,
      strength: isEso ? esoStrength : undefined,
      expertConsensusStatement: isEso ? esoConsensus : undefined,
      picoNumber: pNum,
      picoQuestion: pQuestion,
    };

    const nextList = [...practiceChanges];
    nextList[selectedRecIndex] = updated;
    setPracticeChanges(nextList);
  };

  const handleSelectRecommendation = (newIndex: number) => {
    syncCurrentRecToMemory();
    setSelectedRecIndex(newIndex);
    if (practiceChanges[newIndex]) {
      loadRecIntoForm(practiceChanges[newIndex]);
    }
  };

  const handleAddNewRecommendation = () => {
    syncCurrentRecToMemory();
    const newId = `rec-${Date.now().toString().slice(-5)}`;
    let defaultTopic = `Khuyến cáo mới #${practiceChanges.length + 1}`;
    let defaultGrade = "Class 1, Level A";

    if (isEso) {
      defaultTopic = `PICO ${practiceChanges.length + 1}: Lâm sàng mới`;
      defaultGrade = "GRADE Strong for intervention (Evidence: High, Voting: Vote: 10/10)";
    }

    const newRec: PracticeChangeDetail = {
      id: newId,
      category: "Recommendations",
      topic: defaultTopic,
      currentGrade: defaultGrade,
      currentText: "",
      changeType: "NEW",
      drivingTrials: [],
    };

    const nextList = [...practiceChanges, newRec];
    setPracticeChanges(nextList);
    setSelectedRecIndex(nextList.length - 1);
    loadRecIntoForm(newRec);
  };

  const handleDeleteRecommendation = (indexToDelete: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khuyến cáo này khỏi guideline?")) return;
    const nextList = practiceChanges.filter((_, idx) => idx !== indexToDelete);
    setPracticeChanges(nextList);
    const newIdx = Math.max(0, indexToDelete - 1);
    setSelectedRecIndex(newIdx);
    if (nextList.length > 0 && nextList[newIdx]) {
      loadRecIntoForm(nextList[newIdx]);
    }
  };

  // Takeaways handlers
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

  // Delete guideline entirely
  const handleDeleteFromModal = async () => {
    const title = docTitle || guidelineDoc?.title || docId;
    const confirmDel = window.confirm(
      `Bạn có chắc chắn muốn XÓA guideline:\n\n"${title}"?\n\nHướng dẫn này sẽ bị gỡ bỏ vĩnh viễn khỏi thư viện và hệ thống lưu trữ.`
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
        setErrorMessage(data.error || "Không thể xóa guideline.");
      }
    } catch {
      setErrorMessage("Lỗi kết nối khi xóa guideline.");
    } finally {
      setIsLoading(false);
    }
  };

  // Save all changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    // Make sure current active recommendation in form is synced
    syncCurrentRecToMemory();

    // Recompute current active recommendation to guarantee latest changes are included
    let computedGrade = generalGrade;
    if (isAha) {
      computedGrade = `Class ${ahaCor}, Level ${ahaLoe}`;
    } else if (isEso) {
      computedGrade = `GRADE ${esoStrength} (Evidence: ${esoQuality}${esoVoting ? `, Voting: ${esoVoting}` : ""})`;
    }

    const trials = recTrialsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const finalizedChanges = [...practiceChanges];
    if (finalizedChanges.length > 0 && selectedRecIndex >= 0 && selectedRecIndex < finalizedChanges.length) {
      finalizedChanges[selectedRecIndex] = {
        ...finalizedChanges[selectedRecIndex],
        category: recCategory || "Recommendations",
        topic: recTopic || `Recommendation ${selectedRecIndex + 1}`,
        currentGrade: computedGrade,
        currentText: recStatement,
        drivingTrials: trials,
        changeType: recChangeType,
        previousGrade: isEso ? undefined : recPrevGrade || undefined,
        previousText: isEso ? esoConsensus : recPrevText || undefined,
        voting: isEso ? esoVoting : undefined,
        quality: isEso ? esoQuality : undefined,
        strength: isEso ? esoStrength : undefined,
        expertConsensusStatement: isEso ? esoConsensus : undefined,
      };
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
        setErrorMessage(data.error || "Không thể lưu cập nhật guideline.");
      }
    } catch {
      setErrorMessage("Lỗi kết nối khi lưu thay đổi guideline.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecs = useMemo(() => {
    if (!searchRecTerm.trim()) return practiceChanges;
    const term = searchRecTerm.toLowerCase();
    return practiceChanges.filter(
      (r) =>
        r.topic.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        r.currentText.toLowerCase().includes(term) ||
        r.currentGrade.toLowerCase().includes(term)
    );
  }, [practiceChanges, searchRecTerm]);

  if (!isOpen) return null;

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
                Chỉnh sửa Guideline: {docTitle || guidelineDoc?.title || "Hướng dẫn lâm sàng"}
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
                  {isEso ? "🔵 Form Mẫu ESO GRADE (PICO)" : isAha ? "🔴 Form Mẫu AHA/ASA (COR & LOE)" : `🟢 Form Mẫu ${docSociety || "Tiêu chuẩn"}`}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {practiceChanges.length} khuyến cáo • {takeaways.length} điểm cốt lõi
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
                title="Tự động nhận diện chuẩn theo tên tài liệu hoặc hội chuyên khoa"
              >
                Auto ({isDetectedEso ? "ESO" : isDetectedAha ? "AHA" : "Chung"})
              </button>
              <button
                type="button"
                onClick={() => setFormFormat("ESO")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  formFormat === "ESO"
                    ? "bg-blue-600 text-white shadow-2xs font-extrabold"
                    : "text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                }`}
                title="Sử dụng form chuẩn ESO GRADE & PICO (Table 11 Synoptic Table)"
              >
                Form ESO
              </button>
              <button
                type="button"
                onClick={() => setFormFormat("AHA")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  formFormat === "AHA"
                    ? "bg-rose-600 text-white shadow-2xs font-extrabold"
                    : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                }`}
                title="Sử dụng form chuẩn AHA/ASA COR & LOE"
              >
                Form AHA
              </button>
              <button
                type="button"
                onClick={() => setFormFormat("STANDARD")}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  formFormat === "STANDARD"
                    ? "bg-slate-700 text-white shadow-2xs font-extrabold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
                title="Sử dụng form tiêu chuẩn chung"
              >
                Tiêu chuẩn
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold cursor-pointer p-1"
              title="Đóng cửa sổ"
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
              syncCurrentRecToMemory();
              setActiveTab("metadata");
            }}
            className={`px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "metadata"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>📋</span>
            <span>1. Thông tin chung &amp; Tóm tắt</span>
          </button>

          <button
            type="button"
            onClick={() => {
              syncCurrentRecToMemory();
              setActiveTab("takeaways");
            }}
            className={`px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "takeaways"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <span>🌟</span>
            <span>2. Điểm tin cốt lõi ({takeaways.length})</span>
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
            <span>3. Từng khuyến cáo bên trong ({practiceChanges.length})</span>
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
                    Tên đầy đủ của Guideline (Guideline Title):
                  </label>
                  <input
                    type="text"
                    required
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="VD: 2026 Guideline for the Early Management of Patients With Acute Ischemic Stroke"
                    className={`w-full p-2.5 rounded-xl border font-medium ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Tổ chức Y khoa (Society):
                    </label>
                    <input
                      type="text"
                      required
                      value={docSociety}
                      onChange={(e) => setDocSociety(e.target.value)}
                      placeholder="VD: AHA/ASA, ESO, AAN..."
                      className={`w-full p-2.5 rounded-xl border font-medium ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Năm phát hành (Year):
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
                      Chuyên khoa (Subspecialty):
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
                    Tóm tắt điều hành &amp; Phạm vi hướng dẫn (Executive Summary):
                  </label>
                  <textarea
                    rows={4}
                    value={docSummary}
                    onChange={(e) => setDocSummary(e.target.value)}
                    placeholder="Mô tả phạm vi áp dụng, đối tượng bệnh nhân và mục tiêu hướng dẫn..."
                    className={`w-full p-2.5 rounded-xl border font-medium leading-relaxed ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                    Đường dẫn / Nguồn chính thức (Official URL / Source):
                  </label>
                  <input
                    type="text"
                    value={docOfficialUrl}
                    onChange={(e) => setDocOfficialUrl(e.target.value)}
                    placeholder="https://www.ahajournals.org/doi/... hoặc https://pubmed.ncbi.nlm.nih.gov/..."
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
                      🌟 Top Take-Home Messages (Điểm tin lâm sàng then chốt)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Các thông điệp cốt lõi bác sĩ cần nắm vững nhất từ bản hướng dẫn này.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                    {takeaways.length} điểm
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
                        title="Xóa điểm tin này"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {takeaways.length === 0 && (
                    <p className="text-slate-400 italic text-center py-6">
                      Chưa có điểm tin cốt lõi nào. Hãy thêm điểm tin đầu tiên bên dưới.
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
                    placeholder="Nhập nội dung điểm tin cốt lõi mới..."
                    className={`flex-1 p-2.5 rounded-xl border font-medium ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleAddTakeaway}
                    className="px-4 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    ➕ Thêm điểm tin
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: RECOMMENDATIONS MANAGER WITH DEDICATED SOCIETY FORM */}
            {activeTab === "recommendations" && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-full min-h-[480px]">
                {/* LEFT COLUMN: LIST OF RECOMMENDATIONS */}
                <div className="md:col-span-5 flex flex-col border rounded-xl overflow-hidden dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="p-2.5 border-b dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      Danh sách khuyến cáo ({practiceChanges.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddNewRecommendation}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="Thêm khuyến cáo mới vào guideline này"
                    >
                      <span>➕ Thêm mới</span>
                    </button>
                  </div>

                  <div className="p-2 border-b dark:border-slate-800">
                    <input
                      type="text"
                      value={searchRecTerm}
                      onChange={(e) => setSearchRecTerm(e.target.value)}
                      placeholder="🔍 Tìm nhanh khuyến cáo..."
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs ${
                        darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                      }`}
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 max-h-[400px]">
                    {filteredRecs.map((rec) => {
                      const realIndex = practiceChanges.findIndex((r) => r.id === rec.id);
                      const isSelected = realIndex === selectedRecIndex;

                      return (
                        <div
                          key={rec.id}
                          onClick={() => handleSelectRecommendation(realIndex)}
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
                            {rec.currentText || "(Chưa có nội dung chi tiết)"}
                          </p>
                        </div>
                      );
                    })}

                    {practiceChanges.length === 0 && (
                      <div className="text-center py-10 text-slate-400">
                        Chưa có khuyến cáo nào. Bấm <b>➕ Thêm mới</b> để tạo.
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: DEDICATED SOCIETY FORM FOR SELECTED RECOMMENDATION */}
                <div className="md:col-span-7 flex flex-col border rounded-xl p-4 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto max-h-[500px]">
                  {practiceChanges.length > 0 && selectedRecIndex >= 0 && selectedRecIndex < practiceChanges.length ? (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-[10.5px]">
                            {selectedRecIndex + 1}
                          </span>
                          <span className="font-extrabold uppercase text-xs text-amber-600 dark:text-amber-400">
                            {isAha ? "Form Chuẩn AHA/ASA (Hình 1 & 2)" : isEso ? "Form Chuẩn ESO GRADE (Hình 3)" : "Form Khuyến cáo Tiêu chuẩn"}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteRecommendation(selectedRecIndex)}
                          className="px-2 py-0.5 rounded text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-300 dark:border-rose-800 cursor-pointer transition-colors"
                          title="Xóa khuyến cáo này"
                        >
                          🗑️ Xóa khuyến cáo
                        </button>
                      </div>

                      {/* SECTION & TOPIC */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                            {isAha ? "Section / Chuyên mục:" : isEso ? "Chủ đề / Section:" : "Chuyên mục / Phân đoạn:"}
                          </label>
                          <input
                            type="text"
                            required
                            value={recCategory}
                            onChange={(e) => setRecCategory(e.target.value)}
                            placeholder="VD: Reperfusion Therapy hoặc Blood Pressure..."
                            className={`w-full p-2 rounded-xl border font-medium ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                            {isEso ? "Câu hỏi PICO / Đối tượng:" : "Chủ đề / Nhóm bệnh nhân mục tiêu:"}
                          </label>
                          <input
                            type="text"
                            required
                            value={recTopic}
                            onChange={(e) => setRecTopic(e.target.value)}
                            placeholder={isEso ? "VD: PICO 1: In acute ischemic stroke..." : "VD: Bệnh nhân nhồi máu não cấp trong 4.5h"}
                            className={`w-full p-2 rounded-xl border font-medium ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                            }`}
                          />
                        </div>
                      </div>

                      {/* SOCIETY SPECIFIC GRADING FIELDS */}
                      {isAha && (
                        <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
                          <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                            <span>🔴 CẤU TRÚC PHÂN CẤP KHUYẾN CÁO ACC/AHA</span>
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
                                <option value="1">Class 1 (Mạnh - Lợi ích vượt trội nguy cơ)</option>
                                <option value="2a">Class 2a (Trung bình - Nên thực hiện)</option>
                                <option value="2b">Class 2b (Yếu - Có thể xem xét)</option>
                                <option value="3: No Benefit">Class 3: No Benefit (Không có lợi ích)</option>
                                <option value="3: Harm">Class 3: Harm (Có hại - Chống chỉ định)</option>
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
                                <option value="A">Level A (Nhiều RCTs chất lượng cao)</option>
                                <option value="B-R">Level B-R (Thử nghiệm ngẫu nhiên)</option>
                                <option value="B-NR">Level B-NR (Nghiên cứu không ngẫu nhiên)</option>
                                <option value="C-LD">Level C-LD (Dữ liệu hạn chế / Registries)</option>
                                <option value="C-EO">Level C-EO (Ý kiến chuyên gia)</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      {isEso && (
                        <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3.5">
                          <div className="flex items-center justify-between gap-2 border-b border-blue-200/80 dark:border-blue-900/60 pb-2">
                            <span className="font-extrabold text-blue-900 dark:text-blue-200 text-xs flex items-center gap-1.5">
                              <span>🔵</span>
                              <span>CẤU TRÚC PHÂN CẤP ESO GRADE (SYNOPTIC TABLE 11)</span>
                            </span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                              Chuẩn ESO
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                Strength of Recommendation:
                              </label>
                              <select
                                value={esoStrength}
                                onChange={(e) => setEsoStrength(e.target.value)}
                                className={`w-full p-2 rounded-xl border font-extrabold text-xs ${
                                  darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                }`}
                              >
                                <option value="Strong for intervention">Strong for intervention (Ủng hộ mạnh ↑↑)</option>
                                <option value="Weak for intervention">Weak for intervention (Ủng hộ yếu ↑)</option>
                                <option value="Weak against intervention">Weak against intervention (Chống lại yếu ↓)</option>
                                <option value="Strong against intervention">Strong against intervention (Chống lại mạnh ↓↓)</option>
                                <option value="Uncertain / Ongoing trials">Uncertain / Ongoing trials (Chưa rõ ràng —)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                Quality of Evidence (GRADE):
                              </label>
                              <select
                                value={esoQuality}
                                onChange={(e) => setEsoQuality(e.target.value)}
                                className={`w-full p-2 rounded-xl border font-extrabold text-xs ${
                                  darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                }`}
                              >
                                <option value="High">High (Cao ⊕⊕⊕⊕) — #0070c0</option>
                                <option value="Moderate">Moderate (Trung bình ⊕⊕⊕) — #5481c4</option>
                                <option value="Low">Low (Thấp ⊕⊕) — #2b7bb9</option>
                                <option value="Very low">Very low (Rất thấp ⊕) — #8e72a8</option>
                              </select>

                              {/* Live preview matching the PDF Guideline palette */}
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">Màu chuẩn guideline:</span>
                                <span
                                  style={{
                                    color: ESO_GRADE_QUALITY_CONFIG[esoQuality]?.hex || "#5481c4",
                                    backgroundColor: ESO_GRADE_QUALITY_CONFIG[esoQuality]?.bgLight || "rgba(84, 129, 196, 0.1)",
                                    borderColor: ESO_GRADE_QUALITY_CONFIG[esoQuality]?.borderLight || "rgba(84, 129, 196, 0.3)",
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-black border"
                                >
                                  <span>{ESO_GRADE_QUALITY_CONFIG[esoQuality]?.label || esoQuality}</span>
                                  <span className="font-mono tracking-tight text-xs">
                                    {ESO_GRADE_QUALITY_CONFIG[esoQuality]?.symbols || "⊕⊕⊕"}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                Expert Consensus Statement (Tuyên bố đồng thuận chuyên gia Table 11):
                              </label>
                              <textarea
                                rows={3}
                                value={esoConsensus}
                                onChange={(e) => setEsoConsensus(e.target.value)}
                                placeholder="Nhập tuyên bố đồng thuận lâm sàng của nhóm chuyên gia ESO (nếu có)..."
                                className={`w-full p-2.5 rounded-xl border font-medium text-xs leading-relaxed ${
                                  darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                }`}
                              />
                            </div>

                            <div className="w-full sm:w-1/2">
                              <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                Tỷ lệ bỏ phiếu đồng thuận (Voting):
                              </label>
                              <input
                                type="text"
                                value={esoVoting}
                                onChange={(e) => setEsoVoting(e.target.value)}
                                placeholder="VD: Vote: 10/10 hoặc Unanimous"
                                className={`w-full p-2 rounded-xl border font-medium text-xs ${
                                  darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {!isAha && !isEso && (
                        <div>
                          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                            Cấp độ khuyến cáo (Grade / Level of Evidence):
                          </label>
                          <input
                            type="text"
                            value={generalGrade}
                            onChange={(e) => setGeneralGrade(e.target.value)}
                            placeholder="VD: Level A, Level B, Good Practice Point..."
                            className={`w-full p-2 rounded-xl border font-bold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                            }`}
                          />
                        </div>
                      )}

                      {/* FULL RECOMMENDATION STATEMENT */}
                      <div>
                        <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                          Nội dung câu khuyến cáo đầy đủ (Full Recommendation Statement):
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={recStatement}
                          onChange={(e) => setRecStatement(e.target.value)}
                          placeholder="Nhập toàn văn nội dung khuyến cáo lâm sàng..."
                          className={`w-full p-2.5 rounded-xl border font-medium leading-relaxed ${
                            darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>

                      {/* DRIVING TRIALS & CHANGE TYPE */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                            Thử nghiệm lâm sàng dẫn chứng (phân cách bởi dấu phẩy):
                          </label>
                          <input
                            type="text"
                            value={recTrialsStr}
                            onChange={(e) => setRecTrialsStr(e.target.value)}
                            placeholder="VD: EXTEND-IA, SWIFT PRIME, DAWN, DEFUSE 3"
                            className={`w-full p-2 rounded-xl border font-mono text-[11px] ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                            Loại điểm mới so với bản cũ (Change Type):
                          </label>
                          <select
                            value={recChangeType || "STANDARD"}
                            onChange={(e) => setRecChangeType(e.target.value as PracticeChangeDetail["changeType"])}
                            className={`w-full p-2 rounded-xl border font-bold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <option value="STANDARD">STANDARD (Khuyến cáo chuẩn duy trì)</option>
                            <option value="NEW">NEW (Khuyến cáo mới hoàn toàn)</option>
                            <option value="UPGRADED">UPGRADED (Nâng bậc khuyến cáo)</option>
                            <option value="DOWNGRADED">DOWNGRADED (Hạ bậc khuyến cáo)</option>
                            <option value="REVISED">REVISED (Sửa đổi điều chỉnh)</option>
                          </select>
                        </div>
                      </div>

                      {recChangeType && recChangeType !== "STANDARD" && !isEso && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                          <div>
                            <label className="block font-bold mb-1">Cấp độ bản cũ (Previous Grade):</label>
                            <input
                              type="text"
                              value={recPrevGrade}
                              onChange={(e) => setRecPrevGrade(e.target.value)}
                              placeholder="VD: Class 2b, Level C"
                              className={`w-full p-1.5 rounded-lg border text-xs ${
                                darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-300"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block font-bold mb-1">Nội dung bản cũ (Previous Text):</label>
                            <input
                              type="text"
                              value={recPrevText}
                              onChange={(e) => setRecPrevText(e.target.value)}
                              placeholder="Nội dung khuyến cáo phiên bản trước..."
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
                      <p>Chọn một khuyến cáo bên trái để chỉnh sửa hoặc bấm Thêm mới.</p>
                    </div>
                  )}
                </div>
              </div>
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
              <span>🗑️ Xóa toàn bộ guideline này</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isLoading ? (
                  <span>Đang lưu thay đổi...</span>
                ) : (
                  <span>✓ Lưu toàn bộ thay đổi</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
