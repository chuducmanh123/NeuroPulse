import fs from "node:fs";
import path from "node:path";
import type { DrugRecord } from "../../../types/neurorx.ts";
import { computeContentHashSync } from "../integrity.ts";
import { validateDrug } from "../validate.ts";
import { computeJsonPatch, computeSectionHashes } from "./jsonPatch.ts";
import { RepoError, type DrugRepo } from "./repo.ts";
import type { SyncRow } from "./types.ts";

export interface HandlerResult<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T | null;
}

export interface SyncHandlerDeps {
  repo: DrugRepo;
  isAdmin?: boolean;
  actor?: string;
  knownSourceIds?: Set<string>;
  onInvalidateTag?: (tag: string) => void;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORBIDDEN_ENVELOPE_KEYS = [
  "uid",
  "rev",
  "changeSeq",
  "deletedAt",
  "change_seq",
  "deleted_at",
];

let cachedDefaultSourceIds: Set<string> | null = null;

export function getDefaultKnownSourceIds(): Set<string> {
  if (cachedDefaultSourceIds) {
    return cachedDefaultSourceIds;
  }
  const sourcesPath = path.resolve(process.cwd(), "data", "neurorx", "sources.json");
  try {
    if (fs.existsSync(sourcesPath)) {
      const parsed = JSON.parse(fs.readFileSync(sourcesPath, "utf-8")) as Array<{ id?: string }>;
      if (Array.isArray(parsed)) {
        cachedDefaultSourceIds = new Set(
          parsed.map((s) => (typeof s?.id === "string" ? s.id : "")).filter(Boolean)
        );
        return cachedDefaultSourceIds;
      }
    }
  } catch {
    // Fall back to empty set if sources.json cannot be read
  }
  cachedDefaultSourceIds = new Set();
  return cachedDefaultSourceIds;
}

function noStoreHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    ...(extra ?? {}),
  };
}

export function formatSyncETag(maxSeq: number, rootHash: string): string {
  return `"nrx-v2-${maxSeq}-${rootHash}"`;
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

function invalidateDrugTags(deps: SyncHandlerDeps, uid?: string): void {
  if (!deps.onInvalidateTag) return;
  deps.onInvalidateTag("neurorx:drugs");
  if (uid) {
    deps.onInvalidateTag(`neurorx:drug:${uid}`);
  }
}

function prepareAndValidateDrugPayload(
  rawData: unknown,
  knownSourceIds: Set<string>,
  options: { allowVerified?: boolean; actor: string }
): { ok: true; record: DrugRecord; slug: string } | { ok: false; result: HandlerResult } {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) {
    return {
      ok: false,
      result: badRequest("INVALID_DATA", "Payload 'data' must be a DrugRecord object."),
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
        `DrugRecord must not contain sync envelope fields: ${leaked.join(", ")}`
      ),
    };
  }

  const normalizedSlug = typeof obj.id === "string" ? obj.id.toLowerCase().trim() : "";
  if (!normalizedSlug || !SLUG_REGEX.test(normalizedSlug)) {
    return {
      ok: false,
      result: badRequest(
        "INVALID_SLUG",
        "DrugRecord 'id' must normalize to a valid slug ([a-z0-9-]+)."
      ),
    };
  }

  const cloned = structuredClone(obj) as unknown as DrugRecord;
  cloned.id = normalizedSlug;

  if (options.allowVerified && cloned.status === "verified") {
    cloned.verification = {
      verified_by: cloned.verification?.verified_by || options.actor,
      verified_at:
        cloned.verification?.verified_at || new Date().toISOString().split("T")[0],
      content_hash: "",
    };
    cloned.verification.content_hash = computeContentHashSync(cloned);
  } else {
    // Pitfall P9 / G1.5: direct API mutations force draft unless explicit verify flow
    cloned.status = "draft";
    cloned.verification = {
      verified_by: null,
      verified_at: null,
      content_hash: null,
    };
  }

  const validationErrors = validateDrug(cloned, knownSourceIds);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      result: badRequest("INVALID_DATA", "DrugRecord validation failed.", validationErrors),
    };
  }

  return { ok: true, record: cloned, slug: normalizedSlug };
}

