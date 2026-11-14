import { NextRequest, NextResponse } from "next/server";
import { handleDeleteDrug, handleUpdateDrug } from "@/lib/neurorx/sync/handlers";
import { SupabaseDrugRepo } from "@/lib/neurorx/sync/repoSupabase";
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

  const result = await handleUpdateDrug(
    {
      repo: new SupabaseDrugRepo(),
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

  const result = await handleDeleteDrug(
    {
      repo: new SupabaseDrugRepo(),
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
