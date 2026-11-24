import { NextRequest, NextResponse } from "next/server";
import { handleExtractPathway } from "@/lib/neuroguide/pathwayHandlers";
import { runWithPathwayRepo } from "@/lib/neuroguide/pathwayService";
import { isAdminRequest } from "@/lib/neurorx/sync/routeHelpers";
import type { PathwayDomain, PathwaySourceType } from "@/types/clinicalPathways";
import type { SubspecialtyType } from "@/types/neuroguide";

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
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { ok: false, code: "INVALID_IMAGE", error: "Missing flowchart image file." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const imageBuffer = Buffer.from(await file.arrayBuffer());
  const fileName =
    file instanceof File && file.name ? file.name : "flowchart.png";
  const mimeType = file.type || "image/png";

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
      { repo, isAdmin },
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
