"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  ClinicalPathwayDoc,
  DuplicatePathwayMatch,
  PathwayChoiceLayout,
  PathwayDomain,
  PathwayEdge,
  PathwayNode,
  PathwayNodeKind,
  PathwaySourceType,
} from "../../../types/clinicalPathways";
import {
  NEUROLOGY_SUBSPECIALTIES,
  type NormalizedTier,
  type SubspecialtyType,
} from "../../../types/neuroguide";
import {
  clearLocalPathwayDraft,
  createBlankChecklistItem,
  createBlankEdge,
  createBlankNode,
  createStarterPathwayDraft,
  deleteNodeAndCleanupEdges,
  loadLocalPathwayDraft,
  saveLocalPathwayDraft,
  type LocalPathwayEditorDraft,
} from "../../../lib/neuroguide/pathwayEditorUtils";
import {
  normalizePathwaySlug,
  validateClinicalPathway,
} from "../../../lib/neuroguide/pathwayValidator";
import { getAdminHeaders } from "../../../utils/clientAuth";
import { CustomSelect } from "../../ecosystem/CustomSelect";
import { PathwayStepRunner } from "./PathwayStepRunner";

interface PathwayAdminModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initialPathway?: ClinicalPathwayDoc | null;
  darkMode: boolean;
  onClose: () => void;
  onSaved: (saved: ClinicalPathwayDoc) => void;
}

const SUBSPECIALTY_OPTIONS = NEUROLOGY_SUBSPECIALTIES.filter(
  (s) => s !== "All Subspecialties"
);

const NON_COR_NODE_KINDS = new Set<PathwayNodeKind>([
  "entry",
  "section",
  "decision",
  "criteria",
]);

function getStepChipDotClass(node: PathwayNode): string {
  if (node.kind === "decision" || node.edges.length >= 2) {
    return "bg-[#C23B43]";
  }
  switch (node.tier) {
    case 1:
      return "bg-emerald-500";
    case 2:
      return "bg-amber-400";
    case 3:
      return "bg-orange-500";
    case 4:
      return "bg-indigo-500";
    case 5:
      return "bg-red-700";
    default:
      return "bg-sky-500";
  }
}

function getAhaPreviewSurfaceClass(tier?: NormalizedTier): string {
  switch (tier) {
    case 1:
      return "bg-[#248A5A] text-white border-[#1C6E47]";
    case 2:
      return "bg-[#F4D03F] text-[#1A1A1A] border-[#D4AC0D]";
    case 3:
      return "bg-[#E67E22] text-white border-[#BA6115]";
    case 4:
      return "bg-[#6366F1] text-white border-[#4F46E5]";
    case 5:
      return "bg-[#9B1C1C] text-white border-[#7F1D1D]";
    default:
      return "bg-slate-600 text-white border-slate-700";
  }
}

