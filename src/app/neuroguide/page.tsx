"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  NEUROLOGY_SUBSPECIALTIES,
  SubspecialtyType,
  TIER_CONFIG,
  ClinicalScenario,
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
} from "../../types/neuroguide";
import {
  MOCK_CLINICAL_SCENARIOS,
  MOCK_GUIDELINE_DOCS,
  MOCK_RECOMMENDATION_ATOMS,
  MOCK_CONFERENCE_EVENTS,
} from "../../data/neuroguideMockData";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";
import { AdminButton } from "../../components/ecosystem/AdminButton";
import { ReviewQueueTab } from "../../components/neuroguide/ReviewQueueTab";
import { PipelineModal } from "../../components/neuroguide/PipelineModal";
import { NotebookLMUploadModal } from "../../components/neuroguide/NotebookLMUploadModal";
import { EditGuidelineModal } from "../../components/neuroguide/EditGuidelineModal";
import { AdminAuthModal } from "../../components/neurocase/modals/AdminAuthModal";
import { GuidelinePresentationRenderer } from "../../components/neuroguide/GuidelinePresentationRenderer";
import type { PracticeChangeDetail } from "../../types/neuroguide";

type NavTabId = "guidelines" | "conf" | "matrix" | "review";

interface ThemeStyle {
  borderLeft: string;
  cardBg: string;
  cardBorder: string;
  badge: string;
  accentText: string;
}

