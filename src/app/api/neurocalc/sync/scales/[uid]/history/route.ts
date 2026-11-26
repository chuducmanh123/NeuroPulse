import { NextRequest, NextResponse } from "next/server";
import { handleGetHistory } from "@/lib/neurocalc/sync/handlers";
import { SupabaseScaleRepo } from "@/lib/neurocalc/sync/repoSupabase";
import { isAdminRequest } from "@/lib/neurocalc/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;
  const isAdmin = isAdminRequest(req);

  const result = await handleGetHistory(
    {
      repo: new SupabaseScaleRepo(),
      isAdmin,
    },
    uid
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
