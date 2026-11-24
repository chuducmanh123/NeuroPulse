import type {
  ClinicalPathwayDoc,
  DuplicatePathwayMatch,
  PathwayNode,
} from "../../types/clinicalPathways.ts";
import {
  extractPathwayFromImage,
  type ExtractPathwayMetadataInput,
} from "./pathwayExtractor.ts";
import {
  PathwayServiceError,
  createPathwayDraft,
  findDuplicatePathways,
  getPathwayByUid,
  listPathways,
  restorePathway,
  softDeletePathway,
  updatePathway,
  uploadPathwayImage,
  type CreatePathwayDraftInput,
} from "./pathwayService.ts";
import { validateClinicalPathway } from "./pathwayValidator.ts";
import { RepoError, type NeuroGuideRepo } from "./sync/repo.ts";

export interface PathwayHandlerDeps {
  repo: NeuroGuideRepo;
  isAdmin: boolean;
  actor?: string;
  onInvalidateTag?: (tag: string) => void;
  uploadImageFn?: typeof uploadPathwayImage;
  extractFn?: typeof extractPathwayFromImage;
}

export interface PathwayHandlerResult<T = unknown> {
  status: number;
  headers: Record<string, string>;
  body: T;
}

function noStoreHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    ...(extra ?? {}),
  };
}

function unauthorized(): PathwayHandlerResult {
  return {
    status: 401,
    headers: noStoreHeaders(),
    body: {
      ok: false,
      code: "UNAUTHORIZED",
      error: "Admin authentication is required for this operation.",
    },
  };
}

function parseStrictPositiveRev(raw: unknown): number | null {
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const parsed = Number(raw.trim());
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function invalidatePathwayTags(
  deps: PathwayHandlerDeps,
  pathway: { slug: string; nodes?: Array<{ blockUid?: string }> }
): void {
  if (!deps.onInvalidateTag) return;
  deps.onInvalidateTag(`protocol:${pathway.slug}`);
  for (const node of pathway.nodes ?? []) {
    if (node.blockUid) {
      deps.onInvalidateTag(`block:${node.blockUid}`);
    }
  }
}

export function mapPathwayErrorToResult(err: unknown): PathwayHandlerResult {
  if (err instanceof RepoError) {
    if (err.code === "REV_CONFLICT") {
      return {
        status: 409,
        headers: noStoreHeaders(),
        body: {
          ok: false,
          code: "REV_CONFLICT",
          error: err.message,
          currentRev: err.currentRev,
          serverRow: err.currentRow,
        },
      };
    }
    if (err.code === "SLUG_TAKEN") {
      return {
        status: 409,
        headers: noStoreHeaders(),
        body: {
          ok: false,
          code: "SLUG_TAKEN",
          error: err.message,
        },
      };
    }
    if (err.code === "NOT_FOUND") {
      return {
        status: 404,
        headers: noStoreHeaders(),
        body: {
          ok: false,
          code: "NOT_FOUND",
          error: err.message,
        },
      };
    }
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: {
        ok: false,
        code: err.code,
        error: err.message,
      },
    };
  }

  if (err instanceof PathwayServiceError) {
    const statusMap: Record<PathwayServiceError["code"], number> = {
      DUPLICATE_PATHWAY: 409,
      VALIDATION_FAILED: 422,
      INVALID_IMAGE: 400,
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      STORAGE_ERROR: 500,
    };
    return {
      status: statusMap[err.code] ?? 500,
      headers: noStoreHeaders(),
      body: {
        ok: false,
        code: err.code,
        error: err.message,
        ...(err.details ?? {}),
      },
    };
  }

  return {
    status: 500,
    headers: noStoreHeaders(),
    body: {
      ok: false,
      code: "INTERNAL_ERROR",
      error: err instanceof Error ? err.message : "Unexpected server error",
    },
  };
}

export async function handleListPathways(
  deps: PathwayHandlerDeps,
  query: {
    includeDrafts?: boolean;
    includeArchived?: boolean;
    includeDeleted?: boolean;
    subspecialty?: string | null;
    domain?: string | null;
    sourceType?: string | null;
  }
): Promise<PathwayHandlerResult> {
  try {
    const pathways = await listPathways(deps.repo, {
      includeDrafts: deps.isAdmin && Boolean(query.includeDrafts),
      includeArchived: deps.isAdmin && Boolean(query.includeArchived),
      includeDeleted: deps.isAdmin && Boolean(query.includeDeleted),
      subspecialty: query.subspecialty?.trim() || undefined,
      domain: query.domain?.trim() || undefined,
      sourceType: query.sourceType?.trim() || undefined,
    });

    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        ok: true,
        pathways,
        count: pathways.length,
      },
    };
  } catch (err) {
    return mapPathwayErrorToResult(err);
  }
}

