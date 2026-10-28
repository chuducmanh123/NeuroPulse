"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ClinicalCase, CaseDifficulty, CaseStatus, CaseNeuroImaging } from "../../types/clinicalCase";
import { Article } from "../../types/article";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";
import { NeuroImagingViewer } from "../../components/neurocase/NeuroImagingViewer";
import { CaseChallenge } from "../../components/neurocase/CaseChallenge";
import { AdminAuthModal } from "../../components/neurocase/modals/AdminAuthModal";
import { AdminPreviewModal } from "../../components/neurocase/modals/AdminPreviewModal";
import { DailyTab } from "../../components/neurocase/tabs/DailyTab";
import { ArchiveTab } from "../../components/neurocase/tabs/ArchiveTab";
import { ExamTab } from "../../components/neurocase/tabs/ExamTab";
import { SubmitTab } from "../../components/neurocase/tabs/SubmitTab";
import { AdminTab } from "../../components/neurocase/tabs/AdminTab";
import { SUBSPECIALTY_TABS } from "../../constants/subspecialties";

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

export interface SpecialtyTheme {
  borderLeft: string;
  cardBg: string;
  cardBorder: string;
  badge: string;
  accentText: string;
  dotColor: string;
}

export function getSpecialtyTheme(subspecialty: string): SpecialtyTheme {
  const norm = (subspecialty || "").toLowerCase();
  if (norm.includes("stroke") || norm.includes("vascular")) {
    return {
      borderLeft: "border-l-rose-500",
      cardBg: "bg-rose-50/40 dark:bg-rose-950/20",
      cardBorder: "border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-500",
      badge: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800",
      accentText: "text-rose-600 dark:text-rose-400",
      dotColor: "bg-rose-500",
    };
  }
  if (norm.includes("critical") || norm.includes("neurocritical") || norm.includes("icu") || norm.includes("trauma") || norm.includes("tbi")) {
    return {
      borderLeft: "border-l-amber-500",
      cardBg: "bg-amber-50/40 dark:bg-amber-950/20",
      cardBorder: "border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-500",
      badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",
      accentText: "text-amber-600 dark:text-amber-400",
      dotColor: "bg-amber-500",
    };
  }
  if (norm.includes("epilepsy") || norm.includes("seizure")) {
    return {
      borderLeft: "border-l-purple-500",
      cardBg: "bg-purple-50/40 dark:bg-purple-950/20",
      cardBorder: "border-purple-200 dark:border-purple-900/60 hover:border-purple-400 dark:hover:border-purple-500",
      badge: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800",
      accentText: "text-purple-600 dark:text-purple-400",
      dotColor: "bg-purple-500",
    };
  }
  if (norm.includes("immuno") || norm.includes("neuroimmunology") || norm.includes("sclerosis")) {
    return {
      borderLeft: "border-l-emerald-500",
      cardBg: "bg-emerald-50/40 dark:bg-emerald-950/20",
      cardBorder: "border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-500",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800",
      accentText: "text-emerald-600 dark:text-emerald-400",
      dotColor: "bg-emerald-500",
    };
  }
  if (norm.includes("dementia") || norm.includes("cognit") || norm.includes("memory") || norm.includes("alzheimer")) {
    return {
      borderLeft: "border-l-cyan-500",
      cardBg: "bg-cyan-50/40 dark:bg-cyan-950/20",
      cardBorder: "border-cyan-200 dark:border-cyan-900/60 hover:border-cyan-400 dark:hover:border-cyan-500",
      badge: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
      accentText: "text-cyan-600 dark:text-cyan-400",
      dotColor: "bg-cyan-500",
    };
  }
  if (norm.includes("movement") || norm.includes("parkinson") || norm.includes("tremor") || norm.includes("ataxia")) {
    return {
      borderLeft: "border-l-indigo-500",
      cardBg: "bg-indigo-50/40 dark:bg-indigo-950/20",
      cardBorder: "border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-500",
      badge: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800",
      accentText: "text-indigo-600 dark:text-indigo-400",
      dotColor: "bg-indigo-500",
    };
  }
  if (norm.includes("neuromuscular") || norm.includes("myasthenia") || norm.includes("neuropathy") || norm.includes("als")) {
    return {
      borderLeft: "border-l-fuchsia-500",
      cardBg: "bg-fuchsia-50/40 dark:bg-fuchsia-950/20",
      cardBorder: "border-fuchsia-200 dark:border-fuchsia-900/60 hover:border-fuchsia-400 dark:hover:border-fuchsia-500",
      badge: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/50 dark:text-fuchsia-300 dark:border-fuchsia-800",
      accentText: "text-fuchsia-600 dark:text-fuchsia-400",
      dotColor: "bg-fuchsia-500",
    };
  }
  if (norm.includes("oncol") || norm.includes("tumor") || norm.includes("glioma") || norm.includes("cancer")) {
    return {
      borderLeft: "border-l-red-600",
      cardBg: "bg-red-50/40 dark:bg-red-950/20",
      cardBorder: "border-red-200 dark:border-red-900/60 hover:border-red-400 dark:hover:border-red-500",
      badge: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800",
      accentText: "text-red-600 dark:text-red-400",
      dotColor: "bg-red-600",
    };
  }
  if (norm.includes("headache") || norm.includes("migraine") || norm.includes("pain")) {
    return {
      borderLeft: "border-l-yellow-500",
      cardBg: "bg-yellow-50/40 dark:bg-yellow-950/20",
      cardBorder: "border-yellow-200 dark:border-yellow-900/60 hover:border-yellow-400 dark:hover:border-yellow-500",
      badge: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800",
      accentText: "text-yellow-600 dark:text-yellow-400",
      dotColor: "bg-yellow-500",
    };
  }
  if (norm.includes("infection") || norm.includes("meningit") || norm.includes("cns infection") || norm.includes("abscess")) {
    return {
      borderLeft: "border-l-teal-500",
      cardBg: "bg-teal-50/40 dark:bg-teal-950/20",
      cardBorder: "border-teal-200 dark:border-teal-900/60 hover:border-teal-400 dark:hover:border-teal-500",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-800",
      accentText: "text-teal-600 dark:text-teal-400",
      dotColor: "bg-teal-500",
    };
  }
  return {
    borderLeft: "border-l-slate-400",
    cardBg: "bg-slate-50/40 dark:bg-slate-800/30",
    cardBorder: "border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600",
    badge: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    accentText: "text-slate-500",
    dotColor: "bg-slate-400",
  };
}

