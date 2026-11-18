import type {
  ClinicalScenario,
  GuidelineDoc,
  PivotalTrialRecord,
  RecommendationLabelOutput,
} from "../../../types/neuroguide.ts";
import { deriveNeuroGuideStoreFromGraphSnapshot } from "../../../hooks/useNeuroGuideSync.ts";
import { cloneJson, computeJsonPatch } from "../../sync/jsonPatch.ts";
import {
  computeBlockContentHash,
  computeBlockSectionHashes,
  computeProtocolMetadataHash,
  decomposeNeuroGuideStoreToGraph,
  deterministicUuidFromKey,
} from "./blockGraph.ts";
import {
  reconstructCatalogFromSyncGraph,
  stripRuntimeBlockMeta,
  type PracticeChangeDetailWithBlockMeta,
  type ReconstructedNeuroGuideCatalog,
} from "./lookupHelpers.ts";
import type { NeuroGuideRepo } from "./repo.ts";
import type {
  NeuroGuideBlockLinkEdge,
  NeuroGuideContentBlockData,
  NeuroGuideContentBlockRow,
  NeuroGuideProtocolEdgeInput,
  NeuroGuideProtocolRow,
  NeuroGuideStoreInput,
} from "./types.ts";

export interface LoadedNeuroGuideV2Catalog extends ReconstructedNeuroGuideCatalog {
  maxSeq: number;
  rootHash: string;
  protocolCount: number;
  blockCount: number;
  linkCount: number;
  lastUpdatedAt: string | null;
}

export interface SyncGuidelineToV2Result {
  protocol: NeuroGuideProtocolRow;
  updatedBlockUids: string[];
  createdBlockUids: string[];
  deletedBlockUids: string[];
  unchangedBlockCount: number;
}

export async function listAllBlocksMap(
  repo: NeuroGuideRepo,
): Promise<{
  liveBlocksByUid: Map<string, NeuroGuideContentBlockRow>;
  allBlocksBySlug: Map<string, NeuroGuideContentBlockRow>;
}> {
  const liveBlocksByUid = new Map<string, NeuroGuideContentBlockRow>();
  const allBlocksBySlug = new Map<string, NeuroGuideContentBlockRow>();

  let since = 0;
  while (true) {
    const batch = await repo.changesSince(since, 500);
    for (const row of batch.rows) {
      allBlocksBySlug.set(row.slug, row);
      if (row.deletedAt === null) {
        liveBlocksByUid.set(row.uid, row);
      } else {
        liveBlocksByUid.delete(row.uid);
      }
    }
    const lastRow = batch.rows[batch.rows.length - 1];
    if (batch.rows.length < 500 || !lastRow || lastRow.changeSeq >= batch.maxSeq) {
      break;
    }
    since = lastRow.changeSeq;
  }

  return { liveBlocksByUid, allBlocksBySlug };
}

/**
 * Loads full NeuroGuide catalogs from Sync v2 2-tier graph tables (`protocols`,
 * `content_blocks`, `protocol_blocks`, `block_links`) using paginated fetches.
 */
