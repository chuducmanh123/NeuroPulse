import type { SubspecialtyType } from "../../../types/neuroguide.ts";
import { computeJsonPatch } from "../../sync/jsonPatch.ts";
import {
  computeBlockContentHash,
  computeBlockSectionHashes,
  computeProtocolMetadataHash,
  isDraftOrUnapprovedNeuroGuideBlock,
} from "./blockGraph.ts";
import { RepoError, type NeuroGuideRepo } from "./repo.ts";
import type {
  NeuroGuideBlockLinkEdge,
  NeuroGuideBlockType,
  NeuroGuideContentBlockData,
  NeuroGuideOverlappingFacetFilter,
  NeuroGuideProtocolEdgeInput,
  NeuroGuideProtocolMetadata,
  NeuroGuideProtocolType,
} from "./types.ts";

export interface HandlerResult<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T | null;
}

export interface NeuroGuideSyncHandlerDeps {
  repo: NeuroGuideRepo;
  isAdmin?: boolean;
  actor?: string;
  onInvalidateTag?: (tag: string) => void;
}

export type NeuroGuideSyncTier = "blocks" | "protocols" | "graph";

const ALLOWED_BLOCK_TYPES = new Set<NeuroGuideBlockType>([
  "recommendation",
  "shared_clinical_block",
  "pivotal_trial",
  "late_breaking_trial",
  "clinical_scenario",
  "recommendation_atom",
]);

const ALLOWED_PROTOCOL_TYPES = new Set<NeuroGuideProtocolType>([
  "guideline",
  "conference",
  "scenario_catalog",
]);

const FORBIDDEN_ENVELOPE_KEYS = [
  "uid",
  "rev",
  "changeSeq",
  "deletedAt",
  "change_seq",
  "deleted_at",
];

function noStoreHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    ...(extra ?? {}),
  };
}

export function formatNeuroGuideSyncETag(
  maxSeq: number,
  rootHash: string,
  tier: NeuroGuideSyncTier = "blocks"
): string {
  if (tier === "blocks") {
    return `"ng-v2-${maxSeq}-${rootHash}"`;
  }
  return `"ng-v2-${tier}-${maxSeq}-${rootHash}"`;
}

function normalizeETagToken(token: string): string {
  let cleaned = token.trim();
  if (cleaned.startsWith("W/") || cleaned.startsWith("w/")) {
    cleaned = cleaned.slice(2).trim();
  }
  if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length >= 2) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned;
}

export function matchesIfNoneMatch(
  ifNoneMatchHeader: string | null | undefined,
  eTag: string
): boolean {
  if (!ifNoneMatchHeader || !ifNoneMatchHeader.trim()) {
    return false;
  }
  const target = normalizeETagToken(eTag);
  for (const part of ifNoneMatchHeader.split(",")) {
    const candidate = part.trim();
    if (!candidate) continue;
    if (candidate === "*") return true;
    if (normalizeETagToken(candidate) === target) {
      return true;
    }
  }
  return false;
}

function parseNonNegativeIntParam(
  raw: string | number | null | undefined,
  defaultValue: number
): { ok: true; value: number; provided: boolean } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: defaultValue, provided: false };
  }
  if (typeof raw === "number") {
    if (Number.isSafeInteger(raw) && raw >= 0) {
      return { ok: true, value: raw, provided: true };
    }
    return { ok: false, error: "Expected a non-negative integer" };
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: "Expected a non-negative integer" };
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    return { ok: false, error: "Integer out of range" };
  }
  return { ok: true, value: parsed, provided: true };
}

function parsePositiveInt(
  raw: unknown,
  fieldName: string
): { ok: true; value: number } | { ok: false; error: string } {
  if (typeof raw === "number") {
    if (Number.isSafeInteger(raw) && raw >= 1) {
      return { ok: true, value: raw };
    }
    return { ok: false, error: `${fieldName} must be an integer >= 1` };
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed)) {
      const parsed = Number(trimmed);
      if (Number.isSafeInteger(parsed) && parsed >= 1) {
        return { ok: true, value: parsed };
      }
    }
  }
  return { ok: false, error: `${fieldName} must be an integer >= 1` };
}

