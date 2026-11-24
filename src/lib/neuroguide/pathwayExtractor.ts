import fs from "node:fs";
import path from "node:path";
import type { SubspecialtyType } from "../../types/neuroguide.ts";
import type {
  BilingualText,
  PathwayChecklistItem,
  PathwayDomain,
  PathwayEdge,
  PathwayNode,
  PathwayNodeKind,
  PathwaySourceType,
  PathwayValidationResult,
} from "../../types/clinicalPathways.ts";
import { GEMINI_WATERFALL_MODELS, recordGeminiFallback } from "../gemini/models.ts";
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
  "decision",
  "checklist",
  "action",
  "diagnosis",
  "treatment",
]);

const VALID_EDGE_TONES = new Set(["default", "positive", "warning", "danger"]);

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

  return `You are a clinical neurology informatics specialist extracting a structured interactive step-by-step clinical pathway from an uploaded flowchart image.

Source context:
- Source Type: ${sourceLabel}
- Source Title: ${metadata.sourceTitle}
- Organization / Author: ${metadata.organizationOrAuthor} (${metadata.year})
- Subspecialty: ${metadata.subspecialty}
- Clinical Domain: ${metadata.domain}${metadata.figureRef ? `\n- Figure / Page: ${metadata.figureRef}` : ""}${metadata.title ? `\n- Preferred Title: ${metadata.title}` : ""}${extra}

CRITICAL RULES:
1. Transcribe EVERY box, clinical question, threshold, drug/dosing cue, contraindication/warning, and arrow label VERBATIM in English ("en") from the image.
2. NEVER hallucinate or invent clinical criteria, dosages, or branches that are not explicitly shown in the image.
3. For every "en" field, provide a concise, clinically accurate Vietnamese translation in "vi" while keeping standard medical terms, drug names, and scores (NIHSS, mRS, ASPECTS, IVT, EVT, tPA, TNK, etc.) intact.
4. If the image shows Class/LOE recommendations (e.g. "Class I, LOE A", "COR 1", "Strong recommendation"), include "evidenceBadge" and map "tier" (1=Class I/Strong FOR, 2=Class IIa/Moderate, 3=Class IIb/Weak, 4=Expert Consensus, 5=Class III/Harm). Omit "tier" if not stated.
5. If any part of the flowchart is blurry, cut off, or ambiguous, record it clearly in "confidenceNotes".
6. Every "targetNodeId" in "edges" MUST match a valid "id" in "nodes". Terminal diagnosis/treatment nodes should have "edges": [].

Return ONLY valid JSON matching this exact structure:
{
  "title": { "en": "string", "vi": "string" },
  "summary": { "en": "string", "vi": "string" },
  "entryNodeId": "n1",
  "nodes": [
    {
      "id": "n1",
      "kind": "entry | decision | checklist | action | diagnosis | treatment",
      "title": { "en": "string", "vi": "string" },
      "body": { "en": "string", "vi": "string" },
      "warning": { "en": "string", "vi": "string" },
      "tier": 1,
      "evidenceBadge": "Class I, LOE A",
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
          "checklistTrigger": "pass | fail"
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
    const tier = sanitizeTier(rawNode.tier);
    const evidenceBadge = asNonEmptyString(rawNode.evidenceBadge) || undefined;

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
        const label = sanitizeBilingual(rec.label, "Continue") ?? { en: "Continue" };
        const sublabel = sanitizeBilingual(rec.sublabel);
        const rawTone = asNonEmptyString(rec.tone);
        const tone = VALID_EDGE_TONES.has(rawTone)
          ? (rawTone as PathwayEdge["tone"])
          : "default";
        const checklistTrigger =
          rec.checklistTrigger === "pass" || rec.checklistTrigger === "fail"
            ? rec.checklistTrigger
            : undefined;

        return {
          id: asNonEmptyString(rec.id) || `${cleanId}_e${idx + 1}`,
          label,
          ...(sublabel ? { sublabel } : {}),
          targetNodeId,
          tone,
          ...(checklistTrigger ? { checklistTrigger } : {}),
        };
      })
      .filter((x): x is PathwayEdge => x !== null);

    nodes.push({
      id: cleanId,
      kind,
      title: nodeTitle,
      ...(body ? { body } : {}),
      ...(warning ? { warning } : {}),
      ...(tier !== undefined ? { tier } : {}),
      ...(evidenceBadge ? { evidenceBadge } : {}),
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
  const entryNodeId = usedIds.has(mappedEntryId)
    ? mappedEntryId
    : nodes[0]?.id || "n1";

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
    nodes,
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

  const fetchFn = input.fetchImpl ?? fetch;
  const models = input.models ?? GEMINI_WATERFALL_MODELS;
  const prompt = buildPathwayExtractionPrompt(input.metadata);
  const base64Image = input.imageBuffer.toString("base64");
  let lastErrorReason = "Unknown Gemini extraction failure";

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const nextModel = models[i + 1];
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: input.mimeType,
                    data: base64Image,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.15,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        lastErrorReason = res.statusText || `HTTP ${res.status}`;
        recordGeminiFallback({
          source: "neuroguide/pathwayExtractor",
          failedModel: model,
          status: res.status,
          reason: lastErrorReason,
          nextModel,
        });
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string; thought?: boolean }>;
          };
        }>;
      };
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const textParts = parts
        .filter((p) => Boolean(p?.text) && !p?.thought)
        .map((p) => p.text as string);
      let rawJson = textParts.join("").trim();
      if (!rawJson && parts[0]?.text) {
        rawJson = parts[0].text.trim();
      }

      if (!rawJson) {
        lastErrorReason = "Empty response from Gemini Vision";
        recordGeminiFallback({
          source: "neuroguide/pathwayExtractor",
          failedModel: model,
          reason: lastErrorReason,
          nextModel,
        });
        continue;
      }

      rawJson = rawJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const parsed = JSON.parse(rawJson) as unknown;
      const normalized = normalizeExtractedPathwayPayload(parsed, {
        imageUrl: input.imageUrl,
        imageSha256: input.imageSha256,
        mimeType: input.mimeType,
        fileName: input.fileName,
        metadata: input.metadata,
        model,
      });

      return {
        ok: true,
        draft: normalized.draft,
        validation: normalized.validation,
        model,
        confidenceNotes: normalized.confidenceNotes,
      };
    } catch (err) {
      lastErrorReason = err instanceof Error ? err.message : "Network or JSON parse error";
      recordGeminiFallback({
        source: "neuroguide/pathwayExtractor",
        failedModel: model,
        reason: lastErrorReason,
        nextModel,
      });
    }
  }

  throw new PathwayServiceError(
    "STORAGE_ERROR",
    `All Gemini Vision models failed to extract flowchart: ${lastErrorReason}`
  );
}
