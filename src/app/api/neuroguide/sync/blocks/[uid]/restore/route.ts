import { NextRequest, NextResponse } from "next/server";
import { handleRestoreBlockRevision } from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
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

  const result = await handleRestoreBlockRevision(
    {
      repo: new SupabaseNeuroGuideRepo(),
      isAdmin,
      onInvalidateTag: invalidateSyncTag,
    },
    uid,
    body as { revisionRev?: unknown; expectedRev?: unknown } | null
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
