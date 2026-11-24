import { NextRequest, NextResponse } from "next/server";
import {
  handleDeletePathway,
  handleGetPathway,
  handlePatchPathway,
} from "@/lib/neuroguide/pathwayHandlers";
import { runWithPathwayRepo } from "@/lib/neuroguide/pathwayService";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
): Promise<NextResponse> {
  const { uid } = await context.params;
  const isAdmin = isAdminRequest(req);
  const sp = req.nextUrl.searchParams;

  const result = await runWithPathwayRepo(false, (repo) =>
    handleGetPathway({ repo, isAdmin }, uid, {
      includeDrafts: sp.get("includeDrafts") === "1" || sp.get("includeDrafts") === "true",
      includeDeleted: sp.get("includeDeleted") === "1" || sp.get("includeDeleted") === "true",
    })
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}

export async function PATCH(
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
    handlePatchPathway(
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

export async function DELETE(
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
  const sp = req.nextUrl.searchParams;
  const body = await parseJsonObjectBody(req);

  const result = await runWithPathwayRepo(true, (repo) =>
    handleDeletePathway(
      {
        repo,
        isAdmin,
        onInvalidateTag: invalidateSyncTag,
      },
      uid,
      {
        baseRev: sp.get("baseRev") ?? body?.baseRev,
        expectedRev: sp.get("expectedRev") ?? body?.expectedRev,
      }
    )
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: result.headers,
  });
}
