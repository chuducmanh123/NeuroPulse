"use client";

import React, { useState, useEffect, useMemo } from "react";
import { EditGuidelineModal } from "./EditGuidelineModal";
import { AhaGuidelineTable } from "./AhaGuidelineTable";
import { EsoGuidelineTable } from "./EsoGuidelineTable";
import type { GuidelineDoc, PracticeChangeDetail } from "@/types/neuroguide";

export interface StoredRec {
  rec_id: string;
  guideline_id: string;
  guideline_title: string;
  society: string;
  year?: number;
  grading_system: string;
  page_num: number;
  statement: string;
  approval_status: string;
  category?: string;
  topic?: string;
  cor?: string;
  cor_label?: string;
  loe?: string;
  quality_of_evidence?: string;
  strength_of_recommendation?: string;
  voting?: string;
  pico_id?: string;
  target_population?: string;
  driving_trials?: string[];
  verbatim_quote?: string;
  verification_detail?: {
    status: string;
    grounding_score: number;
    classification_valid: boolean;
    numbers_verified: boolean;
    issues: string[];
  };
}

export interface PendingGuidelineGroup {
  guideline_id: string;
  guideline_title: string;
  society: string;
  year?: number;
  recommendations: StoredRec[];
  categories: {
    name: string;
    items: StoredRec[];
  }[];
}

interface ReviewQueueTabProps {
  darkMode: boolean;
  onQueueUpdated?: () => void;
  onQueueCountChange?: (count: number) => void;
  onOpenPipelineModal?: () => void;
  onOpenNotebookLMModal?: () => void;
}

interface ConfirmDialogState {
  isOpen: boolean;
  type: "APPROVE_GUIDELINE" | "REJECT_GUIDELINE" | "APPROVE_ALL" | "PURGE_BLOBS";
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: "emerald" | "rose" | "amber";
  targetGuideline?: PendingGuidelineGroup;
}

