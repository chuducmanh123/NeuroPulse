import React, { Suspense } from "react";
import { connection } from "next/server";
import { NeuroRxShell } from "@/components/neurorx/NeuroRxShell";
import {
  getAllDrugsAsync,
  getAllSources,
  getAllInteractions,
  getDataVersionHash,
  type DrugWithEffectiveStatus,
} from "@/lib/neurorx/data";

export default async function NeuroRxPage() {
  const isSyncV2 = process.env.NEXT_PUBLIC_NEURORX_SYNC_V2 === "1";

  let initialDrugs: DrugWithEffectiveStatus[] = [];
  if (!isSyncV2) {
    await connection();
    initialDrugs = await getAllDrugsAsync();
  }

  const sources = getAllSources();
  const interactions = getAllInteractions();
  const dataVersionHash = getDataVersionHash();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-400">
          Loading NeuroRx...
        </div>
      }
    >
      <NeuroRxShell
        initialDrugs={initialDrugs}
        totalSourcesCount={sources.length}
        sources={sources}
        interactions={interactions}
        dataVersionHash={dataVersionHash}
        syncV2Enabled={isSyncV2}
      />
    </Suspense>
  );
}
