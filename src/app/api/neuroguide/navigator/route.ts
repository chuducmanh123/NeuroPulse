import { NextRequest, NextResponse } from "next/server";
import {
  isNeuroGuideSyncV2Enabled,
  loadMergedNeuroGuideData,
  saveNeuroGuideToActiveStorage,
} from "@/lib/neuroguide/guidelineStorage";
import { hasSupabaseConfig } from "@/lib/supabase";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import {
  syncCustomRecLabelToV2Repo,
  syncDeletePivotalTrialInV2Repo,
  syncPivotalTrialToV2Repo,
} from "@/lib/neuroguide/sync/serverAdapter";
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
        deletedTrialIds: merged.deletedTrialIds || [],
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

      const normTrialKey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const updatedTrials = [...currentStore.pivotalTrials];
      const existingIdx = updatedTrials.findIndex(
        (t) =>
          t.id.toLowerCase() === trial.id.toLowerCase() ||
          normTrialKey(t.id) === normTrialKey(trial.id) ||
          (normTrialKey(t.acronym) !== "" &&
            normTrialKey(t.acronym) === normTrialKey(trial.acronym))
      );

      if (existingIdx >= 0) {
        const prev = updatedTrials[existingIdx];
        updatedTrials[existingIdx] = {
          ...trial,
          v3Tags: trial.v3Tags ?? prev.v3Tags,
        };
      } else {
        updatedTrials.unshift(trial);
      }
      const resurrectKeys = new Set([
        trial.id.toLowerCase().trim(),
        normTrialKey(trial.id),
        trial.acronym.toLowerCase().trim(),
        normTrialKey(trial.acronym),
      ]);
      const updatedDeletedTrialIds = (currentStore.deletedTrialIds || []).filter(
        (id) => !resurrectKeys.has((id || "").toLowerCase().trim()) && !resurrectKeys.has(normTrialKey(id))
      );

      const saveRes = await saveNeuroGuideToActiveStorage({
        guidelines: currentStore.guidelines,
        conferences: currentStore.conferences,
        scenarios: currentStore.scenarios,
        recommendationAtoms: currentStore.recommendationAtoms,
        pivotalTrials: updatedTrials,
        customRecLabels: currentStore.customRecLabels,
        deletedGuidelineIds: currentStore.deletedGuidelineIds,
        deletedTrialIds: updatedDeletedTrialIds,
        skipV2Mirror: true,
      });

      if (saveRes.success && isNeuroGuideSyncV2Enabled() && hasSupabaseConfig()) {
        try {
          await syncPivotalTrialToV2Repo(new SupabaseNeuroGuideRepo(), trial, "admin");
        } catch (v2Err) {
          console.warn("NeuroGuide Sync v2 pivotal trial upsert warning:", v2Err);
        }
      }

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

      const targetTrial = currentStore.pivotalTrials.find(
        (t) => t.id.toLowerCase() === trialId
      );
      const updatedTrials = currentStore.pivotalTrials.filter(
        (t) => t.id.toLowerCase() !== trialId
      );
      const normTrialKey = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      const newTombstones = [trialId];
      if (targetTrial?.acronym) {
        newTombstones.push(normTrialKey(targetTrial.acronym));
      }
      if (body.acronym) {
        newTombstones.push(normTrialKey(String(body.acronym)));
      }
      const updatedDeletedTrialIds = Array.from(
        new Set([...(currentStore.deletedTrialIds || []), ...newTombstones.filter(Boolean)])
      );

      const saveRes = await saveNeuroGuideToActiveStorage({
        guidelines: currentStore.guidelines,
        conferences: currentStore.conferences,
        scenarios: currentStore.scenarios,
        recommendationAtoms: currentStore.recommendationAtoms,
        pivotalTrials: updatedTrials,
        customRecLabels: currentStore.customRecLabels,
        deletedGuidelineIds: currentStore.deletedGuidelineIds,
        deletedTrialIds: updatedDeletedTrialIds,
        skipV2Mirror: true,
      });

      if (saveRes.success && isNeuroGuideSyncV2Enabled() && hasSupabaseConfig()) {
        try {
          await syncDeletePivotalTrialInV2Repo(new SupabaseNeuroGuideRepo(), trialId, "admin");
        } catch (v2Err) {
          console.warn("NeuroGuide Sync v2 pivotal trial delete warning:", v2Err);
        }
      }

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
        deletedTrialIds: currentStore.deletedTrialIds,
        skipV2Mirror: true,
      });

      if (saveRes.success && isNeuroGuideSyncV2Enabled() && hasSupabaseConfig()) {
        try {
          await syncCustomRecLabelToV2Repo(
            new SupabaseNeuroGuideRepo(),
            input.rec_id,
            labeled.record,
            "admin"
          );
        } catch (v2Err) {
          console.warn("NeuroGuide Sync v2 custom label upsert warning:", v2Err);
        }
      }

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
