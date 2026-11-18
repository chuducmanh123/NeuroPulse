import { NextRequest, NextResponse } from "next/server";
import { handlePurgeNeuroGuide } from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAdmin = isAdminRequest(req);

  const result = await handlePurgeNeuroGuide({
    repo: new SupabaseNeuroGuideRepo(),
    isAdmin,
    onInvalidateTag: invalidateSyncTag,
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
