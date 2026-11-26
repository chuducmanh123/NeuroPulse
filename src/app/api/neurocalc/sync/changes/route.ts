import { NextRequest, NextResponse } from "next/server";
import { handleGetChanges } from "@/lib/neurocalc/sync/handlers";
import { SupabaseScaleRepo } from "@/lib/neurocalc/sync/repoSupabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const result = await handleGetChanges(
    { repo: new SupabaseScaleRepo() },
    {
      sinceParam: searchParams.get("since"),
      limitParam: searchParams.get("limit"),
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
