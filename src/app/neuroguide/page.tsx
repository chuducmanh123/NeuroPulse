"use client";

import React, { ViewTransition, useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  ChevronDown,
  Compass,
  Layers,
  Radio,
  Search,
  X,
} from "lucide-react";
import {
  NEUROLOGY_SUBSPECIALTIES,
  SubspecialtyType,
  TIER_CONFIG,
  GuidelineDoc,
  RecommendationAtom,
  ConferenceEvent,
  PivotalTrialRecord,
  RecommendationLabelOutput,
  NavigatorQuery,
} from "../../types/neuroguide";
import type { Article } from "../../types/article";
import {
  PIVOTAL_TRIALS_SEED,
  mergePivotalTrialsWithConferences,
} from "../../data/pivotalTrialsSeed";
import {
  MOCK_GUIDELINE_DOCS,
  MOCK_RECOMMENDATION_ATOMS,
} from "../../data/neuroguideMockData";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";
import { AdminButton } from "../../components/ecosystem/AdminButton";
import { CustomSelect } from "../../components/ecosystem/CustomSelect";
import { MEDICAL_DISCLAIMER_TEXT } from "../../components/ecosystem/MedicalDisclaimerFooter";
import { NeuroGuideSyncStatusBadge } from "../../components/neuroguide/sync/NeuroGuideSyncStatusBadge";
import { useNeuroGuideSync } from "../../hooks/useNeuroGuideSync";
import { reconstructCatalogFromSyncGraph } from "../../lib/neuroguide/sync/lookupHelpers";
import {
  getEcosystemDarkMode,
  setEcosystemDarkMode,
  subscribeEcosystemDarkMode,
} from "../../utils/themeSync";
import dynamic from "next/dynamic";

const ClinicalNavigatorTab = dynamic(
  () => import("../../components/neuroguide/ClinicalNavigatorTab").then((m) => m.ClinicalNavigatorTab),
  {
    ssr: false,
    loading: () => (
      <div className="p-12 text-center text-slate-500 animate-pulse">
        <span className="text-3xl block mb-2">🧭</span>
        Loading Clinical Navigator &amp; Ontology Engine...
      </div>
    ),
  }
);

const ReviewQueueTab = dynamic(
  () => import("../../components/neuroguide/ReviewQueueTab").then((m) => m.ReviewQueueTab),
  {
    ssr: false,
    loading: () => (
      <div className="p-12 text-center text-slate-500 animate-pulse">
        <span className="text-3xl block mb-2">⏳</span>
        Đang tải Review Queue...
      </div>
    ),
  }
);
const PipelineModal = dynamic(
  () => import("../../components/neuroguide/PipelineModal").then((m) => m.PipelineModal),
  { ssr: false }
);
const NotebookLMUploadModal = dynamic(
  () => import("../../components/neuroguide/NotebookLMUploadModal").then((m) => m.NotebookLMUploadModal),
  { ssr: false }
);
const EditGuidelineModal = dynamic(
  () => import("../../components/neuroguide/EditGuidelineModal").then((m) => m.EditGuidelineModal),
  { ssr: false }
);
const ConferenceEditModal = dynamic(
  () => import("../../components/neuroguide/ConferenceEditModal").then((m) => m.ConferenceEditModal),
  { ssr: false }
);
const AdminAuthModal = dynamic(
  () => import("../../components/neurocase/modals/AdminAuthModal").then((m) => m.AdminAuthModal),
  { ssr: false }
);
const GuidelinePresentationRenderer = dynamic(
  () => import("../../components/neuroguide/GuidelinePresentationRenderer").then((m) => m.GuidelinePresentationRenderer),
  { ssr: false }
);
import { groupPracticeChangesIntoEsoPicos } from "../../lib/neuroguide/esoPicoGrouper";
import { cleanGuidelineTitle } from "../../lib/neuroguide/guidelineFormat";
import type { PracticeChangeDetail } from "../../types/neuroguide";
import { getAdminHeaders, getStoredAdminToken } from "@/utils/clientAuth";