export async function mapRepoErrorToResult(
  err: unknown,
  repo: DrugRepo,
  uid?: string
): Promise<HandlerResult> {
  if (err instanceof RepoError) {
    switch (err.code) {
      case "REV_CONFLICT": {
        const current =
          err.currentRow ?? (uid ? await repo.getByUid(uid).catch(() => null) : null);
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
  deps: SyncHandlerDeps,
  input: {
    sinceParam?: string | number | null;
    limitParam?: string | number | null;
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

  const since = sinceParsed.value;
  const sinceProvided = sinceParsed.provided;
  const limit = limitParsed.value;

  try {
    const state = await deps.repo.getSyncState();
    const stateETag = formatSyncETag(state.maxSeq, state.rootHash);
    const reset = since > 0 && since < state.purgeHorizonSeq;

    // ETag fast-path: skip scanning drug rows when client is already caught up to current state.
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
          maxSeq: state.maxSeq,
          rootHash: state.rootHash,
          hasMore: false,
          reset: true,
        },
      };
    }

    const delta = await deps.repo.changesSince(since, limit);
    const deltaETag = formatSyncETag(delta.maxSeq, delta.rootHash);
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
  } catch (err) {
    return mapRepoErrorToResult(err, deps.repo);
  }
}

export async function handleCreateDrug(
  deps: SyncHandlerDeps,
  body: { data?: unknown; allowVerified?: boolean } | null | undefined
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }

  const actor = deps.actor?.trim() || "admin";
  const knownSourceIds = deps.knownSourceIds ?? getDefaultKnownSourceIds();
  const prepared = prepareAndValidateDrugPayload(body?.data, knownSourceIds, {
    allowVerified: Boolean(body?.allowVerified),
    actor,
  });
  if (!prepared.ok) {
    return prepared.result;
  }

  try {
    const contentHash = computeContentHashSync(prepared.record);
    const sectionHashes = computeSectionHashes(prepared.record);
    const row = await deps.repo.create(
      prepared.record,
      contentHash,
      sectionHashes,
      actor
    );
    invalidateDrugTags(deps, row.uid);
    return {
      status: 201,
      headers: noStoreHeaders(),
      body: { row },
    };
  } catch (err) {
    return mapRepoErrorToResult(err, deps.repo);
  }
}

export async function handleUpdateDrug(
  deps: SyncHandlerDeps,
  uid: string,
  body: { data?: unknown; expectedRev?: unknown; allowVerified?: boolean } | null | undefined
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid || !uid.trim()) {
    return badRequest("INVALID_PARAMS", "Missing target uid.");
  }

  const expectedRevParsed = parsePositiveInt(body?.expectedRev, "expectedRev");
  if (!expectedRevParsed.ok) {
    return badRequest("INVALID_PARAMS", expectedRevParsed.error);
  }

  const actor = deps.actor?.trim() || "admin";
  const knownSourceIds = deps.knownSourceIds ?? getDefaultKnownSourceIds();
  const prepared = prepareAndValidateDrugPayload(body?.data, knownSourceIds, {
    allowVerified: Boolean(body?.allowVerified),
    actor,
  });
  if (!prepared.ok) {
    return prepared.result;
  }

  try {
    const current = await deps.repo.getByUid(uid);
    if (!current || current.deletedAt !== null) {
      return notFound(`Drug uid '${uid}' not found.`);
    }

    const contentHash = computeContentHashSync(prepared.record);
    const sectionHashes = computeSectionHashes(prepared.record);
    const patchDiff = computeJsonPatch(current.data, prepared.record);

    const { row, unchanged } = await deps.repo.update(
      uid,
      expectedRevParsed.value,
      prepared.record,
      contentHash,
      sectionHashes,
      patchDiff,
      actor
    );

    if (!unchanged) {
      invalidateDrugTags(deps, uid);
    }

    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { row, unchanged },
    };
  } catch (err) {
    return mapRepoErrorToResult(err, deps.repo, uid);
  }
}

export async function handleDeleteDrug(
  deps: SyncHandlerDeps,
  uid: string,
  input: { expectedRevParam?: string | number | null }
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid || !uid.trim()) {
    return badRequest("INVALID_PARAMS", "Missing target uid.");
  }

  const expectedRevParsed = parsePositiveInt(input.expectedRevParam, "expectedRev");
  if (!expectedRevParsed.ok) {
    return badRequest("INVALID_PARAMS", expectedRevParsed.error);
  }

  const actor = deps.actor?.trim() || "admin";
  try {
    const row = await deps.repo.remove(uid, expectedRevParsed.value, actor);
    invalidateDrugTags(deps, uid);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { row },
    };
  } catch (err) {
    return mapRepoErrorToResult(err, deps.repo, uid);
  }
}