export async function loadNeuroGuideCatalogFromSyncV2(
  repo: NeuroGuideRepo,
  baseline?: Partial<NeuroGuideStoreInput>,
): Promise<LoadedNeuroGuideV2Catalog> {
  const [{ liveBlocksByUid }, liveProtocols, protocolEdges, blockLinks, syncState] =
    await Promise.all([
      listAllBlocksMap(repo),
      repo.listLiveProtocols(),
      repo.listProtocolEdges(),
      repo.listBlockLinks(),
      repo.getSyncState(),
    ]);

  const protocolsMap = new Map<string, NeuroGuideProtocolRow>();
  for (const proto of liveProtocols) {
    protocolsMap.set(proto.uid, proto);
  }

  const derived = deriveNeuroGuideStoreFromGraphSnapshot(
    protocolsMap,
    liveBlocksByUid,
    blockLinks,
  );
  // Inject authoritative edge positions loaded from repo.listProtocolEdges()
  derived.graph.protocolBlocks = protocolEdges;

  const catalog = reconstructCatalogFromSyncGraph(derived, baseline);

  let lastUpdatedAt: string | null = null;
  for (const proto of liveProtocols) {
    if (proto.updatedAt && (!lastUpdatedAt || proto.updatedAt > lastUpdatedAt)) {
      lastUpdatedAt = proto.updatedAt;
    }
  }
  for (const block of liveBlocksByUid.values()) {
    if (block.updatedAt && (!lastUpdatedAt || block.updatedAt > lastUpdatedAt)) {
      lastUpdatedAt = block.updatedAt;
    }
  }

  return {
    ...catalog,
    maxSeq: syncState.maxSeq,
    rootHash: syncState.rootHash || derived.graph.rootHash,
    protocolCount: liveProtocols.length,
    blockCount: liveBlocksByUid.size,
    linkCount: blockLinks.length,
    lastUpdatedAt,
  };
}

/**
 * Granularly synchronizes a GuidelineDoc into NeuroGuideRepo:
 * unchanged child recommendation blocks retain their `rev` and `changeSeq`,
 * changed blocks get patched (`updateBlock`), removed blocks get tombstoned,
 * and cross-link edges are synced for updated/created blocks.
 */
