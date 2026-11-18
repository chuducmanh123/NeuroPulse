import type { DerivedNeuroGuideGraphView, UseNeuroGuideSyncStatus } from "../../../hooks/useNeuroGuideSync.ts";
import type {
  ClinicalScenario,
  ConferenceEvent,
  GuidelineDoc,
  PivotalTrialRecord,
  PracticeChangeDetail,
  RecommendationAtom,
  RecommendationLabelOutput,
} from "../../../types/neuroguide.ts";
import { cloneJson } from "../../sync/jsonPatch.ts";
import { deterministicUuidFromKey } from "./blockGraph.ts";
import type {
  NeuroGuideContentBlockRow,
  NeuroGuideProtocolRow,
  NeuroGuideStoreInput,
} from "./types.ts";

export type LookupSyncStatus = UseNeuroGuideSyncStatus;

export interface NeuroGuideSyncStatusViewInput {
  syncStatus: LookupSyncStatus;
  lastSyncAt: string | null;
  lastChangeCount: number;
  lastSeq: number;
  isOnline: boolean;
  showRecentChanges?: boolean;
}

export interface NeuroGuideSyncStatusView {
  kind: "updating" | "offline" | "error" | "ready";
  tone: "updating" | "offline" | "error" | "idle";
  label: string;
  primaryText: string;
  spinning: boolean;
  ariaLive: "polite" | "off";
  changeToast: string | null;
  updatedBadgeText: string | null;
}

export type PracticeChangeDetailWithBlockMeta = PracticeChangeDetail & {
  _blockUid?: string;
  _blockRev?: number;
  _blockSlug?: string;
};

export interface ReconstructedNeuroGuideCatalog {
  guidelines: GuidelineDoc[];
  conferences: ConferenceEvent[];
  scenarios: ClinicalScenario[];
  recommendationAtoms: RecommendationAtom[];
  pivotalTrials: PivotalTrialRecord[];
  customRecLabels: Record<string, RecommendationLabelOutput>;
  deletedGuidelineIds: string[];
  deletedTrialIds: string[];
}

