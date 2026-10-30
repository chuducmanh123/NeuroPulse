"use client";

import React, { useState, useEffect } from "react";

interface StoredRec {
  rec_id: string;
  guideline_id: string;
  guideline_title: string;
  society: string;
  grading_system: string;
  page_num: number;
  statement: string;
  approval_status: string;
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

interface ReviewQueueTabProps {
  darkMode: boolean;
  onQueueUpdated?: () => void;
}

export function ReviewQueueTab({ darkMode, onQueueUpdated }: ReviewQueueTabProps) {
  const [queue, setQueue] = useState<StoredRec[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterSociety, setFilterSociety] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/neuroguide/review-queue");
      const data = await res.json();
      if (data.ok && Array.isArray(data.queue)) {
        setQueue(data.queue);
      }
    } catch (e) {
      console.error("Lỗi tải review queue:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleReviewAction = async (rec: StoredRec, action: "APPROVED" | "REJECTED") => {
    setActionLoading(rec.rec_id);
    setFeedbackMessage(null);
    try {
      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: rec.guideline_id,
          rec_id: rec.rec_id,
          action,
          reviewer: "BS. Chuyên khoa Thần kinh",
          notes: notes[rec.rec_id] || "",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setFeedbackMessage(
          action === "APPROVED"
            ? `✅ Đã phê duyệt và xuất bản khuyến cáo ${rec.rec_id} thành công!`
            : `❌ Đã từ chối khuyến cáo ${rec.rec_id}.`
        );
        // Xóa item khỏi hàng đợi cục bộ
        setQueue((prev) => prev.filter((r) => r.rec_id !== rec.rec_id));
        if (onQueueUpdated) onQueueUpdated();
      } else {
        alert(data.error || "Có lỗi xảy ra khi phê duyệt");
      }
    } catch (e) {
      alert("Lỗi kết nối khi gửi yêu cầu phê duyệt");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredQueue = queue.filter((item) => {
    if (filterSociety === "ALL") return true;
    return item.society.toUpperCase().includes(filterSociety.toUpperCase());
  });

  return (
    <div className="space-y-6">
      {/* Header Hàng đợi */}
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
              HÀNG ĐỢI KIỂM DUYỆT Y KHOA (HUMAN-IN-THE-LOOP)
            </h2>
          </div>
          <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Bác sĩ kiểm tra đối chiếu khuyến cáo do AI bóc tách với văn bản gốc trước khi công bố lên radar lâm sàng.
          </p>
        </div>

        {/* Lọc theo hiệp hội */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Lọc hội:</span>
          <select
            value={filterSociety}
            onChange={(e) => setFilterSociety(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${
              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <option value="ALL">Tất cả hiệp hội ({queue.length})</option>
            <option value="ESO">ESO (Đột quỵ Châu Âu)</option>
            <option value="AHA">AHA/ASA (Hoa Kỳ)</option>
            <option value="ILAE">ILAE (Động kinh)</option>
            <option value="NCS">NCS (Hồi sức Thần kinh)</option>
            <option value="PNS">PNS (Thần kinh Ngoại biên)</option>
          </select>
          <button
            onClick={fetchQueue}
            className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            🔄 Làm mới
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
          {feedbackMessage}
        </div>
      )}

      {/* Danh sách các khuyến cáo chờ duyệt */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-2"></div>
          <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Đang tải hàng đợi phê duyệt...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div
          className={`p-10 rounded-2xl border text-center ${
            darkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <span className="text-3xl mb-2 block">🎉</span>
          <h3 className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
            Hàng đợi đang trống!
          </h3>
          <p className={`text-xs mt-1 max-w-md mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Tất cả các khuyến cáo đã được duyệt hoặc chưa có tài liệu mới nào được bóc tách. Bạn có thể bấm nút &quot;Bóc tách Guideline Mới&quot; ở trên để nạp tài liệu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQueue.map((rec) => {
            const vDet = rec.verification_detail;
            const groundingPct = vDet ? Math.round(vDet.grounding_score * 100) : 100;

            return (
              <div
                key={rec.rec_id}
                className={`p-5 rounded-2xl border transition-all ${
                  darkMode
                    ? "bg-slate-900 border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
                }`}
              >
                {/* Header Thẻ Khuyến Cáo */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-md font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {rec.society}
                    </span>
                    <span className={`text-xs font-bold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                      {rec.guideline_title}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                      Trang PDF: {rec.page_num}
                    </span>
                  </div>

                  {/* ID Khuyến cáo */}
                  <span className="text-[10px] font-mono text-slate-400">ID: {rec.rec_id}</span>
                </div>

                {/* Phân loại & Mức độ Khuyến cáo (COR/LOE hoặc GRADE/Voting) */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {/* Trường hợp AHA/ASA */}
                  {rec.cor && (
                    <span
                      className={`text-xs px-2.5 py-1 rounded-md font-black border ${
                        rec.cor === "1"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                          : rec.cor === "2a"
                          ? "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-950 dark:text-lime-300"
                          : rec.cor === "2b"
                          ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300"
                      }`}
                    >
                      COR {rec.cor} {rec.cor_label ? `(${rec.cor_label})` : ""}
                    </span>
                  )}
                  {rec.loe && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      LOE: {rec.loe}
                    </span>
                  )}

                  {/* Trường hợp ESO / GRADE */}
                  {rec.pico_id && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-black bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300">
                      {rec.pico_id}
                    </span>
                  )}
                  {rec.quality_of_evidence && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                      Chất lượng bằng chứng: {rec.quality_of_evidence}
                    </span>
                  )}
                  {rec.strength_of_recommendation && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300">
                      Cường độ: {rec.strength_of_recommendation}
                    </span>
                  )}
                  {rec.voting && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border">
                      Bỏ phiếu: {rec.voting}
                    </span>
                  )}
                </div>

                {/* Toàn văn Câu Khuyến Cáo */}
                <div
                  className={`p-3.5 rounded-xl border mb-3 text-sm leading-relaxed ${
                    darkMode ? "bg-slate-950/60 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                >
                  <p className="font-medium">{rec.statement}</p>
                  {rec.target_population && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      <span className="font-semibold">Đối tượng áp dụng:</span> {rec.target_population}
                    </p>
                  )}
                </div>

                {/* Bảng Kiểm chứng Độc lập (Verification Shield) */}
                {vDet && (
                  <div
                    className={`p-3 rounded-lg border text-xs mb-3 flex flex-wrap items-center justify-between gap-2 ${
                      vDet.status === "PASSED"
                        ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300"
                        : "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900 text-amber-800 dark:text-amber-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold flex items-center gap-1">
                        🛡️ Kiểm chứng: {vDet.status}
                      </span>
                      <span>
                        Độ khớp văn bản gốc (Grounding): <strong>{groundingPct}%</strong>
                      </span>
                      <span>
                        Số liệu: <strong>{vDet.numbers_verified ? "Đã đối chiếu" : "Cần xem xét"}</strong>
                      </span>
                    </div>

                    {rec.verbatim_quote && (
                      <span className="italic text-[11px] max-w-sm truncate text-slate-500 dark:text-slate-400">
                        &quot;{rec.verbatim_quote}&quot;
                      </span>
                    )}
                  </div>
                )}

                {/* Thao tác Phê duyệt của Bác sĩ */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="Ghi chú lâm sàng của bác sĩ (tùy chọn)..."
                    value={notes[rec.rec_id] || ""}
                    onChange={(e) => setNotes({ ...notes, [rec.rec_id]: e.target.value })}
                    className={`text-xs px-3 py-2 rounded-lg border flex-1 min-w-[200px] ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-800"
                    }`}
                  />

                  <div className="flex items-center gap-2">
                    <button
                      disabled={actionLoading === rec.rec_id}
                      onClick={() => handleReviewAction(rec, "APPROVED")}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {actionLoading === rec.rec_id ? "Đang xử lý..." : "✓ Xác nhận & Xuất bản"}
                    </button>
                    <button
                      disabled={actionLoading === rec.rec_id}
                      onClick={() => handleReviewAction(rec, "REJECTED")}
                      className="px-3 py-2 rounded-lg text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 transition-all border border-rose-300 dark:border-rose-800 disabled:opacity-50"
                    >
                      ✕ Từ chối
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
