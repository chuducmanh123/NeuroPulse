import fs from "node:fs";
import path from "node:path";
import type { SubspecialtyType } from "../../types/neuroguide.ts";
import type {
  BilingualText,
  PathwayAbbreviation,
  PathwayChecklistItem,
  PathwayChoiceLayout,
  PathwayCompoundItem,
  PathwayDomain,
  PathwayEdge,
  PathwayFootnote,
  PathwayNode,
  PathwayNodeKind,
  PathwaySourceType,
  PathwayValidationResult,
} from "../../types/clinicalPathways.ts";
import {
  callGeminiWaterfallJson,
  GEMINI_WATERFALL_MODELS,
} from "../gemini/models.ts";
import { normalizePathwaySlug, validateClinicalPathway } from "./pathwayValidator.ts";
import { PathwayServiceError, type CreatePathwayDraftInput } from "./pathwayService.ts";

export interface ExtractPathwayMetadataInput {
  sourceType: PathwaySourceType;
  title?: string;
  sourceTitle: string;
  organizationOrAuthor: string;
  year: number;
  figureRef?: string;
  url?: string;
  linkedGuidelineId?: string;
  subspecialty: SubspecialtyType;
  conditionId?: string;
  domain: PathwayDomain;
  additionalInstructions?: string;
}

export interface ExtractPathwayImageInput {
  imageBuffer: Buffer;
  mimeType: string;
  imageUrl: string;
  imageSha256: string;
  fileName?: string;
  metadata: ExtractPathwayMetadataInput;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  models?: readonly string[];
  timeoutMs?: number;
}

export interface ExtractPathwayResult {
  ok: true;
  draft: CreatePathwayDraftInput;
  validation: PathwayValidationResult;
  model: string;
  confidenceNotes: string[];
}

const VALID_NODE_KINDS = new Set<PathwayNodeKind>([
  "entry",
  "section",
  "decision",
  "criteria",
  "checklist",
  "action",
  "diagnosis",
  "treatment",
]);

const VALID_EDGE_TONES = new Set(["default", "positive", "warning", "danger"]);
const VALID_CHOICE_LAYOUTS = new Set<PathwayChoiceLayout>([
  "auto",
  "binary",
  "grid2",
  "row3",
  "stack",
]);

function parseEnvFileForKey(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed.startsWith("GEMINI_API_KEY=")) {
        const val = trimmed
          .slice("GEMINI_API_KEY=".length)
          .trim()
          .replace(/^["']|["']$/g, "");
        if (val) return val;
      }
    }
  } catch {
    // Ignore
  }
  return "";
}

export function loadGeminiApiKey(): string {
  const fromEnv = (process.env.GEMINI_API_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, "");
  if (fromEnv) return fromEnv;

  const fromLocal = parseEnvFileForKey(path.join(process.cwd(), ".env.local"));
  if (fromLocal) return fromLocal;

  return parseEnvFileForKey(path.join(process.cwd(), ".env"));
}

