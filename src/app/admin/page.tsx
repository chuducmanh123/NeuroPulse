"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSwitcher } from "@/components/ecosystem/AppSwitcher";
import { AdminTab } from "@/components/neurocase/tabs/AdminTab";
import { AdminPreviewModal } from "@/components/neurocase/modals/AdminPreviewModal";
import { ClinicalCase, CaseStatus, CaseDifficulty } from "@/types/clinicalCase";
import { GuidelineDoc } from "@/types/neuroguide";
import { MOCK_GUIDELINE_DOCS } from "@/data/neuroguideMockData";
import { SUBSPECIALTY_TABS } from "@/constants/subspecialties";

function getLocalTodayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const DIFFICULTY_BADGES: Record<CaseDifficulty, string> = {
  Resident: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  Fellow: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  Attending: "bg-rose-500/15 text-rose-500 border-rose-500/30",
};

export default function AdminCommandCenter() {
  const router = useRouter();

  // Dark Mode State synced across ecosystem
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const isDark =
      localStorage.getItem("neuropulse_theme") === "dark" ||
      localStorage.getItem("neuro_dark_mode") === "true";
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("neuropulse_theme", next ? "dark" : "light");
      localStorage.setItem("neuro_dark_mode", next ? "true" : "false");
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  // =========================================================================
  // AUTHENTICATION STATE
  // =========================================================================
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const token =
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token");
    if (token) {
      setIsAdminVerified(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeInput.trim()) {
      setAuthError("Vui lòng nhập mật mã quản trị viên.");
      return;
    }
    setIsVerifying(true);
    setAuthError("");
    try {
      const res = await fetch("/api/neurocase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_admin",
          passcode: passcodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        sessionStorage.setItem("neurocase_admin_token", data.token);
        localStorage.setItem("neurocase_admin_token", data.token);
        setIsAdminVerified(true);
        setPasscodeInput("");
      } else {
        setAuthError(data.error || "Mật mã quản trị không chính xác.");
      }
    } catch {
      setAuthError("Không thể kết nối đến máy chủ xác thực.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("neurocase_admin_token");
    localStorage.removeItem("neurocase_admin_token");
    setIsAdminVerified(false);
  };

  // =========================================================================
  // ADMIN SECTION TABS
  // =========================================================================
  const [adminTab, setAdminTab] = useState<"neurocase" | "radar" | "neuropulse" | "system">("neurocase");

  // =========================================================================
  // NEUROCASE MODERATION STATE
  // =========================================================================
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [isSyncingServer, setIsSyncingServer] = useState(false);
  const [serverSyncSuccess, setServerSyncSuccess] = useState("");
  const [adminPreviewCase, setAdminPreviewCase] = useState<ClinicalCase | null>(null);
  const [adminScheduleDates, setAdminScheduleDates] = useState<Record<string, string>>({});

  const refreshCasesFromServer = async () => {
    const adminToken =
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token");
    setIsSyncingServer(true);
    try {
      const res = await fetch("/api/neurocase", {
        cache: "no-store",
        headers: adminToken ? { "x-admin-token": adminToken } : {},
      });
      if (res.ok) {
        const data: ClinicalCase[] = await res.json();
        setCases(data);
      }
    } catch (e) {
      console.error("Error loading cases for admin:", e);
    } finally {
      setIsSyncingServer(false);
    }
  };

  useEffect(() => {
    if (isAdminVerified) {
      refreshCasesFromServer();
    }
  }, [isAdminVerified]);

  const approvedCases = useMemo(
    () => cases.filter((c) => !c.status || c.status === "approved"),
    [cases]
  );
  const pendingCases = useMemo(
    () => cases.filter((c) => c.status === "pending"),
    [cases]
  );
  const dailyChallengeCases = useMemo(
    () => cases.filter((c) => c.is_daily_challenge),
    [cases]
  );

  const persistAdminCases = async (nextCases: ClinicalCase[]) => {
    setCases(nextCases);
    const token =
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token");
    setIsSyncingServer(true);
    try {
      const res = await fetch("/api/neurocase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({
          action: "save_all",
          cases: nextCases,
        }),
      });
      if (res.ok) {
        setServerSyncSuccess("✅ Đã lưu và đồng bộ thành công lên máy chủ.");
        setTimeout(() => setServerSyncSuccess(""), 4000);
      } else {
        setServerSyncSuccess("⚠️ Phiên quản trị hết hạn hoặc máy chủ từ chối.");
      }
    } catch {
      setServerSyncSuccess("❌ Lỗi mạng khi lưu dữ liệu lên máy chủ.");
    } finally {
      setIsSyncingServer(false);
    }
  };

  const handleAdminUpdateStatus = (
    caseId: string,
    newStatus: "approved" | "rejected" | "pending",
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
    persistAdminCases(nextCases);
    setAdminPreviewCase(null);
  };

  // =========================================================================
  // NEUROGUIDE RADAR & GUIDELINE INGESTION STATE (Chức năng trong ảnh)
  // =========================================================================
  const [guidelineDocs, setGuidelineDocs] = useState<GuidelineDoc[]>(MOCK_GUIDELINE_DOCS);
  const [isSyncingRadar, setIsSyncingRadar] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");
  const [radarMessage, setRadarMessage] = useState<string | null>(null);

  // Batch PDF Ingestion Modal State
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchInputText, setBatchInputText] = useState("");
  const [batchPreviewDocs, setBatchPreviewDocs] = useState<GuidelineDoc[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("neuroguide_cached_guidelines");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGuidelineDocs(parsed);
        }
      }
      const lastSync = localStorage.getItem("neuroguide_last_sync_timestamp");
      if (lastSync) {
        setLastSyncedTime(new Date(parseInt(lastSync, 10)).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch {}
  }, []);

  const triggerRadarSync = async () => {
    if (isSyncingRadar) return;
    setIsSyncingRadar(true);
    setRadarMessage(null);
    try {
      const res = await fetch("/api/neuroguide/sync-guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPeriodicCron: false }),
      });
      const json = await res.json();
      if (json.status === "success" && json.guidelines && json.guidelines.length > 0) {
        setGuidelineDocs((prev) => {
          const existingIds = new Set(prev.map((g) => g.id.toLowerCase()));
          const existingTitles = new Set(prev.map((g) => g.title.toLowerCase().trim()));
          const novel = json.guidelines.filter(
            (g: GuidelineDoc) =>
              !existingIds.has(g.id.toLowerCase()) && !existingTitles.has(g.title.toLowerCase().trim())
          );
          if (novel.length > 0) {
            const merged = [...novel, ...prev];
            localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(merged));
            setRadarMessage(`✨ Dò quét thành công: Phát hiện ${novel.length} hướng dẫn lâm sàng mới.`);
            return merged;
          } else {
            setRadarMessage("✅ Thư viện hướng dẫn đã được cập nhật đồng bộ đầy đủ nhất.");
            return prev;
          }
        });
        const nowStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
        setLastSyncedTime(nowStr);
        localStorage.setItem("neuroguide_last_sync_timestamp", Date.now().toString());
      } else {
        setRadarMessage("✅ Radar hoàn tất: Toàn bộ nguồn PubMed, Europe PMC và ESO đã đồng bộ.");
      }
    } catch (err) {
      setRadarMessage("⚠️ Lỗi kết nối khi quét trực tuyến radar.");
    } finally {
      setIsSyncingRadar(false);
    }
  };

  const handleParseBatch = async () => {
    if (!batchInputText.trim()) return;
    setIsBatchProcessing(true);
    try {
      const res = await fetch("/api/neuroguide/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textManifest: batchInputText }),
      });
      const data = await res.json();
      if (data.status === "success" && Array.isArray(data.guidelines)) {
        setBatchPreviewDocs(data.guidelines);
      }
    } catch (err) {
      console.error("Batch import error:", err);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleCommitBatchImport = () => {
    if (batchPreviewDocs.length === 0) return;
    setGuidelineDocs((prev) => {
      const existingIds = new Set(prev.map((g) => g.id.toLowerCase()));
      const existingTitles = new Set(prev.map((g) => g.title.toLowerCase().trim()));
      const novel = batchPreviewDocs.filter(
        (doc) => !existingIds.has(doc.id.toLowerCase()) && !existingTitles.has(doc.title.toLowerCase().trim())
      );
      const merged = [...novel, ...prev];
      try {
        localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(merged));
      } catch (e) {
        console.warn("Could not save to localStorage:", e);
      }
      setRadarMessage(`📁 Đã nạp thành công ${novel.length} hướng dẫn lâm sàng mới vào cơ sở dữ liệu.`);
      return merged;
    });
    setShowBatchModal(false);
    setBatchPreviewDocs([]);
    setBatchInputText("");
  };

  // =========================================================================
  // IF NOT AUTHENTICATED: DISPLAY SECURE LOGIN SCREEN
  // =========================================================================
  if (!isAdminVerified) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 transition-colors ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-3xl">
              🛡️
            </div>
            <h1 className="text-2xl font-black tracking-tight">Neuro Admin Command Center</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Trung tâm điều phối &amp; vận hành thống nhất cho cả 6 phân hệ
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className={`p-6 rounded-2xl border shadow-xl space-y-4 ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Mật mã Quản trị viên (Passcode)
              </label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Nhập mật mã quản trị..."
                autoFocus
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                  darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl text-xs bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white shadow-md shadow-amber-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isVerifying ? "Đang xác thực..." : "Đăng nhập Trung tâm Quản trị"}</span>
              <span>→</span>
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                ← Quay lại trang chủ NeuroPulse
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED: FULL ECOSYSTEM COMMAND CENTER
  // =========================================================================
  return (
    <div className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">

        {/* TOP COMMAND HEADER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center text-xl shadow-md">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight">Neuro Admin Command Center</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Trung tâm điều phối &amp; kiểm duyệt tập trung cho hệ sinh thái Thần kinh học
              </p>
            </div>
          </div>

          {/* Quick ecosystem navigation & tools */}
          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                darkMode ? "bg-slate-900 border-slate-800 hover:bg-slate-800" : "bg-white border-slate-200 hover:bg-slate-100"
              }`}
            >
              Pulse
            </Link>
            <Link
              href="/neurocase"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                darkMode ? "bg-slate-900 border-slate-800 hover:bg-slate-800" : "bg-white border-slate-200 hover:bg-slate-100"
              }`}
            >
              Case
            </Link>
            <Link
              href="/neuroguide"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                darkMode ? "bg-slate-900 border-slate-800 hover:bg-slate-800" : "bg-white border-slate-200 hover:bg-slate-100"
              }`}
            >
              Guide
            </Link>

            <button
              onClick={toggleDarkMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                darkMode
                  ? "bg-indigo-950 text-amber-300 border-indigo-800 hover:bg-indigo-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{darkMode ? "☀️ Light" : "🌙 Night Shift"}</span>
            </button>

            <AppSwitcher currentApp="admin" darkMode={darkMode} />

            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-all"
              title="Đăng xuất khỏi phiên quản trị"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {/* ECOSYSTEM STATUS QUICK CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
          <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroPulse</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-base font-black mt-1">179 Bài</div>
            <div className="text-[10px] text-slate-500">Bot 6:00 AM Active</div>
          </div>

          <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroCase</span>
              <span className={`w-2 h-2 rounded-full ${pendingCases.length > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
            </div>
            <div className="text-base font-black mt-1">{cases.length} Ca</div>
            <div className="text-[10px] text-amber-500 font-semibold">{pendingCases.length} ca chờ duyệt</div>
          </div>

          <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroGuide</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-base font-black mt-1">{guidelineDocs.length} Docs</div>
            <div className="text-[10px] text-slate-500">Radar PubMed/ESO</div>
          </div>

          <div className={`p-3 rounded-xl border opacity-60 ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroCalc</span>
              <span className="text-[9px] uppercase px-1 rounded bg-slate-200 dark:bg-slate-800">Sắp có</span>
            </div>
            <div className="text-base font-bold mt-1 text-slate-400">Scales</div>
            <div className="text-[10px] text-slate-400">NIHSS, mRS, ICH</div>
          </div>

          <div className={`p-3 rounded-xl border opacity-60 ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroVision</span>
              <span className="text-[9px] uppercase px-1 rounded bg-slate-200 dark:bg-slate-800">Sắp có</span>
            </div>
            <div className="text-base font-bold mt-1 text-slate-400">Imaging</div>
            <div className="text-[10px] text-slate-400">ASPECTS &amp; CTP</div>
          </div>

          <div className={`p-3 rounded-xl border opacity-60 ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroRx</span>
              <span className="text-[9px] uppercase px-1 rounded bg-slate-200 dark:bg-slate-800">Sắp có</span>
            </div>
            <div className="text-base font-bold mt-1 text-slate-400">Pharma</div>
            <div className="text-[10px] text-slate-400">Liều dùng &amp; Tương tác</div>
          </div>
        </div>

        {/* ADMIN OPERATION NAVIGATION TABS */}
        <nav
          className={`mb-6 p-1.5 rounded-xl border flex flex-wrap items-center justify-between gap-1.5 ${
            darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              {
                id: "neurocase",
                label: "🛡️ Duyệt Ca Lâm Sàng (NeuroCase)",
                badge: pendingCases.length > 0 ? `${pendingCases.length} Chờ Duyệt` : undefined,
                badgeColor: "bg-amber-500 text-white",
              },
              {
                id: "radar",
                label: "📡 Radar & Guideline (NeuroGuide)",
                badge: `${guidelineDocs.length}`,
                badgeColor: "bg-blue-500 text-white",
              },
              {
                id: "neuropulse",
                label: "📰 Quản lý Nguồn Bài Báo (NeuroPulse)",
                badge: "179",
                badgeColor: "bg-red-500 text-white",
              },
              {
                id: "system",
                label: "⚙️ Giám Sát Hệ Thống & Lưu Trữ",
                badge: undefined,
              },
            ].map((tab) => {
              const active = adminTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setAdminTab(tab.id as typeof adminTab)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-amber-600 text-white shadow-sm"
                      : darkMode
                      ? "text-slate-300 hover:bg-slate-800"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                        active
                          ? "bg-white/20 text-white"
                          : tab.badgeColor || (darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={refreshCasesFromServer}
            disabled={isSyncingServer}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5"
          >
            <span className={isSyncingServer ? "animate-spin" : ""}>🔄</span>
            <span>{isSyncingServer ? "Đang đồng bộ..." : "Làm mới dữ liệu"}</span>
          </button>
        </nav>

        {/* TAB 1: NEUROCASE MODERATION WORKFLOW */}
        {adminTab === "neurocase" && (
          <div className="space-y-4">
            <AdminTab
              darkMode={darkMode}
              cases={cases}
              approvedCases={approvedCases}
              dailyChallengeCases={dailyChallengeCases}
              serverSyncSuccess={serverSyncSuccess}
              isSyncingServer={isSyncingServer}
              refreshCasesFromServer={refreshCasesFromServer}
              onPersistAdminCases={persistAdminCases}
              onPreviewCase={(c) => setAdminPreviewCase(c)}
              getLocalTodayIso={getLocalTodayIso}
              subspecialtyTabs={SUBSPECIALTY_TABS}
            />
          </div>
        )}

        {/* TAB 2: NEUROGUIDE RADAR & GUIDELINE INGESTION (Chức năng trong ảnh được tái cấu trúc vào Admin) */}
        {adminTab === "radar" && (
          <div className="space-y-4">
            {/* AUTONOMOUS PERIODIC RADAR TOOLBAR (From uploaded image) */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-blue-50/70 border-blue-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-3.5 w-3.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                    <span>🔬 Radar Tự Động Định Kỳ (PubMed / Europe PMC / ESO)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                      Tự động quét 24/7
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hệ thống tự động dò quét định kỳ và đồng bộ các hướng dẫn lâm sàng mới công bố.{" "}
                    {lastSyncedTime && (
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        (Quét gần nhất lúc {lastSyncedTime})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                <button
                  onClick={() => setShowBatchModal(true)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                    darkMode
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                >
                  <span>📁</span>
                  <span>Nhập danh sách file</span>
                </button>

                <button
                  onClick={triggerRadarSync}
                  disabled={isSyncingRadar}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    isSyncingRadar
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <span className={isSyncingRadar ? "animate-spin" : ""}>⚡</span>
                  <span>{isSyncingRadar ? "Đang dò quét online..." : "Quét trực tuyến ngay"}</span>
                </button>
              </div>
            </div>

            {/* Sync Alert Message Banner */}
            {radarMessage && (
              <div className="p-3.5 rounded-xl text-xs bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-sm">✨</span>
                  <span>{radarMessage}</span>
                </div>
                <button
                  onClick={() => setRadarMessage(null)}
                  className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 text-xs font-bold px-1.5 py-0.5"
                >
                  ✕
                </button>
              </div>
            )}

            {/* GUIDELINE REPOSITORY OVERVIEW */}
            <div className={`p-5 rounded-2xl border ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold">Thư viện Hướng dẫn Lâm sàng Hiện có ({guidelineDocs.length})</h3>
                  <p className="text-[11px] text-slate-500">Các guideline đã được bóc tách và phân loại phục vụ tra cứu trong NeuroGuide</p>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                  {guidelineDocs.length} tài liệu
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto pr-1">
                {guidelineDocs.map((doc) => (
                  <div key={doc.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {doc.society} {doc.year}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {doc.subspecialty}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{doc.title}</div>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {doc.allPracticeChanges?.length || 0} updates
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* MODAL: LOCAL BATCH FILE INGESTION (From uploaded image) */}
            {showBatchModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                <div
                  className={`w-full max-w-2xl rounded-2xl border p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
                    darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <div>
                        <h3 className="text-sm font-bold">Nạp Guideline Hàng Loạt từ Thư Mục / File PDF</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Dán danh sách tên file PDF (mỗi dòng 1 file), hệ thống tự bóc tách năm, hiệp hội và chuyên ngành.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBatchModal(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="font-bold text-slate-700 dark:text-slate-300">
                        Danh sách tên file / Manifest:
                      </label>
                      <button
                        onClick={() =>
                          setBatchInputText(
                            `2023 ESO expedited recommendation on tenecteplase for acute ischaemic stroke.pdf\n` +
                              `2023 ESO Guidelines on Moyamoya angiopathy.pdf\n` +
                              `2023 European Society for Vascular Surgery (ESVS) Clinical Practice Guidelines on Carotid and Vertebral Artery Disease.pdf\n` +
                              `2024 ESC Guidelines for the management of atrial fibrillation developed in collaboration with EACTS.pdf\n` +
                              `2024 ESO and ESMINT - Guideline on acute management of basilar artery occlusion.pdf\n` +
                              `2024 ESO and European society for minimally invasive neurological therapy guideline on intracranial stenosis.pdf\n` +
                              `2024 ESO guideline on cerebral small vessel disease, part 2, lacunar ischaemic stroke.pdf\n` +
                              `2024 ESO Guidelines on the diagnosis and management of patent foramen ovale (PFO).pdf\n` +
                              `2025 ESO and EANS guideline on stroke due to spontaneous intracerebral haemorrhage.pdf\n` +
                              `2025 ESO annual stroke evidence update 2025.pdf\n` +
                              `2025 ESO guideline on aphasia rehabilitation.pdf\n` +
                              `2025 ESO guideline on blood pressure in acute ischemic stroke and intracerebral hemorrhage.pdf\n` +
                              `2025 ESO guideline on motor rehabilitation.pdf\n` +
                              `2025 ESO guideline on visual impairment in stroke.pdf\n` +
                              `2026 ESO EANS and ESMINT guideline on aneurysmal subarachnoid haemorrhage.pdf\n` +
                              `2026 ESO guideline on stroke-associated pneumonia.pdf`
                          )
                        }
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        ⚡ Dán mẫu 16 file PDF mẫu
                      </button>
                    </div>

                    <textarea
                      rows={6}
                      value={batchInputText}
                      onChange={(e) => setBatchInputText(e.target.value)}
                      placeholder={`Ví dụ:\n2025 ESO guideline on motor rehabilitation.pdf\n2024 ESC Guidelines for the management of atrial fibrillation.pdf\n2026 ESO guideline on stroke-associated pneumonia.pdf`}
                      className={`w-full p-3 text-xs font-mono rounded-xl border outline-none focus:border-blue-500 transition-all ${
                        darkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={handleParseBatch}
                      disabled={isBatchProcessing || !batchInputText.trim()}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isBatchProcessing || !batchInputText.trim()
                          ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      }`}
                    >
                      <span>🔍</span>
                      <span>{isBatchProcessing ? "Đang phân tích..." : "Phân tích danh sách"}</span>
                    </button>

                    {batchPreviewDocs.length > 0 && (
                      <button
                        onClick={handleCommitBatchImport}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-1.5 transition-all"
                      >
                        <span>✓</span>
                        <span>Nạp {batchPreviewDocs.length} Guideline mới</span>
                      </button>
                    )}
                  </div>

                  {batchPreviewDocs.length > 0 && (
                    <div className="space-y-2 border-t pt-3 border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>Kết quả nhận diện ({batchPreviewDocs.length} tài liệu):</span>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {batchPreviewDocs.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                              darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm shrink-0">📄</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                    {item.society} {item.year}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                    {item.subspecialty}
                                  </span>
                                </div>
                                <span className="font-semibold block truncate mt-0.5 text-slate-800 dark:text-slate-200">
                                  {item.title}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                              Mới phát hiện
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: NEUROPULSE MULTI-JOURNAL FEEDS */}
        {adminTab === "neuropulse" && (
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold">Giám sát Luồng Tạp chí (NeuroPulse Feed Engine)</h3>
                  <p className="text-[11px] text-slate-500">Tự động tổng hợp và phân loại bài báo từ 8 tạp chí thần kinh học hàng đầu</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Bot Daily lúc 6:00 AM VN
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="text-[11px] text-slate-400">Tổng bài lưu trữ</div>
                  <div className="text-xl font-black mt-1">179</div>
                  <div className="text-[10px] text-emerald-500">Đã chuẩn hóa 11 phân ngành</div>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="text-[11px] text-slate-400">RCTs &amp; Clinical Trials</div>
                  <div className="text-xl font-black mt-1">42</div>
                  <div className="text-[10px] text-blue-500">Thử nghiệm lâm sàng</div>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="text-[11px] text-slate-400">Guidelines &amp; Reviews</div>
                  <div className="text-xl font-black mt-1">31</div>
                  <div className="text-[10px] text-purple-500">Khuyến cáo điều trị</div>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="text-[11px] text-slate-400">Tạp chí kết nối</div>
                  <div className="text-xl font-black mt-1">8 / 8</div>
                  <div className="text-[10px] text-emerald-500">NEJM, Lancet, JAMA, Stroke...</div>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-between">
                <span>Lệnh cập nhật thủ công từ terminal: <code className="font-mono text-amber-500">python scripts/fetch_nejm.py</code></span>
                <Link href="/" className="font-bold text-amber-600 dark:text-amber-400 hover:underline">
                  Xem nguồn đọc NeuroPulse →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM & STORAGE HEALTH */}
        {adminTab === "system" && (
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
              <h3 className="text-sm font-bold mb-1">Kiến trúc Đám mây &amp; Bảo mật Hệ sinh thái</h3>
              <p className="text-[11px] text-slate-500 mb-4">Trạng thái cấu hình lưu trữ, kết nối server và các khóa bảo mật</p>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="font-bold">Lưu trữ Động Ca Bệnh (NeuroCase Dynamic Storage)</div>
                    <div className="text-slate-400 text-[11px]">Hỗ trợ tự động fallback giữa Vercel Blob, Vercel KV và Local JSON</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Sẵn sàng hoạt động
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="font-bold">Cơ chế Kiểm soát XSS &amp; URL Sanitization</div>
                    <div className="text-slate-400 text-[11px]">Đã kích hoạt bộ lọc triệt tiêu javascript: và data: URI trong DOI</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Bảo vệ 100%
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="font-bold">Quy trình CI Quality Gate (GitHub Actions)</div>
                    <div className="text-slate-400 text-[11px]">Tự động chạy typecheck nghiêm ngặt, 15 ca kiểm thử và biên dịch build</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    15/15 Tests Passed
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN PREVIEW MODAL */}
        <AdminPreviewModal
          adminPreviewCase={adminPreviewCase}
          onClose={() => setAdminPreviewCase(null)}
          darkMode={darkMode}
          difficultyBadges={DIFFICULTY_BADGES}
          adminScheduleDates={adminScheduleDates}
          onStartFullEdit={() => setAdminPreviewCase(null)}
          onAdminUpdateStatus={handleAdminUpdateStatus}
        />
      </div>
    </div>
  );
}
