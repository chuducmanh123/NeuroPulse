"use client";

import React, { useState, useMemo } from "react";
import {
  ClinicalCase,
  CaseStatus,
  CaseDifficulty,
  CaseNeuroImaging,
} from "@/types/clinicalCase";
import { getSpecialtyTheme, DIFFICULTY_BADGES } from "../caseTheme";

interface AdminTabProps {
  darkMode: boolean;
  cases: ClinicalCase[];
  approvedCases: ClinicalCase[];
  dailyChallengeCases: ClinicalCase[];
  serverSyncSuccess: string;
  isSyncingServer: boolean;
  refreshCasesFromServer: () => Promise<void>;
  onPersistAdminCases: (nextCases: ClinicalCase[]) => Promise<void>;
  onSetActiveCaseId?: (id: string) => void;
  onPreviewCase: (c: ClinicalCase) => void;
  getLocalTodayIso: () => string;
  subspecialtyTabs: { label: string; value: string }[];
}

export function AdminTab({
  darkMode,
  cases,
  approvedCases,
  dailyChallengeCases,
  serverSyncSuccess,
  isSyncingServer,
  refreshCasesFromServer,
  onPersistAdminCases,
  onSetActiveCaseId,
  onPreviewCase,
  getLocalTodayIso,
  subspecialtyTabs,
}: AdminTabProps) {
  const [adminStatusFilter, setAdminStatusFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ClinicalCase | null>(null);
  const [adminScheduleDates, setAdminScheduleDates] = useState<Record<string, string>>({});

  const pendingCount = useMemo(
    () => cases.filter((c) => c.status === "pending" || c.status === "needs_revision").length,
    [cases]
  );

  const rejectedCount = useMemo(
    () => cases.filter((c) => c.status === "rejected").length,
    [cases]
  );

  const handleAdminUpdateStatus = (
    caseId: string,
    newStatus: CaseStatus,
    makeDaily = false,
    targetDailyDate?: string
  ) => {
    const todayIso = getLocalTodayIso();
    const targetCase = cases.find((c) => c.id === caseId);
    const chosenDate =
      targetDailyDate || targetCase?.published_date || todayIso;

    const nextCases = cases.map((c) => {
      if (c.id === caseId) {
        return {
          ...c,
          status: newStatus,
          is_daily_challenge: newStatus === "approved" ? makeDaily : false,
          archive_only: newStatus === "approved" ? !makeDaily : false,
          published_date: makeDaily ? chosenDate : c.published_date,
        };
      }
      if (makeDaily && c.is_daily_challenge && c.published_date === chosenDate) {
        return { ...c, is_daily_challenge: false, archive_only: true };
      }
      return c;
    });
    onPersistAdminCases(nextCases);
    if (makeDaily && chosenDate <= todayIso && onSetActiveCaseId) {
      onSetActiveCaseId(caseId);
    }
  };

  const handleStartFullEdit = (caseItem: ClinicalCase) => {
    setEditingCaseId(caseItem.id);
    const draft: ClinicalCase = JSON.parse(JSON.stringify(caseItem));
    if (!draft.presentation.vitals) {
      draft.presentation.vitals = { bp: "", hr: "", rr: "", temp: "", spo2: "" };
    }
    if (!Array.isArray(draft.presentation.imaging)) {
      draft.presentation.imaging = [];
    }
    setEditDraft(draft);
  };

  const handleAdminAddFigure = () => {
    if (!editDraft) return;
    const nextIdx = editDraft.presentation.imaging.length + 1;
    const newFig: CaseNeuroImaging = {
      modality: "Brain MRI (Multiplanar Sequences)",
      sequence_badge: `Figure ${nextIdx}`,
      figure_label: `Figure ${nextIdx}`,
      image_url: "",
      caption: "",
      findings_summary: "",
    };
    setEditDraft({
      ...editDraft,
      presentation: {
        ...editDraft.presentation,
        imaging: [...editDraft.presentation.imaging, newFig],
      },
    });
  };

  const handleAdminRemoveFigure = (figIdx: number) => {
    if (!editDraft) return;
    const nextImgs = editDraft.presentation.imaging.filter((_, idx) => idx !== figIdx);
    setEditDraft({
      ...editDraft,
      presentation: {
        ...editDraft.presentation,
        imaging: nextImgs,
      },
    });
  };

  const handleAdminFigureUpload = (figIdx: number, file: File) => {
    if (!file || !editDraft) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const webpUrl = canvas.toDataURL("image/webp", 0.85);
          const nextImgs = [...editDraft.presentation.imaging];
          nextImgs[figIdx] = { ...nextImgs[figIdx], image_url: webpUrl };
          setEditDraft({
            ...editDraft,
            presentation: {
              ...editDraft.presentation,
              imaging: nextImgs,
            },
          });
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAdminEdit = (caseId: string) => {
    if (!editDraft) return;
    const nextCases = cases.map((c) => (c.id === caseId ? editDraft : c));
    onPersistAdminCases(nextCases);
    setEditingCaseId(null);
    setEditDraft(null);
  };

  const setAdminPreviewCase = onPreviewCase;
  const SUBSPECIALTY_TABS = subspecialtyTabs;

  return (
          <div
            className={`p-6 rounded-2xl border space-y-5 ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {serverSyncSuccess && (
                  <span
                    className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border animate-fadeIn ${
                      serverSyncSuccess.startsWith("✓")
                        ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                        : "text-amber-500 bg-amber-500/10 border-amber-500/30"
                    }`}
                  >
                    {serverSyncSuccess}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshCasesFromServer}
                  disabled={isSyncingServer}
                  className="px-3 py-2 rounded-lg text-xs font-black bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  title="Reload and sync cases with cloud server (/api/neurocase)"
                >
                  <span className={isSyncingServer ? "animate-spin" : ""}>🔄</span>
                  <span>{isSyncingServer ? "Syncing..." : "Sync from Server"}</span>
                </button>
              </div>
            </div>

            {/* Grouped Status Sub-Tabs (Pending vs Approved vs Rejected) */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              {[
                {
                  id: "pending" as const,
                  label: "⏳ Pending Review",
                  count: pendingCount,
                  activeClass: "bg-amber-500 text-slate-950",
                },
                {
                  id: "approved" as const,
                  label: "✅ Approved & Published",
                  count: approvedCases.length,
                  activeClass: "bg-emerald-600 text-white",
                },
                {
                  id: "rejected" as const,
                  label: "🚫 Rejected",
                  count: rejectedCount,
                  activeClass: "bg-rose-600 text-white",
                },
              ].map((group) => {
                const isSelected = adminStatusFilter === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => {
                      setAdminStatusFilter(group.id);
                      setEditingCaseId(null);
                      setEditDraft(null);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                      isSelected
                        ? group.activeClass
                        : darkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    <span>{group.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                        isSelected
                          ? "bg-black/20 text-current"
                          : darkMode
                          ? "bg-slate-700 text-slate-300"
                          : "bg-white text-slate-600"
                      }`}
                    >
                      {group.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Filtered Case List by Status Group */}
            <div className="space-y-3">
              {(() => {
                const groupCases = cases.filter((c) => {
                  const st: CaseStatus = c.status || "approved";
                  if (adminStatusFilter === "pending") {
                    return st === "pending" || st === "needs_revision";
                  }
                  return st === adminStatusFilter;
                });

                if (groupCases.length === 0) {
                  return (
                    <div
                      className={`p-8 rounded-xl border border-dashed text-center space-y-2 ${
                        darkMode
                          ? "border-slate-800 text-slate-400"
                          : "border-slate-200 text-slate-500"
                      }`}
                    >
                      <p className="text-sm font-bold">
                        {adminStatusFilter === "pending"
                          ? "🎉 No cases waiting in the Pending Review queue."
                          : adminStatusFilter === "approved"
                          ? "No approved cases found."
                          : "No rejected cases."}
                      </p>
                      {adminStatusFilter === "pending" && (
                        <button
                          type="button"
                          onClick={() => setAdminStatusFilter("approved")}
                          className="text-xs font-bold text-indigo-500 hover:underline"
                        >
                          View {approvedCases.length} Approved &amp; Published Cases →
                        </button>
                      )}
                    </div>
                  );
                }

                return groupCases.map((c) => {
                  const st: CaseStatus = c.status || "approved";
                  const isEditing = editingCaseId === c.id && editDraft !== null;
                  const theme = getSpecialtyTheme(c.subspecialty);
                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-xl border border-l-4 transition-all shadow-xs ${
                        theme.borderLeft
                      } ${
                        st === "pending"
                          ? "border-amber-400/80 bg-amber-500/10 dark:bg-amber-950/20"
                          : st === "needs_revision"
                          ? "border-orange-400/80 bg-orange-500/10 dark:bg-orange-950/20"
                          : st === "rejected"
                          ? "border-rose-400/50 bg-rose-500/5 opacity-80"
                          : `${theme.cardBorder} ${theme.cardBg}`
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              st === "approved"
                                ? "bg-emerald-600 text-white"
                                : st === "pending"
                                ? "bg-amber-400 text-slate-950"
                                : st === "needs_revision"
                                ? "bg-orange-500 text-white"
                                : "bg-rose-600 text-white"
                            }`}
                          >
                            {st}
                          </span>
                          <span className="text-xs font-black">{c.case_code}</span>
                          <span className="text-xs text-slate-400 font-semibold">
                            {c.published_date}
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${theme.badge}`}>
                            {c.subspecialty}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              DIFFICULTY_BADGES[c.difficulty]
                            }`}
                          >
                            {c.difficulty}
                          </span>
                          {st === "approved" && c.is_daily_challenge ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">
                              {dailyChallengeCases[0]?.id === c.id
                                ? `⭐ Active Daily (${c.published_date})`
                                : c.published_date > new Date().toISOString().slice(0, 10)
                                ? `📅 Scheduled Daily (${c.published_date})`
                                : `🔥 Daily Track (${c.published_date})`}
                            </span>
                          ) : st === "approved" ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-600 text-white">
                              📚 Case Archive Only
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {(st !== "approved" || c.is_daily_challenge) && (
                            <button
                              type="button"
                              onClick={() => handleAdminUpdateStatus(c.id, "approved", false)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Approve and store in Case Archive without placing in Daily Challenge"
                            >
                              {st !== "approved"
                                ? "📚 Approve to Archive"
                                : "📚 Move to Archive Only"}
                            </button>
                          )}

                          <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/30 rounded px-1.5 py-0.5">
                            <input
                              type="date"
                              aria-label="Select Daily Challenge date"
                              value={adminScheduleDates[c.id] || c.published_date}
                              onChange={(e) =>
                                setAdminScheduleDates((prev) => ({
                                  ...prev,
                                  [c.id]: e.target.value,
                                }))
                              }
                              className="text-[11px] font-bold bg-transparent outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleAdminUpdateStatus(
                                  c.id,
                                  "approved",
                                  true,
                                  adminScheduleDates[c.id] || c.published_date
                                )
                              }
                              className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                              title="Publish or schedule as Daily Challenge on the selected date"
                            >
                              🔥 Set Daily Challenge
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAdminPreviewCase(c)}
                            className="px-2.5 py-1 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border border-indigo-500/30 flex items-center gap-1 transition-colors"
                            title="Preview case in clinical split-screen layout"
                          >
                            👁️ Preview Case
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingCaseId(null);
                                setEditDraft(null);
                              } else {
                                handleStartFullEdit(c);
                              }
                            }}
                            className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-700 text-white hover:bg-slate-600"
                          >
                            {isEditing ? "✕ Close Editor" : "✏️ Edit Case"}
                          </button>
                          {st === "approved" && (
                            <button
                              type="button"
                              onClick={() => handleAdminUpdateStatus(c.id, "pending", false)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                            >
                              ↩ Move to Pending
                            </button>
                          )}
                          {st !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => handleAdminUpdateStatus(c.id, "rejected", false)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-rose-600/80 text-white hover:bg-rose-600"
                            >
                              ✗ Reject
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditing && editDraft ? (
                        <div
                          className={`mt-4 pt-4 border-t space-y-4 text-xs ${
                            darkMode ? "border-slate-700" : "border-slate-200"
                          }`}
                        >
                          {/* 1. Metadata & Classification */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                              <label className="font-bold block mb-1">Case Title</label>
                              <input
                                value={editDraft.title}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, title: e.target.value })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">Subspecialty</label>
                              <select
                                value={editDraft.subspecialty}
                                aria-label="Edit subspecialty"
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    subspecialty: e.target.value,
                                    subspecialties: [e.target.value],
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              >
                                {SUBSPECIALTY_TABS.filter((t) => t.value !== "All").map((t) => (
                                  <option key={t.value} value={t.value}>
                                    {t.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="font-bold block mb-1">Difficulty</label>
                                <select
                                  value={editDraft.difficulty}
                                  aria-label="Edit difficulty"
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      difficulty: e.target.value as CaseDifficulty,
                                    })
                                  }
                                  className={`w-full p-2 rounded border ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-white border-slate-300 text-slate-900"
                                  }`}
                                >
                                  <option value="Resident">Resident</option>
                                  <option value="Fellow">Fellow</option>
                                  <option value="Attending">Attending</option>
                                </select>
                              </div>
                              <div>
                                <label className="font-bold block mb-1">Published Date</label>
                                <input
                                  type="date"
                                  value={editDraft.published_date}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      published_date: e.target.value,
                                    })
                                  }
                                  className={`w-full p-2 rounded border ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-white border-slate-300 text-slate-900"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Source, DOI & Author Credit */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="font-bold block mb-1">Source Journal / Reference</label>
                              <input
                                value={editDraft.source_journal?.name || ""}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    source_journal: {
                                      name: e.target.value,
                                      short_name: e.target.value.slice(0, 15),
                                      doi_url: editDraft.source_journal?.doi_url || "",
                                      pub_year:
                                        editDraft.source_journal?.pub_year ||
                                        (editDraft.published_date || new Date().toISOString()).slice(0, 4),
                                      pmcid: editDraft.source_journal?.pmcid,
                                      pmid: editDraft.source_journal?.pmid,
                                    },
                                  })
                                }
                                placeholder="e.g., NEJM, JAMA, Stroke, Clinical Submission"
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">Source DOI / URL</label>
                              <input
                                value={editDraft.source_journal?.doi_url || ""}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    source_journal: {
                                      name: editDraft.source_journal?.name || "Published Source",
                                      short_name: editDraft.source_journal?.short_name || "Source",
                                      doi_url: e.target.value,
                                      pub_year:
                                        editDraft.source_journal?.pub_year ||
                                        (editDraft.published_date || new Date().toISOString()).slice(0, 4),
                                      pmcid: editDraft.source_journal?.pmcid,
                                      pmid: editDraft.source_journal?.pmid,
                                    },
                                  })
                                }
                                placeholder="https://doi.org/10.1212/..."
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">Author / Credit</label>
                              <input
                                value={editDraft.author_credit || ""}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    author_credit: e.target.value,
                                  })
                                }
                                placeholder="Contributing author / institution..."
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                          </div>

                          {/* 2. Clinical Presentation (Demographics, HPI, Exam, Workup) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold block mb-1">Patient Demographics</label>
                              <input
                                value={editDraft.presentation.demographics}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      demographics: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">Past Medical History</label>
                              <input
                                value={editDraft.presentation.past_medical_history}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      past_medical_history: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="font-bold block mb-1">
                                History of Present Illness (HPI)
                              </label>
                              <textarea
                                rows={4}
                                value={editDraft.presentation.history_of_present_illness}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      history_of_present_illness: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">
                                Neurological Examination
                              </label>
                              <textarea
                                rows={4}
                                value={editDraft.presentation.neuro_exam}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      neuro_exam: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">
                                Key Labs, CSF &amp; Workup
                              </label>
                              <textarea
                                rows={4}
                                value={editDraft.presentation.key_labs_csf}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    presentation: {
                                      ...editDraft.presentation,
                                      key_labs_csf: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                          </div>

                          {/* 2b. Vital Signs Editor (Optional) */}
                          <div
                            className={`p-3 rounded-xl border space-y-2 ${
                              darkMode
                                ? "border-slate-800 bg-slate-950/60"
                                : "border-slate-200 bg-slate-50/70"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <span className="font-bold text-slate-300 text-xs">
                                Vital Signs (BP, HR, RR, Temp, SpO2)
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Leave blank if not recorded — will not be displayed to clinicians
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">BP</label>
                                <input
                                  value={editDraft.presentation.vitals?.bp || ""}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      presentation: {
                                        ...editDraft.presentation,
                                        vitals: {
                                          ...editDraft.presentation.vitals,
                                          bp: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  placeholder="130/80 mmHg"
                                  className={`w-full p-1.5 rounded border text-xs ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-white border-slate-300"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">HR</label>
                                <input
                                  value={editDraft.presentation.vitals?.hr || ""}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      presentation: {
                                        ...editDraft.presentation,
                                        vitals: {
                                          ...editDraft.presentation.vitals,
                                          hr: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  placeholder="76 bpm"
                                  className={`w-full p-1.5 rounded border text-xs ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-white border-slate-300"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">RR</label>
                                <input
                                  value={editDraft.presentation.vitals?.rr || ""}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      presentation: {
                                        ...editDraft.presentation,
                                        vitals: {
                                          ...editDraft.presentation.vitals,
                                          rr: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  placeholder="16 /min"
                                  className={`w-full p-1.5 rounded border text-xs ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-white border-slate-300"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">Temp</label>
                                <input
                                  value={editDraft.presentation.vitals?.temp || ""}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      presentation: {
                                        ...editDraft.presentation,
                                        vitals: {
                                          ...editDraft.presentation.vitals,
                                          temp: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  placeholder="36.8 °C"
                                  className={`w-full p-1.5 rounded border text-xs ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-white border-slate-300"
                                  }`}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-0.5">SpO2</label>
                                <input
                                  value={editDraft.presentation.vitals?.spo2 || ""}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      presentation: {
                                        ...editDraft.presentation,
                                        vitals: {
                                          ...editDraft.presentation.vitals,
                                          spo2: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                  placeholder="98%"
                                  className={`w-full p-1.5 rounded border text-xs ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-white border-slate-300"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 3. Figures Editor */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <label className="font-black uppercase text-indigo-500 block">
                                Clinical Figures &amp; Neuroimaging ({editDraft.presentation.imaging.length})
                              </label>
                              <button
                                type="button"
                                onClick={handleAdminAddFigure}
                                className="px-3 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 transition-colors"
                              >
                                <span>+</span>
                                <span>Add New Figure</span>
                              </button>
                            </div>

                            {editDraft.presentation.imaging.map((fig, fIdx) => (
                              <div
                                key={fIdx}
                                className={`p-3.5 rounded-xl border space-y-3 ${
                                  darkMode
                                    ? "bg-slate-950 border-slate-800"
                                    : "bg-white border-slate-200"
                                }`}
                              >
                                <div className="flex items-center justify-between pb-1 border-b border-slate-800/40">
                                  <span className="font-bold text-xs text-indigo-400">
                                    Figure {fIdx + 1}
                                  </span>
                                  {editDraft.presentation.imaging.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleAdminRemoveFigure(fIdx)}
                                      className="text-[11px] font-bold text-rose-500 hover:text-rose-400 hover:underline flex items-center gap-1"
                                    >
                                      🗑️ Remove Figure {fIdx + 1}
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                                  {/* Thumbnail & File Upload */}
                                  <div className="sm:col-span-4 space-y-2">
                                    <div className="relative rounded-lg border border-slate-700 bg-black/40 h-32 flex items-center justify-center overflow-hidden">
                                      {fig.image_url ? (
                                        <img
                                          src={fig.image_url}
                                          alt={`Figure ${fIdx + 1}`}
                                          className="h-full w-full object-contain"
                                        />
                                      ) : (
                                        <span className="text-[11px] text-slate-500 text-center px-2">
                                          No image loaded yet
                                        </span>
                                      )}
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                        📁 Upload / Replace from Computer:
                                      </label>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) handleAdminFigureUpload(fIdx, f);
                                        }}
                                        className="text-[11px] w-full"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                        Or Image URL / Local Path:
                                      </label>
                                      <input
                                        value={fig.image_url}
                                        onChange={(e) => {
                                          const nextImgs = [...editDraft.presentation.imaging];
                                          nextImgs[fIdx] = { ...fig, image_url: e.target.value };
                                          setEditDraft({
                                            ...editDraft,
                                            presentation: {
                                              ...editDraft.presentation,
                                              imaging: nextImgs,
                                            },
                                          });
                                        }}
                                        placeholder="/data/figures/... or https://..."
                                        className={`w-full p-1.5 rounded border text-xs ${
                                          darkMode
                                            ? "bg-slate-900 border-slate-700 text-white"
                                            : "bg-slate-50 border-slate-300"
                                        }`}
                                      />
                                    </div>
                                  </div>

                                  {/* Modality, Caption & Findings */}
                                  <div className="sm:col-span-8 space-y-2">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                        Modality (e.g. Brain MRI Axial FLAIR, CTA Head &amp; Neck)
                                      </label>
                                      <input
                                        value={fig.modality}
                                        onChange={(e) => {
                                          const nextImgs = [...editDraft.presentation.imaging];
                                          nextImgs[fIdx] = { ...fig, modality: e.target.value };
                                          setEditDraft({
                                            ...editDraft,
                                            presentation: {
                                              ...editDraft.presentation,
                                              imaging: nextImgs,
                                            },
                                          });
                                        }}
                                        className={`w-full p-1.5 rounded border text-xs ${
                                          darkMode
                                            ? "bg-slate-900 border-slate-700 text-white"
                                            : "bg-slate-50 border-slate-300"
                                        }`}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                        Published Figure Caption
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={fig.caption}
                                        onChange={(e) => {
                                          const nextImgs = [...editDraft.presentation.imaging];
                                          nextImgs[fIdx] = { ...fig, caption: e.target.value };
                                          setEditDraft({
                                            ...editDraft,
                                            presentation: {
                                              ...editDraft.presentation,
                                              imaging: nextImgs,
                                            },
                                          });
                                        }}
                                        className={`w-full p-1.5 rounded border text-xs ${
                                          darkMode
                                            ? "bg-slate-900 border-slate-700 text-white"
                                            : "bg-slate-50 border-slate-300"
                                        }`}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                                        Key Radiological / Diagnostic Findings Summary
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={fig.findings_summary}
                                        onChange={(e) => {
                                          const nextImgs = [...editDraft.presentation.imaging];
                                          nextImgs[fIdx] = { ...fig, findings_summary: e.target.value };
                                          setEditDraft({
                                            ...editDraft,
                                            presentation: {
                                              ...editDraft.presentation,
                                              imaging: nextImgs,
                                            },
                                          });
                                        }}
                                        className={`w-full p-1.5 rounded border text-xs ${
                                          darkMode
                                            ? "bg-slate-900 border-slate-700 text-white"
                                            : "bg-slate-50 border-slate-300"
                                        }`}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={handleAdminAddFigure}
                              className="w-full py-2 rounded-xl border border-dashed border-indigo-500/40 text-xs font-bold text-indigo-400 hover:bg-indigo-500/5 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>+</span>
                              <span>Add Another Figure (Multi-Figure Series)</span>
                            </button>
                          </div>

                          {/* 4. Question Prompt, Correct Option & All 4 Options (A, B, C, D) */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-3">
                              <label className="font-bold block mb-1">
                                Multiple-Choice Question Prompt
                              </label>
                              <input
                                value={editDraft.challenge.question}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    challenge: {
                                      ...editDraft.challenge,
                                      question: e.target.value,
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">Correct Option</label>
                              <select
                                value={editDraft.challenge.correct_option}
                                aria-label="Edit correct option"
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    challenge: {
                                      ...editDraft.challenge,
                                      correct_option: e.target.value as "A" | "B" | "C" | "D",
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border font-black ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-emerald-400"
                                    : "bg-white border-slate-300 text-emerald-700"
                                }`}
                              >
                                <option value="A">Option A</option>
                                <option value="B">Option B</option>
                                <option value="C">Option C</option>
                                <option value="D">Option D</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {editDraft.challenge.options.map((opt, oIdx) => (
                              <div
                                key={opt.id}
                                className={`p-3 rounded-lg border space-y-1.5 ${
                                  editDraft.challenge.correct_option === opt.id
                                    ? "border-emerald-500/60 bg-emerald-500/5"
                                    : darkMode
                                    ? "border-slate-800 bg-slate-950"
                                    : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black">Option {opt.id} Text</span>
                                  {editDraft.challenge.correct_option === opt.id && (
                                    <span className="text-[10px] font-bold text-emerald-500">
                                      ✓ Correct Option
                                    </span>
                                  )}
                                </div>
                                <input
                                  value={opt.text}
                                  onChange={(e) => {
                                    const nextOpts = [...editDraft.challenge.options];
                                    nextOpts[oIdx] = { ...opt, text: e.target.value };
                                    setEditDraft({
                                      ...editDraft,
                                      challenge: { ...editDraft.challenge, options: nextOpts },
                                    });
                                  }}
                                  className={`w-full p-1.5 rounded border ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-white"
                                      : "bg-slate-50 border-slate-300"
                                  }`}
                                />
                                <textarea
                                  rows={2}
                                  value={opt.rationale}
                                  onChange={(e) => {
                                    const nextOpts = [...editDraft.challenge.options];
                                    nextOpts[oIdx] = { ...opt, rationale: e.target.value };
                                    setEditDraft({
                                      ...editDraft,
                                      challenge: { ...editDraft.challenge, options: nextOpts },
                                    });
                                  }}
                                  placeholder={`Rationale for Option ${opt.id}...`}
                                  className={`w-full p-1.5 rounded border ${
                                    darkMode
                                      ? "bg-slate-900 border-slate-700 text-slate-300"
                                      : "bg-slate-50 border-slate-300"
                                  }`}
                                />
                              </div>
                            ))}
                          </div>

                          {/* 5. Final Diagnosis, Clinical Discussion, Teaching Points & Pitfalls */}
                          <div>
                            <label className="font-bold block mb-1">Final Clinical Diagnosis</label>
                            <input
                              value={editDraft.resolution.final_diagnosis}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  resolution: {
                                    ...editDraft.resolution,
                                    final_diagnosis: e.target.value,
                                  },
                                })
                              }
                              className={`w-full p-2 rounded border font-bold ${
                                darkMode
                                  ? "bg-slate-900 border-slate-700 text-emerald-400"
                                  : "bg-white border-slate-300 text-emerald-700"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="font-bold block mb-1">Clinical Discussion</label>
                            <textarea
                              rows={4}
                              value={editDraft.resolution.clinical_discussion}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  resolution: {
                                    ...editDraft.resolution,
                                    clinical_discussion: e.target.value,
                                  },
                                })
                              }
                              className={`w-full p-2 rounded border ${
                                darkMode
                                  ? "bg-slate-900 border-slate-700 text-white"
                                  : "bg-white border-slate-300 text-slate-900"
                              }`}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="font-bold block mb-1">
                                High-Yield Teaching Points
                              </label>
                              <textarea
                                rows={3}
                                value={editDraft.resolution.teaching_points.join("\n")}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    resolution: {
                                      ...editDraft.resolution,
                                      teaching_points: e.target.value
                                        .split("\n")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="font-bold block mb-1">
                                Clinical Pitfalls to Avoid
                              </label>
                              <textarea
                                rows={3}
                                value={editDraft.resolution.clinical_pitfalls.join("\n")}
                                onChange={(e) =>
                                  setEditDraft({
                                    ...editDraft,
                                    resolution: {
                                      ...editDraft.resolution,
                                      clinical_pitfalls: e.target.value
                                        .split("\n")
                                        .map((s) => s.trim())
                                        .filter(Boolean),
                                    },
                                  })
                                }
                                className={`w-full p-2 rounded border ${
                                  darkMode
                                    ? "bg-slate-900 border-slate-700 text-white"
                                    : "bg-white border-slate-300 text-slate-900"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCaseId(null);
                                setEditDraft(null);
                              }}
                              className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-600 text-white hover:bg-slate-500"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveAdminEdit(c.id)}
                              className="px-5 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                            >
                              💾 Save All Case Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-bold">{c.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Prompt: {c.challenge.question}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
  );
}
