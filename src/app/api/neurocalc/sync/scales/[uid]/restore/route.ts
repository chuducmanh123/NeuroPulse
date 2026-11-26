import { NextRequest, NextResponse } from "next/server";
import { handleRestoreScale } from "@/lib/neurocalc/sync/handlers";
import { SupabaseScaleRepo } from "@/lib/neurocalc/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurocalc/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const isAdmin = isAdminRequest(req);
  const body = isAdmin ? await parseJsonObjectBody(req) : null;

  const result = await handleRestoreScale(
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