export async function handleGetHistory(
  deps: SyncHandlerDeps,
  uid: string
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid || !uid.trim()) {
    return badRequest("INVALID_PARAMS", "Missing target uid.");
  }

  try {
    const revisions = await deps.repo.history(uid);
    if (revisions.length === 0) {
      const existing = await deps.repo.getByUid(uid);
      if (!existing) {
        return notFound(`Drug uid '${uid}' not found.`);
      }
    }
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { revisions },
    };
  } catch (err) {
    return mapRepoErrorToResult(err, deps.repo, uid);
  }
}

export async function handleRestoreRevision(
  deps: SyncHandlerDeps,
  uid: string,
  body: { revisionRev?: unknown; expectedRev?: unknown } | null | undefined
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid || !uid.trim()) {
    return badRequest("INVALID_PARAMS", "Missing target uid.");
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
    const current = await deps.repo.getByUid(uid);
    if (!current) {
      return notFound(`Drug uid '${uid}' not found.`);
    }

    const revisions = await deps.repo.history(uid);
    const targetRevision = revisions.find((r) => r.rev === revisionRevParsed.value);
    if (!targetRevision) {
      return notFound(`Revision rev ${revisionRevParsed.value} for uid '${uid}' not found.`);
    }

    const restoredDraft = structuredClone(targetRevision.data) as unknown as Record<
      string,
      unknown
    >;
    delete restoredDraft.verification;
    restoredDraft.id = String(restoredDraft.id ?? targetRevision.slug)
      .toLowerCase()
      .trim();
    restoredDraft.status = "draft";

    const restoredRecord = restoredDraft as unknown as DrugRecord;
    const newContentHash = computeContentHashSync(restoredRecord);
    const sectionHashes = computeSectionHashes(restoredRecord);
    const patchDiff = computeJsonPatch(current.data, restoredRecord);

    const row = await deps.repo.restore(
      uid,
      expectedRevParsed.value,
      revisionRevParsed.value,
      newContentHash,
      sectionHashes,
      patchDiff,
      actor
    );

    invalidateDrugTags(deps, uid);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { row },
    };
  } catch (err) {
    return mapRepoErrorToResult(err, deps.repo, uid);
  }
}

export async function handlePurge(deps: SyncHandlerDeps): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }

  try {
    const res = await deps.repo.purge();
    invalidateDrugTags(deps);
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
    return mapRepoErrorToResult(err, deps.repo);
  }
}

export async function listAllLiveRows(repo: DrugRepo): Promise<SyncRow[]> {
  const PAGE_SIZE = 500;
  const liveByUid = new Map<string, SyncRow>();
  let since = 0;

  for (;;) {
    const page = await repo.changesSince(since, PAGE_SIZE);
    if (page.rows.length === 0) {
      break;
    }

    for (const row of page.rows) {
      if (row.deletedAt === null) {
        liveByUid.set(row.uid, row);
      } else {
        liveByUid.delete(row.uid);
      }
    }

    const lastSeq = page.rows[page.rows.length - 1].changeSeq;
    if (lastSeq <= since || page.rows.length < PAGE_SIZE) {
      break;
    }
    since = lastSeq;
  }

  return Array.from(liveByUid.values());
}

function resolveVerifiedBy(
  body: Record<string, unknown> | null,
  deps: SyncHandlerDeps
): string {
  const raw =
    typeof body?.verified_by === "string"
      ? body.verified_by.trim()
      : typeof body?.verifiedBy === "string"
      ? body.verifiedBy.trim()
      : "";
  return raw || deps.actor?.trim() || "Admin";
}

function buildVerifiedDrugRecord(
  sourceData: DrugRecord,
  verifiedBy: string,
  verifiedAtDate: string
): DrugRecord {
  const nextData: DrugRecord = structuredClone(sourceData);
  nextData.status = "verified";
  nextData.verification = {
    verified_by: verifiedBy,
    verified_at: verifiedAtDate,
    content_hash: "",
  };
  const hash = computeContentHashSync(nextData);
  nextData.verification.content_hash = hash;
  return nextData;
}

