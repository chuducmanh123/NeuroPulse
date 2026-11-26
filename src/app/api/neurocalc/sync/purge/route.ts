import { NextRequest, NextResponse } from "next/server";
import { handlePurge } from "@/lib/neurocalc/sync/handlers";
import { SupabaseScaleRepo } from "@/lib/neurocalc/sync/repoSupabase";
import {
  invalidateSyncTag,
  isCronOrAdminRequest,
} from "@/lib/neurocalc/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAdmin = isCronOrAdminRequest(req);

  const result = await handlePurge({
    repo: new SupabaseScaleRepo(),
    isAdmin,
    onInvalidateTag: invalidateSyncTag,
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
