import { NextRequest, NextResponse } from "next/server";
import {
  handleDeleteScale,
  handleGetScale,
  handleUpdateScale,
} from "@/lib/neurocalc/sync/handlers";
import { SupabaseScaleRepo } from "@/lib/neurocalc/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurocalc/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const result = await handleGetScale(
    { repo: new SupabaseScaleRepo() },
    uid
  );
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const isAdmin = isAdminRequest(req);
  const body = isAdmin ? await parseJsonObjectBody(req) : null;

  const result = await handleUpdateScale(
    {
      repo: new SupabaseScaleRepo(),
      isAdmin,
      onInvalidateTag: invalidateSyncTag,
    },
    uid,
    body
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const isAdmin = isAdminRequest(req);

  const result = await handleDeleteScale(
    {
      repo: new SupabaseScaleRepo(),
      isAdmin,
      onInvalidateTag: invalidateSyncTag,
    },
    uid,
    { expectedRevParam: req.nextUrl.searchParams.get("expectedRev") }
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