export async function syncGuidelineDocToV2Repo(
  repo: NeuroGuideRepo,
  doc: GuidelineDoc,
  options?: { actor?: string | null; sourceVersion?: string | null },
): Promise<SyncGuidelineToV2Result> {
  const actor = options?.actor?.trim() || "admin";
  const rawChanges = Array.isArray(doc.allPracticeChanges)
    ? (doc.allPracticeChanges as PracticeChangeDetailWithBlockMeta[])
    : [];
  const blockUidHints = rawChanges.map((c) => c?._blockUid ?? null);

  const cleanedDoc: GuidelineDoc = {
    ...cloneJson(doc),
    allPracticeChanges: rawChanges.map((c) => stripRuntimeBlockMeta(c)),
  };

  const [{ liveBlocksByUid, allBlocksBySlug }, liveProtocols] = await Promise.all([
    listAllBlocksMap(repo),
    repo.listLiveProtocols(),
  ]);

  const existingScenarios: ClinicalScenario[] = [];
  const existingTrials: PivotalTrialRecord[] = [];
  const existingCustomLabels: Record<string, RecommendationLabelOutput> = {};

  for (const b of liveBlocksByUid.values()) {
    if (b.data.payload.kind === "clinical_scenario") {
      existingScenarios.push(cloneJson(b.data.payload.scenario));
    } else if (b.data.payload.kind === "pivotal_trial") {
      existingTrials.push(cloneJson(b.data.payload.trial));
    } else if (
      (b.data.payload.kind === "recommendation" ||
        b.data.payload.kind === "shared_clinical_block") &&
      b.data.facetIndex.recId &&
      b.data.facetIndex.customLabel
    ) {
      existingCustomLabels[b.data.facetIndex.recId] = cloneJson(
        b.data.facetIndex.customLabel,
      );
    }
  }

  const targetProtoSlug = cleanedDoc.id.toLowerCase().trim();
  const targetProtoDeterministicUid = deterministicUuidFromKey(
    "ng-protocol",
    cleanedDoc.id,
  );
  const existingProto = liveProtocols.find(
    (p) => p.slug === targetProtoSlug || p.uid === targetProtoDeterministicUid,
  );

  const decomposed = decomposeNeuroGuideStoreToGraph({
    guidelines: [cleanedDoc],
    conferences: [],
    scenarios: existingScenarios,
    pivotalTrials: existingTrials,
    customRecLabels: existingCustomLabels,
  });

  const decomposedProto = decomposed.protocols.find(
    (p) => p.metadata.kind === "guideline",
  );
  if (!decomposedProto) {
    throw new Error(`Failed to decompose guideline '${doc.id}' into protocol graph`);
  }

  const decomposedBlockByUid = new Map<string, NeuroGuideContentBlockRow>();
  for (const b of decomposed.blocks) {
    decomposedBlockByUid.set(b.uid, b);
  }

  const liveBySlug = new Map<string, NeuroGuideContentBlockRow>();
  for (const b of liveBlocksByUid.values()) {
    liveBySlug.set(b.slug, b);
  }

  const updatedBlockUids: string[] = [];
  const createdBlockUids: string[] = [];
  const deletedBlockUids: string[] = [];
  let unchangedBlockCount = 0;

  const actualBlockUids: string[] = [];
  const uidRemap = new Map<string, string>();
  const nextEdges: NeuroGuideProtocolEdgeInput[] = [];

  for (let idx = 0; idx < decomposedProto.blockOrder.length; idx++) {
    const tempUid = decomposedProto.blockOrder[idx];
    const targetBlock = decomposedBlockByUid.get(tempUid);
    if (!targetBlock) continue;

    const hintUid = blockUidHints[idx];
    let existingBlock =
      (hintUid ? liveBlocksByUid.get(hintUid) : undefined) ??
      liveBlocksByUid.get(targetBlock.uid) ??
      liveBySlug.get(targetBlock.slug);

    // Keep existing blockKey/slug if matched by uid hint across reordering
    const nextData: NeuroGuideContentBlockData = existingBlock
      ? {
          ...cloneJson(targetBlock.data),
          blockKey: existingBlock.blockKey,
        }
      : cloneJson(targetBlock.data);

    const contentHash = computeBlockContentHash(nextData);
    const sectionHashes = computeBlockSectionHashes(nextData);

    let persistedUid: string;
    if (existingBlock && existingBlock.deletedAt === null) {
      persistedUid = existingBlock.uid;
      if (existingBlock.contentHash === contentHash) {
        unchangedBlockCount += 1;
      } else {
        const patchDiff = computeJsonPatch(existingBlock.data, nextData);
        const res = await repo.updateBlock(
          existingBlock.uid,
          existingBlock.rev,
          nextData,
          contentHash,
          sectionHashes,
          patchDiff,
          actor,
        );
        if (!res.unchanged) {
          updatedBlockUids.push(existingBlock.uid);
        } else {
          unchangedBlockCount += 1;
        }
      }
    } else {
      // Only pass deterministic UID when no tombstoned/historical row already owns that slug/UID
      const hadTombstoneAtSlug = Boolean(
        allBlocksBySlug.get(nextData.blockKey.toLowerCase()),
      );
      const createOpts = hadTombstoneAtSlug ? undefined : { uid: targetBlock.uid };
      const created = await repo.createBlock(
        nextData,
        contentHash,
        sectionHashes,
        actor,
        createOpts,
      );
      persistedUid = created.row.uid;
      createdBlockUids.push(persistedUid);
      liveBlocksByUid.set(persistedUid, created.row);
    }

    uidRemap.set(targetBlock.uid, persistedUid);
    actualBlockUids.push(persistedUid);
    nextEdges.push({
      blockUid: persistedUid,
      position: idx,
      sectionPath: targetBlock.data.facetIndex.sectionPath ?? "",
      role:
        nextData.blockType === "shared_clinical_block"
          ? "shared"
          : "recommendation",
    });
  }

  // Soft-delete orphaned blocks once belonging to this guideline protocol (unless shared elsewhere)
  if (existingProto) {
    const keepSet = new Set(actualBlockUids);
    const sharedElsewhere = new Set<string>();
    for (const p of liveProtocols) {
      if (p.uid === existingProto.uid || p.deletedAt !== null) continue;
      for (const bUid of p.blockOrder) {
        sharedElsewhere.add(bUid);
      }
    }

    for (const oldUid of existingProto.blockOrder) {
      if (keepSet.has(oldUid) || sharedElsewhere.has(oldUid)) continue;
      const oldBlock =
        liveBlocksByUid.get(oldUid) ?? (await repo.getBlockByUid(oldUid));
      if (oldBlock && oldBlock.deletedAt === null) {
        await repo.removeBlock(oldUid, oldBlock.rev, actor);
        deletedBlockUids.push(oldUid);
      }
    }
  }

  const latestProtoBeforeUpsert = existingProto
    ? await repo.getProtocolByUid(existingProto.uid)
    : null;

  const protoRes = await repo.upsertProtocol(
    {
      uid: latestProtoBeforeUpsert?.uid ?? existingProto?.uid ?? decomposedProto.uid,
      slug: decomposedProto.slug,
      protocolType: "guideline",
      society: decomposedProto.society,
      year: decomposedProto.year,
      title: decomposedProto.title,
      status: decomposedProto.status,
      subspecialties: decomposedProto.subspecialties,
      metadata: decomposedProto.metadata,
      blockOrder: actualBlockUids,
      metadataHash: decomposedProto.metadataHash,
      edges: nextEdges,
      expectedRev: latestProtoBeforeUpsert?.rev ?? existingProto?.rev,
    },
    actor,
  );

  // Sync outgoing cross-link edges for changed or created blocks
  const mutatedTempUids = new Set([...createdBlockUids, ...updatedBlockUids]);
  if (mutatedTempUids.size > 0 && decomposed.blockLinks.length > 0) {
    const outgoingLinks: NeuroGuideBlockLinkEdge[] = [];
    for (const edge of decomposed.blockLinks) {
      const mappedSrc = uidRemap.get(edge.srcBlockUid) ?? edge.srcBlockUid;
      const mappedDst = uidRemap.get(edge.dstBlockUid) ?? edge.dstBlockUid;
      if (mutatedTempUids.has(mappedSrc)) {
        outgoingLinks.push({
          ...edge,
          srcBlockUid: mappedSrc,
          dstBlockUid: mappedDst,
        });
      }
    }
    if (outgoingLinks.length > 0) {
      await repo.replaceBlockLinks(outgoingLinks, false);
    }
  }

  const finalProto =
    (await repo.getProtocolByUid(protoRes.row.uid)) ?? protoRes.row;

  return {
    protocol: finalProto,
    updatedBlockUids,
    createdBlockUids,
    deletedBlockUids,
    unchangedBlockCount,
  };
}

