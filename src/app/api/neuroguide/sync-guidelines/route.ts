import { NextRequest, NextResponse } from "next/server";
import { searchPubMedGuidelines, PubMedSearchOptions } from "@/lib/neuroguide/pubmedDiscovery";
import { MOCK_GUIDELINE_DOCS } from "@/data/neuroguideMockData";
import { SubspecialtyType, GuidelineDoc } from "@/types/neuroguide";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const society = searchParams.get("society") || undefined;
    const subspecialty = (searchParams.get("subspecialty") as SubspecialtyType) || undefined;
    const query = searchParams.get("query") || undefined;
    const yearFrom = searchParams.get("yearFrom") ? parseInt(searchParams.get("yearFrom")!, 10) : 2023;
    const retmax = searchParams.get("retmax") ? parseInt(searchParams.get("retmax")!, 10) : 15;

    const options: PubMedSearchOptions = {
      society,
      subspecialty,
      query,
      yearFrom,
      retmax,
    };

    const result = await searchPubMedGuidelines(options);

    // Identify which guidelines are new vs already present in the active library
    const existingTitles = new Set(MOCK_GUIDELINE_DOCS.map((g: GuidelineDoc) => g.title.toLowerCase().trim()));
    const existingIds = new Set(MOCK_GUIDELINE_DOCS.map((g: GuidelineDoc) => g.id.toLowerCase()));

    const enrichedGuidelines = result.guidelines.map((g: GuidelineDoc) => {
      const isAlreadyIndexed =
        existingIds.has(g.id.toLowerCase()) ||
        existingTitles.has(g.title.toLowerCase().trim()) ||
        MOCK_GUIDELINE_DOCS.some((doc: GuidelineDoc) => doc.officialUrl && g.officialUrl && doc.officialUrl.toLowerCase() === g.officialUrl.toLowerCase());

      return {
        ...g,
        isNewlyDiscovered: !isAlreadyIndexed,
      };
    });

    const newItems = enrichedGuidelines.filter((g) => g.isNewlyDiscovered);

    return NextResponse.json({
      status: "success",
      source: result.source,
      syncedAt: result.syncedAt,
      queryUsed: result.queryUsed,
      totalDiscovered: enrichedGuidelines.length,
      newDiscoveredCount: newItems.length,
      guidelines: enrichedGuidelines,
      message: `Successfully synchronized guidelines. Discovered ${enrichedGuidelines.length} records (${newItems.length} new).`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error in /api/neuroguide/sync-guidelines:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to sync guidelines from online registry",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const society = body.society || undefined;
    const subspecialty = (body.subspecialty as SubspecialtyType) || undefined;
    const query = body.query || undefined;
    const yearFrom = body.yearFrom ? parseInt(body.yearFrom, 10) : 2023;
    const retmax = body.retmax ? parseInt(body.retmax, 10) : 20;
    const isPeriodicCron = Boolean(body.isPeriodicCron);

    const options: PubMedSearchOptions = {
      society,
      subspecialty,
      query,
      yearFrom,
      retmax,
    };

    const result = await searchPubMedGuidelines(options);

    const existingTitles = new Set(MOCK_GUIDELINE_DOCS.map((g: GuidelineDoc) => g.title.toLowerCase().trim()));
    const existingIds = new Set(MOCK_GUIDELINE_DOCS.map((g: GuidelineDoc) => g.id.toLowerCase()));

    const enrichedGuidelines = result.guidelines.map((g: GuidelineDoc) => {
      const isAlreadyIndexed =
        existingIds.has(g.id.toLowerCase()) ||
        existingTitles.has(g.title.toLowerCase().trim()) ||
        MOCK_GUIDELINE_DOCS.some((doc: GuidelineDoc) => doc.officialUrl && g.officialUrl && doc.officialUrl.toLowerCase() === g.officialUrl.toLowerCase());

      return {
        ...g,
        isNewlyDiscovered: !isAlreadyIndexed,
      };
    });

    const newItems = enrichedGuidelines.filter((g) => g.isNewlyDiscovered);

    return NextResponse.json({
      status: "success",
      trigger: isPeriodicCron ? "PERIODIC_AUTONOMOUS_CRON" : "USER_MANUAL_TRIGGER",
      source: result.source,
      syncedAt: result.syncedAt,
      queryUsed: result.queryUsed,
      totalDiscovered: enrichedGuidelines.length,
      newDiscoveredCount: newItems.length,
      guidelines: enrichedGuidelines,
      message: isPeriodicCron
        ? `Periodic autonomous radar scan completed. Found ${newItems.length} novel guidelines.`
        : `Manual on-demand sync completed. Discovered ${enrichedGuidelines.length} guidelines.`,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error in POST /api/neuroguide/sync-guidelines:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to execute guidelines synchronization trigger",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
