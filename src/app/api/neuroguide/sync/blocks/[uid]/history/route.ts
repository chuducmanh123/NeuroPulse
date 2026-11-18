import { NextRequest, NextResponse } from "next/server";
import { handleGetBlockHistory } from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import { isAdminRequest } from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const isAdmin = isAdminRequest(req);

  const result = await handleGetBlockHistory(
    { repo: new SupabaseNeuroGuideRepo(), isAdmin },
    uid
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
