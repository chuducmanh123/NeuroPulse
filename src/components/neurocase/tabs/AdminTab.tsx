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

  // Search & Subspecialty Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [subspecialtyFilter, setSubspecialtyFilter] = useState("All");
  const [showTimeline, setShowTimeline] = useState(true);

  // Quick AI Draft Generator State
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [aiDraftText, setAiDraftText] = useState("");
  const [aiDraftSubspecialty, setAiDraftSubspecialty] = useState("Stroke");
  const [aiDraftDifficulty, setAiDraftDifficulty] = useState<CaseDifficulty>("Resident");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [aiDraftError, setAiDraftError] = useState("");

  // Compute next 14 days for visual Daily Challenge timeline
  const next14Days = useMemo(() => {
    const dates: { dateStr: string; label: string; dayName: string; isToday: boolean }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      dates.push({ dateStr, label, dayName, isToday: i === 0 });
    }
    return dates;
  }, []);

  const pendingCount = useMemo(
    () => cases.filter((c) => c.status === "pending" || c.status === "needs_revision").length,
    [cases]
  );

  const rejectedCount = useMemo(
    () => cases.filter((c) => c.status === "rejected").length,
    [cases]
  );

  // Generate Quick Case Draft from clinical summary
  const handleGenerateCaseDraft = async () => {
    if (!aiDraftText.trim()) {
      setAiDraftError("Please enter a clinical case summary, HPI, or diagnosis.");
      return;
    }
    setIsGeneratingDraft(true);
    setAiDraftError("");

    try {
      const todayIso = getLocalTodayIso();
      const newId = `nc-admin-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const generatedCode = `NC-${aiDraftSubspecialty.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      // Deterministic structured case construction from input
      const lines = aiDraftText.split("\n").map((l) => l.trim()).filter(Boolean);
      const firstLine = lines[0] || "Acute Neurological Clinical Challenge";
      const cleanTitle = firstLine.length > 80 ? firstLine.slice(0, 77) + "..." : firstLine;

      const newCase: ClinicalCase = {
        id: newId,
        case_code: generatedCode,
        title: cleanTitle,
        subspecialty: aiDraftSubspecialty,
        subspecialties: [aiDraftSubspecialty],
        difficulty: aiDraftDifficulty,
        estimated_time_sec: 180,
        published_date: todayIso,
        status: "pending",
        is_daily_challenge: false,
        archive_only: false,
        source_journal: {
          name: "NeuroPulse Clinical Ingestion",
          short_name: "NeuroPulse",
          doi_url: "https://doi.org/10.1212/WNL.0000000000000000",
          pub_year: new Date().getFullYear().toString(),
        },
        author_credit: "NeuroPulse Editorial Board",
        presentation: {
          demographics: "Adult patient presenting with acute neurological symptoms",
          chief_complaint: lines[0] || "Acute neurological deficit",
          history_of_present_illness: aiDraftText,
          past_medical_history: "Hypertension, Hyperlipidemia. Baseline medications: Aspirin 81mg daily, Atorvastatin 20mg",
          neuro_exam: "Alert and oriented. Cranial nerves intact. Motor power asymmetric. Reflexes brisk.",
          key_labs_csf: "Complete Blood Count, Metabolic Panel, Coagulation Profile within normal limits.",
          vitals: {
            bp: "142/86 mmHg",
            hr: "76 bpm",
            rr: "16 /min",
            temp: "36.8 °C",
            spo2: "98% room air",
          },
          imaging: [
            {
              modality: "Brain MRI (DWI / FLAIR)",
              sequence_badge: "DWI / ADC",
              figure_label: "Figure 1",
              image_url: "",
              caption: "Axial Brain MRI illustrating acute parenchymal signal alteration.",
              findings_summary: "High DWI signal intensity with corresponding ADC hypointensity confirming acute pathology.",
            },
          ],
        },
        challenge: {
          question: `Based on the clinical presentation and neuroimaging, what is the most appropriate next step in management?`,
          question_type: "Next Best Step",
          correct_option: "A",
          options: [
            {
              id: "A",
              text: "Initiate targeted guideline-directed therapy and continuous neuro-monitoring.",
              peer_percentage: 68,
              rationale: "Recommended first-line acute management consistent with current clinical guidelines.",
            },
            {
              id: "B",
              text: "Observation alone without acute neurovascular intervention.",
              peer_percentage: 12,
              rationale: "Passive monitoring risks secondary neurological deterioration in this acute presentation.",
            },
            {
              id: "C",
              text: "Immediate invasive biopsy prior to noninvasive diagnostic evaluation.",
              peer_percentage: 8,
              rationale: "Invasive biopsy is premature before completing standard neurovascular and contrast imaging.",
            },
            {
              id: "D",
              text: "High-dose immunosuppression prior to ruling out infectious etiologies.",
              peer_percentage: 12,
              rationale: "Empiric immunosuppression without ruling out acute infection carries significant hazard.",
            },
          ],
        },
        resolution: {
          final_diagnosis: cleanTitle,
          clinical_discussion: "Targeted therapy guided by acute clinical presentation is supported by Level A evidence.",
          teaching_points: [
            "Rapid recognition of acute focal deficits significantly reduces treatment delay.",
            "Always correlate multimodal neuroimaging findings with the clinical vascular territory.",
          ],
          clinical_pitfalls: [
            "Overlooking subtle focal signs or delaying imaging protocol.",
            "Premature invasive procedures before noninvasive vascular review.",
          ],
          related_keywords: [aiDraftSubspecialty, "Acute Care", "Clinical Guideline"],
        },
      };

      const nextCases = [newCase, ...cases];
      await onPersistAdminCases(nextCases);
      setEditingCaseId(newCase.id);
      setEditDraft(newCase);
      setShowAiDraftModal(false);
      setAiDraftText("");
      setAdminStatusFilter("pending");
    } catch (e: any) {
      setAiDraftError(e?.message || "Error generating case draft.");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

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
        className={`p-6 rounded-2xl border border-l-4 border-l-amber-500 space-y-5 ${
          darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        {/* Grouped Status Sub-Tabs (Pending vs Approved vs Rejected) + Server Sync */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => setShowAiDraftModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Quickly generate a structured case draft from clinical summary"
            >
              <span>⚡</span>
              <span>Quick Case Draft</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTimeline((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                showTimeline
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : darkMode
                  ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              }`}
              title="Toggle visual 14-day Daily Challenge Scheduler"
            >
              <span>📅</span>
              <span>Schedule Timeline</span>
            </button>

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

        {/* VISUAL 14-DAY DAILY CHALLENGE TIMELINE */}
        {showTimeline && (
          <div
            className={`p-4 rounded-xl border transition-all ${
              darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200 shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📅</span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Daily Challenge Schedule (Next 14 Days)
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                Shows active case coverage for the next 2 weeks
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 overflow-x-auto pb-1">
              {next14Days.map((d) => {
                const assignedCase = cases.find(
                  (c) => c.is_daily_challenge && c.published_date === d.dateStr
                );
                return (
                  <div
                    key={d.dateStr}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between text-xs transition-all ${
                      d.isToday
                        ? "border-indigo-500 bg-indigo-500/10 shadow-xs"
                        : assignedCase
                        ? darkMode
                          ? "border-slate-700 bg-slate-900"
                          : "border-slate-200 bg-white"
                        : darkMode
                        ? "border-dashed border-slate-800 bg-slate-900/30 text-slate-500"
                        : "border-dashed border-slate-300 bg-slate-100/50 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] text-slate-500 dark:text-slate-400">
                        {d.dayName}
                      </span>
                      <div className="flex items-center gap-1">
                        {d.isToday && (
                          <span className="text-[9px] font-black uppercase px-1 rounded bg-indigo-500 text-white">
                            Today
                          </span>
                        )}
                        <span className="font-extrabold text-[11px]">{d.label}</span>
                      </div>
                    </div>

                    {assignedCase ? (
                      <div className="mt-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400">
                            {assignedCase.case_code}
                          </span>
                        </div>
                        <p className="font-semibold text-[11px] line-clamp-1 text-slate-800 dark:text-slate-200">
                          {assignedCase.title}
                        </p>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold inline-block mt-0.5">
                          {assignedCase.subspecialty}
                        </span>
                      </div>
                    ) : (
                      <div className="py-2 text-center text-[10.5px] italic text-amber-600 dark:text-amber-400 font-medium">
                        Unscheduled
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SEARCH & SUBSPECIALTY FILTER BAR */}
        <div
          className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2.5 ${
            darkMode ? "bg-slate-950/40 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cases by code, title, or clinical presentation..."
                className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border outline-none transition-all ${
                  darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-[11px] font-bold text-slate-500">Subspecialty:</label>
            <select
              value={subspecialtyFilter}
              onChange={(e) => setSubspecialtyFilter(e.target.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border outline-none ${
                darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <option value="All">All Subspecialties</option>
              {SUBSPECIALTY_TABS.filter((t) => t.value !== "All").map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtered Case List by Status Group */}
        <div className="space-y-3">
          {(() => {
            const groupCases = cases.filter((c) => {
              const st: CaseStatus = c.status || "approved";
              let matchStatus = false;
              if (adminStatusFilter === "pending") {
                matchStatus = st === "pending" || st === "needs_revision";
              } else {
                matchStatus = st === adminStatusFilter;
              }
              if (!matchStatus) return false;

              if (subspecialtyFilter !== "All" && c.subspecialty !== subspecialtyFilter) {
                return false;
              }

              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchCode = c.case_code?.toLowerCase().includes(q);
                const matchTitle = c.title?.toLowerCase().includes(q);
                const matchDiagnosis = c.presentation?.chief_complaint?.toLowerCase().includes(q);
                const matchHpi = c.presentation?.history_of_present_illness?.toLowerCase().includes(q);
                if (!matchCode && !matchTitle && !matchDiagnosis && !matchHpi) {
                  return false;
                }
              }

              return true;
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
                            Prompt: {c.challenge?.question || c.title}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* QUICK AI CASE DRAFT MODAL */}
            {showAiDraftModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
                <div
                  className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl space-y-4 ${
                    darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚡</span>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wide">Quick Case Draft Generator</h4>
                        <p className="text-[11px] text-slate-400">Generate structured Clinical Case draft directly into Pending queue</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAiDraftModal(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-400 mb-1">Subspecialty &amp; Difficulty</label>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={aiDraftSubspecialty}
                          onChange={(e) => setAiDraftSubspecialty(e.target.value)}
                          className={`p-2 rounded-xl border text-xs font-bold ${
                            darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          {SUBSPECIALTY_TABS.filter((t) => t.value !== "All").map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={aiDraftDifficulty}
                          onChange={(e) => setAiDraftDifficulty(e.target.value as CaseDifficulty)}
                          className={`p-2 rounded-xl border text-xs font-bold ${
                            darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <option value="Resident">Resident</option>
                          <option value="Fellow">Fellow</option>
                          <option value="Attending">Attending</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-400 mb-1">
                        Clinical Presentation / HPI / Case Summary:
                      </label>
                      <textarea
                        rows={5}
                        value={aiDraftText}
                        onChange={(e) => setAiDraftText(e.target.value)}
                        placeholder="Paste patient presentation, history of present illness, examination, or article abstract..."
                        className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-amber-500 ${
                          darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>

                    {aiDraftError && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-medium">
                        {aiDraftError}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAiDraftModal(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingDraft}
                      onClick={handleGenerateCaseDraft}
                      className="px-4 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-md disabled:opacity-50"
                    >
                      {isGeneratingDraft ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating Draft...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Generate Case Draft</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
  );
}