function badRequest(code: string, error: string, details?: unknown): HandlerResult {
  return {
    status: 400,
    headers: noStoreHeaders(),
    body: details !== undefined ? { code, error, details } : { code, error },
  };
}

function unauthorized(): HandlerResult {
  return {
    status: 401,
    headers: noStoreHeaders(),
    body: {
      code: "UNAUTHORIZED",
      error: "Unauthorized. Administrator credentials required.",
    },
  };
}

function notFound(error: string): HandlerResult {
  return {
    status: 404,
    headers: noStoreHeaders(),
    body: { code: "NOT_FOUND", error },
  };
}

function invalidateNeuroGuideTags(
  deps: NeuroGuideSyncHandlerDeps,
  tags: readonly string[]
): void {
  if (!deps.onInvalidateTag || tags.length === 0) return;
  for (const tag of new Set(tags)) {
    if (tag) {
      deps.onInvalidateTag(tag);
    }
  }
}

function stripVerificationAndForceDraft(
  obj: Record<string, unknown>,
  forceTopStatus = false
): void {
  delete obj.verification;
  if (forceTopStatus || "status" in obj) {
    obj.status = "draft";
  }
  const payload =
    obj.payload && typeof obj.payload === "object"
      ? (obj.payload as Record<string, unknown>)
      : null;
  if (payload) {
    if (payload.practiceChange && typeof payload.practiceChange === "object") {
      const pc = payload.practiceChange as Record<string, unknown>;
      delete pc.verification;
      pc.status = "draft";
      pc.approvalStatus = "needs_review";
    }
    if (payload.trial && typeof payload.trial === "object") {
      const trial = payload.trial as Record<string, unknown>;
      delete trial.verification;
      trial.status = "draft";
    }
  }
}

function prepareBlockData(
  rawData: unknown,
  options: { allowVerified: boolean }
):
  | { ok: true; data: NeuroGuideContentBlockData }
  | { ok: false; result: HandlerResult } {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return {
      ok: false,
      result: badRequest(
        "INVALID_DATA",
        "Payload 'data' must be a NeuroGuideContentBlockData object."
      ),
    };
  }

  const obj = rawData as Record<string, unknown>;
  const leaked = FORBIDDEN_ENVELOPE_KEYS.filter((k) =>
    Object.prototype.hasOwnProperty.call(obj, k)
  );
  if (leaked.length > 0) {
    return {
      ok: false,
      result: badRequest(
        "INVALID_DATA",
        `Block data must not contain sync envelope fields: ${leaked.join(", ")}`
      ),
    };
  }

  const blockKey = typeof obj.blockKey === "string" ? obj.blockKey.trim() : "";
  if (!blockKey) {
    return {
      ok: false,
      result: badRequest("INVALID_SLUG", "Block data 'blockKey' must be non-empty."),
    };
  }

  const blockType = obj.blockType as NeuroGuideBlockType;
  if (!ALLOWED_BLOCK_TYPES.has(blockType)) {
    return {
      ok: false,
      result: badRequest(
        "INVALID_DATA",
        `Invalid blockType '${String(obj.blockType)}'.`
      ),
    };
  }

  if (!obj.payload || typeof obj.payload !== "object" || Array.isArray(obj.payload)) {
    return {
      ok: false,
      result: badRequest("INVALID_DATA", "Block 'payload' must be a JSON object."),
    };
  }

  if (
    !obj.facetIndex ||
    typeof obj.facetIndex !== "object" ||
    Array.isArray(obj.facetIndex)
  ) {
    return {
      ok: false,
      result: badRequest("INVALID_DATA", "Block 'facetIndex' must be a JSON object."),
    };
  }

  const cloned = structuredClone(obj);
  cloned.blockKey = blockKey;
  if (!options.allowVerified) {
    stripVerificationAndForceDraft(cloned, false);
  }

  return {
    ok: true,
    data: cloned as unknown as NeuroGuideContentBlockData,
  };
}

