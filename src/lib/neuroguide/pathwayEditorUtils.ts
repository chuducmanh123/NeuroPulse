import type { SubspecialtyType } from "../../types/neuroguide.ts";
import type {
  ClinicalPathwayDoc,
  PathwayChecklistItem,
  PathwayDomain,
  PathwayEdge,
  PathwayNode,
  PathwaySourceType,
} from "../../types/clinicalPathways.ts";
import { normalizePathwaySlug } from "./pathwayValidator.ts";

export const PATHWAY_EDITOR_DRAFT_PREFIX = "neuroguide:pathway-editor-draft:";

export interface LocalPathwayEditorDraft {
  doc: ClinicalPathwayDoc;
  baseRev: number;
  savedAt: string;
}

export function getPathwayDraftStorageKey(uidOrNew: string): string {
  const clean = (uidOrNew || "new").trim() || "new";
  return `${PATHWAY_EDITOR_DRAFT_PREFIX}${clean}`;
}

export function saveLocalPathwayDraft(
  uidOrNew: string,
  draft: LocalPathwayEditorDraft,
  storage?: Pick<Storage, "setItem">
): void {
  try {
    const target =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!target) return;
    target.setItem(getPathwayDraftStorageKey(uidOrNew), JSON.stringify(draft));
  } catch {
    // Ignore storage quota or SSR errors
  }
}

export function loadLocalPathwayDraft(
  uidOrNew: string,
  storage?: Pick<Storage, "getItem">
): LocalPathwayEditorDraft | null {
  try {
    const target =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!target) return null;
    const raw = target.getItem(getPathwayDraftStorageKey(uidOrNew));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as Record<string, unknown>;
    if (
      !rec.doc ||
      typeof rec.doc !== "object" ||
      typeof rec.baseRev !== "number" ||
      typeof rec.savedAt !== "string"
    ) {
      return null;
    }
    const docObj = rec.doc as Record<string, unknown>;
    if (!Array.isArray(docObj.nodes) || typeof docObj.entryNodeId !== "string") {
      return null;
    }
    return {
      doc: rec.doc as ClinicalPathwayDoc,
      baseRev: rec.baseRev,
      savedAt: rec.savedAt,
    };
  } catch {
    return null;
  }
}

export function clearLocalPathwayDraft(
  uidOrNew: string,
  storage?: Pick<Storage, "removeItem">
): void {
  try {
    const target =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    if (!target) return;
    target.removeItem(getPathwayDraftStorageKey(uidOrNew));
  } catch {
    // Ignore storage errors
  }
}

export function createBlankNode(existingNodes: readonly PathwayNode[]): PathwayNode {
  const existingIds = new Set(existingNodes.map((n) => n.id));
  let idx = 1;
  while (existingIds.has(`n${idx}`)) {
    idx++;
  }
  return {
    id: `n${idx}`,
    kind: "decision",
    title: { en: "New Clinical Step", vi: "" },
    edges: [],
  };
}

export function createBlankEdge(
  nodeId: string,
  existingEdges: readonly PathwayEdge[],
  defaultTargetId: string
): PathwayEdge {
  const existingIds = new Set(existingEdges.map((e) => e.id));
  let idx = 1;
  while (existingIds.has(`${nodeId}_e${idx}`)) {
    idx++;
  }
  return {
    id: `${nodeId}_e${idx}`,
    label: { en: "Option", vi: "" },
    targetNodeId: defaultTargetId,
    tone: "default",
  };
}

export function createBlankChecklistItem(
  nodeId: string,
  existingItems: readonly PathwayChecklistItem[]
): PathwayChecklistItem {
  const existingIds = new Set(existingItems.map((c) => c.id));
  let idx = 1;
  while (existingIds.has(`${nodeId}_c${idx}`)) {
    idx++;
  }
  return {
    id: `${nodeId}_c${idx}`,
    label: { en: "Criterion", vi: "" },
    role: "inclusion",
  };
}

export function createStarterPathwayDraft(input: {
  titleEn: string;
  sourceType: PathwaySourceType;
  sourceTitle: string;
  organizationOrAuthor: string;
  year: number;
  figureRef?: string;
  url?: string;
  subspecialty: SubspecialtyType;
  domain: PathwayDomain;
  sourceImageUrl: string;
  sourceImageSha256?: string;
}): ClinicalPathwayDoc {
  const titleEn = input.titleEn.trim() || input.sourceTitle.trim() || "New Clinical Pathway";
  const slug = normalizePathwaySlug(
    titleEn,
    input.organizationOrAuthor,
    input.year
  );
  const nowIso = new Date().toISOString();
  const terminalKind = input.domain === "diagnosis" ? "diagnosis" : "treatment";

  return {
    uid: "",
    slug,
    title: { en: titleEn, vi: "" },
    summary: { en: "", vi: "" },
    subspecialty: input.subspecialty,
    domain: input.domain,
    source: {
      sourceType: input.sourceType,
      title: input.sourceTitle.trim(),
      organizationOrAuthor: input.organizationOrAuthor.trim() || "Unknown",
      year: input.year,
      ...(input.figureRef?.trim() ? { figureRef: input.figureRef.trim() } : {}),
      ...(input.url?.trim() ? { url: input.url.trim() } : {}),
    },
    sourceImageUrl: input.sourceImageUrl.trim(),
    ...(input.sourceImageSha256 ? { sourceImageSha256: input.sourceImageSha256 } : {}),
    entryNodeId: "n1",
    nodes: [
      {
        id: "n1",
        kind: "entry",
        title: { en: "Initial Clinical Presentation", vi: "" },
        edges: [
          {
            id: "n1_e1",
            label: { en: "Proceed", vi: "" },
            targetNodeId: "n2",
            tone: "positive",
          },
        ],
      },
      {
        id: "n2",
        kind: terminalKind,
        title: {
          en:
            terminalKind === "diagnosis"
              ? "Working Diagnosis"
              : "Recommended Management",
          vi: "",
        },
        edges: [],
      },
    ],
    status: "draft",
    rev: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function deleteNodeAndCleanupEdges(
  doc: ClinicalPathwayDoc,
  nodeIdToDelete: string
): ClinicalPathwayDoc {
  const remainingNodes = doc.nodes
    .filter((n) => n.id !== nodeIdToDelete)
    .map((n) => ({
      ...n,
      edges: n.edges.filter((e) => e.targetNodeId !== nodeIdToDelete),
    }));

  const nextEntry =
    doc.entryNodeId === nodeIdToDelete
      ? remainingNodes[0]?.id || ""
      : doc.entryNodeId;

  return {
    ...doc,
    entryNodeId: nextEntry,
    nodes: remainingNodes,
  };
}