export function ReviewQueueTab({
  darkMode,
  onQueueUpdated,
  onQueueCountChange,
  onOpenPipelineModal,
  onOpenNotebookLMModal,
}: ReviewQueueTabProps) {
  const [queue, setQueue] = useState<StoredRec[]>([]);
  const [rawServerCount, setRawServerCount] = useState<number>(0);
  const [rawServerRecs, setRawServerRecs] = useState<StoredRec[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterSociety, setFilterSociety] = useState<string>("ALL");
  const [filterQuality, setFilterQuality] = useState<"ALL" | "HIGH_SCORE" | "HAS_ISSUES">("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Expanded state for guideline cards
  const [expandedGuidelines, setExpandedGuidelines] = useState<Record<string, boolean>>({});
  const [groupViewModes, setGroupViewModes] = useState<Record<string, "table" | "cards">>({});

  // Confirm Dialog State (Replaces native window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    type: "APPROVE_ALL",
    title: "",
    description: "",
    confirmLabel: "",
    confirmColor: "emerald",
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingDocId, setEditingDocId] = useState<string>("");
  const [editingGuidelineDoc, setEditingGuidelineDoc] = useState<GuidelineDoc | null>(null);
  const [editingPracticeChange, setEditingPracticeChange] = useState<PracticeChangeDetail | null>(null);

  // Read dismissed recommendation IDs from localStorage
  const getDismissedRecIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem("neuroguide_reviewed_rec_ids");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const markRecsAsReviewedLocally = (recIds: string[]) => {
    try {
      const set = getDismissedRecIds();
      recIds.forEach((id) => set.add(id));
      localStorage.setItem("neuroguide_reviewed_rec_ids", JSON.stringify(Array.from(set)));
    } catch {}
  };

  const handleResetDismissedCache = () => {
    try {
      localStorage.removeItem("neuroguide_reviewed_rec_ids");
    } catch {}
    setQueue(rawServerRecs);
    if (onQueueCountChange) onQueueCountChange(rawServerRecs.length);
    if (onQueueUpdated) onQueueUpdated();
    setFeedbackMessage({
      type: "success",
      text: `🔄 Khôi phục hiển thị toàn bộ ${rawServerRecs.length} khuyến cáo đang chờ duyệt từ máy chủ.`,
    });
  };

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/neuroguide/review-queue");
      const data = await res.json();
      if (data.ok && Array.isArray(data.queue)) {
        setRawServerCount(data.total ?? data.queue.length);
        setRawServerRecs(data.queue);
        const dismissed = getDismissedRecIds();
        const activeQueue = data.queue.filter(
          (r: StoredRec) => !dismissed.has(r.rec_id) && r.approval_status === "PENDING_REVIEW"
        );
        setQueue(activeQueue);
        if (onQueueCountChange) {
          onQueueCountChange(activeQueue.length);
        }
      }
    } catch (err) {
      console.warn("Could not fetch review queue:", err);
      setFeedbackMessage({ type: "error", text: "Không thể kết nối đến máy chủ để tải danh sách kiểm duyệt." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Compute society statistics for filter chips
  const societyCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: queue.length };
    queue.forEach((r) => {
      const soc = (r.society || "OTHER").toUpperCase();
      let key = "OTHER";
      if (soc.includes("AHA") || soc.includes("ASA")) key = "AHA";
      else if (soc.includes("ESO")) key = "ESO";
      else if (soc.includes("AAN")) key = "AAN";
      else if (soc.includes("ILAE")) key = "ILAE";
      else if (soc.includes("NCS")) key = "NCS";

      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [queue]);

  // Compute average AI grounding score
  const avgGroundingScore = useMemo(() => {
    if (queue.length === 0) return 96;
    let total = 0;
    let count = 0;
    queue.forEach((r) => {
      if (r.verification_detail?.grounding_score) {
        total += r.verification_detail.grounding_score;
        count++;
      }
    });
    return count > 0 ? Math.round(total / count) : 96;
  }, [queue]);

  // Group recommendations by Guideline ID and within Guideline by Category
  const guidelineGroups = useMemo(() => {
    const map = new Map<string, PendingGuidelineGroup>();
    const query = searchQuery.trim().toLowerCase();

    queue.forEach((rec) => {
      // 1. Society Filter
      if (filterSociety !== "ALL") {
        const normSoc = (rec.society || "").toUpperCase();
        if (filterSociety === "AHA" && !(normSoc.includes("AHA") || normSoc.includes("ASA"))) return;
        if (filterSociety === "ESO" && !normSoc.includes("ESO")) return;
        if (filterSociety === "AAN" && !normSoc.includes("AAN")) return;
        if (filterSociety === "ILAE" && !normSoc.includes("ILAE")) return;
        if (filterSociety === "NCS" && !normSoc.includes("NCS")) return;
        if (filterSociety === "OTHER" && (normSoc.includes("AHA") || normSoc.includes("ESO") || normSoc.includes("AAN") || normSoc.includes("ILAE") || normSoc.includes("NCS"))) return;
      }

      // 2. AI Quality Filter
      if (filterQuality === "HIGH_SCORE") {
        const score = rec.verification_detail?.grounding_score ?? 95;
        if (score < 90) return;
      } else if (filterQuality === "HAS_ISSUES") {
        const issues = rec.verification_detail?.issues ?? [];
        if (issues.length === 0) return;
      }

      // 3. Search Query Filter
      if (query) {
        const matchTitle = (rec.guideline_title || "").toLowerCase().includes(query);
        const matchStatement = (rec.statement || "").toLowerCase().includes(query);
        const matchCategory = (rec.category || "").toLowerCase().includes(query);
        const matchTopic = (rec.topic || "").toLowerCase().includes(query);
        const matchTrials = (rec.driving_trials || []).some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchStatement && !matchCategory && !matchTopic && !matchTrials) {
          return;
        }
      }

      const gId = rec.guideline_id || "unknown";
      if (!map.has(gId)) {
        map.set(gId, {
          guideline_id: gId,
          guideline_title: rec.guideline_title || gId,
          society: rec.society || "General",
          year: rec.year,
          recommendations: [],
          categories: [],
        });
      }

      map.get(gId)!.recommendations.push(rec);
    });

    const result = Array.from(map.values());

    result.forEach((group) => {
      const catMap = new Map<string, StoredRec[]>();
      group.recommendations.forEach((r) => {
        const catName = r.category || "General Recommendations";
        if (!catMap.has(catName)) {
          catMap.set(catName, []);
        }
        catMap.get(catName)!.push(r);
      });

      group.categories = Array.from(catMap.entries()).map(([name, items]) => ({
        name,
        items,
      }));
    });

    // Sort guidelines: Year descending -> Society ascending
    result.sort((a, b) => {
      const yA = a.year || 2024;
      const yB = b.year || 2024;
      if (yB !== yA) return yB - yA;
      return (a.society || "").localeCompare(b.society || "");
    });

    return result;
  }, [queue, filterSociety, filterQuality, searchQuery]);

  const toggleGuidelineExpand = (gId: string) => {
    setExpandedGuidelines((prev) => ({
      ...prev,
      [gId]: prev[gId] === false ? true : false,
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    guidelineGroups.forEach((g) => {
      next[g.guideline_id] = true;
    });
    setExpandedGuidelines(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    guidelineGroups.forEach((g) => {
      next[g.guideline_id] = false;
    });
    setExpandedGuidelines(next);
  };

  // Execution handlers called after confirmation dialog approval
  const executeApproveGuideline = async (group: PendingGuidelineGroup) => {
    setActionLoading(group.guideline_id);
    setFeedbackMessage(null);

    try {
      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_GUIDELINE",
          guideline_id: group.guideline_id,
          reviewer: "Attending Neurologist",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        markRecsAsReviewedLocally(group.recommendations.map((r) => r.rec_id));
        setFeedbackMessage({
          type: "success",
          text: `✅ Đã phê duyệt và xuất bản Guideline "${group.guideline_title}" (${group.recommendations.length} khuyến cáo) vào Clinical Practice Guidelines!`,
        });
        setQueue((prev) => prev.filter((r) => r.guideline_id !== group.guideline_id));
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage({
          type: "error",
          text: `⚠️ ${data.error || "Có lỗi xảy ra khi phê duyệt guideline."}`,
        });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "⚠️ Lỗi kết nối mạng khi phê duyệt guideline." });
    } finally {
      setActionLoading(null);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const executeRejectGuideline = async (group: PendingGuidelineGroup) => {
    setActionLoading(group.guideline_id);
    setFeedbackMessage(null);

    try {
      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT_GUIDELINE",
          guideline_id: group.guideline_id,
          reviewer: "Attending Neurologist",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        markRecsAsReviewedLocally(group.recommendations.map((r) => r.rec_id));
        setFeedbackMessage({
          type: "info",
          text: `❌ Đã từ chối Guideline "${group.guideline_title}". Các khuyến cáo đã được loại bỏ khỏi hàng đợi.`,
        });
        setQueue((prev) => prev.filter((r) => r.guideline_id !== group.guideline_id));
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage({
          type: "error",
          text: `⚠️ ${data.error || "Có lỗi xảy ra khi từ chối guideline."}`,
        });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "⚠️ Lỗi kết nối mạng khi từ chối guideline." });
    } finally {
      setActionLoading(null);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const executeApproveAll = async () => {
    if (queue.length === 0) return;
    setActionLoading("ALL");
    setFeedbackMessage(null);

    try {
      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "APPROVE_ALL",
          reviewer: "Attending Neurologist",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        markRecsAsReviewedLocally(queue.map((r) => r.rec_id));
        setFeedbackMessage({
          type: "success",
          text: `✅ ${data.message || `Đã phê duyệt toàn bộ ${queue.length} khuyến cáo vào kho hướng dẫn chính thức!`}`,
        });
        setQueue([]);
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage({
          type: "error",
          text: `⚠️ ${data.error || "Có lỗi xảy ra khi phê duyệt toàn bộ khuyến cáo."}`,
        });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "⚠️ Lỗi kết nối mạng khi phê duyệt hàng loạt." });
    } finally {
      setActionLoading(null);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleCleanupPdfs = async () => {
    setCleanupLoading(true);
    setFeedbackMessage(null);
    try {
      const adminToken =
        sessionStorage.getItem("neurocase_admin_token") ||
        localStorage.getItem("neurocase_admin_token") ||
        "";
      const res = await fetch("/api/neuroguide/cleanup-blob", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbackMessage({ type: "success", text: `🧹 ${data.message}` });
      } else {
        setFeedbackMessage({ type: "error", text: `⚠️ ${data.error || "Lỗi khi dọn dẹp bộ nhớ Vercel Blob."}` });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "⚠️ Lỗi kết nối mạng khi dọn dẹp bộ nhớ Vercel Blob." });
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleOpenEditGuideline = (group: PendingGuidelineGroup) => {
    const docMeta: GuidelineDoc = {
      id: group.guideline_id,
      society: group.society,
      year: group.year || new Date().getFullYear(),
      title: group.guideline_title,
      officialUrl: "",
      journalTarget: group.society.includes("AHA") ? "Stroke" : "Neurology",
      documentType: "Clinical Practice Guideline",
      publishDate: `${group.year || new Date().getFullYear()}-01-01`,
      subspecialty: "Stroke",
      subspecialties: ["Stroke"],
      executiveSummary: "",
      executiveSummaryVi: "",
      allPracticeChanges: [],
      linkedScenarioIds: [],
      fullTextStatus: "FULL_TEXT_PARSED",
      aiSynthesized: true,
    };

    setEditingDocId(group.guideline_id);
    setEditingPracticeChange(null);
    setEditingGuidelineDoc(docMeta);
    setShowEditModal(true);
  };

  const handleOpenEditRecommendation = (rec: StoredRec) => {
    let currentGrade = "Standard Clinical Practice";
    if (rec.cor) {
      currentGrade = `Class ${rec.cor}${rec.loe ? `, Level ${rec.loe}` : ""}`;
    } else if (rec.quality_of_evidence || rec.strength_of_recommendation) {
      currentGrade = `GRADE ${rec.strength_of_recommendation || "Recommended"} (Evidence: ${rec.quality_of_evidence || "Moderate"})`;
    }

    const itemDetail: PracticeChangeDetail = {
      id: rec.rec_id,
      topic: rec.topic || rec.target_population || "Clinical Recommendation",
      currentGrade,
      currentText: rec.statement,
      category: rec.category || "General Recommendations",
      drivingTrials: rec.driving_trials || [],
      changeType: "NEW",
    };

    setEditingDocId(rec.guideline_id);
    setEditingGuidelineDoc(null);
    setEditingPracticeChange(itemDetail);
    setShowEditModal(true);
  };

  // Society Badge Styling
  const getSocietyStyle = (society: string) => {
    const s = society.toUpperCase();
    if (s.includes("AHA") || s.includes("ASA")) {
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30";
    }
    if (s.includes("ESO")) {
      return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30";
    }
    if (s.includes("AAN")) {
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
    }
    if (s.includes("ILAE")) {
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30";
    }
    if (s.includes("NCS")) {
      return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30";
    }
    return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30";
  };

  // Grade Badges (COR / LOE)
  const getGradeBadgeStyle = (cor?: string) => {
    if (!cor) return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300";
    const c = String(cor).trim();
    if (c === "1") {
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    }
    if (c === "2a") {
      return "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30";
    }
    if (c === "2b") {
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    }
    if (c.includes("3") || c.toLowerCase().includes("harm") || c.toLowerCase().includes("no benefit")) {
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    }
    return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
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
            <span>Pending Guidelines</span>
            <span className="text-amber-500">📑</span>
          </div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {guidelineGroups.length}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
            Awaiting physician review
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Recommendations</span>
            <span className="text-blue-500">🎯</span>
          </div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {queue.length}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
            Classified statements
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>AI Grounding Score</span>
            <span className="text-emerald-500">⚡</span>
          </div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {avgGroundingScore}%
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            Fulltext citation precision
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Societies Active</span>
            <span className="text-purple-500">🏛️</span>
          </div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {Object.keys(societyCounts).filter((k) => k !== "ALL" && societyCounts[k] > 0).length}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
            AHA, ESO, AAN &amp; international
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. SMART ACTION & CONTROL TOOLBAR
         ========================================================================= */}
      <div
        className={`p-4 rounded-2xl border flex flex-col gap-3 shadow-xs ${
          darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Live Status */}
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
            </span>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <span>Guideline Verification &amp; Moderation Center</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {queue.length} Pending
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review structured clinical hierarchies, verify verbatim citations, and publish directly to the live clinical repository.
              </p>
            </div>
          </div>

          {/* Primary Ingestion & Pipeline Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenPipelineModal && (
              <button
                type="button"
                onClick={onOpenPipelineModal}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Launch Gemini AI Fulltext Extraction Pipeline from PDF"
              >
                <span>⚡ Run AI PDF Pipeline</span>
              </button>
            )}

            {onOpenNotebookLMModal && (
              <button
                type="button"
                onClick={onOpenNotebookLMModal}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
                title="Import structured guideline from NotebookLM notes"
              >
                <span>📝 Import NotebookLM</span>
              </button>
            )}

            {queue.length > 0 && (
              <button
                type="button"
                disabled={actionLoading === "ALL"}
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    type: "APPROVE_ALL",
                    title: "Phê duyệt toàn bộ hàng đợi?",
                    description: `Hành động này sẽ phê duyệt toàn bộ ${guidelineGroups.length} Guidelines (${queue.length} khuyến cáo) và xuất bản ngay vào kho Clinical Practice Guidelines.`,
                    confirmLabel: `✓ Phê duyệt toàn bộ (${queue.length} mục)`,
                    confirmColor: "emerald",
                  })
                }
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{actionLoading === "ALL" ? "Processing..." : `✓ Approve All (${queue.length})`}</span>
              </button>
            )}

            <button
              type="button"
              disabled={cleanupLoading}
              onClick={handleCleanupPdfs}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                darkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title="Purge temporary PDF blobs in Vercel Blob storage"
            >
              <span>🧹 {cleanupLoading ? "Purging..." : "Purge Blobs"}</span>
            </button>

            <button
              type="button"
              onClick={fetchQueue}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                darkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title="Refresh reviews from server"
            >
              <span className={isLoading ? "animate-spin" : ""}>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Society Filter Chips */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by guideline, topic, clinical trials or keywords..."
              className={`w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border outline-none transition-all ${
                darkMode
                  ? "bg-slate-800/70 border-slate-700 text-white focus:border-amber-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Hội chuyên khoa:</span>
            {[
              { id: "ALL", label: "Tất cả", count: queue.length },
              { id: "AHA", label: "AHA/ASA", count: societyCounts["AHA"] || 0 },
              { id: "ESO", label: "ESO", count: societyCounts["ESO"] || 0 },
              { id: "AAN", label: "AAN", count: societyCounts["AAN"] || 0 },
              { id: "ILAE", label: "ILAE", count: societyCounts["ILAE"] || 0 },
              { id: "NCS", label: "NCS", count: societyCounts["NCS"] || 0 },
            ].map((chip) => {
              const active = filterSociety === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilterSociety(chip.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                    active
                      ? "bg-amber-600 text-white shadow-xs"
                      : darkMode
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  <span>{chip.label}</span>
                  <span
                    className={`text-[10px] px-1 rounded-full ${
                      active
                        ? "bg-white/20 text-white"
                        : darkMode
                        ? "bg-slate-700 text-slate-300"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {chip.count}
                  </span>
                </button>
              );
            })}

            {/* Expand / Collapse All buttons */}
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={handleExpandAll}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Mở rộng tất cả các tài liệu"
              >
                Expand all ▾
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Thu gọn tất cả các tài liệu"
              >
                Collapse ▴
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. FEEDBACK TOAST / ALERT MESSAGE
         ========================================================================= */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs border ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : feedbackMessage.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedbackMessage.type === "success" ? "✓" : feedbackMessage.type === "error" ? "⚠️" : "ℹ️"}</span>
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 px-1.5 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          4. REVIEW CONTENT: LIST OF PENDING GUIDELINES
         ========================================================================= */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin inline-block w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full mb-3"></div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Đang tải dữ liệu kiểm duyệt hướng dẫn lâm sàng...
          </p>
        </div>
      ) : guidelineGroups.length === 0 ? (
        <div
          className={`p-12 rounded-2xl border text-center ${
            darkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <span className="text-4xl mb-3 block">🎉</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Hàng đợi kiểm duyệt hiện đang trống!
          </h3>
          <p className="text-xs mt-1.5 max-w-lg mx-auto text-slate-500 dark:text-slate-400">
            Tất cả các khuyến cáo đã được duyệt và xuất bản vào kho Clinical Practice Guidelines chính thức. Khi tải lên hướng dẫn mới qua AI Pipeline hoặc NotebookLM, chúng sẽ xuất hiện ở đây để bác sĩ kiểm tra.
          </p>

          {rawServerCount > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 inline-block max-w-lg text-center">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2.5">
                ⚠️ Có <strong>{rawServerCount}</strong> khuyến cáo đang có trên máy chủ nhưng đang được đánh dấu ẩn tạm thời bởi trình duyệt.
              </p>
              <button
                type="button"
                onClick={handleResetDismissedCache}
                className="px-4 py-2 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-600 text-white cursor-pointer transition-all shadow-xs flex items-center gap-1.5 mx-auto"
              >
                <span>🔄 Khôi phục và hiển thị lại ({rawServerCount} khuyến cáo)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {guidelineGroups.map((group) => {
            const isExpanded = expandedGuidelines[group.guideline_id] ?? true;
            const isProcessingThis = actionLoading === group.guideline_id;
            const isGroupAha = group.society?.toUpperCase().includes("AHA") || group.society?.toUpperCase().includes("ASA");
            const isGroupEso = group.society?.toUpperCase().includes("ESO");
            const viewMode = groupViewModes[group.guideline_id] ?? "table";

            return (
              <div
                key={group.guideline_id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  darkMode
                    ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
                }`}
              >
                {/* 4.1 GUIDELINE HEADER BAR */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                    {/* Society & Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide ${getSocietyStyle(group.society)}`}>
                        {group.society}
                      </span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                          darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {group.year || 2024}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        ⏳ {group.recommendations.length} Khuyến cáo
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        🏷️ {group.categories.length} Chuyên mục
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        ⚡ 96% AI Grounded
                      </span>
                    </div>

                    {/* Quick Guideline Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleOpenEditGuideline(group)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Chỉnh sửa thông tin tài liệu"
                      >
                        <span>✏️ Sửa</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() =>
                          setConfirmDialog({
                            isOpen: true,
                            type: "REJECT_GUIDELINE",
                            title: `Từ chối guideline "${group.guideline_title}"?`,
                            description: `Hành động này sẽ loại bỏ tài liệu này cùng toàn bộ ${group.recommendations.length} khuyến cáo khỏi hàng đợi kiểm duyệt.`,
                            confirmLabel: "✕ Xác nhận Từ chối",
                            confirmColor: "rose",
                            targetGuideline: group,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Từ chối tài liệu này"
                      >
                        <span>✕ Từ chối</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() =>
                          setConfirmDialog({
                            isOpen: true,
                            type: "APPROVE_GUIDELINE",
                            title: `Phê duyệt & Xuất bản Guideline?`,
                            description: `Xác nhận phê duyệt toàn bộ ${group.recommendations.length} khuyến cáo từ:\n"${group.guideline_title}" (${group.society})\nvào danh mục hướng dẫn lâm sàng chính thức?`,
                            confirmLabel: `✓ Phê duyệt (${group.recommendations.length} mục)`,
                            confirmColor: "emerald",
                            targetGuideline: group,
                          })
                        }
                        className="px-3.5 py-1 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        title="Phê duyệt toàn bộ khuyến cáo của guideline này"
                      >
                        <span>{isProcessingThis ? "Đang xử lý..." : "✓ Phê duyệt & Xuất bản"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Guideline Title */}
                  <h3 className="text-base sm:text-lg font-extrabold leading-snug text-slate-900 dark:text-white">
                    {group.guideline_title}
                  </h3>

                  {/* Toggle Accordion Clickable Banner */}
                  <div
                    onClick={() => toggleGuidelineExpand(group.guideline_id)}
                    className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 cursor-pointer select-none"
                  >
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span>📋</span>
                      <span>
                        {group.recommendations.length} khuyến cáo được phân loại vào {group.categories.length} chuyên mục lâm sàng
                      </span>
                    </span>

                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span>{isExpanded ? "Thu gọn ▴" : "Xem chi tiết & Kiểm duyệt ▾"}</span>
                    </span>
                  </div>
                </div>

                {/* 4.2 EXPANDED GUIDELINE BODY */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* View Switcher: Clinical Table vs Interactive Cards */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          {isGroupAha ? "Chuẩn AHA/ASA (Class & Level of Evidence)" : isGroupEso ? "Chuẩn ESO (GRADE & PICO Format)" : "Khuyến cáo lâm sàng"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setGroupViewModes((prev) => ({ ...prev, [group.guideline_id]: "table" }))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === "table"
                              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          📋 Dạng Bảng chuẩn
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroupViewModes((prev) => ({ ...prev, [group.guideline_id]: "cards" }))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === "cards"
                              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          🗂️ Dạng Thẻ chi tiết
                        </button>
                      </div>
                    </div>

                    {/* View 1: Clinical Practice Table */}
                    {viewMode === "table" ? (
                      isGroupAha ? (
                        <AhaGuidelineTable
                          title={`Khuyến cáo: ${group.guideline_title}`}
                          sections={group.categories.map((c) => ({
                            sectionTitle: c.name,
                            recommendations: c.items.map((it) => ({
                              id: it.rec_id,
                              cor: it.cor || "2a",
                              loe: it.loe || "B-NR",
                              statement: it.statement,
                              drivingTrials: it.driving_trials,
                            })),
                          }))}
                          darkMode={darkMode}
                          allowEdit={true}
                          onEditRec={(r) => {
                            const item = group.recommendations.find((x) => x.rec_id === r.id);
                            if (item) handleOpenEditRecommendation(item);
                          }}
                        />
                      ) : isGroupEso ? (
                        <EsoGuidelineTable
                          title={group.guideline_title}
                          picoItems={group.categories.map((c, cIdx) => ({
                            picoNumber: cIdx + 1,
                            picoQuestion: c.name,
                            recommendations: c.items.map((it, itIdx) => ({
                              number: itIdx + 1,
                              statement: it.statement,
                              qualityOfEvidence: it.quality_of_evidence || "Moderate",
                              strengthOfRecommendation: it.strength_of_recommendation || "Weak for intervention",
                            })),
                            expertConsensusStatement: c.items.find((x) => x.verbatim_quote)?.verbatim_quote,
                            voting: c.items.find((x) => x.voting)?.voting || "Vote: 10/10",
                          }))}
                          darkMode={darkMode}
                          allowEdit={true}
                        />
                      ) : (
                        <AhaGuidelineTable
                          title={`Khuyến cáo: ${group.guideline_title}`}
                          sections={group.categories.map((c) => ({
                            sectionTitle: c.name,
                            recommendations: c.items.map((it) => ({
                              id: it.rec_id,
                              cor: it.cor || "2a",
                              loe: it.loe || "B-NR",
                              statement: it.statement,
                              drivingTrials: it.driving_trials,
                            })),
                          }))}
                          darkMode={darkMode}
                          allowEdit={true}
                          onEditRec={(r) => {
                            const item = group.recommendations.find((x) => x.rec_id === r.id);
                            if (item) handleOpenEditRecommendation(item);
                          }}
                        />
                      )
                    ) : (
                      /* View 2: Interactive Recommendation Cards */
                      <div className="space-y-4">
                        {group.categories.map((category) => (
                          <div
                            key={category.name}
                            className={`p-3.5 sm:p-4 rounded-xl border text-xs leading-relaxed space-y-3 ${
                              darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-50/80 border-slate-200/80"
                            }`}
                          >
                            {/* Category Header */}
                            <div className="flex items-center justify-between gap-2 border-b pb-2 border-slate-200/60 dark:border-slate-800/60">
                              <div className="flex items-center gap-1.5">
                                <span className="text-amber-500">🏷️</span>
                                <span className="font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200 text-xs">
                                  {category.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {category.items.length} khuyến cáo
                              </span>
                            </div>

                            {/* Recommendations inside Category */}
                            <div className="space-y-2.5">
                              {category.items.map((item) => (
                                <div
                                  key={item.rec_id}
                                  className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                                    darkMode
                                      ? "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                                      : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
                                  }`}
                                >
                                  {/* Topic & Grade & Edit Button */}
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                        {item.topic || item.target_population || "Khuyến cáo lâm sàng"}
                                      </span>
                                      {item.page_num && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                          (Trang {item.page_num})
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      {item.cor && (
                                        <span
                                          className={`font-mono text-[10.5px] font-black px-2 py-0.5 rounded-md border ${getGradeBadgeStyle(
                                            item.cor
                                          )}`}
                                        >
                                          Class {item.cor} {item.loe ? `, Level ${item.loe}` : ""}
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditRecommendation(item)}
                                        className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/20 hover:text-amber-600 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                                        title="Chỉnh sửa nội dung, phân loại hoặc cấp độ khuyến cáo"
                                      >
                                        <span>✏️ Sửa</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Recommendation Statement */}
                                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                                    {item.statement}
                                  </p>

                                  {/* Sub-details: Target Population & Driving Trials */}
                                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                                    {item.target_population && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        <strong className="text-slate-700 dark:text-slate-300">Quần thể đích:</strong>{" "}
                                        {item.target_population}
                                      </span>
                                    )}

                                    {item.driving_trials && item.driving_trials.length > 0 && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        <strong className="text-slate-700 dark:text-slate-300">Thử nghiệm then chốt:</strong>{" "}
                                        {item.driving_trials.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom Action Footer for Guideline */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        🛡️ Sau khi phê duyệt, hướng dẫn sẽ xuất hiện ngay trong tab Practice Guidelines cho toàn bộ bác sĩ.
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() =>
                            setConfirmDialog({
                              isOpen: true,
                              type: "REJECT_GUIDELINE",
                              title: `Từ chối guideline "${group.guideline_title}"?`,
                              description: `Hành động này sẽ loại bỏ tài liệu này cùng toàn bộ ${group.recommendations.length} khuyến cáo khỏi hàng đợi kiểm duyệt.`,
                              confirmLabel: "✕ Xác nhận Từ chối",
                              confirmColor: "rose",
                              targetGuideline: group,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 cursor-pointer transition-colors"
                        >
                          ✕ Từ chối Guideline
                        </button>

                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() =>
                            setConfirmDialog({
                              isOpen: true,
                              type: "APPROVE_GUIDELINE",
                              title: `Phê duyệt & Xuất bản Guideline?`,
                              description: `Xác nhận phê duyệt toàn bộ ${group.recommendations.length} khuyến cáo từ:\n"${group.guideline_title}" (${group.society})\nvào danh mục hướng dẫn lâm sàng chính thức?`,
                              confirmLabel: `✓ Phê duyệt (${group.recommendations.length} mục)`,
                              confirmColor: "emerald",
                              targetGuideline: group,
                            })
                          }
                          className="px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        >
                          <span>{isProcessingThis ? "Đang phê duyệt..." : `✓ Phê duyệt & Xuất bản (${group.recommendations.length} khuyến cáo)`}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          5. CUSTOM CONFIRMATION ACTION DIALOG (REPLACES WINDOW.CONFIRM)
         ========================================================================= */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
              darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  confirmDialog.confirmColor === "emerald"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : confirmDialog.confirmColor === "rose"
                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                }`}
              >
                {confirmDialog.confirmColor === "emerald" ? "✓" : confirmDialog.confirmColor === "rose" ? "⚠️" : "ℹ️"}
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Xác nhận hành động kiểm duyệt
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.type === "APPROVE_GUIDELINE" && confirmDialog.targetGuideline) {
                    executeApproveGuideline(confirmDialog.targetGuideline);
                  } else if (confirmDialog.type === "REJECT_GUIDELINE" && confirmDialog.targetGuideline) {
                    executeRejectGuideline(confirmDialog.targetGuideline);
                  } else if (confirmDialog.type === "APPROVE_ALL") {
                    executeApproveAll();
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-xs transition-all cursor-pointer ${
                  confirmDialog.confirmColor === "emerald"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : confirmDialog.confirmColor === "rose"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. REUSABLE EDIT GUIDELINE / RECOMMENDATION MODAL
         ========================================================================= */}
      <EditGuidelineModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingGuidelineDoc(null);
          setEditingPracticeChange(null);
        }}
        docId={editingDocId}
        item={editingPracticeChange}
        guidelineDoc={editingGuidelineDoc}
        onSuccess={() => {
          fetchQueue();
          if (onQueueUpdated) onQueueUpdated();
          setFeedbackMessage({ type: "success", text: "✅ Thay đổi đã được lưu thành công!" });
        }}
        darkMode={darkMode}
      />
    </div>
  );
}
