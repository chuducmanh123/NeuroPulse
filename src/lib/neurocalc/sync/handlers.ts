import fs from "node:fs";
import path from "node:path";
import type { ScaleRecord } from "../../../types/neurocalc.ts";
import { computeContentHashSync } from "../integrity.ts";
import { validateScaleRecord } from "../validate.ts";
import { computeJsonPatch, computeSectionHashes } from "./jsonPatch.ts";
import { RepoError, type ScaleRepo } from "./repo.ts";
import type { SyncRow } from "./types.ts";

export interface HandlerResult<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T | null;
}

export interface SyncHandlerDeps {
  repo: ScaleRepo;
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
  const sourcesPath = path.resolve(
    process.cwd(),
    "data",
    "neurocalc",
    "sources.json"
  );
  try {
    if (fs.existsSync(sourcesPath)) {
      const parsed = JSON.parse(fs.readFileSync(sourcesPath, "utf-8")) as Array<{
        id?: string;
      }>;
      if (Array.isArray(parsed)) {
        cachedDefaultSourceIds = new Set(
          parsed
            .map((s) => (typeof s?.id === "string" ? s.id : ""))
            .filter(Boolean)
        );
        return cachedDefaultSourceIds;
      }
    }
  } catch {
    // Fall back to empty set
  }
  cachedDefaultSourceIds = new Set();
  return cachedDefaultSourceIds;
}

function noStoreHeaders(
  extra?: Record<string, string>
): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    ...(extra ?? {}),
  };
}

export function formatSyncETag(maxSeq: number, rootHash: string): string {
  return `"ncalc-v2-${maxSeq}-${rootHash}"`;
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
):
  | { ok: true; value: number; provided: boolean }
  | { ok: false; error: string } {
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

function isPlainRecord(val: unknown): val is Record<string, unknown> {
  return Boolean(val) && typeof val === "object" && !Array.isArray(val);
}

function mapRepoError(err: unknown): HandlerResult {
  if (err instanceof RepoError) {
    switch (err.code) {
      case "SLUG_TAKEN":
        return {
          status: 409,
          headers: noStoreHeaders(),
          body: { error: err.message, code: err.code },
        };
      case "REV_CONFLICT":
        return {
          status: 409,
          headers: noStoreHeaders(),
          body: {
            error: err.message,
            code: err.code,
            currentRev: err.currentRev ?? null,
            currentRow: err.currentRow ?? null,
          },
        };
      case "NOT_FOUND":
        return {
          status: 404,
          headers: noStoreHeaders(),
          body: { error: err.message, code: err.code },
        };
      case "INVALID_SLUG":
      case "INVALID_DATA":
        return {
          status: 400,
          headers: noStoreHeaders(),
          body: { error: err.message, code: err.code },
        };
      case "SERVICE_UNAVAILABLE":
      default:
        return {
          status: 503,
          headers: noStoreHeaders(),
          body: { error: err.message, code: err.code },
        };
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  return {
    status: 500,
    headers: noStoreHeaders(),
    body: { error: message },
  };
}

function unauthorizedResult(): HandlerResult {
  return {
    status: 401,
    headers: noStoreHeaders(),
    body: { error: "Admin authentication required" },
  };
}

function validateScalePayload(
  rawData: unknown,
  knownSourceIds: ReadonlySet<string>
): { ok: true; data: ScaleRecord } | { ok: false; result: HandlerResult } {
  if (!isPlainRecord(rawData)) {
    return {
      ok: false,
      result: {
        status: 400,
        headers: noStoreHeaders(),
        body: { error: "Body must contain a valid 'data' ScaleRecord object" },
      },
    };
  }

  for (const forbidden of FORBIDDEN_ENVELOPE_KEYS) {
    if (forbidden in rawData) {
      return {
        ok: false,
        result: {
          status: 400,
          headers: noStoreHeaders(),
          body: { error: `Forbidden envelope key '${forbidden}' inside data` },
        },
      };
    }
  }

  const normalizedId =
    typeof rawData.id === "string" ? rawData.id.trim().toLowerCase() : "";
  if (!normalizedId || !SLUG_REGEX.test(normalizedId)) {
    return {
      ok: false,
      result: {
        status: 400,
        headers: noStoreHeaders(),
        body: { error: "data.id must be a lowercase kebab-case slug" },
      },
    };
  }

  const candidate: ScaleRecord = {
    ...(rawData as unknown as ScaleRecord),
    id: normalizedId,
  };

  const errors = validateScaleRecord(candidate, knownSourceIds);
  if (errors.length > 0) {
    return {
      ok: false,
      result: {
        status: 400,
        headers: noStoreHeaders(),
        body: {
          error: "ScaleRecord validation failed",
          validationErrors: errors,
        },
      },
    };
  }

  return { ok: true, data: candidate };
}

export async function listAllLiveRows(repo: ScaleRepo): Promise<SyncRow[]> {
  const allRows: SyncRow[] = [];
  let cursor = 0;
  const pageSize = 500;

  while (true) {
    const page = await repo.changesSince(cursor, pageSize);
    if (page.rows.length === 0) {
      break;
    }
    for (const row of page.rows) {
      if (row.deletedAt === null) {
        allRows.push(row);
      }
      if (row.changeSeq > cursor) {
        cursor = row.changeSeq;
      }
    }
    if (page.rows.length < pageSize || cursor >= page.maxSeq) {
      break;
    }
  }

  return allRows;
}

export async function handleGetChanges(
  deps: SyncHandlerDeps,
  params: {
    sinceParam?: string | number | null;
    limitParam?: string | number | null;
    ifNoneMatch?: string | null;
  }
): Promise<HandlerResult> {
  const sinceParsed = parseNonNegativeIntParam(params.sinceParam, 0);
  if (!sinceParsed.ok) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: `Invalid 'since' parameter: ${sinceParsed.error}` },
    };
  }

  const limitParsed = parseNonNegativeIntParam(params.limitParam, 500);
  if (!limitParsed.ok || limitParsed.value < 1) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: "Invalid 'limit' parameter: expected integer >= 1" },
    };
  }
  const limit = Math.min(limitParsed.value, 500);

  try {
    const state = await deps.repo.getSyncState();
    const eTag = formatSyncETag(state.maxSeq, state.rootHash);

    if (matchesIfNoneMatch(params.ifNoneMatch, eTag)) {
      return {
        status: 304,
        headers: noStoreHeaders({ ETag: eTag }),
        body: null,
      };
    }

    const reset =
      sinceParsed.value > 0 && sinceParsed.value < state.purgeHorizonSeq;
    const effectiveSince = reset ? 0 : sinceParsed.value;
    const page = await deps.repo.changesSince(effectiveSince, limit);
    const lastRowSeq =
      page.rows.length > 0 ? page.rows[page.rows.length - 1].changeSeq : 0;
    const hasMore = page.rows.length === limit && lastRowSeq < page.maxSeq;

    return {
      status: 200,
      headers: noStoreHeaders({ ETag: eTag }),
      body: {
        changes: page.rows,
        maxSeq: page.maxSeq,
        purgeHorizonSeq: page.purgeHorizonSeq,
        rootHash: page.rootHash,
        hasMore,
        reset,
      },
    };
  } catch (err) {
    return mapRepoError(err);
  }
}

