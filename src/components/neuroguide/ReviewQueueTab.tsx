"use client";

import React, { useState, useEffect, useMemo } from "react";
import { EditGuidelineModal } from "./EditGuidelineModal";
import { AhaGuidelineTable } from "./AhaGuidelineTable";
import { EsoGuidelineTable, type EsoPicoItem, renderGradeQuality, renderGradeStrength } from "./EsoGuidelineTable";
import {
  normalizeEsoStrength,
  comparePicoNumbers,
  isEsoBpGuideline,
  isEsoAsahGuideline,
  getCanonicalEsoPicos,
  convertEsoPicoItemsToPracticeChanges,
  CANONICAL_ESO_2025_BP_PICOS,
  CANONICAL_ESO_2026_ASAH_PICOS,
} from "@/lib/neuroguide/esoPicoGrouper";
import { parseAhaCorAndLoe } from "@/lib/neuroguide/notebooklmParser";
import type { GuidelineDoc, PracticeChangeDetail } from "@/types/neuroguide";

export interface StoredRec {
  rec_id: string;
  guideline_id: string;
  guideline_title: string;
  society: string;
  year?: number;
  grading_system: string;
  page_num: number;
  statement: string;
  approval_status: string;
  category?: string;
  topic?: string;
  cor?: string;
  cor_label?: string;
  loe?: string;
  quality_of_evidence?: string;
  strength_of_recommendation?: string;
  voting?: string;
  pico_id?: string;
  target_population?: string;
  driving_trials?: string[];
  verbatim_quote?: string;
  verification_detail?: {
    status: string;
    grounding_score: number;
    classification_valid: boolean;
    numbers_verified: boolean;
    issues: string[];
  };
}

export interface PendingGuidelineGroup {
  guideline_id: string;
  guideline_title: string;
  society: string;
  year?: number;
  recommendations: StoredRec[];
  categories: {
    name: string;
    items: StoredRec[];
  }[];
}

interface ReviewQueueTabProps {
  darkMode: boolean;
  refreshKey?: number;
  onQueueUpdated?: () => void;
  onQueueCountChange?: (count: number) => void;
  onOpenPipelineModal?: () => void;
  onOpenNotebookLMModal?: () => void;
}

interface ConfirmDialogState {
  isOpen: boolean;
  type: "APPROVE_GUIDELINE" | "REJECT_GUIDELINE" | "APPROVE_ALL" | "PURGE_BLOBS";
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: "emerald" | "rose" | "amber";
  targetGuideline?: PendingGuidelineGroup;
}

/**
 * Transforms stored recommendations into structured ESO PICO questions matching Synoptic Table structure.
 * Automatically aligns with official canonical items when available, preventing content bleed between guidelines.
 */
