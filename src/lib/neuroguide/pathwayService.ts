import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  ClinicalPathwayDoc,
  DuplicatePathwayMatch,
  PathwayNode,
  PathwayStatus,
  PathwayValidationResult,
} from "../../types/clinicalPathways.ts";
import { hasSupabaseConfig, supabaseAdmin } from "../supabase.ts";
import { cloneJson, computeJsonPatch } from "../sync/jsonPatch.ts";
import {
  computePathwayNodeBlockKey,
  normalizePathwaySlug,
  validateClinicalPathway,
} from "./pathwayValidator.ts";
import {
  assembleClinicalPathwayFromGraph,
  buildClinicalPathwayProtocolMeta,
  buildPathwayNodeBlockData,
  computeBlockContentHash,
  computeBlockSectionHashes,
  computePathwayNodeBlockUid,
  computePathwayProtocolUid,
  computeProtocolMetadataHash,
} from "./sync/blockGraph.ts";
import { listAllBlocksMap } from "./sync/serverAdapter.ts";
import { RepoError, type NeuroGuideRepo } from "./sync/repo.ts";
import { MemoryNeuroGuideRepo } from "./sync/repoMemory.ts";
import { SupabaseNeuroGuideRepo } from "./sync/repoSupabase.ts";
import type {
  NeuroGuideContentBlockRow,
  NeuroGuideProtocolEdgeInput,
  NeuroGuideProtocolMetadata,
  NeuroGuideProtocolRow,
} from "./sync/types.ts";

export type PathwayServiceErrorCode =
  | "DUPLICATE_PATHWAY"
  | "VALIDATION_FAILED"
  | "INVALID_IMAGE"
  | "STORAGE_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN";

export class PathwayServiceError extends Error {
  readonly code: PathwayServiceErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(
    code: PathwayServiceErrorCode,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "PathwayServiceError";
    this.code = code;
    this.details = details;
  }
}

const ALLOWED_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const PATHWAY_IMAGE_BUCKET = "pathway-images";
const LOCAL_PATHWAYS_JSON = path.join(process.cwd(), "public", "data", "neuroguide_pathways.json");
const LOCAL_PATHWAYS_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "pathways");

export function computeImageSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return ".jpg";
  }
}

export async function uploadPathwayImage(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ url: string; sha256: string; mimeType: string; fileName: string }> {
  const cleanMime = (mimeType || "").toLowerCase().trim();
  if (!ALLOWED_IMAGE_MIMES.has(cleanMime)) {
    throw new PathwayServiceError(
      "INVALID_IMAGE",
      `Unsupported image MIME type "${mimeType}". Allowed: PNG, JPEG, WebP.`
    );
  }
  if (!Buffer.isBuffer(buffer) || buffer.byteLength === 0) {
    throw new PathwayServiceError("INVALID_IMAGE", "Image buffer is empty.");
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new PathwayServiceError(
      "INVALID_IMAGE",
      `Image exceeds maximum allowed size (${MAX_IMAGE_BYTES / (1024 * 1024)}MB).`
    );
  }

  const sha256 = computeImageSha256(buffer);
  const rawBase = (fileName || "pathway").replace(/[^a-zA-Z0-9._-]/g, "_");
  const hasExt = /\.(png|jpe?g|webp)$/i.test(rawBase);
  const safeName = hasExt ? rawBase : `${rawBase}${extensionForMime(cleanMime)}`;
  const uniqueName = `pathway-${Date.now()}-${safeName}`;

  if (hasSupabaseConfig()) {
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      if (!buckets?.some((b) => b.name === PATHWAY_IMAGE_BUCKET)) {
        await supabaseAdmin.storage.createBucket(PATHWAY_IMAGE_BUCKET, {
          public: true,
          fileSizeLimit: MAX_IMAGE_BYTES,
          allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
        });
      }
      const { error: uploadError } = await supabaseAdmin.storage
        .from(PATHWAY_IMAGE_BUCKET)
        .upload(uniqueName, buffer, {
          contentType: cleanMime,
          upsert: true,
        });

      if (uploadError) {
        throw new PathwayServiceError(
          "STORAGE_ERROR",
          `Failed to upload image to Supabase Storage: ${uploadError.message}`
        );
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(PATHWAY_IMAGE_BUCKET)
        .getPublicUrl(uniqueName);

      return {
        url: publicUrlData.publicUrl,
        sha256,
        mimeType: cleanMime,
        fileName: safeName,
      };
    } catch (err) {
      if (err instanceof PathwayServiceError) throw err;
      throw new PathwayServiceError(
        "STORAGE_ERROR",
        err instanceof Error ? err.message : "Unknown storage error"
      );
    }
  }

  await fs.mkdir(LOCAL_PATHWAYS_UPLOAD_DIR, { recursive: true });
  const targetPath = path.join(LOCAL_PATHWAYS_UPLOAD_DIR, uniqueName);
  await fs.writeFile(targetPath, buffer);
  return {
    url: `/uploads/pathways/${uniqueName}`,
    sha256,
    mimeType: cleanMime,
    fileName: safeName,
  };
}

