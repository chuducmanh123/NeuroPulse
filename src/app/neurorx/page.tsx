import React, { Suspense, ViewTransition } from "react";
import { DrawLoader } from "@/components/ecosystem/DrawLoader";
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
          <div className="min-h-screen bg-[var(--bg-paper)] flex items-center justify-center">
            <DrawLoader
              variant="rx"
              label="Loading NeuroRx..."
              accentClassName="text-teal-700 dark:text-teal-400"
            />
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
