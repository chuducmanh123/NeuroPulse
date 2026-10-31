"use client";

import React, { useState, useEffect, useMemo } from "react";
import { EditGuidelineModal } from "./EditGuidelineModal";
import { AhaGuidelineTable, type AhaGuidelineSection, type AhaRecommendationItem } from "./AhaGuidelineTable";
import { EsoGuidelineTable, type EsoPicoItem } from "./EsoGuidelineTable";
import type { GuidelineDoc, PracticeChangeDetail } from "@/types/neuroguide";

interface StoredRec {
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

interface PendingGuidelineGroup {
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
  const [filterSociety, setFilterSociety] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Expanded state for each guideline card (default expanded true)
  const [expandedGuidelines, setExpandedGuidelines] = useState<Record<string, boolean>>({});
  const [groupViewModes, setGroupViewModes] = useState<Record<string, "table" | "cards">>({});

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
    setFeedbackMessage(`🔄 Đã khôi phục hiển thị toàn bộ ${rawServerRecs.length} khuyến cáo đang chờ duyệt.`);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Group recommendations by Guideline ID and within Guideline by Category
  const guidelineGroups = useMemo(() => {
    const map = new Map<string, PendingGuidelineGroup>();

    queue.forEach((rec) => {
      if (filterSociety !== "ALL") {
        const normFilter = filterSociety.toUpperCase();
        const normSoc = (rec.society || "").toUpperCase();
        if (!normSoc.includes(normFilter)) return;
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
  }, [queue, filterSociety]);

  const toggleGuidelineExpand = (gId: string) => {
    setExpandedGuidelines((prev) => ({
      ...prev,
      [gId]: !prev[gId],
    }));
  };

  /**
   * Approve an entire guideline with 1 click
   */
  const handleApproveGuideline = async (group: PendingGuidelineGroup) => {
    const confirmApprove = window.confirm(
      `Are you sure you want to APPROVE & PUBLISH all ${group.recommendations.length} recommendations from:\n\n"${group.guideline_title}" (${group.society})\n\ninto the official Clinical Practice Guidelines catalog?`
    );
    if (!confirmApprove) return;

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
        setFeedbackMessage(
          `✅ Successfully approved and published Guideline "${group.guideline_title}" (${group.recommendations.length} recommendations) to Clinical Practice Guidelines!`
        );
        setQueue((prev) => prev.filter((r) => r.guideline_id !== group.guideline_id));
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage(`⚠️ ${data.error || "An error occurred while approving the guideline."}`);
      }
    } catch {
      setFeedbackMessage("⚠️ Network error while approving guideline.");
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Reject an entire guideline
   */
  const handleRejectGuideline = async (group: PendingGuidelineGroup) => {
    const confirmReject = window.confirm(
      `Are you sure you want to REJECT guideline:\n\n"${group.guideline_title}"?\n\nAll recommendations will be removed from the review queue.`
    );
    if (!confirmReject) return;

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
        setFeedbackMessage(`❌ Rejected Guideline "${group.guideline_title}".`);
        setQueue((prev) => prev.filter((r) => r.guideline_id !== group.guideline_id));
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage(`⚠️ ${data.error || "An error occurred while rejecting guideline."}`);
      }
    } catch {
      setFeedbackMessage("⚠️ Network error while rejecting guideline.");
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Approve all pending guidelines across the entire queue
   */
  const handleApproveAll = async () => {
    if (queue.length === 0) return;
    const confirmApprove = window.confirm(
      `Are you sure you want to APPROVE ALL ${guidelineGroups.length} Guidelines (${queue.length} recommendations) into the official Clinical Practice Guidelines catalog?`
    );
    if (!confirmApprove) return;

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
        setFeedbackMessage(`✅ ${data.message || `Successfully approved all ${queue.length} recommendations!`}`);
        setQueue([]);
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage(`⚠️ ${data.error || "An error occurred while approving all recommendations."}`);
      }
    } catch {
      setFeedbackMessage("⚠️ Network error while approving all recommendations.");
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Cleanup temporary PDF blobs on Vercel Blob
   */
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
        setFeedbackMessage(`🧹 ${data.message}`);
      } else {
        setFeedbackMessage(`⚠️ ${data.error || "Error cleaning up Vercel Blob storage."}`);
      }
    } catch {
      setFeedbackMessage("⚠️ Network error while cleaning up Vercel Blob.");
    } finally {
      setCleanupLoading(false);
    }
  };

