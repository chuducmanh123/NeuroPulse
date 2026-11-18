import { NextRequest, NextResponse } from "next/server";
import {
  handleDeleteBlock,
  handleUpdateBlock,
} from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const isAdmin = isAdminRequest(req);
  const body = isAdmin ? await parseJsonObjectBody(req) : null;

  const result = await handleUpdateBlock(
    {
      repo: new SupabaseNeuroGuideRepo(),
      isAdmin,
      onInvalidateTag: invalidateSyncTag,
    },
    uid,
    body as { data?: unknown; expectedRev?: unknown; allowVerified?: boolean } | null
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

  const result = await handleDeleteBlock(
    {
      repo: new SupabaseNeuroGuideRepo(),
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
