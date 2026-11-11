import React, { Suspense } from "react";
import { NeuroRxShell } from "@/components/neurorx/NeuroRxShell";
import { getAllDrugs, getAllSources, getAllInteractions, getDataVersionHash } from "@/lib/neurorx/data";

export default function NeuroRxPage() {
  const initialDrugs = getAllDrugs();
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
      />
    </Suspense>
  );
}
