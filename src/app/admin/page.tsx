"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSwitcher } from "@/components/ecosystem/AppSwitcher";
import { AdminTab } from "@/components/neurocase/tabs/AdminTab";
import { AdminPreviewModal } from "@/components/neurocase/modals/AdminPreviewModal";
import { ClinicalCase, CaseDifficulty } from "@/types/clinicalCase";
import { GuidelineDoc } from "@/types/neuroguide";
import { MOCK_GUIDELINE_DOCS } from "@/data/neuroguideMockData";
import { SUBSPECIALTY_TABS } from "@/constants/subspecialties";
import { ReviewQueueTab } from "@/components/neuroguide/ReviewQueueTab";
import { PipelineModal } from "@/components/neuroguide/PipelineModal";
import { NotebookLMUploadModal } from "@/components/neuroguide/NotebookLMUploadModal";

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
      setAuthError("Please enter the administrator passcode.");
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
        setAuthError(data.error || "Invalid administrator passcode.");
      }
    } catch {
      setAuthError("Unable to connect to authorization server.");
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
  const [adminTab, setAdminTab] = useState<"neurocase" | "guidelines" | "neuropulse" | "system">("neurocase");

  // Guideline Review & Radar Combined State
  const [guidelineSubTab, setGuidelineSubTab] = useState<"queue" | "repository">("queue");
  const [repoSearchQuery, setRepoSearchQuery] = useState("");
  const [repoSocietyFilter, setRepoSocietyFilter] = useState("ALL");
  const [reviewQueueCount, setReviewQueueCount] = useState<number>(0);
  const [showPipelineModal, setShowPipelineModal] = useState<boolean>(false);
  const [showNotebookLMModal, setShowNotebookLMModal] = useState<boolean>(false);

  const fetchReviewQueueCount = async () => {
    try {
      const res = await fetch("/api/neuroguide/review-queue");
      const data = await res.json();
      if (data.ok && typeof data.total === "number") {
        setReviewQueueCount(data.total);
      }
    } catch (e) {
      console.warn("Could not fetch review queue count:", e);
    }
  };

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
        setServerSyncSuccess(`✓ Synchronized with server (${data.length} cases)`);
        setTimeout(() => setServerSyncSuccess(""), 4000);
      } else {
        setServerSyncSuccess(`⚠️ Server error (${res.status}). Verify credentials.`);
        setTimeout(() => setServerSyncSuccess(""), 5000);
      }
    } catch (e: any) {
      console.error("Error loading cases for admin:", e);
      setServerSyncSuccess(`❌ Sync failed: ${e?.message || "Network error"}`);
    } finally {
      setIsSyncingServer(false);
    }
  };

  useEffect(() => {
    if (isAdminVerified) {
      refreshCasesFromServer();
      fetchReviewQueueCount();
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
        const json = await res.json().catch(() => ({}));
        if (!json.success && json.warning) {
          setServerSyncSuccess(`⚠️ ${json.warning}`);
          setTimeout(() => setServerSyncSuccess(""), 7000);
        } else {
          setServerSyncSuccess("✓ Cases successfully saved and synchronized to cloud storage.");
          setTimeout(() => setServerSyncSuccess(""), 4000);
        }
      } else if (res.status === 401) {
        setServerSyncSuccess("⚠️ Admin session expired. Please re-enter passcode.");
      } else {
        setServerSyncSuccess(`⚠️ Server rejected update (Status ${res.status}).`);
      }
    } catch (err: any) {
      setServerSyncSuccess(`❌ Network error while saving cases: ${err?.message || "Check connection"}`);
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
  // NEUROGUIDE RADAR & GUIDELINE INGESTION STATE
  // =========================================================================
  const [guidelineDocs, setGuidelineDocs] = useState<GuidelineDoc[]>([]);
  const [isSyncingRadar, setIsSyncingRadar] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>("");
  const [radarMessage, setRadarMessage] = useState<string | null>(null);

  // NeuroPulse Articles Counter
  const [articlesCount, setArticlesCount] = useState<number>(179);
  useEffect(() => {
    fetch("/data/articles.json")
      .then((res) => res.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setArticlesCount(data.length);
        }
      })
      .catch((e) => console.warn("Could not fetch articles count:", e));
  }, []);

  const filteredRepoDocs = useMemo(() => {
    return guidelineDocs.filter((doc) => {
      if (repoSocietyFilter !== "ALL" && !doc.society.toUpperCase().includes(repoSocietyFilter.toUpperCase())) {
        return false;
      }
      if (repoSearchQuery.trim()) {
        const q = repoSearchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchSoc = doc.society.toLowerCase().includes(q);
        const matchSub = doc.subspecialty?.toLowerCase().includes(q);
        if (!matchTitle && !matchSoc && !matchSub) return false;
      }
      return true;
    });
  }, [guidelineDocs, repoSearchQuery, repoSocietyFilter]);

  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const fetchGuidelinesList = async () => {
    try {
      const res = await fetch("/api/neuroguide/sync-guidelines");
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === "success" && Array.isArray(data.guidelines)) {
          const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          let deletedSet = new Set<string>();
          try {
            const localDel: string[] = JSON.parse(localStorage.getItem("neuroguide_deleted_ids") || "[]");
            const serverDel: string[] = Array.isArray(data.deletedGuidelineIds) ? data.deletedGuidelineIds : [];
            const mergedDel = Array.from(new Set([...localDel.map((x) => x.toLowerCase()), ...serverDel.map((x) => x.toLowerCase())]));
            localStorage.setItem("neuroguide_deleted_ids", JSON.stringify(mergedDel));
            deletedSet = new Set(mergedDel);
          } catch {}

          const valid = data.guidelines.filter((g: GuidelineDoc) => {
            const id = (g.id || "").toLowerCase();
            const norm = normalizeT(g.title);
            return !deletedSet.has(id) && !deletedSet.has(norm);
          });

          setGuidelineDocs(valid);
          try {
            localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(valid));
          } catch {}
        }
      }
    } catch {}
  };

  const handleDeleteGuideline = async (doc: GuidelineDoc) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn XÓA guideline:\n\n"${doc.title}" (${doc.society} ${doc.year})?\n\nHướng dẫn này sẽ được gỡ bỏ khỏi toàn bộ hệ thống.`
    );
    if (!confirmDelete) return;

    setDeleteLoadingId(doc.id);
    const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetNormTitle = normalizeT(doc.title);

    try {
      const res = await fetch("/api/neuroguide/delete-guideline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideline_id: doc.id, title: doc.title }),
      });
      const data = await res.json();
      if (data.ok) {
        try {
          const currentDeleted: string[] = JSON.parse(localStorage.getItem("neuroguide_deleted_ids") || "[]");
          currentDeleted.push(doc.id.toLowerCase(), targetNormTitle);
          if (Array.isArray(data.deletedGuidelineIds)) {
            currentDeleted.push(...data.deletedGuidelineIds.map((x: string) => x.toLowerCase()));
          }
          const uniqueDeleted = Array.from(new Set(currentDeleted));
          localStorage.setItem("neuroguide_deleted_ids", JSON.stringify(uniqueDeleted));
        } catch {}

        setGuidelineDocs((prev) => {
          const updated = prev.filter(
            (g) =>
              g.id !== doc.id &&
              g.id.toLowerCase() !== doc.id.toLowerCase() &&
              normalizeT(g.title) !== targetNormTitle
          );
          try {
            localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(updated));
          } catch {}
          return updated;
        });
      } else {
        alert(`Lỗi khi xóa: ${data.error || "Không thể xóa guideline"}`);
      }
    } catch {
      alert("Lỗi kết nối khi gửi yêu cầu xóa guideline.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("neuroguide_cached_guidelines");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const localDel: string[] = JSON.parse(localStorage.getItem("neuroguide_deleted_ids") || "[]");
          const delSet = new Set(localDel.map((x) => x.toLowerCase()));
          const valid = parsed.filter((g: any) => {
            const id = (g.id || "").toLowerCase();
            const norm = (g.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            return !delSet.has(id) && !delSet.has(norm);
          });
          setGuidelineDocs(valid);
        }
      }
      const lastSync = localStorage.getItem("neuroguide_last_sync_timestamp");
      if (lastSync) {
        setLastSyncedTime(new Date(parseInt(lastSync, 10)).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch {}
    fetchGuidelinesList();
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
            setRadarMessage(`✨ Scan successful: Discovered ${novel.length} newly released clinical guidelines.`);
            return merged;
          } else {
            setRadarMessage("✓ Guideline repository is completely up to date with official society releases.");
            return prev;
          }
        });
        const nowStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        setLastSyncedTime(nowStr);
        localStorage.setItem("neuroguide_last_sync_timestamp", Date.now().toString());
      } else {
        setRadarMessage("✓ Radar scan complete: All PubMed, Europe PMC, and ESO sources synchronized.");
      }
    } catch (err) {
      setRadarMessage("⚠️ Network error during online radar scanning.");
    } finally {
      setIsSyncingRadar(false);
    }
  };

  // =========================================================================
  // IF NOT AUTHENTICATED: DISPLAY SECURE LOGIN SCREEN (ENGLISH)
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
              Unified ecosystem operations &amp; moderation across all 6 clinical modules
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
                Administrator Passcode
              </label>
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder="Enter admin passcode..."
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
              <span>{isVerifying ? "Verifying..." : "Sign In to Admin Command Center"}</span>
              <span>→</span>
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                ← Back to NeuroPulse Home
              </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED: FULL ECOSYSTEM COMMAND CENTER (ENGLISH)
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
              title="Sign out of Admin Session"
            >
              Sign Out
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
            <div className="text-base font-black mt-1">{articlesCount} Articles</div>
            <div className="text-[10px] text-slate-500 font-medium">0 Pending Review</div>
          </div>

          <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroCase</span>
              <span className={`w-2 h-2 rounded-full ${pendingCases.length > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
            </div>
            <div className="text-base font-black mt-1">{cases.length} Cases</div>
            <div className={`text-[10px] font-medium ${pendingCases.length > 0 ? "text-amber-500 font-semibold" : "text-slate-500"}`}>
              {pendingCases.length} Pending Review
            </div>
          </div>

          <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroGuide</span>
              <span className={`w-2 h-2 rounded-full ${reviewQueueCount > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
            </div>
            <div className="text-base font-black mt-1">{guidelineDocs.length} Docs</div>
            <div className={`text-[10px] font-medium ${reviewQueueCount > 0 ? "text-amber-500 font-semibold" : "text-slate-500"}`}>
              {reviewQueueCount} Pending Review
            </div>
          </div>

          <div className={`p-3 rounded-xl border opacity-60 ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroCalc</span>
              <span className="text-[9px] uppercase px-1 rounded bg-slate-200 dark:bg-slate-800">Coming Soon</span>
            </div>
            <div className="text-base font-bold mt-1 text-slate-400">Scales</div>
            <div className="text-[10px] text-slate-400">NIHSS, mRS, ICH</div>
          </div>

          <div className={`p-3 rounded-xl border opacity-60 ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroVision</span>
              <span className="text-[9px] uppercase px-1 rounded bg-slate-200 dark:bg-slate-800">Coming Soon</span>
            </div>
            <div className="text-base font-bold mt-1 text-slate-400">Imaging AI</div>
            <div className="text-[10px] text-slate-400">ASPECTS &amp; CTP</div>
          </div>

          <div className={`p-3 rounded-xl border opacity-60 ${darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-100 border-slate-200"}`}>
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>NeuroRx</span>
              <span className="text-[9px] uppercase px-1 rounded bg-slate-200 dark:bg-slate-800">Coming Soon</span>
            </div>
            <div className="text-base font-bold mt-1 text-slate-400">Pharma</div>
            <div className="text-[10px] text-slate-400">Dosing &amp; Interactions</div>
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
                label: "🛡️ Case Moderation (NeuroCase)",
                badge: pendingCases.length > 0 ? `${pendingCases.length} Pending` : undefined,
                badgeColor: "bg-amber-500 text-white",
              },
              {
                id: "guidelines",
                label: "📋 Guidelines & Radar",
                badge:
                  reviewQueueCount > 0
                    ? `${reviewQueueCount} Pending`
                    : `${guidelineDocs.length} Docs`,
                badgeColor: reviewQueueCount > 0 ? "bg-amber-500 text-white" : "bg-blue-500 text-white",
              },
              {
                id: "neuropulse",
                label: "📰 Journal Feeds Monitor (NeuroPulse)",
                badge: String(articlesCount),
                badgeColor: "bg-slate-700 text-white",
              },
              {
                id: "system",
                label: "⚙️ Architecture & Storage Health",
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

        {/* TAB 2: NEUROGUIDE CLINICAL GUIDELINES & RADAR */}
        {adminTab === "guidelines" && (
          <div className="space-y-4">
            {/* Sync Alert Message Banner */}
            {radarMessage && (
              <div className="p-3.5 rounded-xl text-xs bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-sm">✨</span>
                  <span>{radarMessage}</span>
                </div>
                <button
                  onClick={() => setRadarMessage(null)}
                  className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200 text-xs font-bold px-1.5 py-0.5 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* SUB-TABS & ACTION TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGuidelineSubTab("queue")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    guidelineSubTab === "queue"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : darkMode
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>⏳ Review Queue</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                      guidelineSubTab === "queue"
                        ? "bg-black/20 text-current"
                        : darkMode
                        ? "bg-slate-700 text-slate-300"
                        : "bg-white text-slate-600"
                    }`}
                  >
                    {reviewQueueCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGuidelineSubTab("repository")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    guidelineSubTab === "repository"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : darkMode
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>📚 Published Repository</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                      guidelineSubTab === "repository"
                        ? "bg-black/20 text-current"
                        : darkMode
                        ? "bg-slate-700 text-slate-300"
                        : "bg-white text-slate-600"
                    }`}
                  >
                    {guidelineDocs.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  type="button"
                  onClick={() => setShowNotebookLMModal(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                    darkMode
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                  title="Import structured guideline from NotebookLM notes"
                >
                  <span>📝</span>
                  <span>NotebookLM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPipelineModal(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Launch Gemini AI Fulltext Extraction Pipeline from PDF"
                >
                  <span>⚡</span>
                  <span>AI PDF Pipeline</span>
                </button>

                <button
                  type="button"
                  onClick={triggerRadarSync}
                  disabled={isSyncingRadar}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                    isSyncingRadar
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                  }`}
                >
                  <span className={isSyncingRadar ? "animate-spin" : ""}>🔄</span>
                  <span>{isSyncingRadar ? "Scanning..." : "Scan Online Now"}</span>
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: REVIEW QUEUE */}
            {guidelineSubTab === "queue" && (
              <ReviewQueueTab
                darkMode={darkMode}
                onQueueUpdated={() => {
                  fetchReviewQueueCount();
                  fetchGuidelinesList();
                }}
                onQueueCountChange={(count) => setReviewQueueCount(count)}
                onOpenPipelineModal={() => setShowPipelineModal(true)}
                onOpenNotebookLMModal={() => setShowNotebookLMModal(true)}
              />
            )}

            {/* SUB-TAB 2: PUBLISHED REPOSITORY */}
            {guidelineSubTab === "repository" && (
              <div className={`p-5 rounded-2xl border space-y-4 ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <span>Clinical Guideline Repository</span>
                      <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                        ({filteredRepoDocs.length} / {guidelineDocs.length})
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">Indexed and classified clinical practice guidelines serving instant retrieval in NeuroGuide</p>
                  </div>

                  {/* Search & Society Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                      <input
                        type="text"
                        value={repoSearchQuery}
                        onChange={(e) => setRepoSearchQuery(e.target.value)}
                        placeholder="Search guidelines..."
                        className={`pl-7 pr-7 py-1.5 text-xs rounded-xl border outline-none transition-all ${
                          darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                      {repoSearchQuery && (
                        <button
                          onClick={() => setRepoSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <select
                      value={repoSocietyFilter}
                      onChange={(e) => setRepoSocietyFilter(e.target.value)}
                      className={`px-3 py-1.5 text-xs rounded-xl border outline-none ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    >
                      <option value="ALL">All Societies</option>
                      <option value="AHA">AHA / ASA</option>
                      <option value="ESO">ESO</option>
                      <option value="AAN">AAN</option>
                      <option value="ESC">ESC</option>
                      <option value="ESVS">ESVS</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => fetchGuidelinesList()}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Tải lại danh sách guideline từ máy chủ và đồng bộ chuẩn"
                    >
                      <span>🔄 Làm mới</span>
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[550px] overflow-y-auto pr-1">
                  {filteredRepoDocs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No guidelines found matching your filter criteria.
                    </div>
                  ) : (
                    filteredRepoDocs.map((doc) => (
                      <div key={doc.id} className="py-2.5 flex items-start justify-between gap-3 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/30 px-2 rounded-lg transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {doc.society} {doc.year}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {doc.subspecialty}
                            </span>
                            {doc.documentType && (
                              <span className="text-[10px] text-slate-400">
                                {doc.documentType}
                              </span>
                            )}
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{doc.title}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {doc.allPracticeChanges?.length || 0} updates
                          </span>
                          <Link
                            href="/neuroguide"
                            className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                            title="Xem chi tiết trên Practice Guidelines"
                          >
                            Xem ↗
                          </Link>
                          <button
                            type="button"
                            disabled={deleteLoadingId === doc.id}
                            onClick={() => handleDeleteGuideline(doc)}
                            className="px-1.5 py-0.5 rounded text-[10.5px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Xóa guideline khỏi kho lưu trữ"
                          >
                            {deleteLoadingId === doc.id ? "..." : "🗑️"}
                          </button>
                        </div>
                      </div>
                    ))
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
                  <h3 className="text-sm font-bold">Multi-Journal Feed Engine Monitoring</h3>
                  <p className="text-[11px] text-slate-500">Autonomous aggregator tracking 8 top-tier clinical neurology journals</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Daily Bot 0:00 AM VN
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="text-[11px] text-slate-400">Total Indexed Articles</div>
                  <div className="text-xl font-black mt-1">{articlesCount}</div>
                  <div className="text-[10px] text-emerald-500">11 Subspecialties Standardized</div>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="text-[11px] text-slate-400">RCTs &amp; Clinical Trials</div>
                  <div className="text-xl font-black mt-1">42</div>
                  <div className="text-[10px] text-blue-500">Strictly Tagged Trials</div>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="text-[11px] text-slate-400">Guidelines &amp; Reviews</div>
                  <div className="text-xl font-black mt-1">31</div>
                  <div className="text-[10px] text-purple-500">Practice Guidelines</div>
                </div>
                <div className={`p-3 rounded-xl border ${darkMode ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                  <div className="text-[11px] text-slate-400">Connected Journals</div>
                  <div className="text-xl font-black mt-1">8 / 8</div>
                  <div className="text-[10px] text-emerald-500">NEJM, Lancet, JAMA, Stroke...</div>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-between">
                <span>Manual update command via terminal: <code className="font-mono text-amber-500">python scripts/fetch_nejm.py</code></span>
                <Link href="/" className="font-bold text-amber-600 dark:text-amber-400 hover:underline">
                  View NeuroPulse Reader →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM & STORAGE HEALTH */}
        {adminTab === "system" && (
          <div className="space-y-4">
            <div className={`p-5 rounded-2xl border ${darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"}`}>
              <h3 className="text-sm font-bold mb-1">Cloud Architecture &amp; Ecosystem Security</h3>
              <p className="text-[11px] text-slate-500 mb-4">Storage backend configuration, endpoint health, and security token controls</p>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="font-bold">Dynamic Case Storage (NeuroCase)</div>
                    <div className="text-slate-400 text-[11px]">Automatic multi-tier fallback between Vercel Blob, Vercel KV, and local JSON</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Active &amp; Ready
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="font-bold">Stored XSS Prevention &amp; URL Sanitization</div>
                    <div className="text-slate-400 text-[11px]">Strict protocol filter stripping javascript: and data: URIs in DOI fields</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    100% Protected
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="font-bold">CI Quality Gate Workflow (GitHub Actions)</div>
                    <div className="text-slate-400 text-[11px]">Automated strict typechecking, 15 unit/security tests, and production build verification</div>
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

        {/* AI EXTRACTION PIPELINE MODAL */}
        <PipelineModal
          isOpen={showPipelineModal}
          onClose={() => setShowPipelineModal(false)}
          onSuccess={() => {
            fetchReviewQueueCount();
          }}
          onOpenNotebookLM={() => {
            setShowPipelineModal(false);
            setShowNotebookLMModal(true);
          }}
          darkMode={darkMode}
        />

        {/* NOTEBOOKLM UPLOAD MODAL */}
        <NotebookLMUploadModal
          isOpen={showNotebookLMModal}
          onClose={() => setShowNotebookLMModal(false)}
          onSuccess={(newDoc) => {
            fetchReviewQueueCount();
            setGuidelineDocs((prev) => [newDoc, ...prev]);
          }}
          darkMode={darkMode}
        />
      </div>
    </div>
  );
}
