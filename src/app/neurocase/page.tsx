"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ClinicalCase, CaseDifficulty, CaseStatus, CaseNeuroImaging } from "../../types/clinicalCase";
import { Article } from "../../types/article";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";
import { NeuroImagingViewer } from "../../components/neurocase/NeuroImagingViewer";
import {
  extractClinicalCaseFromArticleText,
  extractTextFromUploadedDocument,
} from "../../utils/aiCaseExtractor";

const SUBSPECIALTY_TABS = [
  { label: "All Subspecialties", value: "All" },
  { label: "Vascular & Stroke", value: "Vascular & Stroke" },
  { label: "Neurocritical Care", value: "Neurocritical Care" },
  { label: "Traumatic Brain Injury (TBI)", value: "Traumatic Brain Injury (TBI)" },
  { label: "Epilepsy", value: "Epilepsy" },
  { label: "Cognitive & Dementia", value: "Cognitive & Dementia" },
  { label: "Neuroimmunology", value: "Neuroimmunology" },
  { label: "Neuromuscular", value: "Neuromuscular" },
  { label: "Movement Disorders", value: "Movement Disorders" },
  { label: "Headache & Pain", value: "Headache & Pain" },
  { label: "Neuro-Oncology", value: "Neuro-Oncology" },
  { label: "Other", value: "Other" },
];

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
  if (norm.includes("critical") || norm.includes("neurocritical") || norm.includes("icu")) {
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
  if (norm.includes("cognit") || norm.includes("dementia") || norm.includes("memory") || norm.includes("alzheimer")) {
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
  if (norm.includes("trauma") || norm.includes("tbi") || norm.includes("injury")) {
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

  // User Submission & Client-Side De-identification State
  const [subTitle, setSubTitle] = useState("");
  const [subSpecialty, setSubSpecialty] = useState("Vascular & Stroke");
  const [subDifficulty, setSubDifficulty] = useState<CaseDifficulty>("Resident");
  const [subPublishedDate, setSubPublishedDate] = useState("");
  const [subDemographics, setSubDemographics] = useState("");
  const [subPmh, setSubPmh] = useState("");
  const [subChiefComplaint, setSubChiefComplaint] = useState("");
  const [subHistory, setSubHistory] = useState("");
  const [subNeuroExam, setSubNeuroExam] = useState("");
  const [subLabsCsf, setSubLabsCsf] = useState("");
  const [subModality, setSubModality] = useState("");
  const [subFigCaption, setSubFigCaption] = useState("");
  const [subFindings, setSubFindings] = useState("");
  const [subVitalBp, setSubVitalBp] = useState("");
  const [subVitalHr, setSubVitalHr] = useState("");
  const [subVitalRr, setSubVitalRr] = useState("");
  const [subVitalTemp, setSubVitalTemp] = useState("");
  const [subVitalSpo2, setSubVitalSpo2] = useState("");
  const [subQuestion, setSubQuestion] = useState("");
  const [subOptA, setSubOptA] = useState("");
  const [subOptB, setSubOptB] = useState("");
  const [subOptC, setSubOptC] = useState("");
  const [subOptD, setSubOptD] = useState("");
  const [subOptARationale, setSubOptARationale] = useState("");
  const [subOptBRationale, setSubOptBRationale] = useState("");
  const [subOptCRationale, setSubOptCRationale] = useState("");
  const [subOptDRationale, setSubOptDRationale] = useState("");
  const [subPeerA, setSubPeerA] = useState<number>(64);
  const [subPeerB, setSubPeerB] = useState<number>(16);
  const [subPeerC, setSubPeerC] = useState<number>(12);
  const [subPeerD, setSubPeerD] = useState<number>(8);
  const [subCorrect, setSubCorrect] = useState<"A" | "B" | "C" | "D">("A");
  const [subDiagnosis, setSubDiagnosis] = useState("");
  const [subDiscussion, setSubDiscussion] = useState("");
  const [subTeachingPoint, setSubTeachingPoint] = useState("");
  const [subPitfall, setSubPitfall] = useState("");
  const [subAuthor, setSubAuthor] = useState("");
  const [subJournalName, setSubJournalName] = useState("");
  const [subDoiUrl, setSubDoiUrl] = useState("");
  const [subImageWebpUrl, setSubImageWebpUrl] = useState<string>("");
  const [subImageSizeKb, setSubImageSizeKb] = useState<number>(0);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  // Collapsible Optional Sections in Submit Case (collapsed by default so form stays clean)
  const [showSubMcqSection, setShowSubMcqSection] = useState(false);
  const [showSubResolutionSection, setShowSubResolutionSection] = useState(false);
  const [showSubMetadataVitalsSection, setShowSubMetadataVitalsSection] = useState(false);

  // Admin Verification & Full Case Editing State
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState<"pending" | "approved" | "rejected">(
    "pending"
  );
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ClinicalCase | null>(null);
  const [adminScheduleDates, setAdminScheduleDates] = useState<Record<string, string>>({});

  // In-Place Case Archive Viewing (View case directly in Archive without switching tab)
  const [archiveViewingCaseId, setArchiveViewingCaseId] = useState<string | null>(null);

  // Admin Case Preview Modal State
  const [adminPreviewCase, setAdminPreviewCase] = useState<ClinicalCase | null>(null);

  // Auto-Extracted Figures from Uploaded Document (.pdf, .docx)
  const [aiExtractedImages, setAiExtractedImages] = useState<string[]>([]);

  // AI Article / Document Case Extractor State (.pdf, .docx, .doc, .txt)
  const [showAiExtractor, setShowAiExtractor] = useState(false);
  const [aiRawText, setAiRawText] = useState("");
  const [aiPdfBase64, setAiPdfBase64] = useState<string | undefined>(undefined);
  const [uploadedDocName, setUploadedDocName] = useState<string>("");
  const [isReadingDoc, setIsReadingDoc] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [isExtractingAi, setIsExtractingAi] = useState(false);

  useEffect(() => {
    const savedDark = localStorage.getItem("neuro_dark_mode");
    if (savedDark === "true") setDarkMode(true);

    const savedAdmin = Boolean(sessionStorage.getItem("neurocase_admin_token") || localStorage.getItem("neurocase_admin_token"));
    if (savedAdmin) setIsAdminVerified(true);

    const savedKey = localStorage.getItem("neurocase_gemini_api_key") || "";
    if (savedKey) setGeminiApiKey(savedKey);

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

    Promise.all([
      fetch("/api/neurocase", { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .catch(() =>
          fetch("/data/cases.json", { cache: "no-store" }).then((r) => r.json())
        ),
      fetch("/data/articles.json")
        .then((r) => r.json())
        .catch(() => []),
    ])
      .then(([loadedCases, loadedArticles]: [ClinicalCase[], Article[]]) => {
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
        if (firstDaily) setActiveCaseId(firstDaily.id);
        setArticles(Array.isArray(loadedArticles) ? loadedArticles : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading NeuroCase data:", err);
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

  const handleSelectOption = (caseItem: ClinicalCase, optionId: "A" | "B" | "C" | "D") => {
    const isCorrect = optionId === caseItem.challenge.correct_option;

    // NEJM Image Challenge Multi-Attempt ("Try Again!") behavior:
    // If incorrect, record the wrong option for this case so the user sees "Try again! That is not the correct answer."
    // without spoiling the correct answer or unlocking the final diagnosis yet.
    if (!isCorrect) {
      setWrongAttemptsMap((prev) => {
        const existing = prev[caseItem.id] || [];
        if (existing.includes(optionId)) return prev;
        return { ...prev, [caseItem.id]: [...existing, optionId] };
      });
      return;
    }

    const nextProgress: Record<string, UserCaseProgress> = {
      ...progressMap,
      [caseItem.id]: {
        selectedOption: optionId,
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

  // Cross-Ecosystem Integration: Related Literature from NeuroPulse
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

  // Client-side Image Upload, EXIF Strip, PHI Blackout & WebP Compression (<150KB)
  const handleImageUploadForDeidentification = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const maxDim = 720;
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
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        exportCanvasToCompressedWebp();
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const applyPhiBlackoutMask = (zone: "top" | "bottom" | "corners") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000000";
    if (zone === "top") {
      ctx.fillRect(0, 0, canvas.width, Math.round(canvas.height * 0.14));
    } else if (zone === "bottom") {
      ctx.fillRect(0, Math.round(canvas.height * 0.86), canvas.width, Math.round(canvas.height * 0.14));
    } else if (zone === "corners") {
      const cw = Math.round(canvas.width * 0.32);
      const ch = Math.round(canvas.height * 0.16);
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillRect(canvas.width - cw, 0, cw, ch);
      ctx.fillRect(0, canvas.height - ch, cw, ch);
      ctx.fillRect(canvas.width - cw, canvas.height - ch, cw, ch);
    }
    exportCanvasToCompressedWebp();
  };

  const exportCanvasToCompressedWebp = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const webpDataUrl = canvas.toDataURL("image/webp", 0.72);
    setSubImageWebpUrl(webpDataUrl);
    const approxBytes = Math.round((webpDataUrl.length * 3) / 4);
    setSubImageSizeKb(Math.round(approxBytes / 102.4) / 10);
  };

  const handleArticleTextFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReadingDoc(true);
    setUploadedDocName(file.name);
    try {
      const res = await extractTextFromUploadedDocument(file);
      if (res.text) {
        setAiRawText(res.text);
      } else if (res.pdfBase64) {
        setAiRawText(
          `[Uploaded PDF Document: ${file.name}] — Click "Auto-Extract & Populate Form" to parse with Gemini AI.`
        );
      }
      setAiPdfBase64(res.pdfBase64);

      // Auto-extract candidate medical images from file (.pdf, .docx) directly into the form & canvas
      if (res.extractedImages && res.extractedImages.length > 0) {
        setAiExtractedImages(res.extractedImages);
        const primaryImage = res.extractedImages[0];
        setSubImageWebpUrl(primaryImage);

        // Draw onto client-side canvas so it is immediately de-identified & compressed
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const maxDim = 720;
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
            exportCanvasToCompressedWebp();
          }
        };
        img.src = primaryImage;
      }
    } catch (err) {
      console.error("Failed to read uploaded article document:", err);
    } finally {
      setIsReadingDoc(false);
    }
  };

  const resetAiImporterInputs = () => {
    setAiRawText("");
    setAiPdfBase64(undefined);
    setUploadedDocName("");
    if (docFileInputRef.current) {
      docFileInputRef.current.value = "";
    }
  };

  const resetAllSubmitFormFields = () => {
    setSubTitle("");
    setSubSpecialty("Vascular & Stroke");
    setSubDifficulty("Resident");
    setSubPublishedDate("");
    setSubDemographics("");
    setSubAuthor("");
    setSubJournalName("");
    setSubDoiUrl("");
    setSubPmh("");
    setSubChiefComplaint("");
    setSubHistory("");
    setSubNeuroExam("");
    setSubLabsCsf("");
    setSubModality("");
    setSubFigCaption("");
    setSubFindings("");
    setSubVitalBp("");
    setSubVitalHr("");
    setSubVitalRr("");
    setSubVitalTemp("");
    setSubVitalSpo2("");
    setSubQuestion("");
    setSubOptA("");
    setSubOptB("");
    setSubOptC("");
    setSubOptD("");
    setSubOptARationale("");
    setSubOptBRationale("");
    setSubOptCRationale("");
    setSubOptDRationale("");
    setSubPeerA(64);
    setSubPeerB(16);
    setSubPeerC(12);
    setSubPeerD(8);
    setSubCorrect("A");
    setSubDiagnosis("");
    setSubDiscussion("");
    setSubTeachingPoint("");
    setSubPitfall("");
    setSubAuthor("");
    setSubDoiUrl("");
    setSubImageWebpUrl("");
    setSubImageSizeKb(0);
    setAiExtractedImages([]);
    if (imageFileInputRef.current) {
      imageFileInputRef.current.value = "";
    }
    setShowSubMcqSection(false);
    setShowSubResolutionSection(false);
    setShowSubMetadataVitalsSection(false);
    resetAiImporterInputs();
  };

  const handleRunAiExtraction = async () => {
    if (!aiRawText.trim() && !aiPdfBase64) return;
    setIsExtractingAi(true);
    try {
      if (geminiApiKey.trim()) {
        localStorage.setItem("neurocase_gemini_api_key", geminiApiKey.trim());
      }
      const extracted = await extractClinicalCaseFromArticleText(
        aiRawText,
        geminiApiKey,
        aiPdfBase64
      );
      setSubTitle(extracted.title);
      setSubSpecialty(extracted.subspecialty);
      setSubDifficulty(extracted.difficulty);
      setSubAuthor(extracted.author_credit);
      setSubDoiUrl(extracted.doi_url || "");
      setSubDemographics(extracted.demographics);
      setSubPmh(extracted.past_medical_history);
      setSubChiefComplaint(extracted.chief_complaint);
      setSubHistory(extracted.history_of_present_illness);
      setSubNeuroExam(extracted.neuro_exam);
      setSubLabsCsf(extracted.key_labs_csf);
      setSubModality(extracted.modality);
      setSubFigCaption(extracted.figure_caption);
      setSubFindings(extracted.findings_summary);
      setSubQuestion(extracted.question);
      setSubOptA(extracted.optA);
      setSubOptB(extracted.optB);
      setSubOptC(extracted.optC);
      setSubOptD(extracted.optD);
      setSubOptARationale(extracted.optARationale);
      setSubOptBRationale(extracted.optBRationale);
      setSubOptCRationale(extracted.optCRationale);
      setSubOptDRationale(extracted.optDRationale);
      setSubCorrect(extracted.correctOption);
      setSubDiagnosis(extracted.final_diagnosis);
      setSubDiscussion(extracted.clinical_discussion);
      setSubTeachingPoint(extracted.teaching_points.join("\n"));
      setSubPitfall(extracted.clinical_pitfalls.join("\n"));

      // Clear the AI Importer inputs (file badge & raw text box) back to their initial empty state
      resetAiImporterInputs();

      setSubmitSuccessMsg(
        `✨ Successfully structured clinical case from ${extracted.journal_short}! Review the populated fields below and click Submit Case.`
      );
    } finally {
      setIsExtractingAi(false);
    }
  };

  const handleUserSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTitle.trim()) return;

    const parsedTeachingPoints = subTeachingPoint
      .split(/\n|•/)
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedPitfalls = subPitfall
      .split(/\n|•/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newCase: ClinicalCase = {
      id: `nc-user-${Date.now()}`,
      case_code: `NC-USER-${Math.floor(100 + Math.random() * 900)}`,
      title: subTitle.trim(),
      subspecialty: subSpecialty,
      subspecialties: [subSpecialty],
      difficulty: subDifficulty,
      estimated_time_sec: 90,
      is_daily_challenge: false,
      archive_only: true,
      published_date: subPublishedDate || getLocalTodayIso(),
      status: "pending",
      author_credit: subAuthor.trim() || "Community Clinician Contributor",
      source_journal: (subJournalName.trim() || subDoiUrl.trim())
        ? {
            name: subJournalName.trim() || subAuthor.trim() || "Clinical Submission",
            short_name: subJournalName.trim() ? subJournalName.trim().slice(0, 15) : "DOI Source",
            doi_url: subDoiUrl.trim(),
            pub_year: (subPublishedDate || new Date().toISOString()).slice(0, 4),
          }
        : undefined,
      presentation: {
        demographics: subDemographics.trim() || "Adult Patient",
        chief_complaint: subChiefComplaint.trim() || subTitle.trim(),
        history_of_present_illness:
          subHistory.trim() || "Clinical history provided by contributing author.",
        past_medical_history: subPmh.trim() || "As documented in clinical vignette",
        vitals: {
          bp: subVitalBp.trim() || "130/80 mmHg",
          hr: subVitalHr.trim() || "80 bpm",
          rr: subVitalRr.trim() || "18 /min",
          temp: subVitalTemp.trim() || "36.8 °C",
          spo2: subVitalSpo2.trim() || "98%",
        },
        neuro_exam: subNeuroExam.trim() || "Focal neurological findings as described.",
        key_labs_csf: subLabsCsf.trim() || "Baseline metabolic and CSF workup as indicated.",
        imaging: [
          {
            modality: subModality.trim() || "Brain CT / MRI",
            sequence_badge: "DE-IDENTIFIED WEBP",
            figure_label: "Figure 1",
            image_url:
              subImageWebpUrl ||
              (approvedCases[0]?.presentation.imaging[0]?.image_url ?? ""),
            caption:
              subFigCaption.trim() ||
              "Client-side de-identified clinical neuroimaging figure (.webp).",
            findings_summary:
              subFindings.trim() || "Characteristic neuroimaging abnormality.",
          },
        ],
      },
      challenge: {
        question:
          subQuestion.trim() ||
          "What is the most likely clinical diagnosis and optimal management strategy?",
        question_type: "Diagnosis",
        correct_option: subCorrect,
        options: [
          {
            id: "A",
            text: subOptA.trim() || "Primary clinical diagnosis / management option A",
            peer_percentage: Number(subPeerA) || (subCorrect === "A" ? 64 : 16),
            rationale:
              subOptARationale.trim() ||
              (subCorrect === "A"
                ? "Correct option per case author."
                : "Plausible clinical distractor."),
          },
          {
            id: "B",
            text: subOptB.trim() || "Alternative differential diagnosis B",
            peer_percentage: Number(subPeerB) || (subCorrect === "B" ? 64 : 16),
            rationale:
              subOptBRationale.trim() ||
              (subCorrect === "B"
                ? "Correct option per case author."
                : "Plausible clinical distractor."),
          },
          {
            id: "C",
            text: subOptC.trim() || "Alternative differential diagnosis C",
            peer_percentage: Number(subPeerC) || (subCorrect === "C" ? 64 : 12),
            rationale:
              subOptCRationale.trim() ||
              (subCorrect === "C"
                ? "Correct option per case author."
                : "Plausible clinical distractor."),
          },
          {
            id: "D",
            text: subOptD.trim() || "Alternative differential diagnosis D",
            peer_percentage: Number(subPeerD) || (subCorrect === "D" ? 64 : 8),
            rationale:
              subOptDRationale.trim() ||
              (subCorrect === "D"
                ? "Correct option per case author."
                : "Plausible clinical distractor."),
          },
        ],
      },
      resolution: {
        final_diagnosis: subDiagnosis.trim() || subTitle.trim(),
        clinical_discussion:
          subDiscussion.trim() || "Clinical discussion provided by contributing clinician.",
        teaching_points:
          parsedTeachingPoints.length > 0
            ? parsedTeachingPoints
            : ["Core clinical takeaway from this case."],
        clinical_pitfalls:
          parsedPitfalls.length > 0
            ? parsedPitfalls
            : ["Diagnostic pitfall to avoid in clinical practice."],
        related_keywords: [subSpecialty.toLowerCase(), "stroke", "neurology"],
      },
    };

    // Single case submission directly via public submit endpoint
    try {
      setIsSyncingServer(true);
      const res = await fetch("/api/neurocase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", newCase }),
      });
      if (res.ok) {
        setCases((prev) => [newCase, ...prev.filter((c) => c.id !== newCase.id)]);
        setSubmitSuccessMsg(
          `Case "${newCase.case_code}" submitted with PENDING status! It is saved directly to the server database and available in Admin Review across all computers.`
        );
        resetAllSubmitFormFields();
      } else {
        const errJson = await res.json().catch(() => null);
        setSubmitSuccessMsg(`⚠️ Submission failed: ${errJson?.error || "Server error"}`);
      }
    } catch (e: any) {
      console.error("Submission error:", e);
      setSubmitSuccessMsg(`⚠️ Submission network error: ${e?.message || "Check connection"}`);
    } finally {
      setIsSyncingServer(false);
    }
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
      // If setting this case as Daily Challenge for `chosenDate`, demote any other case on the exact same `chosenDate` to Archive Only
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
    persistAdminCases(nextCases);
    setEditingCaseId(null);
    setEditDraft(null);
  };

  const pendingCount = useMemo(
    () => cases.filter((c) => c.status === "pending" || c.status === "needs_revision").length,
    [cases]
  );

  const rejectedCount = useMemo(
    () => cases.filter((c) => c.status === "rejected").length,
    [cases]
  );

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
          <div className="space-y-6">
            {/* Quick Case Selector Strip */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 overflow-x-auto ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center gap-1.5 shrink-0">
                {dailyChallengeCases.slice(0, 7).map((c, idx) => {
                  const prog = progressMap[c.id];
                  const isSelected = c.id === currentCase.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveCaseId(c.id);
                        setShowDetailedWorkup(false);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-xs"
                          : prog
                          ? prog.isCorrect
                            ? darkMode
                              ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : darkMode
                            ? "bg-rose-950/60 text-rose-300 border-rose-800"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                          : darkMode
                          ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{idx === 0 ? "⭐ Daily" : c.published_date}</span>
                      {prog && <span>{prog.isCorrect ? "✓" : "✗"}</span>}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("archive")}
                className="text-xs font-bold text-indigo-500 hover:underline shrink-0"
              >
                Browse Archive ({approvedCases.length}) →
              </button>
            </div>

            {/* MAIN NEJM-STYLE CLINICAL & IMAGING CHALLENGE CARD */}
            <article
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              {/* Centered NEJM-Style Challenge Date Header */}
              <div
                className={`px-6 py-5 border-b text-center ${
                  darkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
                    CLINICAL &amp; IMAGING CHALLENGE
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {currentCase.subspecialty}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      DIFFICULTY_BADGES[currentCase.difficulty]
                    }`}
                  >
                    {currentCase.difficulty}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                  {formatChallengeDate(currentCase.published_date)}
                </h2>
              </div>

              {/* 2-COLUMN SPLIT VIEW: LEFT = NEUROIMAGING FIGURES | RIGHT = VIGNETTE & MCQ */}
              <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                {/* LEFT COLUMN (7/12): STICKY NEUROIMAGING VIEWER */}
                <div className="lg:col-span-7 lg:sticky lg:top-6">
                  <NeuroImagingViewer
                    imagingList={currentCase.presentation.imaging}
                    isSolved={Boolean(progressMap[currentCase.id]?.isCorrect)}
                    darkMode={darkMode}
                  />
                </div>

                {/* RIGHT COLUMN (5/12): CONCISE CLINICAL VIGNETTE + MULTI-ATTEMPT MCQ + ACTION BUTTONS */}
                <div className="lg:col-span-5 space-y-5">
                  {/* Single Cohesive Clinical Vignette Paragraph (NEJM Style) */}
                  <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed">
                    <p
                      className={
                        darkMode ? "text-slate-200 font-normal" : "text-slate-800 font-normal"
                      }
                    >
                      {currentCase.presentation.history_of_present_illness}{" "}
                      {currentCase.presentation.neuro_exam}{" "}
                      {currentCase.presentation.key_labs_csf}
                    </p>

                    {/* Optional Expandable Vitals & PMH Toggle (only shown if PMH or Vitals exist) */}
                    {(currentCase.presentation.past_medical_history || hasVitals(currentCase.presentation.vitals)) && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowDetailedWorkup((prev) => !prev)}
                          className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"
                        >
                          <span>
                            {showDetailedWorkup
                              ? hasVitals(currentCase.presentation.vitals)
                                ? "− Hide Vital Signs & Past Medical History"
                                : "− Hide Past Medical History"
                              : hasVitals(currentCase.presentation.vitals)
                              ? "+ View Vital Signs & Past Medical History"
                              : "+ View Past Medical History"}
                          </span>
                        </button>

                        {showDetailedWorkup && (
                          <div
                            className={`mt-2.5 p-3.5 rounded-xl border text-xs space-y-2.5 ${
                              darkMode
                                ? "bg-slate-800/60 border-slate-700 text-slate-200"
                                : "bg-slate-50 border-slate-200 text-slate-700"
                            }`}
                          >
                            {currentCase.presentation.demographics && (
                              <div>
                                <strong className="font-bold">Demographics: </strong>
                                {currentCase.presentation.demographics}
                              </div>
                            )}
                            {currentCase.presentation.past_medical_history && (
                              <div>
                                <strong className="font-bold">Past Medical History: </strong>
                                {currentCase.presentation.past_medical_history}
                              </div>
                            )}
                            {hasVitals(currentCase.presentation.vitals) && (
                              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1 text-center">
                                {currentCase.presentation.vitals?.bp && (
                                  <div className="p-1.5 rounded bg-slate-900 text-white">
                                    <span className="text-[9px] text-slate-400 block">BP</span>
                                    <span className="font-bold text-[11px] text-emerald-400">
                                      {currentCase.presentation.vitals.bp}
                                    </span>
                                  </div>
                                )}
                                {currentCase.presentation.vitals?.hr && (
                                  <div className="p-1.5 rounded bg-slate-900 text-white">
                                    <span className="text-[9px] text-slate-400 block">HR</span>
                                    <span className="font-bold text-[11px] text-amber-300">
                                      {currentCase.presentation.vitals.hr}
                                    </span>
                                  </div>
                                )}
                                {currentCase.presentation.vitals?.rr && (
                                  <div className="p-1.5 rounded bg-slate-900 text-white">
                                    <span className="text-[9px] text-slate-400 block">RR</span>
                                    <span className="font-bold text-[11px] text-sky-300">
                                      {currentCase.presentation.vitals.rr}
                                    </span>
                                  </div>
                                )}
                                {currentCase.presentation.vitals?.temp && (
                                  <div className="p-1.5 rounded bg-slate-900 text-white">
                                    <span className="text-[9px] text-slate-400 block">Temp</span>
                                    <span className="font-bold text-[11px]">
                                      {currentCase.presentation.vitals.temp}
                                    </span>
                                  </div>
                                )}
                                {currentCase.presentation.vitals?.spo2 && (
                                  <div className="p-1.5 rounded bg-slate-900 text-white">
                                    <span className="text-[9px] text-slate-400 block">SpO2</span>
                                    <span className="font-bold text-[11px] text-cyan-300">
                                      {currentCase.presentation.vitals.spo2}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Question Prompt */}
                    <p
                      className={`font-bold pt-1 ${
                        darkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {currentCase.challenge.question}
                    </p>
                  </div>

                  {/* NEJM-Style Option List with Multi-Attempt "Try again!" Feedback */}
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
                    {currentCase.challenge.options.map((opt) => {
                      const attempt = progressMap[currentCase.id];
                      const isCaseSolved = Boolean(attempt?.isCorrect);
                      const wrongList = wrongAttemptsMap[currentCase.id] || [];
                      const isWrongAttempt = wrongList.includes(opt.id);
                      const isCorrectOption = opt.id === currentCase.challenge.correct_option;

                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (!isCaseSolved && !isWrongAttempt) {
                              handleSelectOption(currentCase, opt.id);
                            }
                          }}
                          className={`py-3.5 px-2 transition-colors ${
                            isCaseSolved || isWrongAttempt
                              ? "cursor-default"
                              : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              {/* Radio / Status Icon */}
                              {isCaseSolved && isCorrectOption ? (
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                  ✓
                                </span>
                              ) : isWrongAttempt ? (
                                <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                  ✕
                                </span>
                              ) : (
                                <span
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                    darkMode ? "border-slate-600" : "border-slate-300"
                                  }`}
                                />
                              )}

                              <div className="space-y-1">
                                <span
                                  className={`text-sm leading-snug block ${
                                    isCaseSolved && isCorrectOption
                                      ? "font-black text-emerald-600 dark:text-emerald-400"
                                      : isWrongAttempt
                                      ? "font-bold text-rose-600 dark:text-rose-400"
                                      : darkMode
                                      ? "font-medium text-slate-200"
                                      : "font-medium text-slate-700"
                                  }`}
                                >
                                  {opt.text}
                                </span>

                                {/* NEJM "Try again! That is not the correct answer." */}
                                {isWrongAttempt && !isCaseSolved && (
                                  <p className="text-xs text-rose-600 dark:text-rose-400 animate-fadeIn">
                                    <strong className="font-black">Try again!</strong> That is not the correct answer.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Option Rationale (Unlocked when solved) */}
                          {isCaseSolved && (
                            <div className="mt-2 pl-8 space-y-1">
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                <strong
                                  className={`font-black ${
                                    isCorrectOption ? "text-emerald-600 dark:text-emerald-400" : ""
                                  }`}
                                >
                                  {isCorrectOption ? "Correct Answer: " : "Differential Note: "}
                                </strong>
                                {opt.rationale}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* NEJM-STYLE BOTTOM ACTION BAR: NEXT CHALLENGE & TRY AGAIN */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleNextChallenge}
                      className={`flex-1 py-2.5 px-4 rounded-lg border text-xs font-black uppercase tracking-wider transition-colors ${
                        darkMode
                          ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                          : "border-slate-300 text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      NEXT CHALLENGE
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetCaseAttempt(currentCase.id)}
                      className="py-2.5 px-5 rounded-lg text-xs font-black uppercase tracking-wider bg-sky-800 hover:bg-sky-900 text-white transition-colors flex items-center gap-1.5"
                    >
                      <span>↻</span>
                      <span>TRY AGAIN</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* =================================================
                  UNLOCKED RESOLUTION: FINAL DIAGNOSIS, DISCUSSION, TEACHING POINTS & NEUROPULSE LINKS
                 ================================================= */}
              {progressMap[currentCase.id]?.isCorrect && (
                <div className="p-5 sm:p-7 border-t border-slate-200 dark:border-slate-800 space-y-6 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-500">
                      Final Diagnosis, Teaching Points &amp; Clinical Pitfalls
                    </h3>

                    {currentCase.source_journal && (
                      <a
                        href={currentCase.source_journal.doi_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-500 hover:underline"
                      >
                        Published Source: {currentCase.source_journal.name} (
                        {currentCase.source_journal.pmcid || currentCase.source_journal.pub_year}) ↗
                      </a>
                    )}
                  </div>

                  {/* Final Diagnosis Box */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white border border-emerald-600/50">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-1">
                      FINAL CLINICAL DIAGNOSIS • {currentCase.case_code}
                    </span>
                    <p className="text-base sm:text-lg font-black">
                      {currentCase.resolution.final_diagnosis}
                    </p>
                  </div>

                  {/* Clinical Discussion */}
                  <div className="text-xs sm:text-sm leading-relaxed space-y-2 whitespace-pre-line">
                    <h4 className="font-black uppercase text-xs text-indigo-500">
                      📖 Clinical Discussion:
                    </h4>
                    <p>{currentCase.resolution.clinical_discussion}</p>
                  </div>

                  {/* Teaching Points & Clinical Pitfalls */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      className={`p-4 rounded-xl border ${
                        darkMode
                          ? "bg-emerald-950/30 border-emerald-800/70"
                          : "bg-emerald-50/70 border-emerald-200"
                      }`}
                    >
                      <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 mb-2">
                        💡 High-Yield Teaching Points
                      </h4>
                      <ul className="space-y-2 text-xs leading-relaxed list-disc pl-4">
                        {currentCase.resolution.teaching_points.map((tp, i) => (
                          <li key={i}>{tp}</li>
                        ))}
                      </ul>
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        darkMode
                          ? "bg-rose-950/30 border-rose-800/70"
                          : "bg-rose-50/70 border-rose-200"
                      }`}
                    >
                      <h4 className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 mb-2">
                        ⚠️ Clinical Pitfalls to Avoid
                      </h4>
                      <ul className="space-y-2 text-xs leading-relaxed list-disc pl-4">
                        {currentCase.resolution.clinical_pitfalls.map((pf, i) => (
                          <li key={i}>{pf}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CROSS-ECOSYSTEM LINK: RELATED ARTICLES FROM NEUROPULSE */}
                  {relatedPulseArticles.length > 0 && (
                    <div
                      className={`p-4 rounded-xl border ${
                        darkMode ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-black uppercase text-indigo-500 flex items-center gap-1.5">
                          <span>🔗 Related Literature on NeuroPulse</span>
                        </span>
                        <Link href="/" className="text-xs font-bold text-indigo-500 hover:underline">
                          Open NeuroPulse →
                        </Link>
                      </div>
                      <div className="space-y-2">
                        {relatedPulseArticles.map((art) => (
                          <a
                            key={art.id}
                            href={art.doi_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-3 rounded-lg border block transition-all ${
                              darkMode
                                ? "bg-slate-900 border-slate-700 hover:border-indigo-500"
                                : "bg-white border-slate-200 hover:border-indigo-400"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                                style={{
                                  backgroundColor: art.journal.badge_bg,
                                  color: art.journal.badge_text,
                                }}
                              >
                                {art.journal.short_name}
                              </span>
                              <span className="text-[10px] text-slate-400">{art.pub_date}</span>
                            </div>
                            <p className="text-xs font-bold leading-snug">{art.title}</p>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          </div>
        )}

        {/* =====================================================================
            TAB 2: CASE ARCHIVE (11 SUBSPECIALTIES)
           ===================================================================== */}
        {!loading && activeTab === "archive" && (
          archiveViewingCase ? (
            <div className="space-y-6">
              {/* Archive Navigation & Back Header */}
              <div
                className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                  darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setArchiveViewingCaseId(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>←</span>
                    <span>Back to Case Archive</span>
                  </button>
                  <span className="text-slate-400">|</span>
                  <span className="text-xs font-black text-indigo-500">{archiveViewingCase.case_code}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                    {archiveViewingCase.subspecialty}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      DIFFICULTY_BADGES[archiveViewingCase.difficulty]
                    }`}
                  >
                    {archiveViewingCase.difficulty}
                  </span>
                </div>

                {/* Sequential Case Browsing within Filtered Archive */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={archiveCurrentIdx <= 0}
                    onClick={() => {
                      if (archiveCurrentIdx > 0) {
                        setArchiveViewingCaseId(filteredArchiveCases[archiveCurrentIdx - 1].id);
                        setShowDetailedWorkup(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    ← Prev Case
                  </button>
                  <span className="text-xs font-semibold text-slate-400">
                    {archiveCurrentIdx >= 0 ? `${archiveCurrentIdx + 1} / ${filteredArchiveCases.length}` : ""}
                  </span>
                  <button
                    type="button"
                    disabled={archiveCurrentIdx >= filteredArchiveCases.length - 1}
                    onClick={() => {
                      if (archiveCurrentIdx < filteredArchiveCases.length - 1) {
                        setArchiveViewingCaseId(filteredArchiveCases[archiveCurrentIdx + 1].id);
                        setShowDetailedWorkup(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Next Case →
                  </button>
                </div>
              </div>

              {/* NEJM-STYLE CLINICAL & IMAGING CHALLENGE CARD (ARCHIVE MODE) */}
              <article
                className={`rounded-2xl border shadow-sm overflow-hidden ${
                  darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <div
                  className={`px-6 py-5 border-b text-center ${
                    darkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-100 bg-slate-50/50"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">
                      CASE ARCHIVE CHALLENGE
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                      {archiveViewingCase.subspecialty}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        DIFFICULTY_BADGES[archiveViewingCase.difficulty]
                      }`}
                    >
                      {archiveViewingCase.difficulty}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight">
                    {archiveViewingCase.title}
                  </h2>
                </div>

                <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                  {/* Left Column: NeuroImaging Viewer */}
                  <div className="lg:col-span-7 lg:sticky lg:top-6">
                    <NeuroImagingViewer
                      imagingList={archiveViewingCase.presentation.imaging}
                      isSolved={Boolean(progressMap[archiveViewingCase.id]?.isCorrect)}
                      darkMode={darkMode}
                    />
                  </div>

                  {/* Right Column: Vignette & MCQ */}
                  <div className="lg:col-span-5 space-y-5">
                    <div className="space-y-3 text-sm sm:text-[15px] leading-relaxed">
                      <p
                        className={
                          darkMode ? "text-slate-200 font-normal" : "text-slate-800 font-normal"
                        }
                      >
                        {archiveViewingCase.presentation.history_of_present_illness}{" "}
                        {archiveViewingCase.presentation.neuro_exam}{" "}
                        {archiveViewingCase.presentation.key_labs_csf}
                      </p>

                      {/* Optional Expandable Vitals & PMH Toggle (only shown if PMH or Vitals exist) */}
                      {(archiveViewingCase.presentation.past_medical_history || hasVitals(archiveViewingCase.presentation.vitals)) && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowDetailedWorkup((prev) => !prev)}
                            className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1"
                          >
                            <span>
                              {showDetailedWorkup
                                ? hasVitals(archiveViewingCase.presentation.vitals)
                                  ? "− Hide Vital Signs & Past Medical History"
                                  : "− Hide Past Medical History"
                                : hasVitals(archiveViewingCase.presentation.vitals)
                                ? "+ View Vital Signs & Past Medical History"
                                : "+ View Past Medical History"}
                            </span>
                          </button>

                          {showDetailedWorkup && (
                            <div
                              className={`mt-2.5 p-3.5 rounded-xl border text-xs space-y-2.5 ${
                                darkMode
                                  ? "bg-slate-800/60 border-slate-700 text-slate-200"
                                  : "bg-slate-50 border-slate-200 text-slate-700"
                              }`}
                            >
                              {archiveViewingCase.presentation.demographics && (
                                <div>
                                  <strong className="font-bold">Demographics: </strong>
                                  {archiveViewingCase.presentation.demographics}
                                </div>
                              )}
                              {archiveViewingCase.presentation.past_medical_history && (
                                <div>
                                  <strong className="font-bold">Past Medical History: </strong>
                                  {archiveViewingCase.presentation.past_medical_history}
                                </div>
                              )}
                              {hasVitals(archiveViewingCase.presentation.vitals) && (
                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 pt-1 text-center">
                                  {archiveViewingCase.presentation.vitals?.bp && (
                                    <div className="p-1.5 rounded bg-slate-900 text-white">
                                      <span className="text-[9px] text-slate-400 block">BP</span>
                                      <span className="font-bold text-[11px] text-emerald-400">
                                        {archiveViewingCase.presentation.vitals.bp}
                                      </span>
                                    </div>
                                  )}
                                  {archiveViewingCase.presentation.vitals?.hr && (
                                    <div className="p-1.5 rounded bg-slate-900 text-white">
                                      <span className="text-[9px] text-slate-400 block">HR</span>
                                      <span className="font-bold text-[11px] text-amber-300">
                                        {archiveViewingCase.presentation.vitals.hr}
                                      </span>
                                    </div>
                                  )}
                                  {archiveViewingCase.presentation.vitals?.rr && (
                                    <div className="p-1.5 rounded bg-slate-900 text-white">
                                      <span className="text-[9px] text-slate-400 block">RR</span>
                                      <span className="font-bold text-[11px] text-sky-300">
                                        {archiveViewingCase.presentation.vitals.rr}
                                      </span>
                                    </div>
                                  )}
                                  {archiveViewingCase.presentation.vitals?.temp && (
                                    <div className="p-1.5 rounded bg-slate-900 text-white">
                                      <span className="text-[9px] text-slate-400 block">Temp</span>
                                      <span className="font-bold text-[11px]">
                                        {archiveViewingCase.presentation.vitals.temp}
                                      </span>
                                    </div>
                                  )}
                                  {archiveViewingCase.presentation.vitals?.spo2 && (
                                    <div className="p-1.5 rounded bg-slate-900 text-white">
                                      <span className="text-[9px] text-slate-400 block">SpO2</span>
                                      <span className="font-bold text-[11px] text-cyan-300">
                                        {archiveViewingCase.presentation.vitals.spo2}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <p
                        className={`font-bold pt-1 ${
                          darkMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {archiveViewingCase.challenge.question}
                      </p>
                    </div>

                    {/* MCQ Options with Multi-Attempt Feedback */}
                    <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-b border-slate-200 dark:border-slate-800">
                      {archiveViewingCase.challenge.options.map((opt) => {
                        const attempt = progressMap[archiveViewingCase.id];
                        const isCaseSolved = Boolean(attempt?.isCorrect);
                        const wrongList = wrongAttemptsMap[archiveViewingCase.id] || [];
                        const isWrongAttempt = wrongList.includes(opt.id);
                        const isCorrectOption = opt.id === archiveViewingCase.challenge.correct_option;

                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              if (!isCaseSolved && !isWrongAttempt) {
                                handleSelectOption(archiveViewingCase, opt.id);
                              }
                            }}
                            className={`py-3.5 px-2 transition-colors ${
                              isCaseSolved || isWrongAttempt
                                ? "cursor-default"
                                : "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                {isCaseSolved && isCorrectOption ? (
                                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                    ✓
                                  </span>
                                ) : isWrongAttempt ? (
                                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                    ✕
                                  </span>
                                ) : (
                                  <span
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                                      darkMode ? "border-slate-600" : "border-slate-300"
                                    }`}
                                  />
                                )}

                                <div className="space-y-1">
                                  <span
                                    className={`text-sm leading-snug block ${
                                      isCaseSolved && isCorrectOption
                                        ? "font-black text-emerald-600 dark:text-emerald-400"
                                        : isWrongAttempt
                                        ? "font-bold text-rose-600 dark:text-rose-400"
                                        : darkMode
                                        ? "font-medium text-slate-200"
                                        : "font-medium text-slate-700"
                                    }`}
                                  >
                                    {opt.text}
                                  </span>

                                  {isWrongAttempt && !isCaseSolved && (
                                    <p className="text-xs text-rose-600 dark:text-rose-400 animate-fadeIn">
                                      <strong className="font-black">Try again!</strong> That is not the correct answer.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Option Rationale (Unlocked when solved) */}
                            {isCaseSolved && (
                              <div className="mt-2 pl-8 space-y-1">
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                  <strong
                                    className={`font-black ${
                                      isCorrectOption ? "text-emerald-600 dark:text-emerald-400" : ""
                                    }`}
                                  >
                                    {isCorrectOption ? "Correct Answer: " : "Differential Note: "}
                                  </strong>
                                  {opt.rationale}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (archiveCurrentIdx >= 0 && archiveCurrentIdx < filteredArchiveCases.length - 1) {
                            setArchiveViewingCaseId(filteredArchiveCases[archiveCurrentIdx + 1].id);
                            setShowDetailedWorkup(false);
                          } else {
                            setArchiveViewingCaseId(null);
                          }
                        }}
                        className={`flex-1 py-2.5 px-4 rounded-lg border text-xs font-black uppercase tracking-wider transition-colors ${
                          darkMode
                            ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                            : "border-slate-300 text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {archiveCurrentIdx >= 0 && archiveCurrentIdx < filteredArchiveCases.length - 1
                          ? "NEXT ARCHIVE CASE →"
                          : "← BACK TO ARCHIVE LIST"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResetCaseAttempt(archiveViewingCase.id)}
                        className="py-2.5 px-5 rounded-lg text-xs font-black uppercase tracking-wider bg-sky-800 hover:bg-sky-900 text-white transition-colors flex items-center gap-1.5"
                      >
                        <span>↻</span>
                        <span>TRY AGAIN</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Resolution & Discussion when solved */}
                {progressMap[archiveViewingCase.id]?.isCorrect && (
                  <div className="p-5 sm:p-7 border-t border-slate-200 dark:border-slate-800 space-y-6 animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-black uppercase tracking-wider text-emerald-500">
                        Final Diagnosis, Teaching Points &amp; Clinical Pitfalls
                      </h3>

                      {archiveViewingCase.source_journal && (
                        <a
                          href={archiveViewingCase.source_journal.doi_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-500 hover:underline"
                        >
                          Published Source: {archiveViewingCase.source_journal.name} (
                          {archiveViewingCase.source_journal.pmcid || archiveViewingCase.source_journal.pub_year}) ↗
                        </a>
                      )}
                    </div>

                    <div
                      className={`p-4 rounded-xl border ${
                        darkMode
                          ? "bg-emerald-950/20 border-emerald-900/60"
                          : "bg-emerald-50/70 border-emerald-200"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                        Definitive Diagnosis
                      </span>
                      <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300">
                        {archiveViewingCase.resolution.final_diagnosis}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Clinical Discussion &amp; Neuroimaging Correlation
                      </h4>
                      <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        {archiveViewingCase.resolution.clinical_discussion}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          darkMode
                            ? "bg-indigo-950/20 border-indigo-900/50"
                            : "bg-indigo-50/60 border-indigo-200"
                        }`}
                      >
                        <h4 className="text-xs font-black uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                          <span>💡</span>
                          <span>High-Yield Teaching Points</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {archiveViewingCase.resolution.teaching_points.map((pt, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-indigo-500 font-bold shrink-0">•</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div
                        className={`p-4 rounded-xl border space-y-2 ${
                          darkMode
                            ? "bg-rose-950/20 border-rose-900/50"
                            : "bg-rose-50/60 border-rose-200"
                        }`}
                      >
                        <h4 className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                          <span>⚠️</span>
                          <span>Clinical Pitfalls &amp; Diagnostic Traps</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {archiveViewingCase.resolution.clinical_pitfalls.map((pf, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-rose-500 font-bold shrink-0">•</span>
                              <span>{pf}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Cross-Ecosystem Link: Related Articles from NeuroPulse */}
                    {archiveRelatedArticles.length > 0 && (
                      <div
                        className={`p-4 rounded-xl border ${
                          darkMode ? "bg-slate-800/70 border-slate-700" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black uppercase text-indigo-500 flex items-center gap-1.5">
                            <span>🔗 Related Literature on NeuroPulse</span>
                          </span>
                          <Link href="/" className="text-xs font-bold text-indigo-500 hover:underline">
                            Open NeuroPulse →
                          </Link>
                        </div>
                        <div className="space-y-2">
                          {archiveRelatedArticles.map((art) => (
                            <a
                              key={art.id}
                              href={art.doi_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`p-3 rounded-lg border block transition-all ${
                                darkMode
                                  ? "bg-slate-900 border-slate-700 hover:border-indigo-500"
                                  : "bg-white border-slate-200 hover:border-indigo-400"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase"
                                  style={{
                                    backgroundColor: art.journal.badge_bg,
                                    color: art.journal.badge_text,
                                  }}
                                >
                                  {art.journal.short_name}
                                </span>
                                <span className="text-[10px] text-slate-400">{art.pub_date}</span>
                              </div>
                              <p className="text-xs font-bold leading-snug">{art.title}</p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            </div>
          ) : (
            <div className="space-y-5">
              <div
                className={`p-4 rounded-2xl border space-y-4 ${
                  darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
                }`}
              >
                <div className="flex flex-wrap gap-1.5">
                  {SUBSPECIALTY_TABS.map((tab) => {
                    const active = selectedSub === tab.value;
                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setSelectedSub(tab.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          active
                            ? "bg-indigo-600 text-white shadow-xs"
                            : darkMode
                            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      aria-label="Filter by difficulty"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <option value="All">All Difficulty Levels</option>
                      <option value="Resident">Resident</option>
                      <option value="Fellow">Fellow</option>
                      <option value="Attending">Attending</option>
                    </select>

                    <select
                      value={selectedSolvedFilter}
                      onChange={(e) => setSelectedSolvedFilter(e.target.value as typeof selectedSolvedFilter)}
                      aria-label="Filter by completion status"
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        darkMode
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Unsolved">Unsolved Only</option>
                      <option value="Solved">Completed</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search symptoms, syndromes, case ID..."
                    className={`px-3 py-1.5 rounded-lg text-xs border w-full sm:w-64 ${
                      darkMode
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredArchiveCases.map((c) => {
                  const prog = progressMap[c.id];
                  const theme = getSpecialtyTheme(c.subspecialty);
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setArchiveViewingCaseId(c.id);
                        setShowDetailedWorkup(false);
                      }}
                      className={`p-5 rounded-2xl border border-l-4 cursor-pointer transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                        theme.borderLeft
                      } ${theme.cardBorder} ${theme.cardBg}`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-500">
                              {c.case_code}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${theme.badge}`}>
                              {c.subspecialty}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                DIFFICULTY_BADGES[c.difficulty]
                              }`}
                            >
                              {c.difficulty}
                            </span>
                            {c.is_daily_challenge && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                ⭐ Daily ({c.published_date})
                              </span>
                            )}
                          </div>

                          {prog ? (
                            <span
                              className={`text-xs font-black ${
                                prog.isCorrect ? "text-emerald-500" : "text-rose-500"
                              }`}
                            >
                              {prog.isCorrect ? "✓ Solved" : "✗ Review"}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400">Unsolved</span>
                          )}
                        </div>

                        <h3 className="text-sm font-black mb-1.5 leading-snug">{c.title}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {c.presentation.chief_complaint}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">{c.presentation.demographics}</span>
                        <span className={`font-black flex items-center gap-1 ${theme.accentText}`}>
                          <span>Solve Case</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* =====================================================================
            TAB 3: BOARD EXAM SIMULATION (TIMED MODE)
           ===================================================================== */}
        {!loading && activeTab === "exam" && (
          <div
            className={`p-6 rounded-2xl border ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            {!examStarted ? (
              <div className="text-center max-w-2xl mx-auto py-6 space-y-6">
                <div className="space-y-2">
                  <span className="text-4xl">⏱️</span>
                  <h2 className="text-xl font-black">Exam Simulation Mode</h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-lg mx-auto">
                    Timed clinical vignettes with a <strong>90-second per case</strong> countdown timer.
                    Select one or multiple subspecialty domains below to customize your board exam block.
                  </p>
                </div>

                {/* Subspecialty Domain Multi-Selection */}
                <div
                  className={`p-4 rounded-2xl border text-left space-y-3 ${
                    darkMode ? "bg-slate-950/60 border-slate-800" : "bg-slate-50/80 border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase text-indigo-500 flex items-center gap-1.5">
                      <span>🎯</span>
                      <span>
                        Subspecialty Domains (
                        {examSelectedSpecialties.length === 0
                          ? "All Domains Selected"
                          : `${examSelectedSpecialties.length} Selected`}
                        )
                      </span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExamSelectedSpecialties([])}
                        className="text-[11px] font-bold text-indigo-500 hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-slate-400 text-xs">|</span>
                      <button
                        type="button"
                        onClick={() => {
                          const first = SUBSPECIALTY_TABS.find((t) => t.value !== "All")?.value || "Vascular & Stroke";
                          setExamSelectedSpecialties([first]);
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:underline"
                      >
                        Reset to 1st
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {SUBSPECIALTY_TABS.filter((t) => t.value !== "All").map((tab) => {
                      const countInSub = approvedCases.filter(
                        (c) =>
                          c.subspecialty === tab.value ||
                          (c.subspecialties && c.subspecialties.includes(tab.value))
                      ).length;
                      const isAll = examSelectedSpecialties.length === 0;
                      const isSelected = isAll || examSelectedSpecialties.includes(tab.value);
                      const theme = getSpecialtyTheme(tab.value);

                      return (
                        <button
                          key={tab.value}
                          type="button"
                          onClick={() => {
                            if (isAll) {
                              setExamSelectedSpecialties([tab.value]);
                            } else if (examSelectedSpecialties.includes(tab.value)) {
                              const next = examSelectedSpecialties.filter((s) => s !== tab.value);
                              setExamSelectedSpecialties(next);
                            } else {
                              setExamSelectedSpecialties([...examSelectedSpecialties, tab.value]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? `${theme.badge} ring-1 ring-current shadow-xs`
                              : darkMode
                              ? "bg-slate-800/60 border-slate-700/60 text-slate-400 opacity-60 hover:opacity-100"
                              : "bg-slate-100 border-slate-200 text-slate-500 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? theme.dotColor : "bg-slate-400"
                            }`}
                          />
                          <span>{tab.label}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-black">
                            {countInSub}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                    <span>
                      Question Pool:{" "}
                      <strong className="text-indigo-500 font-black">{examCasePool.length}</strong> available case{examCasePool.length === 1 ? "" : "s"}
                    </span>
                    {examCasePool.length === 0 ? (
                      <span className="text-rose-500 font-bold">
                        ⚠️ No approved cases in the selected domains
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {Math.round(examCasePool.length * 1.5)} minutes total allotted
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={examCasePool.length === 0}
                    onClick={() => startBoardExam(Math.min(4, examCasePool.length))}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    🚀 Quick Block: {Math.min(4, examCasePool.length)} Cases ({Math.round(Math.min(4, examCasePool.length) * 1.5)} min)
                  </button>
                  <button
                    type="button"
                    disabled={examCasePool.length === 0}
                    onClick={() => startBoardExam(examCasePool.length)}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    🏆 Full Block: {examCasePool.length} Cases ({Math.round(examCasePool.length * 1.5)} min)
                  </button>
                </div>
              </div>
            ) : examFinished ? (
              <div className="space-y-6">
                <div className="p-5 rounded-xl bg-gradient-to-r from-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-indigo-300">BOARD EXAM SCORE REPORT</span>
                    <h3 className="text-2xl font-black mt-1">
                      Score:{" "}
                      {
                        examCaseIds.filter(
                          (id) =>
                            examAnswers[id] ===
                            approvedCases.find((c) => c.id === id)?.challenge.correct_option
                        ).length
                      }{" "}
                      / {examCaseIds.length} Correct
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExamStarted(false)}
                    className="px-4 py-2 rounded-lg text-xs font-black bg-white text-slate-900"
                  >
                    Start New Exam Block ↺
                  </button>
                </div>

                <div className="space-y-3">
                  {examCaseIds.map((id, idx) => {
                    const c = approvedCases.find((item) => item.id === id);
                    if (!c) return null;
                    const userAns = examAnswers[id];
                    const isRight = userAns === c.challenge.correct_option;
                    return (
                      <div
                        key={id}
                        className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                          isRight
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : "border-rose-500/50 bg-rose-500/10"
                        }`}
                      >
                        <div>
                          <span className="text-xs font-black mr-2">
                            Question {idx + 1} ({c.subspecialty}):
                          </span>
                          <span className="text-xs sm:text-sm font-bold">{c.title}</span>
                          <p className="text-xs mt-1">
                            Your Answer: <strong>{userAns || "Unanswered"}</strong> | Correct Option:{" "}
                            <strong className="text-emerald-500">{c.challenge.correct_option}</strong> —{" "}
                            {c.resolution.final_diagnosis}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCaseId(c.id);
                            setActiveTab("daily");
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white"
                        >
                          Review Full Rationale →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              (() => {
                const examCase = approvedCases.find((c) => c.id === examCaseIds[examCurrentIdx]);
                if (!examCase) return null;
                const mins = Math.floor(examTimeLeftSec / 60);
                const secs = examTimeLeftSec % 60;
                return (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-black uppercase text-indigo-500">
                        Question {examCurrentIdx + 1} of {examCaseIds.length} • {examCase.subspecialty}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white">
                        ⏳ {mins}:{secs < 10 ? `0${secs}` : secs}
                      </span>
                    </div>

                    <h3 className="text-base font-black">{examCase.title}</h3>
                    <p className="text-xs sm:text-sm leading-relaxed">
                      {examCase.presentation.history_of_present_illness}
                    </p>
                    <p className="text-xs sm:text-sm leading-relaxed font-medium text-indigo-500">
                      Neuro Exam: {examCase.presentation.neuro_exam}
                    </p>
                    <p className="text-sm font-bold pt-2">{examCase.challenge.question}</p>

                    <div className="space-y-2.5">
                      {examCase.challenge.options.map((opt) => {
                        const chosen = examAnswers[examCase.id] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setExamAnswers((prev) => ({ ...prev, [examCase.id]: opt.id }))
                            }
                            className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-3 ${
                              chosen
                                ? "bg-indigo-600 text-white border-indigo-500"
                                : darkMode
                                ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                                : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            <span className="w-6 h-6 rounded bg-black/20 flex items-center justify-center font-black">
                              {opt.id}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                      <button
                        type="button"
                        disabled={examCurrentIdx === 0}
                        onClick={() => setExamCurrentIdx((i) => Math.max(0, i - 1))}
                        className="px-4 py-2 rounded-lg text-xs font-bold border disabled:opacity-40"
                      >
                        ← Previous
                      </button>

                      {examCurrentIdx < examCaseIds.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setExamCurrentIdx((i) => i + 1)}
                          className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 text-white"
                        >
                          Next Question →
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setExamFinished(true)}
                          className="px-5 py-2 rounded-lg text-xs font-black bg-emerald-600 text-white"
                        >
                          ✓ Submit &amp; Grade Exam
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 4: USER SUBMISSION (/submit-case) + CLIENT-SIDE DE-IDENTIFICATION
           ===================================================================== */}
        {!loading && activeTab === "submit" && (
          <div
            className={`p-6 rounded-2xl border space-y-6 ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Submit Clinical Case</h2>
              </div>

              <button
                type="button"
                onClick={() => setShowAiExtractor((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm hover:opacity-95 shrink-0"
              >
                {showAiExtractor
                  ? "✕ Close AI Importer"
                  : "✨ AI import from Article"}
              </button>
            </div>

            {/* 1-CLICK AI CASE EXTRACTOR FOR PAYWALLED / TOP JOURNALS (.pdf, .docx, .doc, .txt) */}
            {showAiExtractor && (
              <div
                className={`p-4 rounded-xl border-2 border-indigo-500/40 space-y-3 ${
                  darkMode ? "bg-indigo-950/25" : "bg-indigo-50/50"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-500">
                      ✨ SEMI-AUTOMATED HIGH-IMPACT JOURNAL IMPORTER
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload a journal article file (<code>.pdf</code>, <code>.docx</code>, <code>.doc</code>, <code>.txt</code>, <code>.md</code>) or paste the Case Presentation &amp; Discussion from{" "}
                      <strong>NEJM</strong>, <strong>JAMA Neurology</strong>,{" "}
                      <strong>Neurology</strong>, or <strong>The Lancet Neurology</strong> to auto-populate all fields below.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {uploadedDocName && (
                      <span className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-500 text-[11px] font-bold">
                        {isReadingDoc ? "⏳ Reading..." : `✓ ${uploadedDocName}`}
                      </span>
                    )}
                    <label className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white cursor-pointer hover:bg-slate-700 shrink-0">
                      📄 Upload Article (.pdf, .docx, .doc, .txt)
                      <input
                        ref={docFileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.md,.xml,.json"
                        onChange={handleArticleTextFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={aiRawText}
                  onChange={(e) => setAiRawText(e.target.value)}
                  placeholder="Paste full case presentation, MRI findings, discussion, and DOI (or upload a .pdf / .docx / .doc file above)..."
                  className={`w-full p-3 rounded-lg border text-xs leading-relaxed ${
                    darkMode
                      ? "bg-slate-900 border-slate-700 text-slate-100"
                      : "bg-white border-slate-300 text-slate-900"
                  }`}
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="Optional: Gemini API Key (AIza...) for LLM Board-Style MCQ & PDF parsing"
                    className={`px-3 py-2 rounded-lg border text-xs flex-1 min-w-[240px] ${
                      darkMode
                        ? "bg-slate-900 border-slate-700 text-slate-200"
                        : "bg-white border-slate-300 text-slate-800"
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isExtractingAi || isReadingDoc || (!aiRawText.trim() && !aiPdfBase64)}
                    onClick={handleRunAiExtraction}
                    className="px-4 py-2 rounded-lg text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isExtractingAi
                      ? "⏳ Structuring Clinical Case..."
                      : "⚡ Auto-Extract & Populate Form"}
                  </button>
                </div>
              </div>
            )}

            {submitSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500 text-emerald-500 text-xs font-bold flex items-center justify-between">
                <span>{submitSuccessMsg}</span>
                {isAdminVerified && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("admin")}
                    className="px-3 py-1 rounded bg-emerald-600 text-white font-black"
                  >
                    Open Admin Review →
                  </button>
                )}
              </div>
            )}

            <form onSubmit={handleUserSubmitCase} className="space-y-4 text-xs sm:text-sm">
              {/* CORE ESSENTIAL FIELDS (ALWAYS VISIBLE) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-bold block mb-1">Case Title *</label>
                  <input
                    required
                    value={subTitle}
                    onChange={(e) => setSubTitle(e.target.value)}
                    placeholder="e.g., Acute Isolated Oculomotor Nerve Palsy with Thunderclap Headache in a 52-Year-Old..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Subspecialty</label>
                  <select
                    value={subSpecialty}
                    onChange={(e) => setSubSpecialty(e.target.value)}
                    aria-label="Select subspecialty"
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    {SUBSPECIALTY_TABS.filter((t) => t.value !== "All").map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1">Demographics</label>
                  <input
                    value={subDemographics}
                    onChange={(e) => setSubDemographics(e.target.value)}
                    placeholder="e.g., 58-year-old right-handed male"
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Difficulty</label>
                  <select
                    value={subDifficulty}
                    onChange={(e) => setSubDifficulty(e.target.value as CaseDifficulty)}
                    aria-label="Select difficulty"
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <option value="Resident">Resident</option>
                    <option value="Fellow">Fellow</option>
                    <option value="Attending">Attending</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold block mb-1">Past Medical History</label>
                  <input
                    value={subPmh}
                    onChange={(e) => setSubPmh(e.target.value)}
                    placeholder="Hypertension, diabetes, prior surgeries..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* Vital Signs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="font-bold block mb-1">BP</label>
                  <input
                    value={subVitalBp}
                    onChange={(e) => setSubVitalBp(e.target.value)}
                    placeholder="130/80 mmHg"
                    className={`w-full p-2 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">HR</label>
                  <input
                    value={subVitalHr}
                    onChange={(e) => setSubVitalHr(e.target.value)}
                    placeholder="80 bpm"
                    className={`w-full p-2 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">RR</label>
                  <input
                    value={subVitalRr}
                    onChange={(e) => setSubVitalRr(e.target.value)}
                    placeholder="18 /min"
                    className={`w-full p-2 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Temp</label>
                  <input
                    value={subVitalTemp}
                    onChange={(e) => setSubVitalTemp(e.target.value)}
                    placeholder="36.8 °C"
                    className={`w-full p-2 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">SpO2</label>
                  <input
                    value={subVitalSpo2}
                    onChange={(e) => setSubVitalSpo2(e.target.value)}
                    placeholder="98%"
                    className={`w-full p-2 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold block mb-1">History of Present Illness (HPI)</label>
                  <textarea
                    rows={3}
                    value={subHistory}
                    onChange={(e) => setSubHistory(e.target.value)}
                    placeholder="Describe symptom onset, progression, and relevant timeline..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Neurological Examination</label>
                  <textarea
                    rows={3}
                    value={subNeuroExam}
                    onChange={(e) => setSubNeuroExam(e.target.value)}
                    placeholder="GCS, NIHSS, cranial nerves, motor/sensory/cerebellar findings..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Key Labs, CSF &amp; Workup</label>
                  <textarea
                    rows={3}
                    value={subLabsCsf}
                    onChange={(e) => setSubLabsCsf(e.target.value)}
                    placeholder="CSF cell count/protein, autoimmune panel, EEG/EMG, or labs..."
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>

              {/* CLIENT-SIDE PHI DE-IDENTIFICATION & WEBP COMPRESSION STUDIO */}
              <div
                className={`p-4 rounded-xl border ${
                  darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black uppercase text-indigo-500">
                    CLINICAL &amp; IMAGING
                  </span>
                  {subImageSizeKb > 0 && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[11px] font-black">
                      ✓ EXIF Stripped • WebP Size: {subImageSizeKb} KB
                    </span>
                  )}
                </div>

                {/* Auto-extracted candidate figures from uploaded document (.pdf, .docx) */}
                {aiExtractedImages.length > 0 && (
                  <div className="mb-3 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/10 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <span>💡</span> Auto-extracted {aiExtractedImages.length} clinical figure{aiExtractedImages.length > 1 ? "s" : ""} from uploaded document:
                      </span>
                      <span className="text-[11px] text-slate-400">Click a figure to load into form</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {aiExtractedImages.map((imgUrl, idx) => {
                        const isCurrent = subImageWebpUrl === imgUrl;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSubImageWebpUrl(imgUrl);
                              const img = new Image();
                              img.onload = () => {
                                const canvas = canvasRef.current;
                                if (!canvas) return;
                                const maxDim = 720;
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
                                  exportCanvasToCompressedWebp();
                                }
                              };
                              img.src = imgUrl;
                            }}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                              isCurrent
                                ? "border-indigo-500 ring-2 ring-indigo-500/40"
                                : "border-slate-700 opacity-60 hover:opacity-100"
                            }`}
                          >
                            <img src={imgUrl} alt={`Figure ${idx + 1}`} className="w-16 h-16 object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] text-center font-bold text-white py-0.5">
                              {isCurrent ? "✓ Active" : `Fig ${idx + 1}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <input
                    ref={imageFileInputRef}
                    type="file"
                    accept="image/*"
                    aria-label="Upload CT or MRI image for de-identification"
                    onChange={handleImageUploadForDeidentification}
                    className="text-xs"
                  />
                  {subImageWebpUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => applyPhiBlackoutMask("top")}
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                      >
                        ⬛ Mask Top Banner
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPhiBlackoutMask("corners")}
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                      >
                        ⬛ Mask 4 DICOM Corners
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPhiBlackoutMask("bottom")}
                        className="px-2.5 py-1 rounded bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
                      >
                        ⬛ Mask Bottom Banner
                      </button>
                    </>
                  )}
                </div>

                <canvas
                  ref={canvasRef}
                  className={`max-h-52 rounded border border-slate-700 mx-auto ${
                    subImageWebpUrl ? "block" : "hidden"
                  }`}
                />

                {/* Figure Modality, Caption & Key Findings directly inside CLINICAL & IMAGING */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="font-bold block mb-1">Figure Modality / Type</label>
                    <input
                      value={subModality}
                      onChange={(e) => setSubModality(e.target.value)}
                      placeholder="e.g., Clinical photo, Brain MRI, CT, EEG"
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Figure Caption / Description</label>
                    <input
                      value={subFigCaption}
                      onChange={(e) => setSubFigCaption(e.target.value)}
                      placeholder="Description of clinical finding or view..."
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Key Findings Summary</label>
                    <input
                      value={subFindings}
                      onChange={(e) => setSubFindings(e.target.value)}
                      placeholder="Abnormal findings interpretation..."
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1">Final Clinical Diagnosis</label>
                <input
                  value={subDiagnosis}
                  onChange={(e) => setSubDiagnosis(e.target.value)}
                  placeholder="Definitive diagnosis (e.g., Percheron Artery Bilateral Paramedian Thalamic Infarction)..."
                  className={`w-full p-2.5 rounded-lg border ${
                    darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              {/* ===============================================================
                  COLLAPSIBLE OPTIONAL SECTIONS (Matching Full Admin Case Editor)
                 =============================================================== */}
              <div className="space-y-3 pt-1">
                {/* 1. COLLAPSIBLE: MULTIPLE-CHOICE QUESTION, 4 OPTIONS, PEER % & RATIONALES */}
                <div
                  className={`rounded-xl border overflow-hidden ${
                    darkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setShowSubMcqSection((prev) => !prev)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide hover:bg-indigo-500/5 transition-colors"
                  >
                    <span className="text-indigo-500">
                      {showSubMcqSection ? "▼" : "▶"} Optional: Multiple-Choice Question Prompt, 4 Options (A–D), Peer % &amp; Rationales
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {showSubMcqSection ? "Click to collapse" : "Collapsed (Optional)"}
                    </span>
                  </button>

                  {showSubMcqSection && (
                    <div
                      className={`p-4 border-t space-y-3 text-xs ${
                        darkMode ? "border-slate-800" : "border-slate-200"
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3">
                          <label className="font-bold block mb-1">
                            Multiple-Choice Question Prompt (Optional)
                          </label>
                          <input
                            value={subQuestion}
                            onChange={(e) => setSubQuestion(e.target.value)}
                            placeholder="What is the most likely diagnosis or next best management step?"
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">Correct Option</label>
                          <select
                            value={subCorrect}
                            onChange={(e) =>
                              setSubCorrect(e.target.value as "A" | "B" | "C" | "D")
                            }
                            aria-label="Select correct option"
                            className={`w-full p-2 rounded border font-black ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-emerald-400"
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
                        {[
                          {
                            id: "A" as const,
                            val: subOptA,
                            setVal: setSubOptA,
                            rat: subOptARationale,
                            setRat: setSubOptARationale,
                            peer: subPeerA,
                            setPeer: setSubPeerA,
                          },
                          {
                            id: "B" as const,
                            val: subOptB,
                            setVal: setSubOptB,
                            rat: subOptBRationale,
                            setRat: setSubOptBRationale,
                            peer: subPeerB,
                            setPeer: setSubPeerB,
                          },
                          {
                            id: "C" as const,
                            val: subOptC,
                            setVal: setSubOptC,
                            rat: subOptCRationale,
                            setRat: setSubOptCRationale,
                            peer: subPeerC,
                            setPeer: setSubPeerC,
                          },
                          {
                            id: "D" as const,
                            val: subOptD,
                            setVal: setSubOptD,
                            rat: subOptDRationale,
                            setRat: setSubOptDRationale,
                            peer: subPeerD,
                            setPeer: setSubPeerD,
                          },
                        ].map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border space-y-1.5 ${
                              subCorrect === item.id
                                ? "border-emerald-500/60 bg-emerald-500/5"
                                : darkMode
                                ? "border-slate-800 bg-slate-950"
                                : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-black">Option {item.id} Text</span>
                              {subCorrect === item.id && (
                                <span className="text-[10px] font-bold text-emerald-500">
                                  ✓ Correct Option
                                </span>
                              )}
                            </div>
                            <input
                              value={item.val}
                              onChange={(e) => item.setVal(e.target.value)}
                              placeholder={`Option ${item.id} choice...`}
                              className={`w-full p-1.5 rounded border ${
                                darkMode
                                  ? "bg-slate-900 border-slate-700 text-white"
                                  : "bg-slate-50 border-slate-300"
                              }`}
                            />
                            <textarea
                              rows={2}
                              value={item.rat}
                              onChange={(e) => item.setRat(e.target.value)}
                              placeholder={`Rationale / explanation for Option ${item.id} (Optional)...`}
                              className={`w-full p-1.5 rounded border ${
                                darkMode
                                  ? "bg-slate-900 border-slate-700 text-slate-300"
                                  : "bg-slate-50 border-slate-300"
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. COLLAPSIBLE: CLINICAL DISCUSSION, HIGH-YIELD TEACHING POINTS & PITFALLS */}
                <div
                  className={`rounded-xl border overflow-hidden ${
                    darkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setShowSubResolutionSection((prev) => !prev)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide hover:bg-indigo-500/5 transition-colors"
                  >
                    <span className="text-indigo-500">
                      {showSubResolutionSection ? "▼" : "▶"} Optional: Clinical Discussion, High-Yield Teaching Points &amp; Pitfalls
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {showSubResolutionSection ? "Click to collapse" : "Collapsed (Optional)"}
                    </span>
                  </button>

                  {showSubResolutionSection && (
                    <div
                      className={`p-4 border-t space-y-3 text-xs ${
                        darkMode ? "border-slate-800" : "border-slate-200"
                      }`}
                    >
                      <div>
                        <label className="font-bold block mb-1">Clinical Discussion</label>
                        <textarea
                          rows={4}
                          value={subDiscussion}
                          onChange={(e) => setSubDiscussion(e.target.value)}
                          placeholder="Pathophysiology, neuroimaging correlation, and evidence-based management..."
                          className={`w-full p-2 rounded border ${
                            darkMode
                              ? "bg-slate-800 border-slate-700 text-white"
                              : "bg-white border-slate-300"
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
                            value={subTeachingPoint}
                            onChange={(e) => setSubTeachingPoint(e.target.value)}
                            placeholder="Key board-style clinical takeaways..."
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                        <div>
                          <label className="font-bold block mb-1">
                            Clinical Pitfalls to Avoid
                          </label>
                          <textarea
                            rows={3}
                            value={subPitfall}
                            onChange={(e) => setSubPitfall(e.target.value)}
                            placeholder="Diagnostic or management pitfalls to avoid..."
                            className={`w-full p-2 rounded border ${
                              darkMode
                                ? "bg-slate-800 border-slate-700 text-white"
                                : "bg-white border-slate-300"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SOURCE & REFERENCE */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  darkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className="text-xs font-black uppercase text-indigo-500 block">
                  SOURCE &amp; REFERENCE
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-bold block mb-1">Source / Journal</label>
                    <input
                      value={subJournalName}
                      onChange={(e) => setSubJournalName(e.target.value)}
                      placeholder="e.g., NEJM, JAMA, Lancet"
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-bold block mb-1">Source DOI / URL</label>
                    <input
                      value={subDoiUrl}
                      onChange={(e) => setSubDoiUrl(e.target.value)}
                      placeholder="https://doi.org/10.1212/..."
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Published Date</label>
                    <input
                      type="date"
                      value={subPublishedDate}
                      onChange={(e) => setSubPublishedDate(e.target.value)}
                      className={`w-full p-2 rounded-lg border ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                      }`}
                    />
                  </div>
                </div>
                <div>
                  <label className="font-bold block mb-1 text-xs">Author / Institution</label>
                  <input
                    value={subAuthor}
                    onChange={(e) => setSubAuthor(e.target.value)}
                    placeholder="e.g., Dr. Jane Doe • Stroke Center"
                    className={`w-full p-2 rounded-lg border text-xs ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl text-xs font-black uppercase bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
              >
                Submit Case
              </button>
            </form>
          </div>
        )}

        {/* =====================================================================
            TAB 5: ADMIN MODERATION WORKFLOW (Only visible if Admin Verified)
           ===================================================================== */}
        {!loading && activeTab === "admin" && isAdminVerified && (
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
        )}

        {/* ADMIN VERIFICATION MODAL */}
        {showAdminAuthModal && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowAdminAuthModal(false)}
          >
            <div
              className={`max-w-sm w-full rounded-2xl border p-6 shadow-2xl space-y-4 ${
                darkMode
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-500">
                  🛡️ ADMIN AUTHENTICATION
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdminAuthModal(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              </div>

              <h3 className="text-base font-black">Verify Admin Access</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter the administrator passcode to unlock the Case Moderation Queue (<code>Admin Review</code>).
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAdminAuthError("");
                  try {
                    const res = await fetch("/api/neurocase", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "verify_admin",
                        passcode: adminPasscodeInput.trim(),
                      }),
                    });
                    const data = await res.json().catch(() => null);
                    if (res.ok && data?.success && data?.token) {
                      setIsAdminVerified(true);
                      sessionStorage.setItem("neurocase_admin_token", data.token);
                      localStorage.setItem("neurocase_admin_token", data.token);
                      setShowAdminAuthModal(false);
                      setAdminPasscodeInput("");
                      setActiveTab("admin");
                    } else {
                      setAdminAuthError(data?.error || "Invalid administrator passcode.");
                    }
                  } catch (err: any) {
                    setAdminAuthError("Network error verifying passcode.");
                  }
                }}
                className="space-y-3"
              >
                <input
                  type="password"
                  value={adminPasscodeInput}
                  onChange={(e) => {
                    setAdminPasscodeInput(e.target.value);
                    setAdminAuthError("");
                  }}
                  placeholder="Enter admin passcode"
                  autoFocus
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-xs font-bold ${
                    darkMode
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
                {adminAuthError && (
                  <p className="text-xs font-bold text-rose-500">{adminAuthError}</p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdminAuthModal(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold border border-slate-600/40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Unlock Admin Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* =====================================================================
            ADMIN CASE PREVIEW MODAL (Live split-screen reviewer before approving)
           ===================================================================== */}
        {adminPreviewCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div
              className={`relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border shadow-2xl p-5 sm:p-7 space-y-6 animate-fadeIn ${
                darkMode
                  ? "bg-slate-900 border-slate-700 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              {/* Modal Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👁️</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-indigo-500">
                        Admin Case Preview Mode
                      </span>
                      <span className="text-xs font-black">{adminPreviewCase.case_code}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                        {adminPreviewCase.subspecialty}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          DIFFICULTY_BADGES[adminPreviewCase.difficulty]
                        }`}
                      >
                        {adminPreviewCase.difficulty}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          adminPreviewCase.status === "approved"
                            ? "bg-emerald-600 text-white"
                            : adminPreviewCase.status === "rejected"
                            ? "bg-rose-600 text-white"
                            : "bg-amber-400 text-slate-950"
                        }`}
                      >
                        Status: {adminPreviewCase.status || "approved"}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-xl font-black mt-1">
                      {adminPreviewCase.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const caseToEdit = adminPreviewCase;
                      setAdminPreviewCase(null);
                      handleStartFullEdit(caseToEdit);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-700 text-white hover:bg-slate-600 transition-colors"
                  >
                    ✏️ Edit Case
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminPreviewCase(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    ✕ Close Preview
                  </button>
                </div>
              </div>

              {/* 2-Column Split View Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: NeuroImaging Viewer */}
                <div className="lg:col-span-7">
                  <NeuroImagingViewer
                    imagingList={adminPreviewCase.presentation.imaging}
                    isSolved={true}
                    darkMode={darkMode}
                  />
                </div>

                {/* Right Column: Vignette & MCQ with highlighted correct answer */}
                <div className="lg:col-span-5 space-y-4 text-xs sm:text-sm">
                  <div className="space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Clinical Vignette (HPI, Exam &amp; Labs)
                    </span>
                    <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                      {adminPreviewCase.presentation.history_of_present_illness}{" "}
                      {adminPreviewCase.presentation.neuro_exam}{" "}
                      {adminPreviewCase.presentation.key_labs_csf}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 bg-slate-50/50 dark:bg-slate-800/30">
                    {adminPreviewCase.presentation.demographics && (
                      <div>
                        <strong>Demographics: </strong> {adminPreviewCase.presentation.demographics}
                      </div>
                    )}
                    {adminPreviewCase.presentation.past_medical_history && (
                      <div>
                        <strong>PMH: </strong> {adminPreviewCase.presentation.past_medical_history}
                      </div>
                    )}
                    {hasVitals(adminPreviewCase.presentation.vitals) && (
                      <div>
                        <strong>Vitals: </strong> BP {adminPreviewCase.presentation.vitals?.bp} • HR{" "}
                        {adminPreviewCase.presentation.vitals?.hr} • RR{" "}
                        {adminPreviewCase.presentation.vitals?.rr} • Temp{" "}
                        {adminPreviewCase.presentation.vitals?.temp} • SpO2{" "}
                        {adminPreviewCase.presentation.vitals?.spo2}
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Multiple-Choice Question Prompt
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {adminPreviewCase.challenge.question}
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                      Options &amp; Verified Rationales
                    </span>
                    {adminPreviewCase.challenge.options.map((opt) => {
                      const isCorrect = opt.id === adminPreviewCase.challenge.correct_option;
                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border text-xs ${
                            isCorrect
                              ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300"
                              : darkMode
                              ? "border-slate-800 bg-slate-800/40 text-slate-300"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span className="flex items-center gap-1.5">
                              {isCorrect ? (
                                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                                  ✓
                                </span>
                              ) : (
                                <span className="w-4 h-4 rounded-full border border-slate-400 text-[10px] font-bold flex items-center justify-center">
                                  {opt.id}
                                </span>
                              )}
                              <span>{opt.text}</span>
                              {isCorrect && (
                                <strong className="text-emerald-500 text-[11px]">
                                  (Correct Answer)
                                </strong>
                              )}
                            </span>
                          </div>
                          {opt.rationale && (
                            <p className="text-[11px] mt-1 pl-5.5 opacity-90 leading-snug">
                              <strong>Rationale: </strong>
                              {opt.rationale}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Resolution & Discussion Preview */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                <div
                  className={`p-4 rounded-xl border ${
                    darkMode
                      ? "bg-emerald-950/20 border-emerald-900/60"
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                    Definitive Diagnosis
                  </span>
                  <p className="text-base font-black text-emerald-700 dark:text-emerald-300">
                    {adminPreviewCase.resolution.final_diagnosis}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Clinical Discussion &amp; Correlation
                  </span>
                  <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                    {adminPreviewCase.resolution.clinical_discussion}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    className={`p-3.5 rounded-xl border space-y-1.5 ${
                      darkMode
                        ? "bg-indigo-950/20 border-indigo-900/50"
                        : "bg-indigo-50 border-indigo-200"
                    }`}
                  >
                    <span className="font-bold text-indigo-500 block">
                      💡 High-Yield Teaching Points:
                    </span>
                    <ul className="space-y-1">
                      {adminPreviewCase.resolution.teaching_points.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-indigo-500 font-bold">•</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div
                    className={`p-3.5 rounded-xl border space-y-1.5 ${
                      darkMode
                        ? "bg-rose-950/20 border-rose-900/50"
                        : "bg-rose-50 border-rose-200"
                    }`}
                  >
                    <span className="font-bold text-rose-500 block">
                      ⚠️ Clinical Pitfalls:
                    </span>
                    <ul className="space-y-1">
                      {adminPreviewCase.resolution.clinical_pitfalls.map((pf, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-500 font-bold">•</span>
                          <span>{pf}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {adminPreviewCase.source_journal && (
                  <div className="pt-2 text-slate-400 flex items-center justify-between">
                    <span>
                      Source: {adminPreviewCase.source_journal.name} (
                      {adminPreviewCase.source_journal.pub_year})
                    </span>
                    {adminPreviewCase.source_journal.doi_url && (
                      <a
                        href={adminPreviewCase.source_journal.doi_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:underline"
                      >
                        {adminPreviewCase.source_journal.doi_url} ↗
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer with Direct Moderation Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  {adminPreviewCase.status !== "approved" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleAdminUpdateStatus(adminPreviewCase.id, "approved", false);
                        setAdminPreviewCase(null);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      📚 Approve to Case Archive
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleAdminUpdateStatus(
                        adminPreviewCase.id,
                        "approved",
                        true,
                        adminScheduleDates[adminPreviewCase.id] ||
                          adminPreviewCase.published_date
                      );
                      setAdminPreviewCase(null);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    🔥 Publish as Daily Challenge (
                    {adminScheduleDates[adminPreviewCase.id] ||
                      adminPreviewCase.published_date}
                    )
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setAdminPreviewCase(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-600/40 hover:bg-slate-800 text-slate-300"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