export async function handleListScales(
  deps: SyncHandlerDeps
): Promise<HandlerResult> {
  try {
    const [rows, state] = await Promise.all([
      listAllLiveRows(deps.repo),
      deps.repo.getSyncState(),
    ]);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        scales: rows,
        maxSeq: state.maxSeq,
        rootHash: state.rootHash,
      },
    };
  } catch (err) {
    return mapRepoError(err);
  }
}

export async function handleGetScale(
  deps: SyncHandlerDeps,
  uid: string
): Promise<HandlerResult> {
  if (!uid || !uid.trim()) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: "uid is required" },
    };
  }
  try {
    const row = await deps.repo.getByUid(uid);
    if (!row || row.deletedAt !== null) {
      return {
        status: 404,
        headers: noStoreHeaders(),
        body: { error: `Scale '${uid}' not found`, code: "NOT_FOUND" },
      };
    }
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { row },
    };
  } catch (err) {
    return mapRepoError(err);
  }
}

export async function handleCreateScale(
  deps: SyncHandlerDeps,
  body: unknown
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorizedResult();
  }
  if (!isPlainRecord(body)) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: "JSON object body required" },
    };
  }

  const rawData = "data" in body ? body.data : body;
  const knownSourceIds = deps.knownSourceIds ?? getDefaultKnownSourceIds();
  const validated = validateScalePayload(rawData, knownSourceIds);
  if (!validated.ok) {
    return validated.result;
  }

  const contentHash = computeContentHashSync(validated.data);
  const sectionHashes = computeSectionHashes(validated.data);
  const actor =
    (typeof body.actor === "string" && body.actor.trim()) ||
    deps.actor ||
    "admin";

  try {
    const row = await deps.repo.create(
      validated.data,
      contentHash,
      sectionHashes,
      actor
    );
    deps.onInvalidateTag?.("neurocalc-sync");
    return {
      status: 201,
      headers: noStoreHeaders(),
      body: { row },
    };
  } catch (err) {
    return mapRepoError(err);
  }
}