function formatLocalTimeHHMM(isoTimestamp: string | null): string | null {
  if (!isoTimestamp) {
    return null;
  }
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Formats Sync v2 graph state into accessible UI status pill & change toast labels.
 */
export function formatNeuroGuideSyncStatusView(
  input: NeuroGuideSyncStatusViewInput,
): NeuroGuideSyncStatusView {
  const changeToast =
    input.lastChangeCount > 0 && input.showRecentChanges !== false
      ? input.lastChangeCount === 1
        ? "1 block updated"
        : `${input.lastChangeCount} blocks updated`
      : null;

  if (!input.isOnline || input.syncStatus === "offline") {
    const text = "Offline — showing saved data";
    return {
      kind: "offline",
      tone: "offline",
      label: text,
      primaryText: text,
      spinning: false,
      ariaLive: "polite",
      changeToast,
      updatedBadgeText: changeToast,
    };
  }

  if (input.syncStatus === "loading" || input.syncStatus === "syncing") {
    const text = "Updating…";
    return {
      kind: "updating",
      tone: "updating",
      label: text,
      primaryText: text,
      spinning: true,
      ariaLive: "polite",
      changeToast,
      updatedBadgeText: changeToast,
    };
  }

  if (input.syncStatus === "error") {
    const text = "Sync issue — showing saved data";
    return {
      kind: "error",
      tone: "error",
      label: text,
      primaryText: text,
      spinning: false,
      ariaLive: "polite",
      changeToast,
      updatedBadgeText: changeToast,
    };
  }

  const hhmm = formatLocalTimeHHMM(input.lastSyncAt);
  const text = hhmm
    ? `Up to date · ${hhmm} · seq #${input.lastSeq}`
    : `Up to date · seq #${input.lastSeq}`;

  return {
    kind: "ready",
    tone: "idle",
    label: text,
    primaryText: text,
    spinning: false,
    ariaLive: "off",
    changeToast,
    updatedBadgeText: changeToast,
  };
}

/**
 * Pure URL query string builder for shallow History API deep-linking in NeuroGuide.
 */
export function buildNeuroGuideSelectionSearchParams(
  currentSearch: string,
  selection: {
    tab?: string | null;
    docId?: string | null;
    blockSlug?: string | null;
    society?: string | null;
  },
): string {
  const params = new URLSearchParams(currentSearch);

  if (selection.tab !== undefined) {
    if (selection.tab) params.set("tab", selection.tab);
    else params.delete("tab");
  }
  if (selection.docId !== undefined) {
    if (selection.docId) params.set("doc", selection.docId);
    else params.delete("doc");
  }
  if (selection.blockSlug !== undefined) {
    if (selection.blockSlug) params.set("block", selection.blockSlug);
    else params.delete("block");
  }
  if (selection.society !== undefined) {
    if (selection.society && selection.society !== "ALL") {
      params.set("society", selection.society);
    } else {
      params.delete("society");
    }
  }

  return params.toString();
}

/**
 * Removes runtime block-envelope hints before hashing or persisting a PracticeChangeDetail.
 */
export function stripRuntimeBlockMeta(
  change: PracticeChangeDetail | PracticeChangeDetailWithBlockMeta,
): PracticeChangeDetail {
  const cloned = cloneJson(change) as PracticeChangeDetailWithBlockMeta;
  delete cloned._blockUid;
  delete cloned._blockRev;
  delete cloned._blockSlug;
  return cloned;
}

/**
 * Reconstructs a GuidelineDoc from a Tier-2 guideline protocol row and its ordered
 * Tier-3 content blocks, attaching block metadata (_blockUid, _blockRev, _blockSlug)
 * for granular admin editing, history, and conflict flows.
 */
export function reconstructGuidelineDocFromGraph(
  protocol: NeuroGuideProtocolRow,
  orderedBlocks: readonly NeuroGuideContentBlockRow[],
  fallbackDoc?: GuidelineDoc,
): GuidelineDoc {
  const baseDoc =
    protocol.metadata.kind === "guideline"
      ? cloneJson(protocol.metadata.doc)
      : ({
          id: protocol.slug,
          society: protocol.society,
          year: protocol.year,
          title: protocol.title,
          officialUrl: fallbackDoc?.officialUrl ?? "",
          journalTarget: fallbackDoc?.journalTarget ?? "",
          documentType: fallbackDoc?.documentType ?? "Clinical Practice Guideline",
          publishDate: fallbackDoc?.publishDate ?? `${protocol.year}-01-01`,
          subspecialty: protocol.subspecialties[0] ?? fallbackDoc?.subspecialty ?? "Stroke",
          subspecialties: protocol.subspecialties,
          executiveSummary: fallbackDoc?.executiveSummary ?? "",
          linkedScenarioIds: fallbackDoc?.linkedScenarioIds ?? [],
        } as Omit<GuidelineDoc, "allPracticeChanges">);

  const allPracticeChanges: PracticeChangeDetailWithBlockMeta[] = [];
  for (const block of orderedBlocks) {
    if (!block || block.deletedAt !== null) continue;
    const payload = block.data.payload;
    if (payload.kind !== "recommendation" && payload.kind !== "shared_clinical_block") {
      continue;
    }

    const rec = cloneJson(payload.practiceChange) as PracticeChangeDetailWithBlockMeta;
    const facet = block.data.facetIndex;

    if (facet?.v3Labels && (!rec.v3Labels || facet.v3Labels.isExplicit)) {
      rec.v3Labels = cloneJson(facet.v3Labels);
    }
    if (facet?.customLabel && !rec.ontologyLabels) {
      rec.ontologyLabels = cloneJson(facet.customLabel);
    }

    rec._blockUid = block.uid;
    rec._blockRev = block.rev;
    rec._blockSlug = block.slug;
    allPracticeChanges.push(rec);
  }

  return {
    ...(fallbackDoc ? cloneJson(fallbackDoc) : {}),
    ...baseDoc,
    allPracticeChanges,
  } as GuidelineDoc;
}

/**
 * Resolves the underlying Tier-3 ContentBlock row for a UI recommendation item.
 */
export function resolveRecommendationBlockForPracticeChange(params: {
  docId: string;
  recId?: string;
  index?: number;
  sharedBlockKey?: string | null;
  blockUidHint?: string | null;
  blocksByUid: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  blocksBySlug: ReadonlyMap<string, NeuroGuideContentBlockRow>;
  protocolsBySlug: ReadonlyMap<string, NeuroGuideProtocolRow>;
}): NeuroGuideContentBlockRow | null {
  const {
    docId,
    recId,
    index,
    sharedBlockKey,
    blockUidHint,
    blocksByUid,
    blocksBySlug,
    protocolsBySlug,
  } = params;

  if (blockUidHint) {
    const direct = blocksByUid.get(blockUidHint);
    if (direct && direct.deletedAt === null) return direct;
  }

  if (sharedBlockKey && sharedBlockKey.trim()) {
    const bySharedSlug = blocksBySlug.get(sharedBlockKey.trim().toLowerCase());
    if (bySharedSlug && bySharedSlug.deletedAt === null) return bySharedSlug;
    const sharedUid = deterministicUuidFromKey("ng-block", sharedBlockKey.trim());
    const bySharedUid = blocksByUid.get(sharedUid);
    if (bySharedUid && bySharedUid.deletedAt === null) return bySharedUid;
  }

  if (docId) {
    const proto = protocolsBySlug.get(docId.toLowerCase());
    if (proto && proto.deletedAt === null) {
      if (recId) {
        for (const bUid of proto.blockOrder) {
          const b = blocksByUid.get(bUid);
          if (!b || b.deletedAt !== null) continue;
          const payload = b.data.payload;
          if (
            (payload.kind === "recommendation" || payload.kind === "shared_clinical_block") &&
            payload.practiceChange?.id === recId
          ) {
            return b;
          }
          if (b.data.facetIndex.recId === recId) {
            return b;
          }
        }
      }
      if (typeof index === "number" && index >= 0 && index < proto.blockOrder.length) {
        const indexedBlock = blocksByUid.get(proto.blockOrder[index]);
        if (indexedBlock && indexedBlock.deletedAt === null) {
          return indexedBlock;
        }
      }
    }

    if (typeof index === "number") {
      const candidateKey = `rec:${docId}:${index}:${recId || `slot-${index}`}`;
      const bySlug = blocksBySlug.get(candidateKey.toLowerCase());
      if (bySlug && bySlug.deletedAt === null) return bySlug;
      const byUid = blocksByUid.get(deterministicUuidFromKey("ng-block", candidateKey));
      if (byUid && byUid.deletedAt === null) return byUid;
    }
  }

  return null;
}

/**
 * Reconstructs runtime UI catalogs deterministically from DerivedNeuroGuideGraphView
 * with graceful fallback to initial/baseline collections prior to initial sync.
 */
export function reconstructCatalogFromSyncGraph(
  derived: Pick<DerivedNeuroGuideGraphView, "store" | "graph" | "blocksByUid">,
  baseline?: Partial<NeuroGuideStoreInput>,
): ReconstructedNeuroGuideCatalog {
  const { store, graph, blocksByUid } = derived;
  const fallbackGuidelines = baseline?.guidelines ?? [];
  const fallbackById = new Map<string, GuidelineDoc>();
  for (const g of fallbackGuidelines) {
    if (g?.id) fallbackById.set(g.id.toLowerCase(), g);
  }

  const deletedGuidelineSet = new Set(
    (store.deletedGuidelineIds || []).map((id) => String(id).toLowerCase().trim()).filter(Boolean),
  );

  const hasSyncedGraph = graph.protocols.length > 0 || graph.blocks.length > 0;
  if (!hasSyncedGraph) {
    return {
      guidelines: cloneJson(fallbackGuidelines),
      conferences: cloneJson(baseline?.conferences ?? []),
      scenarios: cloneJson(baseline?.scenarios ?? []),
      recommendationAtoms: cloneJson(baseline?.recommendationAtoms ?? []),
      pivotalTrials: cloneJson(baseline?.pivotalTrials ?? []),
      customRecLabels: cloneJson(baseline?.customRecLabels ?? {}),
      deletedGuidelineIds: cloneJson(baseline?.deletedGuidelineIds ?? []),
      deletedTrialIds: cloneJson(baseline?.deletedTrialIds ?? []),
    };
  }

  const edgesByProtocol = new Map<string, string[]>();
  const sortedEdges = [...graph.protocolBlocks].sort((a, b) => a.position - b.position);
  for (const edge of sortedEdges) {
    const arr = edgesByProtocol.get(edge.protocolUid) ?? [];
    arr.push(edge.blockUid);
    edgesByProtocol.set(edge.protocolUid, arr);
  }

  let hasGuidelineProtocols = false;
  let hasConferenceProtocols = false;
  let hasScenarioCatalog = false;
  let hasTrialCatalog = false;
  let hasAtomCatalog = false;

  const guidelines: GuidelineDoc[] = [];

  for (const proto of graph.protocols) {
    if (proto.deletedAt !== null) continue;

    if (proto.metadata.kind === "guideline") {
      hasGuidelineProtocols = true;
      const docIdLower = proto.metadata.doc.id?.toLowerCase().trim() || proto.slug.toLowerCase();
      if (deletedGuidelineSet.has(docIdLower) || deletedGuidelineSet.has(proto.slug.toLowerCase())) {
        continue;
      }

      const orderedUids = edgesByProtocol.get(proto.uid) ?? proto.blockOrder;
      const orderedBlocks: NeuroGuideContentBlockRow[] = [];
      for (const uid of orderedUids) {
        const block = blocksByUid.get(uid);
        if (block && block.deletedAt === null) {
          orderedBlocks.push(block);
        }
      }
      guidelines.push(
        reconstructGuidelineDocFromGraph(proto, orderedBlocks, fallbackById.get(docIdLower)),
      );
    } else if (proto.metadata.kind === "conference") {
      hasConferenceProtocols = true;
    } else if (proto.metadata.kind === "scenario_catalog") {
      if (proto.metadata.catalogKind === "clinical_scenarios") hasScenarioCatalog = true;
      else if (proto.metadata.catalogKind === "pivotal_trials") hasTrialCatalog = true;
      else if (proto.metadata.catalogKind === "recommendation_atoms") hasAtomCatalog = true;
    }
  }

  guidelines.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.society || "").localeCompare(b.society || "");
  });

  const mergedCustomLabels: Record<string, RecommendationLabelOutput> = {
    ...(baseline?.customRecLabels ? cloneJson(baseline.customRecLabels) : {}),
    ...(store.customRecLabels ? cloneJson(store.customRecLabels) : {}),
  };

  return {
    guidelines: hasGuidelineProtocols ? guidelines : cloneJson(fallbackGuidelines),
    conferences: hasConferenceProtocols
      ? cloneJson(store.conferences || [])
      : cloneJson(baseline?.conferences ?? []),
    scenarios: hasScenarioCatalog
      ? cloneJson(store.scenarios || [])
      : cloneJson(baseline?.scenarios ?? []),
    recommendationAtoms: hasAtomCatalog
      ? cloneJson(store.recommendationAtoms || [])
      : cloneJson(baseline?.recommendationAtoms ?? []),
    pivotalTrials: hasTrialCatalog
      ? cloneJson(store.pivotalTrials || [])
      : cloneJson(baseline?.pivotalTrials ?? []),
    customRecLabels: mergedCustomLabels,
    deletedGuidelineIds: cloneJson(store.deletedGuidelineIds || []),
    deletedTrialIds: cloneJson(store.deletedTrialIds || []),
  };
}
