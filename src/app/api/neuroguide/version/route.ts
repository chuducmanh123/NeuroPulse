import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  isNeuroGuideSyncV2Enabled,
  loadMergedNeuroGuideData,
} from "@/lib/neuroguide/guidelineStorage";
import { SupabaseNeuroGuideRepo } from "@/lib/neuroguide/sync/repoSupabase";
import { getOrLoadMerkleCached } from "@/lib/sync/merkleCache";
import { hasSupabaseAdminConfig, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface LightweightProtocolMeta {
  slug: string;
  protocol_type: string;
  status: string;
  deleted_at: string | null;
  updated_at: string | null;
}

/**
 * GET /api/neuroguide/version
 * Ultra-lightweight endpoint (~150 bytes) for SWR freshness verification.
 * When Sync v2 is enabled, reads only `neuroguide_sync_state` (~200 B) and
 * `neuroguide_protocols` metadata (~5 KB, cached by `(maxSeq, rootHash)`)
 * instead of loading 5+ MB of content blocks.
 */
export async function GET() {
  try {
    if (isNeuroGuideSyncV2Enabled() && hasSupabaseAdminConfig()) {
      try {
        const repo = new SupabaseNeuroGuideRepo();
        const state = await repo.getSyncState();
        const meta = await getOrLoadMerkleCached({
          namespace: "neuroguide-version-v2",
          stateKey: `${state.maxSeq}:${state.rootHash}`,
          tags: ["neuroguide:graph"],
          ttlSeconds: 3600,
          loader: async () => {
            const { data, error } = await supabaseAdmin
              .from("neuroguide_protocols")
              .select("slug, protocol_type, status, deleted_at, updated_at");
            if (error) {
              throw new Error(error.message);
            }
            const rows = Array.isArray(data) ? (data as LightweightProtocolMeta[]) : [];
            const activeSlugs = new Set<string>();
            const deletedSlugs = new Set<string>();
            let totalGuidelines = 0;
            let totalConferences = 0;
            let maxUpdatedAt = "";

            for (const r of rows) {
              const slug = String(r.slug || "").toLowerCase().trim();
              const pType = String(r.protocol_type || "").toLowerCase().trim();
              const status = String(r.status || "").toLowerCase().trim();
              if (r.updated_at && String(r.updated_at) > maxUpdatedAt) {
                maxUpdatedAt = String(r.updated_at);
              }

              if (r.deleted_at !== null) {
                if (pType === "guideline" && slug) {
                  deletedSlugs.add(slug);
                }
                continue;
              }

              if (pType === "conference") {
                totalConferences += 1;
              } else if (
                pType === "guideline" &&
                status !== "draft" &&
                status !== "pending" &&
                status !== "pending_review"
              ) {
                totalGuidelines += 1;
                if (slug) activeSlugs.add(slug);
              }
            }

            const deletedGuidelineIds = Array.from(deletedSlugs).filter(
              (s) => !activeSlugs.has(s)
            );

            return {
              version: maxUpdatedAt || `v2-seq-${state.maxSeq}`,
              totalGuidelines,
              totalConferences,
              deletedGuidelineIds,
            };
          },
        });

        return NextResponse.json(
          {
            status: "success",
            ...meta,
            maxSeq: state.maxSeq,
            rootHash: state.rootHash,
          },
          {
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
              Pragma: "no-cache",
            },
          }
        );
      } catch {
        // Fall back to legacy merged loader if Sync v2 metadata query fails
      }
    }

    const CLOUD_JSON = path.join(process.cwd(), "public", "data", "neuroguide_cloud.json");
    let localDeletedIds: string[] = [];
    let cloudLastSynced = "";
    let cloudCount = 0;

    if (fs.existsSync(CLOUD_JSON)) {
      try {
        const raw = fs.readFileSync(CLOUD_JSON, "utf-8");
        const cloudData = JSON.parse(raw);
        localDeletedIds = cloudData.deletedGuidelineIds || cloudData.deleted_guideline_ids || [];
        cloudLastSynced = cloudData.lastSyncedAt || "";
        cloudCount = Array.isArray(cloudData.guidelines) ? cloudData.guidelines.length : 0;
      } catch {}
    }

    const mergedData = await loadMergedNeuroGuideData();
    const version = mergedData.lastSyncedAt || cloudLastSynced || new Date().toISOString();
    const rawDeletedGuidelineIds = Array.from(
      new Set([
        ...(mergedData.deletedGuidelineIds || []).map((x) => x.toLowerCase().trim()),
        ...localDeletedIds.map((x) => x.toLowerCase().trim()),
      ])
    );

    // Tuyệt đối không gửi ID/tiêu đề của guideline đang active/approved vào deletedGuidelineIds
    const activeDocKeys = new Set<string>();
    mergedData.guidelines.forEach((g) => {
      if (g.id) activeDocKeys.add(g.id.toLowerCase().trim());
      if (g.title) activeDocKeys.add(g.title.toLowerCase().replace(/[^a-z0-9]/g, ""));
    });
    const deletedGuidelineIds = rawDeletedGuidelineIds.filter((d) => !activeDocKeys.has(d.toLowerCase().trim()));

    const count = mergedData.guidelines.length || cloudCount;

    return NextResponse.json(
      {
        status: "success",
        version,
        totalGuidelines: count,
        totalConferences: mergedData.conferences?.length || 0,
        deletedGuidelineIds,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ status: "error", error: message }, { status: 500 });
  }
}
