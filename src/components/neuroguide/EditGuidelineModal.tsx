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
      setCategory(item.category || "General Recommendations");
      setDrivingTrialsStr(item.drivingTrials?.join(", ") || "");
    } else if (guidelineDoc) {
      setDocTitle(guidelineDoc.title || "");
      setDocSociety(guidelineDoc.society || "");
      setDocYear(String(guidelineDoc.year || new Date().getFullYear()));
      setDocSummary(guidelineDoc.executiveSummary || guidelineDoc.executiveSummaryVi || "");
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
          setErrorMessage(data.error || "Unable to update guideline metadata.");
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
          setErrorMessage(data.error || "Unable to update recommendation.");
        }
      }
    } catch {
      setErrorMessage("Network error while saving modifications.");
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
              {isEditingDoc ? "Edit Guideline Metadata" : "Edit Clinical Recommendation"}
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
                <label className="block font-bold mb-1">Guideline Title:</label>
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
                  <label className="block font-bold mb-1">Medical Society:</label>
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
                  <label className="block font-bold mb-1">Publication Year:</label>
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
                <label className="block font-bold mb-1">Executive Summary:</label>
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
                  <label className="block font-bold mb-1">Recommendation Grade (COR / LOE):</label>
                  <input
                    type="text"
                    required
                    value={currentGrade}
                    placeholder="e.g. Class I, Level A or GRADE Strong"
                    onChange={(e) => setCurrentGrade(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-bold text-amber-600 dark:text-amber-400 ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Category / Section:</label>
                  <input
                    type="text"
                    value={category}
                    placeholder="e.g. Reperfusion Therapy"
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border font-medium ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Topic / Target Population:</label>
                <input
                  type="text"
                  required
                  value={topic}
                  placeholder="e.g. Patients with acute ischemic stroke within 4.5h"
                  onChange={(e) => setTopic(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-medium ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Full Recommendation Statement:</label>
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
                <label className="block font-bold mb-1">Cited Clinical Trials (comma-separated):</label>
                <input
                  type="text"
                  value={drivingTrialsStr}
                  placeholder="e.g. EXTEND-IA, SWIFT PRIME, DAWN, DEFUSE 3"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "✓ Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