async function listAllProtocolRowsIncludingDeleted(
  repo: NeuroGuideRepo
): Promise<NeuroGuideProtocolRow[]> {
  const map = new Map<string, NeuroGuideProtocolRow>();
  let since = 0;
  while (true) {
    const batch = await repo.protocolChangesSince(since, 500);
    for (const row of batch.rows) {
      map.set(row.uid, row);
    }
    const last = batch.rows[batch.rows.length - 1];
    if (batch.rows.length < 500 || !last || last.changeSeq >= batch.maxSeq) {
      break;
    }
    since = last.changeSeq;
  }
  return Array.from(map.values());
}

async function listAllBlockRowsIncludingDeleted(
  repo: NeuroGuideRepo
): Promise<Map<string, NeuroGuideContentBlockRow>> {
  const map = new Map<string, NeuroGuideContentBlockRow>();
  let since = 0;
  while (true) {
    const batch = await repo.changesSince(since, 500);
    for (const row of batch.rows) {
      map.set(row.uid, row);
    }
    const last = batch.rows[batch.rows.length - 1];
    if (batch.rows.length < 500 || !last || last.changeSeq >= batch.maxSeq) {
      break;
    }
    since = last.changeSeq;
  }
  return map;
}

export async function findDuplicatePathways(
  repo: NeuroGuideRepo,
  criteria: { slug?: string; sourceImageSha256?: string; excludeUid?: string }
): Promise<DuplicatePathwayMatch[]> {
  const liveProtocols = await repo.listLiveProtocols();
  const targetSlug = criteria.slug?.trim().toLowerCase();
  const targetHash = criteria.sourceImageSha256?.trim().toLowerCase();
  const matches: DuplicatePathwayMatch[] = [];

  for (const proto of liveProtocols) {
    if (proto.metadata.kind !== "clinical_pathway") continue;
    if (criteria.excludeUid && proto.uid === criteria.excludeUid) continue;

    const meta = proto.metadata.pathway;
    if (targetSlug && proto.slug === targetSlug) {
      matches.push({
        uid: proto.uid,
        slug: proto.slug,
        titleEn: meta.title.en,
        status: (proto.status as PathwayStatus) || meta.status,
        reason: "slug",
      });
      continue;
    }

    if (
      targetHash &&
      meta.sourceImageSha256 &&
      meta.sourceImageSha256.trim().toLowerCase() === targetHash
    ) {
      matches.push({
        uid: proto.uid,
        slug: proto.slug,
        titleEn: meta.title.en,
        status: (proto.status as PathwayStatus) || meta.status,
        reason: "image_sha256",
      });
    }
  }

  return matches;
}