interface UserCaseProgress {
  selectedOption: "A" | "B" | "C" | "D";
  isCorrect: boolean;
  answeredAt: string;
}

export default function NeuroCasePage() {
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Cross-Computer Server Sync State
  const [isSyncingServer, setIsSyncingServer] = useState(false);
  const [serverSyncSuccess, setServerSyncSuccess] = useState<string>("");

  // Navigation Tabs: daily | archive | exam | submit | admin
  const [activeTab, setActiveTab] = useState<"daily" | "archive" | "exam" | "submit" | "admin">("daily");
  const [activeCaseId, setActiveCaseId] = useState<string>("");

  // User Progress & Streak
  const [progressMap, setProgressMap] = useState<Record<string, UserCaseProgress>>({});
  const [wrongAttemptsMap, setWrongAttemptsMap] = useState<
    Record<string, ("A" | "B" | "C" | "D")[]>
  >({});
  const [showDetailedWorkup, setShowDetailedWorkup] = useState(false);
  const [streakDays, setStreakDays] = useState<number>(1);

  // Archive Filters
  const [selectedSub, setSelectedSub] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [selectedSolvedFilter, setSelectedSolvedFilter] = useState<"All" | "Unsolved" | "Solved">("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Board Exam Simulation State
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [examCaseIds, setExamCaseIds] = useState<string[]>([]);
  const [examCurrentIdx, setExamCurrentIdx] = useState(0);
  const [examAnswers, setExamAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [examTimeLeftSec, setExamTimeLeftSec] = useState(300);
  const [examSelectedSpecialties, setExamSelectedSpecialties] = useState<string[]>([]);

  // Admin Verification & Full Case Editing State
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");


  // In-Place Case Archive Viewing (View case directly in Archive without switching tab)
  const [archiveViewingCaseId, setArchiveViewingCaseId] = useState<string | null>(null);

  // Admin Case Preview Modal State
  const [adminPreviewCase, setAdminPreviewCase] = useState<ClinicalCase | null>(null);



  useEffect(() => {
    const savedDark = localStorage.getItem("neuro_dark_mode");
    if (savedDark === "true") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    const savedAdmin = Boolean(sessionStorage.getItem("neurocase_admin_token") || localStorage.getItem("neurocase_admin_token"));
    if (savedAdmin) setIsAdminVerified(true);



    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "admin") {
        if (savedAdmin) {
          setActiveTab("admin");
        } else {
          setShowAdminAuthModal(true);
        }
      } else if (
        tabParam === "daily" ||
        tabParam === "archive" ||
        tabParam === "exam" ||
        tabParam === "submit"
      ) {
        setActiveTab(tabParam);
      }
    }

    const savedProgress = localStorage.getItem("neurocase_progress_v1");
    if (savedProgress) {
      try {
        setProgressMap(JSON.parse(savedProgress));
      } catch (e) {
        console.error(e);
      }
    }

    const savedStreak = localStorage.getItem("neurocase_streak_days");
    if (savedStreak) {
      setStreakDays(Number(savedStreak) || 1);
    }

    const applyCasesData = (loadedCases: ClinicalCase[]) => {
      const merged = Array.isArray(loadedCases) ? loadedCases : [];
      setCases(merged);

      const todayIso = getLocalTodayIso();
      const isDailyCase = (c: ClinicalCase) =>
        !c.archive_only && c.is_daily_challenge === true;

      const activeDailies = merged
        .filter(
          (c) =>
            (!c.status || c.status === "approved") &&
            isDailyCase(c) &&
            c.published_date <= todayIso
        )
        .sort((a, b) => b.published_date.localeCompare(a.published_date));

      const firstDaily =
        activeDailies[0] ||
        merged
          .filter((c) => (!c.status || c.status === "approved") && isDailyCase(c))
          .sort((a, b) => b.published_date.localeCompare(a.published_date))[0] ||
        merged[0];
      if (firstDaily) {
        setActiveCaseId((prev) => prev || firstDaily.id);
      }
    };

    // 1. TỐC ĐỘ 0ms: Nạp ngay từ Cache trình duyệt nếu có (Local Cache-First)
    const cachedCasesStr = localStorage.getItem("neurocase_cached_cases_v2");
    if (cachedCasesStr) {
      try {
        const cached = JSON.parse(cachedCasesStr);
        if (Array.isArray(cached) && cached.length > 0) {
          applyCasesData(cached);
          setLoading(false);
        }
      } catch {}
    }

    // 2. TỐC ĐỘ 30ms: Nạp nhanh từ file tĩnh /data/cases.json của hệ thống (Edge Static)
    fetch("/data/cases.json")
      .then((r) => r.json())
      .then((staticCases: ClinicalCase[]) => {
        if (Array.isArray(staticCases) && staticCases.length > 0) {
          applyCasesData(staticCases);
          setLoading(false);
        }
      })
      .catch(() => {});

    // 3. BACKGROUND REVALIDATION: Đồng bộ ngầm với cloud server (/api/neurocase) không khoá màn hình
    const adminToken =
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token") ||
      "";
    const headers: Record<string, string> = adminToken ? { "x-admin-token": adminToken } : {};

    fetch("/api/neurocase", { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((cloudCases: ClinicalCase[] | null) => {
        if (Array.isArray(cloudCases) && cloudCases.length > 0) {
          applyCasesData(cloudCases);
          localStorage.setItem("neurocase_cached_cases_v2", JSON.stringify(cloudCases));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Background server sync skipped, using local data:", err);
        setLoading(false);
      });
  }, []);

  const refreshCasesFromServer = async () => {
    setIsSyncingServer(true);
    setServerSyncSuccess("");
    try {
      const res = await fetch(`/api/neurocase?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: ClinicalCase[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setCases(data);
        setServerSyncSuccess(`✓ Synchronized with server (${data.length} cases)`);
        setTimeout(() => setServerSyncSuccess(""), 4000);
      } else {
        setServerSyncSuccess("⚠️ Empty data from server");
        setTimeout(() => setServerSyncSuccess(""), 4000);
      }
    } catch (e: any) {
      console.error("Failed to sync from /api/neurocase:", e);
      setServerSyncSuccess(`⚠️ Sync failed (${e?.message || "Check server"})`);
      setTimeout(() => setServerSyncSuccess(""), 5000);
    } finally {
      setIsSyncingServer(false);
    }
  };

  // Exam countdown timer
  useEffect(() => {
    if (!examStarted || examFinished) return;
    const timer = setInterval(() => {
      setExamTimeLeftSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setExamFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examStarted, examFinished]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("neuro_dark_mode", String(next));
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  const approvedCases = useMemo(
    () =>
      cases
        .filter((c) => !c.status || c.status === "approved")
        .sort((a, b) => b.published_date.localeCompare(a.published_date)),
    [cases]
  );

  // Daily Challenge Track: ONLY approved cases with is_daily_challenge === true whose scheduled date has arrived,
  // sorted descending by published_date so index 0 is ALWAYS "⭐ Daily" and subsequent items are past Daily dates.
  const dailyChallengeCases = useMemo(() => {
    const todayIso = getLocalTodayIso();
    const isDaily = (c: ClinicalCase) =>
      !c.archive_only && c.is_daily_challenge === true;

    const eligible = approvedCases.filter(
      (c) => isDaily(c) && c.published_date <= todayIso
    );
    const pool =
      eligible.length > 0
        ? eligible
        : approvedCases.filter(isDaily);

    // If an Admin scheduled a custom Daily Challenge for a given date, it supersedes the auto-fetched one on that date
    const byDate = new Map<string, ClinicalCase>();
    const sorted = [...pool].sort((a, b) => {
      const dateCmp = b.published_date.localeCompare(a.published_date);
      if (dateCmp !== 0) return dateCmp;
      const aCustom = a.id.startsWith("nc-user-") ? 1 : 0;
      const bCustom = b.id.startsWith("nc-user-") ? 1 : 0;
      return bCustom - aCustom;
    });
    for (const item of sorted) {
      if (!byDate.has(item.published_date)) {
        byDate.set(item.published_date, item);
      }
    }
    return Array.from(byDate.values());
  }, [approvedCases]);

  const currentCase = useMemo(
    () =>
      approvedCases.find((c) => c.id === activeCaseId) ||
      dailyChallengeCases[0] ||
      approvedCases[0],
    [approvedCases, dailyChallengeCases, activeCaseId]
  );

  const handleSelectOption = (caseItem: ClinicalCase, optionId: string) => {
    const validOpt = optionId as "A" | "B" | "C" | "D";
    const isCorrect = validOpt === caseItem.challenge.correct_option;

    // NEJM Image Challenge Multi-Attempt ("Try Again!") behavior:
    // If incorrect, record the wrong option for this case so the user sees "Try again! That is not the correct answer."
    // without spoiling the correct answer or unlocking the final diagnosis yet.
    if (!isCorrect) {
      setWrongAttemptsMap((prev) => {
        const existing = prev[caseItem.id] || [];
        if (existing.includes(validOpt)) return prev;
        return { ...prev, [caseItem.id]: [...existing, validOpt] };
      });
      return;
    }

    const nextProgress: Record<string, UserCaseProgress> = {
      ...progressMap,
      [caseItem.id]: {
        selectedOption: validOpt,
        isCorrect: true,
        answeredAt: new Date().toISOString(),
      },
    };
    setProgressMap(nextProgress);
    localStorage.setItem("neurocase_progress_v1", JSON.stringify(nextProgress));

    const todayKey = new Date().toISOString().slice(0, 10);
    const lastStreakDate = localStorage.getItem("neurocase_last_streak_date");
    if (lastStreakDate !== todayKey) {
      const nextStreak = streakDays + 1;
      setStreakDays(nextStreak);
      localStorage.setItem("neurocase_streak_days", String(nextStreak));
      localStorage.setItem("neurocase_last_streak_date", todayKey);
    }
  };

  const handleResetCaseAttempt = (caseId: string) => {
    const next = { ...progressMap };
    delete next[caseId];
    setProgressMap(next);
    localStorage.setItem("neurocase_progress_v1", JSON.stringify(next));
    setWrongAttemptsMap((prev) => {
      const copy = { ...prev };
      delete copy[caseId];
      return copy;
    });
  };

  const handleNextChallenge = () => {
    const list = dailyChallengeCases.length > 0 ? dailyChallengeCases : approvedCases;
    if (!currentCase || list.length === 0) return;
    const idx = list.findIndex((c) => c.id === currentCase.id);
    const nextIdx = idx >= 0 ? (idx + 1) % list.length : 0;
    setActiveCaseId(list[nextIdx].id);
    setShowDetailedWorkup(false);
  };

  const formatChallengeDate = (isoDate: string) => {
    try {
      const d = new Date(`${isoDate}T00:00:00`);
      if (isNaN(d.getTime())) return isoDate;
      return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoDate;
    }
  };

  const hasVitals = (v?: { bp?: string; hr?: string; rr?: string; temp?: string; spo2?: string }) => {
    if (!v) return false;
    return Boolean(
      (v.bp && v.bp.trim()) ||
      (v.hr && v.hr.trim()) ||
      (v.rr && v.rr.trim()) ||
      (v.temp && v.temp.trim()) ||
      (v.spo2 && v.spo2.trim())
    );
  };

  const stats = useMemo(() => {
    const entries = Object.values(progressMap);
    const totalSolved = entries.length;
    const correctCount = entries.filter((e) => e.isCorrect).length;
    const accuracy = totalSolved > 0 ? Math.round((correctCount / totalSolved) * 100) : 0;
    return { totalSolved, correctCount, accuracy };
  }, [progressMap]);

  // Cross-Ecosystem Integration: Lazy-load heavy literature database (537KB) asynchronously after initial render
  useEffect(() => {
    if (!currentCase || articles.length > 0) return;
    const timer = setTimeout(() => {
      fetch("/data/articles.json")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setArticles(data);
        })
        .catch(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [currentCase, articles.length]);

  const relatedPulseArticles = useMemo(() => {
    if (!currentCase || articles.length === 0) return [];
    const keywords = currentCase.resolution.related_keywords.map((k) => k.toLowerCase());
    const sub = currentCase.subspecialty.toLowerCase();

    const matched = articles.filter((a) => {
      const text = `${a.title} ${a.abstract} ${a.neurology_classification?.subspecialty || ""}`.toLowerCase();
      return keywords.some((kw) => text.includes(kw)) || text.includes(sub);
    });
    return matched.slice(0, 3);
  }, [currentCase, articles]);

  const filteredArchiveCases = useMemo(() => {
    return approvedCases.filter((c) => {
      const subs = c.subspecialties || [c.subspecialty];
      const matchSub =
        selectedSub === "All" || subs.some((s) => s.toLowerCase() === selectedSub.toLowerCase());
      const matchDiff = selectedDifficulty === "All" || c.difficulty === selectedDifficulty;
      const isSolved = Boolean(progressMap[c.id]);
      const matchSolved =
        selectedSolvedFilter === "All" ||
        (selectedSolvedFilter === "Solved" && isSolved) ||
        (selectedSolvedFilter === "Unsolved" && !isSolved);
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        `${c.title} ${c.case_code} ${c.resolution.final_diagnosis} ${c.presentation.chief_complaint}`
          .toLowerCase()
          .includes(q);
      return matchSub && matchDiff && matchSolved && matchQuery;
    });
  }, [approvedCases, selectedSub, selectedDifficulty, selectedSolvedFilter, searchQuery, progressMap]);

  const archiveViewingCase = useMemo(
    () => (archiveViewingCaseId ? cases.find((c) => c.id === archiveViewingCaseId) || null : null),
    [cases, archiveViewingCaseId]
  );

  const archiveCurrentIdx = useMemo(() => {
    if (!archiveViewingCaseId) return -1;
    return filteredArchiveCases.findIndex((c) => c.id === archiveViewingCaseId);
  }, [filteredArchiveCases, archiveViewingCaseId]);

  const archiveRelatedArticles = useMemo(() => {
    if (!archiveViewingCase || articles.length === 0) return [];
    const keywords = (archiveViewingCase.resolution.related_keywords || []).map((k) =>
      k.toLowerCase()
    );
    const sub = archiveViewingCase.subspecialty.toLowerCase();

    const matched = articles.filter((a) => {
      const text = `${a.title} ${a.abstract} ${
        a.neurology_classification?.subspecialty || ""
      }`.toLowerCase();
      return keywords.some((kw) => text.includes(kw)) || text.includes(sub);
    });
    return matched.slice(0, 3);
  }, [archiveViewingCase, articles]);

  const examCasePool = useMemo(() => {
    if (examSelectedSpecialties.length === 0) return approvedCases;
    return approvedCases.filter((c) => {
      const subs = c.subspecialties || [c.subspecialty];
      return subs.some((s) => examSelectedSpecialties.includes(s));
    });
  }, [approvedCases, examSelectedSpecialties]);

  const startBoardExam = (requestedCount: number) => {
    const pool = examCasePool.length > 0 ? examCasePool : approvedCases;
    const count = Math.min(requestedCount, pool.length);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    setExamCaseIds(shuffled.map((c) => c.id));
    setExamCurrentIdx(0);
    setExamAnswers({});
    setExamTimeLeftSec(shuffled.length * 90);
    setExamStarted(true);
    setExamFinished(false);
  };

  const persistAdminCases = async (nextCases: ClinicalCase[]) => {
    setCases(nextCases);

    const token =
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token") ||
      "";

    try {
      setIsSyncingServer(true);
      const res = await fetch("/api/neurocase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ cases: nextCases }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.storage === "vercel-blob-failed" || data?.storage === "vercel-readonly") {
          const detail = data?.error ? `: ${data.error.slice(0, 40)}...` : "";
          setServerSyncSuccess(`⚠️ Storage error${detail || " (Check BLOB_READ_WRITE_TOKEN in Settings)"}`);
          setTimeout(() => setServerSyncSuccess(""), 6000);
        } else {
          setServerSyncSuccess("✓ Synced to server");
          setTimeout(() => setServerSyncSuccess(""), 3500);
        }
      } else if (res.status === 401) {
        setServerSyncSuccess("⚠️ Admin session expired. Please re-enter passcode.");
        setIsAdminVerified(false);
        sessionStorage.removeItem("neurocase_admin_token");
        localStorage.removeItem("neurocase_admin_token");
        setShowAdminAuthModal(true);
        setTimeout(() => setServerSyncSuccess(""), 5000);
      } else {
        const text = await res.text();
        console.error("Failed to sync to /api/neurocase:", res.status, text);
        setServerSyncSuccess(`⚠️ Server error (${res.status})`);
        setTimeout(() => setServerSyncSuccess(""), 5000);
      }
    } catch (err: any) {
      console.error("Failed to sync cases to /api/neurocase:", err);
      setServerSyncSuccess(`⚠️ Sync failed (${err?.message || "network error"})`);
      setTimeout(() => setServerSyncSuccess(""), 5000);
    } finally {
      setIsSyncingServer(false);
    }
  };

  const pendingCount = useMemo(
    () => cases.filter((c) => c.status === "pending" || c.status === "needs_revision").length,
    [cases]
  );

  const [adminScheduleDates, setAdminScheduleDates] = useState<Record<string, string>>({});

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
    persistAdminCases(nextCases);
    if (makeDaily && chosenDate <= todayIso) {
      setActiveCaseId(caseId);
    }
  };

  const handleStartFullEdit = (_caseItem: ClinicalCase) => {
    setAdminPreviewCase(null);
    setActiveTab("admin");
  };

  return (
    <main
      className={`min-h-screen py-8 px-4 sm:px-8 transition-colors duration-200 ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      <div className="max-w-6xl mx-auto">
        {/* NEUROCASE HEADER */}
        <header className="mb-6 pt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600 shadow-sm shadow-indigo-500/50"></span>
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-widest ${
                  darkMode ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                INTERACTIVE CLINICAL REASONING SUITE
              </span>
            </div>
            <h1
              className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              NEUROCASE
            </h1>
          </div>

          {/* Gamification Streak + Night Shift + 9-Dots App Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                darkMode
                  ? "bg-slate-900 border-slate-700 text-amber-300"
                  : "bg-white border-slate-200 text-slate-800"
              }`}
              title="Daily Case Streak"
            >
              <span>🔥 {streakDays}d Streak</span>
            </div>

            <button
              onClick={toggleDarkMode}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                darkMode
                  ? "bg-indigo-950 text-amber-300 border-indigo-800 hover:bg-indigo-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{darkMode ? "☀️ Light" : "🌙 Night Shift"}</span>
            </button>

            <AppSwitcher currentApp="neurocase" darkMode={darkMode} />
          </div>
        </header>

        {/* NAVIGATION BAR (Admin Review hidden unless verified as Admin) */}
        <nav
          className={`mb-6 p-1.5 rounded-xl border flex flex-wrap items-center justify-between gap-1.5 ${
            darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "daily", label: "🔥 Daily Challenge", badge: undefined },
              { id: "archive", label: "📚 Case Archive", badge: `${approvedCases.length}` },
              { id: "exam", label: "⏱️ Exam Mode", badge: undefined },
              { id: "submit", label: "➕ Submit Case", badge: undefined },
              ...(isAdminVerified
                ? [
                    {
                      id: "admin",
                      label: "🛡️ Admin Review",
                      badge: pendingCount > 0 ? `${pendingCount} Pending` : undefined,
                    },
                  ]
                : []),
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
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
                          : darkMode
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subtle Admin Lock / Unlock Button */}
          {isAdminVerified ? (
            <button
              type="button"
              onClick={() => {
                setIsAdminVerified(false);
                sessionStorage.removeItem("neurocase_admin_token");
                localStorage.removeItem("neurocase_admin_token");
                if (activeTab === "admin") setActiveTab("daily");
              }}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-emerald-500 hover:bg-emerald-500/10 transition-colors"
              title="Sign out of Admin Moderation Mode"
            >
              🔓 Admin Verified
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAdminPasscodeInput("");
                setAdminAuthError("");
                setShowAdminAuthModal(true);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                darkMode
                  ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title="Verify Admin access to unlock Case Moderation"
            >
              🔒 Admin
            </button>
          )}
        </nav>

        {loading && (
          <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-bold animate-pulse">
              Loading Neurology &amp; Stroke Clinical Cases...
            </p>
          </div>
        )}

        {/* =====================================================================
            TAB 1: DAILY CHALLENGE (NEJM IMAGE CHALLENGE SPLIT-SCREEN ARCHITECTURE)
           ===================================================================== */}
        {!loading && activeTab === "daily" && currentCase && (
          <DailyTab
            currentCase={currentCase}
            dailyChallengeCases={dailyChallengeCases}
            approvedCases={approvedCases}
            progressMap={progressMap}
            wrongAttemptsMap={wrongAttemptsMap}
            darkMode={darkMode}
            difficultyBadges={DIFFICULTY_BADGES}
            formatChallengeDate={formatChallengeDate}
            onSelectCase={(caseId) => {
              setActiveCaseId(caseId);
              setShowDetailedWorkup(false);
            }}
            onSelectOption={handleSelectOption}
            onNextChallenge={handleNextChallenge}
            onResetCaseAttempt={handleResetCaseAttempt}
            onBrowseArchive={() => setActiveTab("archive")}
            relatedPulseArticles={relatedPulseArticles}
          />
        )}

        {/* =====================================================================
            TAB 2: CASE ARCHIVE (11 SUBSPECIALTIES)
           ===================================================================== */}
        {!loading && activeTab === "archive" && (
          <ArchiveTab
            archiveViewingCase={archiveViewingCase}
            filteredArchiveCases={filteredArchiveCases}
            archiveCurrentIdx={archiveCurrentIdx}
            selectedSub={selectedSub}
            selectedDifficulty={selectedDifficulty}
            selectedSolvedFilter={selectedSolvedFilter}
            searchQuery={searchQuery}
            subspecialtyTabs={SUBSPECIALTY_TABS}
            darkMode={darkMode}
            difficultyBadges={DIFFICULTY_BADGES}
            progressMap={progressMap}
            wrongAttemptsMap={wrongAttemptsMap}
            archiveRelatedArticles={archiveRelatedArticles}
            getSpecialtyTheme={getSpecialtyTheme}
            onSelectSub={setSelectedSub}
            onSelectDifficulty={setSelectedDifficulty}
            onSelectSolvedFilter={setSelectedSolvedFilter}
            onSearchQueryChange={setSearchQuery}
            onSelectCaseToView={(cId) => {
              setArchiveViewingCaseId(cId);
              setShowDetailedWorkup(false);
            }}
            onSelectOption={handleSelectOption}
            onResetCaseAttempt={handleResetCaseAttempt}
          />
        )}

        {/* =====================================================================
            TAB 3: BOARD EXAM SIMULATION (TIMED MODE)
           ===================================================================== */}
        {!loading && activeTab === "exam" && (
          <ExamTab
            darkMode={darkMode}
            examStarted={examStarted}
            examFinished={examFinished}
            examTimeLeftSec={examTimeLeftSec}
            examCaseIds={examCaseIds}
            examCurrentIdx={examCurrentIdx}
            examAnswers={examAnswers}
            examSelectedSpecialties={examSelectedSpecialties}
            cases={cases}
            subspecialtyTabs={SUBSPECIALTY_TABS}
            onSetSelectedSpecialties={setExamSelectedSpecialties}
            onSetExamStarted={setExamStarted}
            onSetExamFinished={setExamFinished}
            onSetExamCurrentIdx={setExamCurrentIdx}
            onAnswerExamQuestion={(cId, opt) => setExamAnswers((prev) => ({ ...prev, [cId]: opt }))}
            onStartExam={() => startBoardExam(Math.min(5, examCasePool.length))}
            onResetExam={() => {
              setExamStarted(false);
              setExamFinished(false);
            }}
          />
        )}

        {/* =====================================================================
            TAB 4: USER SUBMISSION (/submit-case)
           ===================================================================== */}
        {!loading && activeTab === "submit" && (
          <SubmitTab
            darkMode={darkMode}
            approvedCases={approvedCases}
            subspecialtyTabs={SUBSPECIALTY_TABS}
            isAdminVerified={isAdminVerified}
            onOpenAdminReview={() => setActiveTab("admin")}
            getLocalTodayIso={getLocalTodayIso}
            onCaseSubmitted={async (newCase) => {
              setIsSyncingServer(true);
              try {
                const res = await fetch("/api/neurocase", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "submit", newCase }),
                });
                if (res.ok) {
                  setCases((prev) => [newCase, ...prev.filter((c) => c.id !== newCase.id)]);
                } else {
                  const errJson = await res.json().catch(() => null);
                  throw new Error(errJson?.error || "Server error");
                }
              } finally {
                setIsSyncingServer(false);
              }
            }}
          />
        )}

        {/* =====================================================================
            TAB 5: ADMIN MODERATION WORKFLOW (Only visible if Admin Verified)
           ===================================================================== */}
        {!loading && activeTab === "admin" && isAdminVerified && (
          <AdminTab
            darkMode={darkMode}
            cases={cases}
            approvedCases={approvedCases}
            dailyChallengeCases={dailyChallengeCases}
            serverSyncSuccess={serverSyncSuccess}
            isSyncingServer={isSyncingServer}
            refreshCasesFromServer={refreshCasesFromServer}
            onPersistAdminCases={persistAdminCases}
            onSetActiveCaseId={(id) => setActiveCaseId(id)}
            onPreviewCase={(c) => setAdminPreviewCase(c)}
            getLocalTodayIso={getLocalTodayIso}
            subspecialtyTabs={SUBSPECIALTY_TABS}
          />
        )}

        {/* ADMIN VERIFICATION MODAL */}
        <AdminAuthModal
          show={showAdminAuthModal}
          onClose={() => setShowAdminAuthModal(false)}
          darkMode={darkMode}
          onSuccess={() => {
            setIsAdminVerified(true);
            setActiveTab("admin");
          }}
        />
        {/* ADMIN CASE PREVIEW MODAL */}
        <AdminPreviewModal
          adminPreviewCase={adminPreviewCase}
          onClose={() => setAdminPreviewCase(null)}
          darkMode={darkMode}
          difficultyBadges={DIFFICULTY_BADGES}
          adminScheduleDates={adminScheduleDates}
          onStartFullEdit={handleStartFullEdit}
          onAdminUpdateStatus={handleAdminUpdateStatus}
        />
      </div>
    </main>
  );
}
