"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  ClipboardList,
  Clock,
  Cloud,
  FlaskConical,
  Inbox,
  Pencil,
  Pill,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Shield,
  Sparkles,
  Tag,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import type {
  GuidelineDoc,
  PracticeChangeDetail,
  SubspecialtyType,
  RecommendationV3Labels,
} from "@/types/neuroguide";
import { NEUROLOGY_SUBSPECIALTIES } from "@/types/neuroguide";
import { ESO_GRADE_QUALITY_CONFIG } from "./EsoGuidelineTable";
import { normalizeEsoStrength } from "@/lib/neuroguide/esoPicoGrouper";
import { parseAhaCorAndLoe } from "@/lib/neuroguide/notebooklmParser";
import { getAdminHeaders, getStoredAdminToken } from "@/utils/clientAuth";
import {
  type GuidelineFormFormat,
  GUIDELINE_FORMS,
  detectGuidelineFormFormat,
  cleanGuidelineTitle,
} from "@/lib/neuroguide/guidelineFormat";
import {
  CLINICAL_CONDITIONS_V3,
  getConditionsForSubspecialtyV3,
  getConditionByIdV3,
  getAllDiagnosisTagsV3,
  getTagLabelByIdV3,
  toCanonicalTagId,
  getConditionSubTagsForScopesV3,
  compareConditionLabelsV3,
  type ClinicalDomainV3,
  type DirectionFilterV3,
  type TaxonomyTagV3,
} from "@/data/clinicalNavigatorTaxonomyV3";
import { classifyRecommendationV3 } from "@/lib/neuroguide/clinicalNavigatorV3Classifier";
import { deepEqualSync } from "@/lib/sync/jsonPatch";
import {
  NEUROGUIDE_DRAFT_AUTOSAVE_INTERVAL_MS,
  clearLocalBlockDraftsForUid,
  findLatestLocalBlockDraftForUid,
  resolveBlockConflictChoice,
  saveLocalBlockDraft,
  type BlockConflictResolutionMode,
  type LocalBlockDraftRecord,
  type NeuroGuideBlockWriteInput,
} from "@/lib/neuroguide/sync/adminHelpers";
import {
  buildDeterministicFallbackBlockForPracticeChange,
  resolveRecommendationBlockForPracticeChange,
  stripRuntimeBlockMeta,
  type PracticeChangeDetailWithBlockMeta,
} from "@/lib/neuroguide/sync/lookupHelpers";
import type {
  NeuroGuideContentBlockData,
  NeuroGuideContentBlockRow,
  NeuroGuideProtocolRow,
} from "@/lib/neuroguide/sync/types";
import { BlockConflictDialog } from "@/components/neuroguide/sync/BlockConflictDialog";
import { BlockHistoryPanel } from "@/components/neuroguide/sync/BlockHistoryPanel";

export type { GuidelineFormFormat } from "@/lib/neuroguide/guidelineFormat";

interface EditGuidelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  item: PracticeChangeDetail | null;
  guidelineDoc: GuidelineDoc | null;
  onSuccess: (updatedDoc?: GuidelineDoc) => void;
  darkMode: boolean;
  adminToken?: string;
  syncV2Enabled?: boolean;
  blocksByUid?: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  blocksBySlug?: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  protocolsBySlug?: ReadonlyMap<string, NeuroGuideProtocolRow>;
  onApplyLocalBlockWrite?: (row: NeuroGuideContentBlockRow) => Promise<void> | void;
}

interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
  maxRows?: number;
  value: string;
}

/**
 * Auto-resize textarea component.
 * Temporarily resets height to '0px' before reading scrollHeight to avoid flex/grid stretching bugs.
 */
function AutoResizeTextarea({
  minRows = 2,
  maxRows = 16,
  value,
  onChange,
  className = "",
  placeholder = "",
  ...props
}: AutoResizeTextareaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    // Reset to 0px so scrollHeight reflects true text height
    el.style.height = "0px";
    const lineH = 20;
    const paddingH = 16;
    const minH = minRows * lineH + paddingH;
    const maxH = maxRows * lineH + paddingH;
    const targetH = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height = `${targetH}px`;
    el.style.overflowY = el.scrollHeight > maxH ? "auto" : "hidden";
  }, [minRows, maxRows]);

  React.useLayoutEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={minRows}
      onChange={(e) => {
        onChange?.(e);
        adjustHeight();
      }}
      placeholder={placeholder}
      className={`resize-none block custom-scrollbar ${className}`}
      {...props}
    />
  );
}

function GripVerticalIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

function ArrowUpIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ArrowDownIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}


export interface EsoRecDraft {
  id: string;
  statement: string; // Full Recommendation Statement
  strength: string; // Strength of Recommendation
  quality: string; // Quality of Evidence (High, Moderate, Low, Very low, Uncertain / Ongoing trial)
  expertConsensusStatement?: string;
  voting?: string;
  drivingTrials?: string[];
  changeType?: PracticeChangeDetail["changeType"];
  v3Labels?: RecommendationV3Labels;
}

export interface EsoPicoDraft {
  picoKey: string;
  picoNumber: string;
  picoQuestion: string;
  category: string;
  recommendations: EsoRecDraft[];
}

function parseAhaCor(gradeStr?: string): string {
  if (!gradeStr) return "1";
  return parseAhaCorAndLoe(gradeStr).cor;
}

function parseAhaLoe(gradeStr?: string): string {
  if (!gradeStr) return "A";
  return parseAhaCorAndLoe(gradeStr).loe;
}

function parseEsoQuality(gradeStr?: string): string {
  if (!gradeStr) return "Moderate";
  const lower = gradeStr.toLowerCase();
  if (
    lower.includes("uncertain") ||
    lower.includes("not assessable") ||
    lower.includes("ongoing") ||
    lower === "-" ||
    lower === "—" ||
    lower === "–" ||
    lower.includes("(–)") ||
    lower.includes("(-)")
  ) return "Uncertain / Ongoing trial";
  if (lower.includes("very low")) return "Very low";
  if (lower.includes("low")) return "Low";
  if (lower.includes("high")) return "High";
  return "Moderate";
}

function getEsoQualityConfig(quality?: string) {
  if (!quality) return ESO_GRADE_QUALITY_CONFIG["Moderate"];
  if (ESO_GRADE_QUALITY_CONFIG[quality]) return ESO_GRADE_QUALITY_CONFIG[quality];
  const lower = quality.toLowerCase().trim();
  if (
    lower.includes("uncertain") ||
    lower.includes("not assessable") ||
    lower.includes("ongoing") ||
    lower === "-" ||
    lower === "—" ||
    lower === "–" ||
    lower.includes("(–)") ||
    lower.includes("(-)")
  ) {
    return ESO_GRADE_QUALITY_CONFIG["Uncertain / Ongoing trial"];
  }
  if (lower.includes("very low")) return ESO_GRADE_QUALITY_CONFIG["Very low"];
  if (lower.includes("low")) return ESO_GRADE_QUALITY_CONFIG["Low"];
  if (lower.includes("high")) return ESO_GRADE_QUALITY_CONFIG["High"];
  return ESO_GRADE_QUALITY_CONFIG["Moderate"];
}

/**
 * Converts a flat array of PracticeChangeDetail into structured ESO PICO draft groups.
 * Multiple recommendations belonging to the same PICO question are grouped together.
 */
function changesToEsoPicos(changes: PracticeChangeDetail[]): EsoPicoDraft[] {
  if (!changes || changes.length === 0) return [];
  const pMap = new Map<string, EsoPicoDraft>();
  let fallbackCounter = 1;

  changes.forEach((item) => {
    let pNum = "";
    let pQuestion = "";

    const rawTopic = (item.topic || "").trim();
    const rawCat = (item.category || "").trim();

    if (item.picoNumber) {
      pNum = String(item.picoNumber);
      pQuestion = item.picoQuestion || rawTopic;
    } else {
      const matchTopic = rawTopic.match(/^PICO\s*(\d+)[:.\s-]*(.*)/i);
      const matchCat = rawCat.match(/^PICO\s*(\d+)[:.\s-]*(.*)/i);
      if (matchTopic) {
        pNum = matchTopic[1];
        pQuestion = matchTopic[2]?.trim() || rawTopic;
      } else if (matchCat) {
        pNum = matchCat[1];
        pQuestion = matchCat[2]?.trim() || rawTopic;
      } else {
        pNum = String(fallbackCounter++);
        pQuestion = rawTopic || rawCat || `PICO ${pNum}`;
      }
    }

    pQuestion = pQuestion.replace(/^PICO\s*\d+[:.\s-]*/i, "").trim();
    if (!pQuestion) {
      pQuestion = rawTopic.replace(/^PICO\s*\d+[:.\s-]*/i, "").trim() || rawCat;
    }

    const picoKey = `PICO-${pNum}`;
    const strength = normalizeEsoStrength(item.strength || item.currentGrade, item.currentText);
    const quality = item.quality || parseEsoQuality(item.currentGrade);
    const consensus =
      item.expertConsensusStatement ||
      (item.previousText && !item.previousText.startsWith("Driving Evidence:") ? item.previousText : "");
    const voting = item.voting || (consensus ? "Vote: 10/10" : "");

    if (!pMap.has(picoKey)) {
      pMap.set(picoKey, {
        picoKey,
        picoNumber: String(pNum),
        picoQuestion: pQuestion || `Clinical Question for PICO ${pNum}`,
        category: item.category || "Recommendations",
        recommendations: [],
      });
    }

    const targetPico = pMap.get(picoKey)!;
    targetPico.recommendations.push({
      id: item.id || `rec-${pNum}-${targetPico.recommendations.length + 1}`,
      statement: item.currentText || "",
      strength,
      quality,
      expertConsensusStatement: consensus,
      voting,
      drivingTrials: item.drivingTrials || [],
      changeType: item.changeType || "STANDARD",
      v3Labels:
        item.v3Labels ||
        (item.currentText
          ? classifyRecommendationV3(
              {
                id: "eso-guideline",
                title: "",
                society: "ESO",
                subspecialty: "Stroke",
                year: 2024,
              },
              {
                ...item,
                category: item.category || "Recommendations",
                topic: item.topic || item.currentText.slice(0, 60),
                currentGrade: item.currentGrade || item.strength || "",
              }
            )
          : undefined),
    });
  });

  return Array.from(pMap.values());
}

/**
 * Converts structured ESO PICO draft groups back into PracticeChangeDetail array for persistence.
 */
function esoPicosToChanges(picos: EsoPicoDraft[]): PracticeChangeDetail[] {
  const changes: PracticeChangeDetail[] = [];
  picos.forEach((pico) => {
    pico.recommendations.forEach((rec, rIdx) => {
      const computedGrade = `GRADE ${rec.strength} (Evidence: ${rec.quality}${rec.voting ? `, Voting: ${rec.voting}` : ""})`;
      changes.push({
        id: rec.id || `rec-${pico.picoNumber}-${rIdx + 1}`,
        category: pico.category || "Recommendations",
        topic: `PICO ${pico.picoNumber}: ${pico.picoQuestion}`,
        picoNumber: pico.picoNumber,
        picoQuestion: pico.picoQuestion,
        currentGrade: computedGrade,
        currentText: rec.statement,
        strength: rec.strength,
        quality: rec.quality,
        expertConsensusStatement: rec.expertConsensusStatement?.trim() || undefined,
        voting: rec.voting?.trim() || undefined,
        drivingTrials: rec.drivingTrials || [],
        changeType: rec.changeType || "STANDARD",
        previousText: rec.expertConsensusStatement?.trim() || undefined,
        v3Labels: rec.v3Labels,
      });
    });
  });
  return changes;
}