function getGuidelineTheme(society: string): ThemeStyle {
  const norm = (society || "").toUpperCase();
  if (norm.includes("AHA")) {
    return {
      borderLeft: "border-l-4 border-l-rose-500",
      cardBg: "bg-rose-50/30 dark:bg-rose-950/20",
      cardBorder: "border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-600",
      badge: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800",
      accentText: "text-rose-600 dark:text-rose-400",
    };
  }
  if (norm.includes("ESVS")) {
    return {
      borderLeft: "border-l-4 border-l-teal-600",
      cardBg: "bg-teal-50/30 dark:bg-teal-950/20",
      cardBorder: "border-teal-200 dark:border-teal-900/60 hover:border-teal-400 dark:hover:border-teal-600",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/60 dark:text-teal-300 dark:border-teal-800",
      accentText: "text-teal-600 dark:text-teal-400",
    };
  }
  if (norm.includes("ESC") && !norm.includes("ESOC")) {
    return {
      borderLeft: "border-l-4 border-l-rose-600",
      cardBg: "bg-rose-50/30 dark:bg-rose-950/20",
      cardBorder: "border-rose-200 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-600",
      badge: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800",
      accentText: "text-rose-600 dark:text-rose-400",
    };
  }
  if (norm.includes("ESO")) {
    return {
      borderLeft: "border-l-4 border-l-blue-500",
      cardBg: "bg-blue-50/30 dark:bg-blue-950/20",
      cardBorder: "border-blue-200 dark:border-blue-900/60 hover:border-blue-400 dark:hover:border-blue-600",
      badge: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800",
      accentText: "text-blue-600 dark:text-blue-400",
    };
  }
  if (norm.includes("VN") || norm.includes("MOH") || norm.includes("BỘ Y TẾ")) {
    return {
      borderLeft: "border-l-4 border-l-emerald-500",
      cardBg: "bg-emerald-50/30 dark:bg-emerald-950/20",
      cardBorder: "border-emerald-200 dark:border-emerald-900/60 hover:border-emerald-400 dark:hover:border-emerald-600",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800",
      accentText: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (norm.includes("AES") || norm.includes("ILAE")) {
    return {
      borderLeft: "border-l-4 border-l-indigo-500",
      cardBg: "bg-indigo-50/30 dark:bg-indigo-950/20",
      cardBorder: "border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-600",
      badge: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800",
      accentText: "text-indigo-600 dark:text-indigo-400",
    };
  }
  if (norm.includes("MDS")) {
    return {
      borderLeft: "border-l-4 border-l-teal-500",
      cardBg: "bg-teal-50/30 dark:bg-teal-950/20",
      cardBorder: "border-teal-200 dark:border-teal-900/60 hover:border-teal-400 dark:hover:border-teal-600",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/60 dark:text-teal-300 dark:border-teal-800",
      accentText: "text-teal-600 dark:text-teal-400",
    };
  }
  if (norm.includes("AHS") || norm.includes("HEADACHE")) {
    return {
      borderLeft: "border-l-4 border-l-orange-500",
      cardBg: "bg-orange-50/30 dark:bg-orange-950/20",
      cardBorder: "border-orange-200 dark:border-orange-900/60 hover:border-orange-400 dark:hover:border-orange-600",
      badge: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/60 dark:text-orange-300 dark:border-orange-800",
      accentText: "text-orange-600 dark:text-orange-400",
    };
  }
  if (norm.includes("ECTRIMS")) {
    return {
      borderLeft: "border-l-4 border-l-cyan-500",
      cardBg: "bg-cyan-50/30 dark:bg-cyan-950/20",
      cardBorder: "border-cyan-200 dark:border-cyan-900/60 hover:border-cyan-400 dark:hover:border-cyan-600",
      badge: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/60 dark:text-cyan-300 dark:border-cyan-800",
      accentText: "text-cyan-600 dark:text-cyan-400",
    };
  }
  if (norm.includes("AANEM")) {
    return {
      borderLeft: "border-l-4 border-l-sky-500",
      cardBg: "bg-sky-50/30 dark:bg-sky-950/20",
      cardBorder: "border-sky-200 dark:border-sky-900/60 hover:border-sky-400 dark:hover:border-sky-600",
      badge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-800",
      accentText: "text-sky-600 dark:text-sky-400",
    };
  }
  if (norm.includes("NCS")) {
    return {
      borderLeft: "border-l-4 border-l-violet-500",
      cardBg: "bg-violet-50/30 dark:bg-violet-950/20",
      cardBorder: "border-violet-200 dark:border-violet-900/60 hover:border-violet-400 dark:hover:border-violet-600",
      badge: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/60 dark:text-violet-300 dark:border-violet-800",
      accentText: "text-violet-600 dark:text-violet-400",
    };
  }
  if (norm.includes("AAN") || norm.includes("EAN")) {
    return {
      borderLeft: "border-l-4 border-l-purple-500",
      cardBg: "bg-purple-50/30 dark:bg-purple-950/20",
      cardBorder: "border-purple-200 dark:border-purple-900/60 hover:border-purple-400 dark:hover:border-purple-600",
      badge: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800",
      accentText: "text-purple-600 dark:text-purple-400",
    };
  }
  return {
    borderLeft: "border-l-4 border-l-amber-500",
    cardBg: "bg-amber-50/30 dark:bg-amber-950/20",
    cardBorder: "border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600",
    badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800",
    accentText: "text-amber-600 dark:text-amber-400",
  };
}

export function getEffectiveConferenceStatus(conf: ConferenceEvent): "LIVE" | "RECENT" | "UPCOMING" {
  if (!conf.startDate) return conf.status;

  const now = new Date();
  const start = new Date(conf.startDate);
  // Default end date is 3 days after start if not provided
  const end = conf.endDate
    ? new Date(conf.endDate)
    : new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);

  const nowTime = now.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime() + 24 * 60 * 60 * 1000; // extend through midnight of end date

  if (nowTime >= startTime && nowTime <= endTime) {
    return "LIVE";
  }
  if (nowTime > endTime) {
    return "RECENT";
  }
  return "UPCOMING";
}

function getConferenceTheme(conf: ConferenceEvent, effectiveStatus?: "LIVE" | "RECENT" | "UPCOMING"): ThemeStyle {
  const status = effectiveStatus || getEffectiveConferenceStatus(conf);
  if (status === "LIVE") {
    return {
      borderLeft: "border-l-4 border-l-red-500",
      cardBg: "bg-red-50/30 dark:bg-red-950/20",
      cardBorder: "border-red-200 dark:border-red-900/60 hover:border-red-400 dark:hover:border-red-600",
      badge: "bg-red-500 text-white border-red-500",
      accentText: "text-red-600 dark:text-red-400",
    };
  }
  if (status === "RECENT") {
    return {
      borderLeft: "border-l-4 border-l-amber-500",
      cardBg: "bg-amber-50/30 dark:bg-amber-950/20",
      cardBorder: "border-amber-200 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-600",
      badge: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800",
      accentText: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    borderLeft: "border-l-4 border-l-indigo-500",
    cardBg: "bg-indigo-50/30 dark:bg-indigo-950/20",
    cardBorder: "border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-600",
    badge: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800",
    accentText: "text-indigo-600 dark:text-indigo-400",
  };
}

export default function NeuroGuidePage() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTabId>("guidelines");

  // Filters
  const [selectedSubspecialty, setSelectedSubspecialty] = useState<SubspecialtyType>("All Subspecialties");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedSocietyFilter, setSelectedSocietyFilter] = useState<string>("ALL");
  const [selectedConfStatus, setSelectedConfStatus] = useState<"ALL" | "LIVE" | "RECENT" | "UPCOMING">("ALL");

  // Selection states
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [isMobileScenarioListOpen, setIsMobileScenarioListOpen] = useState<boolean>(false);
  const [activeDetailTab, setActiveDetailTab] = useState<"matrix" | "temporal" | "conf_bridge">("matrix");

  // Guideline Docs with Periodic Autonomous Online Sync State
  const [guidelineDocs, setGuidelineDocs] = useState<GuidelineDoc[]>(MOCK_GUIDELINE_DOCS);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [reviewQueueCount, setReviewQueueCount] = useState<number>(0);
  const [showPipelineModal, setShowPipelineModal] = useState<boolean>(false);
  const [showNotebookLMModal, setShowNotebookLMModal] = useState<boolean>(false);
  const [isAdminVerified, setIsAdminVerified] = useState<boolean>(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState<boolean>(false);

  // Edit Practice Guideline & Recommendations state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingPracticeChange, setEditingPracticeChange] = useState<PracticeChangeDetail | null>(null);
  const [editingGuidelineDoc, setEditingGuidelineDoc] = useState<GuidelineDoc | null>(null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  const reloadGuidelines = () => {
    fetch("/api/neuroguide/sync-guidelines")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status === "success" && Array.isArray(data.guidelines)) {
          setGuidelineDocs(data.guidelines);
          try {
            localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(data.guidelines));
          } catch {}
        }
      });
  };

  useEffect(() => {
    const token =
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token");
    setIsAdminVerified(Boolean(token));
  }, []);

  const fetchQueueCount = async () => {
    try {
      const res = await fetch("/api/neuroguide/review-queue");
      const data = await res.json();
      if (data.ok && typeof data.total === "number") {
        setReviewQueueCount(data.total);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchQueueCount();
  }, []);

  // Dynamic Navigation Tabs with Live Counts (Review Queue visible to Admin only)
  const navTabs = useMemo(() => {
    const tabs: { id: NavTabId; label: string; badge?: string }[] = [
      {
        id: "guidelines" as const,
        label: "🔥 Practice Guidelines",
        badge: `${guidelineDocs.length}`,
      },
      {
        id: "conf" as const,
        label: "🎙️ Conferences & Late-Breaking Trials",
        badge: `${MOCK_CONFERENCE_EVENTS.length}`,
      },
      {
        id: "matrix" as const,
        label: "⚖️ Clinical Scenarios",
        badge: `${MOCK_CLINICAL_SCENARIOS.length}`,
      },
    ];

    if (isAdminVerified) {
      tabs.push({
        id: "review" as const,
        label: "🛡️ Review Queue",
        badge: reviewQueueCount > 0 ? `${reviewQueueCount}` : undefined,
      });
    }

    return tabs;
  }, [guidelineDocs.length, reviewQueueCount, isAdminVerified]);

  // Expandable cards states (details reveal only on click)
  const [expandedGuidelineIds, setExpandedGuidelineIds] = useState<Record<string, boolean>>({});
  const [expandedConferenceIds, setExpandedConferenceIds] = useState<Record<string, boolean>>({});

  // Local Batch Manifest Modal State
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchInputText, setBatchInputText] = useState<string>("");
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchPreviewDocs, setBatchPreviewDocs] = useState<
    (GuidelineDoc & { isAlreadyIndexed: boolean; sourceFilename: string })[]
  >([]);

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
      if (data.status === "success" && data.guidelines) {
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
      setSyncMessage(`Successfully ingested ${novel.length} new guidelines from manifest.`);
      return merged;
    });
    setShowBatchModal(false);
    setBatchPreviewDocs([]);
    setBatchInputText("");
  };

  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const handleDeleteGuideline = async (doc: GuidelineDoc) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn XÓA guideline:\n\n"${doc.title}" (${doc.society} ${doc.year})?\n\nHướng dẫn này sẽ được gỡ bỏ khỏi thư viện và hệ thống lưu trữ.`
    );
    if (!confirmDelete) return;

    setDeleteLoadingId(doc.id);
    try {
      const res = await fetch("/api/neuroguide/delete-guideline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideline_id: doc.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setGuidelineDocs((prev) => {
          const updated = prev.filter(
            (g) => g.id !== doc.id && g.id.toLowerCase() !== doc.id.toLowerCase()
          );
          try {
            localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setSyncMessage(`🗑️ Đã xóa guideline "${doc.title}" thành công.`);
      } else {
        alert(`Lỗi khi xóa guideline: ${data.error || "Không thể xóa guideline"}`);
      }
    } catch {
      alert("Lỗi kết nối khi gửi yêu cầu xóa guideline.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const matrixContainerRef = useRef<HTMLDivElement>(null);

  const CURRENT_CACHE_VERSION = "neuroguide_v2026_coordinated_v16";

  // Background Autonomous Sync Method (runs on 24h cron or manual trigger)
  const triggerSync = async (isAuto = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch("/api/neuroguide/sync-guidelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPeriodicCron: isAuto }),
      });
      const json = await res.json();
      if (json.status === "success" && json.guidelines && json.guidelines.length > 0) {
        // Enforce admission of coordinated guidelines only
        const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const coordinatedTitles = new Set(MOCK_GUIDELINE_DOCS.map((g) => normalizeT(g.title)));
        const coordinatedIds = new Set(MOCK_GUIDELINE_DOCS.map((g) => g.id.toLowerCase()));

        const valid = json.guidelines.filter((doc: GuidelineDoc) => {
          if (!doc || !doc.title) return false;
          const id = (doc.id || "").toLowerCase();
          const normT = normalizeT(doc.title);
          const isApprovedOrAi = Boolean(
            doc.aiSynthesized ||
            (doc.allPracticeChanges && doc.allPracticeChanges.length > 0) ||
            coordinatedIds.has(id) ||
            coordinatedTitles.has(normT) ||
            id.startsWith("aha") ||
            id.startsWith("eso")
          );
          return (
            isApprovedOrAi &&
            !id.startsWith("eso-pmid-") &&
            !id.startsWith("esc-pmid-") &&
            !id.startsWith("b15e76") &&
            !id.includes("phantom")
          );
        });

        if (valid.length > 0) {
          setGuidelineDocs(valid);
          try {
            localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(valid));
          } catch (e) {
            console.warn("Could not save to localStorage:", e);
          }
        }

        const quota = json.quotaReport;
        const storageNote = json.savedToBlob ? "Vercel Blob" : json.storageBackend || "Cloud Storage";
        if (quota) {
          setSyncMessage(
            `✨ Full-Text AI Radar: Analyzed ${quota.guidelinesAnalyzed} guidelines (Full-text XML: ${quota.fullTextParsedCount}), 2 conferences & 2 clinical scenarios. Synced to: ${storageNote}.`
          );
        } else {
          setSyncMessage(json.message || `Successfully synchronized guidelines from ${storageNote}.`);
        }

        const nowStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        setLastSyncedTime(nowStr);
        localStorage.setItem("neuroguide_last_sync_timestamp", Date.now().toString());
      }
    } catch (err) {
      console.warn("Background radar sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Hydrate from coordinated server storage + cache sanitizer on mount
  useEffect(() => {
    const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const coordinatedTitles = new Set(MOCK_GUIDELINE_DOCS.map((g) => normalizeT(g.title)));
    const coordinatedIds = new Set(MOCK_GUIDELINE_DOCS.map((g) => g.id.toLowerCase()));

    // 1. Read coordinated data from server storage
    fetch("/api/neuroguide/sync-guidelines")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status === "success" && Array.isArray(data.guidelines) && data.guidelines.length > 0) {
          const validGuidelines = data.guidelines.filter((doc: GuidelineDoc) => {
            if (!doc || !doc.title) return false;
            const id = (doc.id || "").toLowerCase();
            const normT = normalizeT(doc.title);
            const isApprovedOrAi = Boolean(
              doc.aiSynthesized ||
              (doc.allPracticeChanges && doc.allPracticeChanges.length > 0) ||
              coordinatedIds.has(id) ||
              coordinatedTitles.has(normT) ||
              id.startsWith("aha") ||
              id.startsWith("eso")
            );
            return (
              isApprovedOrAi &&
              !id.startsWith("eso-pmid-") &&
              !id.startsWith("esc-pmid-") &&
              !id.startsWith("b15e76") &&
              !id.includes("phantom")
            );
          });
          if (validGuidelines.length > 0) {
            setGuidelineDocs(validGuidelines);
            try {
              localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(validGuidelines));
            } catch {
              // ignore
            }
          }
        }
      })
      .catch(() => {});

    // 2. Manage client cache (LocalStorage): clean legacy unverified items
    try {
      const cachedVersion = localStorage.getItem("neuroguide_cache_version");
      if (cachedVersion !== CURRENT_CACHE_VERSION) {
        // Obsolete or polluted cache detected: clear old cache and ensure fresh curated library
        localStorage.setItem("neuroguide_cache_version", CURRENT_CACHE_VERSION);
        localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(MOCK_GUIDELINE_DOCS));
        setGuidelineDocs(MOCK_GUIDELINE_DOCS);
      } else {
        const cached = localStorage.getItem("neuroguide_cached_guidelines");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            // Filter out unverified guidelines
            const filtered = parsed.filter((doc: GuidelineDoc) => {
              if (!doc || !doc.title) return false;
              const id = (doc.id || "").toLowerCase();
              const normT = normalizeT(doc.title);
              return (
                (coordinatedIds.has(id) || coordinatedTitles.has(normT) || id.startsWith("aha2026")) &&
                !id.startsWith("eso-pmid-") &&
                !id.startsWith("esc-pmid-") &&
                !id.startsWith("b15e76") &&
                !id.includes("phantom")
              );
            });

            const titleMap = new Map<string, GuidelineDoc>();
            MOCK_GUIDELINE_DOCS.forEach((g) => titleMap.set(normalizeT(g.title), g));
            filtered.forEach((g) => {
              const norm = normalizeT(g.title);
              if (!titleMap.has(norm)) {
                titleMap.set(norm, g);
              }
            });

            const merged = Array.from(titleMap.values());
            // Auto sort: Year descending -> Society ascending
            merged.sort((a, b) => {
              if (b.year !== a.year) return b.year - a.year;
              return (a.society || "").localeCompare(b.society || "");
            });
            setGuidelineDocs(merged);
            localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(merged));
          }
        }
      }
    } catch (e) {
      console.warn("Error initializing guideline cache:", e);
    }

    // 3. Initialize sync timestamp:
    const lastSyncStr = localStorage.getItem("neuroguide_last_sync_timestamp");
    if (!lastSyncStr) {
      localStorage.setItem("neuroguide_last_sync_timestamp", Date.now().toString());
    }

    // 4. Periodic check once per hour: sync only if 24 hours have elapsed
    const intervalId = setInterval(() => {
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      const ts = localStorage.getItem("neuroguide_last_sync_timestamp");
      if (ts) {
        const lastSync = parseInt(ts, 10);
        if (!isNaN(lastSync) && Date.now() - lastSync >= TWENTY_FOUR_HOURS) {
          triggerSync(true);
        }
      }
    }, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Sync dark mode with ecosystem standards (both neuro_dark_mode and neuropulse_theme)
  useEffect(() => {
    const savedDark =
      localStorage.getItem("neuro_dark_mode") === "true" ||
      localStorage.getItem("neuropulse_theme") === "dark";
    setDarkMode(savedDark);
    if (savedDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("neuro_dark_mode", "true");
        localStorage.setItem("neuropulse_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("neuro_dark_mode", "false");
        localStorage.setItem("neuropulse_theme", "light");
      }
      return next;
    });
  };

  const toggleGuideline = (docId: string) => {
    setExpandedGuidelineIds((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const toggleConference = (confId: string) => {
    setExpandedConferenceIds((prev) => ({
      ...prev,
      [confId]: !prev[confId],
    }));
  };

  // Dynamically derive available societies from guideline documents (normalized to primary societies)
  const availableSocieties = useMemo(() => {
    const set = new Set<string>();
    guidelineDocs.forEach((d) => {
      let soc = d.society;
      if (soc.includes("ESO")) soc = "ESO";
      else if (soc.includes("AHA") || soc.includes("ASA")) soc = "AHA/ASA";
      else if (soc.includes("ESC")) soc = "ESC";
      else if (soc.includes("ESVS")) soc = "ESVS";
      else if (soc.includes("AES")) soc = "AES";
      else if (soc.includes("ILAE")) soc = "ILAE";
      else if (soc.includes("AANEM")) soc = "AANEM";
      else if (soc.includes("AAN")) soc = "AAN";
      else if (soc.includes("ECTRIMS")) soc = "ECTRIMS";
      else if (soc.includes("IDSA")) soc = "IDSA";
      else if (soc.includes("NCS")) soc = "NCS";
      else if (soc.includes("MDS")) soc = "MDS";
      else if (soc.includes("AHS")) soc = "AHS";
      set.add(soc);
    });
    return ["ALL", ...Array.from(set)];
  }, [guidelineDocs]);

  // Filtered Scenarios (Multi-token search with diacritics normalization)
  const filteredScenarios = useMemo(() => {
    const rawQ = searchQuery.toLowerCase().trim();
    const tokens = rawQ.split(/\s+/).filter(Boolean);

    return MOCK_CLINICAL_SCENARIOS.filter((scenario) => {
      const matchesSub =
        selectedSubspecialty === "All Subspecialties" ||
        scenario.subspecialty === selectedSubspecialty;

      if (!matchesSub) return false;
      if (tokens.length === 0) return true;

      const rawHaystack = `${scenario.id} ${scenario.title} ${scenario.summary} ${scenario.keyTags.join(" ")} ${scenario.subspecialty} ${scenario.statusBadge} ${scenario.confAlertText || ""}`.toLowerCase();
      const normHaystack = rawHaystack.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return tokens.every((token) => {
        const normToken = token.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return rawHaystack.includes(token) || normHaystack.includes(normToken);
      });
    });
  }, [selectedSubspecialty, searchQuery]);

  // Current Scenario (Defaults to null until user selects one)
  const currentScenario = useMemo(() => {
    if (!activeScenarioId) return null;
    return filteredScenarios.find((s) => s.id === activeScenarioId) || null;
  }, [filteredScenarios, activeScenarioId]);

  // Current Scenario's Recommendation Atoms
  const scenarioRecommendations = useMemo(() => {
    if (!currentScenario) return [];
    return MOCK_RECOMMENDATION_ATOMS.filter(
      (atom) => atom.scenarioId === currentScenario.id && atom.isLatestForSociety
    );
  }, [currentScenario]);

  // Filtered Guidelines: Multi-token Search + Diacritics Normalization + Direct Subspecialty + Chronological Sort
  const filteredGuidelines = useMemo(() => {
    const rawQ = searchQuery.toLowerCase().trim();
    const tokens = rawQ.split(/\s+/).filter(Boolean);

    const list = guidelineDocs.filter((doc) => {
      let normDocSoc = doc.society;
      if (normDocSoc.includes("ESO")) normDocSoc = "ESO";
      else if (normDocSoc.includes("AHA") || normDocSoc.includes("ASA")) normDocSoc = "AHA/ASA";
      else if (normDocSoc.includes("ESC")) normDocSoc = "ESC";
      else if (normDocSoc.includes("ESVS")) normDocSoc = "ESVS";
      else if (normDocSoc.includes("AES")) normDocSoc = "AES";
      else if (normDocSoc.includes("ILAE")) normDocSoc = "ILAE";

      const matchesSociety =
        selectedSocietyFilter === "ALL" ||
        doc.society === selectedSocietyFilter ||
        normDocSoc === selectedSocietyFilter;
      const matchesSub =
        selectedSubspecialty === "All Subspecialties" ||
        doc.subspecialty === selectedSubspecialty ||
        (doc.subspecialties && doc.subspecialties.includes(selectedSubspecialty)) ||
        MOCK_CLINICAL_SCENARIOS.some(
          (s) => doc.linkedScenarioIds.includes(s.id) && s.subspecialty === selectedSubspecialty
        );

      if (!matchesSociety || !matchesSub) return false;
      if (tokens.length === 0) return true;

      const changesText = doc.allPracticeChanges
        .map(
          (c) =>
            `${c.topic} ${c.currentText} ${c.category} ${c.previousText || ""} ${
              c.drivingTrials?.join(" ") || ""
            } ${c.currentGrade} ${c.previousGrade || ""}`
        )
        .join(" ");

      const rawHaystack = `${doc.id} ${doc.title} ${doc.society} ${doc.journalTarget} ${doc.documentType} ${doc.executiveSummary} ${doc.year} ${doc.publishDate} ${doc.subspecialty} ${changesText}`.toLowerCase();
      const normHaystack = rawHaystack.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return tokens.every((token) => {
        const normToken = token.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return rawHaystack.includes(token) || normHaystack.includes(normToken);
      });
    });

    // Auto sort: Year descending -> Society ascending
    return list.sort((a, b) => {
      if (b.year !== a.year) {
        return b.year - a.year;
      }
      return (a.society || "").localeCompare(b.society || "");
    });
  }, [selectedSocietyFilter, selectedSubspecialty, searchQuery, guidelineDocs]);

  // Filtered Conferences: Multi-token Search + Diacritics Normalization + Dynamic Live Status + Chronological Sort
  const filteredConferences = useMemo(() => {
    const rawQ = searchQuery.toLowerCase().trim();
    const tokens = rawQ.split(/\s+/).filter(Boolean);

    const list = MOCK_CONFERENCE_EVENTS.filter((conf) => {
      const liveStatus = getEffectiveConferenceStatus(conf);
      const matchesStatus =
        selectedConfStatus === "ALL" || liveStatus === selectedConfStatus;
      const matchesSub =
        selectedSubspecialty === "All Subspecialties" ||
        conf.subspecialties.includes("All Subspecialties") ||
        conf.subspecialties.includes(selectedSubspecialty);

      if (!matchesStatus || !matchesSub) return false;
      if (tokens.length === 0) return true;

      const trialsText = conf.lateBreakingTrials
        .map(
          (tr) =>
            `${tr.trialAcronym} ${tr.title} ${tr.primaryOutcome} ${tr.populationSummary} ${
              tr.bottomLineTakeaway
            } ${tr.publishedJournal || ""} ${tr.safetyOutcome} ${tr.studyDesign}`
        )
        .join(" ");

      const rawHaystack = `${conf.id} ${conf.name} ${conf.acronym} ${conf.location} ${conf.dates} ${conf.executiveSummary} ${liveStatus} ${conf.year} ${conf.startDate || ""} ${conf.subspecialties.join(" ")} ${trialsText}`.toLowerCase();
      const normHaystack = rawHaystack.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      return tokens.every((token) => {
        const normToken = token.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return rawHaystack.includes(token) || normHaystack.includes(normToken);
      });
    });

    // CHRONOLOGICAL SORTING: LIVE events first, then by startDate descending
    return list.sort((a, b) => {
      const statusA = getEffectiveConferenceStatus(a);
      const statusB = getEffectiveConferenceStatus(b);
      if (statusA === "LIVE" && statusB !== "LIVE") return -1;
      if (statusB === "LIVE" && statusA !== "LIVE") return 1;

      if (b.startDate && a.startDate) {
        return b.startDate.localeCompare(a.startDate);
      }
      return b.year - a.year;
    });
  }, [selectedConfStatus, selectedSubspecialty, searchQuery]);

  // Jump from Guideline or Trial to Scenario Matrix
  const handleJumpToScenario = (scenarioId: string) => {
    setActiveScenarioId(scenarioId);
    setActiveTab("matrix");
    setActiveDetailTab("matrix");
    setTimeout(() => {
      matrixContainerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <main
      className={`min-h-screen py-8 px-4 sm:px-8 transition-colors duration-200 ${
        darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        {/* =========================================================================
            HEADER: Identical design language to NeuroPulse & NeuroCase
           ========================================================================= */}
        <header className="mb-6 pt-1 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-600 shadow-sm shadow-amber-500/50"></span>
              </span>
              <span
                className={`text-xs font-bold uppercase tracking-widest ${
                  darkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                CLINICAL PRACTICE GUIDELINES &amp; CONFERENCE RADAR
              </span>
            </div>
            <h1
              className={`text-2xl sm:text-3xl font-black uppercase tracking-tight ${
                darkMode ? "text-white" : "text-slate-900"
              }`}
            >
              NEUROGUIDE
            </h1>
          </div>

          {/* Quick Header Badges & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                darkMode
                  ? "bg-amber-950 text-amber-300 border-amber-800 hover:bg-amber-900"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{darkMode ? "☀️ Light" : "🌙 Night Shift"}</span>
            </button>

            <AdminButton darkMode={darkMode} />

            {/* 9-DOTS ECOSYSTEM APP SWITCHER */}
            <AppSwitcher currentApp="neuroguide" darkMode={darkMode} />
          </div>
        </header>

        {/* =========================================================================
            NAVIGATION BAR (3 Tabs in user-specified order + Contextual Search)
           ========================================================================= */}
        <nav
          className={`mb-6 p-1.5 rounded-xl border flex flex-wrap items-center justify-between gap-1.5 ${
            darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          {/* Tab 1: Guidelines | Tab 2: Conferences | Tab 3: Scenarios */}
          <div className="flex flex-wrap items-center gap-1.5">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? "bg-amber-500 text-white shadow-sm"
                      : darkMode
                      ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : darkMode
                          ? "bg-slate-800 text-slate-400"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Universal Search Input active across Guidelines, Conferences & Scenarios */}
          <div className="relative w-full sm:w-72">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 text-xs">
              🔍
            </span>
            <input
              type="text"
              placeholder={
                activeTab === "guidelines"
                  ? "Search guidelines, trials, topics..."
                  : activeTab === "conf"
                  ? "Search conferences, late-breaking trials..."
                  : "Search clinical scenarios..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border outline-none transition-all ${
                darkMode
                  ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-amber-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-2.5 flex items-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </nav>

        {/* =========================================================================
            SUBSPECIALTY FILTER CHIPS (Horizontal Scroll Bar)
           ========================================================================= */}
        <div
          className={`mb-6 p-2 rounded-xl border overflow-x-auto scrollbar-none flex items-center gap-1.5 ${
            darkMode ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap ml-1 mr-1">
            Subspecialty:
          </span>
          {NEUROLOGY_SUBSPECIALTIES.map((sub) => {
            const isSelected = selectedSubspecialty === sub;
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubspecialty(sub)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-amber-500 text-white shadow-xs font-bold"
                    : darkMode
                    ? "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>

        {/* =========================================================================
            TAB 1: PRACTICE GUIDELINES (Distinct theme colors, details revealed on click)
           ========================================================================= */}
        {activeTab === "guidelines" && (
          <div className="space-y-4">
            {/* Direct Society Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-xs font-bold text-slate-400 mr-1 whitespace-nowrap">
                  Society:
                </span>
                {availableSocieties.map((soc) => (
                  <button
                    key={soc}
                    onClick={() => setSelectedSocietyFilter(soc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedSocietyFilter === soc
                        ? "bg-amber-500 text-white shadow-xs"
                        : darkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {soc === "ALL" ? "All Societies" : soc}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Banner for Sync or Reset actions */}
            {syncMessage && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-2 transition-all">
                <div className="flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>{syncMessage}</span>
                  {lastSyncedTime && (
                    <span className="text-[11px] opacity-75">({lastSyncedTime})</span>
                  )}
                </div>
                <button
                  onClick={() => setSyncMessage(null)}
                  className="text-amber-600 dark:text-amber-400 hover:opacity-100 font-bold px-1.5"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Guideline Cards (Colored by Society, Click to Expand Details) */}
            {filteredGuidelines.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                <span className="text-3xl block mb-2">🔍</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No guidelines match &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for &ldquo;Tenecteplase&rdquo;, &ldquo;Thrombectomy&rdquo;, &ldquo;Blood Pressure&rdquo;, or &ldquo;AHA&rdquo;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSocietyFilter("ALL");
                    setSelectedSubspecialty("All Subspecialties");
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredGuidelines.map((doc) => {
                  const isExpanded = !!expandedGuidelineIds[doc.id];
                  const isVietnamese = doc.society === "VN-MOH";
                  const theme = getGuidelineTheme(doc.society);

                  return (
                    <div
                      key={doc.id}
                      className={`rounded-2xl border transition-all ${theme.borderLeft} ${theme.cardBg} ${theme.cardBorder} shadow-xs`}
                    >
                    {/* Clickable Header / Card Summary */}
                    <div
                      onClick={() => toggleGuideline(doc.id)}
                      className="p-4 sm:p-5 cursor-pointer select-none"
                    >
                      {/* Meta Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider uppercase border ${theme.badge}`}
                          >
                            {doc.society} {doc.year}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {doc.documentType} • {doc.journalTarget}
                          </span>
                          {doc.fullTextStatus === "FULL_TEXT_PARSED" ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              ✨ Full-Text AI Verified
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              Abstract Verified
                            </span>
                          )}
                          {doc.pmcid && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {doc.pmcid}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Published: {doc.publishDate}
                          </span>
                          {isAdminVerified && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDocId(doc.id);
                                  setEditingGuidelineDoc(doc);
                                  setEditingPracticeChange(null);
                                  setShowEditModal(true);
                                }}
                                className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Edit guideline metadata"
                              >
                                <span>✏️ Edit</span>
                              </button>
                              <button
                                type="button"
                                disabled={deleteLoadingId === doc.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGuideline(doc);
                                }}
                                className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                                title="Delete guideline"
                              >
                                <span>{deleteLoadingId === doc.id ? "..." : "🗑️ Delete"}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base sm:text-lg font-bold leading-snug">
                        {doc.title}
                      </h3>

                      {/* Bottom Prompt Bar: Changes Badge + Click Indicator */}
                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <span>📋</span>
                          <span>
                            {`${doc.allPracticeChanges.length} Key Practice Changes`}
                          </span>
                        </span>

                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <span>
                            {isExpanded
                              ? "Collapse details ▴"
                              : "Click to view details ▾"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* EXPANDED SECTION: Detailed information revealed only upon click */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                        {/* All Practice Changes List */}
                        {(() => {
                          const newPracticeChanges = doc.allPracticeChanges.filter(
                            (c) =>
                              c.changeType === "NEW" ||
                              c.changeType === "UPGRADED" ||
                              c.changeType === "DOWNGRADED" ||
                              c.changeType === "REVISED" ||
                              Boolean(c.previousGrade) ||
                              Boolean(c.previousText)
                          );

                          const categories = Array.from(
                            new Set(doc.allPracticeChanges.map((c) => c.category || "General Recommendations"))
                          );

                          return (
                            <div className="space-y-6 mb-4">
                              {/* 0. Top Take-Home Messages */}
                              {doc.topTakeaways && doc.topTakeaways.length > 0 && (
                                <div className="p-4 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/30 dark:from-slate-900/90 dark:via-indigo-950/20 dark:to-slate-900/80 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                      🌟 TOP TAKE-HOME MESSAGES
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      ({doc.topTakeaways.length} key clinical messages)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {doc.topTakeaways.map((takeaway, tIdx) => (
                                      <div
                                        key={tIdx}
                                        className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-slate-200/60 dark:border-slate-800/60 leading-relaxed shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
                                      >
                                        <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-black text-[10.5px]">
                                          {tIdx + 1}
                                        </span>
                                        <span className="flex-1">{takeaway.replace(/^\d+\.\s*/, "")}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 1. What is new vs previous edition */}
                              {newPracticeChanges.length > 0 && (
                                <div className="space-y-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                      ⚡ 1. WHAT IS NEW &amp; HIGH IMPACT CHANGES
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                      ({newPracticeChanges.length} practice changes vs. {doc.previousVersionYear || "prior"}):
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 gap-2.5">
                                    {newPracticeChanges.map((change) => (
                                      <div
                                        key={change.id}
                                        className={`p-3.5 rounded-xl border text-xs leading-relaxed transition-all ${
                                          darkMode
                                            ? "bg-slate-950/70 border-slate-800"
                                            : "bg-white border-slate-200"
                                        }`}
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                                change.changeType === "UPGRADED"
                                                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                                  : change.changeType === "NEW"
                                                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                                  : change.changeType === "DOWNGRADED"
                                                  ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                                  : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                              }`}
                                            >
                                              {change.changeType}
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-slate-100">{change.topic}</span>
                                          </div>

                                          <div className="flex items-center gap-2 text-[11px]">
                                            {change.previousGrade && (
                                              <span className="text-slate-400 line-through">
                                                {change.previousGrade}
                                              </span>
                                            )}
                                            <span className="font-extrabold text-amber-600 dark:text-amber-400">
                                              ➔ {change.currentGrade}
                                            </span>
                                          </div>
                                        </div>

                                        {change.previousText && (
                                          <div className="mb-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 text-[11px] border border-slate-200/50 dark:border-slate-800/50">
                                            <span className="font-bold block text-slate-400 mb-0.5">
                                              Previous Edition ({doc.previousVersionYear || "prior"}):
                                            </span>
                                            <p className="line-through opacity-85">{change.previousText}</p>
                                          </div>
                                        )}

                                        <p className="text-slate-800 dark:text-slate-200 font-medium">
                                          {change.currentText}
                                        </p>

                                        {change.drivingTrials && change.drivingTrials.length > 0 && (
                                          <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400 border-t pt-1.5 border-slate-100 dark:border-slate-800/60">
                                            <span className="font-semibold text-slate-400">
                                              Driving Evidence:
                                            </span>
                                            <span className="font-medium text-slate-600 dark:text-slate-300">
                                              {change.drivingTrials.join(", ")}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 2. Full structured recommendations (AHA/ASA or ESO presentation) */}
                              <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                                <GuidelinePresentationRenderer
                                  doc={doc}
                                  darkMode={darkMode}
                                  allowEdit={isAdminVerified}
                                  onEditChange={(item) => {
                                    setEditingDocId(doc.id);
                                    setEditingGuidelineDoc(null);
                                    setEditingPracticeChange(item);
                                    setShowEditModal(true);
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Action Bar */}
                        <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={doc.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-amber-500 flex items-center gap-1"
                          >
                            <span>
                              {`Read original article on ${doc.journalTarget}`}
                            </span>
                            <span>↗</span>
                          </a>

                          <div className="flex items-center gap-2">
                            {doc.linkedScenarioIds.length > 0 && (
                              <button
                                onClick={() => handleJumpToScenario(doc.linkedScenarioIds[0])}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
                              >
                                <span>⚖️ View in Scenario Matrix</span>
                                <span>➔</span>
                              </button>
                            )}

                            <button
                              onClick={() => toggleGuideline(doc.id)}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                              Collapse ▴
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: CONFERENCES & LATE-BREAKING TRIALS (Distinct theme colors, details on click)
           ========================================================================= */}
        {activeTab === "conf" && (
          <div className="space-y-4">
            {/* Direct Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 mr-1">Status:</span>
                {(["ALL", "LIVE", "RECENT", "UPCOMING"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedConfStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedConfStatus === st
                        ? "bg-amber-500 text-white"
                        : darkMode
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {st === "ALL"
                      ? "All Events"
                      : st === "LIVE"
                      ? "🔴 LIVE"
                      : st === "RECENT"
                      ? "🟡 Recent"
                      : "⚪ Upcoming"}
                  </button>
                ))}
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {filteredConferences.length} Major Conferences Monitored
              </div>
            </div>

            {/* Conference Cards List (Colored by Status, Click to Expand Details) */}
            {filteredConferences.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
                <span className="text-3xl block mb-2">🔍</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No conferences or trials match &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching for trial acronyms like &ldquo;LASTE&rdquo;, &ldquo;TRACE-III&rdquo;, &ldquo;ESCAPE-MeVO&rdquo;, or &ldquo;ESOC&rdquo;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedConfStatus("ALL");
                    setSelectedSubspecialty("All Subspecialties");
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredConferences.map((conf) => {
                const isExpanded = !!expandedConferenceIds[conf.id];
                const liveStatus = getEffectiveConferenceStatus(conf);
                const theme = getConferenceTheme(conf, liveStatus);

                return (
                  <div
                    key={conf.id}
                    className={`rounded-2xl border transition-all ${theme.borderLeft} ${theme.cardBg} ${theme.cardBorder} shadow-xs`}
                  >
                    {/* Clickable Header / Conference Summary */}
                    <div
                      onClick={() => toggleConference(conf.id)}
                      className="p-4 sm:p-5 cursor-pointer select-none"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`text-xl font-black ${theme.accentText}`}>
                            {conf.acronym}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase border ${theme.badge}`}
                          >
                            {liveStatus === "LIVE"
                              ? "🔴 LIVE"
                              : liveStatus === "RECENT"
                              ? "🟡 RECENT"
                              : "⚪ UPCOMING"}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {conf.dates} • {conf.location}
                          </span>
                        </div>

                        <a
                          href={conf.officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                        >
                          <span>Official Website</span>
                          <span>↗</span>
                        </a>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold leading-snug">
                        {conf.name}
                      </h3>

                      {/* Bottom Prompt Bar: Stats Pill + Click Indicator */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {conf.stats.totalLateBreakingTrials} Late-Breaking Trials
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {conf.stats.positiveTrials} Positive
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {conf.stats.practiceChangingCount} ⚡ Practice-Changing
                          </span>
                        </div>

                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <span>
                            {isExpanded
                              ? "Collapse trials & details ▴"
                              : "Click to view trials & details ▾"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* EXPANDED SECTION: Detailed trial presentations revealed only upon click */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-200/60 dark:border-slate-800/80">
                        {/* Executive Summary */}
                        <div className="mb-4">
                          <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            Conference Intelligence Summary:
                          </span>
                          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white/60 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/60">
                            {conf.executiveSummary}
                          </p>
                        </div>

                        {/* Trials Grid */}
                        <div className="space-y-3">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                            Podium Trial Presentations ({conf.lateBreakingTrials.length}):
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {conf.lateBreakingTrials.map((tr) => (
                              <div
                                key={tr.id}
                                className={`p-4 rounded-2xl border flex flex-col justify-between ${
                                  darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-base font-black text-amber-600 dark:text-amber-400">
                                      {tr.trialAcronym}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        {tr.studyDesign}
                                      </span>
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                        {tr.verdict}
                                      </span>
                                    </div>
                                  </div>

                                  <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
                                    {tr.title}
                                  </h5>

                                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-3">
                                    <div>
                                      <span className="font-bold text-slate-400">Population (P):</span>{" "}
                                      {tr.populationSummary}
                                    </div>
                                    <div>
                                      <span className="font-bold text-slate-400">Intervention vs. Control:</span>{" "}
                                      {tr.interventionGroup} vs {tr.controlGroup}
                                    </div>
                                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                                      🎯 {tr.primaryOutcome}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                      🛡️ {tr.safetyOutcome}
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-2">
                                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold truncate">
                                    💡 {tr.bottomLineTakeaway}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {tr.fullTextUrl && (
                                      <a
                                        href={tr.fullTextUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10.5px] font-bold text-slate-400 hover:text-amber-500 hover:underline flex items-center gap-0.5"
                                      >
                                        <span>Paper</span>
                                        <span>↗</span>
                                      </a>
                                    )}
                                    {tr.impactedScenarioId && (
                                      <button
                                        onClick={() => handleJumpToScenario(tr.impactedScenarioId!)}
                                        className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline whitespace-nowrap ml-1"
                                      >
                                        Matrix ➔
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
                          <a
                            href={conf.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <span>Official Supplement / Abstracts</span>
                            <span>↗</span>
                          </a>

                          <button
                            onClick={() => toggleConference(conf.id)}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            Collapse trials ▴
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: CLINICAL SCENARIOS MATRIX (Master-Detail 2-Column Layout)
           ========================================================================= */}
        {activeTab === "matrix" && (
          <div ref={matrixContainerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {filteredScenarios.length === 0 ? (
              /* Robust Empty State when search/filter returns 0 items */
              <div className="lg:col-span-12 p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                <span className="text-3xl block mb-2">🔍</span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No clinical scenarios found
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  No matching scenarios for &ldquo;{searchQuery}&rdquo; in {selectedSubspecialty}.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSubspecialty("All Subspecialties");
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                {/* LEFT COLUMN (4/12): Scenario Explorer */}
                <aside className="lg:col-span-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Clinical Scenarios ({filteredScenarios.length})
                    </span>
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                      {selectedSubspecialty}
                    </span>
                  </div>

                  {/* Mobile Compact Scenario Selector Pill */}
                  <div className="lg:hidden">
                    <button
                      onClick={() => setIsMobileScenarioListOpen((prev) => !prev)}
                      className={`w-full p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                        currentScenario
                          ? darkMode
                            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                            : "bg-amber-50 border-amber-300 text-amber-900"
                          : darkMode
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "bg-slate-100 border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 text-left">
                        <span className="text-base shrink-0">📋</span>
                        <div className="truncate">
                          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                            {currentScenario ? "Selected Scenario:" : `Select Clinical Scenario (${filteredScenarios.length}):`}
                          </div>
                          <div className="text-xs font-bold truncate">
                            {currentScenario ? currentScenario.title : "Click to select a scenario..."}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-black/10 dark:bg-white/10 shrink-0">
                        {isMobileScenarioListOpen ? "Collapse ▴" : "Change Scenario ▾"}
                      </span>
                    </button>
                  </div>

                  {/* Scenario Explorer List (Visible on desktop, collapsible on mobile) */}
                  <div
                    className={`${
                      isMobileScenarioListOpen ? "block" : "hidden lg:block"
                    } space-y-2.5 max-h-[850px] overflow-y-auto pr-1`}
                  >
                    {filteredScenarios.map((scenario) => {
                      const isSelected = scenario.id === activeScenarioId;
                      return (
                        <button
                          key={scenario.id}
                          onClick={() => {
                            setActiveScenarioId(scenario.id);
                            setIsMobileScenarioListOpen(false);
                          }}
                          className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                            isSelected
                              ? darkMode
                                ? "bg-amber-500/10 border-amber-500 text-white ring-1 ring-amber-500/50 shadow-md shadow-amber-500/10"
                                : "bg-amber-50/80 border-amber-500 text-slate-900 ring-1 ring-amber-500/40 shadow-md shadow-amber-500/10"
                              : darkMode
                              ? "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-200"
                              : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 mb-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {scenario.subspecialty}
                            </span>

                            {scenario.statusBadge && (
                              <span
                                className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-full ${
                                  scenario.statusBadge === "PRACTICE_CHANGING"
                                    ? "bg-amber-500 text-slate-950"
                                    : scenario.statusBadge === "UPGRADED"
                                    ? "bg-emerald-500 text-white"
                                    : "bg-blue-500 text-white"
                                }`}
                              >
                                {scenario.statusBadge === "PRACTICE_CHANGING"
                                  ? "⚡ Practice-Changing"
                                  : scenario.statusBadge}
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold leading-snug line-clamp-2">
                            {scenario.title}
                          </h4>

                          {scenario.hasConfAlert && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 px-2 py-0.5 rounded-md">
                              <span>🔔</span>
                              <span className="truncate">{scenario.confAlertText}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </aside>

                {/* RIGHT COLUMN (8/12): Detailed Comparison Dashboard */}
                <section className="lg:col-span-8 space-y-5">
                  {!currentScenario ? (
                    <div
                      className={`p-8 sm:p-14 text-center rounded-2xl border border-dashed transition-all ${
                        darkMode
                          ? "bg-slate-900/40 border-slate-800 text-slate-300"
                          : "bg-white/60 border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl">
                        ⚖️
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                        No Clinical Scenario Selected
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
                        Select a clinical scenario from the list to inspect the cross-society consensus matrix (AHA vs. ESO vs. VN), temporal shifts, and pivotal trial evidence.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        {filteredScenarios.slice(0, 3).map((sc) => (
                          <button
                            key={sc.id}
                            onClick={() => {
                              setActiveScenarioId(sc.id);
                              setIsMobileScenarioListOpen(false);
                            }}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all border border-amber-500/25 flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>👉</span>
                            <span>{sc.title.length > 38 ? sc.title.slice(0, 38) + "..." : sc.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl border p-5 transition-all ${
                        darkMode
                          ? "bg-slate-900 border-slate-800"
                          : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      {/* Scenario Header */}
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                            {currentScenario.subspecialty}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            ID: {currentScenario.id}
                          </span>
                        </div>

                        <h2 className="text-lg sm:text-xl font-black leading-snug">
                          {currentScenario.title}
                        </h2>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                          {currentScenario.summary}
                        </p>

                        {/* Ecosystem Deep Links with dead # prevention */}
                        {currentScenario.ecosystemLinks && (
                          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                              Cross-Ecosystem Clinical Tools:
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {currentScenario.ecosystemLinks.map((link, idx) => (
                                <Link
                                  key={idx}
                                  href={link.href}
                                  onClick={(e) => {
                                    if (link.href === "#") {
                                      e.preventDefault();
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    link.href === "#" ? "cursor-default" : ""
                                  } ${
                                    link.app === "NeuroRx"
                                      ? "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
                                      : link.app === "NeuroCalc"
                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                                      : link.app === "NeuroVision"
                                      ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                                      : "bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20"
                                  }`}
                                >
                                  <span>👉 {link.app}:</span>
                                  <span>{link.label}</span>
                                  {link.badge && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 border font-extrabold">
                                      {link.badge}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Detail Tabs - Clean & Concise */}
                      <div className="mt-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
                        <button
                          onClick={() => setActiveDetailTab("matrix")}
                          className={`pb-2.5 px-1.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            activeDetailTab === "matrix"
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>⚖️</span>
                          <span>Cross-Society Matrix</span>
                        </button>
                        <button
                          onClick={() => setActiveDetailTab("temporal")}
                          className={`pb-2.5 px-1.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            activeDetailTab === "temporal"
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>⏳</span>
                          <span>Guideline Diff</span>
                        </button>
                        <button
                          onClick={() => setActiveDetailTab("conf_bridge")}
                          className={`pb-2.5 px-1.5 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            activeDetailTab === "conf_bridge"
                              ? "border-amber-500 text-amber-600 dark:text-amber-400"
                              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          }`}
                        >
                          <span>⚡</span>
                          <span>Evidence Bridge</span>
                        </button>
                      </div>

                      {/* TAB 1: CROSS-SOCIETY MATRIX */}
                      {activeDetailTab === "matrix" && (
                        <div className="mt-5 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                            {scenarioRecommendations.map((atom) => {
                              const tier = TIER_CONFIG[atom.normalizedTier];
                              return (
                                <div
                                  key={atom.id}
                                  className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                                    darkMode
                                      ? "bg-slate-950/70 border-slate-800"
                                      : "bg-slate-50/90 border-slate-200"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-2.5">
                                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                        {atom.society} ({atom.year})
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${tier.badgeBg} ${tier.textColor} ${tier.borderColor}`}
                                      >
                                        Tier {atom.normalizedTier}
                                      </span>
                                    </div>

                                    <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-2">
                                      {atom.originalGrade}
                                    </div>

                                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium mb-3">
                                      {atom.recommendationText}
                                    </p>

                                    {atom.eligibilityCriteria && (
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                                        <span className="font-bold">
                                          Eligibility Criteria:
                                        </span>{" "}
                                        {atom.eligibilityCriteria}
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                                    <span className="text-[10px] font-bold text-slate-400 block mb-1">
                                      Pivotal Trials Cited:
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {atom.citedTrials.map((tr, i) => (
                                        <span
                                          key={i}
                                          className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border text-slate-600 dark:text-slate-300 font-semibold"
                                        >
                                          {tr}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* TAB 2: TEMPORAL EVOLUTION */}
                      {activeDetailTab === "temporal" && (
                        <div className="mt-5 space-y-4">
                          {currentScenario.temporalEvolution &&
                          currentScenario.temporalEvolution.length > 0 ? (
                            <div className="space-y-3">
                              {currentScenario.temporalEvolution.map((evol, idx) => (
                                <div
                                  key={idx}
                                  className={`p-4 rounded-2xl border ${
                                    darkMode
                                      ? "bg-slate-950/60 border-slate-800"
                                      : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                                      {evol.society} Evolution Timeline
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                      ⬆️ {evol.shiftDirection}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2.5">
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                      <div className="text-[11px] text-slate-400 font-bold mb-1">
                                        PREVIOUS VERSION ({evol.previousYear}):
                                      </div>
                                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        {evol.previousGrade}
                                      </div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                                      <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mb-1">
                                        CURRENT GUIDELINE ({evol.currentYear}):
                                      </div>
                                      <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                        {evol.currentGrade}
                                      </div>
                                    </div>
                                  </div>

                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {evol.evolutionNarrative}
                                  </p>

                                  <div className="mt-2 text-[11px] text-slate-500">
                                    <span className="font-bold">Driving Phase 3 Trials:</span>{" "}
                                    {evol.drivingTrials.join(" • ")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-6 text-center text-xs text-slate-400">
                              Recommendations remained stable across sequential guideline releases.
                            </div>
                          )}
                        </div>
                      )}

                      {/* TAB 3: LATE-BREAKING EVIDENCE BRIDGE */}
                      {activeDetailTab === "conf_bridge" && (
                        <div className="mt-5 space-y-4">
                          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                            <span className="text-xl">⚡</span>
                            <div>
                              <h4 className="text-xs font-black uppercase text-amber-600 dark:text-amber-400">
                                Evidence-to-Guideline Bridge (Guideline Watch)
                              </h4>
                              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                                Phase 3 randomized trials recently reported at international podiums (ISC / ESOC / AAN) that anticipate or prompt future guideline modifications.
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {MOCK_CONFERENCE_EVENTS.flatMap((c) => c.lateBreakingTrials)
                              .filter(
                                (tr) =>
                                  tr.impactedScenarioId === currentScenario.id ||
                                  tr.subspecialty === currentScenario.subspecialty
                              )
                              .map((tr) => (
                                <div
                                  key={tr.id}
                                  className={`p-3.5 rounded-2xl border text-xs ${
                                    darkMode
                                      ? "bg-slate-950/60 border-slate-800"
                                      : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1.5">
                                    <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                                      {tr.trialAcronym}
                                    </span>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                      {tr.verdict}
                                    </span>
                                  </div>

                                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                                    {tr.title}
                                  </p>

                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                                    {tr.populationSummary}
                                  </p>

                                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border text-[11px] space-y-1 mb-2">
                                    <div>
                                      <span className="font-bold">Primary Endpoint:</span>{" "}
                                      {tr.primaryOutcome}
                                    </div>
                                    <div>
                                      <span className="font-bold">Safety Profile:</span>{" "}
                                      {tr.safetyOutcome}
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                                    💡 {tr.bottomLineTakeaway}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* BOTTOM AI APPRAISAL BOX */}
                      <div className="mt-6 p-4 sm:p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent">
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className="text-base">🧠</span>
                          <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            AI Clinical Appraisal &amp; Practice Verdict
                          </h4>
                        </div>

                        <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
                          <div className="flex items-start gap-2">
                            <span className="font-bold text-slate-400 whitespace-nowrap">
                              ⚖️ Consensus:
                            </span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                              {currentScenario.aiSynthesisAppraisal.consensusLevel ===
                              "HIGH_CONCORDANCE"
                                ? "High Concordance across Major Societies"
                                : "Moderate Variation / Conditional Discordance"}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="font-bold text-slate-400 whitespace-nowrap">
                              🔍 Root Cause:
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {currentScenario.aiSynthesisAppraisal.whyGuidelinesDiffer}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold">
                            <span className="font-extrabold">💡 Clinical Bottom-Line:</span>{" "}
                            {currentScenario.aiSynthesisAppraisal.clinicalBottomLine}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: REVIEW QUEUE (Admin Only)
           ========================================================================= */}
        {activeTab === "review" && (
          isAdminVerified ? (
            <ReviewQueueTab
              darkMode={darkMode}
              onQueueUpdated={fetchQueueCount}
              onQueueCountChange={(count) => setReviewQueueCount(count)}
              onOpenPipelineModal={() => {
                if (!isAdminVerified) {
                  setShowAdminAuthModal(true);
                  return;
                }
                setShowPipelineModal(true);
              }}
              onOpenNotebookLMModal={() => setShowNotebookLMModal(true)}
            />
          ) : (
            <div className={`p-8 rounded-2xl border text-center max-w-md mx-auto my-12 ${
              darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}>
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-amber-500/10 flex items-center justify-center text-2xl">
                🛡️
              </div>
              <h3 className="text-base font-bold mb-1">Admin Verification Restricted</h3>
              <p className="text-xs text-slate-500 mb-4">
                Admin authentication is required to review pending guidelines, inspect extraction logs, and run PDF pipelines.
              </p>
              <button
                onClick={() => setShowAdminAuthModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer"
              >
                Admin Sign In
              </button>
            </div>
          )
        )}

        {/* =========================================================================
            PIPELINE ORCHESTRATOR MODAL (ADMIN ONLY)
           ========================================================================= */}
        {isAdminVerified && (
          <PipelineModal
            isOpen={showPipelineModal}
            onClose={() => setShowPipelineModal(false)}
            onSuccess={() => {
              fetchQueueCount();
              setActiveTab("review");
            }}
            onOpenNotebookLM={() => setShowNotebookLMModal(true)}
            darkMode={darkMode}
          />
        )}

        {/* ADMIN AUTH MODAL */}
        <AdminAuthModal
          show={showAdminAuthModal}
          darkMode={darkMode}
          onClose={() => setShowAdminAuthModal(false)}
          onSuccess={() => {
            setIsAdminVerified(true);
            setShowAdminAuthModal(false);
          }}
        />

        {/* NOTEBOOKLM UPLOAD & GUIDELINE GENERATOR MODAL */}
        <NotebookLMUploadModal
          isOpen={showNotebookLMModal}
          onClose={() => setShowNotebookLMModal(false)}
          onSuccess={(newDoc) => {
            setGuidelineDocs((prev) => {
              const next = [newDoc, ...prev.filter((d) => d.id !== newDoc.id)];
              try {
                localStorage.setItem("neuroguide_cached_guidelines", JSON.stringify(next));
              } catch {}
              return next;
            });
            setExpandedGuidelineIds((prev) => ({ ...prev, [newDoc.id]: true }));
            setSelectedSocietyFilter("ALL");
            setSyncMessage(
              `🎉 Successfully generated and saved Practice Guideline "${newDoc.title}" (${newDoc.allPracticeChanges.length} recommendations)!`
            );
            fetchQueueCount();
          }}
          darkMode={darkMode}
        />

        {/* EDIT GUIDELINE / PRACTICE CHANGE MODAL */}
        {isAdminVerified && showEditModal && (
          <EditGuidelineModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            docId={editingDocId || ""}
            item={editingPracticeChange}
            guidelineDoc={editingGuidelineDoc}
            onSuccess={() => {
              reloadGuidelines();
            }}
            darkMode={darkMode}
          />
        )}

        {/* =========================================================================
            FOOTER
           ========================================================================= */}
        <footer
          className={`border-t mt-12 py-6 text-center text-xs transition-colors ${
            darkMode
              ? "bg-slate-950 border-slate-800 text-slate-500"
              : "bg-slate-100 border-slate-200 text-slate-400"
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-500">NEUROGUIDE</span>
              <span>• Part of the Neuro Ecosystem</span>
            </div>
            <div>
              Clinical Practice Guidelines, Consensus Statements &amp; Conference Intelligence Radar
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
