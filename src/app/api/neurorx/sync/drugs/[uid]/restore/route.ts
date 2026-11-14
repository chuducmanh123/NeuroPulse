import { NextRequest, NextResponse } from "next/server";
import { handleRestoreRevision } from "@/lib/neurorx/sync/handlers";
import { SupabaseDrugRepo } from "@/lib/neurorx/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const isAdmin = isAdminRequest(req);
  const body = isAdmin ? await parseJsonObjectBody(req) : null;

  const result = await handleRestoreRevision(
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
