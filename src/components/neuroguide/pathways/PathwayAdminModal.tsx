"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
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
  const [editorTab, setEditorTab] = useState<"visual" | "preview" | "json">(
    "visual"
  );

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
  const [showMetaEditor, setShowMetaEditor] = useState<boolean>(false);
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
      <div className="w-full max-w-[1360px] max-h-[94vh] flex flex-col rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#C25934]/12 text-[#C25934] flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate">
                {mode === "edit"
                  ? `Edit Clinical Pathway — ${draft?.title.en || ""}`
                  : stage === "upload"
                    ? "Upload Flowchart Image & Extract Pathway"
                    : `Review & Publish — ${draft?.title.en || "New Draft"}`}
              </h2>
              <p className="text-[11px] text-[var(--text-muted)]">
                Human-in-the-loop gate: every AI extraction stays in Draft until validated and published.
              </p>
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {stage === "upload" ? (
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left: Image Picker */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                  1. Flowchart Image (PNG, JPEG, WebP ≤ 10MB)
                </label>

                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-hairline)] hover:border-[#C25934] bg-[var(--bg-subtle)]/60 p-6 text-center cursor-pointer transition-colors">
                  <Upload size={24} className="text-[#C25934] mb-2" />
                  <span className="text-xs font-semibold text-[var(--text-ink)]">
                    {imageFile ? imageFile.name : "Click to select flowchart image"}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] mt-1">
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
                  <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)] p-2 max-h-[280px] overflow-auto">
                    <img
                      src={localPreviewUrl}
                      alt="Selected flowchart preview"
                      className="w-full h-auto rounded-lg object-contain bg-white"
                    />
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--border-hairline)]">
                  <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1">
                    Or paste existing image URL (for manual draft without upload)
                  </label>
                  <input
                    type="text"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    placeholder="https://... or /uploads/pathways/..."
                    className="w-full px-3 py-1.5 rounded-xl text-xs border border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)] focus:outline-none focus:border-[#C25934]"
                  />
                </div>
              </div>

              {/* Right: Source Metadata */}
              <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                  2. Source Attribution &amp; Taxonomy
                </p>

                <div className="flex gap-2">
                  {(["guideline", "textbook"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSourceType(t)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border capitalize transition-colors cursor-pointer ${
                        sourceType === t
                          ? "bg-[#C25934] text-white border-[#C25934]"
                          : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Preferred Pathway Title (EN, optional)
                    </label>
                    <input
                      type="text"
                      value={preferredTitle}
                      onChange={(e) => setPreferredTitle(e.target.value)}
                      placeholder="Leave blank to let Gemini read title from image"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] focus:outline-none focus:border-[#C25934]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Source Title *
                    </label>
                    <input
                      type="text"
                      value={sourceTitle}
                      onChange={(e) => setSourceTitle(e.target.value)}
                      placeholder="e.g. 2026 AHA/ASA Acute Ischemic Stroke Guideline"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] focus:outline-none focus:border-[#C25934]"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                        Organization / Author
                      </label>
                      <input
                        type="text"
                        value={organizationOrAuthor}
                        onChange={(e) => setOrganizationOrAuthor(e.target.value)}
                        placeholder="e.g. AHA/ASA or Adams & Victor"
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] focus:outline-none focus:border-[#C25934]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                        Year *
                      </label>
                      <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] focus:outline-none focus:border-[#C25934]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                        Subspecialty
                      </label>
                      <CustomSelect
                        value={subspecialty}
                        onChange={(v) => setSubspecialty(v as SubspecialtyType)}
                        ariaLabel="Pathway subspecialty"
                        darkMode={darkMode}
                        accent="amber"
                        options={SUBSPECIALTY_OPTIONS.map((s) => ({
                          value: s,
                          label: s,
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                        Domain
                      </label>
                      <CustomSelect
                        value={domain}
                        onChange={(v) => setDomain(v as PathwayDomain)}
                        ariaLabel="Pathway domain"
                        darkMode={darkMode}
                        accent="amber"
                        options={[
                          { value: "diagnosis", label: "Diagnosis" },
                          { value: "treatment", label: "Treatment" },
                          { value: "combined", label: "Combined" },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                        Figure / Page Ref
                      </label>
                      <input
                        type="text"
                        value={figureRef}
                        onChange={(e) => setFigureRef(e.target.value)}
                        placeholder="e.g. Figure 2, p. 412"
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] focus:outline-none focus:border-[#C25934]"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                        Source URL (optional)
                      </label>
                      <input
                        type="text"
                        value={sourceUrl}
                        onChange={(e) => setSourceUrl(e.target.value)}
                        placeholder="https://doi.org/..."
                        className="w-full px-3 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] focus:outline-none focus:border-[#C25934]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                      Extraction Notes for AI (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      placeholder="e.g. Focus on the right-hand LVO thrombectomy branch"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] focus:outline-none focus:border-[#C25934]"
                    />
                  </div>
                </div>

                {extractError && (
                  <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-200">
                    {extractError}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={handleExtractWithGemini}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#C25934] hover:bg-[#A64827] text-white disabled:opacity-50 cursor-pointer"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Extracting with Gemini Vision...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={15} />
                        <span>Extract with Gemini Vision</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isExtracting}
                    onClick={handleStartManualDraft}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-ink)] cursor-pointer"
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
                            [{issue.code}] {issue.message}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Split-Screen Review Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] gap-4 items-start">
                  {/* Left: Original Image Reference */}
                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                        <ImageIcon size={14} className="text-[#C25934]" />
                        Original Flowchart
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setImageZoom((z) => Math.max(50, z - 25))}
                          className="p-1 rounded hover:bg-[var(--bg-surface)]"
                        >
                          <ZoomOut size={14} />
                        </button>
                        <span className="text-[11px] font-mono w-9 text-center">
                          {imageZoom}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setImageZoom((z) => Math.min(250, z + 25))}
                          className="p-1 rounded hover:bg-[var(--bg-surface)]"
                        >
                          <ZoomIn size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageZoom(100)}
                          className="p-1 rounded hover:bg-[var(--bg-surface)]"
                        >
                          <RotateCcw size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[60vh] overflow-auto p-3 bg-[var(--bg-subtle)]/50">
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

                  {/* Right: 3 Sub-tabs (Visual Editor | Live Preview | Raw JSON) */}
                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
                      <div className="flex items-center gap-1">
                        {(
                          [
                            { id: "visual", label: "Visual Editor", icon: FileText },
                            { id: "preview", label: "Live Preview", icon: Eye },
                            { id: "json", label: "Raw JSON", icon: Code2 },
                          ] as const
                        ).map((t) => {
                          const Icon = t.icon;
                          const active = editorTab === t.id;
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
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                active
                                  ? "bg-[#C25934] text-white"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                              }`}
                            >
                              <Icon size={13} />
                              <span>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowMetaEditor((v) => !v)}
                        className="text-[11px] font-semibold text-[#C25934] hover:underline cursor-pointer"
                      >
                        {showMetaEditor ? "Hide Metadata" : "Edit Pathway Metadata"}
                      </button>
                    </div>

                    <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
                      {editorTab === "visual" && (
                        <>
                          {showMetaEditor && (
                            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/50 p-3.5 space-y-2.5 text-xs">
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
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
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
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Entry Node
                                  </label>
                                  <CustomSelect
                                    value={draft.entryNodeId}
                                    onChange={(v) => setDraft({ ...draft, entryNodeId: v })}
                                    ariaLabel="Entry node"
                                    darkMode={darkMode}
                                    accent="amber"
                                    options={draft.nodes.map((n) => ({
                                      value: n.id,
                                      label: `${n.id}: ${n.title.en.slice(0, 28)}`,
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
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
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
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Node Strip */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {draft.nodes.map((n) => {
                              const hasErr = validation?.errors.some(
                                (e) => e.nodeId === n.id
                              );
                              const active = selectedNode?.id === n.id;
                              return (
                                <button
                                  key={n.id}
                                  type="button"
                                  onClick={() => setSelectedNodeId(n.id)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                                    active
                                      ? "bg-[#C25934] text-white border-[#C25934]"
                                      : "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:text-[var(--text-ink)]"
                                  }`}
                                >
                                  {hasErr && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  )}
                                  <span>{n.id}</span>
                                  <span className="opacity-75 capitalize">({n.kind})</span>
                                </button>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => {
                                const newNode = createBlankNode(draft.nodes);
                                setDraft({
                                  ...draft,
                                  nodes: [...draft.nodes, newNode],
                                });
                                setSelectedNodeId(newNode.id);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-dashed border-[#C25934]/50 text-[#C25934] hover:bg-[#C25934]/10 cursor-pointer"
                            >
                              <Plus size={12} />
                              <span>Add Node</span>
                            </button>
                          </div>

                          {/* Selected Node Form */}
                          {selectedNode && (
                            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3.5 space-y-3 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-bold text-[var(--text-ink)]">
                                  Editing Node: {selectedNode.id}
                                </span>
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

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div>
                                  <label className="block font-semibold mb-1">
                                    Node Kind
                                  </label>
                                  <CustomSelect
                                    value={selectedNode.kind}
                                    onChange={(v) =>
                                      updateSelectedNode((n) => ({
                                        ...n,
                                        kind: v as PathwayNodeKind,
                                      }))
                                    }
                                    ariaLabel="Node kind"
                                    darkMode={darkMode}
                                    accent="amber"
                                    options={[
                                      { value: "entry", label: "Entry" },
                                      { value: "decision", label: "Decision" },
                                      { value: "checklist", label: "Checklist" },
                                      { value: "action", label: "Action" },
                                      { value: "diagnosis", label: "Diagnosis" },
                                      { value: "treatment", label: "Treatment" },
                                    ]}
                                  />
                                </div>
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
                                    placeholder="e.g. Class I, LOE A"
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
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
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
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
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
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
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                                  />
                                </div>
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
                                          : undefined,
                                      }))
                                    }
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
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

                              {/* Outgoing Edges */}
                              <div className="space-y-2 pt-2 border-t border-[var(--border-hairline)]">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold">Outgoing Branches (Edges)</span>
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
                                    No outgoing branches (terminal node).
                                  </p>
                                ) : (
                                  selectedNode.edges.map((edge, idx) => (
                                    <div
                                      key={edge.id}
                                      className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                                    >
                                      <input
                                        type="text"
                                        value={edge.label.en}
                                        placeholder="Branch label (EN)"
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
                                        className="sm:col-span-4 px-2 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                      />
                                      <input
                                        type="text"
                                        value={edge.label.vi || ""}
                                        placeholder="Nhãn (VI)"
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
                                        className="sm:col-span-3 px-2 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                      />
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
                                        className="sm:col-span-3 px-2 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                      >
                                        {draft.nodes.map((target) => (
                                          <option key={target.id} value={target.id}>
                                            → {target.id} ({target.title.en.slice(0, 18)})
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
                                        className="sm:col-span-1 px-1 py-1 rounded border border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                                      >
                                        <option value="default">Default</option>
                                        <option value="positive">Positive</option>
                                        <option value="warning">Warning</option>
                                        <option value="danger">Danger</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateSelectedNode((n) => ({
                                            ...n,
                                            edges: n.edges.filter((_, i) => i !== idx),
                                          }))
                                        }
                                        className="sm:col-span-1 p-1 text-rose-500 justify-self-end cursor-pointer"
                                      >
                                        <Trash2 size={13} />
                                      </button>
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
              <span className="px-2.5 py-1 rounded-lg font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
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