type NavTabId = "guidelines" | "conf" | "navigator" | "review";

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
      cardBg: "bg-[#FFF9F8] dark:bg-rose-950/20",
      cardBorder: "border-rose-300/80 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-600",
      badge: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800",
      accentText: "text-rose-600 dark:text-rose-400",
    };
  }
  if (norm.includes("ESVS")) {
    return {
      borderLeft: "border-l-4 border-l-teal-600",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-teal-400 dark:hover:border-teal-600",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/60 dark:text-teal-300 dark:border-teal-800",
      accentText: "text-teal-600 dark:text-teal-400",
    };
  }
  if (norm.includes("ESC") && !norm.includes("ESOC")) {
    return {
      borderLeft: "border-l-4 border-l-rose-600",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-rose-400 dark:hover:border-rose-600",
      badge: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800",
      accentText: "text-rose-600 dark:text-rose-400",
    };
  }
  if (norm.includes("ESO")) {
    return {
      borderLeft: "border-l-4 border-l-blue-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-blue-400 dark:hover:border-blue-600",
      badge: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/60 dark:text-blue-300 dark:border-blue-800",
      accentText: "text-blue-600 dark:text-blue-400",
    };
  }
  if (norm.includes("VN") || norm.includes("MOH") || norm.includes("BỘ Y TẾ")) {
    return {
      borderLeft: "border-l-4 border-l-emerald-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-emerald-400 dark:hover:border-emerald-600",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800",
      accentText: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (norm.includes("AES") || norm.includes("ILAE")) {
    return {
      borderLeft: "border-l-4 border-l-indigo-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-indigo-400 dark:hover:border-indigo-600",
      badge: "bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800",
      accentText: "text-indigo-600 dark:text-indigo-400",
    };
  }
  if (norm.includes("MDS")) {
    return {
      borderLeft: "border-l-4 border-l-teal-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-teal-400 dark:hover:border-teal-600",
      badge: "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/60 dark:text-teal-300 dark:border-teal-800",
      accentText: "text-teal-600 dark:text-teal-400",
    };
  }
  if (norm.includes("AHS") || norm.includes("HEADACHE")) {
    return {
      borderLeft: "border-l-4 border-l-orange-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-orange-400 dark:hover:border-orange-600",
      badge: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/60 dark:text-orange-300 dark:border-orange-800",
      accentText: "text-orange-600 dark:text-orange-400",
    };
  }
  if (norm.includes("ECTRIMS")) {
    return {
      borderLeft: "border-l-4 border-l-cyan-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-cyan-400 dark:hover:border-cyan-600",
      badge: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/60 dark:text-cyan-300 dark:border-cyan-800",
      accentText: "text-cyan-600 dark:text-cyan-400",
    };
  }
  if (norm.includes("AANEM")) {
    return {
      borderLeft: "border-l-4 border-l-sky-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-sky-400 dark:hover:border-sky-600",
      badge: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-800",
      accentText: "text-sky-600 dark:text-sky-400",
    };
  }
  if (norm.includes("NCS")) {
    return {
      borderLeft: "border-l-4 border-l-violet-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-violet-400 dark:hover:border-violet-600",
      badge: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/60 dark:text-violet-300 dark:border-violet-800",
      accentText: "text-violet-600 dark:text-violet-400",
    };
  }
  if (norm.includes("AAN") || norm.includes("EAN")) {
    return {
      borderLeft: "border-l-4 border-l-purple-500",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-purple-400 dark:hover:border-purple-600",
      badge: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800",
      accentText: "text-purple-600 dark:text-purple-400",
    };
  }
  return {
    borderLeft: "border-l-4 border-l-[#C25934]",
    cardBg: "bg-[var(--bg-surface)]",
    cardBorder: "border-[var(--border-hairline)] hover:border-[#C25934]/70 dark:hover:border-orange-500/60",
    badge: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/60 dark:text-orange-300 dark:border-orange-800",
    accentText: "text-[#C25934] dark:text-orange-400",
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
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-rose-300/80 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-600",
      badge: "bg-red-500 text-white border-red-500",
      accentText: "text-red-600 dark:text-red-400",
    };
  }
  if (status === "RECENT") {
    return {
      borderLeft: "border-l-4 border-l-[#C25934]",
      cardBg: "bg-[var(--bg-surface)]",
      cardBorder: "border-[var(--border-hairline)] hover:border-[#C25934]/70 dark:hover:border-orange-500/60",
      badge: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/60 dark:text-orange-300 dark:border-orange-800",
      accentText: "text-[#C25934] dark:text-orange-400",
    };
  }
  return {
    borderLeft: "border-l-4 border-l-indigo-500",
    cardBg: "bg-[var(--bg-surface)]",
    cardBorder: "border-[var(--border-hairline)] hover:border-indigo-400 dark:hover:border-indigo-600",
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

  // Guideline Docs with Periodic Autonomous Online Sync State
  const [guidelineDocs, setGuidelineDocs] = useState<GuidelineDoc[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
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

  // Conferences dynamic state & Edit/Delete modal state
  const [conferences, setConferences] = useState<ConferenceEvent[]>([]);
  const [editingConference, setEditingConference] = useState<ConferenceEvent | null>(null);
  const [showConferenceModal, setShowConferenceModal] = useState<boolean>(false);
  const [deleteConfLoadingId, setDeleteConfLoadingId] = useState<string | null>(null);

  // Recommendation Atoms dynamic state
  const [recommendationAtoms, setRecommendationAtoms] = useState<RecommendationAtom[]>(MOCK_RECOMMENDATION_ATOMS);

  // Clinical Navigator dynamic state (Pivotal Trials, Custom Labels, NeuroPulse Articles)
  const [pivotalTrials, setPivotalTrials] = useState<PivotalTrialRecord[]>(() =>
    mergePivotalTrialsWithConferences(PIVOTAL_TRIALS_SEED, [])
  );
  const [deletedTrialIds, setDeletedTrialIds] = useState<string[]>([]);
  const [customRecLabels, setCustomRecLabels] = useState<Record<string, RecommendationLabelOutput>>({});
  const [neuroPulseArticles, setNeuroPulseArticles] = useState<Article[]>([]);
  const [navigatorSeedQuery, setNavigatorSeedQuery] = useState<NavigatorQuery | null>(null);

  const SWR_STORAGE_KEY = "neuroguide_swr_store_v3";
  const isSyncV2 = process.env.NEXT_PUBLIC_NEUROGUIDE_SYNC_V2 === "1";
  const syncState = useNeuroGuideSync({ enabled: isSyncV2 });

  const filterValidGuidelines = (list: GuidelineDoc[], deletedIds: string[] = []): GuidelineDoc[] => {
    if (!Array.isArray(list)) return [];
    const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");

    // Bảo đảm các guideline đang có mặt không bao giờ bị lọc nhầm bởi deletedIds cũ
    const activeKeys = new Set<string>();
    list.forEach((g) => {
      if (g?.id) activeKeys.add(g.id.toLowerCase().trim());
      if (g?.title) {
        activeKeys.add(normalizeT(g.title));
        const simplified = normalizeT(
          g.title
            .replace(/european\s+stroke\s+organisation/gi, "eso")
            .replace(/american\s+heart\s+association/gi, "aha")
            .replace(/american\s+stroke\s+association/gi, "asa")
        );
        activeKeys.add(simplified);
      }
    });
    const safeDeletedIds = deletedIds.filter((d) => !activeKeys.has((d || "").toLowerCase().trim()));
    const deletedSet = new Set(safeDeletedIds.map((x) => (x || "").toLowerCase().trim()));

    return list.filter((g) => {
      if (!g || !g.title) return false;
      const id = (g.id || "").toLowerCase();
      const norm = normalizeT(g.title);
      if (deletedSet.has(id) || deletedSet.has(norm)) return false;
      if (id.startsWith("eso-pmid-") || id.startsWith("esc-pmid-") || id.includes("phantom")) return false;
      return true;
    });
  };

  const reloadGuidelines = (bypassCache = true) => {
    const url = bypassCache ? `/api/neuroguide/sync-guidelines?_ts=${Date.now()}` : "/api/neuroguide/sync-guidelines";
    fetch(url, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.status === "success") {
          if (Array.isArray(data.recommendationAtoms) && data.recommendationAtoms.length > 0) {
            setRecommendationAtoms(data.recommendationAtoms);
          }
          if (Array.isArray(data.conferences)) {
            setConferences(data.conferences);
          }
          if (Array.isArray(data.guidelines)) {
            const serverDel: string[] = Array.isArray(data.deletedGuidelineIds) ? data.deletedGuidelineIds : [];
            const activeKeys = new Set<string>();
            data.guidelines.forEach((g: GuidelineDoc) => {
              if (g.id) activeKeys.add(g.id.toLowerCase().trim());
              if (g.title) activeKeys.add(g.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
            });
            const cleanDeleted = serverDel.filter((d) => !activeKeys.has(d.toLowerCase().trim()));
            const valid = filterValidGuidelines(data.guidelines, cleanDeleted);
            setGuidelineDocs(valid);
            setIsInitialLoading(false);
            try {
              localStorage.setItem(
                SWR_STORAGE_KEY,
                JSON.stringify({
                  version: data.lastSyncedAt || new Date().toISOString(),
                  guidelines: valid,
                  conferences: Array.isArray(data.conferences) ? data.conferences : [],
                  scenarios: data.scenarios,
                  recommendationAtoms: data.recommendationAtoms,
                  deletedIds: cleanDeleted,
                  timestamp: Date.now(),
                })
              );
            } catch {}
          }
        }
      })
      .catch(() => {
        setIsInitialLoading(false);
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
    // Load Clinical Navigator store (Pivotal Trials + Custom Labels)
    fetch("/api/neuroguide/navigator", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) {
          if (Array.isArray(d.deletedTrialIds)) {
            setDeletedTrialIds(d.deletedTrialIds);
          }
          if (Array.isArray(d.pivotalTrials) && d.pivotalTrials.length > 0) {
            setPivotalTrials(d.pivotalTrials);
          }
          if (d.customRecLabels) {
            setCustomRecLabels(d.customRecLabels);
          }
        }
      })
      .catch(() => {});

    // Load local NeuroPulse articles for Section 5 (Related NeuroPulse Literature)
    fetch("/data/articles.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((arts) => {
        if (Array.isArray(arts)) {
          setNeuroPulseArticles(arts);
        }
      })
      .catch(() => {});
  }, []);

  // Dynamic Navigation Tabs with Live Counts (Review Queue visible to Admin only)
  const navTabs = useMemo(() => {
    const tabs: {
      id: NavTabId;
      label: string;
      mobileLabel: string;
      icon: typeof BookOpen;
      badge?: string;
    }[] = [
      {
        id: "guidelines" as const,
        label: "Guidelines",
        mobileLabel: "Guidelines",
        icon: BookOpen,
        badge: `${guidelineDocs.length}`,
      },
      {
        id: "conf" as const,
        label: "Conferences & Trials",
        mobileLabel: "Conferences",
        icon: Radio,
        badge: `${conferences.length}`,
      },
      {
        id: "navigator" as const,
        label: "Clinical Navigator",
        mobileLabel: "Navigator",
        icon: Compass,
      },
    ];

    return tabs;
  }, [guidelineDocs.length, conferences.length]);

  // Expandable cards states (details reveal only on click)
  const [expandedGuidelineIds, setExpandedGuidelineIds] = useState<Record<string, boolean>>({});
  const [expandedConferenceIds, setExpandedConferenceIds] = useState<Record<string, boolean>>({});
  const [expandedTakeaways, setExpandedTakeaways] = useState<Record<string, boolean>>({});

  const toggleTakeaways = (docId: string) => {
    setExpandedTakeaways((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

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
      `Bạn có chắc chắn muốn XÓA guideline:\n\n"${doc.title}" (${doc.society} ${doc.year})?\n\nHướng dẫn này sẽ được gỡ bỏ khỏi thư viện và hệ thống lưu trữ Cloud.`
    );
    if (!confirmDelete) return;

    setDeleteLoadingId(doc.id);
    const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const targetNormTitle = normalizeT(doc.title);
    const token = getStoredAdminToken();

    try {
      const res = await fetch("/api/neuroguide/delete-guideline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(token),
        },
        body: JSON.stringify({ guideline_id: doc.id, title: doc.title }),
      });
      const data = await res.json();
      if (data.ok) {
        setGuidelineDocs((prev) =>
          prev.filter(
            (g) =>
              g.id !== doc.id &&
              g.id.toLowerCase() !== doc.id.toLowerCase() &&
              normalizeT(g.title) !== targetNormTitle
          )
        );
        try {
          const raw = localStorage.getItem(SWR_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            const serverDel: string[] = Array.isArray(data.deletedGuidelineIds) ? data.deletedGuidelineIds : [];
            const mergedDel = Array.from(
              new Set([
                ...(parsed.deletedIds || []),
                doc.id.toLowerCase(),
                targetNormTitle,
                ...serverDel.map((x) => x.toLowerCase()),
              ])
            );
            const remaining = filterValidGuidelines(parsed.guidelines || [], mergedDel);
            localStorage.setItem(
              SWR_STORAGE_KEY,
              JSON.stringify({
                ...parsed,
                guidelines: remaining,
                deletedIds: mergedDel,
                version: new Date().toISOString(),
              })
            );
          }
        } catch {}
        reloadGuidelines(true);
        setSyncMessage(`🗑️ Đã xóa guideline "${doc.title}" trên Cloud thành công.`);
      } else {
        alert(`Lỗi khi xóa guideline: ${data.error || "Không thể xóa guideline"}`);
      }
    } catch {
      alert("Lỗi kết nối khi gửi yêu cầu xóa guideline.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  // Background Autonomous Sync Method (manual trigger -> sends candidates to Review Queue, reloads approved guidelines from Cloud)
  const triggerSync = async (isAuto = false) => {
    if (isSyncing) return;
    setIsSyncing(true);
    const token = getStoredAdminToken();
    try {
      const res = await fetch("/api/neuroguide/sync-guidelines", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(token),
        },
        body: JSON.stringify({ isPeriodicCron: isAuto }),
      });
      const json = await res.json();
      if (json.status === "success") {
        reloadGuidelines();
        fetchQueueCount();

        const quota = json.quotaReport;
        const storageNote = json.savedToBlob ? "Vercel Blob" : json.storageBackend || "Cloud Storage";
        if (quota) {
          setSyncMessage(
            `✨ Full-Text AI Radar: Đã quét ${quota.guidelinesAnalyzed} guideline mới đưa vào Hàng đợi duyệt (Review Queue), cập nhật 2 hội nghị & 2 kịch bản lâm sàng (${storageNote}).`
          );
        } else {
          setSyncMessage(json.message || `Successfully synchronized guidelines from ${storageNote}.`);
        }

        const nowStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        setLastSyncedTime(nowStr);
      }
    } catch (err) {
      console.warn("Background radar sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateConferencesCache = (nextConfs: ConferenceEvent[]) => {
    try {
      const raw = localStorage.getItem(SWR_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        localStorage.setItem(
          SWR_STORAGE_KEY,
          JSON.stringify({
            ...parsed,
            conferences: nextConfs,
            version: new Date().toISOString(),
          })
        );
      }
    } catch {}
  };

  const handleDeleteConference = async (conf: ConferenceEvent) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn XÓA conference:\n\n"${conf.name}" (${conf.acronym})?\n\nHội nghị này sẽ được gỡ bỏ khỏi hệ thống lưu trữ Cloud.`
    );
    if (!confirmDelete) return;

    setDeleteConfLoadingId(conf.id);
    const token = getStoredAdminToken();
    try {
      const res = await fetch("/api/neuroguide/conferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(token),
        },
        body: JSON.stringify({
          action: "delete_conference",
          conferenceId: conf.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const nextConfs = Array.isArray(data.conferences)
          ? data.conferences
          : conferences.filter((c) => c.id !== conf.id);
        setConferences(nextConfs);
        updateConferencesCache(nextConfs);
        setSyncMessage(`🗑️ Đã xóa conference "${conf.acronym}" thành công.`);
      } else {
        alert(`Lỗi khi xóa conference: ${data.error || "Không thể xóa conference"}`);
      }
    } catch (err: unknown) {
      alert(`Lỗi kết nối khi xóa conference: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeleteConfLoadingId(null);
    }
  };

  const handleDeleteConferenceTrial = async (conf: ConferenceEvent, trialId: string, trialAcronym: string) => {
    const confirmDelete = window.confirm(
      `Bạn có chắc chắn muốn XÓA trial "${trialAcronym}" khỏi ${conf.acronym}?`
    );
    if (!confirmDelete) return;

    const updatedTrials = (conf.lateBreakingTrials || []).filter((t) => t.id !== trialId);
    const updatedConf: ConferenceEvent = {
      ...conf,
      lateBreakingTrials: updatedTrials,
      stats: {
        totalLateBreakingTrials: updatedTrials.length,
        positiveTrials: updatedTrials.filter((t) => t.verdict === "POSITIVE").length,
        practiceChangingCount: updatedTrials.filter((t) => t.isPracticeChanging).length,
      },
    };
    const token = getStoredAdminToken();
    try {
      const res = await fetch("/api/neuroguide/conferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(token),
        },
        body: JSON.stringify({
          action: "upsert_conference",
          conference: updatedConf,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const nextConfs = Array.isArray(data.conferences)
          ? data.conferences
          : conferences.map((c) => (c.id === conf.id ? updatedConf : c));
        setConferences(nextConfs);
        updateConferencesCache(nextConfs);
        setSyncMessage(`🗑️ Đã xóa trial "${trialAcronym}" khỏi ${conf.acronym}.`);
      } else {
        alert(`Lỗi khi xóa trial: ${data.error || "Không thể xóa trial"}`);
      }
    } catch (err: unknown) {
      alert(`Lỗi kết nối khi xóa trial: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // SWR: Tải tức thì từ Local Cache (0ms), đồng thời ngầm kiểm tra Version siêu nhẹ (~150 bytes) để bảo đảm 100% tươi mới
  useEffect(() => {
    let hasLoadedFromCache = false;
    let hasCachedConferences = false;
    let localVersion = "";
    let localCachedCount = 0;
    let localCachedConfCount = 0;

    // 1. TẢI TỨC THÌ (Instant Paint): Nếu có cache hợp lệ, hiển thị ngay lập tức không cần đợi mạng
    try {
      localStorage.removeItem("neuroguide_cached_guidelines");
      localStorage.removeItem("neuroguide_last_sync_timestamp");
      localStorage.removeItem("neuroguide_swr_store_v1");
      localStorage.removeItem("neuroguide_swr_store_v2");

      const cachedRaw = localStorage.getItem(SWR_STORAGE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && Array.isArray(cached.recommendationAtoms) && cached.recommendationAtoms.length > 0) {
          setRecommendationAtoms(cached.recommendationAtoms);
        }
        if (cached && Array.isArray(cached.conferences)) {
          setConferences(cached.conferences);
          hasCachedConferences = true;
          localCachedConfCount = cached.conferences.length;
        }
        if (cached && Array.isArray(cached.guidelines) && cached.guidelines.length > 0) {
          const valid = filterValidGuidelines(cached.guidelines, cached.deletedIds || []);
          if (valid.length > 0) {
            setGuidelineDocs(valid);
            setIsInitialLoading(false);
            hasLoadedFromCache = true;
            localVersion = cached.version || "";
            localCachedCount = valid.length;
          }
        }
      }
    } catch {
      // Bỏ qua lỗi truy cập storage
    }

    // 2. KIỂM TRA PHIÊN BẢN SIÊU NHẸ (~150 bytes qua /api/neuroguide/version)
    fetch("/api/neuroguide/version", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((verData) => {
        if (verData && verData.status === "success") {
          const serverVersion = verData.version || "";
          const serverDeleted: string[] = Array.isArray(verData.deletedGuidelineIds)
            ? verData.deletedGuidelineIds
            : [];
          const serverTotal = typeof verData.totalGuidelines === "number" ? verData.totalGuidelines : 0;
          const serverConfTotal = typeof verData.totalConferences === "number" ? verData.totalConferences : 0;

          // Nếu phiên bản Cloud hoàn toàn trùng khớp với Local, đã hiển thị cache VÀ số lượng guideline + conference khớp hoàn toàn
          if (
            hasLoadedFromCache &&
            hasCachedConferences &&
            localVersion &&
            localVersion === serverVersion &&
            (serverTotal === 0 || localCachedCount === serverTotal) &&
            localCachedConfCount === serverConfTotal
          ) {
            // Đảm bảo lọc sạch nếu có ID nào mới thêm vào deletedGuidelineIds nhưng không lọc nhầm guideline đang active
            setGuidelineDocs((prev) => {
              const activeKeys = new Set<string>();
              prev.forEach((g) => {
                if (g.id) activeKeys.add(g.id.toLowerCase().trim());
                if (g.title) activeKeys.add(g.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
              });
              const cleanDeleted = serverDeleted.filter((d) => !activeKeys.has(d.toLowerCase().trim()));
              return filterValidGuidelines(prev, cleanDeleted);
            });
            setIsInitialLoading(false);
            return;
          }

          // Phiên bản khác hoặc chưa có cache hoặc lệch số lượng: Tải dữ liệu đầy đủ từ Cloud
          fetch("/api/neuroguide/sync-guidelines", { cache: "no-store" })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              setIsInitialLoading(false);
              if (data && data.status === "success" && Array.isArray(data.guidelines)) {
                const combinedDeleted = Array.from(
                  new Set([
                    ...serverDeleted,
                    ...(Array.isArray(data.deletedGuidelineIds) ? data.deletedGuidelineIds : []),
                  ])
                );
                const activeKeys = new Set<string>();
                data.guidelines.forEach((g: GuidelineDoc) => {
                  if (g.id) activeKeys.add(g.id.toLowerCase().trim());
                  if (g.title) activeKeys.add(g.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
                });
                const cleanDeleted = combinedDeleted.filter((d) => !activeKeys.has(d.toLowerCase().trim()));
                const validGuidelines = filterValidGuidelines(data.guidelines, cleanDeleted);
                setGuidelineDocs(validGuidelines);
                const nextConfs = Array.isArray(data.conferences) ? data.conferences : [];
                setConferences(nextConfs);
                if (Array.isArray(data.recommendationAtoms) && data.recommendationAtoms.length > 0) {
                  setRecommendationAtoms(data.recommendationAtoms);
                }

                try {
                  localStorage.setItem(
                    SWR_STORAGE_KEY,
                    JSON.stringify({
                      version: data.lastSyncedAt || serverVersion,
                      guidelines: validGuidelines,
                      conferences: nextConfs,
                      scenarios: data.scenarios,
                      recommendationAtoms: data.recommendationAtoms,
                      deletedIds: cleanDeleted,
                      timestamp: Date.now(),
                    })
                  );
                } catch {}
              }
            })
            .catch(() => {
              setIsInitialLoading(false);
            });
        } else {
          // Fallback nếu version endpoint không thành công
          if (!hasLoadedFromCache) {
            reloadGuidelines(true);
          }
        }
      })
      .catch(() => {
        // Fallback lỗi mạng: nếu chưa tải từ cache thì thử reload trực tiếp
        if (!hasLoadedFromCache) {
          reloadGuidelines(true);
        }
      });
  }, []);

  // Reconstruct UI catalogs in real time whenever Sync v2 2-tier graph updates
  useEffect(() => {
    if (!isSyncV2) return;
    if (syncState.blocksByUid.size === 0 && syncState.protocolsByUid.size === 0) {
      return;
    }

    const catalog = reconstructCatalogFromSyncGraph(syncState.derived, {
      guidelines: MOCK_GUIDELINE_DOCS,
      recommendationAtoms: MOCK_RECOMMENDATION_ATOMS,
      pivotalTrials: PIVOTAL_TRIALS_SEED,
    });
    const valid = filterValidGuidelines(catalog.guidelines, catalog.deletedGuidelineIds);
    setGuidelineDocs(valid);
    if (catalog.recommendationAtoms.length > 0) {
      setRecommendationAtoms(catalog.recommendationAtoms);
    }
    if (catalog.pivotalTrials.length > 0 || catalog.deletedTrialIds.length > 0) {
      setDeletedTrialIds(catalog.deletedTrialIds);
      setPivotalTrials((prev) =>
        mergePivotalTrialsWithConferences(
          catalog.pivotalTrials.length > 0 ? catalog.pivotalTrials : prev,
          conferences,
          catalog.deletedTrialIds,
        ),
      );
    }
    if (Object.keys(catalog.customRecLabels).length > 0) {
      setCustomRecLabels((prev) => ({ ...prev, ...catalog.customRecLabels }));
    }
    setIsInitialLoading(false);
  }, [
    isSyncV2,
    syncState.derived,
    syncState.blocksByUid.size,
    syncState.protocolsByUid.size,
  ]);

  // Sync dark mode with ecosystem standards
  useEffect(() => {
    setDarkMode(getEcosystemDarkMode());
    return subscribeEcosystemDarkMode(setDarkMode);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    setEcosystemDarkMode(next);
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
        (doc.subspecialties && doc.subspecialties.includes(selectedSubspecialty));

      if (!matchesSociety || !matchesSub) return false;
      if (tokens.length === 0) return true;

      const changesList = Array.isArray(doc.allPracticeChanges) ? doc.allPracticeChanges : [];
      const changesText = changesList
        .map(
          (c) =>
            `${c.topic || ""} ${c.currentText || ""} ${c.category || ""} ${c.previousText || ""} ${
              c.drivingTrials?.join(" ") || ""
            } ${c.currentGrade || ""} ${c.previousGrade || ""}`
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

    const list = conferences.filter((conf) => {
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
  }, [conferences, selectedConfStatus, selectedSubspecialty, searchQuery]);

  return (
    <ViewTransition name="app-neuroguide" share="app-morph" default="none">
      <main className="min-h-screen bg-[var(--bg-paper)] text-[var(--text-ink)] transition-colors duration-200 pb-10 overflow-x-hidden">
      {/* Unified Sticky App Header */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 px-4 py-3.5 backdrop-blur-md sm:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C25934] opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C25934]"></span>
              </span>
              <span>PRACTICE GUIDELINES &amp; RADAR</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold tracking-tight text-[var(--text-ink)] sm:text-2xl">
                NEUROGUIDE
              </h1>
              <span className="rounded-md bg-[#C25934] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                BETA
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isSyncV2 && isAdminVerified && (
              <NeuroGuideSyncStatusBadge
                syncStatus={syncState.status}
                lastSyncAt={syncState.lastSyncAt}
                lastChangeCount={syncState.blockChangeCount}
                lastSeq={syncState.lastSeq}
                rootHash={syncState.rootHash}
                protocolCount={syncState.protocolsByUid.size}
                blockCount={syncState.blocksByUid.size}
                darkMode={darkMode}
                onRefresh={syncState.refresh}
              />
            )}

            {/* Quick Link to Admin Review Queue if authenticated and pending items exist */}
            {isAdminVerified && reviewQueueCount > 0 && (
              <Link
                href="/admin"
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#C25934]/15 hover:bg-[#C25934]/25 text-[#C25934] dark:text-orange-300 border border-[#C25934]/30 flex items-center gap-1 transition-all"
                title="Mở Admin Command Center để kiểm duyệt khuyến cáo"
              >
                <span>🛡️ {reviewQueueCount}</span>
                <span className="hidden sm:inline">chờ duyệt</span>
                <span>→</span>
              </Link>
            )}

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

            <AppSwitcher currentApp="neuroguide" darkMode={darkMode} />
          </div>
        </div>
      </header>

      {/* Unified Underline Tabs (Terracotta #C25934 Accent) */}
      <nav className="border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 sm:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 overflow-x-auto scrollbar-none -mb-px">
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`group relative shrink-0 pb-2.5 pt-2 text-[12px] sm:text-[13px] transition-colors ${
                  isActive
                    ? "font-semibold text-[#C25934] dark:text-orange-400"
                    : "font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                }`}
              >
                <span className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg transition-colors group-hover:bg-[var(--bg-subtle)]">
                  <Icon
                    size={15}
                    strokeWidth={1.75}
                    className={
                      isActive
                        ? "text-[#C25934] dark:text-orange-400"
                        : "text-[var(--text-muted)] group-hover:text-[var(--text-ink)]"
                    }
                  />
                  <span className="sm:hidden whitespace-nowrap">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none ${
                        isActive
                          ? "bg-[#C25934]/15 text-[#C25934] dark:bg-orange-500/20 dark:text-orange-300"
                          : "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </span>
                {isActive && (
                  <span className="absolute inset-x-1 bottom-0 h-[2px] rounded-full bg-[#C25934] dark:bg-orange-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-5">
        {/* =========================================================================
            TAB 1: PRACTICE GUIDELINES (2-Column Tree Filter + Guideline Cards)
           ========================================================================= */}
        {activeTab === "guidelines" && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
            {/* Desktop Left Sidebar Tree Filter (3 cols) */}
            <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-20">
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 shadow-2xs">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  SUBSPECIALTY TREE
                </div>
                <div className="mt-2.5 space-y-1">
                  {NEUROLOGY_SUBSPECIALTIES.map((sub) => {
                    const active = selectedSubspecialty === sub;
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSelectedSubspecialty(sub)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                          active
                            ? "bg-[#C25934] text-white font-semibold"
                            : "font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                        }`}
                      >
                        <span className="truncate pr-2">{sub}</span>
                        <span className="text-[10px] opacity-75">•</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--border-hairline)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  ISSUING SOCIETY
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {availableSocieties.map((soc) => {
                    const active = selectedSocietyFilter === soc;
                    return (
                      <button
                        key={soc}
                        type="button"
                        onClick={() => setSelectedSocietyFilter(soc)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          active
                            ? "border-[#C25934] bg-[#C25934]/15 text-[#C25934] dark:text-orange-300"
                            : "border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                        }`}
                      >
                        {soc === "ALL" ? "All Societies" : soc}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Right Column: Search, Mobile Dropdowns & Guideline List (9 cols) */}
            <div className="lg:col-span-9 flex flex-col gap-4 min-w-0">
              {/* Search & Mobile Dropdown Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1 min-w-0">
                  <Search
                    className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C25934] dark:text-orange-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    placeholder="Search guidelines, PICO recommendations, trials, topics..."
                    aria-label="Search guidelines, trials, topics"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full min-h-[40px] pl-10 pr-9 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)] hover:border-stone-400 focus:outline-none focus:border-[#C25934] transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex lg:hidden flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                  <CustomSelect
                    value={selectedSubspecialty}
                    onChange={(val) => setSelectedSubspecialty(val as SubspecialtyType)}
                    options={NEUROLOGY_SUBSPECIALTIES.map((sub) => ({ value: sub, label: sub }))}
                    ariaLabel="Filter by subspecialty"
                    darkMode={darkMode}
                    accent="amber"
                    align="left"
                    compact={true}
                    className="flex-1 sm:flex-initial"
                    icon={
                      <Layers
                        className="w-4 h-4 text-[#C25934] dark:text-orange-400"
                        aria-hidden="true"
                      />
                    }
                  />

                  <CustomSelect
                    value={selectedSocietyFilter}
                    onChange={setSelectedSocietyFilter}
                    options={availableSocieties.map((soc) => ({
                      value: soc,
                      label: soc === "ALL" ? "All Societies" : soc,
                    }))}
                    ariaLabel="Filter by society"
                    darkMode={darkMode}
                    accent="amber"
                    align="right"
                    compact={true}
                    className="flex-1 sm:flex-initial"
                    icon={
                      <Building2
                        className="w-4 h-4 text-[#C25934] dark:text-orange-400"
                        aria-hidden="true"
                      />
                    }
                  />
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
            {isInitialLoading && guidelineDocs.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70 animate-pulse">
                <span className="text-3xl block mb-2">📚</span>
                <h3 className="text-sm font-bold text-[var(--text-ink)]">
                  Đang đồng bộ thư viện Guideline lâm sàng...
                </h3>
              </div>
            ) : filteredGuidelines.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70">
                <span className="text-3xl block mb-2">🔍</span>
                <h3 className="text-sm font-bold text-[var(--text-ink)]">
                  No guidelines match &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Try searching for &ldquo;Tenecteplase&rdquo;, &ldquo;Thrombectomy&rdquo;, &ldquo;Blood Pressure&rdquo;, or &ldquo;AHA&rdquo;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSocietyFilter("ALL");
                    setSelectedSubspecialty("All Subspecialties");
                  }}
                  className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C25934] text-white hover:bg-[#A64827] transition-colors"
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
                      className="p-3.5 sm:p-5 cursor-pointer select-none"
                    >
                      {/* Meta Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10.5px] sm:text-[11px] font-black tracking-wider uppercase border ${theme.badge}`}
                          >
                            {doc.society} {doc.year}
                          </span>
                          <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)]">
                            {doc.documentType} • {doc.journalTarget}
                          </span>
                          {doc.fullTextStatus !== "FULL_TEXT_PARSED" && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9.5px] sm:text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
                              Abstract
                            </span>
                          )}
                          {doc.pmcid && (
                            <span className="text-[10.5px] sm:text-[11px] font-mono text-[var(--text-muted)]">
                              {doc.pmcid}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                          <span className="text-[11px] sm:text-xs font-medium text-[var(--text-muted)]">
                            Published: {doc.publishDate}
                          </span>
                          {isAdminVerified && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDocId(doc.id);
                                  setEditingGuidelineDoc(doc);
                                  setEditingPracticeChange(null);
                                  setShowEditModal(true);
                                }}
                                className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#C25934]/10 text-[#C25934] dark:text-orange-400 hover:bg-[#C25934]/20 border border-[#C25934]/30 flex items-center gap-1 cursor-pointer transition-colors"
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
                                className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                                title="Delete guideline"
                              >
                                <span>{deleteLoadingId === doc.id ? "..." : "🗑️"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm sm:text-lg font-bold leading-snug text-[var(--text-ink)]">
                        {cleanGuidelineTitle(doc.title)}
                      </h3>

                      {/* Bottom Prompt Bar: Changes Badge + Click Indicator */}
                      <div className="mt-2.5 sm:mt-3 flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-hairline)]">
                        <span className="text-[11px] sm:text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                          <span>📋</span>
                          <span>
                            {doc.society?.toUpperCase().includes("ESO")
                              ? (() => {
                                  const picos = groupPracticeChangesIntoEsoPicos(
                                    doc.allPracticeChanges || [],
                                    doc.title,
                                    doc.id
                                  );
                                  const totalRecs = picos.reduce((s, p) => s + p.recommendations.length, 0);
                                  return `${picos.length} PICO (${totalRecs} khuyến cáo)`;
                                })()
                              : `${doc.allPracticeChanges.length} Key Practice Changes`}
                          </span>
                        </span>

                        <span className="text-[11px] sm:text-xs font-bold text-[#C25934] dark:text-orange-400 flex items-center gap-1">
                          <span>
                            {isExpanded
                              ? "Collapse ▴"
                              : "Details ▾"}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* EXPANDED SECTION: Detailed information revealed only upon click */}
                    {isExpanded && (
                      <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/35">
                        {/* All Practice Changes List */}
                        {(() => {
                          const newPracticeChanges = doc.allPracticeChanges.filter(
                            (c) =>
                              (c.changeType === "NEW" ||
                                c.changeType === "UPGRADED" ||
                                c.changeType === "DOWNGRADED" ||
                                c.changeType === "REVISED") &&
                              (Boolean(c.previousGrade) ||
                                Boolean(c.previousText) ||
                                Boolean((c as any).isWhatIsNew) ||
                                Boolean((c as any).isHighImpact))
                          );

                          const categories = Array.from(
                            new Set(doc.allPracticeChanges.map((c) => c.category || "General Recommendations"))
                          );

                          return (
                            <div className="space-y-4 sm:space-y-6 mb-4">
                              {/* 0. Top Take-Home Messages */}
                              {Boolean(
                                doc.topTakeaways &&
                                doc.topTakeaways.length > 0 &&
                                !doc.topTakeawaysSynthetic &&
                                !doc.topTakeaways.some((t) => /^\d+\.\s*\[.*-\s*(?:Class|GRADE|COR)/i.test(t))
                              ) && (() => {
                                const takeaways = doc.topTakeaways || [];
                                const isTakeawaysExpanded = Boolean(expandedTakeaways[doc.id]);
                                const displayedTakeaways = (isTakeawaysExpanded || takeaways.length <= 3)
                                  ? takeaways
                                  : takeaways.slice(0, 3);

                                return (
                                  <div className="p-3.5 sm:p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-2.5 sm:space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-black bg-[#C25934]/15 text-[#C25934] dark:text-orange-300 border border-[#C25934]/30">
                                          🌟 TOP TAKE-HOME MESSAGES
                                        </span>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
                                      {displayedTakeaways.map((takeaway, tIdx) => (
                                        <div
                                          key={tIdx}
                                          className="flex items-start gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-paper)] p-2.5 sm:p-3 rounded-lg border border-[var(--border-hairline)] leading-relaxed hover:border-[#C25934]/50 transition-all"
                                        >
                                          <span className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-[#C25934]/15 text-[#C25934] dark:text-orange-300 font-black text-[10.5px]">
                                            {tIdx + 1}
                                          </span>
                                          <span className="flex-1 whitespace-pre-line">{takeaway.replace(/^\d+\.\s*/, "")}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {takeaways.length > 3 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleTakeaways(doc.id)}
                                        className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-[#C25934] dark:text-orange-400 bg-[#C25934]/10 hover:bg-[#C25934]/15 border border-[#C25934]/25 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                      >
                                        <span>{isTakeawaysExpanded ? "Thu gọn thông điệp ▴" : `Xem đầy đủ ${takeaways.length} thông điệp lâm sàng ▾`}</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* 1. What is new vs previous edition */}
                              {newPracticeChanges.length > 0 && !doc.society?.toUpperCase().includes("ESO") && (
                                <div className="space-y-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[10.5px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                      ⚡ 1. WHAT IS NEW &amp; HIGH IMPACT CHANGES
                                    </span>
                                    <span className="text-[11px] font-bold text-[var(--text-muted)]">
                                      ({newPracticeChanges.length} practice changes vs. {doc.previousVersionYear || "prior"}):
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 gap-2.5">
                                    {newPracticeChanges.map((change) => (
                                      <div
                                        key={change.id}
                                        className="p-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs leading-relaxed transition-all"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span
                                              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                                change.changeType === "UPGRADED"
                                                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                                  : change.changeType === "NEW"
                                                  ? "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                                                  : change.changeType === "DOWNGRADED"
                                                  ? "bg-rose-500/20 text-rose-700 dark:text-rose-400"
                                                  : "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                              }`}
                                            >
                                              {change.changeType}
                                            </span>
                                            <span className="font-bold text-[var(--text-ink)] text-xs sm:text-sm">{change.topic}</span>
                                          </div>

                                          <div className="flex items-center gap-2 text-[11px] pl-1 sm:pl-0">
                                            {change.previousGrade && (
                                              <span className="text-[var(--text-muted)] line-through">
                                                {change.previousGrade}
                                              </span>
                                            )}
                                            <span className="font-extrabold text-[#C25934] dark:text-orange-400">
                                              ➔ {change.currentGrade}
                                            </span>
                                          </div>
                                        </div>

                                        {change.previousText && (
                                          <div className="mb-2 p-2 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[11px] border border-[var(--border-hairline)]">
                                            <span className="font-bold block text-[var(--text-muted)] mb-0.5">
                                              Previous Edition ({doc.previousVersionYear || "prior"}):
                                            </span>
                                            <p className="line-through opacity-85 whitespace-pre-line">{change.previousText}</p>
                                          </div>
                                        )}

                                        <p className="text-[var(--text-ink)] font-medium whitespace-pre-line">
                                          {change.currentText}
                                        </p>

                                        {change.drivingTrials && change.drivingTrials.length > 0 && (
                                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px] text-[var(--text-muted)] border-t pt-1.5 border-[var(--border-hairline)]">
                                            <span className="font-semibold">
                                              Driving Evidence:
                                            </span>
                                            <span className="font-medium text-[var(--text-secondary)]">
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
                              <div className="space-y-3 pt-3 border-t border-[var(--border-hairline)]">
                                <GuidelinePresentationRenderer
                                  doc={doc}
                                  darkMode={darkMode}
                                  allowEdit={isAdminVerified}
                                  onEditChange={(item) => {
                                    setEditingDocId(doc.id);
                                    setEditingGuidelineDoc(doc);
                                    setEditingPracticeChange(item);
                                    setShowEditModal(true);
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })()}

                        {/* Action Bar */}
                        <div className="pt-3 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={doc.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-[var(--text-muted)] hover:text-[#C25934] flex items-center gap-1"
                          >
                            <span>
                              {`Read original article on ${doc.journalTarget}`}
                            </span>
                            <span>↗</span>
                          </a>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleGuideline(doc.id)}
                              className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-ink)]"
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
          </div>
        )}

        {/* =========================================================================
            TAB 2: CONFERENCES & LATE-BREAKING TRIALS (Distinct theme colors, details on click)
           ========================================================================= */}
        {activeTab === "conf" && (
          <div className="space-y-4">
            {/* Search & Dropdown Filters (Subspecialty, Status) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 min-w-0">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C25934] dark:text-orange-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  placeholder="Search conferences, trials..."
                  aria-label="Search conferences, trials"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-[40px] pl-10 pr-9 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)] hover:border-stone-400 focus:outline-none focus:border-[#C25934] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                    title="Clear search"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                <CustomSelect
                  value={selectedSubspecialty}
                  onChange={(val) => setSelectedSubspecialty(val as SubspecialtyType)}
                  options={NEUROLOGY_SUBSPECIALTIES.map((sub) => ({ value: sub, label: sub }))}
                  ariaLabel="Filter by subspecialty"
                  darkMode={darkMode}
                  accent="amber"
                  align="left"
                  compact={true}
                  className="flex-1 sm:flex-initial"
                  icon={
                    <Layers
                      className="w-4 h-4 text-[#C25934] dark:text-orange-400"
                      aria-hidden="true"
                    />
                  }
                />

                <CustomSelect
                  value={selectedConfStatus}
                  onChange={(val) =>
                    setSelectedConfStatus(val as "ALL" | "LIVE" | "RECENT" | "UPCOMING")
                  }
                  options={[
                    { value: "ALL", label: "All Events" },
                    { value: "LIVE", label: "🔴 LIVE" },
                    { value: "RECENT", label: "🟡 Recent" },
                    { value: "UPCOMING", label: "⚪ Upcoming" },
                  ]}
                  ariaLabel="Filter by conference status"
                  darkMode={darkMode}
                  accent="amber"
                  align="right"
                  compact={true}
                  className="flex-1 sm:flex-initial"
                  icon={
                    <Radio
                      className="w-4 h-4 text-[#C25934] dark:text-orange-400"
                      aria-hidden="true"
                    />
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="text-xs text-[var(--text-muted)] font-medium">
                {filteredConferences.length} Major Conferences Monitored
              </div>
              {isAdminVerified && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingConference(null);
                    setShowConferenceModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#C25934] text-white hover:bg-[#A64827] transition-colors cursor-pointer"
                >
                  + Add Conference
                </button>
              )}
            </div>

            {/* Conference Cards List (Colored by Status, Click to Expand Details) */}
            {filteredConferences.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)]/70">
                <span className="text-3xl block mb-2">{conferences.length === 0 ? "🎙️" : "🔍"}</span>
                <h3 className="text-sm font-bold text-[var(--text-ink)]">
                  {conferences.length === 0
                    ? "No conferences available yet"
                    : `No conferences or trials match "${searchQuery}"`}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {conferences.length === 0
                    ? "Dữ liệu hội nghị đã được làm sạch. Admin có thể thêm hội nghị đã xác thực khi cần."
                    : "Try adjusting your search query or status filter."}
                </p>
                {conferences.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedConfStatus("ALL");
                      setSelectedSubspecialty("All Subspecialties");
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#C25934] text-white hover:bg-[#A64827] transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
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
                          <span className="text-xs text-[var(--text-muted)] font-medium">
                            {conf.dates} • {conf.location}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {conf.officialUrl && (
                            <a
                              href={conf.officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs font-bold text-[#C25934] dark:text-orange-400 hover:underline flex items-center gap-1"
                            >
                              <span>Official Website</span>
                              <span>↗</span>
                            </a>
                          )}
                          {isAdminVerified && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingConference(conf);
                                  setShowConferenceModal(true);
                                }}
                                className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-[#C25934]/10 text-[#C25934] dark:text-orange-400 hover:bg-[#C25934]/20 border border-[#C25934]/30 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Edit conference"
                              >
                                <span>✏️ Edit</span>
                              </button>
                              <button
                                type="button"
                                disabled={deleteConfLoadingId === conf.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteConference(conf);
                                }}
                                className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                                title="Delete conference"
                              >
                                <span>{deleteConfLoadingId === conf.id ? "..." : "🗑️"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold leading-snug text-[var(--text-ink)]">
                        {conf.name}
                      </h3>

                      {/* Bottom Prompt Bar: Stats Pill + Click Indicator */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-hairline)]">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="font-bold text-[var(--text-secondary)]">
                            {conf.stats.totalLateBreakingTrials} Late-Breaking Trials
                          </span>
                          <span className="text-[var(--border-hairline)]">•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {conf.stats.positiveTrials} Positive
                          </span>
                          <span className="text-[var(--border-hairline)]">•</span>
                          <span className="font-semibold text-[#C25934] dark:text-orange-400">
                            {conf.stats.practiceChangingCount} ⚡ Practice-Changing
                          </span>
                        </div>

                        <span className="text-xs font-bold text-[#C25934] dark:text-orange-400 flex items-center gap-1">
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
                      <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/35">
                        {/* Executive Summary */}
                        <div className="mb-4">
                          <span className="text-[10.5px] font-black uppercase tracking-wider text-[var(--text-muted)] block mb-1">
                            Conference Intelligence Summary:
                          </span>
                          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-hairline)]">
                            {conf.executiveSummary}
                          </p>
                        </div>

                        {/* Trials Grid */}
                        <div className="space-y-3">
                          <span className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] block">
                            Podium Trial Presentations ({conf.lateBreakingTrials.length}):
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {conf.lateBreakingTrials.map((tr) => (
                              <div
                                key={tr.id}
                                className="p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-base font-black text-[#C25934] dark:text-orange-400">
                                      {tr.trialAcronym}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
                                        {tr.studyDesign}
                                      </span>
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                                        {tr.verdict}
                                      </span>
                                    </div>
                                  </div>

                                  <h5 className="text-xs sm:text-sm font-bold text-[var(--text-ink)] mb-2">
                                    {tr.title}
                                  </h5>

                                  <div className="space-y-1.5 text-xs text-[var(--text-secondary)] mb-3">
                                    <div>
                                      <span className="font-bold text-[var(--text-muted)]">Population (P):</span>{" "}
                                      {tr.populationSummary}
                                    </div>
                                    <div>
                                      <span className="font-bold text-[var(--text-muted)]">Intervention vs. Control:</span>{" "}
                                      {tr.interventionGroup} vs {tr.controlGroup}
                                    </div>
                                    <div className="p-2 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-hairline)] text-[11px] font-semibold text-[var(--text-ink)]">
                                      🎯 {tr.primaryOutcome}
                                    </div>
                                    <div className="text-[11px] text-[var(--text-muted)]">
                                      🛡️ {tr.safetyOutcome}
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2.5 border-t border-[var(--border-hairline)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="text-[11px] sm:text-xs text-[#C25934] dark:text-orange-400 font-bold leading-relaxed">
                                    💡 {tr.bottomLineTakeaway}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    {tr.fullTextUrl && (
                                      <a
                                        href={tr.fullTextUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10.5px] font-bold text-[var(--text-muted)] hover:text-[#C25934] hover:underline flex items-center gap-0.5"
                                      >
                                        <span>Paper</span>
                                        <span>↗</span>
                                      </a>
                                    )}
                                    {isAdminVerified && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteConferenceTrial(conf, tr.id, tr.trialAcronym)}
                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer"
                                        title="Delete trial from conference"
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-4 pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between">
                          <a
                            href={conf.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[#C25934] dark:text-orange-400 hover:underline flex items-center gap-1"
                          >
                            <span>Official Supplement / Abstracts</span>
                            <span>↗</span>
                          </a>

                          <button
                            onClick={() => toggleConference(conf.id)}
                            className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-ink)]"
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
            TAB 3: CLINICAL NAVIGATOR (100% English Ontology-Driven Synthesis)
           ========================================================================= */}
        {activeTab === "navigator" && (
          <ClinicalNavigatorTab
            guidelines={guidelineDocs}
            recommendationAtoms={recommendationAtoms}
            conferences={conferences}
            pivotalTrials={pivotalTrials}
            customRecLabels={customRecLabels}
            deletedTrialIds={deletedTrialIds}
            neuroPulseArticles={neuroPulseArticles}
            isAdminVerified={isAdminVerified}
            initialPresetOrQuery={navigatorSeedQuery}
            onPivotalTrialsUpdated={(updated) => setPivotalTrials(updated)}
          />
        )}

        {/* =========================================================================
            REVIEW QUEUE: Migrated to Admin Command Center
           ========================================================================= */}
        {activeTab === "review" && (
          <div className="p-8 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-ink)] shadow-2xs text-center max-w-lg mx-auto my-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#C25934]/10 flex items-center justify-center text-2xl">
              🛡️
            </div>
            <h3 className="text-base font-bold mb-1 text-[var(--text-ink)]">Kiểm duyệt đã được hợp nhất vào Admin Command Center</h3>
            <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">
              Toàn bộ tính năng kiểm duyệt hướng dẫn lâm sàng (Review Queue), trích xuất AI Full-text, và nhập liệu NotebookLM đã được chuyển sang Trung tâm Chỉ huy Quản trị (Admin Command Center) để quản lý tập trung.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setActiveTab("guidelines")}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-ink)] transition-all cursor-pointer"
              >
                ← Về Practice Guidelines
              </button>
              <Link
                href="/admin"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C25934] hover:bg-[#A64827] text-white shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>Mở Admin Review Queue</span>
                <span>→</span>
              </Link>
            </div>
          </div>
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
          existingGuidelines={guidelineDocs}
          onSuccess={(newDoc) => {
            setGuidelineDocs((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
            setExpandedGuidelineIds((prev) => ({ ...prev, [newDoc.id]: true }));
            setSelectedSocietyFilter("ALL");
            setSyncMessage(
              `🎉 Successfully generated and saved Practice Guideline "${newDoc.title}" (${newDoc.allPracticeChanges.length} recommendations)!`
            );
            reloadGuidelines();
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
            adminToken={getStoredAdminToken()}
            syncV2Enabled={isSyncV2}
            blocksByUid={syncState.blocksByUid}
            blocksBySlug={syncState.blocksBySlug}
            protocolsBySlug={syncState.protocolsBySlug}
            onApplyLocalBlockWrite={syncState.applyLocalBlockWrite}
            onSuccess={(updatedDoc) => {
              if (updatedDoc) {
                const normalizeT = (t: string) => (t || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                setGuidelineDocs((prev) => {
                  const matchId = (g: GuidelineDoc) => g.id === updatedDoc.id || (editingDocId && g.id === editingDocId);
                  const matchPrevDoc = (g: GuidelineDoc) => editingGuidelineDoc && (g.id === editingGuidelineDoc.id || normalizeT(g.title) === normalizeT(editingGuidelineDoc.title));
                  const matchTitle = (g: GuidelineDoc) => normalizeT(g.title) === normalizeT(updatedDoc.title);
                  const exists = prev.some((g) => matchId(g) || matchPrevDoc(g) || matchTitle(g));
                  if (exists) {
                    return prev.map((g) => (matchId(g) || matchPrevDoc(g) || matchTitle(g) ? updatedDoc : g));
                  }
                  return [updatedDoc, ...prev];
                });
                setSyncMessage(`✓ Đã lưu thay đổi guideline "${updatedDoc.title}" lên Cloud.`);
              }
              if (isSyncV2) {
                void syncState.refresh();
              }
              reloadGuidelines(true);
            }}
            darkMode={darkMode}
          />
        )}

        {/* EDIT / ADD CONFERENCE MODAL */}
        {isAdminVerified && showConferenceModal && (
          <ConferenceEditModal
            isOpen={showConferenceModal}
            onClose={() => setShowConferenceModal(false)}
            conference={editingConference}
            adminToken={getStoredAdminToken()}
            onSuccess={(updatedConferences, savedConf) => {
              setConferences(updatedConferences);
              updateConferencesCache(updatedConferences);
              setSyncMessage(`✓ Đã lưu thay đổi conference "${savedConf.acronym}" lên Cloud.`);
              reloadGuidelines(true);
            }}
            darkMode={darkMode}
          />
        )}



        {/* =========================================================================
            FOOTER
           ========================================================================= */}
        <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-muted)] mt-12 py-6 text-center text-xs transition-colors">
          <div className="max-w-[1440px] mx-auto space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#C25934] dark:text-orange-400">NEUROGUIDE</span>
                <span>• Part of the Neuro Ecosystem</span>
              </div>
              <div>
                Clinical Practice Guidelines, Consensus Statements &amp; Conference Intelligence Radar
              </div>
            </div>
            <p className="text-[11px] leading-relaxed pt-2 border-t border-[var(--border-hairline)]">
              <span className="font-semibold text-[var(--text-secondary)]">
                Medical Disclaimer:
              </span>{" "}
              {MEDICAL_DISCLAIMER_TEXT}
            </p>
          </div>
        </footer>
      </div>
      </main>
    </ViewTransition>
  );
}
