import { NextRequest, NextResponse } from "next/server";
import { handleDeleteProtocol } from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const isAdmin = isAdminRequest(req);

  const result = await handleDeleteProtocol(
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