export function EditGuidelineModal({
  isOpen,
  onClose,
  docId,
  item,
  guidelineDoc,
  onSuccess,
  darkMode,
  adminToken,
  syncV2Enabled = true,
  blocksByUid,
  blocksBySlug,
  protocolsBySlug,
  onApplyLocalBlockWrite,
}: EditGuidelineModalProps) {
  // Active Tab: metadata | takeaways | recommendations
  const [activeTab, setActiveTab] = useState<"metadata" | "takeaways" | "recommendations">(
    item ? "recommendations" : "metadata"
  );

  // Guideline Metadata State
  const [docTitle, setDocTitle] = useState("");
  const [docSociety, setDocSociety] = useState("");
  const [docYear, setDocYear] = useState("");
  const [docSubspecialty, setDocSubspecialty] = useState<SubspecialtyType>("Stroke");
  const [docSummary, setDocSummary] = useState("");
  const [docOfficialUrl, setDocOfficialUrl] = useState("");

  // Top Takeaways State
  const [takeaways, setTakeaways] = useState<string[]>([]);
  const [newTakeawayText, setNewTakeawayText] = useState("");

  // Form Format mode (Extensible association forms: AHA, ESO, Standard. Auto option removed)
  const [formFormat, setFormFormat] = useState<GuidelineFormFormat>("AHA");
  const [hasUserManuallySelectedFormat, setHasUserManuallySelectedFormat] = useState<boolean>(false);

  // Search filter
  const [searchTerm, setSearchTerm] = useState("");

  // ESO PICO State (Multiple recommendations per PICO)
  const [esoPicos, setEsoPicos] = useState<EsoPicoDraft[]>([]);
  const [selectedPicoIndex, setSelectedPicoIndex] = useState<number>(0);

  // Standard / AHA State (Flat recommendations)
  const [practiceChanges, setPracticeChanges] = useState<PracticeChangeDetail[]>([]);
  const [selectedRecIndex, setSelectedRecIndex] = useState<number>(0);
  const [recCategory, setRecCategory] = useState("");
  const [recTopic, setRecTopic] = useState("");
  const [recStatement, setRecStatement] = useState("");
  const [recTrialsStr, setRecTrialsStr] = useState("");
  const [recChangeType, setRecChangeType] = useState<PracticeChangeDetail["changeType"]>("STANDARD");
  const [recPrevGrade, setRecPrevGrade] = useState("");
  const [recPrevText, setRecPrevText] = useState("");
  const [ahaCor, setAhaCor] = useState<string>("1");
  const [ahaLoe, setAhaLoe] = useState<string>("A");
  const [generalGrade, setGeneralGrade] = useState("");

  // V3 Taxonomy & Labels State (Dual-Primary Axis)
  const [isCustomizingV3, setIsCustomizingV3] = useState<boolean>(false);
  const [customConditionId, setCustomConditionId] = useState<string>("");
  const [customConditionSubTags, setCustomConditionSubTags] = useState<string[]>([]);
  const [customDomain, setCustomDomain] = useState<"diagnosis" | "treatment" | "prevention">("treatment");
  const [customTimeWindowId, setCustomTimeWindowId] = useState<string>("all");
  const [customInterventionTags, setCustomInterventionTags] = useState<string[]>([]);
  const [customDiagnosisTags, setCustomDiagnosisTags] = useState<string[]>([]);
  const [customDirection, setCustomDirection] = useState<"recommended" | "conditional" | "harm">("recommended");
  const [customTagInput, setCustomTagInput] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync v2 granular block state: 3s auto-save draft, HistoryPanel, and 409 ConflictDialog
  const [foundLocalDraft, setFoundLocalDraft] = useState<LocalBlockDraftRecord | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [historyBlockTarget, setHistoryBlockTarget] = useState<{
    uid: string;
    title: string;
    rev: number;
  } | null>(null);
  const [savedBlockOverrides, setSavedBlockOverrides] = useState<
    Record<string, NeuroGuideContentBlockRow>
  >({});
  const [blockSuccessMessage, setBlockSuccessMessage] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<{
    base: NeuroGuideContentBlockRow;
    mine: NeuroGuideBlockWriteInput;
    cloudRow: NeuroGuideContentBlockRow;
    submitting: boolean;
    error: string | null;
  } | null>(null);
  const lastDraftCheckUidRef = React.useRef<string | null>(null);

  // Drag & drop state for ESO recommendations (right pane)
  const [draggedRecIndex, setDraggedRecIndex] = useState<number | null>(null);
  const [dragOverRecIndex, setDragOverRecIndex] = useState<number | null>(null);
  const [isDraggingRecToPico, setIsDraggingRecToPico] = useState<boolean>(false);
  const [dragOverPicoKey, setDragOverPicoKey] = useState<string | null>(null);

  // Drag & drop state for reordering PICOs / Clinical Questions (left pane)
  const [draggedPicoIndex, setDraggedPicoIndex] = useState<number | null>(null);
  const [dragOverPicoIndex, setDragOverPicoIndex] = useState<number | null>(null);

  // Drag & drop state for Standard/AHA recommendations (left pane)
  const [draggedStandardRecIndex, setDraggedStandardRecIndex] = useState<number | null>(null);
  const [dragOverStandardRecIndex, setDragOverStandardRecIndex] = useState<number | null>(null);

  // ESO Recommendation V3 Label Editor state
  const [editingEsoRecIndex, setEditingEsoRecIndex] = useState<number | null>(null);
  const [esoCustomTagInput, setEsoCustomTagInput] = useState<string>("");

  // Active form flags
  const isEso = formFormat === "ESO";
  const isAha = formFormat === "AHA";
  const isStandard = formFormat === "STANDARD";

  // Handle switching between guideline forms with data synchronization
  const handleSwitchFormat = (newFormat: GuidelineFormFormat) => {
    if (newFormat === formFormat) return;
    setHasUserManuallySelectedFormat(true);

    // If switching from ESO to non-ESO (AHA or STANDARD), sync ESO PICOs to practiceChanges
    if (formFormat === "ESO" && newFormat !== "ESO") {
      const flattened = esoPicosToChanges(esoPicos);
      setPracticeChanges(flattened);
      if (flattened.length > 0) {
        loadStandardRecIntoForm(flattened[0]);
        setSelectedRecIndex(0);
      }
    }
    // If switching from non-ESO to ESO, sync current standard rec and convert to ESO PICOs
    else if (formFormat !== "ESO" && newFormat === "ESO") {
      syncStandardRecToMemory();
      const picos = changesToEsoPicos(practiceChanges);
      setEsoPicos(picos);
      setSelectedPicoIndex(0);
    }

    setFormFormat(newFormat);
  };

  // Sync state when modal opens or props change
  useEffect(() => {
    if (!isOpen) return;

    if (guidelineDoc) {
      setDocTitle(guidelineDoc.title || "");
      setDocSociety(guidelineDoc.society || "AHA/ASA");
      setDocYear(String(guidelineDoc.year || new Date().getFullYear()));
      setDocSubspecialty(guidelineDoc.subspecialty || "Stroke");
      setDocSummary(guidelineDoc.executiveSummary || guidelineDoc.executiveSummaryVi || "");
      setDocOfficialUrl(guidelineDoc.officialUrl || "");
      setTakeaways(guidelineDoc.topTakeaways || []);

      const list = guidelineDoc.allPracticeChanges || [];
      setPracticeChanges(list);

      // Initialize ESO PICOs
      const picos = changesToEsoPicos(list);
      setEsoPicos(picos);

      // Automatically analyze society & content to select appropriate form (AHA, ESO, or Standard)
      const detectedFmt = detectGuidelineFormFormat({
        society: guidelineDoc.society,
        title: guidelineDoc.title,
        docId: docId || guidelineDoc.id,
        hasPico: picos.length > 0 && picos.some((p) => p.recommendations.length > 0),
        hasCorLoe: list.some(
          (p) =>
            p.cor ||
            p.currentGrade?.toLowerCase().includes("class ") ||
            p.currentGrade?.toLowerCase().includes("cor ")
        ),
      });
      setFormFormat(detectedFmt);
      setHasUserManuallySelectedFormat(false);

      if (item) {
        // Find in ESO picos
        const pNumStr = String(item.picoNumber || "").trim();
        const foundPicoIdx = picos.findIndex(
          (p) =>
            (pNumStr && p.picoNumber === pNumStr) ||
            p.recommendations.some((r) => r.id === item.id || r.statement === item.currentText)
        );
        setSelectedPicoIndex(foundPicoIdx >= 0 ? foundPicoIdx : 0);

        // Find in Standard list
        const foundRecIdx = list.findIndex((r) => r.id === item.id);
        const idx = foundRecIdx >= 0 ? foundRecIdx : 0;
        setSelectedRecIndex(idx);
        loadStandardRecIntoForm(list[idx] || item);
        setActiveTab("recommendations");
      } else {
        setSelectedPicoIndex(0);
        setSelectedRecIndex(0);
        if (list.length > 0) {
          loadStandardRecIntoForm(list[0]);
        }
        setActiveTab("metadata");
      }
    } else if (item) {
      const isItemEso =
        item.currentGrade?.toLowerCase().includes("grade") ||
        item.topic?.toLowerCase().includes("pico") ||
        item.quality ||
        item.strength ||
        docId?.toLowerCase().includes("eso");

      if (isItemEso) {
        setDocSociety("ESO");
        setDocTitle("ESO Clinical Practice Guideline");
      }
      setPracticeChanges([item]);
      const picos = changesToEsoPicos([item]);
      setEsoPicos(picos);
      setSelectedPicoIndex(0);
      setSelectedRecIndex(0);
      loadStandardRecIntoForm(item);
      setActiveTab("recommendations");

      // Auto detect form for single recommendation item
      const detectedFmt = detectGuidelineFormFormat({
        society: isItemEso ? "ESO" : (item as any)?.society || docSociety,
        title: item.topic || docTitle,
        docId,
        hasPico: Boolean(item.picoNumber || item.topic?.toLowerCase().includes("pico")),
        hasCorLoe: Boolean(item.cor || item.currentGrade?.toLowerCase().includes("class ")),
      });
      setFormFormat(detectedFmt);
      setHasUserManuallySelectedFormat(false);
    }

    setErrorMessage(null);
  }, [isOpen, guidelineDoc, item]);

  useEffect(() => {
    if (!isOpen) {
      setSavedBlockOverrides({});
      setBlockSuccessMessage(null);
      return;
    }
    setSavedBlockOverrides({});
    setBlockSuccessMessage(null);
  }, [isOpen, docId, guidelineDoc?.id]);

  // Load a standard / AHA recommendation into flat form fields
  const loadStandardRecIntoForm = (rec: PracticeChangeDetail) => {
    if (!rec) return;
    setRecCategory(rec.category || "Recommendations");
    setRecTopic(rec.topic || "");
    setRecStatement(rec.currentText || "");
    setRecTrialsStr(rec.drivingTrials?.join(", ") || "");
    setRecChangeType(rec.changeType || "STANDARD");
    setRecPrevGrade(rec.previousGrade || "");
    setRecPrevText(rec.previousText || "");

    setAhaCor(parseAhaCor(rec.currentGrade));
    setAhaLoe(parseAhaLoe(rec.currentGrade));
    setGeneralGrade(rec.currentGrade || "Level A");

    if (rec.v3Labels && rec.v3Labels.isExplicit) {
      setIsCustomizingV3(true);
      setCustomConditionId(rec.v3Labels.conditionIds?.[0] || "");
      setCustomConditionSubTags(rec.v3Labels.conditionSubTags || []);
      setCustomDomain((rec.v3Labels.domains?.[0] as "diagnosis" | "treatment" | "prevention") || "treatment");
      setCustomTimeWindowId(rec.v3Labels.timeWindowIds?.[0] || "all");
      setCustomInterventionTags(rec.v3Labels.interventionTags || []);
      setCustomDiagnosisTags(rec.v3Labels.diagnosisTags || []);
      setCustomDirection(rec.v3Labels.direction || "recommended");
    } else {
      setIsCustomizingV3(false);
      if (rec.v3Labels) {
        setCustomConditionId(rec.v3Labels.conditionIds?.[0] || "");
        setCustomConditionSubTags(rec.v3Labels.conditionSubTags || []);
        setCustomDomain((rec.v3Labels.domains?.[0] as "diagnosis" | "treatment" | "prevention") || "treatment");
        setCustomTimeWindowId(rec.v3Labels.timeWindowIds?.[0] || "all");
        setCustomInterventionTags(rec.v3Labels.interventionTags || []);
        setCustomDiagnosisTags(rec.v3Labels.diagnosisTags || []);
        setCustomDirection(rec.v3Labels.direction || "recommended");
      } else {
        setCustomConditionId("");
        setCustomDomain("treatment");
        setCustomTimeWindowId("all");
        setCustomInterventionTags([]);
        setCustomDiagnosisTags([]);
        setCustomDirection("recommended");
      }
    }
    setCustomTagInput("");
  };

  const computedAutoV3Labels = useMemo<RecommendationV3Labels>(() => {
    const currentGrade = isAha ? `Class ${ahaCor}, Level ${ahaLoe}` : generalGrade;
    const trials = recTrialsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    return classifyRecommendationV3(
      {
        id: docId || guidelineDoc?.id || "doc",
        title: docTitle || guidelineDoc?.title || "",
        society: docSociety || guidelineDoc?.society || "AHA/ASA",
        year: parseInt(docYear, 10) || 2026,
        subspecialty: docSubspecialty,
      },
      {
        id: practiceChanges[selectedRecIndex]?.id || "rec-1",
        category: recCategory,
        topic: recTopic,
        currentText: recStatement,
        currentGrade,
        cor: isAha ? ahaCor : undefined,
        loe: isAha ? ahaLoe : undefined,
        drivingTrials: trials,
        v3Labels: undefined,
      }
    );
  }, [
    docId,
    guidelineDoc,
    docTitle,
    docSociety,
    docYear,
    docSubspecialty,
    practiceChanges,
    selectedRecIndex,
    recCategory,
    recTopic,
    recStatement,
    ahaCor,
    ahaLoe,
    generalGrade,
    isAha,
    recTrialsStr,
  ]);

  const activeV3Labels = useMemo<RecommendationV3Labels>(() => {
    if (isCustomizingV3) {
      const condId = customConditionId || computedAutoV3Labels.conditionIds[0] || "cond_ischemic_stroke";
      return {
        subspecialties: [docSubspecialty],
        conditionIds: [condId],
        conditionSubTags: customConditionSubTags,
        domains: [customDomain],
        diagnosisTags: customDiagnosisTags,
        timeWindowIds: customTimeWindowId && customTimeWindowId !== "all" ? [customTimeWindowId] : [],
        interventionTags: customInterventionTags,
        direction: customDirection,
        isExplicit: true,
        isFallbackCondition: false,
      };
    }
    return computedAutoV3Labels;
  }, [
    isCustomizingV3,
    customConditionId,
    customConditionSubTags,
    computedAutoV3Labels,
    docSubspecialty,
    customDomain,
    customDiagnosisTags,
    customTimeWindowId,
    customInterventionTags,
    customDirection,
  ]);

  const activeConditionId = activeV3Labels.conditionIds[0] || "cond_ischemic_stroke";
  const activeConditionObj = useMemo(() => {
    return (
      getConditionByIdV3(activeConditionId) ||
      CLINICAL_CONDITIONS_V3.find((c) => c.subspecialties.includes(docSubspecialty)) ||
      CLINICAL_CONDITIONS_V3[0]
    );
  }, [activeConditionId, docSubspecialty]);

  const availableConditions = useMemo(() => {
    const forSub = getConditionsForSubspecialtyV3(docSubspecialty);
    const others = CLINICAL_CONDITIONS_V3.filter(
      (c) => !c.subspecialties.includes(docSubspecialty)
    );
    return { forSub, others };
  }, [docSubspecialty]);

  const suggestedTags = useMemo<TaxonomyTagV3[]>(() => {
    if (!activeConditionObj) return [];
    const tags: TaxonomyTagV3[] = [];
    const seen = new Set<string>();

    const addList = (list: TaxonomyTagV3[] | undefined) => {
      if (!Array.isArray(list)) return;
      for (const t of list) {
        if (!seen.has(t.id)) {
          seen.add(t.id);
          tags.push(t);
        }
      }
    };

    const dom = isCustomizingV3 ? customDomain : activeV3Labels.domains[0] || "treatment";
    if (dom === "diagnosis") {
      addList(getAllDiagnosisTagsV3());
    } else if (dom === "treatment") {
      addList(activeConditionObj.treatment.drugs);
      addList(activeConditionObj.treatment.interventions);
      addList(activeConditionObj.treatment.otherCare);
    } else if (dom === "prevention") {
      addList(activeConditionObj.prevention.pharmacologicalProphylaxis);
      addList(activeConditionObj.prevention.proceduralDevice);
      addList(activeConditionObj.prevention.lifestyleRehabMonitoring);
    } else {
      addList(getAllDiagnosisTagsV3());
      addList(activeConditionObj.treatment.drugs);
      addList(activeConditionObj.treatment.interventions);
      addList(activeConditionObj.prevention.pharmacologicalProphylaxis);
    }

    return tags;
  }, [activeConditionObj, isCustomizingV3, customDomain, activeV3Labels.domains]);

  const handleAddCustomTag = (tagText?: string) => {
    const raw = (tagText || customTagInput).trim();
    if (!raw) return;
    const tagId = toCanonicalTagId(raw);
    const isDiag = (isCustomizingV3 ? customDomain : activeV3Labels.domains[0]) === "diagnosis";
    if (isDiag) {
      if (!customDiagnosisTags.includes(tagId)) {
        setCustomDiagnosisTags((prev) => [...prev, tagId]);
      }
    } else {
      if (!customInterventionTags.includes(tagId)) {
        setCustomInterventionTags((prev) => [...prev, tagId]);
      }
    }
    setCustomTagInput("");
  };

  const handleEnableCustomV3 = () => {
    setIsCustomizingV3(true);
    setCustomConditionId(activeV3Labels.conditionIds[0] || "cond_ischemic_stroke");
    setCustomConditionSubTags([...(activeV3Labels.conditionSubTags || [])]);
    setCustomDomain(activeV3Labels.domains[0] || "treatment");
    setCustomTimeWindowId(activeV3Labels.timeWindowIds[0] || "all");
    setCustomInterventionTags([...activeV3Labels.interventionTags]);
    setCustomDiagnosisTags([...activeV3Labels.diagnosisTags]);
    setCustomDirection(activeV3Labels.direction || "recommended");
  };

  const handleResetToAutoV3 = () => {
    setIsCustomizingV3(false);
    setCustomConditionId(computedAutoV3Labels.conditionIds[0] || "");
    setCustomConditionSubTags([...(computedAutoV3Labels.conditionSubTags || [])]);
    setCustomDomain(computedAutoV3Labels.domains[0] || "treatment");
    setCustomTimeWindowId(computedAutoV3Labels.timeWindowIds[0] || "all");
    setCustomInterventionTags([...computedAutoV3Labels.interventionTags]);
    setCustomDiagnosisTags([...computedAutoV3Labels.diagnosisTags]);
    setCustomDirection(computedAutoV3Labels.direction || "recommended");
  };

  const syncStandardRecToMemory = () => {
    if (practiceChanges.length === 0 || selectedRecIndex < 0 || selectedRecIndex >= practiceChanges.length) {
      return;
    }

    let computedGrade = generalGrade;
    if (isAha) {
      computedGrade = `Class ${ahaCor}, Level ${ahaLoe}`;
    }

    const trials = recTrialsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const updated: PracticeChangeDetail = {
      ...practiceChanges[selectedRecIndex],
      category: recCategory || "Recommendations",
      topic: recTopic || `Recommendation ${selectedRecIndex + 1}`,
      currentGrade: computedGrade,
      cor: isAha ? ahaCor : undefined,
      loe: isAha ? ahaLoe : undefined,
      currentText: recStatement,
      drivingTrials: trials,
      changeType: recChangeType,
      previousGrade: recPrevGrade || undefined,
      previousText: recPrevText || undefined,
      v3Labels: activeV3Labels,
    };

    const nextList = [...practiceChanges];
    nextList[selectedRecIndex] = updated;
    setPracticeChanges(nextList);
  };

  const buildCurrentStandardChangeDraft = (): PracticeChangeDetail | null => {
    if (practiceChanges.length === 0 || selectedRecIndex < 0 || selectedRecIndex >= practiceChanges.length) {
      return null;
    }
    const computedGrade = isAha ? `Class ${ahaCor}, Level ${ahaLoe}` : generalGrade;
    const trials = recTrialsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    return {
      ...practiceChanges[selectedRecIndex],
      category: recCategory || "Recommendations",
      topic: recTopic || `Recommendation ${selectedRecIndex + 1}`,
      currentGrade: computedGrade,
      cor: isAha ? ahaCor : undefined,
      loe: isAha ? ahaLoe : undefined,
      currentText: recStatement,
      drivingTrials: trials,
      changeType: recChangeType,
      previousGrade: recPrevGrade || undefined,
      previousText: recPrevText || undefined,
      v3Labels: activeV3Labels,
    };
  };

  const resolveBlockWithSource = (
    rec: PracticeChangeDetail | undefined,
    indexHint: number,
  ): { block: NeuroGuideContentBlockRow | null; isFallback: boolean } => {
    if (!syncV2Enabled || !rec) {
      return { block: null, isFallback: false };
    }

    const fromStore =
      blocksByUid && blocksBySlug && protocolsBySlug
        ? resolveRecommendationBlockForPracticeChange({
            docId: docId || guidelineDoc?.id || "",
            recId: rec.id,
            index: indexHint,
            sharedBlockKey: rec.sharedBlockKey,
            blockUidHint: (rec as PracticeChangeDetailWithBlockMeta)._blockUid,
            blocksByUid,
            blocksBySlug,
            protocolsBySlug,
          })
        : null;

    if (fromStore) {
      const override = savedBlockOverrides[fromStore.uid];
      if (override && override.rev >= fromStore.rev) {
        return { block: override, isFallback: false };
      }
      return { block: fromStore, isFallback: false };
    }

    const fallback = buildDeterministicFallbackBlockForPracticeChange({
      docId: docId || guidelineDoc?.id || "",
      rec,
      index: indexHint,
      guidelineDoc: guidelineDoc ?? {
        id: docId,
        society: docSociety,
        year: parseInt(docYear, 10) || 2026,
        title: docTitle,
        subspecialty: docSubspecialty,
      },
    });
    const override = savedBlockOverrides[fallback.uid];
    if (override) {
      return { block: override, isFallback: false };
    }
    return { block: fallback, isFallback: true };
  };

  const resolveBlockForRec = (
    rec: PracticeChangeDetail | undefined,
    indexHint: number,
  ): NeuroGuideContentBlockRow | null => {
    return resolveBlockWithSource(rec, indexHint).block;
  };

  const activeStandardBlockInfo = useMemo(() => {
    if (!syncV2Enabled || isEso) return { block: null, isFallback: false };
    return resolveBlockWithSource(practiceChanges[selectedRecIndex], selectedRecIndex);
  }, [
    syncV2Enabled,
    isEso,
    practiceChanges,
    selectedRecIndex,
    blocksByUid,
    blocksBySlug,
    protocolsBySlug,
    savedBlockOverrides,
    docId,
    guidelineDoc,
    docSociety,
    docYear,
    docTitle,
    docSubspecialty,
  ]);
  const activeStandardBlock = activeStandardBlockInfo.block;

  const activeFocusedEsoRecIdx = editingEsoRecIndex ?? 0;
  const activeEsoDraftChange = useMemo(() => {
    if (!syncV2Enabled || !isEso) return null;
    const curPico = esoPicos[selectedPicoIndex];
    const rec = curPico?.recommendations[activeFocusedEsoRecIdx];
    if (!curPico || !rec) return null;
    const computedGrade = `GRADE ${rec.strength} (Evidence: ${rec.quality}${rec.voting ? `, Voting: ${rec.voting}` : ""})`;
    return {
      id: rec.id || `rec-${curPico.picoNumber}-${activeFocusedEsoRecIdx + 1}`,
      category: curPico.category || "Recommendations",
      topic: `PICO ${curPico.picoNumber}: ${curPico.picoQuestion}`,
      picoNumber: curPico.picoNumber,
      picoQuestion: curPico.picoQuestion,
      currentGrade: computedGrade,
      currentText: rec.statement,
      strength: rec.strength,
      quality: rec.quality,
      expertConsensusStatement: rec.expertConsensusStatement?.trim() || undefined,
      voting: rec.voting?.trim() || undefined,
      drivingTrials: rec.drivingTrials || [],
      changeType: rec.changeType || "STANDARD",
      previousText: rec.expertConsensusStatement?.trim() || undefined,
      v3Labels: rec.v3Labels,
    } as PracticeChangeDetail;
  }, [syncV2Enabled, isEso, esoPicos, selectedPicoIndex, activeFocusedEsoRecIdx]);

  const activeEsoBlockInfo = useMemo(() => {
    if (!syncV2Enabled || !isEso || !activeEsoDraftChange) {
      return { block: null, isFallback: false };
    }
    const flatChangesBefore = esoPicos
      .slice(0, selectedPicoIndex)
      .reduce((sum, p) => sum + p.recommendations.length, 0);
    return resolveBlockWithSource(
      activeEsoDraftChange,
      flatChangesBefore + activeFocusedEsoRecIdx,
    );
  }, [
    syncV2Enabled,
    isEso,
    activeEsoDraftChange,
    esoPicos,
    selectedPicoIndex,
    activeFocusedEsoRecIdx,
    blocksByUid,
    blocksBySlug,
    protocolsBySlug,
    savedBlockOverrides,
    docId,
    guidelineDoc,
    docSociety,
    docYear,
    docTitle,
    docSubspecialty,
  ]);
  const activeEsoBlock = activeEsoBlockInfo.block;

  const activeSyncBlock = isEso ? activeEsoBlock : activeStandardBlock;

  const buildBlockWriteInputForChange = (
    block: NeuroGuideContentBlockRow,
    change: PracticeChangeDetail,
  ): NeuroGuideBlockWriteInput => {
    const cleanChange = stripRuntimeBlockMeta(change);
    const nextFacet = {
      ...structuredClone(block.data.facetIndex),
      recId: cleanChange.id || block.data.facetIndex.recId,
      ...(cleanChange.v3Labels
        ? {
            subspecialties: cleanChange.v3Labels.subspecialties,
            conditionIds: cleanChange.v3Labels.conditionIds,
            domains: cleanChange.v3Labels.domains,
            diagnosisTags: cleanChange.v3Labels.diagnosisTags,
            timeWindowIds: cleanChange.v3Labels.timeWindowIds,
            interventionTags: cleanChange.v3Labels.interventionTags,
            direction: cleanChange.v3Labels.direction,
            v3Labels: structuredClone(cleanChange.v3Labels),
          }
        : {}),
      ...(cleanChange.drivingTrials
        ? { citedTrialKeys: [...cleanChange.drivingTrials] }
        : {}),
    };

    const payloadKind =
      block.blockType === "shared_clinical_block"
        ? "shared_clinical_block"
        : "recommendation";

    return {
      blockKey: block.data.blockKey,
      blockType: payloadKind,
      payload: {
        kind: payloadKind,
        practiceChange: cleanChange,
      },
      facetIndex: nextFacet,
    };
  };

  // Detect unsaved local draft whenever active block changes
  useEffect(() => {
    if (!isOpen || !syncV2Enabled || !activeSyncBlock || typeof window === "undefined") {
      setFoundLocalDraft(null);
      lastDraftCheckUidRef.current = null;
      return;
    }
    if (lastDraftCheckUidRef.current === activeSyncBlock.uid) return;
    lastDraftCheckUidRef.current = activeSyncBlock.uid;
    const existing = findLatestLocalBlockDraftForUid(window.localStorage, activeSyncBlock.uid);
    if (existing) {
      setFoundLocalDraft(existing);
    } else {
      setFoundLocalDraft(null);
    }
  }, [isOpen, syncV2Enabled, activeSyncBlock?.uid]);

  // 3-second local draft auto-save loop
  useEffect(() => {
    if (!isOpen || !syncV2Enabled || !activeSyncBlock || typeof window === "undefined") {
      return;
    }
    const timer = window.setInterval(() => {
      const draftChange = isEso ? activeEsoDraftChange : buildCurrentStandardChangeDraft();
      if (!draftChange) return;
      const input = buildBlockWriteInputForChange(activeSyncBlock, draftChange);
      const saved = saveLocalBlockDraft(window.localStorage, {
        uid: activeSyncBlock.uid,
        baseRev: activeSyncBlock.rev,
        data: input,
      });
      if (saved) {
        setDraftSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      }
    }, NEUROGUIDE_DRAFT_AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  });

  const applySavedBlockRowToForm = (row: NeuroGuideContentBlockRow) => {
    const payload = row.data.payload;
    if (payload.kind !== "recommendation" && payload.kind !== "shared_clinical_block") {
      return;
    }
    const restoredChange = {
      ...structuredClone(payload.practiceChange),
      ...(row.data.facetIndex.v3Labels ? { v3Labels: structuredClone(row.data.facetIndex.v3Labels) } : {}),
    };
    if (isEso) {
      setEsoPicos((prev) =>
        prev.map((pico) => ({
          ...pico,
          recommendations: pico.recommendations.map((rec) =>
            rec.id === restoredChange.id
              ? {
                  ...rec,
                  statement: restoredChange.currentText || rec.statement,
                  strength: restoredChange.strength || rec.strength,
                  quality: restoredChange.quality || rec.quality,
                  voting: restoredChange.voting || rec.voting,
                  expertConsensusStatement:
                    restoredChange.expertConsensusStatement ?? rec.expertConsensusStatement,
                  drivingTrials: restoredChange.drivingTrials ?? rec.drivingTrials,
                  v3Labels: restoredChange.v3Labels ?? rec.v3Labels,
                }
              : rec,
          ),
        })),
      );
    } else {
      setPracticeChanges((prev) => {
        const idx = prev.findIndex((c) => c.id === restoredChange.id);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = restoredChange;
        if (idx === selectedRecIndex) {
          loadStandardRecIntoForm(restoredChange);
        }
        return next;
      });
    }
  };

  const handleRestoreFoundLocalDraft = () => {
    if (!foundLocalDraft) return;
    const payload = foundLocalDraft.data.payload;
    if (payload.kind === "recommendation" || payload.kind === "shared_clinical_block") {
      const pc = payload.practiceChange;
      if (isEso) {
        setEsoPicos((prev) =>
          prev.map((pico) => ({
            ...pico,
            recommendations: pico.recommendations.map((rec) =>
              rec.id === pc.id
                ? {
                    ...rec,
                    statement: pc.currentText || rec.statement,
                    strength: pc.strength || rec.strength,
                    quality: pc.quality || rec.quality,
                    voting: pc.voting || rec.voting,
                    expertConsensusStatement:
                      pc.expertConsensusStatement ?? rec.expertConsensusStatement,
                    drivingTrials: pc.drivingTrials ?? rec.drivingTrials,
                    v3Labels: pc.v3Labels ?? rec.v3Labels,
                  }
                : rec,
            ),
          })),
        );
      } else {
        loadStandardRecIntoForm({
          ...pc,
          ...(foundLocalDraft.data.facetIndex.v3Labels
            ? { v3Labels: foundLocalDraft.data.facetIndex.v3Labels }
            : {}),
        });
      }
    }
    setFoundLocalDraft(null);
  };

  const handleDiscardFoundLocalDraft = () => {
    if (!activeSyncBlock || typeof window === "undefined") return;
    clearLocalBlockDraftsForUid(window.localStorage, activeSyncBlock.uid);
    setFoundLocalDraft(null);
  };

  const buildUpdatedDocAfterBlockSave = (
    savedRow: NeuroGuideContentBlockRow,
  ): GuidelineDoc | undefined => {
    if (!guidelineDoc) return undefined;
    const payload = savedRow.data.payload;
    if (payload.kind !== "recommendation" && payload.kind !== "shared_clinical_block") {
      return undefined;
    }
    const savedPc: PracticeChangeDetailWithBlockMeta = {
      ...structuredClone(payload.practiceChange),
      ...(savedRow.data.facetIndex.v3Labels
        ? { v3Labels: structuredClone(savedRow.data.facetIndex.v3Labels) }
        : {}),
      _blockUid: savedRow.uid,
      _blockRev: savedRow.rev,
      _blockSlug: savedRow.slug,
    };
    const baseList = isEso ? esoPicosToChanges(esoPicos) : practiceChanges;
    let matched = false;
    const nextList = baseList.map((entry) => {
      const entryMeta = entry as PracticeChangeDetailWithBlockMeta;
      if (entryMeta._blockUid === savedRow.uid || entry.id === savedPc.id) {
        matched = true;
        return savedPc;
      }
      return entry;
    });
    if (!matched) {
      nextList.push(savedPc);
    }
    return {
      ...guidelineDoc,
      allPracticeChanges: nextList,
    };
  };

  const handleSaveSingleBlock = async (
    targetBlock: NeuroGuideContentBlockRow,
    changeDraft: PracticeChangeDetail,
    isFallbackSource = false,
  ) => {
    const token = adminToken || getStoredAdminToken();
    if (!token) {
      setErrorMessage("Admin privileges required. Please log in as Admin to save block changes.");
      return;
    }

    const mineInput = buildBlockWriteInputForChange(targetBlock, changeDraft);
    if (typeof window !== "undefined") {
      saveLocalBlockDraft(window.localStorage, {
        uid: targetBlock.uid,
        baseRev: targetBlock.rev,
        data: mineInput,
      });
    }

    setIsLoading(true);
    setErrorMessage(null);
    setBlockSuccessMessage(null);

    const putBlock = async (expectedRev: number) => {
      const res = await fetch(
        `/api/neuroguide/sync/blocks/${encodeURIComponent(targetBlock.uid)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAdminHeaders(token),
          },
          body: JSON.stringify({
            data: mineInput,
            expectedRev,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      return { res, json };
    };

    try {
      let { res, json } = await putBlock(targetBlock.rev);

      if (res.status === 409 && json?.code === "REV_CONFLICT" && json.current) {
        const cloudRow = json.current as NeuroGuideContentBlockRow;
        const cloudPayload = cloudRow.data?.payload;
        const origDocChange = guidelineDoc?.allPracticeChanges?.find(
          (c) =>
            (c as PracticeChangeDetailWithBlockMeta)._blockUid === targetBlock.uid ||
            c.id === changeDraft.id,
        );

        const cloudMatchesOrig =
          isFallbackSource &&
          origDocChange &&
          cloudPayload &&
          (cloudPayload.kind === "recommendation" ||
            cloudPayload.kind === "shared_clinical_block") &&
          deepEqualSync(
            stripRuntimeBlockMeta(cloudPayload.practiceChange),
            stripRuntimeBlockMeta(origDocChange),
          );

        if (cloudMatchesOrig) {
          ({ res, json } = await putBlock(cloudRow.rev));
        } else {
          setConflictState({
            base: isFallbackSource ? cloudRow : targetBlock,
            mine: mineInput,
            cloudRow,
            submitting: false,
            error: null,
          });
          return;
        }
      }

      if (res.status === 409 && json?.code === "REV_CONFLICT" && json.current) {
        setConflictState({
          base: targetBlock,
          mine: mineInput,
          cloudRow: json.current as NeuroGuideContentBlockRow,
          submitting: false,
          error: null,
        });
        return;
      }

      if (!res.ok || !json?.row) {
        setErrorMessage(json?.error || `Failed to save block (${res.status}).`);
        return;
      }

      const savedRow = json.row as NeuroGuideContentBlockRow;
      setSavedBlockOverrides((prev) => ({ ...prev, [savedRow.uid]: savedRow }));
      await onApplyLocalBlockWrite?.(savedRow);
      applySavedBlockRowToForm(savedRow);
      if (typeof window !== "undefined") {
        clearLocalBlockDraftsForUid(window.localStorage, targetBlock.uid);
      }
      setFoundLocalDraft(null);
      setBlockSuccessMessage(
        `✓ Đã lưu khuyến cáo (rev ${savedRow.rev}) lên Cloud thành công!`,
      );
      onSuccess(buildUpdatedDocAfterBlockSave(savedRow));
    } catch {
      setErrorMessage("Network error while saving block to Sync v2.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveBlockConflict = async (
    mode: BlockConflictResolutionMode,
    fieldChoices: Record<string, "mine" | "cloud">,
  ) => {
    if (!conflictState) return;
    const token = adminToken || getStoredAdminToken();
    if (!token) {
      setConflictState((prev) =>
        prev ? { ...prev, error: "Admin session expired. Please re-login." } : null,
      );
      return;
    }

    const resolved = resolveBlockConflictChoice({
      mode,
      base: conflictState.base,
      mine: conflictState.mine,
      cloud: conflictState.cloudRow,
      fieldChoices,
    });

    if (mode === "use_cloud") {
      setSavedBlockOverrides((prev) => ({
        ...prev,
        [conflictState.cloudRow.uid]: conflictState.cloudRow,
      }));
      await onApplyLocalBlockWrite?.(conflictState.cloudRow);
      applySavedBlockRowToForm(conflictState.cloudRow);
      if (typeof window !== "undefined") {
        clearLocalBlockDraftsForUid(window.localStorage, conflictState.cloudRow.uid);
      }
      setFoundLocalDraft(null);
      setBlockSuccessMessage(
        `✓ Đã cập nhật theo bản Cloud (rev ${conflictState.cloudRow.rev}).`,
      );
      onSuccess(buildUpdatedDocAfterBlockSave(conflictState.cloudRow));
      setConflictState(null);
      return;
    }

    if (mode === "smart_merge" && resolved.unresolvedPaths.length > 0) {
      setConflictState((prev) =>
        prev
          ? {
              ...prev,
              error: `Choose Mine or Cloud for ${resolved.unresolvedPaths.length} remaining field(s).`,
            }
          : null,
      );
      return;
    }

    setConflictState((prev) => (prev ? { ...prev, submitting: true, error: null } : null));
    try {
      const res = await fetch(
        `/api/neuroguide/sync/blocks/${encodeURIComponent(conflictState.cloudRow.uid)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAdminHeaders(token),
          },
          body: JSON.stringify({
            data: resolved.nextInput,
            expectedRev: resolved.expectedRev,
          }),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json?.code === "REV_CONFLICT" && json.current) {
        setConflictState((prev) =>
          prev
            ? {
                ...prev,
                cloudRow: json.current as NeuroGuideContentBlockRow,
                submitting: false,
                error: "Cloud updated again while resolving. Please review new Cloud revision.",
              }
            : null,
        );
        return;
      }
      if (!res.ok || !json?.row) {
        setConflictState((prev) =>
          prev
            ? { ...prev, submitting: false, error: json?.error || "Conflict resolution failed." }
            : null,
        );
        return;
      }

      const savedRow = json.row as NeuroGuideContentBlockRow;
      setSavedBlockOverrides((prev) => ({ ...prev, [savedRow.uid]: savedRow }));
      await onApplyLocalBlockWrite?.(savedRow);
      applySavedBlockRowToForm(savedRow);
      if (typeof window !== "undefined") {
        clearLocalBlockDraftsForUid(window.localStorage, savedRow.uid);
      }
      setFoundLocalDraft(null);
      setConflictState(null);
      setBlockSuccessMessage(
        `✓ Đã hợp nhất và lưu khuyến cáo (rev ${savedRow.rev}) lên Cloud thành công!`,
      );
      onSuccess(buildUpdatedDocAfterBlockSave(savedRow));
    } catch {
      setConflictState((prev) =>
        prev ? { ...prev, submitting: false, error: "Network error resolving conflict." } : null,
      );
    }
  };

  // --- ESO PICO Handlers ---
  const updateCurrentPicoMeta = (patch: Partial<EsoPicoDraft>) => {
    setEsoPicos((prev) => {
      const next = [...prev];
      if (!next[selectedPicoIndex]) return prev;
      next[selectedPicoIndex] = { ...next[selectedPicoIndex], ...patch };
      return next;
    });
  };

  const updateEsoRec = (recIdx: number, patch: Partial<EsoRecDraft>) => {
    setEsoPicos((prev) => {
      const next = [...prev];
      const curPico = next[selectedPicoIndex];
      if (!curPico) return prev;
      const nextRecs = [...curPico.recommendations];
      if (!nextRecs[recIdx]) return prev;
      nextRecs[recIdx] = { ...nextRecs[recIdx], ...patch };
      next[selectedPicoIndex] = { ...curPico, recommendations: nextRecs };
      return next;
    });
  };

  const handleAddRecToCurrentPico = () => {
    setEsoPicos((prev) => {
      const next = [...prev];
      const curPico = next[selectedPicoIndex];
      if (!curPico) return prev;
      const newRec: EsoRecDraft = {
        id: `rec-${curPico.picoNumber}-${Date.now().toString().slice(-4)}`,
        statement: "",
        strength: "Weak for intervention",
        quality: "Low",
        expertConsensusStatement: "",
        voting: "Vote: 10/10",
        drivingTrials: [],
        changeType: "NEW",
      };
      next[selectedPicoIndex] = {
        ...curPico,
        recommendations: [...curPico.recommendations, newRec],
      };
      return next;
    });
  };

  const handleRemoveRecFromCurrentPico = (recIdx: number) => {
    if (!window.confirm("Are you sure you want to remove this recommendation from this PICO?")) return;
    setEsoPicos((prev) => {
      const next = [...prev];
      const curPico = next[selectedPicoIndex];
      if (!curPico || curPico.recommendations.length <= 1) return prev;
      const nextRecs = curPico.recommendations.filter((_, idx) => idx !== recIdx);
      next[selectedPicoIndex] = { ...curPico, recommendations: nextRecs };
      return next;
    });
  };

  const handleAddNewPico = () => {
    const nextNum = `${esoPicos.length + 1}`;
    const newPico: EsoPicoDraft = {
      picoKey: `PICO-${nextNum}`,
      picoNumber: nextNum,
      picoQuestion: `In hospitalised patients with acute stroke, does intervention improve outcome?`,
      category: "Clinical Recommendations",
      recommendations: [
        {
          id: `rec-${nextNum}-1`,
          statement: "",
          strength: "Weak for intervention",
          quality: "Moderate",
          expertConsensusStatement: "",
          voting: "Vote: 10/10",
          drivingTrials: [],
          changeType: "NEW",
        },
      ],
    };
    setEsoPicos((prev) => [...prev, newPico]);
    setSelectedPicoIndex(esoPicos.length);
  };

  const getEffectiveEsoRecV3 = (rec: EsoRecDraft): RecommendationV3Labels => {
    if (rec.v3Labels) return rec.v3Labels;
    return classifyRecommendationV3(
      {
        id: docId || guidelineDoc?.id || "eso-guideline",
        title: docTitle || guidelineDoc?.title || "",
        society: docSociety || guidelineDoc?.society || "ESO",
        year: parseInt(docYear, 10) || 2026,
        subspecialty: docSubspecialty,
      },
      {
        id: rec.id || "rec-1",
        currentText: rec.statement,
        strength: rec.strength,
        quality: rec.quality,
        drivingTrials: rec.drivingTrials,
        category: "Recommendations",
        topic: rec.statement.slice(0, 60),
        currentGrade: rec.strength || "",
      }
    );
  };

  const updateEsoRecV3 = (rIdx: number, patch: Partial<RecommendationV3Labels>) => {
    const curPico = esoPicos[selectedPicoIndex];
    if (!curPico) return;
    const curRec = curPico.recommendations[rIdx];
    if (!curRec) return;
    const baseV3 = getEffectiveEsoRecV3(curRec);
    const nextV3: RecommendationV3Labels = {
      ...baseV3,
      ...patch,
      isExplicit: true,
    };
    updateEsoRec(rIdx, { v3Labels: nextV3 });
  };

  const handleResetEsoRecV3 = (rIdx: number) => {
    const curPico = esoPicos[selectedPicoIndex];
    if (!curPico) return;
    const curRec = curPico.recommendations[rIdx];
    if (!curRec) return;
    const autoV3 = classifyRecommendationV3(
      {
        id: docId || guidelineDoc?.id || "eso-guideline",
        title: docTitle || guidelineDoc?.title || "",
        society: docSociety || guidelineDoc?.society || "ESO",
        year: parseInt(docYear, 10) || 2026,
        subspecialty: docSubspecialty,
      },
      {
        id: curRec.id || "rec-1",
        currentText: curRec.statement,
        strength: curRec.strength,
        quality: curRec.quality,
        drivingTrials: curRec.drivingTrials,
        category: "Recommendations",
        topic: curRec.statement.slice(0, 60),
        currentGrade: curRec.strength || "",
      }
    );
    updateEsoRec(rIdx, { v3Labels: { ...autoV3, isExplicit: false } });
  };

  const handleAddEsoCustomTag = (rIdx: number) => {
    const raw = esoCustomTagInput.trim();
    if (!raw) return;
    const tagId = toCanonicalTagId(raw);
    const curPico = esoPicos[selectedPicoIndex];
    if (!curPico) return;
    const curRec = curPico.recommendations[rIdx];
    if (!curRec) return;
    const v3 = getEffectiveEsoRecV3(curRec);
    const isDiag = v3.domains?.[0] === "diagnosis";
    if (isDiag) {
      if (!v3.diagnosisTags?.includes(tagId)) {
        updateEsoRecV3(rIdx, { diagnosisTags: [...(v3.diagnosisTags || []), tagId] });
      }
    } else {
      if (!v3.interventionTags?.includes(tagId)) {
        updateEsoRecV3(rIdx, { interventionTags: [...(v3.interventionTags || []), tagId] });
      }
    }
    setEsoCustomTagInput("");
  };

  const handleRemoveEsoRecTag = (rIdx: number, tagId: string) => {
    const curPico = esoPicos[selectedPicoIndex];
    if (!curPico) return;
    const curRec = curPico.recommendations[rIdx];
    if (!curRec) return;
    const v3 = getEffectiveEsoRecV3(curRec);
    updateEsoRecV3(rIdx, {
      interventionTags: (v3.interventionTags || []).filter((t) => t !== tagId),
      diagnosisTags: (v3.diagnosisTags || []).filter((t) => t !== tagId),
    });
  };

  const handleToggleEsoTag = (rIdx: number, tagId: string, isDiagnosis: boolean) => {
    const curPico = esoPicos[selectedPicoIndex];
    if (!curPico) return;
    const curRec = curPico.recommendations[rIdx];
    if (!curRec) return;
    const v3 = getEffectiveEsoRecV3(curRec);
    if (isDiagnosis) {
      const exists = (v3.diagnosisTags || []).includes(tagId);
      const next = exists ? v3.diagnosisTags.filter((t) => t !== tagId) : [...(v3.diagnosisTags || []), tagId];
      updateEsoRecV3(rIdx, { diagnosisTags: next });
    } else {
      const exists = (v3.interventionTags || []).includes(tagId);
      const next = exists ? v3.interventionTags.filter((t) => t !== tagId) : [...(v3.interventionTags || []), tagId];
      updateEsoRecV3(rIdx, { interventionTags: next });
    }
  };

  const handleDeletePico = (pIdx: number) => {
    if (!window.confirm("Are you sure you want to delete this PICO question and all its recommendations?")) return;
    setEsoPicos((prev) => {
      const next = prev.filter((_, idx) => idx !== pIdx);
      return next;
    });
    setSelectedPicoIndex((prev) => Math.max(0, prev - 1));
  };

  // Reorder ESO recommendation within current PICO
  const moveEsoRecWithinPico = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    setEsoPicos((prev) => {
      const next = [...prev];
      const curPico = next[selectedPicoIndex];
      if (!curPico || fromIdx >= curPico.recommendations.length || toIdx >= curPico.recommendations.length) return prev;
      const newRecs = [...curPico.recommendations];
      const [moved] = newRecs.splice(fromIdx, 1);
      newRecs.splice(toIdx, 0, moved);
      next[selectedPicoIndex] = { ...curPico, recommendations: newRecs };
      return next;
    });
  };

  // Move ESO recommendation to a different PICO / Clinical Question
  const moveEsoRecToAnotherPico = (recIdx: number, targetPicoIdx: number) => {
    if (recIdx < 0 || targetPicoIdx === selectedPicoIndex || targetPicoIdx < 0) return;
    setEsoPicos((prev) => {
      const next = [...prev];
      const sourcePico = next[selectedPicoIndex];
      const targetPico = next[targetPicoIdx];
      if (!sourcePico || !targetPico || recIdx >= sourcePico.recommendations.length) return prev;

      const sourceRecs = [...sourcePico.recommendations];
      const [movedRec] = sourceRecs.splice(recIdx, 1);

      // If source would be empty, give it a default empty recommendation template
      if (sourceRecs.length === 0) {
        sourceRecs.push({
          id: `rec-${sourcePico.picoNumber}-${Date.now().toString().slice(-4)}`,
          statement: "",
          strength: "Weak for intervention",
          quality: "Moderate",
          expertConsensusStatement: "",
          voting: "Vote: 10/10",
          drivingTrials: [],
          changeType: "NEW",
        });
      }

      const targetRecs = [...targetPico.recommendations, movedRec];

      next[selectedPicoIndex] = { ...sourcePico, recommendations: sourceRecs };
      next[targetPicoIdx] = { ...targetPico, recommendations: targetRecs };
      return next;
    });
    setSelectedPicoIndex(targetPicoIdx);
  };

  // Reorder PICOs / Clinical Questions
  const movePico = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    setEsoPicos((prev) => {
      if (fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setSelectedPicoIndex(toIdx);
  };

  // Reorder Standard/AHA Recommendations
  const moveStandardRec = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    syncStandardRecToMemory();
    setPracticeChanges((prev) => {
      if (fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      loadStandardRecIntoForm(moved);
      return next;
    });
    setSelectedRecIndex(toIdx);
  };

  // --- Standard / AHA Recommendation Handlers ---
  const handleSelectStandardRec = (newIndex: number) => {
    syncStandardRecToMemory();
    setSelectedRecIndex(newIndex);
    if (practiceChanges[newIndex]) {
      loadStandardRecIntoForm(practiceChanges[newIndex]);
    }
  };

  const handleAddNewStandardRec = () => {
    syncStandardRecToMemory();
    const newId = `rec-${Date.now().toString().slice(-5)}`;
    const newRec: PracticeChangeDetail = {
      id: newId,
      category: "Recommendations",
      topic: `Recommendation #${practiceChanges.length + 1}`,
      currentGrade: "Class 1, Level A",
      currentText: "",
      changeType: "NEW",
      drivingTrials: [],
    };
    const nextList = [...practiceChanges, newRec];
    setPracticeChanges(nextList);
    setSelectedRecIndex(nextList.length - 1);
    loadStandardRecIntoForm(newRec);
  };

  const handleDeleteStandardRec = (indexToDelete: number) => {
    if (!window.confirm("Are you sure you want to delete this recommendation from the guideline?")) return;
    const nextList = practiceChanges.filter((_, idx) => idx !== indexToDelete);
    setPracticeChanges(nextList);
    const newIdx = Math.max(0, indexToDelete - 1);
    setSelectedRecIndex(newIdx);
    if (nextList.length > 0 && nextList[newIdx]) {
      loadStandardRecIntoForm(nextList[newIdx]);
    }
  };

  // --- Takeaways Handlers ---
  const handleAddTakeaway = () => {
    if (!newTakeawayText.trim()) return;
    setTakeaways([...takeaways, newTakeawayText.trim()]);
    setNewTakeawayText("");
  };

  const handleRemoveTakeaway = (idxToRemove: number) => {
    setTakeaways(takeaways.filter((_, idx) => idx !== idxToRemove));
  };

  const handleTakeawayChange = (idx: number, text: string) => {
    const updated = [...takeaways];
    updated[idx] = text;
    setTakeaways(updated);
  };

  // --- Delete Guideline Entirely ---
  const handleDeleteFromModal = async () => {
    const title = docTitle || guidelineDoc?.title || docId;
    const confirmDel = window.confirm(
      `Are you sure you want to permanently DELETE guideline:\n\n"${title}"?\n\nThis will remove the guideline from all clinical repositories.`
    );
    if (!confirmDel) return;

    const token = adminToken || getStoredAdminToken();
    if (!token) {
      setErrorMessage("Admin privileges required. Please log in as Admin to delete guideline.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/neuroguide/delete-guideline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(token),
        },
        body: JSON.stringify({ guideline_id: docId, title }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        onSuccess();
        onClose();
      } else {
        if (res.status === 401) {
          setErrorMessage("Admin session expired or invalid. Please re-login to Admin.");
        } else {
          setErrorMessage(data.error || "Failed to delete guideline.");
        }
      }
    } catch {
      setErrorMessage("Network error while deleting guideline.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Save All Changes ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const token = adminToken || getStoredAdminToken();
    if (!token) {
      setErrorMessage("Admin privileges required. Please log in as Admin to save changes.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    let finalizedChanges: PracticeChangeDetail[] = [];
    if (isEso) {
      finalizedChanges = esoPicosToChanges(esoPicos).map((c) => stripRuntimeBlockMeta(c));
    } else {
      syncStandardRecToMemory();
      const liveDraft = buildCurrentStandardChangeDraft();
      const mergedList = practiceChanges.map((itemRow, idx) =>
        idx === selectedRecIndex && liveDraft ? liveDraft : itemRow,
      );
      finalizedChanges = mergedList.map((c) => stripRuntimeBlockMeta(c));
    }

    try {
      const payload = {
        action: "EDIT_GUIDELINE",
        doc_id: docId || guidelineDoc?.id,
        original_title: guidelineDoc?.title || "",
        title: docTitle.trim(),
        society: docSociety.trim(),
        year: parseInt(docYear, 10) || new Date().getFullYear(),
        subspecialty: docSubspecialty,
        executiveSummary: docSummary,
        officialUrl: docOfficialUrl,
        topTakeaways: takeaways,
        allPracticeChanges: finalizedChanges,
      };

      const res = await fetch("/api/neuroguide/review-queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(token),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        if (syncV2Enabled && typeof window !== "undefined") {
          if (activeSyncBlock) {
            clearLocalBlockDraftsForUid(window.localStorage, activeSyncBlock.uid);
          }
          for (let i = 0; i < finalizedChanges.length; i++) {
            const b = resolveBlockForRec(finalizedChanges[i], i);
            if (b) clearLocalBlockDraftsForUid(window.localStorage, b.uid);
          }
        }
        setFoundLocalDraft(null);
        onSuccess(data.guideline);
        onClose();
      } else {
        if (res.status === 401) {
          setErrorMessage("Admin session expired or invalid. Please re-login to Admin.");
        } else {
          setErrorMessage(data.error || "Failed to save guideline updates.");
        }
      }
    } catch {
      setErrorMessage("Network error while saving guideline changes.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered ESO PICOs
  const filteredEsoPicos = useMemo(() => {
    if (!searchTerm.trim()) return esoPicos;
    const term = searchTerm.toLowerCase();
    return esoPicos.filter(
      (p) =>
        p.picoNumber.toLowerCase().includes(term) ||
        p.picoQuestion.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.recommendations.some(
          (r) =>
            r.statement.toLowerCase().includes(term) ||
            r.strength.toLowerCase().includes(term) ||
            (r.expertConsensusStatement && r.expertConsensusStatement.toLowerCase().includes(term))
        )
    );
  }, [esoPicos, searchTerm]);

  // Filtered Standard Recommendations
  const filteredStandardRecs = useMemo(() => {
    if (!searchTerm.trim()) return practiceChanges;
    const term = searchTerm.toLowerCase();
    return practiceChanges.filter(
      (r) =>
        r.topic.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        r.currentText.toLowerCase().includes(term) ||
        r.currentGrade.toLowerCase().includes(term)
    );
  }, [practiceChanges, searchTerm]);

  if (!isOpen) return null;

  const currentPico = esoPicos[selectedPicoIndex];
  const totalEsoRecommendationsCount = esoPicos.reduce((acc, p) => acc + p.recommendations.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div
        className={`w-[96vw] max-w-7xl h-[94vh] max-h-[960px] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* HEADER */}
        <div className="px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Pencil className="w-5 h-5 text-[#C25934] dark:text-orange-400 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold truncate">
                Edit Guideline: {cleanGuidelineTitle(docTitle || guidelineDoc?.title) || "Clinical Practice Guideline"}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    isEso
                      ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                      : isAha
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isEso ? "bg-blue-500" : isAha ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                    aria-hidden="true"
                  />
                  {isEso
                    ? "ESO GRADE (PICO) FORMAT"
                    : isAha
                    ? "AHA/ASA (COR & LOE) FORMAT"
                    : `STANDARD FORMAT (${docSociety || "Standard"})`}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {isEso ? `${esoPicos.length} PICOs (${totalEsoRecommendationsCount} recommendations)` : `${practiceChanges.length} recommendations`} • {takeaways.length} key takeaways
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Form Format Selector (Extensible association forms: ESO, AHA, Standard without Auto) */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px]">
              {GUIDELINE_FORMS.map((fmt) => {
                const isSelected = formFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => handleSwitchFormat(fmt.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      isSelected ? fmt.activeClasses : fmt.inactiveClasses
                    }`}
                    title={fmt.description}
                  >
                    {fmt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1.5 rounded-lg"
              title="Close window"
              aria-label="Close window"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 flex-shrink-0 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* BLOCK SAVE CONFIRMATION NOTIFICATION */}
        {blockSuccessMessage && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 flex-shrink-0">
            <span>{blockSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setBlockSuccessMessage(null)}
              className="text-emerald-700 dark:text-emerald-300 font-extrabold p-1 cursor-pointer"
              aria-label="Dismiss block notification"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* LOCAL DRAFT RECOVERY BANNER (SYNC V2) */}
        {syncV2Enabled && foundLocalDraft && (
          <div
            role="status"
            className="mx-5 mt-3 p-3 rounded-xl text-xs bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700 flex flex-wrap items-center justify-between gap-2 flex-shrink-0"
          >
            <div>
              <span className="font-extrabold">Unsaved local draft found</span>
              {foundLocalDraft.savedAt && (
                <span className="ml-2 opacity-80">
                  (saved {new Date(foundLocalDraft.savedAt).toLocaleTimeString()} · rev{" "}
                  {foundLocalDraft.baseRev})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestoreFoundLocalDraft}
                className="min-h-[36px] px-3 py-1 rounded-lg font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                Restore Draft
              </button>
              <button
                type="button"
                onClick={handleDiscardFoundLocalDraft}
                className="min-h-[36px] px-3 py-1 rounded-lg font-bold border border-amber-400 dark:border-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="px-5 pt-3 border-b dark:border-slate-800 flex items-center gap-2 text-xs font-bold bg-slate-50/50 dark:bg-slate-950/30 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              if (!isEso) syncStandardRecToMemory();
              setActiveTab("metadata");
            }}
            className={`px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "metadata"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
            <span>1. General Information &amp; Scope</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isEso) syncStandardRecToMemory();
              setActiveTab("takeaways");
            }}
            className={`px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "takeaways"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>2. Key Takeaways ({takeaways.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("recommendations");
            }}
            className={`px-3.5 py-2 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "recommendations"
                ? "border-amber-500 text-amber-600 dark:text-amber-400 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            <span>
              3. {isEso ? `PICO Questions & Recommendations (${esoPicos.length})` : `Recommendations (${practiceChanges.length})`}
            </span>
          </button>
        </div>

        {/* MODAL CONTENT BODY */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden text-xs">
          {/* TAB 1: METADATA */}
          {activeTab === "metadata" && (
              <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
                <div className="space-y-4 max-w-6xl mx-auto w-full">
                  <div>
                    <label className="block font-bold mb-1.5 text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-[#C25934] dark:text-orange-400" aria-hidden="true" />
                        <span>Guideline Title:</span>
                      </span>
                      <span className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 shadow-2xs">
                        <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Cloud Synced</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="e.g. 2025 ESO guideline on blood pressure management in acute ischaemic stroke and intracerebral haemorrhage"
                      className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 shadow-2xs ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Medical Society:
                      </label>
                      <input
                        type="text"
                        required
                        value={docSociety}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDocSociety(val);
                          if (!hasUserManuallySelectedFormat) {
                            const detected = detectGuidelineFormFormat({
                              society: val,
                              title: docTitle,
                              docId,
                              hasPico: esoPicos.length > 0 && esoPicos.some((p) => p.recommendations.length > 0),
                              hasCorLoe: practiceChanges.some(
                                (p) => p.cor || p.currentGrade?.toLowerCase().includes("class ")
                              ),
                            });
                            setFormFormat(detected);
                          }
                        }}
                        placeholder="e.g. ESO, AHA/ASA, AAN..."
                        className={`w-full p-2.5 rounded-xl border font-medium ${
                          darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Publication Year:
                      </label>
                      <input
                        type="number"
                        required
                        value={docYear}
                        onChange={(e) => setDocYear(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border font-medium ${
                          darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                        Subspecialty:
                      </label>
                      <select
                        value={docSubspecialty}
                        onChange={(e) => setDocSubspecialty(e.target.value as SubspecialtyType)}
                        className={`w-full p-2.5 rounded-xl border font-bold ${
                          darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        {NEUROLOGY_SUBSPECIALTIES.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Executive Summary &amp; Clinical Scope:
                    </label>
                    <AutoResizeTextarea
                      minRows={4}
                      value={docSummary}
                      onChange={(e) => setDocSummary(e.target.value)}
                      placeholder="Describe clinical scope, target patient populations, and overall objectives..."
                      className={`w-full p-2.5 rounded-xl border font-medium leading-relaxed ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                      Official URL / Source:
                    </label>
                    <input
                      type="text"
                      value={docOfficialUrl}
                      onChange={(e) => setDocOfficialUrl(e.target.value)}
                      placeholder="https://journals.sagepub.com/doi/... or https://pubmed.ncbi.nlm.nih.gov/..."
                      className={`w-full p-2.5 rounded-xl border font-medium font-mono text-[11px] ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: TAKEAWAYS */}
            {activeTab === "takeaways" && (
              <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
                <div className="space-y-4 max-w-6xl mx-auto w-full">
                  <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                        <span>Top Take-Home Messages</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Core clinical takeaways that clinicians must master from this guideline.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      {takeaways.length} items
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {takeaways.map((takeaway, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      >
                        <span className="w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[11px] mt-1">
                          {idx + 1}
                        </span>
                        <AutoResizeTextarea
                          minRows={2}
                          value={takeaway}
                          onChange={(e) => handleTakeawayChange(idx, e.target.value)}
                          className={`flex-1 p-2 rounded-lg border font-medium leading-relaxed ${
                            darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTakeaway(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg cursor-pointer transition-colors"
                          title="Remove this takeaway"
                          aria-label="Remove this takeaway"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ))}

                    {takeaways.length === 0 && (
                      <p className="text-slate-400 italic text-center py-6">
                        No key takeaways added yet. Add your first takeaway below.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={newTakeawayText}
                      onChange={(e) => setNewTakeawayText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTakeaway();
                        }
                      }}
                      placeholder="Enter new key takeaway message..."
                      className={`flex-1 p-2.5 rounded-xl border font-medium ${
                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleAddTakeaway}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Add Takeaway</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* TAB 3: RECOMMENDATIONS MANAGER */}
          {activeTab === "recommendations" && (
            <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-hidden">
              {isEso ? (
                /* ==============================================================
                   ESO PICO MANAGER: 1 PICO with multiple recommendations inside
                   ============================================================== */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 h-full min-h-0">
                  {/* LEFT COLUMN: LIST OF PICOS */}
                  <div className="md:col-span-4 flex flex-col h-full min-h-0 border rounded-xl overflow-hidden dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="p-2.5 border-b dark:border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
                      <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        PICO Questions ({esoPicos.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddNewPico}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Add a new PICO Question"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Add PICO</span>
                      </button>
                    </div>

                    <div className="p-2 border-b dark:border-slate-800 flex-shrink-0">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search PICO questions or statements..."
                          className={`w-full pl-8 pr-2.5 py-1.5 rounded-lg border text-xs ${
                            darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar">
                      {filteredEsoPicos.map((pico) => {
                        const realIndex = esoPicos.findIndex((p) => p.picoKey === pico.picoKey);
                        const isSelected = realIndex === selectedPicoIndex;
                        const isTargetForRecDrop = isDraggingRecToPico && dragOverPicoKey === pico.picoKey;
                        const isPicoDragging = draggedPicoIndex === realIndex;
                        const isPicoDragOver = dragOverPicoIndex === realIndex;

                        return (
                          <div
                            key={pico.picoKey}
                            draggable={!isDraggingRecToPico}
                            onDragStart={(e) => {
                              if (!isDraggingRecToPico) {
                                e.dataTransfer.setData("text/plain", `pico:${realIndex}`);
                                e.dataTransfer.effectAllowed = "move";
                                setDraggedPicoIndex(realIndex);
                              }
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (isDraggingRecToPico) {
                                if (dragOverPicoKey !== pico.picoKey) {
                                  setDragOverPicoKey(pico.picoKey);
                                }
                              } else if (draggedPicoIndex !== null && dragOverPicoIndex !== realIndex) {
                                setDragOverPicoIndex(realIndex);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverPicoKey === pico.picoKey) {
                                setDragOverPicoKey(null);
                              }
                              if (dragOverPicoIndex === realIndex) {
                                setDragOverPicoIndex(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (isDraggingRecToPico && draggedRecIndex !== null) {
                                if (realIndex !== selectedPicoIndex) {
                                  moveEsoRecToAnotherPico(draggedRecIndex, realIndex);
                                }
                              } else if (draggedPicoIndex !== null && draggedPicoIndex !== realIndex) {
                                movePico(draggedPicoIndex, realIndex);
                              }
                              setDraggedRecIndex(null);
                              setDragOverRecIndex(null);
                              setIsDraggingRecToPico(false);
                              setDragOverPicoKey(null);
                              setDraggedPicoIndex(null);
                              setDragOverPicoIndex(null);
                            }}
                            onDragEnd={() => {
                              setDraggedPicoIndex(null);
                              setDragOverPicoIndex(null);
                              setDragOverPicoKey(null);
                              setIsDraggingRecToPico(false);
                            }}
                            onClick={() => setSelectedPicoIndex(realIndex)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all relative ${
                              isTargetForRecDrop
                                ? "border-blue-500 bg-blue-500/20 ring-2 ring-blue-500 shadow-md scale-[1.02]"
                                : isPicoDragOver
                                ? "border-indigo-500 bg-indigo-500/15 ring-2 ring-indigo-400"
                                : isPicoDragging
                                ? "opacity-40 border-dashed border-slate-400"
                                : isSelected
                                ? "bg-blue-500/10 border-blue-500/50 shadow-2xs dark:bg-blue-500/15"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            {/* Visual cue when dragging a recommendation over this PICO */}
                            {isTargetForRecDrop && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center gap-1.5 bg-blue-600/95 text-white font-extrabold rounded-xl px-2 py-1 text-center shadow-lg text-[11px] animate-pulse">
                                <Inbox className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                <span>Drop here to move recommendation to PICO {pico.picoNumber}</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="Drag and drop to reorder PICO / Clinical Question"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVerticalIcon className="w-3.5 h-3.5" />
                                </div>
                                <span className="font-extrabold text-[11px] text-blue-700 dark:text-blue-400">
                                  PICO {pico.picoNumber}
                                </span>
                                <div className="flex items-center gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    disabled={realIndex === 0}
                                    onClick={() => movePico(realIndex, realIndex - 1)}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500 cursor-pointer"
                                    title="Move PICO up"
                                  >
                                    <ArrowUpIcon className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={realIndex === esoPicos.length - 1}
                                    onClick={() => movePico(realIndex, realIndex + 1)}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500 cursor-pointer"
                                    title="Move PICO down"
                                  >
                                    <ArrowDownIcon className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                                {pico.recommendations.length} rec{pico.recommendations.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                              {pico.picoQuestion || `(PICO ${pico.picoNumber})`}
                            </p>
                            {pico.recommendations[0]?.statement && (
                              <p className="text-slate-500 dark:text-slate-400 text-[10.5px] line-clamp-1 mt-1 italic">
                                1. {pico.recommendations[0].statement}
                              </p>
                            )}
                          </div>
                        );
                      })}

                      {esoPicos.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                          No PICO questions yet. Click <b>Add PICO</b> to create.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: PICO DETAILS & MULTIPLE RECOMMENDATIONS */}
                  <div className="md:col-span-8 flex flex-col h-full min-h-0 border rounded-xl dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    {currentPico ? (
                      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {/* PICO HEADER BAR */}
                        <div className="flex items-center justify-between gap-2 pb-2 border-b dark:border-slate-800 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-black text-xs">
                              PICO {currentPico.picoNumber}
                            </span>
                            <span className="font-extrabold uppercase text-xs text-blue-600 dark:text-blue-400">
                              ESO GRADE Recommendation Structure
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeletePico(selectedPicoIndex)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-300 dark:border-rose-800 cursor-pointer transition-colors"
                            title="Delete this entire PICO question"
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
                            <span>Delete PICO</span>
                          </button>
                        </div>

                        {/* PICO QUESTION & CATEGORY */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Section / Topic:
                            </label>
                            <input
                              type="text"
                              required
                              value={currentPico.category}
                              onChange={(e) => updateCurrentPicoMeta({ category: e.target.value })}
                              placeholder="e.g. Blood Pressure Management"
                              className={`w-full p-2 rounded-xl border font-medium ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              PICO Clinical Question / Population:
                            </label>
                            <AutoResizeTextarea
                              minRows={2}
                              required
                              value={currentPico.picoQuestion}
                              onChange={(e) => updateCurrentPicoMeta({ picoQuestion: e.target.value })}
                              placeholder="e.g. In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis..."
                              className={`w-full p-2 rounded-xl border font-medium ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>
                        </div>

                        {/* RECOMMENDATIONS SECTION HEADER */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t dark:border-slate-800">
                          <div className="flex items-center gap-1.5 font-extrabold text-xs text-slate-800 dark:text-slate-200">
                            <Scale className="w-3.5 h-3.5 text-[#C25934] dark:text-orange-400" aria-hidden="true" />
                            <span>Recommendations for this PICO ({currentPico.recommendations.length})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
                              ⋮⋮ Drag &amp; drop or use ▲ ▼ to reorder
                            </span>
                            <button
                              type="button"
                              onClick={handleAddRecToCurrentPico}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                              title="Add another recommendation under this PICO question"
                            >
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Add Recommendation</span>
                            </button>
                          </div>
                        </div>

                        {/* REPEATABLE RECOMMENDATIONS LIST (DRAGGABLE & REORDERABLE) */}
                        <div className="space-y-4">
                          {currentPico.recommendations.map((rec, rIdx) => {
                            const qualityConfig = getEsoQualityConfig(rec.quality);
                            const isThisRecDragging = draggedRecIndex === rIdx;
                            const isThisRecDragOver = dragOverRecIndex === rIdx;

                            return (
                              <div
                                key={rec.id || `rec-${rIdx}`}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", `rec:${rIdx}`);
                                  e.dataTransfer.effectAllowed = "move";
                                  setDraggedRecIndex(rIdx);
                                  setIsDraggingRecToPico(true);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                  if (dragOverRecIndex !== rIdx) {
                                    setDragOverRecIndex(rIdx);
                                  }
                                }}
                                onDragLeave={() => {
                                  if (dragOverRecIndex === rIdx) {
                                    setDragOverRecIndex(null);
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (draggedRecIndex !== null && draggedRecIndex !== rIdx) {
                                    moveEsoRecWithinPico(draggedRecIndex, rIdx);
                                  }
                                  setDraggedRecIndex(null);
                                  setDragOverRecIndex(null);
                                  setIsDraggingRecToPico(false);
                                }}
                                onDragEnd={() => {
                                  setDraggedRecIndex(null);
                                  setDragOverRecIndex(null);
                                  setIsDraggingRecToPico(false);
                                  setDragOverPicoKey(null);
                                }}
                                className={`p-3.5 rounded-xl border space-y-3 transition-all ${
                                  isThisRecDragging
                                    ? "opacity-35 border-dashed border-blue-400 bg-blue-50/10 scale-[0.99]"
                                    : isThisRecDragOver
                                    ? "border-blue-500 bg-blue-100/40 dark:bg-blue-900/40 ring-2 ring-blue-400 shadow-md"
                                    : "border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20"
                                }`}
                              >
                                {/* REC HEADER WITH REORDER CONTROLS & PICO REASSIGNMENT */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-blue-200/60 dark:border-blue-900/40">
                                  <div className="flex items-center gap-2">
                                    {/* Drag Handle */}
                                    <div
                                      className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded hover:bg-blue-100/60 dark:hover:bg-blue-900/40 flex items-center gap-1"
                                      title="Drag and drop to reorder recommendation (or drag to left PICO list to change Clinical Question)"
                                    >
                                      <GripVerticalIcon className="w-4 h-4" />
                                    </div>

                                    {/* Up / Down Reorder Buttons */}
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        disabled={rIdx === 0}
                                        onClick={() => moveEsoRecWithinPico(rIdx, rIdx - 1)}
                                        className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-25 cursor-pointer shadow-2xs"
                                        title="Move recommendation up"
                                      >
                                        <ArrowUpIcon className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={rIdx === currentPico.recommendations.length - 1}
                                        onClick={() => moveEsoRecWithinPico(rIdx, rIdx + 1)}
                                        className="p-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 disabled:opacity-25 cursor-pointer shadow-2xs"
                                        title="Move recommendation down"
                                      >
                                        <ArrowDownIcon className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black flex items-center justify-center text-[10px]">
                                      {rIdx + 1}
                                    </span>
                                    <span className="font-extrabold text-blue-900 dark:text-blue-200 text-xs">
                                      Recommendation #{rIdx + 1}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    {syncV2Enabled && (() => {
                                      const priorCount = esoPicos
                                        .slice(0, selectedPicoIndex)
                                        .reduce((sum, p) => sum + p.recommendations.length, 0);
                                      const esoBlockChange: PracticeChangeDetail = {
                                        id: rec.id || `rec-${currentPico.picoNumber}-${rIdx + 1}`,
                                        category: currentPico.category || "Recommendations",
                                        topic: `PICO ${currentPico.picoNumber}: ${currentPico.picoQuestion}`,
                                        picoNumber: currentPico.picoNumber,
                                        picoQuestion: currentPico.picoQuestion,
                                        currentGrade: `GRADE ${rec.strength} (Evidence: ${rec.quality}${rec.voting ? `, Voting: ${rec.voting}` : ""})`,
                                        currentText: rec.statement,
                                        strength: rec.strength,
                                        quality: rec.quality,
                                        expertConsensusStatement: rec.expertConsensusStatement?.trim() || undefined,
                                        voting: rec.voting?.trim() || undefined,
                                        drivingTrials: rec.drivingTrials || [],
                                        changeType: rec.changeType || "STANDARD",
                                        previousText: rec.expertConsensusStatement?.trim() || undefined,
                                        v3Labels: rec.v3Labels,
                                      };
                                      const recBlockInfo = resolveBlockWithSource(esoBlockChange, priorCount + rIdx);
                                      const recBlock = recBlockInfo.block;
                                      if (!recBlock) return null;
                                      return (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setHistoryBlockTarget({
                                                uid: recBlock.uid,
                                                title: `PICO ${currentPico.picoNumber} · Rec #${rIdx + 1}`,
                                                rev: recBlock.rev,
                                              })
                                            }
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 cursor-pointer"
                                            title="Inspect block revision history & restore"
                                          >
                                            <Clock className="w-3 h-3" aria-hidden="true" />
                                            <span>History (rev {recBlock.rev})</span>
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isLoading}
                                            onClick={() =>
                                              void handleSaveSingleBlock(
                                                recBlock,
                                                esoBlockChange,
                                                recBlockInfo.isFallback,
                                              )
                                            }
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
                                            title="Save only this block atomically with optimistic lock"
                                          >
                                            <Zap className="w-3 h-3" aria-hidden="true" />
                                            <span>Save Block</span>
                                          </button>
                                        </>
                                      );
                                    })()}

                                    {/* Reassign to another PICO / Clinical Question */}
                                    {esoPicos.length > 1 && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                                          PICO:
                                        </span>
                                        <select
                                          value={currentPico.picoKey}
                                          onChange={(e) => {
                                            const targetIdx = esoPicos.findIndex((p) => p.picoKey === e.target.value);
                                            if (targetIdx >= 0 && targetIdx !== selectedPicoIndex) {
                                              moveEsoRecToAnotherPico(rIdx, targetIdx);
                                            }
                                          }}
                                          className={`py-0.5 px-2 rounded-lg border text-[10.5px] font-bold ${
                                            darkMode ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-700"
                                          }`}
                                          title="Change Clinical Question / Population (move recommendation to another PICO)"
                                        >
                                          <option value={currentPico.picoKey}>
                                            PICO {currentPico.picoNumber} (Current)
                                          </option>
                                          {esoPicos
                                            .filter((p) => p.picoKey !== currentPico.picoKey)
                                            .map((p) => (
                                              <option key={p.picoKey} value={p.picoKey}>
                                                Move to PICO {p.picoNumber}: {(p.picoQuestion || "").slice(0, 36)}...
                                              </option>
                                            ))}
                                        </select>
                                      </div>
                                    )}

                                    {currentPico.recommendations.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveRecFromCurrentPico(rIdx)}
                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
                                        title="Remove this recommendation"
                                      >
                                        <Trash2 className="w-3 h-3" aria-hidden="true" />
                                        <span>Remove</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* 1. FULL RECOMMENDATION STATEMENT */}
                                <div>
                                  <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200 text-xs">
                                    Full Recommendation Statement:
                                  </label>
                                  <AutoResizeTextarea
                                    minRows={3}
                                    required
                                    value={rec.statement}
                                    onChange={(e) => updateEsoRec(rIdx, { statement: e.target.value })}
                                    placeholder="e.g. In hospitalised patients with acute ischaemic stroke and undergoing intravenous thrombolysis, we suggest maintaining blood pressure below 185/110 mmHg..."
                                    className={`w-full p-2.5 rounded-xl border font-medium text-xs leading-relaxed ${
                                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                    }`}
                                  />
                                </div>

                                {/* 2. STRENGTH OF RECOMMENDATION & QUALITY OF EVIDENCE */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                      Strength of Recommendation:
                                    </label>
                                    <select
                                      value={rec.strength}
                                      onChange={(e) => updateEsoRec(rIdx, { strength: e.target.value })}
                                      className={`w-full p-2 rounded-xl border font-extrabold text-xs ${
                                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                      }`}
                                    >
                                      <option value="Strong for intervention">Strong for intervention (↑↑)</option>
                                      <option value="Weak for intervention">Weak for intervention (↑)</option>
                                      <option value="Weak against intervention">Weak against intervention (↓)</option>
                                      <option value="Strong against intervention">Strong against intervention (↓↓)</option>
                                      <option value="Uncertain / Ongoing trials">Uncertain / Ongoing trials (—)</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                      Quality of Evidence (GRADE):
                                    </label>
                                    <select
                                      value={
                                        (rec.quality || "").toLowerCase().includes("uncertain") ||
                                        (rec.quality || "").toLowerCase().includes("ongoing") ||
                                        rec.quality === "-" ||
                                        rec.quality === "—"
                                          ? "Uncertain / Ongoing trial"
                                          : rec.quality || "Moderate"
                                      }
                                      onChange={(e) => updateEsoRec(rIdx, { quality: e.target.value })}
                                      className={`w-full p-2 rounded-xl border font-extrabold text-xs ${
                                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                      }`}
                                    >
                                      <option value="High">High (⊕⊕⊕⊕)</option>
                                      <option value="Moderate">Moderate (⊕⊕⊕)</option>
                                      <option value="Low">Low (⊕⊕)</option>
                                      <option value="Very low">Very low (⊕)</option>
                                      <option value="Uncertain / Ongoing trial">uncertain/Ongoing trial (-)</option>
                                    </select>

                                    {/* DISTINCT COLOR PREVIEW BADGE */}
                                    <div className="mt-1.5 flex items-center gap-2">
                                      <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                                        Evidence Level:
                                      </span>
                                      <span
                                        style={{
                                          color: qualityConfig?.hex || "#0284c7",
                                          backgroundColor: qualityConfig?.bgLight || "rgba(2, 132, 199, 0.1)",
                                          borderColor: qualityConfig?.borderLight || "rgba(2, 132, 199, 0.3)",
                                        }}
                                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-black border"
                                      >
                                        <span>{qualityConfig?.label || rec.quality}</span>
                                        <span className="font-mono tracking-tight text-xs">
                                          {qualityConfig?.symbols || "⊕⊕⊕"}
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* 3. EXPERT CONSENSUS STATEMENT */}
                                <div>
                                  <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                    Expert Consensus Statement:
                                  </label>
                                  <AutoResizeTextarea
                                    minRows={2}
                                    value={rec.expertConsensusStatement || ""}
                                    onChange={(e) => updateEsoRec(rIdx, { expertConsensusStatement: e.target.value })}
                                    placeholder="Enter clinical consensus statement from the expert panel (if applicable)..."
                                    className={`w-full p-2 rounded-xl border font-medium text-xs leading-relaxed ${
                                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                    }`}
                                  />
                                </div>

                                {/* 4. CONSENSUS VOTING & DRIVING TRIALS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                      Consensus Voting Ratio:
                                    </label>
                                    <input
                                      type="text"
                                      value={rec.voting || ""}
                                      onChange={(e) => updateEsoRec(rIdx, { voting: e.target.value })}
                                      placeholder="e.g. Vote: 10/10 or Unanimous"
                                      className={`w-full p-1.5 rounded-lg border font-medium text-xs ${
                                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                      }`}
                                    />
                                  </div>

                                  <div>
                                    <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                                      Driving Clinical Trials (comma-separated):
                                    </label>
                                    <input
                                      type="text"
                                      value={rec.drivingTrials?.join(", ") || ""}
                                      onChange={(e) =>
                                        updateEsoRec(rIdx, {
                                          drivingTrials: e.target.value
                                            .split(",")
                                            .map((t) => t.trim())
                                            .filter(Boolean),
                                        })
                                      }
                                      placeholder="e.g. ENCHANTED, OPTIMAL-BP, BP-TARGET"
                                      className={`w-full p-1.5 rounded-lg border font-mono text-[11px] ${
                                        darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                      }`}
                                    />
                                  </div>
                                </div>

                                {/* 5. CLINICAL NAVIGATOR V3 LABELS (Per-recommendation distinct labels) */}
                                {(() => {
                                  const effV3 = getEffectiveEsoRecV3(rec);
                                  const isEditingThisRec = editingEsoRecIndex === rIdx;
                                  const recCondId = effV3.conditionIds?.[0] || "cond_ischemic_stroke";
                                  const recCondObj = getConditionByIdV3(recCondId) || activeConditionObj;
                                  const recDomain = effV3.domains?.[0] || "treatment";
                                  const recTimeWindows = recCondObj?.treatment?.timeWindows || [];

                                  const recSuggestedTags: TaxonomyTagV3[] = [];
                                  const seenTagIds = new Set<string>();
                                  const addTags = (list?: TaxonomyTagV3[]) => {
                                    if (!Array.isArray(list)) return;
                                    for (const t of list) {
                                      if (!seenTagIds.has(t.id)) {
                                        seenTagIds.add(t.id);
                                        recSuggestedTags.push(t);
                                      }
                                    }
                                  };
                                  if (recDomain === "diagnosis") {
                                    addTags(getAllDiagnosisTagsV3());
                                  } else if (recDomain === "treatment") {
                                    addTags(recCondObj?.treatment.drugs);
                                    addTags(recCondObj?.treatment.interventions);
                                    addTags(recCondObj?.treatment.otherCare);
                                  } else if (recDomain === "prevention") {
                                    addTags(recCondObj?.prevention.pharmacologicalProphylaxis);
                                    addTags(recCondObj?.prevention.proceduralDevice);
                                    addTags(recCondObj?.prevention.lifestyleRehabMonitoring);
                                  } else {
                                    addTags(recCondObj?.treatment.drugs);
                                    addTags(recCondObj?.treatment.interventions);
                                  }

                                  return (
                                    <div
                                      className={`p-3 rounded-xl border transition-all text-xs ${
                                        isEditingThisRec
                                          ? darkMode
                                            ? "bg-indigo-950/30 border-indigo-700/70"
                                            : "bg-indigo-50/70 border-indigo-200"
                                          : darkMode
                                          ? "bg-slate-900/60 border-blue-900/40"
                                          : "bg-white/80 border-blue-200/60"
                                      }`}
                                    >
                                      {/* Header bar */}
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5">
                                          <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                                          <span className="font-extrabold text-[11px] text-blue-900 dark:text-blue-300">
                                            Clinical Navigator V3 Labels
                                          </span>
                                          {rec.v3Labels?.isExplicit ? (
                                            <span className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.2 rounded font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                              <Pencil className="w-2.5 h-2.5" aria-hidden="true" />
                                              <span>Manually Customized</span>
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.2 rounded font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                              <Bot className="w-2.5 h-2.5" aria-hidden="true" />
                                              <span>Auto-classified</span>
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          {isEditingThisRec ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleResetEsoRecV3(rIdx)}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                                title="Restore auto-classification from text"
                                              >
                                                <RotateCcw className="w-2.5 h-2.5" aria-hidden="true" />
                                                <span>Reset to Auto</span>
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingEsoRecIndex(null)}
                                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10.5px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-2xs"
                                              >
                                                <Check className="w-3 h-3" aria-hidden="true" />
                                                <span>Done</span>
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleResetEsoRecV3(rIdx)}
                                                className="px-2 py-1 rounded text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
                                                title="Run auto-classification"
                                                aria-label="Run auto-classification"
                                              >
                                                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingEsoRecIndex(rIdx)}
                                                className="px-2.5 py-0.5 rounded text-[10.5px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                              >
                                                <Pencil className="w-2.5 h-2.5" aria-hidden="true" />
                                                <span>Edit Labels</span>
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Body */}
                                      {isEditingThisRec ? (
                                        <div className="pt-2.5 space-y-2.5">
                                          {/* Row 1: Condition selector */}
                                          <div>
                                            <label className="block font-bold mb-1 text-[10.5px] text-slate-700 dark:text-slate-300">
                                              Clinical Condition:
                                            </label>
                                            <select
                                              value={effV3.conditionIds?.[0] || "cond_ischemic_stroke"}
                                              onChange={(e) => updateEsoRecV3(rIdx, { conditionIds: [e.target.value] })}
                                              className={`w-full p-1.5 rounded-lg border font-bold text-xs ${
                                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                              }`}
                                            >
                                              <optgroup label={`Under Subspecialty: ${docSubspecialty}`}>
                                                {availableConditions.forSub.map((c) => (
                                                  <option key={c.id} value={c.id}>
                                                    {c.label}
                                                  </option>
                                                ))}
                                              </optgroup>
                                              {availableConditions.others.length > 0 && (
                                                <optgroup label="Other Subspecialties">
                                                  {availableConditions.others.map((c) => (
                                                    <option key={c.id} value={c.id}>
                                                      {c.label} ({c.subspecialties.join(", ")})
                                                    </option>
                                                  ))}
                                                </optgroup>
                                              )}
                                            </select>
                                          </div>

                                          {/* Row 2: Domain, Direction & Time Window */}
                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {/* Domain */}
                                            <div>
                                              <label className="block font-bold mb-1 text-[10.5px] text-slate-700 dark:text-slate-300">
                                                Clinical Domain:
                                              </label>
                                              <div className="grid grid-cols-3 gap-1">
                                                {(["treatment", "diagnosis", "prevention"] as const).map((dm) => (
                                                  <button
                                                    key={dm}
                                                    type="button"
                                                    onClick={() => updateEsoRecV3(rIdx, { domains: [dm] })}
                                                    className={`py-1 rounded text-[10px] font-extrabold capitalize cursor-pointer border ${
                                                      effV3.domains?.[0] === dm
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                                    }`}
                                                  >
                                                    {dm}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>

                                            {/* Direction */}
                                            <div>
                                              <label className="block font-bold mb-1 text-[10.5px] text-slate-700 dark:text-slate-300">
                                                Recommendation Direction:
                                              </label>
                                              <div className="grid grid-cols-3 gap-1">
                                                {[
                                                  { id: "recommended", label: "Recommended", bg: "bg-emerald-600", activeBg: "bg-emerald-600 text-white border-emerald-600" },
                                                  { id: "conditional", label: "Conditional", bg: "bg-amber-600", activeBg: "bg-amber-600 text-white border-amber-600" },
                                                  { id: "harm", label: "Harm / Avoid", bg: "bg-rose-600", activeBg: "bg-rose-600 text-white border-rose-600" },
                                                ].map((dir) => (
                                                  <button
                                                    key={dir.id}
                                                    type="button"
                                                    onClick={() => updateEsoRecV3(rIdx, { direction: dir.id as "recommended" | "conditional" | "harm" })}
                                                    className={`py-1 rounded text-[10px] font-extrabold cursor-pointer border ${
                                                      effV3.direction === dir.id
                                                        ? `${dir.activeBg} shadow-2xs`
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                                                    }`}
                                                  >
                                                    {dir.label}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>

                                            {/* Time Window */}
                                            <div>
                                              <label className="block font-bold mb-1 text-[10.5px] text-slate-700 dark:text-slate-300">
                                                Time Window:
                                              </label>
                                              <select
                                                value={effV3.timeWindowIds?.[0] || "all"}
                                                onChange={(e) => updateEsoRecV3(rIdx, { timeWindowIds: e.target.value === "all" ? [] : [e.target.value] })}
                                                className={`w-full p-1.5 rounded-lg border font-medium text-xs ${
                                                  darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                                }`}
                                              >
                                                <option value="all">All Time Windows</option>
                                                {recTimeWindows.map((tw) => (
                                                  <option key={tw.id} value={tw.id}>
                                                    {tw.label}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>
                                          </div>

                                          {/* Row 3: Assigned Tags with Remove buttons */}
                                          <div>
                                            <label className="block font-bold mb-1 text-[10.5px] text-slate-700 dark:text-slate-300">
                                              Assigned Intervention &amp; Diagnostic Tags:
                                            </label>
                                            <div className="flex flex-wrap gap-1 min-h-[30px] p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center">
                                              {[...(effV3.interventionTags || []), ...(effV3.diagnosisTags || [])].length === 0 ? (
                                                <span className="text-[11px] text-slate-400 italic">
                                                  No intervention/diagnostic tags assigned. Select suggestions below or add new.
                                                </span>
                                              ) : (
                                                [...(effV3.interventionTags || []), ...(effV3.diagnosisTags || [])].map((tagId) => {
                                                  const isDiag = effV3.diagnosisTags?.includes(tagId);
                                                  return (
                                                    <span
                                                      key={tagId}
                                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border shadow-2xs ${
                                                        isDiag
                                                          ? "bg-purple-50 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                                          : "bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                                                      }`}
                                                    >
                                                      {isDiag ? (
                                                        <FlaskConical className="w-3 h-3" aria-hidden="true" />
                                                      ) : (
                                                        <Pill className="w-3 h-3" aria-hidden="true" />
                                                      )}
                                                      <span>{getTagLabelByIdV3(tagId) || tagId}</span>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleRemoveEsoRecTag(rIdx, tagId)}
                                                        className="ml-0.5 hover:text-red-600 transition-colors cursor-pointer text-slate-400 hover:text-red-500 font-bold"
                                                        title="Remove tag"
                                                        aria-label="Remove tag"
                                                      >
                                                        <X className="w-3 h-3" aria-hidden="true" />
                                                      </button>
                                                    </span>
                                                  );
                                                })
                                              )}
                                            </div>
                                          </div>

                                          {/* Row 4: Custom Tag Input */}
                                          <div className="flex items-center gap-1.5">
                                            <input
                                              type="text"
                                              value={esoCustomTagInput}
                                              onChange={(e) => setEsoCustomTagInput(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  e.preventDefault();
                                                  handleAddEsoCustomTag(rIdx);
                                                }
                                              }}
                                              placeholder="Add custom tag (e.g. Tenecteplase, EVT, ASPECTS...)"
                                              className={`flex-1 p-1.5 rounded-lg border text-xs ${
                                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                              }`}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleAddEsoCustomTag(rIdx)}
                                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                                            >
                                              + Add Tag
                                            </button>
                                          </div>

                                          {/* Row 5: Suggested Quick Chips */}
                                          {recSuggestedTags.length > 0 && (
                                            <div className="pt-1">
                                              <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                                Suggested quick tags for condition (Click to toggle):
                                              </span>
                                              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1 bg-slate-50/50 dark:bg-slate-900/40 rounded border border-slate-200/50 dark:border-slate-800/50">
                                                {recSuggestedTags.map((tag) => {
                                                  const isDiag = recDomain === "diagnosis";
                                                  const isAssigned = isDiag
                                                    ? effV3.diagnosisTags?.includes(tag.id)
                                                    : effV3.interventionTags?.includes(tag.id);
                                                  return (
                                                    <button
                                                      key={tag.id}
                                                      type="button"
                                                      onClick={() => handleToggleEsoTag(rIdx, tag.id, isDiag)}
                                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer border flex items-center gap-1 ${
                                                        isAssigned
                                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                                          : darkMode
                                                          ? "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"
                                                          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                                                      }`}
                                                    >
                                                      <span>{isAssigned ? "✓" : "+"}</span>
                                                      <span>{tag.label}</span>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        /* Collapsed View: Compact badge pills */
                                        <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 uppercase">
                                            {effV3.domains?.[0] || "treatment"}
                                          </span>
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                              effV3.direction === "recommended"
                                                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                                                : effV3.direction === "harm"
                                                ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                            }`}
                                          >
                                            {effV3.direction || "conditional"}
                                          </span>
                                          {effV3.conditionIds?.map((cId) => (
                                            <span
                                              key={cId}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                            >
                                              <Target className="w-3 h-3" aria-hidden="true" />
                                              <span>{getConditionByIdV3(cId)?.label || cId}</span>
                                            </span>
                                          ))}
                                          {effV3.interventionTags?.map((tId) => (
                                            <span
                                              key={tId}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                                            >
                                              <Pill className="w-3 h-3" aria-hidden="true" />
                                              <span>{getTagLabelByIdV3(tId) || tId}</span>
                                            </span>
                                          ))}
                                          {effV3.diagnosisTags?.map((dId) => (
                                            <span
                                              key={dId}
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                            >
                                              <FlaskConical className="w-3 h-3" aria-hidden="true" />
                                              <span>{getTagLabelByIdV3(dId) || dId}</span>
                                            </span>
                                          ))}
                                          {effV3.timeWindowIds?.map((twId) => {
                                            const twObj = recTimeWindows.find((w) => w.id === twId);
                                            return (
                                              <span
                                                key={twId}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
                                              >
                                                <Clock className="w-3 h-3" aria-hidden="true" />
                                                <span>{twObj?.label || twId}</span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
                        <ClipboardList className="w-8 h-8 mb-2 opacity-60" aria-hidden="true" />
                        <p>Select a PICO question from the left or click Add PICO.</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* ==============================================================
                   STANDARD / AHA RECOMMENDATIONS MANAGER
                   ============================================================== */
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 h-full min-h-0">
                  {/* LEFT COLUMN: LIST OF RECOMMENDATIONS */}
                  <div className="md:col-span-5 flex flex-col h-full min-h-0 border rounded-xl overflow-hidden dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="p-2.5 border-b dark:border-slate-800 flex items-center justify-between gap-2 flex-shrink-0">
                      <span className="font-extrabold text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-300">
                        Recommendations List ({practiceChanges.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddNewStandardRec}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Add new recommendation"
                      >
                        <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Add New</span>
                      </button>
                    </div>

                    <div className="p-2 border-b dark:border-slate-800 flex-shrink-0">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search recommendations..."
                          className={`w-full pl-8 pr-2.5 py-1.5 rounded-lg border text-xs ${
                            darkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-1.5 custom-scrollbar">
                      {filteredStandardRecs.map((rec) => {
                        const realIndex = practiceChanges.findIndex((r) => r.id === rec.id);
                        const isSelected = realIndex === selectedRecIndex;
                        const isRecDragging = draggedStandardRecIndex === realIndex;
                        const isRecDragOver = dragOverStandardRecIndex === realIndex;

                        return (
                          <div
                            key={rec.id}
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", `std:${realIndex}`);
                              e.dataTransfer.effectAllowed = "move";
                              setDraggedStandardRecIndex(realIndex);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (draggedStandardRecIndex !== null && dragOverStandardRecIndex !== realIndex) {
                                setDragOverStandardRecIndex(realIndex);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverStandardRecIndex === realIndex) {
                                setDragOverStandardRecIndex(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (draggedStandardRecIndex !== null && draggedStandardRecIndex !== realIndex) {
                                moveStandardRec(draggedStandardRecIndex, realIndex);
                              }
                              setDraggedStandardRecIndex(null);
                              setDragOverStandardRecIndex(null);
                            }}
                            onDragEnd={() => {
                              setDraggedStandardRecIndex(null);
                              setDragOverStandardRecIndex(null);
                            }}
                            onClick={() => handleSelectStandardRec(realIndex)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                              isRecDragging
                                ? "opacity-40 border-dashed border-amber-400"
                                : isRecDragOver
                                ? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-400"
                                : isSelected
                                ? "bg-amber-500/10 border-amber-500/50 shadow-2xs dark:bg-amber-500/15"
                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title="Drag and drop to reorder recommendations"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVerticalIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    disabled={realIndex === 0}
                                    onClick={() => moveStandardRec(realIndex, realIndex - 1)}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500 cursor-pointer"
                                    title="Move recommendation up"
                                  >
                                    <ArrowUpIcon className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={realIndex === practiceChanges.length - 1}
                                    onClick={() => moveStandardRec(realIndex, realIndex + 1)}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-20 text-slate-500 cursor-pointer"
                                    title="Move recommendation down"
                                  >
                                    <ArrowDownIcon className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                                <span className="font-extrabold text-[10.5px] text-slate-500 dark:text-slate-400">
                                  #{realIndex + 1} • {rec.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {syncV2Enabled && (() => {
                                  const cardBlock = resolveBlockForRec(rec, realIndex);
                                  if (!cardBlock) return null;
                                  return (
                                    <span className="px-1.5 py-0.2 rounded font-mono text-[9.5px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                                      rev {cardBlock.rev}
                                    </span>
                                  );
                                })()}
                                <span className="px-1.5 py-0.2 rounded font-mono text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  {rec.currentGrade}
                                </span>
                              </div>
                            </div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                              {rec.topic}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                              {rec.currentText || "(No recommendation statement entered)"}
                            </p>

                            {syncV2Enabled && isSelected && activeStandardBlock && (
                              <div
                                className="flex flex-wrap items-center gap-1.5 mt-2 pt-1.5 border-t border-amber-200/70 dark:border-amber-800/40"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setHistoryBlockTarget({
                                      uid: activeStandardBlock.uid,
                                      title: recTopic || rec.topic || activeStandardBlock.blockKey,
                                      rev: activeStandardBlock.rev,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 cursor-pointer"
                                >
                                  <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                                  <span>History (rev {activeStandardBlock.rev})</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => {
                                    const draft = buildCurrentStandardChangeDraft();
                                    if (draft) {
                                      void handleSaveSingleBlock(
                                        activeStandardBlock,
                                        draft,
                                        activeStandardBlockInfo.isFallback,
                                      );
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
                                >
                                  <Zap className="w-2.5 h-2.5" aria-hidden="true" />
                                  <span>Save Block</span>
                                </button>
                              </div>
                            )}

                            {rec.v3Labels && (rec.v3Labels.conditionIds?.length > 0 || rec.v3Labels.interventionTags?.length > 0) && (
                              <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                                {rec.v3Labels.conditionIds?.[0] && (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-indigo-600 dark:text-indigo-400">
                                    <Target className="w-2.5 h-2.5" aria-hidden="true" />
                                    <span>{getConditionByIdV3(rec.v3Labels.conditionIds[0])?.label || rec.v3Labels.conditionIds[0]}</span>
                                  </span>
                                )}
                                {rec.v3Labels.interventionTags?.slice(0, 2).map((t) => (
                                  <span key={t} className="text-[9px] px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                                    {getTagLabelByIdV3(t) || t}
                                  </span>
                                ))}
                                {(rec.v3Labels.interventionTags?.length || 0) > 2 && (
                                  <span className="text-[9px] text-slate-400 font-bold">
                                    +{(rec.v3Labels.interventionTags?.length || 0) - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {practiceChanges.length === 0 && (
                        <div className="text-center py-10 text-slate-400">
                          No recommendations yet. Click <b>Add New</b> to create.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT COLUMN: RECOMMENDATION DETAILS */}
                  <div className="md:col-span-7 flex flex-col h-full min-h-0 border rounded-xl dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                    {practiceChanges.length > 0 && selectedRecIndex >= 0 && selectedRecIndex < practiceChanges.length ? (
                      <>
                        {/* PINNED STICKY HEADER BAR FOR ACTIVE RECOMMENDATION */}
                        <div className="px-4 py-2.5 border-b dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black flex items-center justify-center text-[10.5px]">
                              {selectedRecIndex + 1}
                            </span>
                            <span className="font-extrabold uppercase text-xs text-amber-600 dark:text-amber-400">
                              {isAha ? "AHA/ASA Recommendation" : "Standard Recommendation"}
                            </span>
                            {syncV2Enabled && activeStandardBlock && (
                              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                rev {activeStandardBlock.rev}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {syncV2Enabled && activeStandardBlock && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setHistoryBlockTarget({
                                      uid: activeStandardBlock.uid,
                                      title: recTopic || activeStandardBlock.blockKey,
                                      rev: activeStandardBlock.rev,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 cursor-pointer transition-colors"
                                  title="Inspect block revision history & restore"
                                >
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  <span>History (rev {activeStandardBlock.rev})</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() => {
                                    const draft = buildCurrentStandardChangeDraft();
                                    if (draft) {
                                      void handleSaveSingleBlock(
                                        activeStandardBlock,
                                        draft,
                                        activeStandardBlockInfo.isFallback,
                                      );
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors disabled:opacity-50"
                                  title="Save only this block atomically with optimistic lock"
                                >
                                  <Zap className="w-3 h-3" aria-hidden="true" />
                                  <span>{isLoading ? "Saving..." : "Save Block"}</span>
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteStandardRec(selectedRecIndex)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-300 dark:border-rose-800 cursor-pointer transition-colors"
                              title="Delete this recommendation"
                            >
                              <Trash2 className="w-3 h-3" aria-hidden="true" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">

                        {/* SECTION & TOPIC */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Section / Topic:
                            </label>
                            <input
                              type="text"
                              required
                              value={recCategory}
                              onChange={(e) => setRecCategory(e.target.value)}
                              placeholder="e.g. Reperfusion Therapy or Blood Pressure..."
                              className={`w-full p-2 rounded-xl border font-medium ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Clinical Question / Population:
                            </label>
                            <input
                              type="text"
                              required
                              value={recTopic}
                              onChange={(e) => setRecTopic(e.target.value)}
                              placeholder="e.g. Acute Ischemic Stroke Patients within 4.5h"
                              className={`w-full p-2 rounded-xl border font-medium ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>
                        </div>

                        {/* 1. FULL RECOMMENDATION STATEMENT */}
                        <div>
                          <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                            Full Recommendation Statement:
                          </label>
                          <AutoResizeTextarea
                            minRows={3}
                            required
                            value={recStatement}
                            onChange={(e) => setRecStatement(e.target.value)}
                            placeholder="Enter the full text of the clinical recommendation..."
                            className={`w-full p-2.5 rounded-xl border font-medium leading-relaxed ${
                              darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                            }`}
                          />
                        </div>

                        {/* AHA GRADING FIELDS */}
                        {isAha && (
                          <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
                            <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                              <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
                              <span>ACC/AHA RECOMMENDATION GRADING</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block font-bold mb-1">
                                  Class of Recommendation (COR):
                                </label>
                                <select
                                  value={ahaCor}
                                  onChange={(e) => setAhaCor(e.target.value)}
                                  className={`w-full p-2 rounded-xl border font-extrabold ${
                                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                  }`}
                                >
                                  <option value="1">Class 1 (Strong - Benefit &gt;&gt;&gt; Risk)</option>
                                  <option value="2a">Class 2a (Moderate - Benefit &gt;&gt; Risk)</option>
                                  <option value="2b">Class 2b (Weak - Benefit &gt;= Risk)</option>
                                  <option value="3: No Benefit">Class 3: No Benefit</option>
                                  <option value="3: Harm">Class 3: Harm</option>
                                </select>
                              </div>

                              <div>
                                <label className="block font-bold mb-1">
                                  Level of Evidence (LOE):
                                </label>
                                <select
                                  value={ahaLoe}
                                  onChange={(e) => setAhaLoe(e.target.value)}
                                  className={`w-full p-2 rounded-xl border font-extrabold ${
                                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                  }`}
                                >
                                  <option value="A">Level A (High-quality RCTs)</option>
                                  <option value="B-R">Level B-R (Randomized trials)</option>
                                  <option value="B-NR">Level B-NR (Non-randomized studies)</option>
                                  <option value="C-LD">Level C-LD (Limited data / registries)</option>
                                  <option value="C-EO">Level C-EO (Expert opinion)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {!isAha && (
                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Grade / Level of Evidence:
                            </label>
                            <input
                              type="text"
                              value={generalGrade}
                              onChange={(e) => setGeneralGrade(e.target.value)}
                              placeholder="e.g. Level A, Level B, Good Practice Point..."
                              className={`w-full p-2 rounded-xl border font-bold ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>
                        )}

                        {/* DRIVING TRIALS & CHANGE TYPE */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Driving Clinical Trials (comma-separated):
                            </label>
                            <input
                              type="text"
                              value={recTrialsStr}
                              onChange={(e) => setRecTrialsStr(e.target.value)}
                              placeholder="e.g. EXTEND-IA, SWIFT PRIME, DAWN, DEFUSE 3"
                              className={`w-full p-2 rounded-xl border font-mono text-[11px] ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block font-bold mb-1 text-slate-700 dark:text-slate-300">
                              Recommendation Change Type:
                            </label>
                            <select
                              value={recChangeType || "STANDARD"}
                              onChange={(e) => setRecChangeType(e.target.value as PracticeChangeDetail["changeType"])}
                              className={`w-full p-2 rounded-xl border font-bold ${
                                darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <option value="STANDARD">STANDARD (Maintained standard practice)</option>
                              <option value="NEW">NEW (Newly introduced recommendation)</option>
                              <option value="UPGRADED">UPGRADED (Class / Grade upgraded)</option>
                              <option value="DOWNGRADED">DOWNGRADED (Class / Grade downgraded)</option>
                              <option value="REVISED">REVISED (Wording or threshold revised)</option>
                            </select>
                          </div>
                        </div>

                        {recChangeType && recChangeType !== "STANDARD" && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <div>
                              <label className="block font-bold mb-1">Previous Grade:</label>
                              <input
                                type="text"
                                value={recPrevGrade}
                                onChange={(e) => setRecPrevGrade(e.target.value)}
                                placeholder="e.g. Class 2b, Level C"
                                className={`w-full p-1.5 rounded-lg border text-xs ${
                                  darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-300"
                                }`}
                              />
                            </div>
                            <div>
                              <label className="block font-bold mb-1">Previous Text:</label>
                              <AutoResizeTextarea
                                minRows={2}
                                value={recPrevText}
                                onChange={(e) => setRecPrevText(e.target.value)}
                                placeholder="Previous wording of this recommendation..."
                                className={`w-full p-1.5 rounded-lg border text-xs ${
                                  darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-300"
                                }`}
                              />
                            </div>
                          </div>
                        )}

                        {/* ==============================================================
                            TAXONOMY & CLINICAL NAVIGATOR LABELS (V3)
                            ============================================================== */}
                        <div
                          className={`p-3.5 sm:p-4 rounded-xl border space-y-3.5 transition-all ${
                            isCustomizingV3
                              ? darkMode
                                ? "bg-indigo-950/25 border-indigo-700/60"
                                : "bg-indigo-50/60 border-indigo-200"
                              : darkMode
                              ? "bg-slate-900/60 border-slate-700/70"
                              : "bg-slate-50/80 border-slate-200"
                          }`}
                        >
                          {/* Header: Title + Mode Badge + Toggle Button */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-[#C25934] dark:text-orange-400 shrink-0" aria-hidden="true" />
                              <div>
                                <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                  <span>Classification &amp; Clinical Tags (Clinical Navigator V3)</span>
                                  {isCustomizingV3 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
                                      <Pencil className="w-2.5 h-2.5" aria-hidden="true" />
                                      <span>Manually Customized</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 border border-sky-300 dark:border-sky-700">
                                      <Bot className="w-2.5 h-2.5" aria-hidden="true" />
                                      <span>Auto-classified</span>
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  Defines how this recommendation is indexed and filtered in Clinical Navigator.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isCustomizingV3 ? (
                                <button
                                  type="button"
                                  onClick={handleResetToAutoV3}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                  title="Reset to automated classification"
                                >
                                  <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                  <span>Reset to Auto</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleEnableCustomV3}
                                  className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Customize condition, domain, and tags"
                                >
                                  <Pencil className="w-3 h-3" aria-hidden="true" />
                                  <span>Edit Labels</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 3 Main Axis Controls */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* 1. Clinical Condition */}
                            <div>
                              <label className="block font-bold mb-1 text-[11px] text-slate-700 dark:text-slate-300">
                                Clinical Condition:
                              </label>
                              {isCustomizingV3 ? (
                                <select
                                  value={customConditionId || activeV3Labels.conditionIds[0] || ""}
                                  onChange={(e) => {
                                    setCustomConditionId(e.target.value);
                                    setCustomConditionSubTags([]);
                                    setCustomTimeWindowId("all");
                                  }}
                                  className={`w-full p-2 rounded-xl border font-bold text-xs ${
                                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                  }`}
                                >
                                  <optgroup label={`Under Subspecialty: ${docSubspecialty}`}>
                                    {[...availableConditions.forSub]
                                      .sort((a, b) => compareConditionLabelsV3(a.label, b.label))
                                      .map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.label}
                                        </option>
                                      ))}
                                  </optgroup>
                                  {availableConditions.others.length > 0 && (
                                    <optgroup label="Other Subspecialties">
                                      {[...availableConditions.others]
                                        .sort((a, b) => compareConditionLabelsV3(a.label, b.label))
                                        .map((c) => (
                                          <option key={c.id} value={c.id}>
                                            {c.label} ({c.subspecialties.join(", ")})
                                          </option>
                                        ))}
                                    </optgroup>
                                  )}
                                </select>
                              ) : (
                                <div
                                  className={`p-2 rounded-xl border font-extrabold text-xs flex items-center gap-1.5 ${
                                    darkMode
                                      ? "bg-slate-800/80 border-slate-700 text-indigo-300"
                                      : "bg-white border-slate-200 text-indigo-700"
                                  }`}
                                >
                                  <Target className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  <span className="truncate">
                                    {activeConditionObj?.label || activeV3Labels.conditionIds[0] || "Unspecified"}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* 2. Clinical Domain */}
                            <div>
                              <label className="block font-bold mb-1 text-[11px] text-slate-700 dark:text-slate-300">
                                Clinical Domain:
                              </label>
                              {isCustomizingV3 ? (
                                <select
                                  value={customDomain}
                                  onChange={(e) => setCustomDomain(e.target.value as "diagnosis" | "treatment" | "prevention")}
                                  className={`w-full p-2 rounded-xl border font-bold text-xs ${
                                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                  }`}
                                >
                                  <option value="treatment">Treatment (Acute &amp; Active Management)</option>
                                  <option value="diagnosis">Diagnosis (Assessment &amp; Evaluation)</option>
                                  <option value="prevention">Prevention (Secondary Prevention)</option>
                                </select>
                              ) : (
                                <div
                                  className={`p-2 rounded-xl border font-extrabold text-xs flex items-center gap-1.5 capitalize ${
                                    darkMode
                                      ? "bg-slate-800/80 border-slate-700 text-emerald-300"
                                      : "bg-white border-slate-200 text-emerald-700"
                                  }`}
                                >
                                  {activeV3Labels.domains[0] === "diagnosis" ? (
                                    <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  ) : activeV3Labels.domains[0] === "prevention" ? (
                                    <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  ) : (
                                    <Pill className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  )}
                                  <span>{activeV3Labels.domains[0] || "treatment"}</span>
                                </div>
                              )}
                            </div>

                            {/* 3. Recommendation Direction */}
                            <div>
                              <label className="block font-bold mb-1 text-[11px] text-slate-700 dark:text-slate-300">
                                Recommendation Direction:
                              </label>
                              {isCustomizingV3 ? (
                                <select
                                  value={customDirection}
                                  onChange={(e) => setCustomDirection(e.target.value as "recommended" | "conditional" | "harm")}
                                  className={`w-full p-2 rounded-xl border font-bold text-xs ${
                                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                  }`}
                                >
                                  <option value="recommended">Strong Recommended (Class I, IIa)</option>
                                  <option value="conditional">Marginal / Conditional (Class IIb)</option>
                                  <option value="harm">Contraindicated / Harm (Class III)</option>
                                </select>
                              ) : (
                                <div
                                  className={`p-2 rounded-xl border font-extrabold text-xs flex items-center gap-1.5 ${
                                    activeV3Labels.direction === "harm"
                                      ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                                      : activeV3Labels.direction === "conditional"
                                      ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                      : "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                                  }`}
                                >
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
                                      activeV3Labels.direction === "harm"
                                        ? "bg-rose-500"
                                        : activeV3Labels.direction === "conditional"
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                    }`}
                                    aria-hidden="true"
                                  />
                                  <span className="capitalize">{activeV3Labels.direction}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Condition Sub-tags (e.g., LVO, BAO, MeVO/DMVO, Large Ischemic Core, Cerebellar Infarction, Suspected Stroke) */}
                          {(() => {
                            const subTagGroups = getConditionSubTagsForScopesV3(activeV3Labels.conditionIds);
                            if (subTagGroups.length === 0) return null;
                            const activeSubTags = isCustomizingV3
                              ? customConditionSubTags
                              : activeV3Labels.conditionSubTags || [];
                            return (
                              <div>
                                <label className="block font-bold mb-1 text-[11px] text-sky-700 dark:text-sky-300">
                                  Condition Sub-tags:
                                </label>
                                {isCustomizingV3 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    {subTagGroups.flatMap((g) =>
                                      [...g.subTags]
                                        .sort((a, b) => compareConditionLabelsV3(a.label, b.label))
                                        .map((st) => {
                                          const isSelected = activeSubTags.includes(st.id);
                                          return (
                                            <button
                                              key={st.id}
                                              type="button"
                                              onClick={() =>
                                                setCustomConditionSubTags((prev) =>
                                                  prev.includes(st.id)
                                                    ? prev.filter((id) => id !== st.id)
                                                    : [...prev, st.id]
                                                )
                                              }
                                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition ${
                                                isSelected
                                                  ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                                                  : darkMode
                                                  ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-sky-500"
                                                  : "bg-white border-slate-300 text-slate-700 hover:border-sky-400"
                                              }`}
                                            >
                                              {st.label}
                                            </button>
                                          );
                                        })
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {activeSubTags.length > 0 ? (
                                      activeSubTags.map((stId) => (
                                        <span
                                          key={stId}
                                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800"
                                        >
                                          {getTagLabelByIdV3(stId)}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[10px] italic text-slate-400">
                                        No specific sub-tags detected
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Optional: Time Window (Only if Domain is treatment) */}
                          {(isCustomizingV3 ? customDomain === "treatment" : activeV3Labels.domains.includes("treatment")) &&
                            activeConditionObj?.treatment.timeWindows &&
                            activeConditionObj.treatment.timeWindows.length > 0 && (
                              <div>
                                <label className="block font-bold mb-1 text-[11px] text-slate-700 dark:text-slate-300">
                                  Intervention Time Window:
                                </label>
                                {isCustomizingV3 ? (
                                  <div className="flex flex-wrap gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setCustomTimeWindowId("all")}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                        customTimeWindowId === "all" || !customTimeWindowId
                                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                          : darkMode
                                          ? "bg-slate-800 text-slate-300 border-slate-700"
                                          : "bg-white text-slate-700 border-slate-200"
                                      }`}
                                    >
                                      All Windows
                                    </button>
                                    {activeConditionObj.treatment.timeWindows.map((tw) => {
                                      const isSel = customTimeWindowId === tw.id;
                                      return (
                                        <button
                                          key={tw.id}
                                          type="button"
                                          onClick={() => setCustomTimeWindowId(tw.id)}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                            isSel
                                              ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                              : darkMode
                                              ? "bg-slate-800 text-slate-300 border-slate-700"
                                              : "bg-white text-slate-700 border-slate-200"
                                          }`}
                                        >
                                          ⏱️ {tw.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                    <span>⏱️ Window:</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                      {activeConditionObj.treatment.timeWindows.find(
                                        (tw) => tw.id === activeV3Labels.timeWindowIds[0]
                                      )?.label || "No specific time window applied"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                          {/* Tags: Assigned Chips + Tag Adder */}
                          <div className="space-y-2 pt-1 border-t dark:border-slate-800">
                            <div className="flex items-center justify-between gap-2">
                              <label className="font-bold text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <span>Assigned Intervention &amp; Diagnostic Tags:</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  {(isCustomizingV3
                                    ? [...customInterventionTags, ...customDiagnosisTags]
                                    : [...activeV3Labels.interventionTags, ...activeV3Labels.diagnosisTags]
                                  ).length}
                                </span>
                              </label>
                              {isCustomizingV3 && (
                                <span className="text-[10.5px] text-slate-400">
                                  Click × to remove tag, or click suggestions below to add quickly
                                </span>
                              )}
                            </div>

                            {/* Display Assigned Tags */}
                            <div className="flex flex-wrap gap-1.5 min-h-[34px] p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center">
                              {(isCustomizingV3
                                ? [...customInterventionTags, ...customDiagnosisTags]
                                : [...activeV3Labels.interventionTags, ...activeV3Labels.diagnosisTags]
                              ).length === 0 ? (
                                <span className="text-xs text-slate-400 italic">
                                  No intervention/diagnostic tags assigned to this recommendation yet.
                                </span>
                              ) : (
                                (isCustomizingV3
                                  ? [...customInterventionTags, ...customDiagnosisTags]
                                  : [...activeV3Labels.interventionTags, ...activeV3Labels.diagnosisTags]
                                ).map((tagId) => {
                                  const label = getTagLabelByIdV3(tagId) || tagId;
                                  return (
                                    <span
                                      key={tagId}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs"
                                    >
                                      <span>{label}</span>
                                      {isCustomizingV3 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCustomInterventionTags((prev) => prev.filter((id) => id !== tagId));
                                            setCustomDiagnosisTags((prev) => prev.filter((id) => id !== tagId));
                                          }}
                                          className="hover:text-rose-500 font-black text-sm leading-none ml-0.5 cursor-pointer"
                                          title={`Remove tag "${label}"`}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </span>
                                  );
                                })
                              )}
                            </div>

                            {/* If customizing: Add Tag Input + Quick Suggestion Chips */}
                            {isCustomizingV3 && (
                              <div className="space-y-2 pt-2">
                                {/* Custom Input */}
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={customTagInput}
                                    onChange={(e) => setCustomTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleAddCustomTag();
                                      }
                                    }}
                                    placeholder="Enter tag to add (e.g. Tenecteplase, Dual Antiplatelet, MRI DWI...)..."
                                    className={`flex-1 p-2 rounded-xl border text-xs font-medium ${
                                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddCustomTag()}
                                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-xs whitespace-nowrap"
                                  >
                                    + Add Tag
                                  </button>
                                </div>

                                {/* Quick Canonical Suggestions */}
                                {suggestedTags.length > 0 && (
                                  <div>
                                    <span className="block text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                      Suggested canonical tags for this condition &amp; domain (Click to add):
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1">
                                      {suggestedTags.map((st) => {
                                        const isAlreadyAdded =
                                          customInterventionTags.includes(st.id) || customDiagnosisTags.includes(st.id);
                                        return (
                                          <button
                                            key={st.id}
                                            type="button"
                                            disabled={isAlreadyAdded}
                                            onClick={() => handleAddCustomTag(st.label)}
                                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                                              isAlreadyAdded
                                                ? "opacity-40 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-not-allowed"
                                                : "bg-slate-100 hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-700 hover:text-indigo-700 dark:text-slate-300 dark:hover:text-indigo-300 border-slate-200 dark:border-slate-700"
                                            }`}
                                          >
                                            {isAlreadyAdded ? "✓ " : "+ "}
                                            {st.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-400">
                        <ClipboardList className="w-8 h-8 mb-2 opacity-60" aria-hidden="true" />
                        <p>Select a recommendation from the left or click Add New.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FOOTER ACTION BAR */}
          <div className="px-5 py-3 border-t dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50/80 dark:bg-slate-950/60 flex-shrink-0">
            <button
              type="button"
              disabled={isLoading}
              onClick={handleDeleteFromModal}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Delete Guideline</span>
            </button>

            <div className="flex flex-wrap items-center gap-2">
              {syncV2Enabled && draftSavedAt && (
                <span className="hidden md:inline text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Draft auto-saved {draftSavedAt}
                </span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                title="Save all edits and sync directly to Cloud"
              >
                {isLoading ? (
                  <span>Saving to Cloud...</span>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Save Changes to Cloud</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {syncV2Enabled && historyBlockTarget && (
        <BlockHistoryPanel
          isOpen={true}
          uid={historyBlockTarget.uid}
          blockTitle={historyBlockTarget.title}
          currentRev={historyBlockTarget.rev}
          darkMode={darkMode}
          adminToken={adminToken}
          onClose={() => setHistoryBlockTarget(null)}
          onRestored={async (restoredRow) => {
            setSavedBlockOverrides((prev) => ({ ...prev, [restoredRow.uid]: restoredRow }));
            await onApplyLocalBlockWrite?.(restoredRow);
            applySavedBlockRowToForm(restoredRow);
            setHistoryBlockTarget((prev) =>
              prev ? { ...prev, rev: restoredRow.rev } : null,
            );
            setBlockSuccessMessage(
              `✓ Đã khôi phục khuyến cáo về draft (rev ${restoredRow.rev}).`,
            );
            onSuccess(buildUpdatedDocAfterBlockSave(restoredRow));
          }}
          onConflict={(cloudRow) => {
            setHistoryBlockTarget(null);
            const fallbackBase =
              blocksByUid?.get(cloudRow.uid) ?? activeSyncBlock ?? cloudRow;
            setConflictState({
              base: fallbackBase,
              mine: fallbackBase.data,
              cloudRow,
              submitting: false,
              error: null,
            });
          }}
        />
      )}

      {syncV2Enabled && conflictState && (
        <BlockConflictDialog
          isOpen={true}
          base={conflictState.base}
          mine={conflictState.mine}
          cloudRow={conflictState.cloudRow}
          baseRev={conflictState.base.rev}
          submitting={conflictState.submitting}
          error={conflictState.error}
          darkMode={darkMode}
          onResolve={handleResolveBlockConflict}
          onCancel={() => setConflictState(null)}
        />
      )}
    </div>
  );
}
