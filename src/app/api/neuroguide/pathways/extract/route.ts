import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { handleExtractPathway } from "@/lib/neuroguide/pathwayHandlers";
import {
  computeImageSha256,
  runWithPathwayRepo,
} from "@/lib/neuroguide/pathwayService";
import {
  resolveSafeChildPath,
  validateSafeExternalUrl,
} from "@/lib/neuroguide/safePath";
import { isAdminRequest } from "@/lib/neurorx/sync/routeHelpers";
import type { PathwayDomain, PathwaySourceType } from "@/types/clinicalPathways";
import type { SubspecialtyType } from "@/types/neuroguide";

const ALLOWED_REEXTRACT_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_REEXTRACT_IMAGE_BYTES = 10 * 1024 * 1024;

function inferMimeFromFilename(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const isAdmin = isAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", error: "Admin authentication is required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, code: "INVALID_FORM_DATA", error: "Request must be multipart/form-data." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const file = formData.get("file");
  const existingImageUrlRaw = String(formData.get("existingImageUrl") ?? "").trim();

  let imageBuffer: Buffer;
  let fileName = "flowchart.png";
  let mimeType = "image/png";
  let preservedImageUrl: string | undefined;

  if (file && file instanceof Blob && file.size > 0) {
    imageBuffer = Buffer.from(await file.arrayBuffer());
    fileName = file instanceof File && file.name ? file.name : "flowchart.png";
    mimeType = file.type || "image/png";
  } else if (existingImageUrlRaw) {
    if (existingImageUrlRaw.startsWith("/uploads/pathways/")) {
      const relativeName = existingImageUrlRaw.slice("/uploads/pathways/".length);
      const inferredMime = inferMimeFromFilename(relativeName);
      if (!inferredMime) {
        return NextResponse.json(
          { ok: false, code: "INVALID_IMAGE", error: "Unsupported local flowchart image format." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
      try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "pathways");
        const safePath = resolveSafeChildPath(uploadsDir, relativeName);
        imageBuffer = await fs.readFile(safePath);
        fileName = relativeName;
        mimeType = inferredMime;
        preservedImageUrl = existingImageUrlRaw;
      } catch {
        return NextResponse.json(
          { ok: false, code: "INVALID_IMAGE", error: "Existing local flowchart image could not be read." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
    } else {
      let safeUrl: URL;
      try {
        safeUrl = validateSafeExternalUrl(existingImageUrlRaw, { httpsOnly: true });
      } catch {
        return NextResponse.json(
          { ok: false, code: "INVALID_IMAGE", error: "Invalid or unsafe existing flowchart image URL." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

      try {
        const res = await fetch(safeUrl, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) {
          return NextResponse.json(
            { ok: false, code: "INVALID_IMAGE", error: `Failed to fetch existing flowchart image (${res.status}).` },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }
        const contentTypeHeader = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
        const inferredFromPath = inferMimeFromFilename(safeUrl.pathname);
        const resolvedMime = ALLOWED_REEXTRACT_MIME_TYPES.has(contentTypeHeader)
          ? contentTypeHeader
          : inferredFromPath;
        if (!resolvedMime || !ALLOWED_REEXTRACT_MIME_TYPES.has(resolvedMime)) {
          return NextResponse.json(
            { ok: false, code: "INVALID_IMAGE", error: "Existing flowchart URL must point to a PNG, JPEG, or WebP image." },
            { status: 400, headers: { "Cache-Control": "no-store" } }
          );
        }
        imageBuffer = Buffer.from(await res.arrayBuffer());
        fileName = path.basename(safeUrl.pathname) || "flowchart.png";
        mimeType = resolvedMime;
        preservedImageUrl = safeUrl.toString();
      } catch {
        return NextResponse.json(
          { ok: false, code: "INVALID_IMAGE", error: "Timed out or failed while fetching existing flowchart image." },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    if (imageBuffer.length === 0 || imageBuffer.length > MAX_REEXTRACT_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, code: "INVALID_IMAGE", error: "Existing flowchart image is empty or exceeds 10 MB." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
  } else {
    return NextResponse.json(
      { ok: false, code: "INVALID_IMAGE", error: "Missing flowchart image file." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const str = (key: string): string => {
    const val = formData.get(key);
    return typeof val === "string" ? val.trim() : "";
  };

  const sourceTypeRaw = str("sourceType");
  const sourceType: PathwaySourceType =
    sourceTypeRaw === "textbook" ? "textbook" : "guideline";

  const domainRaw = str("domain");
  const domain: PathwayDomain =
    domainRaw === "diagnosis" || domainRaw === "treatment" || domainRaw === "combined"
      ? domainRaw
      : "combined";

  const yearNum = Number(str("year"));

  const result = await runWithPathwayRepo(false, (repo) =>
    handleExtractPathway(
      {
        repo,
        isAdmin,
        ...(preservedImageUrl
          ? {
              uploadImageFn: async (buf, name, mime) => ({
                url: preservedImageUrl,
                sha256: computeImageSha256(buf),
                mimeType: mime,
                fileName: name,
              }),
            }
          : {}),
      },
      {
        imageBuffer,
        fileName,
        mimeType,
        metadata: {
          sourceType,
          title: str("title") || undefined,
          sourceTitle: str("sourceTitle"),
          organizationOrAuthor: str("organizationOrAuthor") || "Unknown",
          year: Number.isFinite(yearNum) ? yearNum : 0,
          figureRef: str("figureRef") || undefined,
          url: str("url") || undefined,
          linkedGuidelineId: str("linkedGuidelineId") || undefined,
          subspecialty: (str("subspecialty") || "Stroke") as SubspecialtyType,
          conditionId: str("conditionId") || undefined,
          domain,
          additionalInstructions: str("additionalInstructions") || undefined,
        },
      }
    )
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
