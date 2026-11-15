import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  loadMergedNeuroGuideData,
  saveNeuroGuideToActiveStorage,
} from "@/lib/neuroguide/guidelineStorage";
import { verifyAdminToken } from "@/utils/security";
import type { ConferenceEvent } from "@/types/neuroguide";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/neuroguide/conferences
 * Returns the active list of conferences from storage.
 */
export async function GET() {
  try {
    const merged = await loadMergedNeuroGuideData();
    return NextResponse.json(
      {
        ok: true,
        conferences: merged.conferences || [],
        storageSource: merged.storageSource,
        lastSyncedAt: merged.lastSyncedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load conferences.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function normalizeConference(raw: ConferenceEvent): ConferenceEvent {
  const trials = Array.isArray(raw.lateBreakingTrials) ? raw.lateBreakingTrials : [];
  const positiveCount = trials.filter((t) => t.verdict === "POSITIVE").length;
  const practiceChangingCount = trials.filter((t) => Boolean(t.isPracticeChanging)).length;

  return {
    ...raw,
    id: String(raw.id).trim(),
    acronym: String(raw.acronym).trim(),
    name: String(raw.name).trim(),
    year: Number(raw.year) || new Date().getFullYear(),
    startDate: String(raw.startDate || `${raw.year || new Date().getFullYear()}-01-01`).trim(),
    endDate: raw.endDate ? String(raw.endDate).trim() : undefined,
    subspecialties:
      Array.isArray(raw.subspecialties) && raw.subspecialties.length > 0
        ? raw.subspecialties
        : ["Stroke"],
    dates: String(raw.dates || "").trim(),
    location: String(raw.location || "").trim(),
    status: raw.status || "RECENT",
    officialUrl: String(raw.officialUrl || "").trim(),
    executiveSummary: String(raw.executiveSummary || "").trim(),
    lateBreakingTrials: trials,
    stats: {
      totalLateBreakingTrials: trials.length > 0 ? trials.length : Number(raw.stats?.totalLateBreakingTrials) || 0,
      positiveTrials: trials.length > 0 ? positiveCount : Number(raw.stats?.positiveTrials) || 0,
      practiceChangingCount:
        trials.length > 0 ? practiceChangingCount : Number(raw.stats?.practiceChangingCount) || 0,
    },
  };
}

function revalidateConferencePaths() {
  try {
    revalidatePath("/neuroguide");
    revalidatePath("/api/neuroguide/sync-guidelines");
    revalidatePath("/api/neuroguide/version");
    revalidatePath("/api/neuroguide/conferences");
  } catch {
    // ignore outside Next.js request context
  }
}

/**
 * POST /api/neuroguide/conferences
 * Admin-only mutations for Conferences tab:
 * - upsert_conference: create or update a ConferenceEvent (including its lateBreakingTrials)
 * - delete_conference: delete a ConferenceEvent by conferenceId / id
 * - clear_all_conferences: wipe all conferences
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const adminToken =
      request.headers.get("x-admin-token") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      body.adminToken;

    if (!verifyAdminToken(adminToken)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized. Valid administrator token required to modify conferences.",
        },
        { status: 401 }
      );
    }

    const action = String(body.action || "").trim();
    const currentStore = await loadMergedNeuroGuideData();

    if (action === "upsert_conference") {
      const rawConf = body.conference as ConferenceEvent | undefined;
      if (!rawConf || !rawConf.id || !rawConf.acronym || !rawConf.name) {
        return NextResponse.json(
          { ok: false, error: "Invalid conference payload: id, acronym, and name are required." },
          { status: 400 }
        );
      }

      const normalized = normalizeConference(rawConf);
      const targetId = normalized.id.toLowerCase();
      const updatedConferences = [...(currentStore.conferences || [])];
      const existingIdx = updatedConferences.findIndex((c) => c.id.toLowerCase() === targetId);

      if (existingIdx >= 0) {
        updatedConferences[existingIdx] = normalized;
      } else {
        updatedConferences.unshift(normalized);
      }

      updatedConferences.sort((a, b) =>
        (b.startDate || `${b.year}-01-01`).localeCompare(a.startDate || `${a.year}-01-01`)
      );

      const saveRes = await saveNeuroGuideToActiveStorage({
        guidelines: currentStore.guidelines,
        conferences: updatedConferences,
        scenarios: currentStore.scenarios,
        recommendationAtoms: currentStore.recommendationAtoms,
        pivotalTrials: currentStore.pivotalTrials,
        customRecLabels: currentStore.customRecLabels,
        deletedGuidelineIds: currentStore.deletedGuidelineIds,
        deletedTrialIds: currentStore.deletedTrialIds,
      });

      revalidateConferencePaths();

      return NextResponse.json({
        ok: saveRes.success,
        storage: saveRes.storage,
        conference: normalized,
        conferences: updatedConferences,
        error: saveRes.error,
      });
    }

    if (action === "delete_conference") {
      const targetId = String(body.conferenceId || body.id || "").trim().toLowerCase();
      if (!targetId) {
        return NextResponse.json(
          { ok: false, error: "conferenceId is required." },
          { status: 400 }
        );
      }

      const updatedConferences = (currentStore.conferences || []).filter(
        (c) => c.id.toLowerCase() !== targetId
      );

      const saveRes = await saveNeuroGuideToActiveStorage({
        guidelines: currentStore.guidelines,
        conferences: updatedConferences,
        scenarios: currentStore.scenarios,
        recommendationAtoms: currentStore.recommendationAtoms,
        pivotalTrials: currentStore.pivotalTrials,
        customRecLabels: currentStore.customRecLabels,
        deletedGuidelineIds: currentStore.deletedGuidelineIds,
        deletedTrialIds: currentStore.deletedTrialIds,
      });

      revalidateConferencePaths();

      return NextResponse.json({
        ok: saveRes.success,
        storage: saveRes.storage,
        conferences: updatedConferences,
        error: saveRes.error,
      });
    }

    if (action === "clear_all_conferences") {
      const saveRes = await saveNeuroGuideToActiveStorage({
        guidelines: currentStore.guidelines,
        conferences: [],
        scenarios: currentStore.scenarios,
        recommendationAtoms: currentStore.recommendationAtoms,
        pivotalTrials: currentStore.pivotalTrials,
        customRecLabels: currentStore.customRecLabels,
        deletedGuidelineIds: currentStore.deletedGuidelineIds,
        deletedTrialIds: currentStore.deletedTrialIds,
      });

      revalidateConferencePaths();

      return NextResponse.json({
        ok: saveRes.success,
        storage: saveRes.storage,
        conferences: [],
        error: saveRes.error,
      });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update conferences.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