export async function mapNeuroGuideRepoErrorToResult(
  err: unknown,
  repo: NeuroGuideRepo,
  uid?: string,
  entityKind: "block" | "protocol" = "block"
): Promise<HandlerResult> {
  if (err instanceof RepoError) {
    switch (err.code) {
      case "REV_CONFLICT": {
        const current =
          err.currentRow ??
          (uid
            ? await (
                entityKind === "protocol"
                  ? repo.getProtocolByUid(uid)
                  : repo.getBlockByUid(uid)
              ).catch(() => null)
            : null);
        return {
          status: 409,
          headers: noStoreHeaders(),
          body: {
            code: "REV_CONFLICT",
            error: err.message,
            currentRev: err.currentRev ?? current?.rev ?? null,
            current,
          },
        };
      }
      case "SLUG_TAKEN":
        return {
          status: 409,
          headers: noStoreHeaders(),
          body: { code: "SLUG_TAKEN", error: err.message },
        };
      case "NOT_FOUND":
        return notFound(err.message);
      case "INVALID_SLUG":
      case "INVALID_DATA":
        return badRequest(err.code, err.message);
      case "SERVICE_UNAVAILABLE":
        return {
          status: 503,
          headers: noStoreHeaders(),
          body: { code: "SERVICE_UNAVAILABLE", error: err.message },
        };
    }
  }

  const message = err instanceof Error ? err.message : String(err);
  return {
    status: 500,
    headers: noStoreHeaders(),
    body: { code: "INTERNAL_ERROR", error: message },
  };
}

