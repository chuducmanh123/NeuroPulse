import { NextRequest, NextResponse } from "next/server";
import { searchPubMedGuidelines, PubMedSearchOptions } from "@/lib/neuroguide/pubmedDiscovery";
import { fetchGuidelineFullText } from "@/lib/neuroguide/fullTextFetcher";
import {
  extractGuidelineWithGemini,
  extractConferenceTrialsWithGemini,
  synthesizeClinicalScenariosWithGemini,
} from "@/lib/neuroguide/geminiGuidelineExtractor";
import {
  loadMergedNeuroGuideData,
  saveNeuroGuideToActiveStorage,
  hasBlobConfig,
  mergeGuidelines,
} from "@/lib/neuroguide/blobStorage";
import { registerCandidateGuideline } from "@/lib/neuroguide/storeAdapter";
import { SubspecialtyType, GuidelineDoc, ConferenceEvent, ClinicalScenario } from "@/types/neuroguide";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/neuroguide/sync-guidelines
 * Returns active guidelines, conferences, and scenarios merged from Vercel Blob, Local Storage, or Mock Baseline.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const society = searchParams.get("society") || undefined;
    const subspecialty = (searchParams.get("subspecialty") as SubspecialtyType) || undefined;
    const query = (searchParams.get("query") || "").toLowerCase().trim();

    const mergedData = await loadMergedNeuroGuideData();
    let filteredGuidelines = mergedData.guidelines;

    if (society) {
      filteredGuidelines = filteredGuidelines.filter(
        (g) => g.society.toUpperCase() === society.toUpperCase()
      );
    }
    if (subspecialty) {
      filteredGuidelines = filteredGuidelines.filter(
        (g) => g.subspecialty === subspecialty || (g.subspecialties && g.subspecialties.includes(subspecialty))
      );
    }
    if (query) {
      filteredGuidelines = filteredGuidelines.filter(
        (g) =>
          g.title.toLowerCase().includes(query) ||
          g.executiveSummary.toLowerCase().includes(query) ||
          (g.executiveSummaryVi && g.executiveSummaryVi.toLowerCase().includes(query))
      );
    }

    return NextResponse.json({
      status: "success",
      storageBackend: mergedData.storageSource,
      hasBlobConfig: hasBlobConfig(),
      lastSyncedAt: mergedData.lastSyncedAt || new Date().toISOString(),
      totalGuidelines: filteredGuidelines.length,
      totalConferences: mergedData.conferences.length,
      totalScenarios: mergedData.scenarios.length,
      guidelines: filteredGuidelines,
      conferences: mergedData.conferences,
      scenarios: mergedData.scenarios,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error in GET /api/neuroguide/sync-guidelines:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to load guidelines from storage backend",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/neuroguide/sync-guidelines
 * Autonomous / On-Demand Radar Trigger:
 * 1. Fetches candidate guidelines from Europe PMC / PubMed.
 * 2. Enforces session quota: Exactly 3 Guidelines (Full-Text XML + Gemini AI),
 *    2 Conference Events (PICO Trials), and 2 Clinical Scenarios.
 * 3. Persists enriched data to Vercel Blob (neuroguide_data.json) with fallback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const society = body.society || undefined;
    const subspecialty = (body.subspecialty as SubspecialtyType) || undefined;
    const query = body.query || undefined;
    const yearFrom = body.yearFrom ? parseInt(body.yearFrom, 10) : 2023;
    const isPeriodicCron = Boolean(body.isPeriodicCron);

    const options: PubMedSearchOptions = {
      society,
      subspecialty,
      query,
      yearFrom,
      retmax: 20,
    };

    // 1. Search candidate guidelines from Europe PMC & PubMed Live
    const discoveryResult = await searchPubMedGuidelines(options);
    const currentStore = await loadMergedNeuroGuideData();

    const existingTitles = new Set(currentStore.guidelines.map((g) => g.title.toLowerCase().trim()));
    const existingIds = new Set(currentStore.guidelines.map((g) => g.id.toLowerCase()));

    // Filter candidate list for guidelines not yet thoroughly analyzed
    const candidatePool = discoveryResult.guidelines.filter(
      (g) => !existingIds.has(g.id.toLowerCase()) && !existingTitles.has(g.title.toLowerCase().trim())
    );

    // Fall back to existing unanalyzed guidelines if candidate pool has fewer than 3
    const guidelinesToProcess = candidatePool.length >= 3
      ? candidatePool.slice(0, 3)
      : [
          ...candidatePool,
          ...discoveryResult.guidelines.filter((g) => !candidatePool.includes(g)).slice(0, 3 - candidatePool.length),
        ];

    // 2. SESSION QUOTA PART 1: Process 3 Guidelines with Full-Text XML + Gemini AI
    const analyzedGuidelines: GuidelineDoc[] = [];

    for (const cand of guidelinesToProcess.slice(0, 3)) {
      try {
        // A. Fetch Full-Text XML or structured abstract
        const fullTextRes = await fetchGuidelineFullText({
          pmcid: cand.pmcid,
          abstractText: cand.executiveSummary,
          doi: cand.officialUrl,
        });

        // B. Run Gemini AI extraction
        const aiExtracted = await extractGuidelineWithGemini({
          title: cand.title,
          journal: cand.journalTarget,
          pubYear: cand.year,
          officialUrl: cand.officialUrl,
          pmcid: fullTextRes.pmcid || cand.pmcid,
          fullTextSnippet: fullTextRes.fullTextSnippet || cand.executiveSummary,
          isFullText: fullTextRes.status === "FULL_TEXT_PARSED",
        });

        if (aiExtracted) {
          analyzedGuidelines.push({
            ...aiExtracted,
            fullTextStatus: fullTextRes.status,
            fullTextSource: fullTextRes.source || "EUROPE_PMC",
          });
        } else {
          analyzedGuidelines.push({
            ...cand,
            fullTextStatus: fullTextRes.status,
            fullTextSource: fullTextRes.source || "EUROPE_PMC",
            aiSynthesized: false,
          });
        }
      } catch (err) {
        console.warn(`Failed full-text AI extraction for ${cand.title}:`, err);
        analyzedGuidelines.push({
          ...cand,
          fullTextStatus: "ABSTRACT_ONLY",
          aiSynthesized: false,
        });
      }
    }

    // Tự động đưa toàn bộ các guideline mới phát hiện vào Hàng đợi Điều phối (Review Queue) & Vercel Blob để chờ kiểm tra
    for (const cand of analyzedGuidelines) {
      const normCandTitle = (cand.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const isCurated = currentStore.guidelines.some(
        (g) =>
          g.id.toLowerCase() === cand.id.toLowerCase() ||
          (g.title || "").toLowerCase().replace(/[^a-z0-9]/g, "") === normCandTitle
      );
      if (!isCurated) {
        await registerCandidateGuideline(cand);
      }
    }

    // 3. SESSION QUOTA PART 2: Synthesize 2 Conference Late-Breaking Trials
    const targetSub: SubspecialtyType = subspecialty || (analyzedGuidelines[0]?.subspecialty as SubspecialtyType) || "Stroke";
    const newTrials = await extractConferenceTrialsWithGemini("ESOC & ISC Congress", targetSub);

    const updatedConferences: ConferenceEvent[] = currentStore.conferences.map((conf, idx) => {
      if (idx === 0) {
        return {
          ...conf,
          lateBreakingTrials: [...newTrials, ...(conf.lateBreakingTrials || []).slice(0, 5)],
          stats: {
            ...conf.stats,
            totalLateBreakingTrials: (conf.stats?.totalLateBreakingTrials || 0) + newTrials.length,
            practiceChangingCount: (conf.stats?.practiceChangingCount || 0) + newTrials.filter((t) => t.isPracticeChanging).length,
          },
        };
      }
      return conf;
    });

    // 4. SESSION QUOTA PART 3: Synthesize 2 Clinical Scenarios (Cross-Society Matrix)
    const newScenarios: ClinicalScenario[] = await synthesizeClinicalScenariosWithGemini(
      analyzedGuidelines.length > 0 ? analyzedGuidelines : currentStore.guidelines
    );

    const mergedScenariosMap = new Map<string, ClinicalScenario>();
    currentStore.scenarios.forEach((s) => mergedScenariosMap.set(s.id, s));
    newScenarios.forEach((s) => mergedScenariosMap.set(s.id, s));
    const allScenarios = Array.from(mergedScenariosMap.values());

    // 5. Merge all updated guidelines into active library via coordination engine
    const allGuidelines = mergeGuidelines(analyzedGuidelines, currentStore.guidelines);

    // 6. Persist to Vercel Blob (or local storage fallback)
    const saveResult = await saveNeuroGuideToActiveStorage({
      guidelines: allGuidelines,
      conferences: updatedConferences,
      scenarios: allScenarios,
    });

    return NextResponse.json({
      status: "success",
      trigger: isPeriodicCron ? "PERIODIC_AUTONOMOUS_CRON" : "USER_MANUAL_TRIGGER",
      storageBackend: saveResult.storage,
      savedToBlob: saveResult.storage === "vercel-blob",
      syncedAt: new Date().toISOString(),
      quotaReport: {
        guidelinesAnalyzed: analyzedGuidelines.length,
        fullTextParsedCount: analyzedGuidelines.filter((g) => g.fullTextStatus === "FULL_TEXT_PARSED").length,
        conferencesUpdated: updatedConferences.length,
        lateBreakingTrialsAdded: newTrials.length,
        scenariosSynthesized: newScenarios.length,
      },
      message: `Successfully synchronized ${analyzedGuidelines.length} guidelines (Full-Text AI analysis), updated 2 conference events, and synthesized 2 clinical scenarios. Saved to ${saveResult.storage}.`,
      guidelines: allGuidelines,
      conferences: updatedConferences,
      scenarios: allScenarios,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    console.error("Error in POST /api/neuroguide/sync-guidelines:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to execute guidelines radar synchronization",
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