export function buildPathwayExtractionPrompt(
  metadata: ExtractPathwayMetadataInput
): string {
  const sourceLabel =
    metadata.sourceType === "guideline" ? "Clinical Practice Guideline" : "Neurology Textbook";
  const extra = metadata.additionalInstructions?.trim()
    ? `\nAdditional instructions from clinician admin: ${metadata.additionalInstructions.trim()}`
    : "";

  return `You are a clinical neurology informatics specialist extracting a structured interactive clinical pathway from an uploaded flowchart image, modeled on the AHA/ACC Clinical Practice Guidelines interactive pathway standard.

Source context:
- Source Type: ${sourceLabel}
- Source Title: ${metadata.sourceTitle}
- Organization / Author: ${metadata.organizationOrAuthor} (${metadata.year})
- Subspecialty: ${metadata.subspecialty}
- Clinical Domain: ${metadata.domain}${metadata.figureRef ? `\n- Figure / Page: ${metadata.figureRef}` : ""}${metadata.title ? `\n- Preferred Title: ${metadata.title}` : ""}${extra}

CRITICAL CLINICAL & UX RULES (AHA INTERACTIVE STANDARD):
1. VERBATIM & ZERO HALLUCINATION: Transcribe EVERY box, clinical question, threshold, drug/dosing cue, contraindication/warning, and arrow label VERBATIM in English ("en") — never paraphrase or shorten box titles (e.g. keep "Patient's BP Thresholds and Recommendations for Treatment and Follow-Up" verbatim, do NOT rename it to "Category"). NEVER invent clinical criteria, dosages, or branches not shown in the image.
2. BILINGUAL: For every "en" field, provide a concise, clinically accurate Vietnamese translation in "vi" while keeping standard medical terms, drug names, and scores (NIHSS, mRS, ASPECTS, IVT, EVT, tPA, TNK, etc.) intact. Every decision branch label in "edges[]" MUST have both "en" and "vi".
3. ZERO REDUNDANT CLICKS (AUTO-UNFOLD LINEAR FLOWS):
   - NEVER invent fake 1-branch decision prompts like "Proceed", "Next step", "Management", or "Evaluate results" — linear single-edge nodes auto-unfold automatically in the UI.
   - If the entry box splits directly into multiple branches (e.g. 4 BP stages, 3 statin groups, 4 risk tiers), make "entryNodeId" a "decision" node directly so the clinician can tap immediately on screen 1.
   - NEVER create echo/wrapper nodes that repeat an incoming branch label with 1 outgoing edge; point branch edges directly to the actual action, recommendation, or next decision node.
4. MERGE LABELS & KEEP CHOICE LABELS SHORT:
   - When a classification/prep box immediately splits into branches (e.g. "Severe hypertension" -> ED / OPT, or "Baseline lipid profile" -> 3 statin groups), use that label as the "title" of the "decision" node instead of a separate node.
   - Keep branch "edges[].label" concise (<= 8-10 words). Put multi-bullet goals, conditions, or dosing inside the target "action"/"treatment" node's "body".
5. CRITERIA LISTS ("Any of:") vs CHECKLISTS:
   - If a branch leads to an "Any of:" bulleted eligibility/risk-feature list, use kind: "criteria" (displayed for rapid visual check, NOT split into multiple Yes/No questions).
   - Reserve kind: "checklist" strictly for explicit pass/fail inclusion+exclusion eligibility tables.
6. COMPOUND "AND" / "OR" CARDS:
   - When two recommendations are explicitly paired by "AND" or "OR" (e.g. "BP-lowering medication AND Reassess in 1 mo", or "Aortic dissection ... OR Pheochromocytoma ..."), group them in ONE node using "compoundOperator": "AND" | "OR" and "compoundItems": [...] with each item's own "tier" and "evidenceBadge".
   - Set "title.en" concisely to summarize the pair (e.g. "BP-lowering medication AND Reassess in 1 mo"), while "compoundItems" holds each distinct sub-card.
7. STRICT COR ATTRIBUTION:
   - ONLY set "tier" (1=Class I/Strong FOR, 2=Class IIa/Moderate, 3=Class IIb/Weak, 4=Expert Consensus, 5=Class III Harm/No Benefit) and "evidenceBadge" on "action", "treatment", "diagnosis" nodes or "compoundItems" where explicitly stated in the image.
   - NEVER put "tier" or "evidenceBadge" on "decision", "entry", "section", or "criteria" nodes.
8. SWIMLANES, SECTION BANNERS & MATRIX COLLAPSE:
   - Horizontal or vertical shaded swimlane/banner bands spanning columns (e.g. "Promote Lifestyle Therapy at All Thresholds", "BP Level-Only", "Risk-Based Thresholds...") MUST be extracted as "kind": "section" banner node(s) placed immediately BEFORE the step(s) in that band — NEVER put inside the "body" of an action/treatment card.
   - IMPORTANT GRAPH TOPOLOGY FOR SWIMLANES: A "section" node has ONLY 1 outgoing edge. When a horizontal band spans multiple parallel columns that continue to DIFFERENT downstream steps, create ONE "section" node per branch immediately before that branch's box inside the band (e.g. n_sec_normal -> n_lifestyle_normal, n_sec_elev -> n_lifestyle_elev, n_sec_stage1 -> n_lifestyle_stage1, n_sec_stage2 -> n_lifestyle_stage2). NEVER emit a floating/disconnected "section" node with "edges": [] or unreachable from "entryNodeId".
   - If a matrix branch has only 1 valid path (no real sub-choice), collapse fixed context into the criteria/outcome card instead of chaining 1-edge decision nodes.
9. FOOTNOTES, ABBREVIATIONS & LOOPS:
   - Keep "*", "†", "‡" markers in node titles. Extract ALL figure caption abbreviations into top-level "abbreviations", AND extract ALL symbol definitions (*, †, ‡) plus any methodology/calculator/explanatory notes from the figure caption (e.g. "Based on the PREVENT calculator...") into top-level "footnotes" (use the symbol or "Note" as "symbol").
   - When a routine ongoing follow-up box loops back solely to indicate ongoing periodic monitoring (e.g. "BP goal met? = YES -> Reassess in 3-6 mo" with an arrow returning to "BP goal met?"), represent it cleanly as a terminal "treatment" node with "(Ongoing)" in the title ("edges": []), matching AHA's "Reassess in 3-6 mo (Ongoing)".
   - When keeping an active treatment/diagnostic loop-back arrow (e.g. "Consider intensification -> BP-lowering medication" or "Serial ECG -> STEMI?"), set "autoUnrollLoop": true.
   - For diagnostic reassessment loops like "Stage 1 Hypertension? = NO -> Reassess in 3-6 mo", connect "NO" back to the existing "Reassess in 3-6 mo" node with a descriptive bilingual label (never generic "Continue").
10. GRAPH INTEGRITY & TERMINAL KINDS:
   - Every node in "nodes[]" MUST be reachable from "entryNodeId" (zero orphan nodes).
   - Every "targetNodeId" MUST match a valid "id" in "nodes".
   - EVERY terminal leaf node ("edges": []) MUST use "kind": "treatment" or "diagnosis" (NEVER "action" or "section"), including follow-up endpoints like "Reassess in 1 y" or "Reassess in 3-6 mo (Ongoing)".

Return ONLY valid JSON matching this exact structure:
{
  "title": { "en": "string", "vi": "string" },
  "summary": { "en": "string", "vi": "string" },
  "entryNodeId": "n1",
  "abbreviations": [
    { "term": "IVT", "expansion": { "en": "Intravenous thrombolysis", "vi": "Tiêu sợi huyết tĩnh mạch" } }
  ],
  "footnotes": [
    { "symbol": "*", "text": { "en": "Footnote definition from figure caption", "vi": "Chú thích từ hình gốc" } }
  ],
  "nodes": [
    {
      "id": "n1",
      "kind": "entry | section | decision | criteria | checklist | action | diagnosis | treatment",
      "title": { "en": "string", "vi": "string" },
      "body": { "en": "string", "vi": "string" },
      "warning": { "en": "string", "vi": "string" },
      "tier": 1,
      "evidenceBadge": "Class 1",
      "choiceLayout": "auto | binary | grid2 | row3 | stack",
      "compoundOperator": "AND | OR",
      "compoundItems": [
        { "title": { "en": "string", "vi": "string" }, "body": { "en": "string", "vi": "string" }, "tier": 1, "evidenceBadge": "Class 1" }
      ],
      "checklistItems": [
        { "id": "c1", "label": { "en": "string", "vi": "string" }, "role": "inclusion | exclusion" }
      ],
      "edges": [
        {
          "id": "e1",
          "label": { "en": "string", "vi": "string" },
          "sublabel": { "en": "string", "vi": "string" },
          "targetNodeId": "n2",
          "tone": "default | positive | warning | danger",
          "checklistTrigger": "pass | fail",
          "autoUnrollLoop": false
        }
      ],
      "clinicalPearl": { "en": "string", "vi": "string" }
    }
  ],
  "confidenceNotes": ["string"]
}`;
}

