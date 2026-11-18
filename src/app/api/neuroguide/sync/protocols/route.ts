import { NextRequest, NextResponse } from "next/server";
import {
  handleListProtocols,
  handleUpsertProtocol,
} from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleListProtocols({
    repo: new SupabaseNeuroGuideRepo(),
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const isAdmin = isAdminRequest(req);
  const body = isAdmin ? await parseJsonObjectBody(req) : null;

  const result = await handleUpsertProtocol(
    {
      repo: new SupabaseNeuroGuideRepo(),
      isAdmin,
      onInvalidateTag: invalidateSyncTag,
    },
    body
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