/**
 * Soft-deletes a guideline protocol and its non-shared recommendation blocks in Sync v2.
 */
export async function syncDeleteGuidelineInV2Repo(
  repo: NeuroGuideRepo,
  docId: string,
  actor?: string | null,
): Promise<{ deletedProtocolUid: string | null; deletedBlockUids: string[] }> {
  const cleanActor = actor?.trim() || "admin";
  const targetSlug = docId.toLowerCase().trim();
  const deterministicUid = deterministicUuidFromKey("ng-protocol", docId);

  const liveProtocols = await repo.listLiveProtocols();
  const targetProto = liveProtocols.find(
    (p) => p.slug === targetSlug || p.uid === deterministicUid,
  );
  if (!targetProto) {
    return { deletedProtocolUid: null, deletedBlockUids: [] };
  }

  const sharedElsewhere = new Set<string>();
  for (const p of liveProtocols) {
    if (p.uid === targetProto.uid || p.deletedAt !== null) continue;
    for (const bUid of p.blockOrder) {
      sharedElsewhere.add(bUid);
    }
  }

  const deletedBlockUids: string[] = [];
  for (const bUid of targetProto.blockOrder) {
    if (sharedElsewhere.has(bUid)) continue;
    const block = await repo.getBlockByUid(bUid);
    if (block && block.deletedAt === null) {
      await repo.removeBlock(block.uid, block.rev, cleanActor);
      deletedBlockUids.push(block.uid);
    }
  }

  const latestProto = await repo.getProtocolByUid(targetProto.uid);
  if (latestProto && latestProto.deletedAt === null) {
    await repo.deleteProtocol(latestProto.uid, latestProto.rev, cleanActor);
  }

  return {
    deletedProtocolUid: targetProto.uid,
    deletedBlockUids,
  };
}