export async function listPathways(
  repo: NeuroGuideRepo,
  options?: {
    includeDrafts?: boolean;
    includeArchived?: boolean;
    includeDeleted?: boolean;
    subspecialty?: string;
    domain?: string;
    sourceType?: string;
  }
): Promise<ClinicalPathwayDoc[]> {
  const includeDrafts = Boolean(options?.includeDrafts);
  const includeArchived = Boolean(options?.includeArchived);
  const includeDeleted = Boolean(options?.includeDeleted);

  const [protocols, blocksMap] = await Promise.all([
    includeDeleted ? listAllProtocolRowsIncludingDeleted(repo) : repo.listLiveProtocols(),
    includeDeleted
      ? listAllBlockRowsIncludingDeleted(repo)
      : listAllBlocksMap(repo).then((r) => r.liveBlocksByUid),
  ]);

  const edges = await repo.listProtocolEdges();
  const edgesByProtocol = new Map<string, string[]>();
  const sortedEdges = [...edges].sort((a, b) => a.position - b.position);
  for (const edge of sortedEdges) {
    const arr = edgesByProtocol.get(edge.protocolUid) ?? [];
    arr.push(edge.blockUid);
    edgesByProtocol.set(edge.protocolUid, arr);
  }

  const results: ClinicalPathwayDoc[] = [];

  for (const proto of protocols) {
    if (proto.metadata.kind !== "clinical_pathway") continue;
    if (!includeDeleted && proto.deletedAt !== null) continue;

    const status = (proto.status as PathwayStatus) || proto.metadata.pathway.status;
    if (!includeDrafts && status === "draft") continue;
    if (!includeArchived && status === "archived") continue;

    if (options?.subspecialty && proto.metadata.pathway.subspecialty !== options.subspecialty) {
      continue;
    }
    if (options?.domain && proto.metadata.pathway.domain !== options.domain) {
      continue;
    }
    if (
      options?.sourceType &&
      proto.metadata.pathway.source.sourceType !== options.sourceType
    ) {
      continue;
    }

    // For deleted pathways, assemble from blocksMap even if child blocks are tombstoned
    let doc: ClinicalPathwayDoc | null = null;
    if (proto.deletedAt !== null && includeDeleted) {
      const uids = edgesByProtocol.get(proto.uid) ?? proto.blockOrder;
      const nodes: PathwayNode[] = [];
      for (const bUid of uids) {
        const b = blocksMap.get(bUid);
        if (b && b.data.payload.kind === "pathway_node") {
          nodes.push({
            ...cloneJson(b.data.payload.node),
            blockUid: b.uid,
            blockRev: b.rev,
          });
        }
      }
      const meta = cloneJson(proto.metadata.pathway);
      doc = {
        ...meta,
        uid: proto.uid,
        slug: proto.slug,
        status,
        nodes,
        rev: proto.rev,
        changeSeq: proto.changeSeq,
        protocolHash: proto.protocolHash,
        deletedAt: proto.deletedAt,
        updatedAt: proto.updatedAt || meta.updatedAt,
        createdAt: proto.createdAt || meta.createdAt,
      };
    } else {
      doc = assembleClinicalPathwayFromGraph(
        proto,
        blocksMap,
        edgesByProtocol.get(proto.uid),
        { excludeDrafts: !includeDrafts }
      );
    }

    if (doc) {
      results.push(doc);
    }
  }

  results.sort((a, b) => {
    const timeCmp = (b.updatedAt || "").localeCompare(a.updatedAt || "");
    if (timeCmp !== 0) return timeCmp;
    return (a.title?.en || "").localeCompare(b.title?.en || "");
  });

  return results;
}

export async function getPathwayByUid(
  repo: NeuroGuideRepo,
  uid: string,
  options?: { includeDrafts?: boolean; includeDeleted?: boolean }
): Promise<ClinicalPathwayDoc | null> {
  const proto = await repo.getProtocolByUid(uid);
  if (!proto || proto.metadata.kind !== "clinical_pathway") return null;
  if (!options?.includeDeleted && proto.deletedAt !== null) return null;

  const status = (proto.status as PathwayStatus) || proto.metadata.pathway.status;
  if (!options?.includeDrafts && status === "draft") return null;

  const [edges, blocksResult] = await Promise.all([
    repo.listProtocolEdges(uid),
    options?.includeDeleted
      ? listAllBlockRowsIncludingDeleted(repo)
      : listAllBlocksMap(repo).then((r) => r.liveBlocksByUid),
  ]);

  const orderedUids =
    edges.length > 0
      ? [...edges].sort((a, b) => a.position - b.position).map((e) => e.blockUid)
      : proto.blockOrder;

  if (proto.deletedAt !== null && options?.includeDeleted) {
    const nodes: PathwayNode[] = [];
    for (const bUid of orderedUids) {
      const b = blocksResult.get(bUid);
      if (b && b.data.payload.kind === "pathway_node") {
        nodes.push({
          ...cloneJson(b.data.payload.node),
          blockUid: b.uid,
          blockRev: b.rev,
        });
      }
    }
    const meta = cloneJson(proto.metadata.pathway);
    return {
      ...meta,
      uid: proto.uid,
      slug: proto.slug,
      status,
      nodes,
      rev: proto.rev,
      changeSeq: proto.changeSeq,
      protocolHash: proto.protocolHash,
      deletedAt: proto.deletedAt,
      updatedAt: proto.updatedAt || meta.updatedAt,
      createdAt: proto.createdAt || meta.createdAt,
    };
  }

  return assembleClinicalPathwayFromGraph(proto, blocksResult, orderedUids, {
    excludeDrafts: !options?.includeDrafts,
  });
}

