import { NextRequest, NextResponse } from "next/server";
import { handleCreateDrug } from "@/lib/neurorx/sync/handlers";
import { SupabaseDrugRepo } from "@/lib/neurorx/sync/repoSupabase";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const isAdmin = isAdminRequest(req);
  const body = isAdmin ? await parseJsonObjectBody(req) : null;

  const result = await handleCreateDrug(
    {
      repo: new SupabaseDrugRepo(),
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
