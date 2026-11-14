import { NextRequest, NextResponse } from "next/server";
import { handlePurge } from "@/lib/neurorx/sync/handlers";
import { SupabaseDrugRepo } from "@/lib/neurorx/sync/repoSupabase";
import { invalidateSyncTag, isAdminRequest } from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAdmin = isAdminRequest(req);

  const result = await handlePurge({
    repo: new SupabaseDrugRepo(),
    isAdmin,
    onInvalidateTag: invalidateSyncTag,
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
