"use client";

import React, { useState, useEffect } from "react";
import type { GuidelineDoc, PracticeChangeDetail } from "@/types/neuroguide";

interface EditGuidelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  item: PracticeChangeDetail | null;
  guidelineDoc: GuidelineDoc | null;
  onSuccess: () => void;
  darkMode: boolean;
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
  const [topic, setTopic] = useState("");
  const [currentGrade, setCurrentGrade] = useState("");
  const [currentText, setCurrentText] = useState("");
  const [category, setCategory] = useState("");
  const [drivingTrialsStr, setDrivingTrialsStr] = useState("");

  // Guideline info mode if item is null
  const isEditingDoc = !item && !!guidelineDoc;
  const [docTitle, setDocTitle] = useState("");
  const [docSociety, setDocSociety] = useState("");
  const [docYear, setDocYear] = useState("");
  const [docSummary, setDocSummary] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setTopic(item.topic || "");
      setCurrentGrade(item.currentGrade || "Class I, Level A");
      setCurrentText(item.currentText || "");
      setCategory(item.category || "Khuyến cáo chung");
      setDrivingTrialsStr(item.drivingTrials?.join(", ") || "");
    } else if (guidelineDoc) {
      setDocTitle(guidelineDoc.title || "");
      setDocSociety(guidelineDoc.society || "");
      setDocYear(String(guidelineDoc.year || new Date().getFullYear()));
      setDocSummary(guidelineDoc.executiveSummaryVi || guidelineDoc.executiveSummary || "");
    }
    setErrorMessage(null);
  }, [item, guidelineDoc, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (isEditingDoc && guidelineDoc) {
        // Edit Guideline metadata
        const res = await fetch("/api/neuroguide/review-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "EDIT_GUIDELINE",
            doc_id: docId,
            title: docTitle,
            society: docSociety,
            year: parseInt(docYear, 10),
            executiveSummary: docSummary,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(data.error || "Không thể cập nhật thông tin guideline.");
        }
      } else if (item) {
        // Edit single recommendation item
        const trials = drivingTrialsStr
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0);

        const updatedItem: PracticeChangeDetail = {
          ...item,
          topic,
          currentGrade,
          currentText,
          category,
          drivingTrials: trials,
        };

        const res = await fetch("/api/neuroguide/review-queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "EDIT_APPROVED",
            doc_id: docId,
            updated_item: updatedItem,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          onSuccess();
          onClose();
        } else {
          setErrorMessage(data.error || "Không thể cập nhật khuyến cáo.");
        }
      }
    } catch {
      setErrorMessage("Lỗi kết nối mạng khi lưu chỉnh sửa.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
          darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <h3 className="text-sm font-black uppercase tracking-wide">
              {isEditingDoc ? "Chỉnh sửa Thông tin Guideline" : "Chỉnh sửa Khuyến cáo Lâm sàng"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 mb-4 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isEditingDoc ? (
            <>
              <div>
                <label className="block font-bold mb-1">Tiêu đề Guideline:</label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-medium ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Hội chuyên khoa:</label>
                  <input
                    type="text"
                    required
                    value={docSociety}
                    onChange={(e) => setDocSociety(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-medium ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Năm phát hành:</label>
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
              </div>

              <div>
                <label className="block font-bold mb-1">Tóm tắt điều hành:</label>
                <textarea
                  rows={3}
                  value={docSummary}
                  onChange={(e) => setDocSummary(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-medium ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Mức độ khuyến cáo (Grade / COR / LOE):</label>
                  <input
                    type="text"
                    required
                    value={currentGrade}
                    placeholder="VD: Class I, Level A hoặc GRADE Strong"
                    onChange={(e) => setCurrentGrade(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold text-amber-600 dark:text-amber-400 ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Chuyên mục / Khối:</label>
                  <input
                    type="text"
                    value={category}
                    placeholder="VD: Điều trị Tái tưới máu"
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-medium ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Mục tiêu / Nhóm đối tượng (Topic / Target Population):</label>
                <input
                  type="text"
                  required
                  value={topic}
                  placeholder="VD: Bệnh nhân đột quỵ thiếu máu não cục bộ cấp tính trong 4.5h"
                  onChange={(e) => setTopic(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-medium ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Nội dung chỉ thị lâm sàng (Full Recommendation Statement):</label>
                <textarea
                  rows={4}
                  required
                  value={currentText}
                  onChange={(e) => setCurrentText(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-medium leading-relaxed ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Thử nghiệm lâm sàng dẫn chứng (phân tách bởi dấu phẩy):</label>
                <input
                  type="text"
                  value={drivingTrialsStr}
                  placeholder="VD: EXTEND-IA, SWIFT PRIME, DAWN, DEFUSE 3"
                  onChange={(e) => setDrivingTrialsStr(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-mono text-[11px] ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-800">
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
              className="px-4 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Đang lưu..." : "✓ Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
