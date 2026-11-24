import { NextRequest, NextResponse } from "next/server";
import { handleGetChanges } from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import { isAdminRequest } from "@/lib/neurorx/sync/routeHelpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const result = await handleGetChanges(
    { repo: new SupabaseNeuroGuideRepo(), isAdmin: isAdminRequest(req) },
    {
      sinceParam: searchParams.get("since"),
      limitParam: searchParams.get("limit"),
      tierParam: searchParams.get("tier"),
      includeLinksParam: searchParams.get("includeLinks"),
      ifNoneMatch: req.headers.get("if-none-match"),
    }
  );

  const headers = {
    ...result.headers,
    "Cache-Control": "no-store",
  };

  if (result.status === 304) {
    return new NextResponse(null, { status: 304, headers });
  }

  return NextResponse.json(result.body, { status: result.status, headers });
}
