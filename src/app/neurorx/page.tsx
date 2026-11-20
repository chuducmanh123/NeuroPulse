import React, { Suspense, ViewTransition } from "react";
import { NeuroRxShell } from "@/components/neurorx/NeuroRxShell";
import {
  getAllSources,
  getAllInteractions,
  getDataVersionHash,
} from "@/lib/neurorx/data";

export default async function NeuroRxPage() {
  const sources = getAllSources();
  const interactions = getAllInteractions();
  const dataVersionHash = getDataVersionHash();

  return (
    <ViewTransition name="app-neurorx" share="app-morph" default="none">
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-slate-400">
            Loading NeuroRx...
          </div>
        }
      >
        <NeuroRxShell
          totalSourcesCount={sources.length}
          sources={sources}
          interactions={interactions}
          dataVersionHash={dataVersionHash}
        />
      </Suspense>
    </ViewTransition>
  );
}