export async function handleGetChanges(
  deps: NeuroGuideSyncHandlerDeps,
  input: {
    sinceParam?: string | number | null;
    limitParam?: string | number | null;
    tierParam?: string | null;
    includeLinksParam?: string | null;
    ifNoneMatch?: string | null;
  } = {}
): Promise<HandlerResult> {
  const sinceParsed = parseNonNegativeIntParam(input.sinceParam, 0);
  if (!sinceParsed.ok) {
    return badRequest("INVALID_PARAMS", `Invalid 'since' parameter: ${sinceParsed.error}`);
  }

  const limitParsed = parseNonNegativeIntParam(input.limitParam, 500);
  if (!limitParsed.ok || limitParsed.value < 1 || limitParsed.value > 500) {
    return badRequest("INVALID_PARAMS", "Invalid 'limit' parameter: expected integer in 1..500");
  }

  const rawTier = (input.tierParam ?? "blocks").trim().toLowerCase() || "blocks";
  if (rawTier !== "blocks" && rawTier !== "protocols" && rawTier !== "graph") {
    return badRequest(
      "INVALID_PARAMS",
      "Invalid 'tier' parameter: expected 'blocks', 'protocols', or 'graph'"
    );
  }
  const tier: NeuroGuideSyncTier = rawTier;
  const includeLinks =
    input.includeLinksParam === "1" || input.includeLinksParam === "true";

  const since = sinceParsed.value;
  const sinceProvided = sinceParsed.provided;
  const limit = limitParsed.value;

  try {
    const state = await deps.repo.getSyncState();
    const stateETag = formatNeuroGuideSyncETag(state.maxSeq, state.rootHash, tier);
    const reset = since > 0 && since < state.purgeHorizonSeq;

    if (
      !reset &&
      matchesIfNoneMatch(input.ifNoneMatch, stateETag) &&
      (!sinceProvided || since === state.maxSeq)
    ) {
      return {
        status: 304,
        headers: noStoreHeaders({ ETag: stateETag }),
        body: null,
      };
    }

    if (reset) {
      return {
        status: 200,
        headers: noStoreHeaders({ ETag: stateETag }),
        body: {
          changes: [],
          ...(tier === "graph" ? { protocolChanges: [] } : {}),
          maxSeq: state.maxSeq,
          rootHash: state.rootHash,
          hasMore: false,
          reset: true,
        },
      };
    }

    if (tier === "blocks") {
      const delta = await deps.repo.changesSince(since, limit);
      const deltaETag = formatNeuroGuideSyncETag(delta.maxSeq, delta.rootHash, "blocks");
      const lastRow = delta.rows[delta.rows.length - 1];
      const hasMore = Boolean(
        delta.rows.length === limit && lastRow && lastRow.changeSeq < delta.maxSeq
      );
      const visibleRows =
        deps.isAdmin === false
          ? delta.rows.filter((r) => r.deletedAt !== null || !isDraftOrUnapprovedNeuroGuideBlock(r))
          : delta.rows;
      return {
        status: 200,
        headers: noStoreHeaders({ ETag: deltaETag }),
        body: {
          changes: visibleRows,
          maxSeq: delta.maxSeq,
          rootHash: delta.rootHash,
          hasMore,
          reset: false,
        },
      };
    }

    if (tier === "protocols") {
      const delta = await deps.repo.protocolChangesSince(since, limit);
      const deltaETag = formatNeuroGuideSyncETag(delta.maxSeq, delta.rootHash, "protocols");
      const lastRow = delta.rows[delta.rows.length - 1];
      const hasMore = Boolean(
        delta.rows.length === limit && lastRow && lastRow.changeSeq < delta.maxSeq
      );
      return {
        status: 200,
        headers: noStoreHeaders({ ETag: deltaETag }),
        body: {
          changes: delta.rows,
          maxSeq: delta.maxSeq,
          rootHash: delta.rootHash,
          hasMore,
          reset: false,
        },
      };
    }

    const [blockDelta, protoDelta, links] = await Promise.all([
      deps.repo.changesSince(since, limit),
      deps.repo.protocolChangesSince(since, limit),
      includeLinks ? deps.repo.listBlockLinks() : Promise.resolve(undefined),
    ]);

    const maxSeq = Math.max(blockDelta.maxSeq, protoDelta.maxSeq);
    const rootHash = protoDelta.rootHash || blockDelta.rootHash;
    const graphETag = formatNeuroGuideSyncETag(maxSeq, rootHash, "graph");
    const lastBlock = blockDelta.rows[blockDelta.rows.length - 1];
    const lastProto = protoDelta.rows[protoDelta.rows.length - 1];
    const hasMore =
      Boolean(
        blockDelta.rows.length === limit && lastBlock && lastBlock.changeSeq < maxSeq
      ) ||
      Boolean(
        protoDelta.rows.length === limit && lastProto && lastProto.changeSeq < maxSeq
      );

    const visibleBlockRows =
      deps.isAdmin === false
        ? blockDelta.rows.filter((r) => r.deletedAt !== null || !isDraftOrUnapprovedNeuroGuideBlock(r))
        : blockDelta.rows;

    return {
      status: 200,
      headers: noStoreHeaders({ ETag: graphETag }),
      body: {
        changes: visibleBlockRows,
        protocolChanges: protoDelta.rows,
        ...(links !== undefined ? { blockLinks: links } : {}),
        maxSeq,
        rootHash,
        hasMore,
        reset: false,
      },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo);
  }
}

export async function handleCreateBlock(
  deps: NeuroGuideSyncHandlerDeps,
  body: { data?: unknown; uid?: string; allowVerified?: boolean } | null | undefined
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }

  const actor = deps.actor?.trim() || "admin";
  const prepared = prepareBlockData(body?.data, {
    allowVerified: Boolean(body?.allowVerified),
  });
  if (!prepared.ok) {
    return prepared.result;
  }

  try {
    const contentHash = computeBlockContentHash(prepared.data);
    const sectionHashes = computeBlockSectionHashes(prepared.data);
    const res = await deps.repo.createBlock(
      prepared.data,
      contentHash,
      sectionHashes,
      actor,
      typeof body?.uid === "string" && body.uid.trim() ? { uid: body.uid.trim() } : undefined
    );
    invalidateNeuroGuideTags(deps, ["neuroguide:blocks", ...res.invalidatedTags]);
    return {
      status: 201,
      headers: noStoreHeaders(),
      body: {
        row: res.row,
        invalidatedTags: res.invalidatedTags,
      },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo, undefined, "block");
  }
}