/**
 * Granularly creates or updates a single PivotalTrialRecord block and refreshes
 * `catalog-pivotal-trials` protocol edges cleanly.
 */
export async function syncPivotalTrialToV2Repo(
  repo: NeuroGuideRepo,
  trial: PivotalTrialRecord,
  actor?: string | null,
): Promise<NeuroGuideContentBlockRow> {
  const cleanActor = actor?.trim() || "admin";
  const decomposed = decomposeNeuroGuideStoreToGraph({
    guidelines: [],
    conferences: [],
    scenarios: [],
    pivotalTrials: [trial],
  });

  const targetBlock = decomposed.blocks.find((b) => b.blockType === "pivotal_trial");
  if (!targetBlock) {
    throw new Error(`Failed to build pivotal_trial block for '${trial.id}'`);
  }

  const [{ liveBlocksByUid, allBlocksBySlug }, liveProtocols] = await Promise.all([
    listAllBlocksMap(repo),
    repo.listLiveProtocols(),
  ]);

  let liveBySlug: NeuroGuideContentBlockRow | undefined;
  for (const b of liveBlocksByUid.values()) {
    if (b.slug === targetBlock.slug) {
      liveBySlug = b;
      break;
    }
  }
  const existing = liveBlocksByUid.get(targetBlock.uid) ?? liveBySlug;

  let persistedRow: NeuroGuideContentBlockRow;
  if (existing && existing.deletedAt === null) {
    if (existing.contentHash === targetBlock.contentHash) {
      persistedRow = existing;
    } else {
      const patchDiff = computeJsonPatch(existing.data, targetBlock.data);
      const res = await repo.updateBlock(
        existing.uid,
        existing.rev,
        targetBlock.data,
        targetBlock.contentHash,
        targetBlock.sectionHashes,
        patchDiff,
        cleanActor,
      );
      persistedRow = res.row;
    }
  } else {
    const hadHistoricalSlug = Boolean(allBlocksBySlug.get(targetBlock.slug));
    const created = await repo.createBlock(
      targetBlock.data,
      targetBlock.contentHash,
      targetBlock.sectionHashes,
      cleanActor,
      hadHistoricalSlug ? undefined : { uid: targetBlock.uid },
    );
    persistedRow = created.row;
  }

  const catalogSlug = "catalog-pivotal-trials";
  const catalogProto = liveProtocols.find(
    (p) =>
      p.slug === catalogSlug ||
      p.uid === deterministicUuidFromKey("ng-protocol", catalogSlug),
  );
  const existingOrder = catalogProto ? [...catalogProto.blockOrder] : [];
  if (!existingOrder.includes(persistedRow.uid)) {
    existingOrder.push(persistedRow.uid);
  }
  const metadata = catalogProto?.metadata ?? {
    kind: "scenario_catalog" as const,
    catalogKind: "pivotal_trials" as const,
  };
  const metadataHash =
    catalogProto?.metadataHash ?? computeProtocolMetadataHash(metadata);

  await repo.upsertProtocol(
    {
      uid:
        catalogProto?.uid ?? deterministicUuidFromKey("ng-protocol", catalogSlug),
      slug: catalogSlug,
      protocolType: "scenario_catalog",
      society: catalogProto?.society ?? "NeuroGuide",
      year: catalogProto?.year ?? 2026,
      title: catalogProto?.title ?? "Pivotal Trials Registry",
      status: catalogProto?.status ?? "approved",
      subspecialties: catalogProto?.subspecialties ?? ["Stroke"],
      metadata,
      blockOrder: existingOrder,
      metadataHash,
      expectedRev: catalogProto?.rev,
    },
    cleanActor,
  );

  return persistedRow;
}

