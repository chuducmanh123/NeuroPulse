import { NextRequest, NextResponse } from "next/server";
import {
  handleCreateScale,
  handleListScales,
} from "@/lib/neurocalc/sync/handlers";
import { SupabaseScaleRepo } from "@/lib/neurocalc/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurocalc/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleListScales({
    repo: new SupabaseScaleRepo(),
  });
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const isAdmin = isAdminRequest(req);
  const body = isAdmin ? await parseJsonObjectBody(req) : null;

  const result = await handleCreateScale(
    {
      repo: new SupabaseScaleRepo(),
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
