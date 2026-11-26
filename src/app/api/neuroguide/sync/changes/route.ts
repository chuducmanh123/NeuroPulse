import { NextRequest, NextResponse } from "next/server";
import { handleGetChanges, type HandlerResult } from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import { isAdminRequest } from "@/lib/neurorx/sync/routeHelpers";
import { getOrLoadMerkleCached } from "@/lib/sync/merkleCache";

export const dynamic = "force-dynamic";

const NON_200_SENTINEL = "NG_BOOTSTRAP_NON_200";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const isAdmin = isAdminRequest(req);
  const sinceParam = searchParams.get("since");
  const limitParam = searchParams.get("limit");
  const tierParam = searchParams.get("tier");
  const includeLinksParam = searchParams.get("includeLinks");
  const ifNoneMatch = req.headers.get("if-none-match");

  const tierNormalized = (tierParam ?? "blocks").trim().toLowerCase() || "blocks";
  const isPublicBootstrap =
    !isAdmin &&
    (sinceParam === "0" || sinceParam === null || sinceParam === "") &&
    !ifNoneMatch &&
    (tierNormalized === "blocks" || tierNormalized === "protocols" || tierNormalized === "graph");

  const repo = new SupabaseNeuroGuideRepo();
  const runUncached = () =>
    handleGetChanges(
      { repo, isAdmin },
      {
        sinceParam,
        limitParam,
        tierParam,
        includeLinksParam,
        ifNoneMatch,
      }
    );

  let result: HandlerResult;
  if (isPublicBootstrap) {
    let fallbackErrorResult: HandlerResult | null = null;
    try {
      const state = await repo.getSyncState();
      result = await getOrLoadMerkleCached({
        namespace: "ng-sync-bootstrap",
        stateKey: `${state.maxSeq}:${state.rootHash}:${tierNormalized}:${limitParam ?? "500"}:${includeLinksParam ?? ""}`,
        tags: ["neuroguide:graph"],
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