/**
 * Soft-deletes a pivotal_trial block and updates `catalog-pivotal-trials` edges.
 */
export async function syncDeletePivotalTrialInV2Repo(
  repo: NeuroGuideRepo,
  trialId: string,
  actor?: string | null,
): Promise<boolean> {
  const cleanActor = actor?.trim() || "admin";
  const targetSlug = `trial:${trialId}`.toLowerCase();
  const deterministicUid = deterministicUuidFromKey(
    "ng-block",
    `trial:${trialId}`,
  );

  const [{ liveBlocksByUid }, liveProtocols] = await Promise.all([
    listAllBlocksMap(repo),
    repo.listLiveProtocols(),
  ]);

  let targetBlock = liveBlocksByUid.get(deterministicUid);
  if (!targetBlock) {
    for (const b of liveBlocksByUid.values()) {
      if (
        b.blockType === "pivotal_trial" &&
        (b.slug === targetSlug || b.data.facetIndex.recId === trialId)
      ) {
        targetBlock = b;
        break;
      }
    }
  }
  if (!targetBlock) {
    return false;
  }

  await repo.removeBlock(targetBlock.uid, targetBlock.rev, cleanActor);

  const catalogProto = liveProtocols.find(
    (p) => p.slug === "catalog-pivotal-trials",
  );
  if (catalogProto && catalogProto.blockOrder.includes(targetBlock.uid)) {
    const latestCatalog = await repo.getProtocolByUid(catalogProto.uid);
    if (latestCatalog && latestCatalog.deletedAt === null) {
      const nextOrder = latestCatalog.blockOrder.filter(
        (uid) => uid !== targetBlock!.uid,
      );
      await repo.upsertProtocol(
        {
          uid: latestCatalog.uid,
          slug: latestCatalog.slug,
          protocolType: latestCatalog.protocolType,
          society: latestCatalog.society,
          year: latestCatalog.year,
          title: latestCatalog.title,
          status: latestCatalog.status,
          subspecialties: latestCatalog.subspecialties,
          metadata: latestCatalog.metadata,
          blockOrder: nextOrder,
          metadataHash: latestCatalog.metadataHash,
          expectedRev: latestCatalog.rev,
        },
        cleanActor,
      );
    }
  }

  return true;
}

/**
 * Granularly updates `facetIndex.customLabel` (and `ontologyLabels` payload) on the
 * matching recommendation block(s) for `recKey`.
 */
export async function syncCustomRecLabelToV2Repo(
  repo: NeuroGuideRepo,
  recKey: string,
  labelOutput: RecommendationLabelOutput,
  actor?: string | null,
): Promise<NeuroGuideContentBlockRow[]> {
  const cleanActor = actor?.trim() || "admin";
  const { liveBlocksByUid } = await listAllBlocksMap(repo);
  const updated: NeuroGuideContentBlockRow[] = [];

  for (const block of liveBlocksByUid.values()) {
    if (
      block.blockType !== "recommendation" &&
      block.blockType !== "shared_clinical_block"
    ) {
      continue;
    }
    const payloadRecId =
      block.data.payload.kind === "recommendation" ||
      block.data.payload.kind === "shared_clinical_block"
        ? block.data.payload.practiceChange?.id
        : undefined;

    if (
      block.data.facetIndex.recId !== recKey &&
      payloadRecId !== recKey
    ) {
      continue;
    }

    const nextData = cloneJson(block.data);
    nextData.facetIndex.customLabel = cloneJson(labelOutput);
    if (
      nextData.payload.kind === "recommendation" ||
      nextData.payload.kind === "shared_clinical_block"
    ) {
      nextData.payload.practiceChange.ontologyLabels = cloneJson(labelOutput);
    }

    const nextHash = computeBlockContentHash(nextData);
    if (nextHash === block.contentHash) {
      updated.push(block);
      continue;
    }

    const nextSections = computeBlockSectionHashes(nextData);
    const patchDiff = computeJsonPatch(block.data, nextData);
    const res = await repo.updateBlock(
      block.uid,
      block.rev,
      nextData,
      nextHash,
      nextSections,
      patchDiff,
      cleanActor,
    );
    updated.push(res.row);
  }

  return updated;
}