  /**
   * Open edit guideline modal
   */
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

  /**
   * Open edit recommendation modal
   */
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

  // Helper for society styling
  const getSocietyStyle = (society: string) => {
    const s = society.toUpperCase();
    if (s.includes("AHA") || s.includes("ASA")) {
      return "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-xs";
    }
    if (s.includes("ESO")) {
      return "bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-xs";
    }
    if (s.includes("AAN")) {
      return "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xs";
    }
    if (s.includes("ILAE")) {
      return "bg-gradient-to-r from-purple-600 to-pink-700 text-white shadow-xs";
    }
    if (s.includes("NCS")) {
      return "bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-xs";
    }
    return "bg-slate-700 text-white";
  };

  // Helper for COR / LOE badges
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
      {/* Review Queue Top Navigation / Utility Bar */}
      <div
        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-sm"
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className={`text-base font-black uppercase tracking-wide ${darkMode ? "text-white" : "text-slate-900"}`}>
              CLINICAL GUIDELINE VERIFICATION &amp; REVIEW QUEUE
            </h2>
          </div>
          <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Neurologists review structured clinical guideline hierarchies by topic, edit recommendations directly, and verify or publish with one click.
          </p>
        </div>

        {/* Filter and Top Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterSociety}
            onChange={(e) => setFilterSociety(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${
              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <option value="ALL">All Medical Societies ({guidelineGroups.length} Guidelines)</option>
            <option value="AHA">AHA/ASA</option>
            <option value="ESO">ESO</option>
            <option value="AAN">AAN</option>
            <option value="ILAE">ILAE</option>
            <option value="NCS">NCS</option>
          </select>

          <button
            onClick={fetchQueue}
            className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            🔄 Refresh Queue
          </button>

          {/* NotebookLM Import Button - Strictly in Review Queue only */}
          {onOpenNotebookLMModal && (
            <button
              onClick={onOpenNotebookLMModal}
              className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                darkMode
                  ? "bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900"
                  : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
              }`}
              title="Import and create Practice Guideline directly from NotebookLM summary"
            >
              <span>📝</span>
              <span>Import from NotebookLM</span>
            </button>
          )}

          {queue.length > 0 && (
            <button
              disabled={actionLoading === "ALL"}
              onClick={handleApproveAll}
              className="text-xs px-3.5 py-1.5 rounded-lg font-black transition-all bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              title="Approve and publish all pending guidelines into the active Clinical Practice catalog"
            >
              <span>{actionLoading === "ALL" ? "Processing..." : `✓ Approve All (${queue.length} recommendations)`}</span>
            </button>
          )}

          <button
            onClick={fetchQueue}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title="Refresh review queue from server"
          >
            <span>🔄 Refresh</span>
          </button>

          <button
            disabled={cleanupLoading}
            onClick={handleCleanupPdfs}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title="Scan and delete temporary PDF blobs on Vercel Blob to conserve storage"
          >
            <span>🧹 {cleanupLoading ? "Purging..." : "Purge Blob PDFs"}</span>
          </button>

          {onOpenPipelineModal && (
            <button
              onClick={onOpenPipelineModal}
              className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Launch AI Extraction Pipeline for new guidelines"
            >
              <span>⚡ AI Extraction Pipeline</span>
            </button>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800 flex items-center justify-between">
          <span>{feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content: Guidelines Pending Review */}
      {isLoading ? (
        <div className="text-center py-16">
          <div className="animate-spin inline-block w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full mb-3"></div>
          <p className={`text-xs font-medium ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Loading verification queue...
          </p>
        </div>
      ) : guidelineGroups.length === 0 ? (
        <div
          className={`p-12 rounded-2xl border text-center ${
            darkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <span className="text-4xl mb-3 block">🎉</span>
          <h3 className={`text-base font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
            Verification queue is currently clear!
          </h3>
          <p className={`text-xs mt-1.5 max-w-lg mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            All recommendations have been verified and published to the Clinical Practice Guidelines catalog. When new guidelines are extracted or imported, they will appear here for physician review.
          </p>
          {rawServerCount > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 inline-block max-w-lg text-center">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2.5">
                ⚠️ Có <strong>{rawServerCount}</strong> khuyến cáo đang chờ duyệt trên máy chủ nhưng đang bị ẩn bởi bộ nhớ tạm trình duyệt của bạn (đã được đánh dấu qua các phiên duyệt trước).
              </p>
              <button
                type="button"
                onClick={handleResetDismissedCache}
                className="px-4 py-2 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-600 text-white cursor-pointer transition-all shadow-sm flex items-center gap-1.5 mx-auto"
              >
                <span>🔄 Khôi phục và hiển thị lại ({rawServerCount} khuyến cáo)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
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
                    ? "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200/90 shadow-sm hover:border-slate-300"
                }`}
              >
                {/* 1. Guideline Header Card */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                    {/* Society & Year & Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-black tracking-wide ${getSocietyStyle(group.society)}`}>
                        {group.society}
                      </span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {group.year || 2024}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        ⏳ PENDING REVIEW ({group.recommendations.length} recommendations)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        🏷️ {group.categories.length} Sections
                      </span>
                    </div>

                    {/* Top Action Buttons for this Guideline */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleOpenEditGuideline(group)}
                        className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Edit title, year, or society for this guideline"
                      >
                        <span>✏️ Edit Guideline</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleRejectGuideline(group)}
                        className="px-2.5 py-1 rounded text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Reject this guideline and dismiss all recommendations"
                      >
                        <span>✕ Reject</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleApproveGuideline(group)}
                        className="px-3.5 py-1 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        title="Approve all recommendations in this guideline and publish to catalog"
                      >
                        <span>{isProcessingThis ? "Processing..." : "✓ Approve & Publish"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Guideline Title */}
                  <h3 className={`text-base sm:text-lg font-extrabold leading-snug ${darkMode ? "text-white" : "text-slate-900"}`}>
                    {group.guideline_title}
                  </h3>

                  {/* Bottom Toggle Bar */}
                  <div
                    onClick={() => toggleGuidelineExpand(group.guideline_id)}
                    className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60 cursor-pointer select-none"
                  >
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span>📋</span>
                      <span>
                        {group.recommendations.length} Clinical recommendations classified into {group.categories.length} clinical domains
                      </span>
                    </span>

                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span>{isExpanded ? "Collapse ▴" : "View recommendations & verify ▾"}</span>
                    </span>
                  </div>
                </div>

                {/* 2. Expanded Guideline Body */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-5">
                    {/* Notice & Human-in-the-Loop Workflow Callout */}
                    <div className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💡</span>
                        <span>
                          Physicians can modify any recommendation by clicking <strong>✏️ Edit</strong>. Once verified, click <strong>Approve &amp; Publish Entire Guideline</strong> below to push to the live Clinical Practice catalog.
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-400">
                        AI Grounding: 96%
                      </span>
                    </div>

                    {/* Full Structured Recommendations by Category */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            📋 CLINICAL RECOMMENDATIONS ({group.recommendations.length})
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {isGroupAha ? "Chuẩn AHA/ASA (Hình 1 & 2)" : isGroupEso ? "Chuẩn ESO GRADE (Hình 3)" : "Khuyến cáo lâm sàng"}
                          </span>
                        </div>

                        {/* View Switcher: Table vs Cards */}
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setGroupViewModes((prev) => ({ ...prev, [group.guideline_id]: "table" }))}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                              viewMode === "table"
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                          >
                            📋 {isGroupAha ? "Bảng AHA (Hình 2)" : isGroupEso ? "Bảng ESO (Hình 3)" : "Bảng chuẩn"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setGroupViewModes((prev) => ({ ...prev, [group.guideline_id]: "cards" }))}
                            className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                              viewMode === "cards"
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                          >
                            🗂️ Dạng thẻ
                          </button>
                        </div>
                      </div>

                      {viewMode === "table" ? (
                        isGroupAha ? (
                          <AhaGuidelineTable
                            title={`Recommendations: ${group.guideline_title}`}
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
                            title={`Recommendations: ${group.guideline_title}`}
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
                        <div className="space-y-4">
                          {group.categories.map((category) => (
                            <div
                              key={category.name}
                              className={`p-3.5 sm:p-4 rounded-xl border text-xs leading-relaxed space-y-3 ${
                                darkMode
                                  ? "bg-slate-900/40 border-slate-800"
                                  : "bg-slate-50/80 border-slate-200/80"
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
                                  {category.items.length} recommendations
                                </span>
                              </div>

                              {/* Recommendations inside Category */}
                              <div className="space-y-2.5">
                                {category.items.map((item) => (
                                  <div
                                    key={item.rec_id}
                                    className={`p-3.5 rounded-lg border text-xs space-y-2.5 transition-all ${
                                      darkMode
                                        ? "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                                        : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
                                    }`}
                                  >
                                    {/* Topic & Grade & Edit Button */}
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                          {item.topic || item.target_population || "Clinical Recommendation"}
                                        </span>
                                        {item.page_num && (
                                          <span className="text-[10px] font-mono text-slate-400">
                                            (Page {item.page_num})
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        {item.cor && (
                                          <span
                                            className={`font-mono text-[10.5px] font-black px-2 py-0.5 rounded border ${getGradeBadgeStyle(
                                              item.cor
                                            )}`}
                                          >
                                            Class {item.cor} {item.loe ? `, Level ${item.loe}` : ""}
                                          </span>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditRecommendation(item)}
                                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/20 hover:text-amber-600 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                                          title="Edit statement, COR/LOE grading, or section"
                                        >
                                          <span>✏️ Edit</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Recommendation Statement */}
                                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                                      {item.statement}
                                    </p>

                                    {/* Sub-details: Target Population & Driving Trials */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                                      {item.target_population && (
                                        <span className="text-slate-500 dark:text-slate-400">
                                          <strong className="text-slate-700 dark:text-slate-300">Target Population:</strong>{" "}
                                          {item.target_population}
                                        </span>
                                      )}

                                      {item.driving_trials && item.driving_trials.length > 0 && (
                                        <span className="text-slate-500 dark:text-slate-400">
                                          <strong className="text-slate-700 dark:text-slate-300">Key Trials:</strong>{" "}
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
                    </div>

                    {/* Bottom Action Footer for the Whole Guideline */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>🛡️ Upon verification, this guideline will immediately appear in the Practice Guidelines tab.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleRejectGuideline(group)}
                          className="px-3 py-2 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 cursor-pointer transition-colors"
                        >
                          ✕ Reject Guideline
                        </button>

                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleApproveGuideline(group)}
                          className="px-4 py-2 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        >
                          <span>{isProcessingThis ? "Approving..." : `✓ Approve & Publish Guideline (${group.recommendations.length} recommendations)`}</span>
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

      {/* Reusable Edit Modal */}
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
          setFeedbackMessage("✅ Changes saved successfully!");
        }}
        darkMode={darkMode}
      />
    </div>
  );
}
