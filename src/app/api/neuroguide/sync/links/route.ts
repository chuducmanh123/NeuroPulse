import { NextRequest, NextResponse } from "next/server";
import {
  handleGetBlockLinks,
  handleReplaceBlockLinks,
} from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const result = await handleGetBlockLinks(
    { repo: new SupabaseNeuroGuideRepo() },
    { srcBlockUid: req.nextUrl.searchParams.get("srcBlockUid") }
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const isAdmin = isAdminRequest(req);
  const body = isAdmin ? await parseJsonObjectBody(req) : null;

  const result = await handleReplaceBlockLinks(
    {
      repo: new SupabaseNeuroGuideRepo(),
      isAdmin,
      onInvalidateTag: invalidateSyncTag,
    },
    body as { links?: unknown; clearExisting?: boolean } | null
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