function MiniAhaNodePreview({ node }: { node: PathwayNode }) {
  const isBanner = node.kind === "section" || node.kind === "entry";
  const isDecision =
    node.kind === "decision" ||
    node.kind === "criteria" ||
    (!isBanner && node.edges.length >= 2 && !node.tier);

  if (isBanner) {
    return (
      <div className="rounded-xl border border-[#7FB3D5] bg-[#EAF4FB] px-3.5 py-2.5 text-[#0F4C81]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
            AHA Preview • {node.kind === "section" ? "Section Banner" : "Entry"}
          </span>
        </div>
        <p className="text-xs font-bold mt-0.5 leading-snug">
          {node.title.en || "(Untitled banner)"}
        </p>
        {node.body?.en && (
          <p className="text-[11px] opacity-85 mt-0.5 line-clamp-2">
            {node.body.en}
          </p>
        )}
      </div>
    );
  }

  if (isDecision) {
    return (
      <div className="rounded-xl border border-[#C23B43]/50 bg-white dark:bg-[#1E2028] overflow-hidden">
        <div className="px-3.5 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#C23B43]">
            AHA Preview • Decision ({node.edges.length} branches)
          </span>
          <p className="text-xs font-bold text-[var(--text-ink)] mt-0.5 leading-snug">
            {node.title.en || "(Untitled decision)"}
          </p>
        </div>
        {node.edges.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 border-t border-[#C23B43]/25 bg-[#FFF5F5]/70 dark:bg-[#C23B43]/10">
            {node.edges.slice(0, 6).map((ed) => (
              <div
                key={ed.id}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-center text-[#9E2A31] dark:text-rose-200 border-r last:border-r-0 border-[#C23B43]/20 truncate"
                title={ed.label.en}
              >
                {ed.label.en || "(Branch)"}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const hasCompound = Boolean(node.compoundItems && node.compoundItems.length > 0);
  return (
    <div className="space-y-1.5">
      <div
        className={`rounded-xl border px-3.5 py-2.5 ${getAhaPreviewSurfaceClass(
          node.tier
        )}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">
            AHA Preview • {node.kind}
          </span>
          {node.evidenceBadge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/20">
              {node.evidenceBadge}
            </span>
          )}
        </div>
        <p className="text-xs font-bold mt-0.5 leading-snug">
          {node.title.en || "(Untitled step)"}
        </p>
        {node.body?.en && (
          <p className="text-[11px] opacity-90 mt-0.5 line-clamp-2">
            {node.body.en}
          </p>
        )}
      </div>
      {hasCompound && (
        <div className="flex flex-wrap items-center gap-1.5 pl-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C25934] text-white">
            {node.compoundOperator || "AND"}
          </span>
          {node.compoundItems!.map((item, idx) => (
            <span
              key={idx}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${getAhaPreviewSurfaceClass(
                item.tier
              )}`}
            >
              {item.title.en || "(Paired item)"}
              {item.evidenceBadge ? ` (${item.evidenceBadge})` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function PathwayAdminModal({
  isOpen,
  mode,
  initialPathway,
  darkMode,
  onClose,
  onSaved,
}: PathwayAdminModalProps) {
  const [stage, setStage] = useState<"upload" | "review">(
    mode === "edit" && initialPathway ? "review" : "upload"
  );
  const [editorTab, setEditorTab] = useState<
    "visual" | "meta" | "preview" | "json"
  >("visual");

  // Stage 1: Upload & Source Metadata
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>("");
  const [sourceType, setSourceType] = useState<PathwaySourceType>("guideline");
  const [preferredTitle, setPreferredTitle] = useState<string>("");
  const [sourceTitle, setSourceTitle] = useState<string>("");
  const [organizationOrAuthor, setOrganizationOrAuthor] = useState<string>("");
  const [year, setYear] = useState<number>(2026);
  const [figureRef, setFigureRef] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [subspecialty, setSubspecialty] = useState<SubspecialtyType>("Stroke");
  const [domain, setDomain] = useState<PathwayDomain>("combined");
  const [additionalInstructions, setAdditionalInstructions] = useState<string>("");
  const [manualImageUrl, setManualImageUrl] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Stage 2: Review & Edit
  const [draft, setDraft] = useState<ClinicalPathwayDoc | null>(
    initialPathway ?? null
  );
  const [serverUid, setServerUid] = useState<string>(initialPathway?.uid || "");
  const [baseRev, setBaseRev] = useState<number>(initialPathway?.rev ?? 1);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    initialPathway?.entryNodeId || initialPathway?.nodes[0]?.id || ""
  );
  const [isReExtracting, setIsReExtracting] = useState<boolean>(false);
  const [rawJsonText, setRawJsonText] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [imageZoom, setImageZoom] = useState<number>(100);

  // Alerts, Duplicates, Conflicts & Autosave
  const [confidenceNotes, setConfidenceNotes] = useState<string[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicatePathwayMatch[]>([]);
  const [allowDuplicateImage, setAllowDuplicateImage] = useState<boolean>(false);
  const [conflictInfo, setConflictInfo] = useState<{
    currentRev: number;
    message: string;
  } | null>(null);
  const [recoverableDraft, setRecoverableDraft] =
    useState<LocalPathwayEditorDraft | null>(null);
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const draftStorageKey = serverUid || "new";

  // Initialize / Reset state on open
  useEffect(() => {
    if (!isOpen) return;
    setExtractError(null);
    setSaveError(null);
    setConflictInfo(null);
    setJsonError(null);
    setImageZoom(100);
    setAllowDuplicateImage(false);

    if (mode === "edit" && initialPathway) {
      setStage("review");
      setEditorTab("visual");
      setDraft(structuredClone(initialPathway));
      setServerUid(initialPathway.uid);
      setBaseRev(initialPathway.rev);
      setSelectedNodeId(
        initialPathway.entryNodeId || initialPathway.nodes[0]?.id || ""
      );
      setConfidenceNotes(initialPathway.extractionMeta?.confidenceNotes ?? []);
      setDuplicateWarning(null);
      setDuplicates([]);
      setRawJsonText(JSON.stringify(initialPathway, null, 2));
      const savedLocal = loadLocalPathwayDraft(initialPathway.uid);
      setRecoverableDraft(savedLocal);
    } else {
      setStage("upload");
      setEditorTab("visual");
      setDraft(null);
      setServerUid("");
      setBaseRev(1);
      setSelectedNodeId("");
      setImageFile(null);
      setSourceType("guideline");
      setPreferredTitle("");
      setSourceTitle("");
      setOrganizationOrAuthor("");
      setYear(2026);
      setFigureRef("");
      setSourceUrl("");
      setSubspecialty("Stroke");
      setDomain("combined");
      setAdditionalInstructions("");
      setManualImageUrl("");
      setConfidenceNotes([]);
      setDuplicateWarning(null);
      setDuplicates([]);
      const savedLocal = loadLocalPathwayDraft("new");
      setRecoverableDraft(savedLocal);
    }
  }, [isOpen, mode, initialPathway]);

  // Revoke object URL on change/unmount
  useEffect(() => {
    if (!imageFile) {
      setLocalPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setLocalPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Debounced autosave to localStorage
  useEffect(() => {
    if (!isOpen || stage !== "review" || !draft) return;
    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      saveLocalPathwayDraft(draftStorageKey, {
        doc: draft,
        baseRev,
        savedAt,
      });
      setAutosavedAt(savedAt);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [isOpen, stage, draft, baseRev, draftStorageKey]);

  const validation = useMemo(
    () => (draft ? validateClinicalPathway(draft) : null),
    [draft]
  );

  const selectedNode = useMemo(
    () => draft?.nodes.find((n) => n.id === selectedNodeId) ?? draft?.nodes[0] ?? null,
    [draft, selectedNodeId]
  );

  if (!isOpen) return null;

  const handleExtractWithGemini = async () => {
    if (!imageFile) {
      setExtractError("Please select a flowchart image (PNG, JPEG, or WebP).");
      return;
    }
    if (!sourceTitle.trim() || !Number.isFinite(year) || year < 1900) {
      setExtractError("Source Title and a valid Year (>= 1900) are required.");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    try {
      const fd = new FormData();
      fd.append("file", imageFile);
      fd.append("sourceType", sourceType);
      if (preferredTitle.trim()) fd.append("title", preferredTitle.trim());
      fd.append("sourceTitle", sourceTitle.trim());
      fd.append(
        "organizationOrAuthor",
        organizationOrAuthor.trim() || "Unknown"
      );
      fd.append("year", String(year));
      if (figureRef.trim()) fd.append("figureRef", figureRef.trim());
      if (sourceUrl.trim()) fd.append("url", sourceUrl.trim());
      fd.append("subspecialty", subspecialty);
      fd.append("domain", domain);
      if (additionalInstructions.trim()) {
        fd.append("additionalInstructions", additionalInstructions.trim());
      }

      const res = await fetch("/api/neuroguide/pathways/extract", {
        method: "POST",
        headers: getAdminHeaders(),
        body: fd,
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        setExtractError(body?.error || "Gemini Vision extraction failed.");
        return;
      }

      const nowIso = new Date().toISOString();
      const extractedDoc: ClinicalPathwayDoc = {
        ...body.draft,
        uid: "",
        status: "draft",
        rev: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      setDraft(extractedDoc);
      setServerUid("");
      setBaseRev(1);
      setSelectedNodeId(
        extractedDoc.entryNodeId || extractedDoc.nodes[0]?.id || ""
      );
      setConfidenceNotes(body.confidenceNotes ?? []);
      setDuplicateWarning(body.duplicateWarning ?? null);
      setDuplicates(body.duplicates ?? []);
      setRawJsonText(JSON.stringify(extractedDoc, null, 2));
      setStage("review");
      setEditorTab("visual");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleStartManualDraft = () => {
    const imgUrl = manualImageUrl.trim() || localPreviewUrl;
    if (!sourceTitle.trim() || !Number.isFinite(year) || year < 1900) {
      setExtractError("Source Title and a valid Year (>= 1900) are required.");
      return;
    }
    if (!imgUrl) {
      setExtractError("Please provide an image file or image URL.");
      return;
    }
    const starter = createStarterPathwayDraft({
      titleEn: preferredTitle.trim() || sourceTitle.trim(),
      sourceType,
      sourceTitle,
      organizationOrAuthor,
      year,
      figureRef,
      url: sourceUrl,
      subspecialty,
      domain,
      sourceImageUrl: imgUrl,
    });
    setDraft(starter);
    setServerUid("");
    setBaseRev(1);
    setSelectedNodeId(starter.entryNodeId);
    setRawJsonText(JSON.stringify(starter, null, 2));
    setStage("review");
    setEditorTab("visual");
  };

  const handleReExtractExisting = async () => {
    if (!draft) return;
    const imgUrl = draft.sourceImageUrl || localPreviewUrl;
    if (!imgUrl) {
      setSaveError("No flowchart image URL is attached for re-extraction.");
      return;
    }
    setIsReExtracting(true);
    setSaveError(null);
    try {
      const fd = new FormData();
      fd.append("existingImageUrl", imgUrl);
      fd.append("sourceType", draft.source.sourceType);
      if (draft.title.en.trim()) fd.append("title", draft.title.en.trim());
      fd.append("sourceTitle", draft.source.title || draft.title.en || "Pathway");
      fd.append(
        "organizationOrAuthor",
        draft.source.organizationOrAuthor || "AHA/ACC"
      );
      fd.append("year", String(draft.source.year || 2026));
      if (draft.source.figureRef) fd.append("figureRef", draft.source.figureRef);
      if (draft.source.url) fd.append("url", draft.source.url);
      fd.append("subspecialty", draft.subspecialty);
      fd.append("domain", draft.domain);

      const res = await fetch("/api/neuroguide/pathways/extract", {
        method: "POST",
        headers: getAdminHeaders(),
        body: fd,
      });
      const body = await res.json();
      if (!res.ok || !body?.ok) {
        setSaveError(body?.error || "AHA AI re-extraction failed.");
        return;
      }

      const reExtracted: ClinicalPathwayDoc = {
        ...body.draft,
        uid: draft.uid || serverUid,
        slug: draft.slug || body.draft.slug,
        status: draft.status,
        rev: draft.rev,
        createdAt: draft.createdAt,
        updatedAt: new Date().toISOString(),
        sourceImageUrl: draft.sourceImageUrl || body.draft.sourceImageUrl,
      };
      setDraft(reExtracted);
      setSelectedNodeId(
        reExtracted.entryNodeId || reExtracted.nodes[0]?.id || ""
      );
      setConfidenceNotes(body.confidenceNotes ?? []);
      setRawJsonText(JSON.stringify(reExtracted, null, 2));
      setEditorTab("visual");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Network error during re-extraction"
      );
    } finally {
      setIsReExtracting(false);
    }
  };

  const updateSelectedNode = (updater: (node: PathwayNode) => PathwayNode) => {
    if (!draft || !selectedNode) return;
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === selectedNode.id ? updater(n) : n
        ),
      };
    });
  };

  const handlePersist = async (
    targetStatus: "draft" | "published",
    overrideRev?: number
  ) => {
    if (!draft) return;
    setIsSaving(true);
    setSaveError(null);
    setConflictInfo(null);

    const effectiveRev = overrideRev ?? baseRev;

    try {
      if (!serverUid) {
        // Create draft via POST
        const postRes = await fetch("/api/neuroguide/pathways", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAdminHeaders(),
          },
          body: JSON.stringify({
            ...draft,
            slug:
              draft.slug ||
              normalizePathwaySlug(
                draft.title.en,
                draft.source.organizationOrAuthor,
                draft.source.year
              ),
            allowDuplicateImage,
          }),
        });
        const postBody = await postRes.json();
        if (!postRes.ok || !postBody?.ok) {
          if (postRes.status === 409 && postBody?.code === "DUPLICATE_PATHWAY") {
            setDuplicateWarning(postBody.error);
            if (postBody.duplicates) setDuplicates(postBody.duplicates);
          }
          setSaveError(postBody?.error || "Failed to create pathway draft.");
          return;
        }

        const created: ClinicalPathwayDoc = postBody.pathway;
        setServerUid(created.uid);
        setBaseRev(created.rev);

        if (targetStatus === "draft") {
          setDraft(created);
          clearLocalPathwayDraft("new");
          clearLocalPathwayDraft(created.uid);
          setAutosavedAt(null);
          onSaved(created);
          return;
        }

        // Immediately transition newly created draft -> published
        const pubRes = await fetch(`/api/neuroguide/pathways/${created.uid}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getAdminHeaders(),
          },
          body: JSON.stringify({
            baseRev: created.rev,
            status: "published",
          }),
        });
        const pubBody = await pubRes.json();
        if (!pubRes.ok || !pubBody?.ok) {
          setSaveError(
            pubBody?.error || "Draft saved, but publishing failed validation."
          );
          setDraft(created);
          return;
        }

        clearLocalPathwayDraft("new");
        clearLocalPathwayDraft(pubBody.pathway.uid);
        onSaved(pubBody.pathway);
        onClose();
        return;
      }

      // Existing pathway -> PATCH with optimistic concurrency baseRev
      const patchRes = await fetch(`/api/neuroguide/pathways/${serverUid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({
          ...draft,
          baseRev: effectiveRev,
          status: targetStatus,
        }),
      });
      const patchBody = await patchRes.json();
      if (patchRes.status === 409 && patchBody?.code === "REV_CONFLICT") {
        setConflictInfo({
          currentRev: patchBody.currentRev ?? effectiveRev + 1,
          message:
            patchBody.error ||
            "This pathway was modified on another device or session.",
        });
        return;
      }
      if (!patchRes.ok || !patchBody?.ok) {
        setSaveError(patchBody?.error || "Failed to save pathway changes.");
        return;
      }

      const saved: ClinicalPathwayDoc = patchBody.pathway;
      setDraft(saved);
      setBaseRev(saved.rev);
      clearLocalPathwayDraft(saved.uid);
      setAutosavedAt(null);
      onSaved(saved);
      if (targetStatus === "published") {
        onClose();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReloadLatestFromServer = async () => {
    if (!serverUid) return;
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/neuroguide/pathways/${serverUid}?includeDrafts=1`,
        {
          headers: getAdminHeaders(),
          cache: "no-store",
        }
      );
      const body = await res.json();
      if (res.ok && body?.ok && body.pathway) {
        setDraft(body.pathway);
        setBaseRev(body.pathway.rev);
        setConflictInfo(null);
        setSaveError(null);
        clearLocalPathwayDraft(serverUid);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText) as ClinicalPathwayDoc;
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.nodes)) {
        setJsonError("JSON must be an object containing a nodes[] array.");
        return;
      }
      setDraft(parsed);
      setJsonError(null);
      if (!parsed.nodes.some((n) => n.id === selectedNodeId)) {
        setSelectedNodeId(parsed.entryNodeId || parsed.nodes[0]?.id || "");
      }
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const reviewImageUrl = draft?.sourceImageUrl || localPreviewUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Clinical Pathway Admin Modal"
    >
      <div className="w-full max-w-[1600px] h-[94vh] flex flex-col rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#C25934]/12 text-[#C25934] flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight truncate">
                {mode === "edit"
                  ? `Edit Clinical Pathway — ${draft?.title.en || ""}`
                  : stage === "upload"
                    ? "Upload Flowchart Image & Extract Pathway"
                    : `Review & Publish — ${draft?.title.en || "New Draft"}`}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Recovery Banner for LocalStorage Autosaved Draft */}
        {recoverableDraft && (
          <div className="px-5 py-2.5 bg-amber-500/12 border-b border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-amber-800 dark:text-amber-200 font-medium">
              Found an unsaved local autosave from{" "}
              {new Date(recoverableDraft.savedAt).toLocaleString()}. Restore it?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(recoverableDraft.doc);
                  setBaseRev(recoverableDraft.baseRev);
                  setStage("review");
                  setSelectedNodeId(
                    recoverableDraft.doc.entryNodeId ||
                      recoverableDraft.doc.nodes[0]?.id ||
                      ""
                  );
                  setRawJsonText(JSON.stringify(recoverableDraft.doc, null, 2));
                  setRecoverableDraft(null);
                }}
                className="px-2.5 py-1 rounded-lg font-bold bg-amber-600 text-white cursor-pointer"
              >
                Restore Local Draft
              </button>
              <button
                type="button"
                onClick={() => {
                  clearLocalPathwayDraft(draftStorageKey);
                  setRecoverableDraft(null);
                }}
                className="px-2.5 py-1 rounded-lg font-semibold border border-[var(--border-hairline)] bg-[var(--bg-surface)] cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div
          className={`flex-1 min-h-0 p-3.5 sm:p-4 ${
            stage === "review"
              ? "flex flex-col gap-3 overflow-y-auto lg:overflow-hidden"
              : "overflow-y-auto space-y-3.5"
          }`}
        >
          {stage === "upload" ? (
            <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4 items-stretch">
              {/* Left: Image Picker */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex flex-col gap-3">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  1. Flowchart Image (PNG, JPEG, WebP ≤ 10MB)
                </label>

                <label className="flex-1 min-h-[180px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-hairline)] hover:border-[#C25934] bg-[var(--bg-subtle)]/60 p-4 text-center cursor-pointer transition-colors">
                  <Upload size={22} className="text-[#C25934] mb-2" />
                  <span className="text-xs font-semibold text-[var(--text-ink)]">
                    {imageFile ? imageFile.name : "Click to select flowchart image"}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] mt-1 max-w-sm leading-relaxed">
                    High-resolution screenshots from PDF guidelines or textbooks work best
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setImageFile(f);
                      setExtractError(null);
                    }}
                  />
                </label>

                {localPreviewUrl && (
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-2 max-h-[240px] overflow-auto">
                    <img
                      src={localPreviewUrl}
                      alt="Selected flowchart preview"
                      className="w-full h-auto rounded-lg object-contain bg-white"
                    />
                  </div>
                )}

                <div className="pt-2.5 border-t border-[var(--border-hairline)]">
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    Or paste existing image URL (for manual draft without upload)
                  </label>
                  <input
                    type="text"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    placeholder="https://... or /uploads/pathways/..."
                    className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]/75 focus:outline-none focus:border-[#C25934]"
                  />
                </div>
              </div>

              {/* Right: Source Metadata */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  2. Source Attribution &amp; Taxonomy
                </p>

                <div className="flex gap-2">
                  {(["guideline", "textbook"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSourceType(t)}
                      className={`flex-1 min-h-[34px] py-1.5 rounded-lg text-xs font-bold border capitalize transition-colors cursor-pointer ${
                        sourceType === t
                          ? "bg-[#C25934] text-white border-[#C25934]"
                          : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Preferred Pathway Title (EN, optional)
                    </label>
                    <input
                      type="text"
                      value={preferredTitle}
                      onChange={(e) => setPreferredTitle(e.target.value)}
                      placeholder="Leave blank to let Gemini read title from image"
                      className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]/75 focus:outline-none focus:border-[#C25934]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Source Title *
                    </label>
                    <input
                      type="text"
                      value={sourceTitle}
                      onChange={(e) => setSourceTitle(e.target.value)}
                      placeholder="e.g. 2026 AHA/ASA Acute Ischemic Stroke Guideline"
                      className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]/75 focus:outline-none focus:border-[#C25934]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Organization / Author
                      </label>
                      <input
                        type="text"
                        value={organizationOrAuthor}
                        onChange={(e) => setOrganizationOrAuthor(e.target.value)}
                        placeholder="e.g. AHA/ASA or Adams & Victor"
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]/75 focus:outline-none focus:border-[#C25934]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Year *
                      </label>
                      <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] focus:outline-none focus:border-[#C25934]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Subspecialty
                      </label>
                      <CustomSelect
                        value={subspecialty}
                        onChange={(v) => setSubspecialty(v as SubspecialtyType)}
                        ariaLabel="Pathway subspecialty"
                        darkMode={darkMode}
                        accent="amber"
                        size="compact"
                        buttonClassName="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-paper)] shadow-none"
                        options={SUBSPECIALTY_OPTIONS.map((s) => ({
                          value: s,
                          label: s,
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Domain
                      </label>
                      <CustomSelect
                        value={domain}
                        onChange={(v) => setDomain(v as PathwayDomain)}
                        ariaLabel="Pathway domain"
                        darkMode={darkMode}
                        accent="amber"
                        size="compact"
                        buttonClassName="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-paper)] shadow-none"
                        options={[
                          { value: "diagnosis", label: "Diagnosis" },
                          { value: "treatment", label: "Treatment" },
                          { value: "combined", label: "Combined" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Figure / Page Ref
                      </label>
                      <input
                        type="text"
                        value={figureRef}
                        onChange={(e) => setFigureRef(e.target.value)}
                        placeholder="e.g. Figure 2, p. 412"
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]/75 focus:outline-none focus:border-[#C25934]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                        Source URL (optional)
                      </label>
                      <input
                        type="text"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://doi.org/..."
                        className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]/75 focus:outline-none focus:border-[#C25934]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      Extraction Notes for AI (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      placeholder="e.g. Focus on the right-hand LVO thrombectomy branch"
                      className="w-full px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] placeholder:text-[var(--text-muted)]/75 focus:outline-none focus:border-[#C25934]"
                    />
                  </div>
                </div>

                {extractError && (
                  <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-200">
                    {extractError}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={handleExtractWithGemini}
                    className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#C25934] hover:bg-[#A64827] text-white disabled:opacity-50 cursor-pointer"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Extracting with Gemini Vision...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Extract with Gemini Vision</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={handleStartManualDraft}
                    className="min-h-[38px] px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-ink)] cursor-pointer"
                  >
                    Manual Draft
                  </button>
                </div>
              </div>
            </div>
          ) : (
            draft && (
              <>
                {/* Banners: Conflict, Duplicate, Confidence Notes, Validation */}
                {conflictInfo && (
                  <div className="rounded-xl border border-rose-500/45 bg-rose-500/10 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 text-rose-800 dark:text-rose-200">
                      <p className="font-bold">
                        409 Revision Conflict — Server is at rev {conflictInfo.currentRev} (you edited rev {baseRev})
                      </p>
                      <p>{conflictInfo.message}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReloadLatestFromServer}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold border border-[var(--border-hairline)] bg-[var(--bg-surface)] cursor-pointer"
                      >
                        <RefreshCw size={12} />
                        <span>Reload Latest</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePersist(draft.status === "published" ? "published" : "draft", conflictInfo.currentRev)
                        }
                        className="px-3 py-1.5 rounded-lg font-bold bg-rose-600 text-white cursor-pointer"
                      >
                        Apply My Changes onto Rev {conflictInfo.currentRev}
                      </button>
                    </div>
                  </div>
                )}

                {duplicateWarning && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Duplicate Pathway Detected</p>
                        <p>{duplicateWarning}</p>
                      </div>
                    </div>
                    {duplicates.some((d) => d.reason === "image_sha256") && (
                      <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowDuplicateImage}
                          onChange={(e) => setAllowDuplicateImage(e.target.checked)}
                          className="accent-[#C25934]"
                        />
                        <span>Allow creating a separate pathway from this same image</span>
                      </label>
                    )}
                  </div>
                )}

                {/* Split-Screen Review Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] gap-4 lg:flex-1 lg:min-h-0">
                  {/* Left: Original Image Reference */}
                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden flex flex-col lg:h-full">
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)] shrink-0">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                        <ImageIcon size={14} className="text-[#C25934]" />
                        Original Flowchart
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setImageZoom((z) => Math.max(50, z - 25))}
                          className="p-1 rounded hover:bg-[var(--bg-surface)] cursor-pointer"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <span className="text-[11px] font-mono w-9 text-center">
                          {imageZoom}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setImageZoom((z) => Math.min(250, z + 25))}
                          className="p-1 rounded hover:bg-[var(--bg-surface)] cursor-pointer"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageZoom(100)}
                          className="p-1 rounded hover:bg-[var(--bg-surface)] cursor-pointer"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-[280px] overflow-auto p-3.5 bg-[var(--bg-subtle)]/50 custom-scrollbar">
                      {reviewImageUrl ? (
                        <img
                          src={reviewImageUrl}
                          alt={draft.title.en}
                          style={{ width: `${imageZoom}%`, maxWidth: "none" }}
                          className="rounded-lg bg-white border border-[var(--border-hairline)] object-contain"
                        />
                      ) : (
                        <p className="text-xs text-[var(--text-muted)] p-6 text-center">
                          No image URL attached.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: 4 Sub-tabs (Visual Editor | Notes & Meta | Live Preview | Raw JSON) */}
                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden flex flex-col lg:h-full">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)] shrink-0">
                      <div className="flex flex-wrap items-center gap-1">
                        {(
                          [
                            { id: "visual", label: "Visual Editor", icon: FileText },
                            { id: "meta", label: "Notes & Meta", icon: BookOpen },
                            { id: "preview", label: "Live Preview", icon: Eye },
                            { id: "json", label: "Raw JSON", icon: Code2 },
                          ] as const
                        ).map((t) => {
                          const Icon = t.icon;
                          const active = editorTab === t.id;
                          const metaCount =
                            t.id === "meta"
                              ? (draft.abbreviations?.length ?? 0) +
                                (draft.footnotes?.length ?? 0)
                              : 0;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                if (t.id === "json" && draft) {
                                  setRawJsonText(JSON.stringify(draft, null, 2));
                                  setJsonError(null);
                                }
                                setEditorTab(t.id);
                              }}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                active
                                  ? "bg-[#C25934] text-white"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                              }`}
                            >
                              <Icon size={13} />
                              <span>{t.label}</span>
                              {metaCount > 0 && (
                                <span
                                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                    active
                                      ? "bg-white/25 text-white"
                                      : "bg-[#C25934]/15 text-[#C25934]"
                                  }`}
                                >
                                  {metaCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={handleReExtractExisting}
                        disabled={!reviewImageUrl || isReExtracting}
                        title="Re-extract flowchart structure using AHA AI pipeline"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border border-[#C25934]/40 text-[#C25934] hover:bg-[#C25934]/10 disabled:opacity-40 cursor-pointer"
                      >
                        {isReExtracting ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        <span>
                          {isReExtracting ? "Re-extracting..." : "Re-extract (AHA AI)"}
                        </span>
                      </button>
                    </div>

                    <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-4 custom-scrollbar">
                      {editorTab === "meta" && (
                        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 p-3.5 space-y-3 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Title (EN) *
                                  </label>
                                    <input
                                      type="text"
                                      value={draft.title.en}
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          title: { ...draft.title, en: e.target.value },
                                        })
                                      }
                                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-semibold mb-1">
                                      Title (VI)
                                    </label>
                                    <input
                                      type="text"
                                      value={draft.title.vi || ""}
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          title: { ...draft.title, vi: e.target.value },
                                        })
                                      }
                                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="block font-semibold mb-1">
                                      First Step
                                    </label>
                                    <CustomSelect
                                      value={draft.entryNodeId}
                                      onChange={(v) => setDraft({ ...draft, entryNodeId: v })}
                                      ariaLabel="First step"
                                      darkMode={darkMode}
                                      accent="amber"
                                      size="form-sm"
                                      buttonClassName="bg-[var(--bg-surface)] shadow-none"
                                      options={draft.nodes.map((n, idx) => ({
                                        value: n.id,
                                        label: `Step ${idx + 1}: ${n.title.en || n.id}`,
                                      }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-semibold mb-1">
                                      Source Title
                                    </label>
                                    <input
                                      type="text"
                                      value={draft.source.title}
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          source: { ...draft.source, title: e.target.value },
                                        })
                                      }
                                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="block font-semibold mb-1">
                                      Year
                                    </label>
                                    <input
                                      type="number"
                                      value={draft.source.year}
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          source: {
                                            ...draft.source,
                                            year: Number(e.target.value),
                                          },
                                        })
                                      }
                                      className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                    />
                                </div>
                              </div>

                              {/* Abbreviations Visual Editor */}
                              <div className="pt-2 border-t border-[var(--border-hairline)] space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">
                                    Abbreviations ({draft.abbreviations?.length ?? 0})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraft({
                                        ...draft,
                                        abbreviations: [
                                          ...(draft.abbreviations ?? []),
                                          { term: "", expansion: { en: "", vi: "" } },
                                        ],
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C25934] cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    <span>Add Abbreviation</span>
                                  </button>
                                </div>
                                {(draft.abbreviations ?? []).map((abbr, aIdx) => (
                                  <div
                                    key={aIdx}
                                    className="grid grid-cols-1 sm:grid-cols-[90px_1fr_1fr_auto] gap-1.5 items-center"
                                  >
                                    <input
                                      type="text"
                                      value={abbr.term}
                                      placeholder="Term (BP)"
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          abbreviations: (draft.abbreviations ?? []).map(
                                            (it, i) =>
                                              i === aIdx
                                                ? { ...it, term: e.target.value }
                                                : it
                                          ),
                                        })
                                      }
                                      className="px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] font-mono"
                                    />
                                    <input
                                      type="text"
                                      value={abbr.expansion.en}
                                      placeholder="Expansion (EN)"
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          abbreviations: (draft.abbreviations ?? []).map(
                                            (it, i) =>
                                              i === aIdx
                                                ? {
                                                    ...it,
                                                    expansion: {
                                                      ...it.expansion,
                                                      en: e.target.value,
                                                    },
                                                  }
                                                : it
                                          ),
                                        })
                                      }
                                      className="px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                    />
                                    <input
                                      type="text"
                                      value={abbr.expansion.vi || ""}
                                      placeholder="Expansion (VI)"
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          abbreviations: (draft.abbreviations ?? []).map(
                                            (it, i) =>
                                              i === aIdx
                                                ? {
                                                    ...it,
                                                    expansion: {
                                                      ...it.expansion,
                                                      vi: e.target.value,
                                                    },
                                                  }
                                                : it
                                          ),
                                        })
                                      }
                                      className="px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDraft({
                                          ...draft,
                                          abbreviations: (draft.abbreviations ?? []).filter(
                                            (_, i) => i !== aIdx
                                          ),
                                        })
                                      }
                                      className="p-1 text-rose-500 cursor-pointer"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>

                              {/* Footnotes Visual Editor */}
                              <div className="pt-2 border-t border-[var(--border-hairline)] space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">
                                    Footnotes ({draft.footnotes?.length ?? 0})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraft({
                                        ...draft,
                                        footnotes: [
                                          ...(draft.footnotes ?? []),
                                          { symbol: "*", text: { en: "", vi: "" } },
                                        ],
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C25934] cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    <span>Add Footnote</span>
                                  </button>
                                </div>
                                {(draft.footnotes ?? []).map((fn, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="grid grid-cols-1 sm:grid-cols-[70px_1fr_1fr_auto] gap-1.5 items-center"
                                  >
                                    <input
                                      type="text"
                                      value={fn.symbol}
                                      placeholder="*, †"
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          footnotes: (draft.footnotes ?? []).map(
                                            (it, i) =>
                                              i === fIdx
                                                ? { ...it, symbol: e.target.value }
                                                : it
                                          ),
                                        })
                                      }
                                      className="px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] font-mono"
                                    />
                                    <input
                                      type="text"
                                      value={fn.text.en}
                                      placeholder="Footnote text (EN)"
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          footnotes: (draft.footnotes ?? []).map(
                                            (it, i) =>
                                              i === fIdx
                                                ? {
                                                    ...it,
                                                    text: {
                                                      ...it.text,
                                                      en: e.target.value,
                                                    },
                                                  }
                                                : it
                                          ),
                                        })
                                      }
                                      className="px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                    />
                                    <input
                                      type="text"
                                      value={fn.text.vi || ""}
                                      placeholder="Footnote text (VI)"
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          footnotes: (draft.footnotes ?? []).map(
                                            (it, i) =>
                                              i === fIdx
                                                ? {
                                                    ...it,
                                                    text: {
                                                      ...it.text,
                                                      vi: e.target.value,
                                                    },
                                                  }
                                                : it
                                          ),
                                        })
                                      }
                                      className="px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDraft({
                                          ...draft,
                                          footnotes: (draft.footnotes ?? []).filter(
                                            (_, i) => i !== fIdx
                                          ),
                                        })
                                      }
                                      className="p-1 text-rose-500 cursor-pointer"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                      {editorTab === "visual" && (
                        <>
                          {/* Compact AHA Color Legend */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)]/60 border border-[var(--border-hairline)] text-[10px] font-semibold text-[var(--text-muted)]">
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#C23B43]" />
                              Decision
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              COR 1
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-400" />
                              COR 2a
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-orange-500" />
                              COR 2b
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-700" />
                              COR 3 Harm
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-sky-500" />
                              Entry / Section
                            </span>
                          </div>

                          {/* Step Selector */}
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                Pathway Steps ({draft.nodes.length}) — Click a step to edit
                              </span>
                              <div className="flex flex-wrap items-center gap-1">
                                {(
                                  [
                                    {
                                      label: "+ Decision",
                                      make: (): PathwayNode => ({
                                        ...createBlankNode(draft.nodes),
                                        kind: "decision",
                                        title: { en: "Clinical Decision", vi: "" },
                                      }),
                                    },
                                    {
                                      label: "+ COR 1",
                                      make: (): PathwayNode => ({
                                        ...createBlankNode(draft.nodes),
                                        kind: "action",
                                        tier: 1,
                                        evidenceBadge: "Class 1",
                                        title: { en: "Class 1 Recommendation", vi: "" },
                                      }),
                                    },
                                    {
                                      label: "+ Section",
                                      make: (): PathwayNode => ({
                                        ...createBlankNode(draft.nodes),
                                        kind: "section",
                                        title: { en: "Section Banner", vi: "" },
                                      }),
                                    },
                                    {
                                      label: "+ AND/OR",
                                      make: (): PathwayNode => ({
                                        ...createBlankNode(draft.nodes),
                                        kind: "action",
                                        tier: 1,
                                        evidenceBadge: "Class 1",
                                        compoundOperator: "AND",
                                        compoundItems: [
                                          {
                                            title: {
                                              en: "Paired Recommendation",
                                              vi: "",
                                            },
                                            tier: 1,
                                            evidenceBadge: "Class 1",
                                          },
                                        ],
                                      }),
                                    },
                                  ] as const
                                ).map((preset) => (
                                  <button
                                    key={preset.label}
                                    type="button"
                                    onClick={() => {
                                      const newNode = preset.make();
                                      setDraft({
                                        ...draft,
                                        nodes: [...draft.nodes, newNode],
                                      });
                                      setSelectedNodeId(newNode.id);
                                    }}
                                    className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold border border-dashed border-[#C25934]/50 text-[#C25934] hover:bg-[#C25934]/10 cursor-pointer"
                                  >
                                    {preset.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {draft.nodes.map((n, idx) => {
                                const hasErr = validation?.errors.some(
                                  (e) => e.nodeId === n.id
                                );
                                const active = selectedNode?.id === n.id;
                                return (
                                  <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => setSelectedNodeId(n.id)}
                                    title={`${n.id} (${n.kind})`}
                                    className={`inline-flex items-center gap-1.5 max-w-[210px] px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                      active
                                        ? "bg-[#C25934] text-white border-[#C25934] shadow-2xs"
                                        : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-ink)] hover:border-[#C25934]/40"
                                    }`}
                                  >
                                    {hasErr ? (
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                    ) : (
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          active
                                            ? "bg-white"
                                            : getStepChipDotClass(n)
                                        }`}
                                      />
                                    )}
                                    <span className={`font-mono text-[10px] shrink-0 ${active ? "text-white/85" : "text-[var(--text-muted)]"}`}>
                                      {idx + 1}.
                                    </span>
                                    <span className="truncate">{n.title.en || n.id}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Selected Node Form */}
                          {selectedNode && (
                            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-4 space-y-3.5 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-hairline)]">
                                <div className="flex flex-wrap items-center gap-2 min-w-0">
                                  <span className="font-bold text-xs sm:text-[13px] text-[var(--text-ink)] truncate">
                                    Step {draft.nodes.findIndex((n) => n.id === selectedNode.id) + 1}: {selectedNode.title.en || selectedNode.id}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-hairline)]">
                                    {selectedNode.id}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {(() => {
                                    const sIdx = draft.nodes.findIndex(
                                      (n) => n.id === selectedNode.id
                                    );
                                    const moveStep = (delta: -1 | 1) => {
                                      const tIdx = sIdx + delta;
                                      if (
                                        sIdx < 0 ||
                                        tIdx < 0 ||
                                        tIdx >= draft.nodes.length
                                      ) {
                                        return;
                                      }
                                      const nextNodes = [...draft.nodes];
                                      const [moved] = nextNodes.splice(sIdx, 1);
                                      nextNodes.splice(tIdx, 0, moved);
                                      setDraft({ ...draft, nodes: nextNodes });
                                    };
                                    return (
                                      <>
                                        <button
                                          type="button"
                                          disabled={sIdx <= 0}
                                          onClick={() => moveStep(-1)}
                                          title="Move step up"
                                          className="p-1 rounded-lg border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-35 cursor-pointer"
                                        >
                                          <ArrowUp size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={
                                            sIdx < 0 || sIdx >= draft.nodes.length - 1
                                          }
                                          onClick={() => moveStep(1)}
                                          title="Move step down"
                                          className="p-1 rounded-lg border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-35 cursor-pointer"
                                        >
                                          <ArrowDown size={12} />
                                        </button>
                                      </>
                                    );
                                  })()}
                                  {draft.nodes.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = deleteNodeAndCleanupEdges(
                                          draft,
                                          selectedNode.id
                                        );
                                        setDraft(next);
                                        setSelectedNodeId(
                                          next.entryNodeId || next.nodes[0]?.id || ""
                                        );
                                      }}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                    >
                                      <Trash2 size={12} />
                                      <span>Delete Node</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <MiniAhaNodePreview node={selectedNode} />

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Node Kind
                                  </label>
                                  <CustomSelect
                                    value={selectedNode.kind}
                                    onChange={(v) => {
                                      const nextKind = v as PathwayNodeKind;
                                      const stripCor = NON_COR_NODE_KINDS.has(nextKind);
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        kind: nextKind,
                                        ...(stripCor
                                          ? { tier: undefined, evidenceBadge: undefined }
                                          : {}),
                                      }));
                                    }}
                                    ariaLabel="Node kind"
                                    darkMode={darkMode}
                                    accent="amber"
                                    size="form-sm"
                                    buttonClassName="bg-[var(--bg-surface)] shadow-none"
                                    options={[
                                      { value: "entry", label: "Entry" },
                                      { value: "section", label: "Section Banner" },
                                      { value: "decision", label: "Decision" },
                                      { value: "criteria", label: "Criteria List (Any of)" },
                                      { value: "checklist", label: "Checklist" },
                                      { value: "action", label: "Action" },
                                      { value: "diagnosis", label: "Diagnosis" },
                                      { value: "treatment", label: "Treatment" },
                                    ]}
                                  />
                                </div>
                                {NON_COR_NODE_KINDS.has(selectedNode.kind) ? (
                                  <div className="sm:col-span-2 flex items-center rounded-lg border border-dashed border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 px-3 py-2 text-[11px] text-[var(--text-muted)]">
                                    AHA standard: COR tier applies only to Action / Diagnosis / Treatment nodes.
                                  </div>
                                ) : (
                                  <>
                                    <div>
                                      <label className="block font-semibold mb-1">
                                        Evidence Tier
                                      </label>
                                      <CustomSelect
                                        value={
                                          selectedNode.tier
                                            ? String(selectedNode.tier)
                                            : "none"
                                        }
                                        onChange={(v) =>
                                          updateSelectedNode((n) => ({
                                            ...n,
                                            tier:
                                              v === "none"
                                                ? undefined
                                                : (Number(v) as NormalizedTier),
                                          }))
                                        }
                                        ariaLabel="Evidence tier"
                                        darkMode={darkMode}
                                        accent="amber"
                                        size="form-sm"
                                        buttonClassName="bg-[var(--bg-surface)] shadow-none"
                                        options={[
                                          { value: "none", label: "None (Textbook/General)" },
                                          { value: "1", label: "Tier 1 (Class I)" },
                                          { value: "2", label: "Tier 2 (Class IIa)" },
                                          { value: "3", label: "Tier 3 (Class IIb)" },
                                          { value: "4", label: "Tier 4 (Consensus)" },
                                          { value: "5", label: "Tier 5 (Class III Harm)" },
                                        ]}
                                      />
                                    </div>
                                    <div>
                                      <label className="block font-semibold mb-1">
                                        Evidence Badge
                                      </label>
                                      <input
                                        type="text"
                                        value={selectedNode.evidenceBadge || ""}
                                        onChange={(e) =>
                                          updateSelectedNode((n) => ({
                                            ...n,
                                            evidenceBadge: e.target.value || undefined,
                                          }))
                                        }
                                        placeholder="e.g. Class 1, LOE A"
                                        className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                      />
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Title (EN) *
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedNode.title.en}
                                    onChange={(e) =>
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        title: { ...n.title, en: e.target.value },
                                      }))
                                    }
                                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Title (VI)
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedNode.title.vi || ""}
                                    onChange={(e) =>
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        title: { ...n.title, vi: e.target.value },
                                      }))
                                    }
                                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Clinical Details / Criteria (EN)
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={selectedNode.body?.en || ""}
                                    onChange={(e) =>
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        body: e.target.value
                                          ? { ...(n.body ?? { en: "" }), en: e.target.value }
                                          : n.body?.vi
                                            ? { ...n.body, en: "" }
                                            : undefined,
                                      }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Clinical Details / Criteria (VI)
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={selectedNode.body?.vi || ""}
                                    onChange={(e) =>
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        body: e.target.value
                                          ? { ...(n.body ?? { en: "" }), vi: e.target.value }
                                          : n.body?.en
                                            ? { en: n.body.en }
                                            : undefined,
                                      }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Warning / Contraindication (EN)
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={selectedNode.warning?.en || ""}
                                    onChange={(e) =>
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        warning: e.target.value
                                          ? { ...(n.warning ?? { en: "" }), en: e.target.value }
                                          : n.warning?.vi
                                            ? { ...n.warning, en: "" }
                                            : undefined,
                                      }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Warning / Contraindication (VI)
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={selectedNode.warning?.vi || ""}
                                    onChange={(e) =>
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        warning: e.target.value
                                          ? { ...(n.warning ?? { en: "" }), vi: e.target.value }
                                          : n.warning?.en
                                            ? { en: n.warning.en }
                                            : undefined,
                                      }))
                                    }
                                    className="w-full px-3 py-2 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Clinical Pearl (EN)
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedNode.clinicalPearl?.en || ""}
                                    placeholder="Optional bedside takeaway..."
                                    onChange={(e) =>
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        clinicalPearl: e.target.value
                                          ? {
                                              ...(n.clinicalPearl ?? { en: "" }),
                                              en: e.target.value,
                                            }
                                          : n.clinicalPearl?.vi
                                            ? { ...n.clinicalPearl, en: "" }
                                            : undefined,
                                      }))
                                    }
                                    className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Clinical Pearl (VI)
                                  </label>
                                  <input
                                    type="text"
                                    value={selectedNode.clinicalPearl?.vi || ""}
                                    placeholder="Ghi chú lâm sàng (VI)..."
                                    onChange={(e) =>
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        clinicalPearl: e.target.value
                                          ? {
                                              ...(n.clinicalPearl ?? { en: "" }),
                                              vi: e.target.value,
                                            }
                                          : n.clinicalPearl?.en
                                            ? { en: n.clinicalPearl.en }
                                            : undefined,
                                      }))
                                    }
                                    className="w-full min-h-[36px] px-3 py-1.5 rounded-lg text-[13px] font-medium border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                              </div>

                              {/* Checklist Items */}
                              {selectedNode.kind === "checklist" && (
                                <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold">Checklist Items</span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateSelectedNode((n) => ({
                                          ...n,
                                          checklistItems: [
                                            ...(n.checklistItems ?? []),
                                            createBlankChecklistItem(
                                              n.id,
                                              n.checklistItems ?? []
                                            ),
                                          ],
                                        }))
                                      }
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C25934] cursor-pointer"
                                    >
                                      <Plus size={12} />
                                      <span>Add Criterion</span>
                                    </button>
                                  </div>
                                  {(selectedNode.checklistItems ?? []).map((item, idx) => (
                                    <div key={item.id} className="flex gap-2 items-center">
                                      <select
                                        value={item.role}
                                        onChange={(e) =>
                                          updateSelectedNode((n) => ({
                                            ...n,
                                            checklistItems: (n.checklistItems ?? []).map(
                                              (c, i) =>
                                                i === idx
                                                  ? {
                                                      ...c,
                                                      role:
                                                        e.target.value === "exclusion"
                                                          ? "exclusion"
                                                          : "inclusion",
                                                    }
                                                  : c
                                            ),
                                          }))
                                        }
                                        className="px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                      >
                                        <option value="inclusion">Inclusion</option>
                                        <option value="exclusion">Exclusion</option>
                                      </select>
                                      <input
                                        type="text"
                                        value={item.label.en}
                                        onChange={(e) =>
                                          updateSelectedNode((n) => ({
                                            ...n,
                                            checklistItems: (n.checklistItems ?? []).map(
                                              (c, i) =>
                                                i === idx
                                                  ? {
                                                      ...c,
                                                      label: { ...c.label, en: e.target.value },
                                                    }
                                                  : c
                                            ),
                                          }))
                                        }
                                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                      />
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSelectedNode((n) => ({
                                            ...n,
                                            checklistItems: (n.checklistItems ?? []).filter(
                                              (_, i) => i !== idx
                                            ),
                                          }))
                                        }
                                        className="p-1 text-rose-500 cursor-pointer"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Choice Layout & Compound (AND/OR) Controls */}
                              {selectedNode.edges.length >= 2 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="block font-semibold mb-1">
                                      Choice Grid Layout
                                    </label>
                                    <CustomSelect
                                      value={selectedNode.choiceLayout || "auto"}
                                      onChange={(v) =>
                                        updateSelectedNode((n) => ({
                                          ...n,
                                          choiceLayout:
                                            v === "auto"
                                              ? undefined
                                              : (v as PathwayChoiceLayout),
                                        }))
                                      }
                                      ariaLabel="Choice grid layout"
                                      darkMode={darkMode}
                                      accent="amber"
                                      size="form-sm"
                                      buttonClassName="bg-[var(--bg-surface)] shadow-none"
                                      options={[
                                        { value: "auto", label: "Auto (AHA Smart)" },
                                        { value: "binary", label: "2-Col Binary (Yes/No)" },
                                        { value: "row3", label: "3-Col Row" },
                                        { value: "grid2", label: "2×2 Grid" },
                                        { value: "stack", label: "Stacked List" },
                                      ]}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Compound AND / OR Items */}
                              {(selectedNode.kind === "action" ||
                                selectedNode.kind === "treatment" ||
                                selectedNode.kind === "diagnosis" ||
                                (selectedNode.compoundItems &&
                                  selectedNode.compoundItems.length > 0)) && (
                                <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-bold">
                                      Compound Card (AND / OR)
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={selectedNode.compoundOperator || "AND"}
                                        onChange={(e) =>
                                          updateSelectedNode((n) => ({
                                            ...n,
                                            compoundOperator:
                                              e.target.value === "OR" ? "OR" : "AND",
                                          }))
                                        }
                                        className="px-2 py-1 rounded-lg text-[11px] font-semibold border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                      >
                                        <option value="AND">Operator: AND</option>
                                        <option value="OR">Operator: OR</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSelectedNode((n) => ({
                                            ...n,
                                            compoundOperator:
                                              n.compoundOperator || "AND",
                                            compoundItems: [
                                              ...(n.compoundItems ?? []),
                                              {
                                                title: {
                                                  en: "Paired Recommendation",
                                                  vi: "",
                                                },
                                                tier: 1,
                                                evidenceBadge: "Class 1",
                                              },
                                            ],
                                          }))
                                        }
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C25934] cursor-pointer"
                                      >
                                        <Plus size={12} />
                                        <span>Add Paired Item</span>
                                      </button>
                                    </div>
                                  </div>
                                  {(selectedNode.compoundItems ?? []).map(
                                    (cItem, cIdx) => (
                                      <div
                                        key={cIdx}
                                        className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5 space-y-1.5"
                                      >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                          <input
                                            type="text"
                                            value={cItem.title.en}
                                            onChange={(e) =>
                                              updateSelectedNode((n) => ({
                                                ...n,
                                                compoundItems: (
                                                  n.compoundItems ?? []
                                                ).map((it, i) =>
                                                  i === cIdx
                                                    ? {
                                                        ...it,
                                                        title: {
                                                          ...it.title,
                                                          en: e.target.value,
                                                        },
                                                      }
                                                    : it
                                                ),
                                              }))
                                            }
                                            placeholder="Item title (EN)"
                                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                          />
                                          <input
                                            type="text"
                                            value={cItem.title.vi || ""}
                                            onChange={(e) =>
                                              updateSelectedNode((n) => ({
                                                ...n,
                                                compoundItems: (
                                                  n.compoundItems ?? []
                                                ).map((it, i) =>
                                                  i === cIdx
                                                    ? {
                                                        ...it,
                                                        title: {
                                                          ...it.title,
                                                          vi: e.target.value,
                                                        },
                                                      }
                                                    : it
                                                ),
                                              }))
                                            }
                                            placeholder="Item title (VI)"
                                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                          />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_110px_auto] gap-1.5 items-center">
                                          <input
                                            type="text"
                                            value={cItem.body?.en || ""}
                                            onChange={(e) =>
                                              updateSelectedNode((n) => ({
                                                ...n,
                                                compoundItems: (
                                                  n.compoundItems ?? []
                                                ).map((it, i) =>
                                                  i === cIdx
                                                    ? {
                                                        ...it,
                                                        body: e.target.value
                                                          ? {
                                                              ...(it.body ?? {
                                                                en: "",
                                                              }),
                                                              en: e.target.value,
                                                            }
                                                          : undefined,
                                                      }
                                                    : it
                                                ),
                                              }))
                                            }
                                            placeholder="Details / target (EN, optional)"
                                            className="px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                          />
                                          <select
                                            value={
                                              cItem.tier ? String(cItem.tier) : "none"
                                            }
                                            onChange={(e) =>
                                              updateSelectedNode((n) => ({
                                                ...n,
                                                compoundItems: (
                                                  n.compoundItems ?? []
                                                ).map((it, i) =>
                                                  i === cIdx
                                                    ? {
                                                        ...it,
                                                        tier:
                                                          e.target.value === "none"
                                                            ? undefined
                                                            : (Number(
                                                                e.target.value
                                                              ) as NormalizedTier),
                                                      }
                                                    : it
                                                ),
                                              }))
                                            }
                                            className="px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                          >
                                            <option value="none">No COR</option>
                                            <option value="1">Class 1</option>
                                            <option value="2">Class 2a</option>
                                            <option value="3">Class 2b</option>
                                            <option value="4">Consensus</option>
                                            <option value="5">Class 3 Harm</option>
                                          </select>
                                          <input
                                            type="text"
                                            value={cItem.evidenceBadge || ""}
                                            onChange={(e) =>
                                              updateSelectedNode((n) => ({
                                                ...n,
                                                compoundItems: (
                                                  n.compoundItems ?? []
                                                ).map((it, i) =>
                                                  i === cIdx
                                                    ? {
                                                        ...it,
                                                        evidenceBadge:
                                                          e.target.value ||
                                                          undefined,
                                                      }
                                                    : it
                                                ),
                                              }))
                                            }
                                            placeholder="Badge"
                                            className="px-2 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              updateSelectedNode((n) => ({
                                                ...n,
                                                compoundItems: (
                                                  n.compoundItems ?? []
                                                ).filter((_, i) => i !== cIdx),
                                              }))
                                            }
                                            className="p-1 text-rose-500 cursor-pointer"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}

                              {/* Outgoing Edges */}
                              <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">Next Step Branches</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fallbackTarget =
                                        draft.nodes.find((x) => x.id !== selectedNode.id)
                                          ?.id || selectedNode.id;
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        edges: [
                                          ...n.edges,
                                          createBlankEdge(n.id, n.edges, fallbackTarget),
                                        ],
                                      }));
                                    }}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C25934] cursor-pointer"
                                  >
                                    <Plus size={12} />
                                    <span>Add Branch</span>
                                  </button>
                                </div>

                                {selectedNode.edges.length === 0 ? (
                                  <p className="text-[11px] text-[var(--text-muted)]">
                                    No next steps (this is a final conclusion step).
                                  </p>
                                ) : (
                                  selectedNode.edges.map((edge, idx) => (
                                    <div
                                      key={edge.id}
                                      className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 space-y-2"
                                    >
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <input
                                          type="text"
                                          value={edge.label.en}
                                          placeholder="Choice label (EN)"
                                          onChange={(e) =>
                                            updateSelectedNode((n) => ({
                                              ...n,
                                              edges: n.edges.map((ed, i) =>
                                                i === idx
                                                  ? { ...ed, label: { ...ed.label, en: e.target.value } }
                                                  : ed
                                              ),
                                            }))
                                          }
                                          className="w-full min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                        />
                                        <input
                                          type="text"
                                          value={edge.label.vi || ""}
                                          placeholder="Choice label (VI)"
                                          onChange={(e) =>
                                            updateSelectedNode((n) => ({
                                              ...n,
                                              edges: n.edges.map((ed, i) =>
                                                i === idx
                                                  ? { ...ed, label: { ...ed.label, vi: e.target.value } }
                                                  : ed
                                              ),
                                            }))
                                          }
                                          className="w-full min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                        />
                                      </div>

                                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                                        <span className="text-[11px] font-semibold text-[var(--text-muted)] shrink-0">
                                          Go to:
                                        </span>
                                        <select
                                          value={edge.targetNodeId}
                                          onChange={(e) =>
                                            updateSelectedNode((n) => ({
                                              ...n,
                                              edges: n.edges.map((ed, i) =>
                                                i === idx
                                                  ? { ...ed, targetNodeId: e.target.value }
                                                  : ed
                                              ),
                                            }))
                                          }
                                          className="flex-1 min-w-0 min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                        >
                                          {draft.nodes.map((target, tIdx) => (
                                            <option key={target.id} value={target.id}>
                                              Step {tIdx + 1}: {target.title.en || target.id}
                                            </option>
                                          ))}
                                        </select>
                                        <select
                                          value={edge.tone || "default"}
                                          onChange={(e) =>
                                            updateSelectedNode((n) => ({
                                              ...n,
                                              edges: n.edges.map((ed, i) =>
                                                i === idx
                                                  ? {
                                                      ...ed,
                                                      tone: e.target.value as PathwayEdge["tone"],
                                                    }
                                                  : ed
                                              ),
                                            }))
                                          }
                                          className="w-28 shrink-0 min-h-[34px] px-2 py-1 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                        >
                                          <option value="default">Default</option>
                                          <option value="positive">Positive</option>
                                          <option value="warning">Warning</option>
                                          <option value="danger">Danger</option>
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (edge.targetNodeId) {
                                              setSelectedNodeId(edge.targetNodeId);
                                            }
                                          }}
                                          title="Jump to target step"
                                          className="p-1.5 rounded-lg border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[#C25934] hover:border-[#C25934]/50 shrink-0 cursor-pointer"
                                        >
                                          <ArrowUpRight size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateSelectedNode((n) => ({
                                              ...n,
                                              edges: n.edges.filter((_, i) => i !== idx),
                                            }))
                                          }
                                          title="Remove branch"
                                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 shrink-0 cursor-pointer"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>

                                      <label className="inline-flex items-center gap-2 text-[11px] text-[var(--text-secondary)] cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={Boolean(edge.autoUnrollLoop)}
                                          onChange={(e) =>
                                            updateSelectedNode((n) => ({
                                              ...n,
                                              edges: n.edges.map((ed, i) =>
                                                i === idx
                                                  ? {
                                                      ...ed,
                                                      autoUnrollLoop: e.target.checked
                                                        ? true
                                                        : undefined,
                                                    }
                                                  : ed
                                              ),
                                            }))
                                          }
                                          className="rounded accent-[#C25934]"
                                        />
                                        <span>Auto-unroll loop (AHA repeat pass)</span>
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {editorTab === "preview" && (
                        <PathwayStepRunner
                          pathway={draft}
                          darkMode={darkMode}
                          isPreviewMode={true}
                        />
                      )}

                      {editorTab === "json" && (
                        <div className="space-y-2">
                          <textarea
                            rows={18}
                            value={rawJsonText}
                            onChange={(e) => setRawJsonText(e.target.value)}
                            className="w-full font-mono text-[11px] p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] focus:outline-none focus:border-[#C25934]"
                          />
                          {jsonError && (
                            <p className="text-xs text-rose-600 dark:text-rose-400">
                              {jsonError}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={handleApplyRawJson}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#C25934] text-white cursor-pointer"
                          >
                            Apply JSON to Editor
                          </button>
                        </div>
                      )}

                      {/* Extraction Notes & Graph Validation (below main editor) */}
                      {(confidenceNotes.length > 0 || validation) && (
                        <div className="space-y-3 pt-2 border-t border-[var(--border-hairline)]">
                          {confidenceNotes.length > 0 && (
                            <div className="rounded-xl border border-sky-500/30 bg-sky-500/8 p-3 text-xs text-sky-900 dark:text-sky-200">
                              <p className="font-bold mb-1">Gemini Vision Confidence Notes:</p>
                              <ul className="list-disc pl-4 space-y-0.5">
                                {confidenceNotes.map((note, idx) => (
                                  <li key={idx}>{note}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {validation && (
                            <div
                              className={`rounded-xl border p-3 text-xs ${
                                validation.errors.length > 0
                                  ? "border-rose-500/35 bg-rose-500/8 text-rose-800 dark:text-rose-200"
                                  : validation.warnings.length > 0
                                    ? "border-amber-500/35 bg-amber-500/8 text-amber-800 dark:text-amber-200"
                                    : "border-emerald-500/35 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200"
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 font-bold">
                                <span className="inline-flex items-center gap-1.5">
                                  {validation.errors.length > 0 ? (
                                    <AlertCircle size={15} />
                                  ) : (
                                    <CheckCircle2 size={15} />
                                  )}
                                  {validation.errors.length > 0
                                    ? `${validation.errors.length} Blocking Error(s) — fix before publishing`
                                    : validation.warnings.length > 0
                                      ? `Ready to Publish (${validation.warnings.length} advisory warning)`
                                      : "Graph Validated — Ready to Publish"}
                                </span>
                              </div>
                              {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {[...validation.errors, ...validation.warnings].map((issue, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        if (issue.nodeId) {
                                          setSelectedNodeId(issue.nodeId);
                                          setEditorTab("visual");
                                        }
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[11px] font-medium border text-left cursor-pointer ${
                                        issue.severity === "error"
                                          ? "bg-rose-500/15 border-rose-500/35"
                                          : "bg-amber-500/15 border-amber-500/35"
                                      }`}
                                    >
                                      {issue.message}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )
          )}
        </div>

        {/* Sticky Footer */}
        {stage === "review" && draft && (
          <div className="px-5 py-3 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg font-mono font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                {serverUid ? `rev ${baseRev} · ${draft.status}` : "Unsaved Draft"}
              </span>
              {autosavedAt && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  Autosaved locally {new Date(autosavedAt).toLocaleTimeString()}
                </span>
              )}
              {saveError && (
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  {saveError}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {mode === "create" && !serverUid && (
                <button
                  type="button"
                  onClick={() => setStage("upload")}
                  className="px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-subtle)] cursor-pointer"
                >
                  ← Back to Upload
                </button>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handlePersist("draft")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-ink)] hover:border-[#C25934] disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                disabled={isSaving || !validation?.canPublish}
                title={
                  validation?.canPublish
                    ? "Publish pathway for all clinicians"
                    : "Fix all blocking validation errors before publishing"
                }
                onClick={() => handlePersist("published")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#C25934] hover:bg-[#A64827] text-white disabled:opacity-45 cursor-pointer"
              >
                <Send size={13} />
                <span>Publish Pathway</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
