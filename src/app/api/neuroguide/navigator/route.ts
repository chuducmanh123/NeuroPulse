import { NextRequest, NextResponse } from "next/server";
import {
  loadMergedNeuroGuideData,
  saveNeuroGuideToActiveStorage,
} from "@/lib/neuroguide/guidelineStorage";
import { STROKE_ONTOLOGY } from "@/lib/neuroguide/ontologyValidator";
import {
  labelRecommendationWithGemini,
  lookupTrialByPmidOrDoi,
} from "@/lib/neuroguide/geminiLabelerClient";
import { verifyAdminToken } from "@/utils/security";
import type {
  PivotalTrialRecord,
  RecommendationLabelInput,
} from "@/types/neuroguide";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/neuroguide/navigator
 * Returns merged pivotal trials (seed + custom + conference late-breaking),
 * custom recommendation labels, and active ontology metadata.
 */
export async function GET() {
  try {
    const merged = await loadMergedNeuroGuideData();
    return NextResponse.json(
      {
        ok: true,
        ontologyVersion: STROKE_ONTOLOGY.ontology_version,
        pivotalTrials: merged.pivotalTrials,
        customRecLabels: merged.customRecLabels,
        storageSource: merged.storageSource,
        lastSyncedAt: merged.lastSyncedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to load Clinical Navigator store.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/neuroguide/navigator
 * Actions:
 * - lookup_trial: 1-click Auto-Fill from PMID / DOI / Acronym (public/admin helper)
 * - upsert_trial: Save or update a PivotalTrialRecord (Admin required)
 * - delete_trial: Delete a PivotalTrialRecord by trialId (Admin required)
 * - label_recommendation: Run Gemini + Validator on a recommendation and persist label (Admin required)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").trim();

    // lookup_trial is read-only metadata resolution
    if (action === "lookup_trial") {
      const identifier = String(body.identifier || "").trim();
      const result = await lookupTrialByPmidOrDoi(identifier);
      return NextResponse.json(result);
    }

    // All mutating actions require Admin authorization
    const adminToken =
      request.headers.get("x-admin-token") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      body.adminToken;

    if (!verifyAdminToken(adminToken)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized. Administrator authentication is required to modify Clinical Navigator records.",
        },
        { status: 401 }
      );
    }

    const currentStore = await loadMergedNeuroGuideData();

    if (action === "upsert_trial") {
      const trial = body.trial as PivotalTrialRecord | undefined;
      if (!trial || !trial.id || !trial.acronym || !trial.title) {
        return NextResponse.json(
          { ok: false, error: "Invalid PivotalTrialRecord: id, acronym, and title are required." },
          { status: 400 }
        );
      }

      const updatedTrials = [...currentStore.pivotalTrials];
      const existingIdx = updatedTrials.findIndex(
        (t) =>
          t.id.toLowerCase() === trial.id.toLowerCase() ||
          (t.acronym.toLowerCase() === trial.acronym.toLowerCase() && t.year === trial.year)
      );

      if (existingIdx >= 0) {
        updatedTrials[existingIdx] = trial;
      } else {
        updatedTrials.unshift(trial);
      }

      const saveRes = await saveNeuroGuideToActiveStorage({
        guidelines: currentStore.guidelines,
        conferences: currentStore.conferences,
        scenarios: currentStore.scenarios,
        recommendationAtoms: currentStore.recommendationAtoms,
        pivotalTrials: updatedTrials,
        customRecLabels: currentStore.customRecLabels,
        deletedGuidelineIds: currentStore.deletedGuidelineIds,
      });

      return NextResponse.json({
        ok: saveRes.success,
        storage: saveRes.storage,
        pivotalTrials: updatedTrials,
        error: saveRes.error,
      });
    }

    if (action === "delete_trial") {
      const trialId = String(body.trialId || body.id || "").trim().toLowerCase();
      if (!trialId) {
        return NextResponse.json({ ok: false, error: "trialId is required." }, { status: 400 });
      }

      const updatedTrials = currentStore.pivotalTrials.filter(
        (t) => t.id.toLowerCase() !== trialId
      );

      const saveRes = await saveNeuroGuideToActiveStorage({
        guidelines: currentStore.guidelines,
        conferences: currentStore.conferences,
        scenarios: currentStore.scenarios,
        recommendationAtoms: currentStore.recommendationAtoms,
        pivotalTrials: updatedTrials,
        customRecLabels: currentStore.customRecLabels,
        deletedGuidelineIds: currentStore.deletedGuidelineIds,
      });

      return NextResponse.json({
        ok: saveRes.success,
        storage: saveRes.storage,
        pivotalTrials: updatedTrials,
        error: saveRes.error,
      });
    }

    if (action === "label_recommendation") {
      const input = body.input as RecommendationLabelInput | undefined;
      if (!input || !input.rec_id || !input.text) {
        return NextResponse.json(
          { ok: false, error: "RecommendationLabelInput with rec_id and text is required." },
          { status: 400 }
        );
      }

      const labeled = await labelRecommendationWithGemini(input);
      const updatedLabels = {
        ...currentStore.customRecLabels,
        [input.rec_id]: labeled.record,
      };

      const saveRes = await saveNeuroGuideToActiveStorage({
        guidelines: currentStore.guidelines,
        conferences: currentStore.conferences,
        scenarios: currentStore.scenarios,
        recommendationAtoms: currentStore.recommendationAtoms,
        pivotalTrials: currentStore.pivotalTrials,
        customRecLabels: updatedLabels,
        deletedGuidelineIds: currentStore.deletedGuidelineIds,
      });

      return NextResponse.json({
        ok: saveRes.success,
        provider: labeled.provider,
        record: labeled.record,
        customRecLabels: updatedLabels,
        storage: saveRes.storage,
      });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown action "${action}".` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Internal error in /api/neuroguide/navigator.",
      },
      { status: 500 }
    );
  }
}
