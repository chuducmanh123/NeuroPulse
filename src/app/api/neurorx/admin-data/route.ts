import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { verifyAdminToken } from "@/utils/security";
import { getAllDrugs, getAllSources, getAllInteractions, getDataVersionHash } from "@/lib/neurorx/data";
import type { UpdateQueueItem } from "@/types/neurorx";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_DIR = path.resolve(process.cwd(), "data/neurorx");
const UPDATES_QUEUE_FILE = path.join(DATA_DIR, "updates_queue.json");

export async function GET(req: NextRequest) {
  try {
    const adminToken =
      req.headers.get("x-admin-token") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    const isAuthenticated = verifyAdminToken(adminToken);
    if (!isAuthenticated) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Administrator session required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Full data bundle export
    if (searchParams.get("export") === "true") {
      const sources = getAllSources();
      const drugs = getAllDrugs();
      const interactions = getAllInteractions();

      let updatesQueue: UpdateQueueItem[] = [];
      if (fs.existsSync(UPDATES_QUEUE_FILE)) {
        try {
          updatesQueue = JSON.parse(fs.readFileSync(UPDATES_QUEUE_FILE, "utf-8"));
        } catch {}
      }

      const bundle = {
        exported_at: new Date().toISOString(),
        version_hash: getDataVersionHash(),
        sources_count: sources.length,
        drugs_count: drugs.length,
        interactions_count: interactions.length,
        sources,
        drugs: drugs.map((d) => d.drug),
        interactions,
        updates_queue: updatesQueue,
      };

      return new NextResponse(JSON.stringify(bundle, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="neurorx-data-bundle-${getDataVersionHash()}.json"`,
        },
      });
    }

    // Standard admin health summary
    const allDrugs = getAllDrugs();
    const allSources = getAllSources();
    const allInteractions = getAllInteractions();

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

    let updatesQueue: UpdateQueueItem[] = [];
    if (fs.existsSync(UPDATES_QUEUE_FILE)) {
      try {
        updatesQueue = JSON.parse(fs.readFileSync(UPDATES_QUEUE_FILE, "utf-8"));
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      data: {
        version_hash: getDataVersionHash(),
        health: {
          total_drugs: allDrugs.length,
          verified_count: verifiedCount,
          draft_count: draftCount,
          hash_mismatch_count: hashMismatchCount,
          sources_count: allSources.length,
          interactions_count: allInteractions.length,
        },
        updates_queue: updatesQueue,
        drafts,
        all_drugs: allDrugs.map((d) => d.drug),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load NeuroRx admin data" },
      { status: 500 }
    );
  }
}
