"use client";

import React, { useState, useEffect } from "react";
import type {
  ConferenceEvent,
  LateBreakingTrial,
  SubspecialtyType,
} from "@/types/neuroguide";
import { NEUROLOGY_SUBSPECIALTIES } from "@/types/neuroguide";
import { getAdminHeaders, getStoredAdminToken } from "@/utils/clientAuth";

interface ConferenceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  conference: ConferenceEvent | null;
  onSuccess: (updatedConferences: ConferenceEvent[], savedConf: ConferenceEvent) => void;
  darkMode: boolean;
  adminToken?: string;
}

const DEFAULT_TRIAL = (): LateBreakingTrial => ({
  id: `trial-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  trialAcronym: "",
  title: "",
  studyDesign: "Phase 3 RCT",
  subspecialty: "Stroke",
  verdict: "POSITIVE",
  isPracticeChanging: false,
  publishedJournal: "",
  fullTextUrl: "",
  populationSummary: "",
  interventionGroup: "",
  controlGroup: "",
  primaryOutcome: "",
  safetyOutcome: "",
  bottomLineTakeaway: "",
});

export function ConferenceEditModal({
  isOpen,
  onClose,
  conference,
  onSuccess,
  darkMode,
  adminToken,
}: ConferenceEditModalProps) {
  const isEditing = Boolean(conference);

  const [acronym, setAcronym] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [status, setStatus] = useState<"LIVE" | "RECENT" | "UPCOMING">("UPCOMING");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dates, setDates] = useState("");
  const [location, setLocation] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [subspecialties, setSubspecialties] = useState<SubspecialtyType[]>(["Stroke"]);
  const [trials, setTrials] = useState<LateBreakingTrial[]>([]);
  const [expandedTrialIdx, setExpandedTrialIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (conference) {
      setAcronym(conference.acronym || "");
      setName(conference.name || "");
      setYear(conference.year || new Date().getFullYear());
      setStatus(conference.status || "RECENT");
      setStartDate(conference.startDate || "");
      setEndDate(conference.endDate || "");
      setDates(conference.dates || "");
      setLocation(conference.location || "");
      setOfficialUrl(conference.officialUrl || "");
      setExecutiveSummary(conference.executiveSummary || "");
      setSubspecialties(
        Array.isArray(conference.subspecialties) && conference.subspecialties.length > 0
          ? conference.subspecialties
          : ["Stroke"]
      );
      setTrials(Array.isArray(conference.lateBreakingTrials) ? conference.lateBreakingTrials : []);
      setExpandedTrialIdx(null);
    } else {
      const currentYear = new Date().getFullYear();
      setAcronym("");
      setName("");
      setYear(currentYear);
      setStatus("UPCOMING");
      setStartDate(`${currentYear}-01-01`);
      setEndDate("");
      setDates("");
      setLocation("");
      setOfficialUrl("");
      setExecutiveSummary("");
      setSubspecialties(["Stroke"]);
      setTrials([]);
      setExpandedTrialIdx(null);
    }
  }, [isOpen, conference]);

  if (!isOpen) return null;

  const toggleSubspecialty = (sub: SubspecialtyType) => {
    setSubspecialties((prev) => {
      if (prev.includes(sub)) {
        return prev.length > 1 ? prev.filter((s) => s !== sub) : prev;
      }
      return [...prev, sub];
    });
  };

  const handleAddTrial = () => {
    const newTrial = DEFAULT_TRIAL();
    setTrials((prev) => {
      const next = [...prev, newTrial];
      setExpandedTrialIdx(next.length - 1);
      return next;
    });
  };

  const handleUpdateTrial = (idx: number, patch: Partial<LateBreakingTrial>) => {
    setTrials((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const handleRemoveTrial = (idx: number) => {
    setTrials((prev) => prev.filter((_, i) => i !== idx));
    setExpandedTrialIdx((prev) => (prev === idx ? null : prev !== null && prev > idx ? prev - 1 : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acronym.trim() || !name.trim()) {
      setError("Vui lòng nhập Acronym và Tên hội nghị.");
      return;
    }

    setSaving(true);
    setError(null);

    const slug = acronym
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const confId = conference?.id || `conf-${slug || Date.now()}-${year}`;

    const cleanTrials = trials.filter((t) => t.trialAcronym.trim() || t.title.trim());
    const payloadConf: ConferenceEvent = {
      id: confId,
      acronym: acronym.trim(),
      name: name.trim(),
      year: Number(year) || new Date().getFullYear(),
      startDate: startDate.trim() || `${year}-01-01`,
      endDate: endDate.trim() || undefined,
      subspecialties,
      dates: dates.trim() || startDate.trim() || String(year),
      location: location.trim(),
      status,
      officialUrl: officialUrl.trim(),
      executiveSummary: executiveSummary.trim(),
      stats: {
        totalLateBreakingTrials: cleanTrials.length,
        positiveTrials: cleanTrials.filter((t) => t.verdict === "POSITIVE").length,
        practiceChangingCount: cleanTrials.filter((t) => t.isPracticeChanging).length,
      },
      lateBreakingTrials: cleanTrials,
    };

    try {
      const token = adminToken || getStoredAdminToken();
      const res = await fetch("/api/neuroguide/conferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(token),
        },
        body: JSON.stringify({
          action: "upsert_conference",
          conference: payloadConf,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Không thể lưu hội nghị.");
        setSaving(false);
        return;
      }
      onSuccess(Array.isArray(data.conferences) ? data.conferences : [payloadConf], payloadConf);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lỗi kết nối khi lưu hội nghị.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = `w-full px-3 py-2 rounded-xl border text-xs sm:text-sm outline-none transition-colors ${
    darkMode
      ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-amber-500"
      : "bg-white border-slate-300 text-slate-900 focus:border-amber-500"
  }`;

  const labelCls = "block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl p-5 sm:p-6 ${
          darkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200/70 dark:border-slate-800">
          <div>
            <h2 className="font-journal text-lg sm:text-xl font-bold">
              {isEditing ? `✏️ Chỉnh sửa Conference: ${conference?.acronym}` : "➕ Thêm Conference mới"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Cập nhật thông tin hội nghị và danh sách Late-Breaking Trials.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Acronym *</label>
              <input
                type="text"
                value={acronym}
                onChange={(e) => setAcronym(e.target.value)}
                placeholder="e.g. ESOC 2026"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Year *</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "LIVE" | "RECENT" | "UPCOMING")}
                className={inputCls}
              >
                <option value="LIVE">🔴 LIVE</option>
                <option value="RECENT">🟡 RECENT</option>
                <option value="UPCOMING">⚪ UPCOMING</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Conference Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. European Stroke Organisation Conference"
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Start Date (ISO)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>End Date (ISO)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Display Dates</label>
              <input
                type="text"
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                placeholder="e.g. May 20–22, 2026"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Maastricht, Netherlands"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Official URL</label>
              <input
                type="url"
                value={officialUrl}
                onChange={(e) => setOfficialUrl(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Subspecialties</label>
            <div className="flex flex-wrap gap-1.5">
              {NEUROLOGY_SUBSPECIALTIES.filter((s) => s !== "All Subspecialties").map((sub) => {
                const active = subspecialties.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSubspecialty(sub)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      active
                        ? "bg-amber-500 text-white border-amber-500"
                        : darkMode
                        ? "bg-slate-900 border-slate-700 text-slate-300"
                        : "bg-slate-100 border-slate-300 text-slate-700"
                    }`}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelCls}>Executive Summary</label>
            <textarea
              rows={3}
              value={executiveSummary}
              onChange={(e) => setExecutiveSummary(e.target.value)}
              placeholder="Summary of key sessions & verified highlights..."
              className={inputCls}
            />
          </div>

          {/* Late-Breaking Trials Section */}
          <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Late-Breaking Trials ({trials.length})
              </span>
              <button
                type="button"
                onClick={handleAddTrial}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30"
              >
                + Add Trial
              </button>
            </div>

            {trials.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Chưa có trial nào. Nhấn &ldquo;+ Add Trial&rdquo; nếu muốn bổ sung.
              </p>
            ) : (
              <div className="space-y-2">
                {trials.map((tr, idx) => {
                  const isOpenTrial = expandedTrialIdx === idx;
                  return (
                    <div
                      key={tr.id || idx}
                      className={`rounded-xl border p-3 ${
                        darkMode ? "bg-slate-900/70 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedTrialIdx(isOpenTrial ? null : idx)}
                          className="text-left text-xs font-bold flex-1 truncate"
                        >
                          <span className="text-amber-500 mr-1.5">
                            {tr.trialAcronym || `Trial #${idx + 1}`}
                          </span>
                          <span className="text-slate-400 font-normal">
                            {tr.title ? `— ${tr.title}` : "(click to edit)"}
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setExpandedTrialIdx(isOpenTrial ? null : idx)}
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 dark:bg-slate-800"
                          >
                            {isOpenTrial ? "Hide ▴" : "Edit ▾"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveTrial(idx)}
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                            title="Delete trial"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {isOpenTrial && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className={labelCls}>Trial Acronym</label>
                              <input
                                type="text"
                                value={tr.trialAcronym}
                                onChange={(e) => handleUpdateTrial(idx, { trialAcronym: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Design</label>
                              <select
                                value={tr.studyDesign}
                                onChange={(e) =>
                                  handleUpdateTrial(idx, {
                                    studyDesign: e.target.value as LateBreakingTrial["studyDesign"],
                                  })
                                }
                                className={inputCls}
                              >
                                <option value="Phase 3 RCT">Phase 3 RCT</option>
                                <option value="Phase 2 RCT">Phase 2 RCT</option>
                                <option value="Prospective Registry">Prospective Registry</option>
                                <option value="Meta-Analysis">Meta-Analysis</option>
                              </select>
                            </div>
                            <div>
                              <label className={labelCls}>Verdict</label>
                              <select
                                value={tr.verdict}
                                onChange={(e) =>
                                  handleUpdateTrial(idx, {
                                    verdict: e.target.value as LateBreakingTrial["verdict"],
                                  })
                                }
                                className={inputCls}
                              >
                                <option value="POSITIVE">POSITIVE</option>
                                <option value="NEUTRAL">NEUTRAL</option>
                                <option value="NEGATIVE">NEGATIVE</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className={labelCls}>Trial Title</label>
                            <input
                              type="text"
                              value={tr.title}
                              onChange={(e) => handleUpdateTrial(idx, { title: e.target.value })}
                              className={inputCls}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className={labelCls}>Published Journal</label>
                              <input
                                type="text"
                                value={tr.publishedJournal || ""}
                                onChange={(e) => handleUpdateTrial(idx, { publishedJournal: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Paper URL</label>
                              <input
                                type="url"
                                value={tr.fullTextUrl || ""}
                                onChange={(e) => handleUpdateTrial(idx, { fullTextUrl: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                          </div>

                          <div>
                            <label className={labelCls}>Population (P)</label>
                            <input
                              type="text"
                              value={tr.populationSummary}
                              onChange={(e) => handleUpdateTrial(idx, { populationSummary: e.target.value })}
                              className={inputCls}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className={labelCls}>Intervention Group</label>
                              <input
                                type="text"
                                value={tr.interventionGroup}
                                onChange={(e) => handleUpdateTrial(idx, { interventionGroup: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Control Group</label>
                              <input
                                type="text"
                                value={tr.controlGroup}
                                onChange={(e) => handleUpdateTrial(idx, { controlGroup: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className={labelCls}>Primary Outcome</label>
                              <input
                                type="text"
                                value={tr.primaryOutcome}
                                onChange={(e) => handleUpdateTrial(idx, { primaryOutcome: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Safety Outcome</label>
                              <input
                                type="text"
                                value={tr.safetyOutcome}
                                onChange={(e) => handleUpdateTrial(idx, { safetyOutcome: e.target.value })}
                                className={inputCls}
                              />
                            </div>
                          </div>

                          <div>
                            <label className={labelCls}>Bottom Line Takeaway</label>
                            <input
                              type="text"
                              value={tr.bottomLineTakeaway}
                              onChange={(e) => handleUpdateTrial(idx, { bottomLineTakeaway: e.target.value })}
                              className={inputCls}
                            />
                          </div>

                          <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tr.isPracticeChanging}
                              onChange={(e) =>
                                handleUpdateTrial(idx, { isPracticeChanging: e.target.checked })
                              }
                            />
                            <span>⚡ Practice-Changing Trial</span>
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-bold ${
                darkMode
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Conference"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