export async function handleUpdateScale(
  deps: SyncHandlerDeps,
  uid: string,
  body: unknown
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorizedResult();
  }
  if (!uid || !uid.trim()) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: "uid is required" },
    };
  }
  if (!isPlainRecord(body)) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: "JSON object body required" },
    };
  }

  const revParsed = parsePositiveInt(body.expectedRev, "expectedRev");
  if (!revParsed.ok) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: revParsed.error },
    };
  }

  const knownSourceIds = deps.knownSourceIds ?? getDefaultKnownSourceIds();
  const validated = validateScalePayload(body.data, knownSourceIds);
  if (!validated.ok) {
    return validated.result;
  }

  const actor =
    (typeof body.actor === "string" && body.actor.trim()) ||
    deps.actor ||
    "admin";

  try {
    const current = await deps.repo.getByUid(uid);
    if (!current || current.deletedAt !== null) {
      return {
        status: 404,
        headers: noStoreHeaders(),
        body: { error: `Scale '${uid}' not found`, code: "NOT_FOUND" },
      };
    }

    const contentHash = computeContentHashSync(validated.data);
    const sectionHashes = computeSectionHashes(validated.data);
    const patchDiff = computeJsonPatch(current.data, validated.data);

    const { row, unchanged } = await deps.repo.update(
      uid,
      revParsed.value,
      validated.data,
      contentHash,
      sectionHashes,
      patchDiff,
      actor
    );
    if (!unchanged) {
      deps.onInvalidateTag?.("neurocalc-sync");
    }
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { row, unchanged },
    };
  } catch (err) {
    return mapRepoError(err);
  }
}

export async function handleDeleteScale(
  deps: SyncHandlerDeps,
  uid: string,
  params: { expectedRevParam?: unknown; actor?: string }
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorizedResult();
  }
  if (!uid || !uid.trim()) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: "uid is required" },
    };
  }

  const revParsed = parsePositiveInt(params.expectedRevParam, "expectedRev");
  if (!revParsed.ok) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: revParsed.error },
    };
  }

  const actor = params.actor?.trim() || deps.actor || "admin";

  try {
    const row = await deps.repo.remove(uid, revParsed.value, actor);
    deps.onInvalidateTag?.("neurocalc-sync");
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { row },
    };
  } catch (err) {
    return mapRepoError(err);
  }
}

export async function handleGetHistory(
  deps: SyncHandlerDeps,
  uid: string
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorizedResult();
  }
  if (!uid || !uid.trim()) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: "uid is required" },
    };
  }

  try {
    const revisions = await deps.repo.history(uid);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { revisions },
    };
  } catch (err) {
    return mapRepoError(err);
  }
}

export async function handleRestoreScale(
  deps: SyncHandlerDeps,
  uid: string,
  body: unknown
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorizedResult();
  }
  if (!uid || !uid.trim()) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: "uid is required" },
    };
  }
  if (!isPlainRecord(body)) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: "JSON object body required" },
    };
  }

  const expectedRevParsed = parsePositiveInt(body.expectedRev, "expectedRev");
  if (!expectedRevParsed.ok) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: expectedRevParsed.error },
    };
  }

  const revisionRevParsed = parsePositiveInt(body.revisionRev, "revisionRev");
  if (!revisionRevParsed.ok) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { error: revisionRevParsed.error },
    };
  }

  const actor =
    (typeof body.actor === "string" && body.actor.trim()) ||
    deps.actor ||
    "admin";

  try {
    const [current, revisions] = await Promise.all([
      deps.repo.getByUid(uid),
      deps.repo.history(uid),
    ]);
    if (!current) {
      return {
        status: 404,
        headers: noStoreHeaders(),
        body: { error: `Scale '${uid}' not found`, code: "NOT_FOUND" },
      };
    }

    const targetRevision = revisions.find(
      (r) => r.rev === revisionRevParsed.value
    );
    if (!targetRevision) {
      return {
        status: 404,
        headers: noStoreHeaders(),
        body: {
          error: `Revision ${revisionRevParsed.value} for scale '${uid}' not found`,
          code: "NOT_FOUND",
        },
      };
    }

    const restoredPreview: ScaleRecord = {
      ...targetRevision.data,
      id: targetRevision.data.id.trim().toLowerCase(),
      status: "draft",
      verification: {
        verified_by: null,
        verified_at: null,
        content_hash: null,
      },
    };

    const contentHash = computeContentHashSync(restoredPreview);
    const sectionHashes = computeSectionHashes(restoredPreview);
    const patchDiff = computeJsonPatch(current.data, restoredPreview);

    const row = await deps.repo.restore(
      uid,
      expectedRevParsed.value,
      revisionRevParsed.value,
      contentHash,
      sectionHashes,
      patchDiff,
      actor
    );
    deps.onInvalidateTag?.("neurocalc-sync");
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: { row },
    };
  } catch (err) {
    return mapRepoError(err);
  }
}

export async function handlePurge(
  deps: SyncHandlerDeps
): Promise<HandlerResult> {
  if (!deps.isAdmin) {
    return unauthorizedResult();
  }
  try {
    const summary = await deps.repo.purge();
    deps.onInvalidateTag?.("neurocalc-sync");
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: summary,
    };
  } catch (err) {
    return mapRepoError(err);
  }
}
