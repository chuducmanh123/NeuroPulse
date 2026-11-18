import { NextRequest, NextResponse } from "next/server";
import {
  handleCreateBlock,
  handleQueryBlocksByFacets,
} from "@/lib/neuroguide/sync/handlers";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import type {
  NeuroGuideBlockType,
  NeuroGuideOverlappingFacetFilter,
} from "@/lib/neuroguide/sync/types";
import {
  invalidateSyncTag,
  isAdminRequest,
  parseJsonObjectBody,
} from "@/lib/neurorx/sync/routeHelpers";
import type { SubspecialtyType } from "@/types/neuroguide";

export const dynamic = "force-dynamic";

function parseFacetList(params: URLSearchParams, key: string): string[] | undefined {
  const values = params
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const filter: NeuroGuideOverlappingFacetFilter = {
    subspecialties: parseFacetList(sp, "subspecialties") as SubspecialtyType[] | undefined,
    conditionIds: parseFacetList(sp, "conditionIds"),
    domains: parseFacetList(sp, "domains") as
      | ("diagnosis" | "treatment" | "prevention")[]
      | undefined,
    timeWindowIds: parseFacetList(sp, "timeWindowIds"),
    interventionTags: parseFacetList(sp, "interventionTags"),
    citedTrialKeys: parseFacetList(sp, "citedTrialKeys"),
    linkedScenarioKeys: parseFacetList(sp, "linkedScenarioKeys"),
    directions: parseFacetList(sp, "directions") as
      | ("recommended" | "conditional" | "harm" | "unspecified")[]
      | undefined,
    blockTypes: parseFacetList(sp, "blockTypes") as NeuroGuideBlockType[] | undefined,
  };

  const result = await handleQueryBlocksByFacets(
    { repo: new SupabaseNeuroGuideRepo() },
    filter
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const isAdmin = isAdminRequest(req);
  const body = isAdmin ? await parseJsonObjectBody(req) : null;

  const result = await handleCreateBlock(
    {
      repo: new SupabaseNeuroGuideRepo(),
      isAdmin,
      onInvalidateTag: invalidateSyncTag,
    },
    body as { data?: unknown; uid?: string; allowVerified?: boolean } | null
  );

  return NextResponse.json(result.body, {
    status: result.status,
    headers: { ...result.headers, "Cache-Control": "no-store" },
  });
}
