import React, { Suspense, ViewTransition } from "react";
import { DrawLoader } from "@/components/ecosystem/DrawLoader";
import { NeuroCalcShell } from "@/components/neurocalc/NeuroCalcShell";

export default function NeuroCalcPage() {
  return (
    <ViewTransition name="app-neurocalc" share="app-morph" default="none">
      <Suspense
        fallback={
          <div className="min-h-screen bg-[var(--bg-paper)] flex items-center justify-center">
            <DrawLoader
              variant="calc"
              label="Loading NeuroCalc..."
              accentClassName="text-cyan-700 dark:text-cyan-400"
            />
          </div>
        }
      >
        <NeuroCalcShell />
      </Suspense>
    </ViewTransition>
  );
}