export function buildEsoPicoItemsFromStoredRecs(recs: StoredRec[], guidelineTitle?: string, guidelineId?: string): EsoPicoItem[] {
  let canonicalList = getCanonicalEsoPicos(guidelineTitle, guidelineId);
  if (!canonicalList && recs && recs.length > 0) {
    const firstRec = recs[0];
    canonicalList = getCanonicalEsoPicos(firstRec.guideline_title, firstRec.guideline_id);
  }

  // If this guideline matches a canonical ESO Synoptic Table (e.g. ESO 2026 aSAH or ESO 2025 BP),
  // use the canonical PICO structure directly so fallback counters never invent extra PICO 1 or PICO 11..42.
  if (canonicalList && canonicalList.length > 0) {
    return canonicalList
      .map((cp) => ({
        ...cp,
        recommendations: cp.recommendations.map((r) => ({
          ...r,
          drivingTrials: r.drivingTrials ? [...r.drivingTrials] : undefined,
        })),
        drivingTrials: cp.drivingTrials ? [...cp.drivingTrials] : undefined,
      }))
      .sort((a, b) => comparePicoNumbers(a.picoNumber, b.picoNumber));
  }

  if (!recs || recs.length === 0) {
    return [];
  }

  const extractExplicitPico = (r: StoredRec): { num: string; question: string } | null => {
    const rawTopic = (r.topic || "").trim();
    const rawCat = (r.category || "").trim();
    const rawPicoId = (r.pico_id || "").trim();
    if (rawPicoId) {
      const matchPico = rawPicoId.match(/^(?:PICO\s*)?(\d+[a-z]?)$/i);
      if (matchPico) {
        return {
          num: matchPico[1],
          question: (r.target_population || rawTopic || rawCat).trim(),
        };
      }
    }
    const matchTopic = rawTopic.match(/^PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
    if (matchTopic) {
      return { num: matchTopic[1], question: matchTopic[2]?.trim() || rawTopic };
    }
    const matchCat = rawCat.match(/^PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
    if (matchCat) {
      return { num: matchCat[1], question: matchCat[2]?.trim() || rawTopic };
    }
    return null;
  };

  const hasExplicitPicos = recs.some((r) => extractExplicitPico(r) !== null);

  const picoMap = new Map<string, EsoPicoItem>();
  let fallbackCounter = 1;

  recs.forEach((r) => {
    const explicit = extractExplicitPico(r);
    // If the document has explicit PICO numbers, ignore unnumbered noise (front-matter summary boxes or stray consensus statements)
    if (hasExplicitPicos && !explicit) {
      return;
    }

    const rawTopic = (r.topic || "").trim();
    const rawCat = (r.category || "").trim();

    const pNum: number | string = explicit ? explicit.num : fallbackCounter++;
    let pQuestion = explicit ? explicit.question : rawTopic || rawCat || `PICO ${pNum}`;

    pQuestion = pQuestion.replace(/^PICO\s*\d+[a-z]?[:.\s-]*/i, "").trim();
    if (!pQuestion) {
      pQuestion = rawTopic.replace(/^PICO\s*\d+[a-z]?[:.\s-]*/i, "").trim() || rawCat;
    }

    if (pQuestion && !pQuestion.endsWith("?") && !pQuestion.endsWith(".")) {
      pQuestion = `${pQuestion}?`;
    }

    const picoKey = `PICO-${String(pNum).toLowerCase()}`;

    const rawStrength = r.strength_of_recommendation || (r as any).strength || (r as any).currentGrade || (r as any).grade;
    const s = normalizeEsoStrength(rawStrength, r.statement);

    let q = r.quality_of_evidence || (r as any).quality;
    if (!q) {
      const rawGrade = (r as any).currentGrade || (r as any).grade || "";
      const lowerG = rawGrade.toLowerCase();
      if (
        lowerG.includes("uncertain") ||
        lowerG.includes("not assessable") ||
        lowerG.includes("ongoing") ||
        lowerG.trim() === "-" ||
        lowerG.trim() === "—" ||
        lowerG.trim() === "–" ||
        lowerG.includes("(–)") ||
        lowerG.includes("(-)")
      ) q = "Uncertain / Ongoing trial";
      else if (lowerG.includes("very low")) q = "Very low";
      else if (lowerG.includes("low") && !lowerG.includes("very")) q = "Low";
      else if (lowerG.includes("high")) q = "High";
      else if (lowerG.includes("moderate")) q = "Moderate";
      else q = "Moderate";
    }

    // Only use consensus_statement if explicitly present and not identical to statement
    const rawConsensus =
      (r as any).consensus_statement ||
      (r as any).expertConsensusStatement ||
      ((r as any).previousText && !(r as any).previousText.startsWith("Driving Evidence:") ? (r as any).previousText : undefined);

    const consensus =
      rawConsensus && rawConsensus.trim() !== (r.statement || "").trim()
        ? rawConsensus.trim()
        : undefined;

    const trials = Array.isArray(r.driving_trials) && r.driving_trials.length > 0
      ? r.driving_trials
      : [];

    const voteStr =
      r.voting ||
      (consensus && consensus.includes("Vote:")
        ? consensus.split("Vote:")[1]?.split(")")[0]?.trim()
          ? `Vote: ${consensus.split("Vote:")[1]?.split(")")[0]?.trim()}`
          : undefined
        : consensus
        ? "Vote: 10/10"
        : undefined);

    if (!picoMap.has(picoKey)) {
      picoMap.set(picoKey, {
        picoNumber: pNum,
        picoQuestion: pQuestion,
        recommendations: [],
        expertConsensusStatement: consensus,
        voting: voteStr,
        drivingTrials: [...trials],
      });
    }

    const entry = picoMap.get(picoKey)!;

    if (!entry.expertConsensusStatement && consensus) {
      entry.expertConsensusStatement = consensus;
      if (!entry.voting) entry.voting = voteStr;
    } else if (consensus && !entry.expertConsensusStatement?.includes(consensus)) {
      entry.expertConsensusStatement = `${entry.expertConsensusStatement}\n\n${consensus}`;
    }

    if (trials.length > 0) {
      const mergedTrials = new Set([...(entry.drivingTrials || []), ...trials]);
      entry.drivingTrials = Array.from(mergedTrials);
    }

    entry.recommendations.push({
      number: entry.recommendations.length + 1,
      statement: r.statement,
      qualityOfEvidence: q,
      strengthOfRecommendation: s,
      drivingTrials: trials,
      expertConsensusStatement: consensus,
      voting: voteStr,
    });
  });

  // If Topic 1 uses sub-questions (1a / 1b), ensure no standalone PICO-1 artifact remains
  if ((picoMap.has("PICO-1a") || picoMap.has("PICO-1b")) && picoMap.has("PICO-1")) {
    picoMap.delete("PICO-1");
  }

  return Array.from(picoMap.values()).sort((a, b) => comparePicoNumbers(a.picoNumber, b.picoNumber));
}

export function ReviewQueueTab({
  darkMode,
  refreshKey,
  onQueueUpdated,
  onQueueCountChange,
  onOpenPipelineModal,
  onOpenNotebookLMModal,
}: ReviewQueueTabProps) {
  const [queue, setQueue] = useState<StoredRec[]>([]);
  const [rawServerCount, setRawServerCount] = useState<number>(0);
  const [rawServerRecs, setRawServerRecs] = useState<StoredRec[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterSociety, setFilterSociety] = useState<string>("ALL");
  const [filterQuality, setFilterQuality] = useState<"ALL" | "HIGH_SCORE" | "HAS_ISSUES">("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Expanded state for guideline cards
  const [expandedGuidelines, setExpandedGuidelines] = useState<Record<string, boolean>>({});
  const [groupViewModes, setGroupViewModes] = useState<Record<string, "table" | "cards">>({});

  // Confirm Dialog State (Replaces native window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    type: "APPROVE_ALL",
    title: "",
    description: "",
    confirmLabel: "",
    confirmColor: "emerald",
  });

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editingDocId, setEditingDocId] = useState<string>("");
  const [editingGuidelineDoc, setEditingGuidelineDoc] = useState<GuidelineDoc | null>(null);
  const [editingPracticeChange, setEditingPracticeChange] = useState<PracticeChangeDetail | null>(null);

  // Read dismissed recommendation IDs from localStorage
  const getAdminToken = (): string => {
    if (typeof window === "undefined") return "";
    return (
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token") ||
      sessionStorage.getItem("adminToken") ||
      localStorage.getItem("adminToken") ||
      ""
    );
  };

  const getDismissedRecIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem("neuroguide_reviewed_rec_ids");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  };

  const markRecsAsReviewedLocally = (recIds: string[]) => {
    try {
      const set = getDismissedRecIds();
      recIds.forEach((id) => set.add(id));
      localStorage.setItem("neuroguide_reviewed_rec_ids", JSON.stringify(Array.from(set)));
    } catch {}
  };

  const handleResetDismissedCache = () => {
    try {
      localStorage.removeItem("neuroguide_reviewed_rec_ids");
    } catch {}
    setQueue(rawServerRecs);
    if (onQueueCountChange) onQueueCountChange(rawServerRecs.length);
    if (onQueueUpdated) onQueueUpdated();
    setFeedbackMessage({
      type: "success",
      text: `🔄 Restored and displayed all ${rawServerRecs.length} pending recommendations from server.`,
    });
  };

  const handlePurgeAllDeleted = async () => {
    setActionLoading("PURGE_ALL");
    try {
      const token = getAdminToken();
      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({ action: "PURGE_ALL_DELETED" }),
      });
      const data = await res.json();
      if (data.ok) {
        try {
          localStorage.removeItem("neuroguide_reviewed_rec_ids");
        } catch {}
        setRawServerCount(0);
        setRawServerRecs([]);
        setQueue([]);
        setFeedbackMessage({
          type: "success",
          text: `🗑️ Successfully purged all deleted guidelines on Cloud and Local!`,
        });
        if (onQueueCountChange) onQueueCountChange(0);
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage({ type: "error", text: data.error || "Could not purge storage." });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Connection error while purging storage." });
    } finally {
      setActionLoading(null);
    }
  };

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/neuroguide/review-queue");
      const data = await res.json();
      if (data.ok && Array.isArray(data.queue)) {
        // Retrieve rejected guideline IDs from localStorage
        const localDeleted: string[] = JSON.parse(localStorage.getItem("neuroguide_deleted_ids") || "[]");
        const deletedSet = new Set(localDeleted.map((x) => x.toLowerCase().trim()));

        // Filter out rejected recommendations
        const nonDeletedRecs = data.queue.filter((r: StoredRec) => {
          const gId = (r.guideline_id || "").toLowerCase().trim();
          return !deletedSet.has(gId);
        });

        const dismissed = getDismissedRecIds();
        const activeQueue = nonDeletedRecs.filter((r: StoredRec) => {
          const status = (r.approval_status || "").toUpperCase();
          return !dismissed.has(r.rec_id) && (status === "PENDING_REVIEW" || status === "PENDING");
        });

        // Count items temporarily dismissed in local browser cache
        const actuallyHidden = nonDeletedRecs.filter((r: StoredRec) => {
          const status = (r.approval_status || "").toUpperCase();
          return dismissed.has(r.rec_id) && (status === "PENDING_REVIEW" || status === "PENDING");
        });

        setRawServerCount(actuallyHidden.length);
        setRawServerRecs(nonDeletedRecs);
        setQueue(activeQueue);
        if (onQueueCountChange) {
          onQueueCountChange(activeQueue.length);
        }
      }
    } catch (err) {
      console.warn("Could not fetch review queue:", err);
      setFeedbackMessage({ type: "error", text: "Could not connect to server to load review queue." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [refreshKey]);

  // Compute society statistics for filter chips
  const societyCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: queue.length };
    queue.forEach((r) => {
      const soc = (r.society || "OTHER").toUpperCase();
      let key = "OTHER";
      if (soc.includes("AHA") || soc.includes("ASA")) key = "AHA";
      else if (soc.includes("ESO")) key = "ESO";
      else if (soc.includes("AAN")) key = "AAN";
      else if (soc.includes("ILAE")) key = "ILAE";
      else if (soc.includes("NCS")) key = "NCS";

      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [queue]);

  // Compute average AI grounding score
  const avgGroundingScore = useMemo(() => {
    if (queue.length === 0) return 96;
    let total = 0;
    let count = 0;
    queue.forEach((r) => {
      if (r.verification_detail?.grounding_score) {
        total += r.verification_detail.grounding_score;
        count++;
      }
    });
    return count > 0 ? Math.round(total / count) : 96;
  }, [queue]);

  // Group recommendations by Guideline ID and within Guideline by Category
  const guidelineGroups = useMemo(() => {
    const map = new Map<string, PendingGuidelineGroup>();
    const query = searchQuery.trim().toLowerCase();

    queue.forEach((rec) => {
      // 1. Society Filter
      if (filterSociety !== "ALL") {
        const normSoc = (rec.society || "").toUpperCase();
        if (filterSociety === "AHA" && !(normSoc.includes("AHA") || normSoc.includes("ASA"))) return;
        if (filterSociety === "ESO" && !normSoc.includes("ESO")) return;
        if (filterSociety === "AAN" && !normSoc.includes("AAN")) return;
        if (filterSociety === "ILAE" && !normSoc.includes("ILAE")) return;
        if (filterSociety === "NCS" && !normSoc.includes("NCS")) return;
        if (filterSociety === "OTHER" && (normSoc.includes("AHA") || normSoc.includes("ESO") || normSoc.includes("AAN") || normSoc.includes("ILAE") || normSoc.includes("NCS"))) return;
      }

      // 2. AI Quality Filter
      if (filterQuality === "HIGH_SCORE") {
        const score = rec.verification_detail?.grounding_score ?? 95;
        if (score < 90) return;
      } else if (filterQuality === "HAS_ISSUES") {
        const issues = rec.verification_detail?.issues ?? [];
        if (issues.length === 0) return;
      }

      // 3. Search Query Filter
      if (query) {
        const matchTitle = (rec.guideline_title || "").toLowerCase().includes(query);
        const matchStatement = (rec.statement || "").toLowerCase().includes(query);
        const matchCategory = (rec.category || "").toLowerCase().includes(query);
        const matchTopic = (rec.topic || "").toLowerCase().includes(query);
        const matchTrials = (rec.driving_trials || []).some((t) => t.toLowerCase().includes(query));
        if (!matchTitle && !matchStatement && !matchCategory && !matchTopic && !matchTrials) {
          return;
        }
      }

      const gId = rec.guideline_id || "unknown";
      if (!map.has(gId)) {
        const isDocEso =
          (rec.society || "").toUpperCase().includes("ESO") ||
          (rec.guideline_title || "").toUpperCase().includes("ESO") ||
          (rec.guideline_title || "").toLowerCase().includes("blood pressure management in acute") ||
          (rec.guideline_title || "").toLowerCase().includes("european stroke") ||
          gId.toLowerCase().includes("eso");

        map.set(gId, {
          guideline_id: gId,
          guideline_title: rec.guideline_title || gId,
          society: isDocEso ? "ESO" : (rec.society || "General"),
          year: rec.year || 2025,
          recommendations: [],
          categories: [],
        });
      }

      map.get(gId)!.recommendations.push(rec);
    });

    const result = Array.from(map.values());

    result.forEach((group) => {
      const catMap = new Map<string, StoredRec[]>();
      group.recommendations.forEach((r) => {
        const catName = r.category || "General Recommendations";
        if (!catMap.has(catName)) {
          catMap.set(catName, []);
        }
        catMap.get(catName)!.push(r);
      });

      group.categories = Array.from(catMap.entries()).map(([name, items]) => ({
        name,
        items,
      }));
    });

    // Sort guidelines: Year descending -> Society ascending
    result.sort((a, b) => {
      const yA = a.year || 2024;
      const yB = b.year || 2024;
      if (yB !== yA) return yB - yA;
      return (a.society || "").localeCompare(b.society || "");
    });

    return result;
  }, [queue, filterSociety, filterQuality, searchQuery]);

  const toggleGuidelineExpand = (gId: string) => {
    setExpandedGuidelines((prev) => ({
      ...prev,
      [gId]: prev[gId] === false ? true : false,
    }));
  };

  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    guidelineGroups.forEach((g) => {
      next[g.guideline_id] = true;
    });
    setExpandedGuidelines(next);
  };

  const handleCollapseAll = () => {
    const next: Record<string, boolean> = {};
    guidelineGroups.forEach((g) => {
      next[g.guideline_id] = false;
    });
    setExpandedGuidelines(next);
  };

  // Execution handlers called after confirmation dialog approval
  const executeApproveGuideline = async (group: PendingGuidelineGroup) => {
    setActionLoading(group.guideline_id);
    setFeedbackMessage(null);

    try {
      const token = getAdminToken();
      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({
          action: "APPROVE_GUIDELINE",
          guideline_id: group.guideline_id,
          reviewer: "Attending Neurologist",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        markRecsAsReviewedLocally(group.recommendations.map((r) => r.rec_id));
        // Clear ID and Title from deleted_ids to show immediately in Practice Guidelines
        try {
          const localDel: string[] = JSON.parse(localStorage.getItem("neuroguide_deleted_ids") || "[]");
          const targetIds = new Set([group.guideline_id.toLowerCase()]);
          group.recommendations.forEach((r) => targetIds.add(r.guideline_id.toLowerCase()));
          const normTitle = group.guideline_title.toLowerCase().replace(/[^a-z0-9]/g, "");
          const filteredDel = localDel.filter((x) => !targetIds.has(x.toLowerCase()) && x.toLowerCase() !== normTitle);
          localStorage.setItem("neuroguide_deleted_ids", JSON.stringify(filteredDel));
          localStorage.removeItem("neuroguide_cached_guidelines");
          localStorage.removeItem("neuroguide_swr_store_v2");
        } catch {}
        setFeedbackMessage({
          type: "success",
          text: `✅ Approved and published Guideline "${group.guideline_title}" (${group.recommendations.length} recommendations) to Clinical Practice Guidelines!`,
        });
        setQueue((prev) => prev.filter((r) => r.guideline_id !== group.guideline_id));
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage({
          type: "error",
          text: `⚠️ ${data.error || "An error occurred while approving the guideline."}`,
        });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "⚠️ Network error while approving guideline." });
    } finally {
      setActionLoading(null);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const executeRejectGuideline = async (group: PendingGuidelineGroup) => {
    setActionLoading(group.guideline_id);
    setFeedbackMessage(null);

    try {
      const token = getAdminToken();
      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({
          action: "REJECT_GUIDELINE",
          guideline_id: group.guideline_id,
          title: group.guideline_title,
          reviewer: "Attending Neurologist",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        // Update neuroguide_deleted_ids locally
        try {
          const localDel: string[] = JSON.parse(localStorage.getItem("neuroguide_deleted_ids") || "[]");
          localDel.push(group.guideline_id.toLowerCase().trim());
          if (Array.isArray(data.deleted_guideline_ids)) {
            data.deleted_guideline_ids.forEach((id: string) => localDel.push(id.toLowerCase().trim()));
          }
          localStorage.setItem("neuroguide_deleted_ids", JSON.stringify(Array.from(new Set(localDel))));

          const targetRecIds = new Set(group.recommendations.map((r) => r.rec_id));
          const currentDismissed = getDismissedRecIds();
          targetRecIds.forEach((id) => currentDismissed.delete(id));
          localStorage.setItem("neuroguide_reviewed_rec_ids", JSON.stringify(Array.from(currentDismissed)));
        } catch {}

        setFeedbackMessage({
          type: "info",
          text: `❌ Rejected and removed Guideline "${group.guideline_title}" from review queue.`,
        });
        setQueue((prev) => {
          const next = prev.filter((r) => r.guideline_id !== group.guideline_id);
          if (onQueueCountChange) onQueueCountChange(next.length);
          return next;
        });
        setRawServerRecs((prev) => prev.filter((r) => r.guideline_id !== group.guideline_id));
        setRawServerCount(0);
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage({
          type: "error",
          text: `⚠️ ${data.error || "An error occurred while rejecting the guideline."}`,
        });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "⚠️ Network error while rejecting the guideline." });
    } finally {
      setActionLoading(null);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const executeApproveAll = async () => {
    if (queue.length === 0) return;
    setActionLoading("ALL");
    setFeedbackMessage(null);

    try {
      const token = getAdminToken();
      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({
          action: "APPROVE_ALL",
          reviewer: "Attending Neurologist",
        }),
      });

      const data = await res.json();
      if (data.ok) {
        markRecsAsReviewedLocally(queue.map((r) => r.rec_id));
        // Clear all approved guidelines from neuroguide_deleted_ids
        try {
          const localDel: string[] = JSON.parse(localStorage.getItem("neuroguide_deleted_ids") || "[]");
          const targetIds = new Set(queue.map((r) => r.guideline_id.toLowerCase()));
          const normTitles = new Set(queue.map((r) => (r.guideline_title || "").toLowerCase().replace(/[^a-z0-9]/g, "")));
          const filteredDel = localDel.filter((x) => !targetIds.has(x.toLowerCase()) && !normTitles.has(x.toLowerCase()));
          localStorage.setItem("neuroguide_deleted_ids", JSON.stringify(filteredDel));
          localStorage.removeItem("neuroguide_cached_guidelines");
          localStorage.removeItem("neuroguide_swr_store_v2");
        } catch {}
        setFeedbackMessage({
          type: "success",
          text: `✅ ${data.message || `Successfully approved all ${queue.length} recommendations to the official guidelines repository!`}`,
        });
        setQueue([]);
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage({
          type: "error",
          text: `⚠️ ${data.error || "An error occurred while approving all recommendations."}`,
        });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "⚠️ Network error while bulk approving recommendations." });
    } finally {
      setActionLoading(null);
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleDeleteSingleRecommendation = async (rec: StoredRec) => {
    const confirm = window.confirm(
      `Are you sure you want to delete this recommendation from the review queue?\n\n"${rec.statement?.slice(0, 120)}..."`
    );
    if (!confirm) return;

    setActionLoading(rec.rec_id);
    try {
      const token = getAdminToken();
      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-admin-token": token } : {}),
        },
        body: JSON.stringify({
          action: "DELETE_RECOMMENDATION",
          guideline_id: rec.guideline_id,
          rec_id: rec.rec_id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        try {
          const currentDismissed = getDismissedRecIds();
          currentDismissed.delete(rec.rec_id);
          localStorage.setItem("neuroguide_reviewed_rec_ids", JSON.stringify(Array.from(currentDismissed)));
        } catch {}
        setQueue((prev) => prev.filter((r) => r.rec_id !== rec.rec_id));
        setRawServerRecs((prev) => prev.filter((r) => r.rec_id !== rec.rec_id));
        setFeedbackMessage({
          type: "success",
          text: `🗑️ Successfully deleted 1 recommendation.`,
        });
        if (onQueueUpdated) onQueueUpdated();
      } else {
        setFeedbackMessage({ type: "error", text: data.error || "Could not delete recommendation." });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "Connection error while deleting recommendation." });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCleanupPdfs = async () => {
    setCleanupLoading(true);
    setFeedbackMessage(null);
    try {
      const adminToken =
        sessionStorage.getItem("neurocase_admin_token") ||
        localStorage.getItem("neurocase_admin_token") ||
        "";
      const res = await fetch("/api/neuroguide/cleanup-blob", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
      });
      const data = await res.json();
      if (data.ok) {
        setFeedbackMessage({ type: "success", text: `🧹 ${data.message}` });
      } else {
        setFeedbackMessage({ type: "error", text: `⚠️ ${data.error || "Error cleaning up Vercel Blob storage."}` });
      }
    } catch {
      setFeedbackMessage({ type: "error", text: "⚠️ Network error while cleaning up Vercel Blob storage." });
    } finally {
      setCleanupLoading(false);
    }
  };

  const handleOpenEditGuideline = (group: PendingGuidelineGroup) => {
    const societyUpper = (group.society || "").toUpperCase();
    const titleUpper = (group.guideline_title || "").toUpperCase();
    const isAha =
      societyUpper.includes("AHA") ||
      societyUpper.includes("ACC") ||
      societyUpper.includes("ASA") ||
      titleUpper.includes("AHA") ||
      titleUpper.includes("ACC") ||
      group.recommendations.some((r) => r.grading_system === "ACC/AHA" || Boolean(r.cor));

    const isDocEso =
      !isAha &&
      (societyUpper.includes("ESO") ||
        titleUpper.includes("ESO") ||
        (group.guideline_id || "").toLowerCase().includes("eso") ||
        group.recommendations.some((r) => r.grading_system === "GRADE" || Boolean(r.pico_id)));

    const canonicalList = getCanonicalEsoPicos(group.guideline_title, group.guideline_id);

    const allItems: PracticeChangeDetail[] =
      isDocEso && canonicalList
        ? convertEsoPicoItemsToPracticeChanges(
            canonicalList,
            isEsoBpGuideline(group.guideline_title, group.guideline_id)
              ? "Blood Pressure"
              : isEsoAsahGuideline(group.guideline_title, group.guideline_id)
              ? "Aneurysmal Subarachnoid Haemorrhage"
              : "ESO Synoptic Table Recommendation"
          )
        : group.recommendations.map((r, idx) => {
            let pNum: string | undefined;
            let pQuestion: string | undefined;
            if (r.pico_id) {
              const m = String(r.pico_id).match(/(\d+[a-z]?)/i);
              pNum = m ? m[0] : String(r.pico_id);
              pQuestion = r.target_population || r.topic;
            } else if (r.topic) {
              const m = String(r.topic).match(/PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
              if (m) {
                pNum = m[1];
                pQuestion = m[2]?.trim();
              }
            }

            const s = normalizeEsoStrength(r.strength_of_recommendation || (r as any).strength || (r as any).currentGrade, r.statement);
            const q = r.quality_of_evidence || (r as any).quality || "Moderate";

            let currentGrade = "Standard Clinical Practice";
            if (isDocEso) {
              currentGrade = `GRADE ${s} (Evidence: ${q}${r.voting ? `, Voting: ${r.voting}` : ""})`;
            } else if (r.cor) {
              const cleanCor = String(r.cor).replace(/^Class\s*/i, "").trim();
              const cleanLoe = String(r.loe || "").replace(/^Level\s*/i, "").trim();
              currentGrade = `Class ${cleanCor}${cleanLoe ? `, Level ${cleanLoe}` : ""}`;
            } else {
              const parsed = parseAhaCorAndLoe((r as any).currentGrade || (r as any).grade || "");
              currentGrade = parsed.formatted;
              if (!r.cor) r.cor = parsed.cor;
              if (!r.loe) r.loe = parsed.loe;
            }

            const finalConsensus =
              (r as any).consensus_statement ||
              (r as any).expertConsensusStatement;

            const finalPicoQuestion = pQuestion || r.topic;

            return {
              id: r.rec_id || `rec-${idx + 1}`,
              topic: r.topic || r.target_population || (isDocEso ? `PICO ${pNum || idx + 1}: Clinical Question` : `Recommendation #${idx + 1}`),
              currentGrade,
              cor: r.cor,
              loe: r.loe,
              currentText: r.statement,
              category: r.category || "General Recommendations",
              drivingTrials: r.driving_trials || [],
              changeType: "NEW",
              quality: isDocEso ? q : undefined,
              strength: isDocEso ? s : undefined,
              expertConsensusStatement: finalConsensus,
              voting: isDocEso ? r.voting : undefined,
              picoNumber: pNum || `${idx + 1}`,
              picoQuestion: finalPicoQuestion,
            };
          });

    const docMeta: GuidelineDoc = {
      id: group.guideline_id,
      society: isDocEso ? "ESO" : (isAha ? "AHA/ASA" : (group.society || "General")),
      year: group.year || new Date().getFullYear(),
      title: group.guideline_title,
      officialUrl: "",
      journalTarget: isDocEso ? "European Stroke Journal" : ((isAha || group.society.includes("AHA")) ? "Stroke" : "Neurology"),
      documentType: "Clinical Practice Guideline",
      publishDate: `${group.year || new Date().getFullYear()}-01-01`,
      subspecialty: "Stroke",
      subspecialties: ["Stroke"],
      executiveSummary: "",
      executiveSummaryVi: "",
      allPracticeChanges: allItems,
      linkedScenarioIds: [],
      fullTextStatus: "FULL_TEXT_PARSED",
      aiSynthesized: true,
    };

    setEditingDocId(group.guideline_id);
    setEditingPracticeChange(allItems[0] || null);
    setEditingGuidelineDoc(docMeta);
    setShowEditModal(true);
  };

  const handleOpenEditRecommendation = (rec: StoredRec) => {
    const parentGroup = guidelineGroups.find((g) => g.guideline_id === rec.guideline_id);
    const titleUpper = `${parentGroup?.guideline_title || ""} ${rec.guideline_title || ""}`.toUpperCase();
    const societyUpper = `${parentGroup?.society || ""} ${rec.society || ""}`.toUpperCase();
    const isAha =
      societyUpper.includes("AHA") ||
      societyUpper.includes("ACC") ||
      societyUpper.includes("ASA") ||
      titleUpper.includes("AHA") ||
      titleUpper.includes("ACC") ||
      rec.grading_system === "ACC/AHA" ||
      Boolean(rec.cor);

    const isDocEso =
      !isAha &&
      (societyUpper.includes("ESO") ||
        titleUpper.includes("ESO") ||
        (rec.guideline_id || "").toLowerCase().includes("eso") ||
        rec.grading_system === "GRADE" ||
        Boolean(rec.pico_id));

    const docTitle = parentGroup?.guideline_title || rec.guideline_title;
    const docId = parentGroup?.guideline_id || rec.guideline_id;
    const canonicalList = getCanonicalEsoPicos(docTitle, docId);

    const allItems: PracticeChangeDetail[] =
      isDocEso && canonicalList
        ? convertEsoPicoItemsToPracticeChanges(
            canonicalList,
            isEsoBpGuideline(docTitle, docId)
              ? "Blood Pressure"
              : isEsoAsahGuideline(docTitle, docId)
              ? "Aneurysmal Subarachnoid Haemorrhage"
              : "ESO Synoptic Table Recommendation"
          )
        : (parentGroup?.recommendations || [rec]).map((r, idx) => {
            let pNum: string | undefined;
            let pQuestion: string | undefined;
            if (r.pico_id) {
              const m = String(r.pico_id).match(/(\d+[a-z]?)/i);
              pNum = m ? m[0] : String(r.pico_id);
              pQuestion = r.target_population || r.topic;
            } else if (r.topic) {
              const m = String(r.topic).match(/PICO\s*(\d+[a-z]?)[:.\s-]*(.*)/i);
              if (m) {
                pNum = m[1];
                pQuestion = m[2]?.trim();
              }
            }

            const s = normalizeEsoStrength(r.strength_of_recommendation || (r as any).strength || (r as any).currentGrade, r.statement);
            const q = r.quality_of_evidence || (r as any).quality || "Moderate";

            let currentGrade = "Standard Clinical Practice";
            if (isDocEso) {
              currentGrade = `GRADE ${s} (Evidence: ${q}${r.voting ? `, Voting: ${r.voting}` : ""})`;
            } else if (r.cor) {
              const cleanCor = String(r.cor).replace(/^Class\s*/i, "").trim();
              const cleanLoe = String(r.loe || "").replace(/^Level\s*/i, "").trim();
              currentGrade = `Class ${cleanCor}${cleanLoe ? `, Level ${cleanLoe}` : ""}`;
            } else {
              const parsed = parseAhaCorAndLoe((r as any).currentGrade || (r as any).grade || "");
              currentGrade = parsed.formatted;
              if (!r.cor) r.cor = parsed.cor;
              if (!r.loe) r.loe = parsed.loe;
            }

            const finalConsensus =
              (r as any).consensus_statement ||
              (r as any).expertConsensusStatement;

            const finalPicoQuestion = pQuestion || r.topic;

            return {
              id: r.rec_id || `rec-${idx + 1}`,
              topic: r.topic || r.target_population || (isDocEso ? `PICO ${pNum || idx + 1}: Clinical Question` : `Recommendation #${idx + 1}`),
              currentGrade,
              cor: r.cor,
              loe: r.loe,
              currentText: r.statement,
              category: r.category || "General Recommendations",
              drivingTrials: r.driving_trials || [],
              changeType: "NEW",
              quality: isDocEso ? q : undefined,
              strength: isDocEso ? s : undefined,
              expertConsensusStatement: finalConsensus,
              voting: isDocEso ? r.voting : undefined,
              picoNumber: pNum || `${idx + 1}`,
              picoQuestion: finalPicoQuestion,
            };
          });

    const activeItem =
      allItems.find((it) => it.id === rec.rec_id || it.currentText === rec.statement) || allItems[0];

    const docMeta: GuidelineDoc = {
      id: parentGroup?.guideline_id || rec.guideline_id,
      title:
        parentGroup?.guideline_title ||
        rec.guideline_title ||
        "Clinical Practice Guideline",
      society: isDocEso ? "ESO" : (isAha ? "AHA/ASA" : (parentGroup?.society || rec.society || "General")),
      year: parentGroup?.year || rec.year || 2026,
      officialUrl: "",
      journalTarget: isDocEso ? "European Stroke Journal" : ((isAha || rec.society?.includes("AHA")) ? "Stroke" : "Neurology"),
      documentType: "Clinical Practice Guideline",
      publishDate: `${parentGroup?.year || rec.year || 2026}-01-01`,
      subspecialty: "Stroke",
      subspecialties: ["Stroke"],
      executiveSummary: "",
      executiveSummaryVi: "",
      topTakeaways: [],
      allPracticeChanges: allItems,
      linkedScenarioIds: [],
      fullTextStatus: "FULL_TEXT_PARSED",
      aiSynthesized: true,
    };

    setEditingDocId(parentGroup?.guideline_id || rec.guideline_id);
    setEditingGuidelineDoc(docMeta);
    setEditingPracticeChange(activeItem);
    setShowEditModal(true);
  };

  // Society Badge Styling
  const getSocietyStyle = (society: string) => {
    const s = society.toUpperCase();
    if (s.includes("AHA") || s.includes("ASA")) {
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30";
    }
    if (s.includes("ESO")) {
      return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30";
    }
    if (s.includes("AAN")) {
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
    }
    if (s.includes("ILAE")) {
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30";
    }
    if (s.includes("NCS")) {
      return "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30";
    }
    return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30";
  };

  // Grade Badges (COR / LOE)
  const getGradeBadgeStyle = (cor?: string) => {
    if (!cor) return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300";
    const c = String(cor).trim();
    if (c === "1") {
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    }
    if (c === "2a") {
      return "bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30";
    }
    if (c === "2b") {
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    }
    if (c.includes("3") || c.toLowerCase().includes("harm") || c.toLowerCase().includes("no benefit")) {
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    }
    return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. STATS OVERVIEW CARDS (EXECUTIVE DASHBOARD)
         ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Pending Guidelines</span>
            <span className="text-amber-500">📑</span>
          </div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {guidelineGroups.length}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
            Awaiting physician review
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Recommendations</span>
            <span className="text-blue-500">🎯</span>
          </div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {queue.length}
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
            Classified statements
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>AI Grounding Score</span>
            <span className="text-emerald-500">⚡</span>
          </div>
          <div className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
            {avgGroundingScore}%
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
            Fulltext citation precision
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            darkMode ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Societies Active</span>
            <span className="text-purple-500">🏛️</span>
          </div>
          <div className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
            {Object.keys(societyCounts).filter((k) => k !== "ALL" && societyCounts[k] > 0).length}
          </div>
          <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5">
            AHA, ESO, AAN &amp; international
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. SMART ACTION & CONTROL TOOLBAR
         ========================================================================= */}
      <div
        className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-3 shadow-xs ${
          darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by guideline, topic, clinical trials or keywords..."
              className={`w-full pl-8 pr-8 py-1.5 text-xs rounded-xl border outline-none transition-all ${
                darkMode
                  ? "bg-slate-800/70 border-slate-700 text-white focus:border-amber-500"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Primary Actions */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {onOpenPipelineModal && (
              <button
                type="button"
                onClick={onOpenPipelineModal}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Launch Gemini AI Fulltext Extraction Pipeline from PDF"
              >
                <span>⚡ Run AI PDF Pipeline</span>
              </button>
            )}

            {onOpenNotebookLMModal && (
              <button
                type="button"
                onClick={onOpenNotebookLMModal}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                    : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                }`}
                title="Import structured guideline from NotebookLM notes"
              >
                <span>📝 Import NotebookLM</span>
              </button>
            )}

            {queue.length > 0 && (
              <button
                type="button"
                disabled={actionLoading === "ALL"}
                onClick={() =>
                  setConfirmDialog({
                    isOpen: true,
                    type: "APPROVE_ALL",
                    title: "Approve Entire Review Queue?",
                    description: `This action will approve all ${guidelineGroups.length} Guidelines (${queue.length} recommendations) and publish them to Clinical Practice Guidelines immediately.`,
                    confirmLabel: `✓ Approve All (${queue.length} items)`,
                    confirmColor: "emerald",
                  })
                }
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>{actionLoading === "ALL" ? "Processing..." : `✓ Approve All (${queue.length})`}</span>
              </button>
            )}

            <button
              type="button"
              disabled={cleanupLoading}
              onClick={handleCleanupPdfs}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                darkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title="Purge temporary PDF blobs in Vercel Blob storage"
            >
              <span>🧹 {cleanupLoading ? "Purging..." : "Purge Blobs"}</span>
            </button>

            <button
              type="button"
              onClick={fetchQueue}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 cursor-pointer ${
                darkMode
                  ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
              title="Refresh reviews from server"
            >
              <span className={isLoading ? "animate-spin" : ""}>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Medical Society:</span>
          {[
            { id: "ALL", label: "All", count: queue.length },
            { id: "AHA", label: "AHA/ASA", count: societyCounts["AHA"] || 0 },
            { id: "ESO", label: "ESO", count: societyCounts["ESO"] || 0 },
            { id: "AAN", label: "AAN", count: societyCounts["AAN"] || 0 },
            { id: "ILAE", label: "ILAE", count: societyCounts["ILAE"] || 0 },
            { id: "NCS", label: "NCS", count: societyCounts["NCS"] || 0 },
          ].map((chip) => {
            const active = filterSociety === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterSociety(chip.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                  active
                    ? "bg-amber-600 text-white shadow-xs"
                    : darkMode
                    ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`text-[10px] px-1 rounded-full ${
                    active
                      ? "bg-white/20 text-white"
                      : darkMode
                      ? "bg-slate-700 text-slate-300"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}

          {/* Expand / Collapse All buttons */}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Expand all guidelines"
            >
              Expand all ▾
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Collapse all guidelines"
            >
              Collapse ▴
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. FEEDBACK TOAST / ALERT MESSAGE
         ========================================================================= */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs border ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              : feedbackMessage.type === "error"
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedbackMessage.type === "success" ? "✓" : feedbackMessage.type === "error" ? "⚠️" : "ℹ️"}</span>
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100 px-1.5 py-0.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          4. REVIEW CONTENT: LIST OF PENDING GUIDELINES
         ========================================================================= */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="animate-spin inline-block w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full mb-3"></div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Loading clinical guideline review queue...
          </p>
        </div>
      ) : guidelineGroups.length === 0 ? (
        <div
          className={`p-12 rounded-2xl border text-center ${
            darkMode ? "bg-slate-900/50 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <span className="text-4xl mb-3 block">🎉</span>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Review queue is currently empty!
          </h3>
          <p className="text-xs mt-1.5 max-w-lg mx-auto text-slate-500 dark:text-slate-400">
            All recommendations have been verified and published to official Clinical Practice Guidelines. Ingesting new guidelines via the AI Pipeline or NotebookLM will surface them here for clinician review.
          </p>

          {rawServerCount > 0 && (
            <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 inline-block max-w-lg text-center">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2.5">
                ⚠️ There are <strong>{rawServerCount}</strong> recommendations on the server temporarily dismissed in your browser cache.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetDismissedCache}
                  className="px-4 py-2 rounded-lg text-xs font-black bg-amber-500 hover:bg-amber-600 text-white cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                >
                  <span>🔄 Restore and Display ({rawServerCount} recommendations)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePurgeAllDeleted}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-all shadow-xs flex items-center gap-1.5"
                  title="Permanently remove on Cloud and Local"
                >
                  <span>🗑️ Permanently Delete on Cloud &amp; Local</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {guidelineGroups.map((group) => {
            const isExpanded = expandedGuidelines[group.guideline_id] ?? true;
            const isProcessingThis = actionLoading === group.guideline_id;
            const isGroupAha = group.society?.toUpperCase().includes("AHA") || group.society?.toUpperCase().includes("ASA");
            const isGroupEso =
              group.society?.toUpperCase().includes("ESO") ||
              group.guideline_title?.toUpperCase().includes("ESO") ||
              group.guideline_title?.toLowerCase().includes("blood pressure management in acute") ||
              group.guideline_title?.toLowerCase().includes("european stroke") ||
              group.guideline_id?.toLowerCase().includes("eso");
            const viewMode = groupViewModes[group.guideline_id] ?? "table";

            return (
              <div
                key={group.guideline_id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  darkMode
                    ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200 shadow-xs hover:border-slate-300"
                }`}
              >
                {/* 4.1 GUIDELINE HEADER BAR */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                    {/* Society & Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wide ${getSocietyStyle(group.society)}`}>
                        {group.society}
                      </span>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                          darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {group.year || 2024}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        ⏳{" "}
                        {isGroupEso
                          ? (() => {
                              const picos = buildEsoPicoItemsFromStoredRecs(
                                group.recommendations,
                                group.guideline_title,
                                group.guideline_id
                              );
                              const totalRecs = picos.reduce((acc, p) => acc + p.recommendations.length, 0);
                              return `${picos.length} PICO (${totalRecs} Recommendations)`;
                            })()
                          : `${group.recommendations.length} Recommendations`}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        🏷️ {group.categories.length} Categories
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        ⚡ 96% AI Grounded
                      </span>
                    </div>

                    {/* Quick Guideline Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto flex-wrap">
                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() => handleOpenEditGuideline(group)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Edit guideline metadata"
                      >
                        <span>✏️ Edit</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() =>
                          setConfirmDialog({
                            isOpen: true,
                            type: "REJECT_GUIDELINE",
                            title: `Reject guideline "${group.guideline_title}"?`,
                            description: `This action will remove this document and all ${group.recommendations.length} recommendations from the review queue.`,
                            confirmLabel: "✕ Confirm Rejection",
                            confirmColor: "rose",
                            targetGuideline: group,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Reject this guideline"
                      >
                        <span>✕ Reject</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingThis}
                        onClick={() =>
                          setConfirmDialog({
                            isOpen: true,
                            type: "APPROVE_GUIDELINE",
                            title: `Approve & Publish Guideline?`,
                            description: `Confirm approval of all ${group.recommendations.length} recommendations from:\n"${group.guideline_title}" (${group.society})\ninto the official clinical practice guidelines repository?`,
                            confirmLabel: `✓ Approve (${group.recommendations.length} items)`,
                            confirmColor: "emerald",
                            targetGuideline: group,
                          })
                        }
                        className="px-3.5 py-1 rounded-lg text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        title="Approve all recommendations in this guideline"
                      >
                        <span>{isProcessingThis ? "Processing..." : "✓ Approve & Publish"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Guideline Title */}
                  <h3 className="text-base sm:text-lg font-extrabold leading-snug text-slate-900 dark:text-white">
                    {group.guideline_title}
                  </h3>

                  {/* Toggle Accordion Clickable Banner */}
                  <div
                    onClick={() => toggleGuidelineExpand(group.guideline_id)}
                    className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 cursor-pointer select-none"
                  >
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <span>📋</span>
                      <span>
                        {isGroupEso ? (
                          (() => {
                            const picos = buildEsoPicoItemsFromStoredRecs(group.recommendations, group.guideline_title, group.guideline_id);
                            const totalRecs = picos.reduce((acc, p) => acc + p.recommendations.length, 0);
                            let totalConsensus = 0;
                            picos.forEach((p) => {
                              const recConsensusCount = p.recommendations.filter((r) =>
                                Boolean(
                                  r.expertConsensusStatement?.trim() ||
                                    (r.expertConsensusStatements && r.expertConsensusStatements.length > 0)
                                )
                              ).length;
                              if (recConsensusCount > 0) {
                                totalConsensus += recConsensusCount;
                              } else if (p.expertConsensusStatement) {
                                totalConsensus += 1;
                              }
                            });
                            return `${picos.length} PICO (${totalRecs} clinical recommendations${totalConsensus > 0 ? ` & ${totalConsensus} expert consensus statements` : ""} ESO GRADE format)`;
                          })()
                        ) : (
                          `${group.recommendations.length} recommendations categorized across ${group.categories.length} clinical domains`
                        )}
                      </span>
                    </span>

                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <span>{isExpanded ? "Collapse ▴" : "View Details & Review ▾"}</span>
                    </span>
                  </div>
                </div>

                {/* 4.2 EXPANDED GUIDELINE BODY */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    {/* View Switcher: Clinical Table vs Interactive Cards */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          {isGroupAha ? "AHA/ASA Standard (Class & Level of Evidence)" : isGroupEso ? "ESO Standard (GRADE & PICO Format)" : "Clinical Recommendations"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => setGroupViewModes((prev) => ({ ...prev, [group.guideline_id]: "table" }))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === "table"
                              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          📋 Standard Table
                        </button>
                        <button
                          type="button"
                          onClick={() => setGroupViewModes((prev) => ({ ...prev, [group.guideline_id]: "cards" }))}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            viewMode === "cards"
                              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          🗂️ Detailed Cards
                        </button>
                      </div>
                    </div>

                    {/* View 1: Clinical Practice Table */}
                    {viewMode === "table" ? (
                      isGroupAha ? (
                        <AhaGuidelineTable
                          title={`Recommendations: ${group.guideline_title}`}
                          sections={group.categories.map((c) => ({
                            sectionTitle: c.name,
                            recommendations: c.items.map((it) => {
                              const parsed = parseAhaCorAndLoe((it as any).currentGrade || (it as any).grade || "");
                              const cor = it.cor ? String(it.cor).replace(/^Class\s*/i, "").trim() : parsed.cor;
                              const loe = it.loe ? String(it.loe).replace(/^Level\s*/i, "").trim() : parsed.loe;
                              return {
                                id: it.rec_id,
                                cor: cor || "1",
                                loe: loe || "B-NR",
                                statement: it.statement,
                                drivingTrials: it.driving_trials,
                              };
                            }),
                          }))}
                          darkMode={darkMode}
                          allowEdit={true}
                          onEditRec={(r) => {
                            const item = group.recommendations.find((x) => x.rec_id === r.id);
                            if (item) handleOpenEditRecommendation(item);
                          }}
                          onDeleteRec={(r) => {
                            const item = group.recommendations.find((x) => x.rec_id === r.id);
                            if (item) handleDeleteSingleRecommendation(item);
                          }}
                        />
                      ) : isGroupEso ? (
                        <EsoGuidelineTable
                          title={group.guideline_title}
                          picoItems={buildEsoPicoItemsFromStoredRecs(group.recommendations, group.guideline_title, group.guideline_id)}
                          darkMode={darkMode}
                          allowEdit={true}
                          onEditPico={(pico) => {
                            const pNumStr = String(pico.picoNumber).trim();
                            const matchRec = group.recommendations.find(
                              (r) =>
                                (r.pico_id && (r.pico_id.toLowerCase().includes(pNumStr.toLowerCase()) || r.pico_id === pNumStr)) ||
                                r.topic?.toLowerCase().includes(`pico ${pNumStr}`) ||
                                r.category?.toLowerCase().includes(`pico ${pNumStr}`) ||
                                r.statement === pico.recommendations[0]?.statement
                            );
                            if (matchRec) {
                              handleOpenEditRecommendation(matchRec);
                            } else if (group.recommendations.length > 0) {
                              handleOpenEditRecommendation(group.recommendations[0]);
                            }
                          }}
                        />
                      ) : (
                        <AhaGuidelineTable
                          title={`Recommendations: ${group.guideline_title}`}
                          sections={group.categories.map((c) => ({
                            sectionTitle: c.name,
                            recommendations: c.items.map((it) => {
                              const parsed = parseAhaCorAndLoe((it as any).currentGrade || (it as any).grade || "");
                              const cor = it.cor ? String(it.cor).replace(/^Class\s*/i, "").trim() : parsed.cor;
                              const loe = it.loe ? String(it.loe).replace(/^Level\s*/i, "").trim() : parsed.loe;
                              return {
                                id: it.rec_id,
                                cor: cor || "1",
                                loe: loe || "B-NR",
                                statement: it.statement,
                                drivingTrials: it.driving_trials,
                              };
                            }),
                          }))}
                          darkMode={darkMode}
                          allowEdit={true}
                          onEditRec={(r) => {
                            const item = group.recommendations.find((x) => x.rec_id === r.id);
                            if (item) handleOpenEditRecommendation(item);
                          }}
                          onDeleteRec={(r) => {
                            const item = group.recommendations.find((x) => x.rec_id === r.id);
                            if (item) handleDeleteSingleRecommendation(item);
                          }}
                        />
                      )
                    ) : (
                      /* View 2: Interactive Recommendation Cards */
                      <div className="space-y-4">
                        {group.categories.map((category) => (
                          <div
                            key={category.name}
                            className={`p-3.5 sm:p-4 rounded-xl border text-xs leading-relaxed space-y-3 ${
                              darkMode ? "bg-slate-900/40 border-slate-800" : "bg-slate-50/80 border-slate-200/80"
                            }`}
                          >
                            {/* Category Header */}
                            <div className="flex items-center justify-between gap-2 border-b pb-2 border-slate-200/60 dark:border-slate-800/60">
                              <div className="flex items-center gap-1.5">
                                <span className="text-amber-500">🏷️</span>
                                <span className="font-extrabold uppercase tracking-wide text-slate-800 dark:text-slate-200 text-xs">
                                  {category.name}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {category.items.length} recommendations
                              </span>
                            </div>

                            {/* Recommendations inside Category */}
                            <div className="space-y-2.5">
                              {category.items.map((item) => (
                                <div
                                  key={item.rec_id}
                                  className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                                    darkMode
                                      ? "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                                      : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
                                  }`}
                                >
                                  {/* Topic & Grade & Edit Button */}
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                        {item.topic || item.target_population || "Clinical Recommendation"}
                                      </span>
                                      {item.page_num && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                          (Page {item.page_num})
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isGroupEso ? (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {item.quality_of_evidence && (
                                            <span className="font-mono text-[10.5px] font-black px-2 py-0.5 rounded-md border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                                              {renderGradeQuality(item.quality_of_evidence)}
                                            </span>
                                          )}
                                          {item.strength_of_recommendation && (
                                            <span className="font-mono text-[10.5px] font-black px-2 py-0.5 rounded-md border bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700">
                                              {renderGradeStrength(item.strength_of_recommendation, item.statement)}
                                            </span>
                                          )}
                                          {!item.quality_of_evidence && !item.strength_of_recommendation && (
                                            <span className="font-mono text-[10.5px] font-black px-2 py-0.5 rounded-md border bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                                              ESO GRADE
                                            </span>
                                          )}
                                        </div>
                                      ) : item.cor ? (
                                        <span
                                          className={`font-mono text-[10.5px] font-black px-2 py-0.5 rounded-md border ${getGradeBadgeStyle(
                                            item.cor
                                          )}`}
                                        >
                                          Class {item.cor} {item.loe ? `, Level ${item.loe}` : ""}
                                        </span>
                                      ) : null}

                                      {item.approval_status === "human_approved" || item.approval_status === "approved" ? (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                          ✓ Clinician Approved
                                        </span>
                                      ) : item.approval_status === "ai_checked" ? (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                                          🛡️ AI Checked (Verbatim Span Verified)
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                          ⏳ Needs Clinician Review
                                        </span>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditRecommendation(item)}
                                        className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/20 hover:text-amber-600 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                                        title="Edit recommendation text, category, or grade"
                                      >
                                        <span>✏️ Edit</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={actionLoading === item.rec_id}
                                        onClick={() => handleDeleteSingleRecommendation(item)}
                                        className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900"
                                        title="Delete this recommendation from review queue"
                                      >
                                        <span>{actionLoading === item.rec_id ? "..." : "🗑️ Delete"}</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Recommendation Statement */}
                                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-line">
                                    {item.statement}
                                  </p>

                                  {/* Grounding & Verbatim Quote Verification Collapsible */}
                                  {(item.verbatim_quote || (item.verification_detail?.issues && item.verification_detail.issues.length > 0)) && (
                                    <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-[11px] space-y-1.5">
                                      {item.verbatim_quote && (
                                        <div>
                                          <span className="font-bold text-slate-500 dark:text-slate-400">📄 Verbatim PDF Quote:</span>
                                          <p className="italic text-slate-700 dark:text-slate-300 mt-0.5 font-serif line-clamp-3 hover:line-clamp-none transition-all">
                                            "{item.verbatim_quote}"
                                          </p>
                                        </div>
                                      )}
                                      {item.verification_detail?.issues && item.verification_detail.issues.length > 0 && (
                                        <div className="text-amber-600 dark:text-amber-400 flex items-start gap-1">
                                          <span>⚠️</span>
                                          <span><strong>AI Notice:</strong> {item.verification_detail.issues.join("; ")}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Sub-details: Target Population & Driving Trials */}
                                  <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                                    {item.target_population && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        <strong className="text-slate-700 dark:text-slate-300">Target Population:</strong>{" "}
                                        {item.target_population}
                                      </span>
                                    )}

                                    {item.driving_trials && item.driving_trials.length > 0 && (
                                      <span className="text-slate-500 dark:text-slate-400">
                                        <strong className="text-slate-700 dark:text-slate-300">Key Trials / Evidence:</strong>{" "}
                                        {item.driving_trials.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom Action Footer for Guideline */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        🛡️ Upon approval, recommendations will appear immediately in Practice Guidelines for all clinicians.
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() =>
                            setConfirmDialog({
                              isOpen: true,
                              type: "REJECT_GUIDELINE",
                              title: `Reject guideline "${group.guideline_title}"?`,
                              description: `This action will remove this guideline and all ${group.recommendations.length} recommendations from the review queue.`,
                              confirmLabel: "✕ Confirm Rejection",
                              confirmColor: "rose",
                              targetGuideline: group,
                            })
                          }
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 cursor-pointer transition-colors"
                        >
                          ✕ Reject Guideline
                        </button>

                        <button
                          type="button"
                          disabled={isProcessingThis}
                          onClick={() =>
                            setConfirmDialog({
                              isOpen: true,
                              type: "APPROVE_GUIDELINE",
                              title: `Approve & Publish Guideline?`,
                              description: `Confirm approval of all ${group.recommendations.length} recommendations from:\n"${group.guideline_title}" (${group.society})\ninto the official clinical practice guidelines repository?`,
                              confirmLabel: `✓ Approve (${group.recommendations.length} items)`,
                              confirmColor: "emerald",
                              targetGuideline: group,
                            })
                          }
                          className="px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                        >
                          <span>{isProcessingThis ? "Approving..." : `✓ Approve & Publish (${group.recommendations.length} recommendations)`}</span>
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

      {/* =========================================================================
          5. CUSTOM CONFIRMATION ACTION DIALOG (REPLACES WINDOW.CONFIRM)
         ========================================================================= */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
              darkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  confirmDialog.confirmColor === "emerald"
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : confirmDialog.confirmColor === "rose"
                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                }`}
              >
                {confirmDialog.confirmColor === "emerald" ? "✓" : confirmDialog.confirmColor === "rose" ? "⚠️" : "ℹ️"}
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm review action
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  darkMode ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.type === "APPROVE_GUIDELINE" && confirmDialog.targetGuideline) {
                    executeApproveGuideline(confirmDialog.targetGuideline);
                  } else if (confirmDialog.type === "REJECT_GUIDELINE" && confirmDialog.targetGuideline) {
                    executeRejectGuideline(confirmDialog.targetGuideline);
                  } else if (confirmDialog.type === "APPROVE_ALL") {
                    executeApproveAll();
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-xs transition-all cursor-pointer ${
                  confirmDialog.confirmColor === "emerald"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : confirmDialog.confirmColor === "rose"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. REUSABLE EDIT GUIDELINE / RECOMMENDATION MODAL
         ========================================================================= */}
      <EditGuidelineModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingGuidelineDoc(null);
          setEditingPracticeChange(null);
        }}
        docId={editingDocId}
        item={editingPracticeChange}
        guidelineDoc={editingGuidelineDoc}
        adminToken={getAdminToken()}
        onSuccess={() => {
          fetchQueue();
          if (onQueueUpdated) onQueueUpdated();
          setFeedbackMessage({ type: "success", text: "✅ Changes saved successfully!" });
        }}
        darkMode={darkMode}
      />
    </div>
  );
}
