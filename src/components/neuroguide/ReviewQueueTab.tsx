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
  onOpenPipelineModal?: () => void;
}

export function ReviewQueueTab({ darkMode, onQueueUpdated, onOpenPipelineModal }: ReviewQueueTabProps) {
  const [queue, setQueue] = useState<StoredRec[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterSociety, setFilterSociety] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Read dismissed recommendation IDs from localStorage to prevent re-display
  const getDismissedRecIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem("neuroguide_reviewed_rec_ids");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const markRecAsReviewedLocally = (recId: string) => {
    try {
      const set = getDismissedRecIds();
      set.add(recId);
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
          reviewer: "Attending Neurologist",
          notes: notes[rec.rec_id] || "",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        markRecAsReviewedLocally(rec.rec_id);
        setFeedbackMessage(
          action === "APPROVED"
            ? `✅ Recommendation ${rec.rec_id} successfully approved and published into clinical practice!`
            : `❌ Recommendation ${rec.rec_id} rejected and excluded from official library.`
        );
        setQueue((prev) => prev.filter((r) => r.rec_id !== rec.rec_id));
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage(`⚠️ ${data.error || "An error occurred while processing recommendation"}`);
      }
    } catch (e) {
      setFeedbackMessage("⚠️ Network connection error while submitting review action");
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
      {/* Review Queue Header */}
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
              CLINICAL VALIDATION &amp; COORDINATION QUEUE (HUMAN-IN-THE-LOOP)
            </h2>
          </div>
          <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            Physicians inspect and cross-verify AI-extracted guideline recommendations against original source texts before official clinical deployment.
          </p>
        </div>

        {/* Society Filter */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Society:</span>
          <select
            value={filterSociety}
            onChange={(e) => setFilterSociety(e.target.value)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${
              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <option value="ALL">All Medical Societies ({queue.length})</option>
            <option value="ESO">ESO (European Stroke Organisation)</option>
            <option value="AHA">AHA/ASA (American Heart / Stroke Association)</option>
            <option value="AAN">AAN (American Academy of Neurology)</option>
            <option value="ILAE">ILAE (International League Against Epilepsy)</option>
            <option value="NCS">NCS (Neurocritical Care Society)</option>
            <option value="PNS">PNS (Peripheral Nerve Society)</option>
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
          {onOpenPipelineModal && (
            <button
              onClick={onOpenPipelineModal}
              className="text-xs px-3 py-1.5 rounded-lg font-bold transition-all bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs"
              title="Launch AI Extraction Pipeline for new guidelines"
            >
              <span>⚡ AI Extraction Pipeline</span>
            </button>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
          {feedbackMessage}
        </div>
      )}

      {/* Recommendations Pending Review */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mb-2"></div>
          <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Loading coordination validation queue...</p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div
          className={`p-10 rounded-2xl border text-center ${
            darkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <span className="text-3xl mb-2 block">🎉</span>
          <h3 className={`text-sm font-bold ${darkMode ? "text-white" : "text-slate-800"}`}>
            Validation Queue is Currently Empty!
          </h3>
          <p className={`text-xs mt-1 max-w-md mx-auto ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
            All recommendations have been clinically approved or rejected. Newly discovered guidelines from the 0:00 AM scan will automatically appear here following structured extraction.
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
                {/* Recommendation Card Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2.5 py-1 rounded-md font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {rec.society}
                    </span>
                    <span className={`text-xs font-bold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                      {rec.guideline_title}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                      Page: {rec.page_num}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">ID: {rec.rec_id}</span>
                </div>

                {/* Classification & Recommendation Grade (COR/LOE or GRADE/Voting) */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
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
                      COR: Class {rec.cor} {rec.cor_label ? `(${rec.cor_label})` : ""}
                    </span>
                  )}
                  {rec.loe && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      LOE: {rec.loe}
                    </span>
                  )}

                  {rec.pico_id && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-black bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300">
                      PICO: {rec.pico_id}
                    </span>
                  )}
                  {rec.quality_of_evidence && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                      Evidence Quality: {rec.quality_of_evidence}
                    </span>
                  )}
                  {rec.strength_of_recommendation && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-bold bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950 dark:text-teal-300">
                      Strength: {rec.strength_of_recommendation}
                    </span>
                  )}
                  {rec.voting && (
                    <span className="text-xs px-2.5 py-1 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border">
                      Panel Voting: {rec.voting}
                    </span>
                  )}
                </div>

                {/* Full Statement */}
                <div
                  className={`p-3.5 rounded-xl border mb-3 text-sm leading-relaxed ${
                    darkMode ? "bg-slate-950/60 border-slate-800 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                >
                  <p className="font-medium">{rec.statement}</p>
                  {rec.target_population && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      <span className="font-semibold">Target Population:</span> {rec.target_population}
                    </p>
                  )}
                </div>

                {/* Verification Shield */}
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
                        🛡️ AI Verification:{" "}
                        {vDet.status === "PASSED"
                          ? "VERIFIED PROTOCOL STANDARDS"
                          : "PENDING CLINICAL APPROVAL"}
                      </span>
                      <span>
                        Source Grounding: <strong>{groundingPct}%</strong>
                      </span>
                      <span>
                        Clinical Figures &amp; Numbers: <strong>{vDet.numbers_verified ? "Cross-Checked" : "Requires Review"}</strong>
                      </span>
                    </div>

                    {rec.verbatim_quote && (
                      <span className="italic text-[11px] max-w-sm truncate text-slate-500 dark:text-slate-400">
                        &quot;{rec.verbatim_quote}&quot;
                      </span>
                    )}
                  </div>
                )}

                {/* Clinician Review Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <input
                    type="text"
                    placeholder="Clinician review notes or modification rationale (optional)..."
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
                      {actionLoading === rec.rec_id ? "Processing..." : "✓ Approve &amp; Publish"}
                    </button>
                    <button
                      disabled={actionLoading === rec.rec_id}
                      onClick={() => handleReviewAction(rec, "REJECTED")}
                      className="px-3 py-2 rounded-lg text-xs font-bold bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900 dark:text-rose-300 transition-all border border-rose-300 dark:border-rose-800 disabled:opacity-50"
                    >
                      ✕ Reject Recommendation
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