/**
 * Mirrors an active NeuroGuide catalog payload into Sync v2 granularly:
 * unchanged guidelines/blocks/trials perform zero writes; changed entities patch cleanly.
 */
export async function mirrorStorePayloadToV2Repo(
  repo: NeuroGuideRepo,
  payload: NeuroGuideStoreInput,
  actor?: string | null,
): Promise<void> {
  const cleanActor = actor?.trim() || "admin";
  const [{ liveBlocksByUid }, liveProtocols] = await Promise.all([
    listAllBlocksMap(repo),
    repo.listLiveProtocols(),
  ]);

  const activeDocIds = new Set(
    (payload.guidelines || [])
      .map((g) => (g?.id || "").toLowerCase().trim())
      .filter(Boolean),
  );
  const deletedDocIds = new Set(
    (payload.deletedGuidelineIds || [])
      .map((id) => String(id || "").toLowerCase().trim())
      .filter(Boolean),
  );

  for (const proto of liveProtocols) {
    if (proto.metadata.kind !== "guideline") continue;
    const protoDocId = (proto.metadata.doc.id || proto.slug).toLowerCase().trim();
    if (deletedDocIds.has(protoDocId) || !activeDocIds.has(protoDocId)) {
      await syncDeleteGuidelineInV2Repo(repo, protoDocId, cleanActor);
    }
  }

  for (const doc of payload.guidelines || []) {
    await syncGuidelineDocToV2Repo(repo, doc, { actor: cleanActor });
  }

  for (const trialId of payload.deletedTrialIds || []) {
    if (trialId) {
      await syncDeletePivotalTrialInV2Repo(repo, trialId, cleanActor);
    }
  }

  if (Array.isArray(payload.pivotalTrials) && payload.pivotalTrials.length > 0) {
    const existingTrialById = new Map<string, NeuroGuideContentBlockRow>();
    for (const b of liveBlocksByUid.values()) {
      if (b.blockType === "pivotal_trial" && b.data.payload.kind === "pivotal_trial") {
        existingTrialById.set(b.data.payload.trial.id, b);
      }
    }
    const decomposedTrials = decomposeNeuroGuideStoreToGraph({
      guidelines: [],
      conferences: [],
      scenarios: [],
      pivotalTrials: payload.pivotalTrials,
    });
    const hashByTrialKey = new Map<string, string>();
    for (const b of decomposedTrials.blocks) {
      if (b.blockType === "pivotal_trial" && b.data.payload.kind === "pivotal_trial") {
        hashByTrialKey.set(b.data.payload.trial.id, b.contentHash);
      }
    }
    for (const trial of payload.pivotalTrials) {
      const existing = existingTrialById.get(trial.id);
      const nextHash = hashByTrialKey.get(trial.id);
      if (!existing || existing.contentHash !== nextHash) {
        await syncPivotalTrialToV2Repo(repo, trial, cleanActor);
      }
    }
  }

  if (payload.customRecLabels) {
    for (const [recKey, labelOut] of Object.entries(payload.customRecLabels)) {
      if (recKey && labelOut) {
        await syncCustomRecLabelToV2Repo(repo, recKey, labelOut, cleanActor);
      }
    }
  }
}