export async function handleUpdateBlock(
  deps: NeuroGuideSyncHandlerDeps,
  uid: string,
  body: { data?: unknown; expectedRev?: unknown; allowVerified?: boolean } | null | undefined
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid || !uid.trim()) {
    return badRequest("INVALID_PARAMS", "Missing target block uid.");
  }

  const expectedRevParsed = parsePositiveInt(body?.expectedRev, "expectedRev");
  if (!expectedRevParsed.ok) {
    return badRequest("INVALID_PARAMS", expectedRevParsed.error);
  }

  const prepared = prepareBlockData(body?.data, {
    allowVerified: Boolean(body?.allowVerified),
  });
  if (!prepared.ok) {
    return prepared.result;
  }

  const actor = deps.actor?.trim() || "admin";

  try {
    const current = await deps.repo.getBlockByUid(uid);
    if (!current || current.deletedAt !== null) {
      return notFound(`NeuroGuide block uid '${uid}' not found.`);
    }

    const contentHash = computeBlockContentHash(prepared.data);
    const sectionHashes = computeBlockSectionHashes(prepared.data);
    const patchDiff = computeJsonPatch(current.data, prepared.data);

    const res = await deps.repo.updateBlock(
      uid,
      expectedRevParsed.value,
      prepared.data,
      contentHash,
      sectionHashes,
      patchDiff,
      actor
    );

    if (!res.unchanged) {
      invalidateNeuroGuideTags(deps, ["neuroguide:blocks", ...res.invalidatedTags]);
    }

    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        row: res.row,
        unchanged: res.unchanged,
        invalidatedTags: res.invalidatedTags,
      },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo, uid, "block");
  }
}

export async function handleDeleteBlock(
  deps: NeuroGuideSyncHandlerDeps,
  uid: string,
  input: { expectedRevParam?: string | number | null }
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid || !uid.trim()) {
    return badRequest("INVALID_PARAMS", "Missing target block uid.");
  }

  const expectedRevParsed = parsePositiveInt(input.expectedRevParam, "expectedRev");
  if (!expectedRevParsed.ok) {
    return badRequest("INVALID_PARAMS", expectedRevParsed.error);
  }

  const actor = deps.actor?.trim() || "admin";
  try {
    const res = await deps.repo.removeBlock(uid, expectedRevParsed.value, actor);
    invalidateNeuroGuideTags(deps, ["neuroguide:blocks", ...res.invalidatedTags]);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        row: res.row,
        invalidatedTags: res.invalidatedTags,
      },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo, uid, "block");
  }
}

export async function handleGetBlockHistory(
  deps: NeuroGuideSyncHandlerDeps,
  uid: string
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid || !uid.trim()) {
    return badRequest("INVALID_PARAMS", "Missing target block uid.");
  }

  try {
    const revisions = await deps.repo.history(uid);
    if (revisions.length === 0) {
      const existing = await deps.repo.getBlockByUid(uid);
      if (!existing) {
        return notFound(`NeuroGuide block uid '${uid}' not found.`);
      }
    }
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { revisions },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo, uid, "block");
  }
}