export async function handleCreatePathway(
  deps: PathwayHandlerDeps,
  body: Record<string, unknown> | null | undefined
): Promise<PathwayHandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!body || typeof body !== "object") {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: {
        ok: false,
        code: "INVALID_BODY",
        error: "Request body must be a JSON object.",
      },
    };
  }

  const titleObj = body.title as { en?: unknown } | undefined;
  const sourceObj = body.source as { title?: unknown } | undefined;
  if (!titleObj?.en || !sourceObj?.title || !Array.isArray(body.nodes)) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: {
        ok: false,
        code: "INVALID_BODY",
        error: "Required fields missing: title.en, source.title, and nodes[].",
      },
    };
  }

  try {
    const actor = deps.actor?.trim() || "admin";
    const result = await createPathwayDraft(
      deps.repo,
      body as unknown as CreatePathwayDraftInput,
      actor
    );
    invalidatePathwayTags(deps, result.pathway);
    return {
      status: 201,
      headers: noStoreHeaders(),
      body: {
        ok: true,
        pathway: result.pathway,
        validation: result.validation,
      },
    };
  } catch (err) {
    return mapPathwayErrorToResult(err);
  }
}

export async function handleGetPathway(
  deps: PathwayHandlerDeps,
  uid: string,
  query?: { includeDrafts?: boolean; includeDeleted?: boolean }
): Promise<PathwayHandlerResult> {
  if (!uid?.trim()) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { ok: false, code: "INVALID_UID", error: "Pathway uid is required." },
    };
  }

  try {
    const pathway = await getPathwayByUid(deps.repo, uid.trim(), {
      includeDrafts: deps.isAdmin && Boolean(query?.includeDrafts),
      includeDeleted: deps.isAdmin && Boolean(query?.includeDeleted),
    });
    if (!pathway) {
      return {
        status: 404,
        headers: noStoreHeaders(),
        body: { ok: false, code: "NOT_FOUND", error: `Pathway "${uid}" not found.` },
      };
    }

    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        ok: true,
        pathway,
        validation: validateClinicalPathway(pathway),
      },
    };
  } catch (err) {
    return mapPathwayErrorToResult(err);
  }
}

export async function handlePatchPathway(
  deps: PathwayHandlerDeps,
  uid: string,
  body: Record<string, unknown> | null | undefined
): Promise<PathwayHandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid?.trim()) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { ok: false, code: "INVALID_UID", error: "Pathway uid is required." },
    };
  }
  if (!body || typeof body !== "object") {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { ok: false, code: "INVALID_BODY", error: "Request body must be a JSON object." },
    };
  }

  const expectedRev = parseStrictPositiveRev(body.baseRev ?? body.expectedRev);
  if (expectedRev === null) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: {
        ok: false,
        code: "INVALID_REV",
        error: "baseRev (or expectedRev) must be a positive integer.",
      },
    };
  }

  const patchPayload = { ...body };
  delete patchPayload.baseRev;
  delete patchPayload.expectedRev;

  try {
    const actor = deps.actor?.trim() || "admin";
    const result = await updatePathway(
      deps.repo,
      uid.trim(),
      expectedRev,
      patchPayload as Partial<ClinicalPathwayDoc> & { nodes?: PathwayNode[] },
      actor
    );
    invalidatePathwayTags(deps, result.pathway);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        ok: true,
        pathway: result.pathway,
        validation: result.validation,
        stats: result.stats,
      },
    };
  } catch (err) {
    return mapPathwayErrorToResult(err);
  }
}

export async function handleDeletePathway(
  deps: PathwayHandlerDeps,
  uid: string,
  opts: { baseRev?: unknown; expectedRev?: unknown }
): Promise<PathwayHandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid?.trim()) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { ok: false, code: "INVALID_UID", error: "Pathway uid is required." },
    };
  }

  const expectedRev = parseStrictPositiveRev(opts.baseRev ?? opts.expectedRev);
  if (expectedRev === null) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: {
        ok: false,
        code: "INVALID_REV",
        error: "baseRev (or expectedRev) must be a positive integer.",
      },
    };
  }

  try {
    const actor = deps.actor?.trim() || "admin";
    const result = await softDeletePathway(deps.repo, uid.trim(), expectedRev, actor);
    if (deps.onInvalidateTag) {
      deps.onInvalidateTag(`protocol:${result.protocol.slug}`);
      for (const bUid of result.deletedBlockUids) {
        deps.onInvalidateTag(`block:${bUid}`);
      }
    }
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        ok: true,
        protocol: result.protocol,
        deletedBlockUids: result.deletedBlockUids,
      },
    };
  } catch (err) {
    return mapPathwayErrorToResult(err);
  }
}

