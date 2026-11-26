import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase";
import { matchesIfNoneMatch } from "@/lib/neurorx/sync/handlers";
import { SupabaseDrugRepo } from "@/lib/neurorx/sync/repoSupabase";
import { getOrLoadMerkleCached } from "@/lib/sync/merkleCache";
import {
  projectDrugToSearchIndexItem,
  type NeuroRxSearchIndexItem,
} from "@/lib/neurorx/searchIndex";
import type { DrugRecord } from "@/types/neurorx";

export const dynamic = "force-dynamic";

function loadLocalNeuroRxSearchIndex(): NeuroRxSearchIndexItem[] {
  const drugsDir = path.join(process.cwd(), "data", "neurorx", "drugs");
  if (!fs.existsSync(drugsDir)) return [];
  const items: NeuroRxSearchIndexItem[] = [];
  for (const file of fs.readdirSync(drugsDir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(drugsDir, file), "utf-8")) as DrugRecord;
      const projected = projectDrugToSearchIndexItem(parsed);
      if (projected) items.push(projected);
    } catch {
      // skip malformed file
    }
  }
  return items.sort((a, b) => a.genericName.localeCompare(b.genericName));
}

/**
 * GET /api/neurorx/search-index
 * Lightweight projected drug index (~15-30 KB vs 2.31 MB full catalog)
 * cached by live `(maxSeq, rootHash)` with ETag/304 support.
 */
export async function GET(req: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    const drugs = loadLocalNeuroRxSearchIndex();
    return NextResponse.json(
      { ok: true, maxSeq: 0, rootHash: "local", drugs },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

  try {
    const repo = new SupabaseDrugRepo();
    const state = await repo.getSyncState();
    const etag = `"nrx-idx-${state.maxSeq}-${state.rootHash}"`;

    if (matchesIfNoneMatch(req.headers.get("if-none-match"), etag)) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      });
    }

    const drugs = await getOrLoadMerkleCached<NeuroRxSearchIndexItem[]>({
      namespace: "nrx-search-index",
      stateKey: `${state.maxSeq}:${state.rootHash}`,
      tags: ["neurorx:drugs"],
      ttlSeconds: 3600,
      loader: async () => {
        const items: NeuroRxSearchIndexItem[] = [];
        let since = 0;
        while (true) {
          const batch = await repo.changesSince(since, 500);
          for (const row of batch.rows) {
            if (row.deletedAt !== null) continue;
            const projected = projectDrugToSearchIndexItem(row.data);
            if (projected) items.push(projected);
          }
          const lastRow = batch.rows[batch.rows.length - 1];
          if (batch.rows.length < 500 || !lastRow || lastRow.changeSeq >= batch.maxSeq) {
            break;
          }
          since = lastRow.changeSeq;
        }
        items.sort((a, b) => a.genericName.localeCompare(b.genericName));
        return items;
      },
    });

    return NextResponse.json(
      {
        ok: true,
        maxSeq: state.maxSeq,
        rootHash: state.rootHash,
        drugs,
      },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    const drugs = loadLocalNeuroRxSearchIndex();
    return NextResponse.json(
      { ok: true, maxSeq: 0, rootHash: "fallback", drugs },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
