import { NextRequest, NextResponse } from "next/server";
import { handleGetChanges, type HandlerResult } from "@/lib/neurorx/sync/handlers";
import { SupabaseDrugRepo } from "@/lib/neurorx/sync/repoSupabase";
import { getOrLoadMerkleCached } from "@/lib/sync/merkleCache";

export const dynamic = "force-dynamic";

const NON_200_SENTINEL = "NRX_BOOTSTRAP_NON_200";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sinceParam = searchParams.get("since");
  const limitParam = searchParams.get("limit");
  const ifNoneMatch = req.headers.get("if-none-match");

  const isBootstrap =
    (sinceParam === "0" || sinceParam === null || sinceParam === "") && !ifNoneMatch;

  const repo = new SupabaseDrugRepo();
  const runUncached = () =>
    handleGetChanges(
      { repo },
      {
        sinceParam,
        limitParam,
        ifNoneMatch,
      }
    );

  let result: HandlerResult;
  if (isBootstrap) {
    let fallbackErrorResult: HandlerResult | null = null;
    try {
      const state = await repo.getSyncState();
      result = await getOrLoadMerkleCached({
        namespace: "nrx-sync-bootstrap",
        stateKey: `${state.maxSeq}:${state.rootHash}:${limitParam ?? "500"}`,
        tags: ["neurorx:drugs"],
        ttlSeconds: 3600,
        loader: async () => {
          const res = await runUncached();
          if (res.status !== 200) {
            fallbackErrorResult = res;
            throw new Error(NON_200_SENTINEL);
          }
          return res;
        },
      });
    } catch {
      result = fallbackErrorResult ?? (await runUncached());
    }
  } else {
    result = await runUncached();
  }

  const headers = {
    ...result.headers,
    "Cache-Control": "no-store",
  };

  if (result.status === 304) {
    return new NextResponse(null, { status: 304, headers });
  }

  return NextResponse.json(result.body, { status: result.status, headers });
}
