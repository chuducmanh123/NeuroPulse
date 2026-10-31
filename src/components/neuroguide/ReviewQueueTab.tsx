"use client";

import React, { useState, useEffect, useMemo } from "react";
import { EditGuidelineModal } from "./EditGuidelineModal";
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
  onOpenPipelineModal?: () => void;
  onOpenNotebookLMModal?: () => void;
}

export function ReviewQueueTab({
  darkMode,
  onQueueUpdated,
  onOpenPipelineModal,
  onOpenNotebookLMModal,
}: ReviewQueueTabProps) {
  const [queue, setQueue] = useState<StoredRec[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterSociety, setFilterSociety] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Expanded state for each guideline card (default expanded true)
  const [expandedGuidelines, setExpandedGuidelines] = useState<Record<string, boolean>>({});

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

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/neuroguide/review-queue");
      const data = await res.json();
      if (data.ok && Array.isArray(data.queue)) {
        const dismissed = getDismissedRecIds();
        const activeQueue = data.queue.filter(
          (r: StoredRec) => !dismissed.has(r.rec_id) && r.approval_status === "PENDING_REVIEW"
        );
        setQueue(activeQueue);

        // Default all guidelines to expanded
        const initialExpanded: Record<string, boolean> = {};
        activeQueue.forEach((r: StoredRec) => {
          initialExpanded[r.guideline_id] = true;
        });
        setExpandedGuidelines(initialExpanded);
      }
    } catch (e) {
      console.error("Error loading review queue:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Group pending recommendations by Guideline
  const guidelineGroups = useMemo<PendingGuidelineGroup[]>(() => {
    const map = new Map<string, PendingGuidelineGroup>();

    const filtered = queue.filter((item) => {
      if (filterSociety === "ALL") return true;
      return item.society.toUpperCase().includes(filterSociety.toUpperCase());
    });

    for (const rec of filtered) {
      const gId = rec.guideline_id;
      if (!map.has(gId)) {
        map.set(gId, {
          guideline_id: gId,
          guideline_title: rec.guideline_title || "Hướng dẫn thực hành lâm sàng",
          society: rec.society || "AHA/ASA",
          year: rec.year || 2024,
          recommendations: [],
          categories: [],
        });
      }
      map.get(gId)!.recommendations.push(rec);
    }

    // Now group each guideline's recommendations by category
    const result: PendingGuidelineGroup[] = [];
    for (const group of map.values()) {
      const catMap = new Map<string, StoredRec[]>();
      for (const rec of group.recommendations) {
        const catName = rec.category || "Khuyến cáo chung";
        if (!catMap.has(catName)) {
          catMap.set(catName, []);
        }
        catMap.get(catName)!.push(rec);
      }

      group.categories = Array.from(catMap.entries()).map(([name, items]) => ({
        name,
        items,
      }));

      result.push(group);
    }

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
   * Phê duyệt toàn bộ một Guideline cụ thể với 1 lần bấm
   */
  const handleApproveGuideline = async (group: PendingGuidelineGroup) => {
    const confirmApprove = window.confirm(
      `Bác sĩ có chắc chắn muốn PHÊ DUYỆT & CÔNG BỐ TOÀN BỘ ${group.recommendations.length} khuyến cáo thuộc:\n\n"${group.guideline_title}" (${group.society})\n\nvào Hướng dẫn Thực hành lâm sàng chính thức?`
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
          `✅ Đã phê duyệt và công bố thành công Guideline "${group.guideline_title}" (${group.recommendations.length} khuyến cáo) vào Hướng dẫn Thực hành lâm sàng!`
        );
        setQueue((prev) => prev.filter((r) => r.guideline_id !== group.guideline_id));
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage(`⚠️ ${data.error || "Có lỗi xảy ra khi phê duyệt Guideline."}`);
      }
    } catch {
      setFeedbackMessage("⚠️ Lỗi kết nối khi gửi lệnh phê duyệt Guideline.");
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Từ chối toàn bộ một Guideline
   */
  const handleRejectGuideline = async (group: PendingGuidelineGroup) => {
    const confirmReject = window.confirm(
      `Bác sĩ có chắc chắn muốn TỪ CHỐI toàn bộ guideline:\n\n"${group.guideline_title}"?\n\nTất cả khuyến cáo sẽ bị loại khỏi hàng đợi duyệt.`
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
        setFeedbackMessage(`❌ Đã từ chối Guideline "${group.guideline_title}".`);
        setQueue((prev) => prev.filter((r) => r.guideline_id !== group.guideline_id));
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage(`⚠️ ${data.error || "Có lỗi khi từ chối Guideline."}`);
      }
    } catch {
      setFeedbackMessage("⚠️ Lỗi kết nối khi gửi lệnh từ chối.");
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Phê duyệt toàn bộ tất cả Guidelines đang có trong hàng đợi
   */
  const handleApproveAll = async () => {
    if (queue.length === 0) return;
    const confirmApprove = window.confirm(
      `Bác sĩ có chắc chắn muốn PHÊ DUYỆT TẤT CẢ ${guidelineGroups.length} Guideline (${queue.length} khuyến cáo) vào Hướng dẫn Thực hành chính thức?`
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
        setFeedbackMessage(`✅ ${data.message || `Đã phê duyệt toàn bộ ${queue.length} khuyến cáo!`}`);
        setQueue([]);
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage(`⚠️ ${data.error || "Có lỗi xảy ra khi phê duyệt toàn bộ."}`);
      }
    } catch {
      setFeedbackMessage("⚠️ Lỗi kết nối khi gửi lệnh phê duyệt toàn bộ.");
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Dọn dẹp PDF trên Vercel Blob
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
        setFeedbackMessage(`⚠️ ${data.error || "Lỗi dọn dẹp kho Vercel Blob."}`);
      }
    } catch {
      setFeedbackMessage("⚠️ Lỗi kết nối khi dọn dẹp Vercel Blob.");
    } finally {
      setCleanupLoading(false);
    }
  };

  /**
   * Mở modal chỉnh sửa Guideline metadata
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
    setEditingGuidelineDoc(docMeta);
    setEditingPracticeChange(null);
    setShowEditModal(true);
  };

  /**
   * Mở modal chỉnh sửa khuyến cáo đơn lẻ
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
      topic: rec.topic || rec.target_population || "Khuyến cáo lâm sàng",
      currentGrade,
      currentText: rec.statement,
      category: rec.category || "Khuyến cáo chung",
      drivingTrials: rec.driving_trials || [],
      changeType: "NEW",
    };

    setEditingDocId(rec.guideline_id);
    setEditingGuidelineDoc(null);
    setEditingPracticeChange(itemDetail);
    setShowEditModal(true);
  };

  // Helper cho màu sắc Hội chuyên khoa
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

  // Helper cho màu sắc COR / LOE
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
              GIAO DIỆN PHÊ DUYỆT GUIDELINE TOÀN DIỆN (REVIEW QUEUE)
            </h2>
          </div>
          <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Bác sĩ xem trước toàn bộ cấu trúc Guideline theo từng khối chuyên đề, chỉnh sửa trực tiếp và phê duyệt toàn bộ chỉ với 1 thao tác.
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
            <option value="ALL">Tất cả Hội chuyên khoa ({guidelineGroups.length} Guideline)</option>
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
            🔄 Tải lại
          </button>

          {onOpenNotebookLMModal && (
            <button
              onClick={onOpenNotebookLMModal}
              className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 ${
                darkMode
                  ? "bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900"
                  : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
              }`}
              title="Nhập và tạo Practice Guideline trực tiếp từ bảng tóm tắt NotebookLM"
            >
              <span>📝</span>
              <span>Nhập NotebookLM</span>
            </button>
          )}

          {queue.length > 0 && (
            <button
              disabled={actionLoading === "ALL"}
              onClick={handleApproveAll}
              className="text-xs px-3.5 py-1.5 rounded-lg font-black transition-all bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              title="Phê duyệt toàn bộ các guideline đang chờ duyệt vào Hướng dẫn Thực hành lâm sàng"
            >
              <span>{actionLoading === "ALL" ? "Đang xử lý..." : `✓ Phê duyệt tất cả (${queue.length} khuyến cáo)`}</span>
            </button>
          )}

          <button
            disabled={cleanupLoading}
            onClick={handleCleanupPdfs}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1 cursor-pointer ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
            title="Quét và xóa sạch các tệp PDF tạm trên Vercel Blob để bảo toàn dung lượng"
          >
            <span>🧹 {cleanupLoading ? "Đang xóa..." : "Xóa PDF Blob"}</span>
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
            Đang tải dữ liệu hàng đợi phê duyệt lâm sàng...
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
            Hàng đợi duyệt hiện đang trống!
          </h3>
          <p className={`text-xs mt-1.5 max-w-lg mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Tất cả khuyến cáo lâm sàng đã được phê duyệt hoặc tích hợp vào Hướng dẫn Thực hành chính thức. Khi tải lên hoặc phát hiện guideline mới, cấu trúc hoàn chỉnh sẽ xuất hiện tại đây để bác sĩ rà soát.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {guidelineGroups.map((group) => {
            const isExpanded = expandedGuidelines[group.guideline_id] ?? true;
            const isProcessingThis = actionLoading === group.guideline_id;

            return (
              <div
                key={group.guideline_id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  darkMode
                    ? "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200/90 shadow-sm hover:border-slate-300"
                }`}
              >
                {/* 1. Guideline Header Card (Styled exactly like Practice Guidelines) */}
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
                        ⏳ ĐANG CHỜ PHÊ DUYỆT ({group.recommendations.length} khuyến cáo)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        🏷️ {group.categories.length} Khối chuyên đề
                      </span>
                    </div>

                    {/* Top Action Buttons for this Guideline */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleOpenEditGuideline(group)}
                        className="px-2.5 py-1 rounded text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Chỉnh sửa tiêu đề, năm hoặc hội của Guideline này"
                      >
                        <span>✏️ Sửa Guideline</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleRejectGuideline(group)}
                        className="px-2.5 py-1 rounded text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Từ chối Guideline này và loại bỏ khỏi hàng đợi"
                      >
                        <span>✕ Từ chối</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleApproveGuideline(group)}
                        className="px-3.5 py-1 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        title="Phê duyệt toàn bộ guideline này và công bố vào Hướng dẫn Thực hành"
                      >
                        <span>{isProcessingThis ? "Đang xử lý..." : "✓ Phê duyệt Guideline"}</span>
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
                        {group.recommendations.length} Khuyến cáo lâm sàng phân loại theo {group.categories.length} khối chuyên đề
                      </span>
                    </span>

                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span>{isExpanded ? "Thu gọn ▴" : "Xem toàn bộ khuyến cáo & phê duyệt ▾"}</span>
                    </span>
                  </div>
                </div>

                {/* 2. Expanded Guideline Body (Exact Presentation as Practice Guidelines) */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-5">
                    {/* Notice & Human-in-the-Loop Workflow Callout */}
                    <div className="p-3.5 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💡</span>
                        <span>
                          Bác sĩ có thể chỉnh sửa bất kỳ khuyến cáo nào bằng cách bấm <strong>✏️ Sửa</strong>. Sau khi hoàn tất kiểm tra, bấm nút <strong>Phê duyệt toàn bộ</strong> ở dưới để đưa Guideline vào Hướng dẫn Thực hành lâm sàng.
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-400">
                        AI Grounding: 96%
                      </span>
                    </div>

                    {/* Full Structured Recommendations by Category */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                            📋 TOÀN BỘ KHUYẾN CÁO LÂM SÀNG THEO KHỐI CHUYÊN ĐỀ
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            ({group.recommendations.length} khuyến cáo)
                          </span>
                        </div>

                        <span className="text-[10.5px] text-slate-400 italic">
                          Tự động phân nhóm theo các phần chuyên khoa chính thức của guideline
                        </span>
                      </div>

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
                                {category.items.length} khuyến cáo
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
                                        title="Chỉnh sửa nội dung, phân loại COR/LOE hoặc chuyên mục"
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
                                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                                    {item.target_population && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        <strong className="text-slate-700 dark:text-slate-300">Đối tượng:</strong>{" "}
                                        {item.target_population}
                                      </span>
                                    )}

                                    {item.driving_trials && item.driving_trials.length > 0 && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        <strong className="text-slate-700 dark:text-slate-300">Thử nghiệm:</strong>{" "}
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
                    </div>

                    {/* Bottom Action Footer for the Whole Guideline */}
                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>🛡️ Sau khi phê duyệt, Guideline sẽ chuyển ngay sang tab Hướng dẫn Thực hành.</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleRejectGuideline(group)}
                          className="px-3 py-2 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 cursor-pointer transition-colors"
                        >
                          ✕ Từ chối Guideline này
                        </button>

                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() => handleApproveGuideline(group)}
                          className="px-4 py-2 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        >
                          <span>{isProcessingThis ? "Đang phê duyệt..." : `✓ Phê duyệt & Công bố toàn bộ Guideline (${group.recommendations.length} khuyến cáo)`}</span>
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
          setFeedbackMessage("✅ Đã lưu cập nhật chỉnh sửa thành công!");
        }}
        darkMode={darkMode}
      />
    </div>
  );
}