export async function handleVerifyDrugV2(
  deps: SyncHandlerDeps,
  body: Record<string, unknown> | null
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }

  const uid = typeof body?.uid === "string" ? body.uid.trim() : "";
  const drugId = typeof body?.drug_id === "string" ? body.drug_id.trim().toLowerCase() : "";
  if (!uid && !drugId) {
    return badRequest("INVALID_PARAMS", "Missing target uid or drug_id.");
  }

  const rawExpectedRev = body?.expected_rev ?? body?.expectedRev;
  let explicitExpectedRev: number | null = null;
  if (rawExpectedRev !== undefined && rawExpectedRev !== null) {
    const parsedRev = parsePositiveInt(rawExpectedRev, "expected_rev");
    if (!parsedRev.ok) {
      return badRequest("INVALID_PARAMS", parsedRev.error);
    }
    explicitExpectedRev = parsedRev.value;
  }

  const verifiedBy = resolveVerifiedBy(body, deps);
  const actor = deps.actor?.trim() || verifiedBy || "admin";
  let targetUid = uid;

  try {
    let current: SyncRow | null = null;
    if (uid) {
      current = await deps.repo.getByUid(uid);
    } else {
      const liveRows = await listAllLiveRows(deps.repo);
      current =
        liveRows.find(
          (row) => row.slug === drugId || row.data.id.toLowerCase().trim() === drugId
        ) ?? null;
    }

    if (!current || current.deletedAt !== null) {
      return notFound(`Drug record not found: ${uid || drugId}`);
    }

    targetUid = current.uid;
    const effectiveExpectedRev = explicitExpectedRev ?? current.rev;
    const verifiedAtDate = new Date().toISOString().split("T")[0];
    const nextData = buildVerifiedDrugRecord(current.data, verifiedBy, verifiedAtDate);
    const contentHash = nextData.verification.content_hash ?? computeContentHashSync(nextData);

    if (
      effectiveExpectedRev === current.rev &&
      current.data.status === "verified" &&
      current.data.verification?.verified_by === verifiedBy &&
      current.data.verification?.content_hash === contentHash
    ) {
      return {
        status: 200,
        headers: noStoreHeaders(),
        body: {
          row: current,
          unchanged: true,
        },
      };
    }

    const sectionHashes = computeSectionHashes(nextData);
    const patchDiff = computeJsonPatch(current.data, nextData);
    const updated = await deps.repo.update(
      current.uid,
      effectiveExpectedRev,
      nextData,
      contentHash,
      sectionHashes,
      patchDiff,
      actor
    );

    if (!updated.unchanged) {
      invalidateDrugTags(deps, current.uid);
    }

    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        row: updated.row,
        unchanged: updated.unchanged,
      },
    };
  } catch (err) {
    return mapRepoErrorToResult(err, deps.repo, targetUid || undefined);
  }
}

export async function handleVerifyAllDrugsV2(
  deps: SyncHandlerDeps,
  body: Record<string, unknown> | null
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }

  const verifiedBy = resolveVerifiedBy(body, deps);
  const actor = deps.actor?.trim() || verifiedBy || "admin";
  const verifiedAtDate = new Date().toISOString().split("T")[0];

  try {
    const liveRows = await listAllLiveRows(deps.repo);
    const updatedRows: SyncRow[] = [];
    const conflicts: Array<{ uid: string; slug: string; currentRev: number }> = [];

    for (const row of liveRows) {
      if (row.data.status === "retired") {
        continue;
      }

      const currentExpectedHash = computeContentHashSync(row.data);
      const alreadySealed =
        row.data.status === "verified" &&
        row.data.verification?.content_hash === currentExpectedHash;
      if (alreadySealed) {
        continue;
      }

      const nextData = buildVerifiedDrugRecord(row.data, verifiedBy, verifiedAtDate);
      const contentHash = nextData.verification.content_hash ?? computeContentHashSync(nextData);
      const sectionHashes = computeSectionHashes(nextData);
      const patchDiff = computeJsonPatch(row.data, nextData);

      try {
        const res = await deps.repo.update(
          row.uid,
          row.rev,
          nextData,
          contentHash,
          sectionHashes,
          patchDiff,
          actor
        );
        if (!res.unchanged) {
          updatedRows.push(res.row);
        }
      } catch (err) {
        if (err instanceof RepoError && err.code === "REV_CONFLICT") {
          conflicts.push({
            uid: row.uid,
            slug: row.slug,
            currentRev: err.currentRev ?? row.rev,
          });
          continue;
        }
        throw err;
      }
    }

    if (updatedRows.length > 0) {
      invalidateDrugTags(deps);
    }

    const state = await deps.repo.getSyncState();
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        verified_count: updatedRows.length,
        rows: updatedRows,
        conflicts,
        max_seq: state.maxSeq,
        root_hash: state.rootHash,
      },
    };
  } catch (err) {
    return mapRepoErrorToResult(err, deps.repo);
  }
}