export async function handleRestorePathway(
  deps: PathwayHandlerDeps,
  uid: string,
  body: Record<string, unknown> | null | undefined
): Promise<PathwayHandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }
  if (!uid?.trim()) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { ok: false, code: "INVALID_UID", error: "Pathway uid is required." },
    };
  }

  const expectedRev = parseStrictPositiveRev(body?.baseRev ?? body?.expectedRev);
  if (expectedRev === null) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: {
        ok: false,
        code: "INVALID_REV",
        error: "baseRev (or expectedRev) must be a positive integer.",
      },
    };
  }

  try {
    const actor = deps.actor?.trim() || "admin";
    const pathway = await restorePathway(deps.repo, uid.trim(), expectedRev, actor);
    invalidatePathwayTags(deps, pathway);
    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        ok: true,
        pathway,
      },
    };
  } catch (err) {
    return mapPathwayErrorToResult(err);
  }
}

export interface ExtractPathwayHandlerInput {
  imageBuffer: Buffer;
  fileName: string;
  mimeType: string;
  metadata: ExtractPathwayMetadataInput;
}

export async function handleExtractPathway(
  deps: PathwayHandlerDeps,
  input: ExtractPathwayHandlerInput
): Promise<PathwayHandlerResult> {
  if (!deps.isAdmin) {
    return unauthorized();
  }

  if (!Buffer.isBuffer(input.imageBuffer) || input.imageBuffer.byteLength === 0) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: { ok: false, code: "INVALID_IMAGE", error: "Flowchart image file is required." },
    };
  }

  if (
    !input.metadata?.sourceTitle?.trim() ||
    !Number.isFinite(input.metadata?.year) ||
    input.metadata.year < 1900 ||
    !input.metadata?.subspecialty ||
    !input.metadata?.domain ||
    !input.metadata?.sourceType
  ) {
    return {
      status: 400,
      headers: noStoreHeaders(),
      body: {
        ok: false,
        code: "INVALID_METADATA",
        error: "Required source metadata missing: sourceType, sourceTitle, year (>= 1900), subspecialty, domain.",
      },
    };
  }

  try {
    const uploadFn = deps.uploadImageFn ?? uploadPathwayImage;
    const extractFn = deps.extractFn ?? extractPathwayFromImage;

    const uploaded = await uploadFn(input.imageBuffer, input.fileName, input.mimeType);
    const imageDuplicates = await findDuplicatePathways(deps.repo, {
      sourceImageSha256: uploaded.sha256,
    });

    const extracted = await extractFn({
      imageBuffer: input.imageBuffer,
      mimeType: uploaded.mimeType,
      imageUrl: uploaded.url,
      imageSha256: uploaded.sha256,
      fileName: uploaded.fileName,
      metadata: input.metadata,
    });

    const slugDuplicates = await findDuplicatePathways(deps.repo, {
      slug: extracted.draft.slug,
    });

    const dedupMap = new Map<string, DuplicatePathwayMatch>();
    for (const d of [...imageDuplicates, ...slugDuplicates]) {
      dedupMap.set(`${d.uid}:${d.reason}`, d);
    }
    const duplicates = Array.from(dedupMap.values());
    const duplicateWarning =
      duplicates.length > 0
        ? `Found ${duplicates.length} existing pathway(s) matching this ${duplicates[0].reason === "image_sha256" ? "flowchart image" : "canonical slug"} ("${duplicates[0].titleEn}"). Consider updating the existing pathway instead of creating a duplicate.`
        : null;

    return {
      status: 200,
      headers: noStoreHeaders(),
      body: {
        ok: true,
        draft: extracted.draft,
        validation: extracted.validation,
        model: extracted.model,
        confidenceNotes: extracted.confidenceNotes,
        image: uploaded,
        duplicateWarning,
        duplicates,
      },
    };
  } catch (err) {
    return mapPathwayErrorToResult(err);
  }
}