function asNonEmptyString(val: unknown): string {
  return typeof val === "string" ? val.trim() : "";
}

function sanitizeBilingual(
  raw: unknown,
  fallbackEn = ""
): BilingualText | undefined {
  if (typeof raw === "string") {
    const clean = raw.trim();
    return clean ? { en: clean } : fallbackEn ? { en: fallbackEn } : undefined;
  }
  if (!raw || typeof raw !== "object") {
    return fallbackEn ? { en: fallbackEn } : undefined;
  }
  const obj = raw as Record<string, unknown>;
  const en = asNonEmptyString(obj.en) || fallbackEn;
  const vi = asNonEmptyString(obj.vi);
  if (!en) return undefined;
  return vi ? { en, vi } : { en };
}

function sanitizeTier(val: unknown): 1 | 2 | 3 | 4 | 5 | undefined {
  const num = typeof val === "number" ? val : Number(val);
  if (Number.isInteger(num) && num >= 1 && num <= 5) {
    return num as 1 | 2 | 3 | 4 | 5;
  }
  return undefined;
}

export function normalizeExtractedPathwayPayload(
  raw: unknown,
  ctx: {
    imageUrl: string;
    imageSha256: string;
    mimeType: string;
    fileName?: string;
    metadata: ExtractPathwayMetadataInput;
    model: string;
  }
): {
  draft: CreatePathwayDraftInput;
  validation: PathwayValidationResult;
  confidenceNotes: string[];
} {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const fallbackTitle =
    ctx.metadata.title?.trim() ||
    ctx.metadata.sourceTitle.trim() ||
    "Untitled Clinical Pathway";

  const title = sanitizeBilingual(obj.title, fallbackTitle) ?? { en: fallbackTitle };
  const summary = sanitizeBilingual(obj.summary);
  const slug = normalizePathwaySlug(
    title.en,
    ctx.metadata.organizationOrAuthor,
    ctx.metadata.year
  );

  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const usedIds = new Set<string>();
  const rawIdToNormalizedId = new Map<string, string>();
  const nodes: PathwayNode[] = [];

  for (let i = 0; i < rawNodes.length; i++) {
    const rawNode =
      rawNodes[i] && typeof rawNodes[i] === "object"
        ? (rawNodes[i] as Record<string, unknown>)
        : {};

    const rawId = asNonEmptyString(rawNode.id) || `n${i + 1}`;
    let cleanId = rawId;
    let suffix = 2;
    while (usedIds.has(cleanId)) {
      cleanId = `${rawId}_${suffix++}`;
    }
    usedIds.add(cleanId);
    if (!rawIdToNormalizedId.has(rawId)) {
      rawIdToNormalizedId.set(rawId, cleanId);
    }

    const rawEdges = Array.isArray(rawNode.edges) ? rawNode.edges : [];
    const rawKind = asNonEmptyString(rawNode.kind) as PathwayNodeKind;
    const kind: PathwayNodeKind = VALID_NODE_KINDS.has(rawKind)
      ? rawKind
      : rawEdges.length > 0
        ? "decision"
        : "action";

    const nodeTitle = sanitizeBilingual(rawNode.title, `Step ${i + 1}`) ?? {
      en: `Step ${i + 1}`,
    };
    const body = sanitizeBilingual(rawNode.body);
    const warning = sanitizeBilingual(rawNode.warning);
    const clinicalPearl = sanitizeBilingual(rawNode.clinicalPearl);

    const isNonRecommendationKind =
      kind === "decision" ||
      kind === "entry" ||
      kind === "section" ||
      kind === "criteria";
    const tier = isNonRecommendationKind ? undefined : sanitizeTier(rawNode.tier);
    const evidenceBadge = isNonRecommendationKind
      ? undefined
      : asNonEmptyString(rawNode.evidenceBadge) || undefined;

    const rawChoiceLayout = asNonEmptyString(rawNode.choiceLayout) as PathwayChoiceLayout;
    const choiceLayout = VALID_CHOICE_LAYOUTS.has(rawChoiceLayout)
      ? rawChoiceLayout
      : undefined;

    const rawCompoundOp = asNonEmptyString(rawNode.compoundOperator).toUpperCase();
    const compoundOperator =
      rawCompoundOp === "AND" || rawCompoundOp === "OR"
        ? (rawCompoundOp as "AND" | "OR")
        : undefined;

    const compoundItems: PathwayCompoundItem[] | undefined = Array.isArray(
      rawNode.compoundItems
    )
      ? rawNode.compoundItems
          .map((item): PathwayCompoundItem | null => {
            if (!item || typeof item !== "object") return null;
            const rec = item as Record<string, unknown>;
            const cTitle = sanitizeBilingual(rec.title);
            if (!cTitle) return null;
            const cBody = sanitizeBilingual(rec.body);
            const cTier = sanitizeTier(rec.tier);
            const cBadge = asNonEmptyString(rec.evidenceBadge) || undefined;
            return {
              title: cTitle,
              ...(cBody ? { body: cBody } : {}),
              ...(cTier !== undefined ? { tier: cTier } : {}),
              ...(cBadge ? { evidenceBadge: cBadge } : {}),
            };
          })
          .filter((x): x is PathwayCompoundItem => x !== null)
      : undefined;

    const checklistItems: PathwayChecklistItem[] | undefined = Array.isArray(
      rawNode.checklistItems
    )
      ? rawNode.checklistItems
          .map((item, idx): PathwayChecklistItem | null => {
            if (!item || typeof item !== "object") return null;
            const rec = item as Record<string, unknown>;
            const label = sanitizeBilingual(rec.label);
            if (!label) return null;
            const role = rec.role === "exclusion" ? "exclusion" : "inclusion";
            return {
              id: asNonEmptyString(rec.id) || `${cleanId}_c${idx + 1}`,
              label,
              role,
            };
          })
          .filter((x): x is PathwayChecklistItem => x !== null)
      : undefined;

    const edges: PathwayEdge[] = rawEdges
      .map((edge, idx): PathwayEdge | null => {
        if (!edge || typeof edge !== "object") return null;
        const rec = edge as Record<string, unknown>;
        const targetNodeId = asNonEmptyString(rec.targetNodeId);
        if (!targetNodeId) return null;
        const label = sanitizeBilingual(rec.label) ?? {
          en: "Continue",
          vi: "Tiếp tục",
        };
        const sublabel = sanitizeBilingual(rec.sublabel);
        const rawTone = asNonEmptyString(rec.tone);
        const tone = VALID_EDGE_TONES.has(rawTone)
          ? (rawTone as PathwayEdge["tone"])
          : "default";
        const checklistTrigger =
          rec.checklistTrigger === "pass" || rec.checklistTrigger === "fail"
            ? rec.checklistTrigger
            : undefined;
        const autoUnrollLoop = rec.autoUnrollLoop === true ? true : undefined;

        return {
          id: asNonEmptyString(rec.id) || `${cleanId}_e${idx + 1}`,
          label,
          ...(sublabel ? { sublabel } : {}),
          targetNodeId,
          tone,
          ...(checklistTrigger ? { checklistTrigger } : {}),
          ...(autoUnrollLoop ? { autoUnrollLoop } : {}),
        };
      })
      .filter((x): x is PathwayEdge => x !== null);

    const normalizedKind: PathwayNodeKind =
      edges.length === 0 && kind === "action"
        ? ctx.metadata.domain === "diagnosis"
          ? "diagnosis"
          : "treatment"
        : kind;

    nodes.push({
      id: cleanId,
      kind: normalizedKind,
      title: nodeTitle,
      ...(body ? { body } : {}),
      ...(warning ? { warning } : {}),
      ...(tier !== undefined ? { tier } : {}),
      ...(evidenceBadge ? { evidenceBadge } : {}),
      ...(choiceLayout && choiceLayout !== "auto" ? { choiceLayout } : {}),
      ...(compoundItems && compoundItems.length > 0
        ? {
            compoundOperator: compoundOperator ?? "AND",
            compoundItems,
          }
        : {}),
      ...(checklistItems && checklistItems.length > 0 ? { checklistItems } : {}),
      edges,
      ...(clinicalPearl ? { clinicalPearl } : {}),
    });
  }

  // Remap targetNodeIds if any duplicate raw IDs were disambiguated
  for (const node of nodes) {
    for (const edge of node.edges) {
      const mapped = rawIdToNormalizedId.get(edge.targetNodeId);
      if (mapped) {
        edge.targetNodeId = mapped;
      }
    }
  }

  const rawEntryId = asNonEmptyString(obj.entryNodeId);
  const mappedEntryId = rawIdToNormalizedId.get(rawEntryId) || rawEntryId;
  let entryNodeId = usedIds.has(mappedEntryId)
    ? mappedEntryId
    : nodes[0]?.id || "n1";

  // Compact strictly empty non-entry echo nodes (1 outgoing edge, no body/tier/warning/pearl,
  // title verbatim matches incoming edge label) while preserving 2-node entry -> terminal flows.
  const normalizeText = (s?: string) =>
    (s || "")
      .trim()
      .toLowerCase()
      .replace(/[*†‡.,:;!?()[\]{}'"`]+/g, "")
      .replace(/\s+/g, " ");

  const echoIdsToRemove = new Set<string>();
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  for (const parent of nodes) {
    for (const edge of parent.edges) {
      const target = nodeById.get(edge.targetNodeId);
      if (!target) continue;
      if (target.id === entryNodeId || target.kind === "entry" || target.kind === "checklist") {
        continue;
      }
      if (target.edges.length !== 1) continue;
      if (
        target.body?.en?.trim() ||
        target.warning?.en?.trim() ||
        target.clinicalPearl?.en?.trim() ||
        target.tier !== undefined ||
        target.evidenceBadge?.trim() ||
        (target.compoundItems && target.compoundItems.length > 0)
      ) {
        continue;
      }
      if (normalizeText(target.title.en) === normalizeText(edge.label.en)) {
        const nextTargetId = target.edges[0].targetNodeId;
        if (nextTargetId && nextTargetId !== target.id) {
          edge.targetNodeId = nextTargetId;
          echoIdsToRemove.add(target.id);
        }
      }
    }
  }
  const compactedNodes =
    echoIdsToRemove.size > 0
      ? nodes.filter((n) => !echoIdsToRemove.has(n.id))
      : nodes;
  if (compactedNodes.length > 0 && !compactedNodes.some((n) => n.id === entryNodeId)) {
    entryNodeId = compactedNodes[0].id;
  }

  const abbreviations: PathwayAbbreviation[] | undefined = Array.isArray(
    obj.abbreviations
  )
    ? obj.abbreviations
        .map((item): PathwayAbbreviation | null => {
          if (!item || typeof item !== "object") return null;
          const rec = item as Record<string, unknown>;
          const term = asNonEmptyString(rec.term);
          const expansion = sanitizeBilingual(rec.expansion);
          if (!term || !expansion) return null;
          return { term, expansion };
        })
        .filter((x): x is PathwayAbbreviation => x !== null)
    : undefined;

  const footnotes: PathwayFootnote[] | undefined = Array.isArray(obj.footnotes)
    ? obj.footnotes
        .map((item): PathwayFootnote | null => {
          if (!item || typeof item !== "object") return null;
          const rec = item as Record<string, unknown>;
          const symbol = asNonEmptyString(rec.symbol) || "*";
          const text = sanitizeBilingual(rec.text);
          if (!text) return null;
          return { symbol, text };
        })
        .filter((x): x is PathwayFootnote => x !== null)
    : undefined;

  const confidenceNotes = Array.isArray(obj.confidenceNotes)
    ? obj.confidenceNotes
        .map((n) => (typeof n === "string" ? n.trim() : ""))
        .filter(Boolean)
    : [];

  const draft: CreatePathwayDraftInput = {
    slug,
    title,
    ...(summary ? { summary } : {}),
    subspecialty: ctx.metadata.subspecialty,
    ...(ctx.metadata.conditionId?.trim()
      ? { conditionId: ctx.metadata.conditionId.trim() }
      : {}),
    domain: ctx.metadata.domain,
    source: {
      sourceType: ctx.metadata.sourceType,
      title: ctx.metadata.sourceTitle.trim(),
      organizationOrAuthor: ctx.metadata.organizationOrAuthor.trim(),
      year: ctx.metadata.year,
      ...(ctx.metadata.figureRef?.trim()
        ? { figureRef: ctx.metadata.figureRef.trim() }
        : {}),
      ...(ctx.metadata.url?.trim() ? { url: ctx.metadata.url.trim() } : {}),
      ...(ctx.metadata.linkedGuidelineId?.trim()
        ? { linkedGuidelineId: ctx.metadata.linkedGuidelineId.trim() }
        : {}),
    },
    sourceImageUrl: ctx.imageUrl,
    sourceImageSha256: ctx.imageSha256,
    sourceImageMeta: {
      mimeType: ctx.mimeType,
      ...(ctx.fileName ? { fileName: ctx.fileName } : {}),
    },
    entryNodeId,
    nodes: compactedNodes,
    ...(abbreviations && abbreviations.length > 0 ? { abbreviations } : {}),
    ...(footnotes && footnotes.length > 0 ? { footnotes } : {}),
    extractionMeta: {
      model: ctx.model,
      extractedAt: new Date().toISOString(),
      confidenceNotes,
    },
  };

  const validation = validateClinicalPathway(draft);
  return { draft, validation, confidenceNotes };
}

export async function extractPathwayFromImage(
  input: ExtractPathwayImageInput
): Promise<ExtractPathwayResult> {
  const apiKey = input.apiKey?.trim() || loadGeminiApiKey();
  if (!apiKey) {
    throw new PathwayServiceError(
      "STORAGE_ERROR",
      "GEMINI_API_KEY is not configured on the server."
    );
  }

  const prompt = buildPathwayExtractionPrompt(input.metadata);
  const base64Image = input.imageBuffer.toString("base64");

  const result = await callGeminiWaterfallJson({
    source: "neuroguide/pathwayExtractor",
    apiKey,
    models: input.models ?? GEMINI_WATERFALL_MODELS,
    fetchImpl: input.fetchImpl,
    timeoutMs: input.timeoutMs,
    temperature: 0.15,
    responseMimeType: "application/json",
    parts: [
      {
        inlineData: {
          mimeType: input.mimeType,
          data: base64Image,
        },
      },
      { text: prompt },
    ],
  });

  if (!result.ok) {
    throw new PathwayServiceError(
      "STORAGE_ERROR",
      `All Gemini Vision models failed to extract flowchart: ${result.lastErrorReason}`
    );
  }

  const normalized = normalizeExtractedPathwayPayload(result.data, {
    imageUrl: input.imageUrl,
    imageSha256: input.imageSha256,
    mimeType: input.mimeType,
    fileName: input.fileName,
    metadata: input.metadata,
    model: result.model,
  });

  return {
    ok: true,
    draft: normalized.draft,
    validation: normalized.validation,
    model: result.model,
    confidenceNotes: normalized.confidenceNotes,
  };
}