export async function handleRestoreBlockRevision(
  deps: NeuroGuideSyncHandlerDeps,
  uid: string,
  body: { revisionRev?: unknown; expectedRev?: unknown } | null | undefined
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid || !uid.trim()) {
    return badRequest("INVALID_PARAMS", "Missing target block uid.");
  }

  const revisionRevParsed = parsePositiveInt(body?.revisionRev, "revisionRev");
  if (!revisionRevParsed.ok) {
    return badRequest("INVALID_PARAMS", revisionRevParsed.error);
  }
  const expectedRevParsed = parsePositiveInt(body?.expectedRev, "expectedRev");
  if (!expectedRevParsed.ok) {
    return badRequest("INVALID_PARAMS", expectedRevParsed.error);
  }

  const actor = deps.actor?.trim() || "admin";
  try {
    const current = await deps.repo.getBlockByUid(uid);
    if (!current) {
      return notFound(`NeuroGuide block uid '${uid}' not found.`);
    }

    const revisions = await deps.repo.history(uid);
    const targetRevision = revisions.find((r) => r.rev === revisionRevParsed.value);
    if (!targetRevision) {
      return notFound(
        `Revision rev ${revisionRevParsed.value} for block uid '${uid}' not found.`
      );
    }

    const cloned = structuredClone(targetRevision.data) as unknown as Record<string, unknown>;
    cloned.blockKey = String(cloned.blockKey ?? targetRevision.slug).trim();
    stripVerificationAndForceDraft(cloned, true);

    const restoredData = cloned as unknown as NeuroGuideContentBlockData;
    const newContentHash = computeBlockContentHash(restoredData);
    const sectionHashes = computeBlockSectionHashes(restoredData);
    const patchDiff = computeJsonPatch(current.data, restoredData);

    const res = await deps.repo.restoreBlock(
      uid,
      expectedRevParsed.value,
      revisionRevParsed.value,
      newContentHash,
      sectionHashes,
      patchDiff,
      actor
    );

    invalidateNeuroGuideTags(deps, ["neuroguide:blocks", ...res.invalidatedTags]);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        row: res.row,
        invalidatedTags: res.invalidatedTags,
      },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo, uid, "block");
  }
}

export async function handleListProtocols(
  deps: NeuroGuideSyncHandlerDeps
): Promise<HandlerResult> {
  try {
    const protocols = await deps.repo.listLiveProtocols();
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { protocols },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo, undefined, "protocol");
  }
}

export async function handleUpsertProtocol(
  deps: NeuroGuideSyncHandlerDeps,
  body: Record<string, unknown> | null | undefined
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return badRequest("INVALID_DATA", "Request body must be a JSON object.");
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!slug) {
    return badRequest("INVALID_SLUG", "Protocol 'slug' must be non-empty.");
  }

  const protocolType = body.protocolType as NeuroGuideProtocolType;
  if (!ALLOWED_PROTOCOL_TYPES.has(protocolType)) {
    return badRequest(
      "INVALID_DATA",
      `Invalid protocolType '${String(body.protocolType)}'.`
    );
  }

  if (!body.metadata || typeof body.metadata !== "object" || Array.isArray(body.metadata)) {
    return badRequest("INVALID_DATA", "Protocol 'metadata' must be a JSON object.");
  }

  if (!Array.isArray(body.blockOrder) || body.blockOrder.some((b) => typeof b !== "string")) {
    return badRequest("INVALID_DATA", "Protocol 'blockOrder' must be an array of UUID strings.");
  }

  let expectedRev: number | undefined;
  if (body.expectedRev !== undefined && body.expectedRev !== null) {
    const revParsed = parsePositiveInt(body.expectedRev, "expectedRev");
    if (!revParsed.ok) {
      return badRequest("INVALID_PARAMS", revParsed.error);
    }
    expectedRev = revParsed.value;
  }

  const metadata = body.metadata as NeuroGuideProtocolMetadata;
  const metadataHash =
    typeof body.metadataHash === "string" && body.metadataHash.trim()
      ? body.metadataHash.trim()
      : computeProtocolMetadataHash(metadata);

  const actor = deps.actor?.trim() || "admin";
  const targetUid = typeof body.uid === "string" && body.uid.trim() ? body.uid.trim() : undefined;

  try {
    const res = await deps.repo.upsertProtocol(
      {
        slug,
        protocolType,
        society: typeof body.society === "string" ? body.society : "",
        year: typeof body.year === "number" ? body.year : Number(body.year) || 0,
        title: typeof body.title === "string" ? body.title : "",
        status: typeof body.status === "string" && body.status.trim() ? body.status.trim() : "published",
        subspecialties: Array.isArray(body.subspecialties)
          ? (body.subspecialties as SubspecialtyType[])
          : [],
        metadata,
        blockOrder: body.blockOrder as string[],
        metadataHash,
        edges: Array.isArray(body.edges)
          ? (body.edges as NeuroGuideProtocolEdgeInput[])
          : undefined,
        uid: targetUid,
        expectedRev,
      },
      actor
    );

    if (!res.unchanged) {
      invalidateNeuroGuideTags(deps, [
        "neuroguide:protocols",
        `protocol:${res.row.slug}`,
      ]);
    }

    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        row: res.row,
        unchanged: res.unchanged,
      },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo, targetUid, "protocol");
  }
}

