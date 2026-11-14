import { NextRequest, NextResponse } from "next/server";
import { handleGetChanges } from "@/lib/neurorx/sync/handlers";
import { SupabaseDrugRepo } from "@/lib/neurorx/sync/repoSupabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const result = await handleGetChanges(
    { repo: new SupabaseDrugRepo() },
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
