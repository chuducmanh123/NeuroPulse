import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { verifyAdminToken } from "@/utils/security";
import { getAllSources, getAllInteractions, getDataVersionHash } from "@/lib/neurorx/data";
import { listAllLiveRows } from "@/lib/neurorx/sync/handlers";
import { evaluateEffectiveDrug } from "@/lib/neurorx/sync/jsonPatch";
import { SupabaseDrugRepo } from "@/lib/neurorx/sync/repoSupabase";
import type { UpdateQueueItem } from "@/types/neurorx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const UPDATES_QUEUE_FILE = path.join(DATA_DIR, "updates_queue.json");

function loadUpdatesQueue(): UpdateQueueItem[] {
  if (!fs.existsSync(UPDATES_QUEUE_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(UPDATES_QUEUE_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const adminToken =
      req.headers.get("x-admin-token") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!verifyAdminToken(adminToken)) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator session required." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const repo = new SupabaseDrugRepo();
    const [liveRows, syncState] = await Promise.all([
      listAllLiveRows(repo),
      repo.getSyncState(),
    ]);

    const allDrugs = liveRows
      .map((row) => evaluateEffectiveDrug(row.data))
      .sort((a, b) => (a.drug.generic_name || "").localeCompare(b.drug.generic_name || ""));

    const versionHash = syncState.rootHash
      ? syncState.rootHash.slice(0, 8)
      : getDataVersionHash();

    const sources = getAllSources();
    const interactions = getAllInteractions();
    const updatesQueue = loadUpdatesQueue();
    const { searchParams } = new URL(req.url);

    // Full data bundle export
    if (searchParams.get("export") === "true") {
      const bundle = {
        exported_at: new Date().toISOString(),
        version_hash: versionHash,
        max_seq: syncState.maxSeq,
        sources_count: sources.length,
        drugs_count: allDrugs.length,
        interactions_count: interactions.length,
        sources,
        drugs: allDrugs.map((d) => d.drug),
        interactions,
        updates_queue: updatesQueue,
      };

      return new NextResponse(JSON.stringify(bundle, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="neurorx-data-bundle-${versionHash}.json"`,
        },
      });
    }

    let verifiedCount = 0;
    let draftCount = 0;
    let hashMismatchCount = 0;
    const drafts: { id: string; name: string; classes: string[]; status: string }[] = [];

    for (const d of allDrugs) {
      if (d.effectiveStatus === "verified") {
        verifiedCount++;
      } else {
        draftCount++;
        drafts.push({
          id: d.drug.id,
          name: d.drug.tall_man?.value || d.drug.generic_name,
          classes: d.drug.classes || [],
          status: d.drug.status,
        });
      }

      if (d.drug.status === "verified" && !d.hashMatches) {
        hashMismatchCount++;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          version_hash: versionHash,
          health: {
            total_drugs: allDrugs.length,
            verified_count: verifiedCount,
            draft_count: draftCount,
            hash_mismatch_count: hashMismatchCount,
            sources_count: sources.length,
            interactions_count: interactions.length,
          },
          updates_queue: updatesQueue,
          drafts,
          all_drugs: allDrugs.map((d) => d.drug),
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load NeuroRx admin data" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