export async function handleDeleteProtocol(
  deps: NeuroGuideSyncHandlerDeps,
  uid: string,
  input: { expectedRevParam?: string | number | null }
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid || !uid.trim()) {
    return badRequest("INVALID_PARAMS", "Missing target protocol uid.");
  }

  const expectedRevParsed = parsePositiveInt(input.expectedRevParam, "expectedRev");
  if (!expectedRevParsed.ok) {
    return badRequest("INVALID_PARAMS", expectedRevParsed.error);
  }

  const actor = deps.actor?.trim() || "admin";
  try {
    const row = await deps.repo.deleteProtocol(uid, expectedRevParsed.value, actor);
    invalidateNeuroGuideTags(deps, [
      "neuroguide:protocols",
      `protocol:${row.slug}`,
    ]);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { row },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo, uid, "protocol");
  }
}

export async function handleGetBlockLinks(
  deps: NeuroGuideSyncHandlerDeps,
  input: { srcBlockUid?: string | null } = {}
): Promise<HandlerResult> {
  try {
    const srcUid =
      typeof input.srcBlockUid === "string" && input.srcBlockUid.trim()
        ? input.srcBlockUid.trim()
        : undefined;
    const links = await deps.repo.listBlockLinks(srcUid);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { links },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo);
  }
}

export async function handleReplaceBlockLinks(
  deps: NeuroGuideSyncHandlerDeps,
  body: { links?: unknown; clearExisting?: boolean } | null | undefined
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!body || !Array.isArray(body.links)) {
    return badRequest("INVALID_DATA", "Payload 'links' must be an array.");
  }

  const links = body.links as NeuroGuideBlockLinkEdge[];
  for (const link of links) {
    if (
      !link ||
      typeof link !== "object" ||
      typeof link.srcBlockUid !== "string" ||
      !link.srcBlockUid.trim() ||
      typeof link.dstBlockUid !== "string" ||
      !link.dstBlockUid.trim() ||
      typeof link.linkType !== "string" ||
      !link.linkType.trim()
    ) {
      return badRequest(
        "INVALID_DATA",
        "Each link edge requires srcBlockUid, dstBlockUid, and linkType."
      );
    }
  }

  try {
    const upserted = await deps.repo.replaceBlockLinks(
      links,
      Boolean(body.clearExisting)
    );
    const affectedTags = ["neuroguide:links"];
    for (const link of links.slice(0, 100)) {
      affectedTags.push(`block:${link.srcBlockUid}`);
      affectedTags.push(`block:${link.dstBlockUid}`);
    }
    invalidateNeuroGuideTags(deps, affectedTags);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { upserted },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo);
  }
}

export async function handleQueryBlocksByFacets(
  deps: NeuroGuideSyncHandlerDeps,
  filter: NeuroGuideOverlappingFacetFilter = {}
): Promise<HandlerResult> {
  try {
    const blocks = await deps.repo.queryBlocksByFacets(filter);
    const visibleBlocks =
      deps.isAdmin === false
        ? blocks.filter((b) => b.deletedAt !== null || !isDraftOrUnapprovedNeuroGuideBlock(b))
        : blocks;
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { blocks: visibleBlocks },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo);
  }
}

export async function handlePurgeNeuroGuide(
  deps: NeuroGuideSyncHandlerDeps
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }

  try {
    const res = await deps.repo.purge();
    invalidateNeuroGuideTags(deps, [
      "neuroguide:blocks",
      "neuroguide:protocols",
      "neuroguide:links",
    ]);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        tombstones_purged: res.tombstonesPurged,
        revisions_purged: res.revisionsPurged,
        purge_horizon_seq: res.purgeHorizonSeq,
      },
    };
  } catch (err) {
    return mapNeuroGuideRepoErrorToResult(err, deps.repo);
  }
}
