import { NextRequest, NextResponse } from "next/server";
import { handleRestorePathway } from "@/lib/neuroguide/pathwayHandlers";
import { runWithPathwayRepo } from "@/lib/neuroguide/pathwayService";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
): Promise<NextResponse> {
  const isAdmin = isAdminRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", error: "Admin authentication is required." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { uid } = await context.params;
  const body = await parseJsonObjectBody(req);

  const result = await runWithPathwayRepo(true, (repo) =>
    handleRestorePathway(
      {
        repo,
        isAdmin,
        onInvalidateTag: invalidateSyncTag,
      },
      uid,
      body
    )
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
