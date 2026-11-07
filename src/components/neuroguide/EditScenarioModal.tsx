"use client";

import React, { useState, useEffect, useMemo } from "react";
import type {
  ClinicalScenario,
  RecommendationAtom,
  TemporalShift,
  EcosystemLink,
  SubspecialtyType,
  NormalizedTier,
} from "@/types/neuroguide";
import { SUBSPECIALTY_LIST } from "@/constants/subspecialties";
import { getAdminHeaders, getStoredAdminToken } from "@/utils/clientAuth";

interface EditScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: ClinicalScenario | null;
  recommendations?: RecommendationAtom[];
  adminToken?: string;
  onSuccess: (updatedScenario: ClinicalScenario, updatedRecommendations?: RecommendationAtom[]) => void;
  darkMode: boolean;
}

type ModalTab = "overview" | "ai_appraisal" | "recommendations" | "temporal" | "ecosystem";

export function EditScenarioModal({
  isOpen,
  onClose,
  scenario,
  recommendations = [],
  adminToken,
  onSuccess,
  darkMode,
}: EditScenarioModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Core Overview Fields
  const [customId, setCustomId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [titleEn, setTitleEn] = useState<string>("");
  const [subspecialty, setSubspecialty] = useState<SubspecialtyType>("Stroke");
  const [statusBadge, setStatusBadge] = useState<string>("");
  const [keyTagsStr, setKeyTagsStr] = useState<string>("");
  const [summary, setSummary] = useState<string>("");

  // Conference / Late-breaking alert
  const [hasConfAlert, setHasConfAlert] = useState<boolean>(false);
  const [confAlertText, setConfAlertText] = useState<string>("");

  // AI Synthesis Appraisal
  const [consensusLevel, setConsensusLevel] = useState<"HIGH_CONCORDANCE" | "MODERATE_VARIATION" | "MAJOR_DIVERGENCE">("HIGH_CONCORDANCE");
  const [whyGuidelinesDiffer, setWhyGuidelinesDiffer] = useState<string>("");
  const [clinicalBottomLine, setClinicalBottomLine] = useState<string>("");
  const [resourceDependency, setResourceDependency] = useState<"Standard Care" | "Requires Advanced Perfusion/AI" | "Specialized Center Only">("Standard Care");
  const [lastAppraisedAt, setLastAppraisedAt] = useState<string>("");

  // Recommendations and Temporal & Ecosystem Lists
  const [recs, setRecs] = useState<RecommendationAtom[]>([]);
  const [shifts, setShifts] = useState<TemporalShift[]>([]);
  const [ecoLinks, setEcoLinks] = useState<EcosystemLink[]>([]);

  // Synchronize state when modal opens or scenario changes
  useEffect(() => {
    if (!scenario) return;

    setCustomId(scenario.id || "");
    setTitle(scenario.title || "");
    setTitleEn(scenario.titleEn || "");
    setSubspecialty(scenario.subspecialty || "Stroke");
    setStatusBadge(scenario.statusBadge || "");
    setKeyTagsStr(Array.isArray(scenario.keyTags) ? scenario.keyTags.join(", ") : "");
    setSummary(scenario.summary || "");

    setHasConfAlert(Boolean(scenario.hasConfAlert));
    setConfAlertText(scenario.confAlertText || "");

    const appraisal = scenario.aiSynthesisAppraisal || {};
    setConsensusLevel(appraisal.consensusLevel || "HIGH_CONCORDANCE");
    setWhyGuidelinesDiffer(appraisal.whyGuidelinesDiffer || appraisal.whyTheyDiffer || "");
    setClinicalBottomLine(appraisal.clinicalBottomLine || "");
    setResourceDependency(appraisal.resourceDependency || "Standard Care");
    setLastAppraisedAt(appraisal.lastAppraisedAt || new Date().toISOString().split("T")[0]);

    setShifts(Array.isArray(scenario.temporalEvolution) ? JSON.parse(JSON.stringify(scenario.temporalEvolution)) : []);
    setEcoLinks(Array.isArray(scenario.ecosystemLinks) ? JSON.parse(JSON.stringify(scenario.ecosystemLinks)) : []);

    const relevantRecs = recommendations.filter((r) => r.scenarioId === scenario.id);
    setRecs(relevantRecs.length > 0 ? JSON.parse(JSON.stringify(relevantRecs)) : []);

    setActiveTab("overview");
    setErrorMessage(null);
  }, [scenario, recommendations, isOpen]);

  if (!isOpen || !scenario) return null;

  // --- Handlers for Recommendations ---
  const handleAddRec = () => {
    const newRec: RecommendationAtom = {
      id: `rec-${scenario.id}-${Date.now().toString(36)}`,
      scenarioId: scenario.id,
      guidelineDocId: "",
      society: "AHA/ASA",
      year: new Date().getFullYear(),
      originalGrade: "Class I, Level A",
      normalizedTier: 1,
      recommendationText: "",
      eligibilityCriteria: "",
      citedTrials: [],
      isLatestForSociety: true,
      notes: "",
    };
    setRecs((prev) => [...prev, newRec]);
  };

  const handleUpdateRec = (index: number, patch: Partial<RecommendationAtom>) => {
    setRecs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleRemoveRec = (index: number) => {
    setRecs((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Handlers for Temporal Shifts ---
  const handleAddShift = () => {
    const newShift: TemporalShift = {
      society: "AHA/ASA",
      previousYear: new Date().getFullYear() - 5,
      previousGrade: "Class IIb, Level B",
      currentYear: new Date().getFullYear(),
      currentGrade: "Class I, Level A",
      shiftDirection: "UPGRADED",
      drivingTrials: [],
      evolutionNarrative: "",
    };
    setShifts((prev) => [...prev, newShift]);
  };

  const handleUpdateShift = (index: number, patch: Partial<TemporalShift>) => {
    setShifts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleRemoveShift = (index: number) => {
    setShifts((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Handlers for Ecosystem Links ---
  const handleAddEcoLink = () => {
    const newLink: EcosystemLink = {
      app: "NeuroRx",
      href: "#",
      label: "Công cụ lâm sàng mới",
      badge: "Clinical Tool",
      description: "",
    };
    setEcoLinks((prev) => [...prev, newLink]);
  };

  const handleUpdateEcoLink = (index: number, patch: Partial<EcosystemLink>) => {
    setEcoLinks((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleRemoveEcoLink = (index: number) => {
    setEcoLinks((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Save Handler ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = adminToken || getStoredAdminToken();

    if (!token) {
      setErrorMessage("Yêu cầu quyền Quản trị viên (Admin). Vui lòng đăng nhập Admin để lưu kịch bản lâm sàng.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Tiêu đề kịch bản không được để trống.");
      setActiveTab("overview");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const parsedTags = keyTagsStr
      .split(/[,;\n]/)
      .map((t) => t.trim())
      .filter(Boolean);

    const finalId = (customId.trim() || scenario.id).toLowerCase();
    const updatedRecs = recs.map((r) => ({ ...r, scenarioId: finalId }));

    const updatedScenario: ClinicalScenario = {
      ...scenario,
      id: finalId,
      title: title.trim(),
      titleEn: titleEn.trim() || undefined,
      subspecialty,
      summary: summary.trim(),
      keyTags: parsedTags,
      statusBadge: (statusBadge as any) || undefined,
      hasConfAlert,
      confAlertText: hasConfAlert ? confAlertText.trim() : undefined,
      aiSynthesisAppraisal: {
        consensusLevel,
        whyGuidelinesDiffer: whyGuidelinesDiffer.trim(),
        whyTheyDiffer: whyGuidelinesDiffer.trim(),
        clinicalBottomLine: clinicalBottomLine.trim(),
        resourceDependency,
        lastAppraisedAt: lastAppraisedAt.trim() || new Date().toISOString().split("T")[0],
      },
      temporalEvolution: shifts,
      ecosystemLinks: ecoLinks,
    };

    try {
      const res = await fetch("/api/neuroguide/scenarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(token),
        },
        body: JSON.stringify({
          scenario: updatedScenario,
          recommendations: updatedRecs,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        onSuccess(data.scenario || updatedScenario, data.recommendations || recs);
        onClose();
      } else {
        if (res.status === 401) {
          setErrorMessage("Phiên đăng nhập quản trị đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại Admin.");
        } else {
          setErrorMessage(data.error || "Không thể lưu cập nhật kịch bản lâm sàng.");
        }
      }
    } catch {
      setErrorMessage("Lỗi kết nối khi gửi yêu cầu cập nhật kịch bản lâm sàng.");
    } finally {
      setIsLoading(false);
    }
  };

  const availableSubspecialties = useMemo(
    () => SUBSPECIALTY_LIST.filter((s) => s !== "All Subspecialties"),
    []
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-5 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-[96vw] max-w-7xl h-[94vh] max-h-[960px] flex flex-col rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* MODAL HEADER */}
        <div className="px-5 sm:px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl font-bold shrink-0">
              ⚖️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base md:text-lg font-black truncate">
                  {title ? "Sửa Kịch Bản Lâm Sàng" : "Thêm Kịch Bản Lâm Sàng Mới"}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {customId || scenario.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Chỉnh sửa thông tin thực hành, đánh giá AI và khuyến cáo đa hiệp hội
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-base"
            title="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        {/* MODAL NAVIGATION TABS */}
        <div className="px-5 pt-3 border-b dark:border-slate-800 flex items-center gap-1.5 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/30 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "overview"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span>📋</span>
            <span>Thông tin chung</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai_appraisal")}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "ai_appraisal"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span>🧠</span>
            <span>Đánh giá AI &amp; Đồng thuận</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("recommendations")}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "recommendations"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span>🏛️</span>
            <span>Khuyến cáo Đa Hiệp hội ({recs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("temporal")}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "temporal"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span>⏳</span>
            <span>Chuyển dịch thời gian ({shifts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ecosystem")}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "ecosystem"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <span>🔗</span>
            <span>Công cụ liên kết ({ecoLinks.length})</span>
          </button>
        </div>

        {/* ERROR BANNER */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* FORM BODY */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-5 max-w-5xl mx-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Mã Định Danh (Scenario ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    placeholder="e.g. ais-ivt-tenecteplase-4.5h"
                    className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm font-mono font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-amber-400 placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-amber-700 placeholder-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Phân khoa Thần kinh (Subspecialty)
                  </label>
                  <select
                    value={subspecialty}
                    onChange={(e) => setSubspecialty(e.target.value as SubspecialtyType)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {availableSubspecialties.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Huy hiệu thực hành (Status Badge)
                  </label>
                  <select
                    value={statusBadge}
                    onChange={(e) => setStatusBadge(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <option value="">(Không có badge)</option>
                    <option value="PRACTICE_CHANGING">⚡ PRACTICE_CHANGING (Thay đổi thực hành)</option>
                    <option value="UPGRADED">⬆️ UPGRADED (Nâng bậc khuyến cáo)</option>
                    <option value="NEW">✨ NEW (Khuyến cáo mới)</option>
                    <option value="ESTABLISHED">✅ ESTABLISHED (Chuẩn đã xác lập)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Tiêu đề Kịch bản Lâm sàng (Title) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Tenecteplase vs. Alteplase for Acute Ischemic Stroke within 4.5 Hours"
                    className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Tiêu đề tiếng Anh (Title English)
                  </label>
                  <input
                    type="text"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    placeholder="Optional English Title..."
                    className={`w-full p-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Tóm tắt Kịch bản Lâm sàng (Clinical Summary)
                </label>
                <textarea
                  rows={4}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Mô tả bối cảnh lâm sàng, chỉ định chính, liều lượng hoặc phạm vi can thiệp..."
                  className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-medium leading-relaxed transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Từ khóa tìm kiếm (Key Tags - phân cách bởi dấu phẩy)
                </label>
                <input
                  type="text"
                  value={keyTagsStr}
                  onChange={(e) => setKeyTagsStr(e.target.value)}
                  placeholder="Tenecteplase, TNK-tPA, Alteplase, IV Thrombolysis, Door-to-Needle"
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              {/* Conference Alert Section */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  hasConfAlert
                    ? darkMode
                      ? "bg-amber-500/10 border-amber-500/40"
                      : "bg-amber-50/70 border-amber-300"
                    : darkMode
                    ? "bg-slate-800/40 border-slate-800"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="hasConfAlertCheck"
                    checked={hasConfAlert}
                    onChange={(e) => setHasConfAlert(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                  <label
                    htmlFor="hasConfAlertCheck"
                    className="text-xs font-bold cursor-pointer select-none text-slate-800 dark:text-slate-200"
                  >
                    🔔 Bật Cảnh báo Hội nghị / Guideline Watch Alert
                  </label>
                </div>

                {hasConfAlert && (
                  <div className="mt-2.5">
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Nội dung thông điệp cảnh báo:
                    </label>
                    <input
                      type="text"
                      value={confAlertText}
                      onChange={(e) => setConfAlertText(e.target.value)}
                      placeholder="e.g. Dữ liệu dài hạn từ AcT và ATTEST-2 xác nhận kết cục không thua kém..."
                      className={`w-full p-2.5 rounded-xl border text-xs font-medium transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-white"
                          : "bg-white border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI SYNTHESIS APPRAISAL */}
          {activeTab === "ai_appraisal" && (
            <div className="space-y-5 max-w-5xl mx-auto w-full">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <span className="text-base shrink-0">🧠</span>
                <div>
                  <span className="font-extrabold block">Tổng hợp Phân tích AI &amp; Định hướng Lâm sàng:</span>
                  Cung cấp góc nhìn chuyên sâu về sự đồng thuận, bất đồng giữa các guideline quốc tế và kết luận chốt để áp dụng ngay tại giường bệnh.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Mức độ đồng thuận (Consensus Level)
                  </label>
                  <select
                    value={consensusLevel}
                    onChange={(e) => setConsensusLevel(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <option value="HIGH_CONCORDANCE">🟢 Đồng thuận cao (HIGH_CONCORDANCE)</option>
                    <option value="MODERATE_VARIATION">🟡 Khác biệt mức độ vừa / Điều kiện (MODERATE_VARIATION)</option>
                    <option value="MAJOR_DIVERGENCE">🔴 Khác biệt lớn / Bất đồng (MAJOR_DIVERGENCE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Phụ thuộc nguồn lực y tế
                  </label>
                  <select
                    value={resourceDependency}
                    onChange={(e) => setResourceDependency(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <option value="Standard Care">Standard Care (Chăm sóc tiêu chuẩn / Cơ sở)</option>
                    <option value="Requires Advanced Perfusion/AI">Requires Advanced Perfusion/AI (Tưới máu/AI)</option>
                    <option value="Specialized Center Only">Specialized Center Only (Trung tâm chuyên sâu)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                    Ngày đánh giá (Last Appraised)
                  </label>
                  <input
                    type="date"
                    value={lastAppraisedAt}
                    onChange={(e) => setLastAppraisedAt(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs font-bold transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Phân tích nguyên nhân khác biệt (Why Guidelines Differ / Root Cause)
                </label>
                <textarea
                  rows={4}
                  value={whyGuidelinesDiffer}
                  onChange={(e) => setWhyGuidelinesDiffer(e.target.value)}
                  placeholder="Giải thích vì sao AHA, ESO hay Bộ Y Tế đưa ra mức phân hạng hoặc tiêu chí thời gian khác nhau..."
                  className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-medium leading-relaxed transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Kết luận chốt thực hành lâm sàng (Clinical Bottom-Line) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={clinicalBottomLine}
                  onChange={(e) => setClinicalBottomLine(e.target.value)}
                  placeholder="Thông điệp hành động thực tế cho bác sĩ điều trị..."
                  className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-bold leading-relaxed transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                  }`}
                />
              </div>
            </div>
          )}

          {/* TAB 3: RECOMMENDATIONS MATRIX */}
          {activeTab === "recommendations" && (
            <div className="space-y-4 max-w-6xl mx-auto w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Khuyến cáo Đa Hiệp hội ({recs.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Khuyến cáo cụ thể từ AHA/ASA, ESO, Bộ Y Tế (VN-MOH), AAN...
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddRec}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Thêm Khuyến Cáo</span>
                </button>
              </div>

              {recs.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
                  Chưa có khuyến cáo nào được liên kết với kịch bản này. Bấm &quot;Thêm Khuyến Cáo&quot; để bổ sung.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {recs.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                          #{idx + 1} • {r.society} ({r.year})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRec(idx)}
                          className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-0.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        >
                          🗑️ Xóa
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Hiệp hội (Society):
                          </label>
                          <input
                            type="text"
                            value={r.society}
                            onChange={(e) => handleUpdateRec(idx, { society: e.target.value })}
                            placeholder="AHA/ASA, ESO, VN-MOH, AAN..."
                            className={`w-full p-2 rounded-lg border text-xs font-bold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Năm ban hành (Year):
                          </label>
                          <input
                            type="number"
                            value={r.year}
                            onChange={(e) => handleUpdateRec(idx, { year: parseInt(e.target.value, 10) || 2026 })}
                            className={`w-full p-2 rounded-lg border text-xs font-bold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Phân bậc chuẩn hóa (Tier 1-5):
                          </label>
                          <select
                            value={r.normalizedTier}
                            onChange={(e) => handleUpdateRec(idx, { normalizedTier: parseInt(e.target.value, 10) as NormalizedTier })}
                            className={`w-full p-2 rounded-lg border text-xs font-bold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          >
                            <option value={1}>Tier 1: Mạnh (Class I / Strong FOR)</option>
                            <option value={2}>Tier 2: Vừa (Class IIa / Moderate)</option>
                            <option value={3}>Tier 3: Yếu (Class IIb / Weak)</option>
                            <option value={4}>Tier 4: Đồng thuận Chuyên gia (Consensus)</option>
                            <option value={5}>Tier 5: Không khuyến cáo / Hại (Class III / AGAINST)</option>
                          </select>
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                          Phân loại gốc (Original Grade):
                        </label>
                        <input
                          type="text"
                          value={r.originalGrade}
                          onChange={(e) => handleUpdateRec(idx, { originalGrade: e.target.value })}
                          placeholder="e.g. Class I, Level of Evidence A hoặc Strong recommendation FOR"
                          className={`w-full p-2 rounded-lg border text-xs font-semibold ${
                            darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                          }`}
                        />
                      </div>

                      <div className="mb-3">
                        <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                          Nội dung khuyến cáo (Recommendation Text):
                        </label>
                        <textarea
                          rows={2}
                          value={r.recommendationText}
                          onChange={(e) => handleUpdateRec(idx, { recommendationText: e.target.value })}
                          className={`w-full p-2 rounded-lg border text-xs font-medium leading-relaxed ${
                            darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Tiêu chuẩn áp dụng (Eligibility Criteria):
                          </label>
                          <input
                            type="text"
                            value={r.eligibilityCriteria || ""}
                            onChange={(e) => handleUpdateRec(idx, { eligibilityCriteria: e.target.value })}
                            placeholder="e.g. Khởi phát <4.5h, loại trừ xuất huyết..."
                            className={`w-full p-2 rounded-lg border text-xs font-medium ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Thử nghiệm then chốt (Cited Trials - phân cách dấu phẩy):
                          </label>
                          <input
                            type="text"
                            value={Array.isArray(r.citedTrials) ? r.citedTrials.join(", ") : ""}
                            onChange={(e) =>
                              handleUpdateRec(idx, {
                                citedTrials: e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="AcT, TRACE-2, ATTEST-2..."
                            className={`w-full p-2 rounded-lg border text-xs font-medium ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TEMPORAL EVOLUTION */}
          {activeTab === "temporal" && (
            <div className="space-y-4 max-w-6xl mx-auto w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Chuyển dịch Khuyến cáo theo Thời gian ({shifts.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Ghi nhận bước tiến từ phiên bản cũ sang phiên bản mới của các guideline
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddShift}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Thêm Chuyển Dịch</span>
                </button>
              </div>

              {shifts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
                  Chưa có thông tin chuyển dịch thời gian. Bấm &quot;Thêm Chuyển Dịch&quot; để bổ sung.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {shifts.map((s, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          #{idx + 1} • {s.society} ({s.previousYear} ➔ {s.currentYear}) [{s.shiftDirection}]
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveShift(idx)}
                          className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-0.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        >
                          🗑️ Xóa
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Hiệp hội (Society):
                          </label>
                          <input
                            type="text"
                            value={s.society}
                            onChange={(e) => handleUpdateShift(idx, { society: e.target.value })}
                            className={`w-full p-2 rounded-lg border text-xs font-bold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Hướng chuyển dịch (Direction):
                          </label>
                          <select
                            value={s.shiftDirection}
                            onChange={(e) => handleUpdateShift(idx, { shiftDirection: e.target.value as any })}
                            className={`w-full p-2 rounded-lg border text-xs font-bold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          >
                            <option value="UPGRADED">⬆️ UPGRADED (Nâng bậc)</option>
                            <option value="DOWNGRADED">⬇️ DOWNGRADED (Hạ bậc)</option>
                            <option value="NEW">✨ NEW (Mới)</option>
                            <option value="UNCHANGED">⏺️ UNCHANGED (Không đổi)</option>
                            <option value="REVISED">🔄 REVISED (Hiệu chỉnh)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Thử nghiệm dẫn đường (Trials):
                          </label>
                          <input
                            type="text"
                            value={Array.isArray(s.drivingTrials) ? s.drivingTrials.join(", ") : ""}
                            onChange={(e) =>
                              handleUpdateShift(idx, {
                                drivingTrials: e.target.value
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              })
                            }
                            placeholder="AcT, TRACE-2..."
                            className={`w-full p-2 rounded-lg border text-xs font-medium ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Năm &amp; Hạng cũ:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={s.previousYear}
                              onChange={(e) => handleUpdateShift(idx, { previousYear: parseInt(e.target.value, 10) || 2019 })}
                              className={`w-24 p-2 rounded-lg border text-xs font-bold ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                              }`}
                            />
                            <input
                              type="text"
                              value={s.previousGrade}
                              onChange={(e) => handleUpdateShift(idx, { previousGrade: e.target.value })}
                              placeholder="Class IIb, Level B"
                              className={`flex-1 p-2 rounded-lg border text-xs font-medium ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                            Năm &amp; Hạng hiện tại:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={s.currentYear}
                              onChange={(e) => handleUpdateShift(idx, { currentYear: parseInt(e.target.value, 10) || 2026 })}
                              className={`w-24 p-2 rounded-lg border text-xs font-bold ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                              }`}
                            />
                            <input
                              type="text"
                              value={s.currentGrade}
                              onChange={(e) => handleUpdateShift(idx, { currentGrade: e.target.value })}
                              placeholder="Class I, Level A"
                              className={`flex-1 p-2 rounded-lg border text-xs font-bold text-amber-600 dark:text-amber-400 ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                              }`}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                          Thuyết minh tiến hóa (Evolution Narrative):
                        </label>
                        <textarea
                          rows={2}
                          value={s.evolutionNarrative}
                          onChange={(e) => handleUpdateShift(idx, { evolutionNarrative: e.target.value })}
                          className={`w-full p-2 rounded-lg border text-xs font-medium leading-relaxed ${
                            darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ECOSYSTEM LINKS */}
          {activeTab === "ecosystem" && (
            <div className="space-y-4 max-w-6xl mx-auto w-full">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Liên kết Công cụ Hệ sinh thái ({ecoLinks.length})
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Đường dẫn liên kết sang NeuroRx, NeuroCalc, NeuroVision...
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddEcoLink}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>➕</span>
                  <span>Thêm Liên Kết</span>
                </button>
              </div>

              {ecoLinks.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-xs text-slate-400">
                  Chưa có công cụ liên kết. Bấm &quot;Thêm Liên Kết&quot; để bổ sung.
                </div>
              ) : (
                <div className="space-y-3">
                  {ecoLinks.map((link, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border ${
                        darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                          #{idx + 1} • {link.app}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEcoLink(idx)}
                          className="text-xs font-bold text-rose-500 hover:text-rose-600 px-2 py-0.5 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        >
                          🗑️ Xóa
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 mb-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Ứng dụng:</label>
                          <select
                            value={link.app}
                            onChange={(e) => handleUpdateEcoLink(idx, { app: e.target.value as any })}
                            className={`w-full p-2 rounded-lg border text-xs font-bold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          >
                            <option value="NeuroRx">NeuroRx</option>
                            <option value="NeuroCalc">NeuroCalc</option>
                            <option value="NeuroVision">NeuroVision</option>
                            <option value="NeuroCase">NeuroCase</option>
                            <option value="NeuroPulse">NeuroPulse</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Nhãn hiển thị (Label):</label>
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) => handleUpdateEcoLink(idx, { label: e.target.value })}
                            placeholder="e.g. Tính liều Tenecteplase theo cân nặng"
                            className={`w-full p-2 rounded-lg border text-xs font-semibold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Badge:</label>
                          <input
                            type="text"
                            value={link.badge || ""}
                            onChange={(e) => handleUpdateEcoLink(idx, { badge: e.target.value })}
                            placeholder="0.25 mg/kg"
                            className={`w-full p-2 rounded-lg border text-xs font-bold ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Đường dẫn (Href):</label>
                          <input
                            type="text"
                            value={link.href}
                            onChange={(e) => handleUpdateEcoLink(idx, { href: e.target.value })}
                            placeholder="/neurorx hoặc #"
                            className={`w-full p-2 rounded-lg border text-xs font-mono ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 mb-1">Mô tả (Description):</label>
                          <input
                            type="text"
                            value={link.description || ""}
                            onChange={(e) => handleUpdateEcoLink(idx, { description: e.target.value })}
                            placeholder="Mô tả công cụ..."
                            className={`w-full p-2 rounded-lg border text-xs font-medium ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODAL FOOTER */}
          <div className="pt-4 border-t dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                darkMode
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Lưu Thay Đổi Scenario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
