import { NextRequest, NextResponse } from "next/server";
import {
  handleCreatePathway,
  handleListPathways,
} from "@/lib/neuroguide/pathwayHandlers";
import { runWithPathwayRepo } from "@/lib/neuroguide/pathwayService";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const isAdmin = isAdminRequest(req);
  const sp = req.nextUrl.searchParams;

  const result = await runWithPathwayRepo(false, (repo) =>
    handleListPathways(
      { repo, isAdmin },
      {
        includeDrafts: sp.get("includeDrafts") === "1" || sp.get("includeDrafts") === "true",
        includeArchived: sp.get("includeArchived") === "1" || sp.get("includeArchived") === "true",
        includeDeleted: sp.get("includeDeleted") === "1" || sp.get("includeDeleted") === "true",
        subspecialty: sp.get("subspecialty"),
        domain: sp.get("domain"),
        sourceType: sp.get("sourceType"),
      }
    )
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const isAdmin = isAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", error: "Admin authentication is required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const body = await parseJsonObjectBody(req);
  const result = await runWithPathwayRepo(true, (repo) =>
    handleCreatePathway(
      {
        repo,
        isAdmin,
        onInvalidateTag: invalidateSyncTag,
      },
      body
    )
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
