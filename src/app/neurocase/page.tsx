"use client";

import React, { ViewTransition, useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Flame, Layers, PlusCircle, Timer } from "lucide-react";
import { ClinicalCase, CaseDifficulty, CaseStatus, CaseNeuroImaging } from "../../types/clinicalCase";
import { Article } from "../../types/article";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";
import { AdminButton } from "../../components/ecosystem/AdminButton";
import { MedicalDisclaimerFooter } from "../../components/ecosystem/MedicalDisclaimerFooter";
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
import {
  getEcosystemDarkMode,
  setEcosystemDarkMode,
  subscribeEcosystemDarkMode,
} from "../../utils/themeSync";
import {
  getEffectiveStreakDays,
  computeNextStreakAfterDailySolve,
} from "../../utils/neurocaseStreak";

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
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-rose-400 dark:hover:border-rose-500",
      badge: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800",
      accentText: "text-rose-600 dark:text-rose-400",
      dotColor: "bg-rose-500",
    };
  }
  if (norm.includes("critical") || norm.includes("neurocritical") || norm.includes("icu") || norm.includes("trauma") || norm.includes("tbi")) {
    return {
      borderLeft: "border-l-amber-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-amber-400 dark:hover:border-amber-500",
      badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",
      accentText: "text-amber-600 dark:text-amber-400",
      dotColor: "bg-amber-500",
    };
  }
  if (norm.includes("epilepsy") || norm.includes("seizure")) {
    return {
      borderLeft: "border-l-purple-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-purple-400 dark:hover:border-purple-500",
      badge: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800",
      accentText: "text-purple-600 dark:text-purple-400",
      dotColor: "bg-purple-500",
    };
  }
  if (norm.includes("immuno") || norm.includes("neuroimmunology") || norm.includes("sclerosis")) {
    return {
      borderLeft: "border-l-emerald-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-emerald-400 dark:hover:border-emerald-500",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800",
      accentText: "text-emerald-600 dark:text-emerald-400",
      dotColor: "bg-emerald-500",
    };
  }
  if (norm.includes("dementia") || norm.includes("cognit") || norm.includes("memory") || norm.includes("alzheimer")) {
    return {
      borderLeft: "border-l-cyan-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-cyan-400 dark:hover:border-cyan-500",
      badge: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/50 dark:text-cyan-300 dark:border-cyan-800",
      accentText: "text-cyan-600 dark:text-cyan-400",
      dotColor: "bg-cyan-500",
    };
  }
  if (norm.includes("movement") || norm.includes("parkinson") || norm.includes("tremor") || norm.includes("ataxia")) {
    return {
      borderLeft: "border-l-[#6D28D9]",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-[#6D28D9] dark:hover:border-violet-500",
      badge: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/50 dark:text-violet-300 dark:border-violet-800",
      accentText: "text-[#6D28D9] dark:text-violet-400",
      dotColor: "bg-[#6D28D9]",
    };
  }
  if (norm.includes("neuromuscular") || norm.includes("myasthenia") || norm.includes("neuropathy") || norm.includes("als")) {
    return {
      borderLeft: "border-l-fuchsia-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-fuchsia-400 dark:hover:border-fuchsia-500",
      badge: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/50 dark:text-fuchsia-300 dark:border-fuchsia-800",
      accentText: "text-fuchsia-600 dark:text-fuchsia-400",
      dotColor: "bg-fuchsia-500",
    };
  }
  if (norm.includes("oncol") || norm.includes("tumor") || norm.includes("glioma") || norm.includes("cancer")) {
    return {
      borderLeft: "border-l-red-600",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-red-400 dark:hover:border-red-500",
      badge: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800",
      accentText: "text-red-600 dark:text-red-400",
      dotColor: "bg-red-600",
    };
  }
  if (norm.includes("headache") || norm.includes("migraine") || norm.includes("pain")) {
    return {
      borderLeft: "border-l-yellow-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-yellow-400 dark:hover:border-yellow-500",
      badge: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800",
      accentText: "text-yellow-600 dark:text-yellow-400",
      dotColor: "bg-yellow-500",
    };
  }
  if (norm.includes("infection") || norm.includes("meningit") || norm.includes("cns infection") || norm.includes("abscess")) {
    return {
      borderLeft: "border-l-teal-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-teal-400 dark:hover:border-teal-500",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-800",
      accentText: "text-teal-600 dark:text-teal-400",
      dotColor: "bg-teal-500",
    };
  }
  return {
    borderLeft: "border-l-stone-400",
    cardBg: "bg-[var(--bg-surface)]",
    cardBorder: "border-[var(--border-hairline)] hover:border-[#6D28D9] dark:hover:border-violet-500",
    badge: "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)]",
    accentText: "text-[#6D28D9] dark:text-violet-400",
    dotColor: "bg-stone-400",
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
  const [streakDays, setStreakDays] = useState<number>(0);

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
    setDarkMode(getEcosystemDarkMode());
    return subscribeEcosystemDarkMode(setDarkMode);
  }, []);

  useEffect(() => {
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

    const effectiveStreak = getEffectiveStreakDays(
      localStorage.getItem("neurocase_streak_days"),
      localStorage.getItem("neurocase_last_streak_date")
    );
    setStreakDays(effectiveStreak);
    if (effectiveStreak === 0) {
      localStorage.setItem("neurocase_streak_days", "0");
    }

    let cancelled = false;
    let hasLocalCache = false;
    let hasCloudData = false;

    const applyCasesData = (loadedCases: ClinicalCase[]) => {
      const merged = Array.isArray(loadedCases) ? loadedCases : [];
      setCases(merged);
    };

    // 1. TỐC ĐỘ 0ms: Nạp ngay từ Cache trình duyệt nếu có (Local Cache-First)
    const cachedCasesStr = localStorage.getItem("neurocase_cached_cases_v2");
    if (cachedCasesStr) {
      try {
        const cached = JSON.parse(cachedCasesStr);
        if (Array.isArray(cached) && cached.length > 0) {
          hasLocalCache = true;
          applyCasesData(cached);
          setLoading(false);
        }
      } catch {}
    }

    // 2. TỐC ĐỘ 30ms: Chỉ nạp từ file tĩnh /data/cases.json khi chưa có localStorage cache
    // Tránh ghi đè dữ liệu mới từ localStorage hoặc cloud bằng file tĩnh cũ
    if (!hasLocalCache) {
      fetch("/data/cases.json")
        .then((r) => r.json())
        .then((staticCases: ClinicalCase[]) => {
          if (cancelled || hasCloudData) return;
          if (Array.isArray(staticCases) && staticCases.length > 0) {
            applyCasesData(staticCases);
            setLoading(false);
          }
        })
        .catch(() => {});
    }

    // 3. BACKGROUND REVALIDATION: Đồng bộ ngầm với cloud server (/api/neurocase) không khoá màn hình
    const adminToken =
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token") ||
      "";
    const headers: Record<string, string> = adminToken ? { "x-admin-token": adminToken } : {};

    fetch("/api/neurocase", { cache: "no-store", headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((cloudCases: ClinicalCase[] | null) => {
        if (cancelled) return;
        if (Array.isArray(cloudCases) && cloudCases.length > 0) {
          hasCloudData = true;
          applyCasesData(cloudCases);
          try {
            localStorage.setItem("neurocase_cached_cases_v2", JSON.stringify(cloudCases));
          } catch {}
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Background server sync skipped, using local data:", err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
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
        localStorage.setItem("neurocase_cached_cases_v2", JSON.stringify(data));
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
    const next = !darkMode;
    setDarkMode(next);
    setEcosystemDarkMode(next);
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
      (activeCaseId ? approvedCases.find((c) => c.id === activeCaseId) : null) ||
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

    const isActiveDaily = Boolean(
      dailyChallengeCases[0] && caseItem.id === dailyChallengeCases[0].id
    );
    if (isActiveDaily) {
      const { nextStreak, todayKey } = computeNextStreakAfterDailySolve(
        streakDays,
        localStorage.getItem("neurocase_last_streak_date")
      );
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
    setActiveCaseId(nextIdx === 0 ? "" : list[nextIdx].id);
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
    try {
      localStorage.setItem("neurocase_cached_cases_v2", JSON.stringify(nextCases));
    } catch {}

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
        if (data?.storage === "serverless-readonly" || data?.success === false) {
          const detail = data?.error ? `: ${data.error.slice(0, 40)}...` : "";
          setServerSyncSuccess(`⚠️ Storage error${detail || " (Check Supabase credentials in Settings)"}`);
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
    <ViewTransition name="app-neurocase" share="app-morph" default="none">
      <main className="min-h-screen bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors duration-200 pb-10">
      {/* Unified Sticky App Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 px-4 py-3.5 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6D28D9] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#6D28D9]"></span>
              </span>
              <span>INTERACTIVE CLINICAL REASONING SUITE</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2.5">
              <h1 className="font-journal text-xl font-bold tracking-tight text-[var(--text-ink)] sm:text-2xl">
                NEUROCASE
              </h1>
              <span className="rounded-md bg-[#6D28D9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                NEW
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[#6D28D9] dark:text-violet-300 flex items-center gap-1.5"
              title="Daily Case Streak"
            >
              <span>🔥 {streakDays}d Streak</span>
            </div>

            {/* Mobile-only Night Shift & Admin controls (Desktop uses Left Rail) */}
            <div className="flex items-center gap-1.5 sm:hidden">
              <button
                type="button"
                onClick={toggleDarkMode}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] flex items-center gap-1"
                title="Toggle Night-Shift / Dark Mode"
              >
                <span>{darkMode ? "☀️" : "🌙"}</span>
              </button>
              <AdminButton darkMode={darkMode} />
            </div>

            <AppSwitcher currentApp="neurocase" darkMode={darkMode} />
          </div>
        </div>
      </header>

      {/* Unified Underline Tabs (Plum Violet #6D28D9 Accent) */}
      <nav className="border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto scrollbar-none -mb-px">
          {[
            { id: "daily", label: "Daily Challenge", icon: Flame, badge: undefined },
            { id: "archive", label: "Case Archive", icon: Layers, badge: `${approvedCases.length}` },
            { id: "exam", label: "Exam Mode", icon: Timer, badge: undefined },
            { id: "submit", label: "Submit Case", icon: PlusCircle, badge: undefined },
          ].map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as typeof activeTab);
                  if (tab.id === "daily") {
                    setActiveCaseId("");
                    setShowDetailedWorkup(false);
                  }
                }}
                className={`group relative shrink-0 pb-2.5 pt-2 text-[13px] transition-colors ${
                  active
                    ? "font-semibold text-[#6D28D9] dark:text-violet-400"
                    : "font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                }`}
              >
                <span className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors group-hover:bg-[var(--bg-subtle)]">
                  <Icon
                    size={15}
                    strokeWidth={1.75}
                    className={
                      active
                        ? "text-[#6D28D9] dark:text-violet-400"
                        : "text-[var(--text-muted)] group-hover:text-[var(--text-ink)]"
                    }
                  />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none ${
                        active
                          ? "bg-[#6D28D9]/15 text-[#6D28D9] dark:bg-violet-500/20 dark:text-violet-300"
                          : "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </span>
                {active && (
                  <span className="absolute inset-x-1 bottom-0 h-[2px] rounded-full bg-[#6D28D9] dark:bg-violet-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-5">
        {loading && (
          <div className="p-12 text-center rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <p className="text-sm font-bold animate-pulse text-[var(--text-muted)]">
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
              setActiveCaseId(caseId === dailyChallengeCases[0]?.id ? "" : caseId);
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
                  setCases((prev) => {
                    const next = [newCase, ...prev.filter((c) => c.id !== newCase.id)];
                    try {
                      localStorage.setItem("neurocase_cached_cases_v2", JSON.stringify(next));
                    } catch {}
                    return next;
                  });
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

        <MedicalDisclaimerFooter darkMode={darkMode} />
      </div>
      </main>
    </ViewTransition>
  );
}