export type CreatePathwayDraftInput = Omit<
  ClinicalPathwayDoc,
  "uid" | "slug" | "status" | "rev" | "createdAt" | "updatedAt"
> & {
  slug?: string;
  allowDuplicateImage?: boolean;
};

export async function createPathwayDraft(
  repo: NeuroGuideRepo,
  input: CreatePathwayDraftInput,
  actor: string
): Promise<{ pathway: ClinicalPathwayDoc; validation: PathwayValidationResult }> {
  const cleanActor = actor?.trim() || "admin";
  const slug = (
    input.slug?.trim() ||
    normalizePathwaySlug(
      input.title?.en || "",
      input.source?.organizationOrAuthor,
      input.source?.year
    )
  ).toLowerCase();

  const duplicates = await findDuplicatePathways(repo, {
    slug,
    sourceImageSha256: input.sourceImageSha256,
  });

  const slugDup = duplicates.find((d) => d.reason === "slug");
  if (slugDup) {
    throw new PathwayServiceError(
      "DUPLICATE_PATHWAY",
      `A live pathway with slug "${slug}" already exists.`,
      { duplicate: slugDup, duplicates }
    );
  }

  const imageDup = duplicates.find((d) => d.reason === "image_sha256");
  if (imageDup && !input.allowDuplicateImage) {
    throw new PathwayServiceError(
      "DUPLICATE_PATHWAY",
      `An active pathway ("${imageDup.titleEn}") already uses this exact flowchart image.`,
      { duplicate: imageDup, duplicates }
    );
  }

  const nowIso = new Date().toISOString();
  const protocolUid = computePathwayProtocolUid(slug);

  const draftDoc: ClinicalPathwayDoc = {
    ...cloneJson(input),
    uid: protocolUid,
    slug,
    status: "draft",
    rev: 1,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const validation = validateClinicalPathway(draftDoc);
  const { allBlocksBySlug } = await listAllBlocksMap(repo);

  const blockOrder: string[] = [];
  const edges: NeuroGuideProtocolEdgeInput[] = [];

  for (let i = 0; i < draftDoc.nodes.length; i++) {
    const node = draftDoc.nodes[i];
    const blockData = buildPathwayNodeBlockData(draftDoc, node);
    const contentHash = computeBlockContentHash(blockData);
    const sectionHashes = computeBlockSectionHashes(blockData);
    const deterministicUid = computePathwayNodeBlockUid(slug, node.id);

    const existingBySlug = allBlocksBySlug.get(blockData.blockKey.toLowerCase());
    let blockRow: NeuroGuideContentBlockRow;

    if (existingBySlug && existingBySlug.deletedAt !== null) {
      // Restore previously deleted block at same deterministic key, then update its payload
      const history = await repo.history(existingBySlug.uid);
      const revToRestore = history[0]?.rev ?? existingBySlug.rev;
      const restored = await repo.restoreBlock(
        existingBySlug.uid,
        existingBySlug.rev,
        revToRestore,
        contentHash,
        sectionHashes,
        [],
        cleanActor
      );
      const patch = computeJsonPatch(restored.row.data, blockData);
      const updated = await repo.updateBlock(
        restored.row.uid,
        restored.row.rev,
        blockData,
        contentHash,
        sectionHashes,
        patch,
        cleanActor
      );
      blockRow = updated.row;
    } else if (existingBySlug && existingBySlug.deletedAt === null) {
      const patch = computeJsonPatch(existingBySlug.data, blockData);
      const updated = await repo.updateBlock(
        existingBySlug.uid,
        existingBySlug.rev,
        blockData,
        contentHash,
        sectionHashes,
        patch,
        cleanActor
      );
      blockRow = updated.row;
    } else {
      const created = await repo.createBlock(
        blockData,
        contentHash,
        sectionHashes,
        cleanActor,
        { uid: deterministicUid, skipRootRehash: true }
      );
      blockRow = created.row;
    }

    blockOrder.push(blockRow.uid);
    edges.push({
      blockUid: blockRow.uid,
      position: i,
      sectionPath: node.kind,
      role: "pathway_step",
    });
  }

  const metadata: NeuroGuideProtocolMetadata = {
    kind: "clinical_pathway",
    pathway: buildClinicalPathwayProtocolMeta(draftDoc),
  };
  const metadataHash = computeProtocolMetadataHash(metadata);

  const upserted = await repo.upsertProtocol(
    {
      uid: protocolUid,
      slug,
      protocolType: "clinical_pathway",
      society: draftDoc.source.organizationOrAuthor || draftDoc.source.sourceType,
      year: draftDoc.source.year || 0,
      title: draftDoc.title.en,
      status: "draft",
      subspecialties: draftDoc.subspecialty ? [draftDoc.subspecialty] : [],
      metadata,
      blockOrder,
      metadataHash,
      edges,
    },
    cleanActor
  );

  const assembled = await getPathwayByUid(repo, upserted.row.uid, { includeDrafts: true });
  return {
    pathway: assembled ?? { ...draftDoc, rev: upserted.row.rev, changeSeq: upserted.row.changeSeq },
    validation,
  };
}

export async function updatePathway(
  repo: NeuroGuideRepo,
  uid: string,
  expectedRev: number,
  patchInput: Partial<ClinicalPathwayDoc> & { nodes?: PathwayNode[] },
  actor: string
): Promise<{
  pathway: ClinicalPathwayDoc;
  validation: PathwayValidationResult;
  stats: {
    createdBlocks: number;
    updatedBlocks: number;
    unchangedBlocks: number;
    removedBlocks: number;
  };
}> {
  const cleanActor = actor?.trim() || "admin";
  const existingProto = await repo.getProtocolByUid(uid);
  if (!existingProto || existingProto.deletedAt !== null || existingProto.metadata.kind !== "clinical_pathway") {
    throw new PathwayServiceError("NOT_FOUND", `Pathway "${uid}" not found.`);
  }

  // Enforce optimistic concurrency BEFORE mutating any child blocks
  if (existingProto.rev !== expectedRev) {
    throw new RepoError("REV_CONFLICT", `NG_REV_CONFLICT:${existingProto.rev}`, {
      currentRev: existingProto.rev,
      currentRow: cloneJson(existingProto),
    });
  }

  const currentDoc = await getPathwayByUid(repo, uid, { includeDrafts: true });
  if (!currentDoc) {
    throw new PathwayServiceError("NOT_FOUND", `Pathway "${uid}" could not be assembled.`);
  }

  const nowIso = new Date().toISOString();
  const targetStatus: PathwayStatus = patchInput.status ?? currentDoc.status;
  const nextSlug = (patchInput.slug ?? currentDoc.slug).trim().toLowerCase();

  const merged: ClinicalPathwayDoc = {
    ...currentDoc,
    ...cloneJson(patchInput),
    uid,
    slug: nextSlug,
    status: targetStatus,
    nodes: patchInput.nodes ? cloneJson(patchInput.nodes) : currentDoc.nodes,
    updatedAt: nowIso,
    ...(targetStatus === "published"
      ? {
          reviewedBy: patchInput.reviewedBy || cleanActor,
          reviewedAt: patchInput.reviewedAt || nowIso,
        }
      : {}),
  };

  const validation = validateClinicalPathway(merged);
  if (targetStatus === "published" && !validation.canPublish) {
    throw new PathwayServiceError(
      "VALIDATION_FAILED",
      `Cannot publish pathway "${merged.title.en}": ${validation.errors.length} blocking validation error(s).`,
      { validation }
    );
  }

  const { liveBlocksByUid, allBlocksBySlug } = await listAllBlocksMap(repo);

  const desiredBlockOrder: string[] = [];
  const desiredEdges: NeuroGuideProtocolEdgeInput[] = [];
  const desiredUidSet = new Set<string>();

  let createdBlocks = 0;
  let updatedBlocks = 0;
  let unchangedBlocks = 0;
  let removedBlocks = 0;

  for (let i = 0; i < merged.nodes.length; i++) {
    const node = merged.nodes[i];
    const blockData = buildPathwayNodeBlockData(merged, node);
    const contentHash = computeBlockContentHash(blockData);
    const sectionHashes = computeBlockSectionHashes(blockData);
    const blockSlug = computePathwayNodeBlockKey(nextSlug, node.id).toLowerCase();

    const existingLive =
      (node.blockUid ? liveBlocksByUid.get(node.blockUid) : undefined) ??
      (() => {
        const bySlug = allBlocksBySlug.get(blockSlug);
        return bySlug && bySlug.deletedAt === null ? bySlug : undefined;
      })();

    let blockRow: NeuroGuideContentBlockRow;

    if (existingLive) {
      if (existingLive.contentHash === contentHash) {
        blockRow = existingLive;
        unchangedBlocks++;
      } else {
        const diff = computeJsonPatch(existingLive.data, blockData);
        const updated = await repo.updateBlock(
          existingLive.uid,
          existingLive.rev,
          blockData,
          contentHash,
          sectionHashes,
          diff,
          cleanActor
        );
        blockRow = updated.row;
        updatedBlocks++;
      }
    } else {
      const tombstoned = allBlocksBySlug.get(blockSlug);
      if (tombstoned && tombstoned.deletedAt !== null) {
        const history = await repo.history(tombstoned.uid);
        const revToRestore = history[0]?.rev ?? tombstoned.rev;
        const restored = await repo.restoreBlock(
          tombstoned.uid,
          tombstoned.rev,
          revToRestore,
          contentHash,
          sectionHashes,
          [],
          cleanActor
        );
        const diff = computeJsonPatch(restored.row.data, blockData);
        const updated = await repo.updateBlock(
          restored.row.uid,
          restored.row.rev,
          blockData,
          contentHash,
          sectionHashes,
          diff,
          cleanActor
        );
        blockRow = updated.row;
        createdBlocks++;
      } else {
        const deterministicUid = computePathwayNodeBlockUid(nextSlug, node.id);
        const created = await repo.createBlock(
          blockData,
          contentHash,
          sectionHashes,
          cleanActor,
          { uid: deterministicUid, skipRootRehash: true }
        );
        blockRow = created.row;
        createdBlocks++;
      }
    }

    desiredUidSet.add(blockRow.uid);
    desiredBlockOrder.push(blockRow.uid);
    desiredEdges.push({
      blockUid: blockRow.uid,
      position: i,
      sectionPath: node.kind,
      role: "pathway_step",
    });
  }

  for (const oldUid of existingProto.blockOrder) {
    if (!desiredUidSet.has(oldUid)) {
      const oldBlock = liveBlocksByUid.get(oldUid);
      if (oldBlock && oldBlock.deletedAt === null) {
        await repo.removeBlock(oldBlock.uid, oldBlock.rev, cleanActor);
        removedBlocks++;
      }
    }
  }

  const metadata: NeuroGuideProtocolMetadata = {
    kind: "clinical_pathway",
    pathway: buildClinicalPathwayProtocolMeta(merged),
  };
  const metadataHash = computeProtocolMetadataHash(metadata);

  const upserted = await repo.upsertProtocol(
    {
      uid,
      slug: nextSlug,
      protocolType: "clinical_pathway",
      society: merged.source.organizationOrAuthor || merged.source.sourceType,
      year: merged.source.year || 0,
      title: merged.title.en,
      status: targetStatus,
      subspecialties: merged.subspecialty ? [merged.subspecialty] : [],
      metadata,
      blockOrder: desiredBlockOrder,
      metadataHash,
      edges: desiredEdges,
      expectedRev,
    },
    cleanActor
  );

  const assembled = await getPathwayByUid(repo, uid, { includeDrafts: true });
  return {
    pathway:
      assembled ?? {
        ...merged,
        rev: upserted.row.rev,
        changeSeq: upserted.row.changeSeq,
        protocolHash: upserted.row.protocolHash,
      },
    validation,
    stats: {
      createdBlocks,
      updatedBlocks,
      unchangedBlocks,
      removedBlocks,
    },
  };
}

export async function softDeletePathway(
  repo: NeuroGuideRepo,
  uid: string,
  expectedRev: number,
  actor: string
): Promise<{ protocol: NeuroGuideProtocolRow; deletedBlockUids: string[] }> {
  const cleanActor = actor?.trim() || "admin";
  const existing = await repo.getProtocolByUid(uid);
  if (!existing || existing.deletedAt !== null || existing.metadata.kind !== "clinical_pathway") {
    throw new PathwayServiceError("NOT_FOUND", `Pathway "${uid}" not found.`);
  }

  const tombstonedProto = await repo.deleteProtocol(uid, expectedRev, cleanActor);
  const deletedBlockUids: string[] = [];

  for (const blockUid of existing.blockOrder) {
    const block = await repo.getBlockByUid(blockUid);
    if (block && block.deletedAt === null) {
      await repo.removeBlock(block.uid, block.rev, cleanActor);
      deletedBlockUids.push(block.uid);
    }
  }

  return {
    protocol: tombstonedProto,
    deletedBlockUids,
  };
}

export async function restorePathway(
  repo: NeuroGuideRepo,
  uid: string,
  expectedRev: number,
  actor: string
): Promise<ClinicalPathwayDoc> {
  const cleanActor = actor?.trim() || "admin";
  const restoredProto = await repo.restoreProtocol(uid, expectedRev, cleanActor);

  for (const blockUid of restoredProto.blockOrder) {
    const block = await repo.getBlockByUid(blockUid);
    if (block && block.deletedAt !== null) {
      const revisions = await repo.history(blockUid);
      const targetRev =
        revisions.find((r) => r.op !== "delete") ?? revisions[0];
      if (targetRev) {
        await repo.restoreBlock(
          block.uid,
          block.rev,
          targetRev.rev,
          targetRev.contentHash,
          {},
          [],
          cleanActor
        );
      }
    }
  }

  await repo.recomputeProtocolHash(uid);
  await repo.recomputeRootHash();

  const assembled = await getPathwayByUid(repo, uid, { includeDrafts: true });
  if (!assembled) {
    throw new PathwayServiceError("NOT_FOUND", `Failed to reassemble restored pathway "${uid}".`);
  }
  return assembled;
}

interface LocalPathwaySnapshot {
  pathways: ClinicalPathwayDoc[];
}

export async function withLocalPathwayRepo<T>(
  fn: (repo: MemoryNeuroGuideRepo) => Promise<T>,
  persistOnWrite = false
): Promise<T> {
  const repo = new MemoryNeuroGuideRepo();

  try {
    const raw = await fs.readFile(LOCAL_PATHWAYS_JSON, "utf-8");
    const parsed = JSON.parse(raw) as LocalPathwaySnapshot;
    if (Array.isArray(parsed?.pathways)) {
      for (const p of parsed.pathways) {
        for (const node of p.nodes || []) {
          const data = buildPathwayNodeBlockData(p, node);
          const hash = computeBlockContentHash(data);
          const sec = computeBlockSectionHashes(data);
          const uid = node.blockUid || computePathwayNodeBlockUid(p.slug, node.id);
          await repo.createBlock(data, hash, sec, p.reviewedBy || "local-seed", {
            uid,
            skipRootRehash: true,
          });
        }
        const meta: NeuroGuideProtocolMetadata = {
          kind: "clinical_pathway",
          pathway: buildClinicalPathwayProtocolMeta(p),
        };
        const mHash = computeProtocolMetadataHash(meta);
        const blockOrder = (p.nodes || []).map(
          (n) => n.blockUid || computePathwayNodeBlockUid(p.slug, n.id)
        );
        await repo.upsertProtocol(
          {
            uid: p.uid || computePathwayProtocolUid(p.slug),
            slug: p.slug,
            protocolType: "clinical_pathway",
            society: p.source.organizationOrAuthor || p.source.sourceType,
            year: p.source.year || 0,
            title: p.title.en,
            status: p.status,
            subspecialties: p.subspecialty ? [p.subspecialty] : [],
            metadata: meta,
            blockOrder,
            metadataHash: mHash,
          },
          p.reviewedBy || "local-seed"
        );
      }
    }
  } catch {
    // No local snapshot yet; start empty
  }

  const result = await fn(repo);

  if (persistOnWrite) {
    const all = await listPathways(repo, { includeDrafts: true, includeArchived: true });
    await fs.mkdir(path.dirname(LOCAL_PATHWAYS_JSON), { recursive: true });
    await fs.writeFile(LOCAL_PATHWAYS_JSON, JSON.stringify({ pathways: all }, null, 2), "utf-8");
  }

  return result;
}

export function getDefaultPathwayRepo(): NeuroGuideRepo | null {
  if (hasSupabaseConfig()) {
    return new SupabaseNeuroGuideRepo();
  }
  return null;
}
