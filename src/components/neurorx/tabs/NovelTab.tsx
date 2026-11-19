"use client";

import React, { useState } from "react";
import type { DrugWithEffectiveStatus } from "@/lib/neurorx/sync/types";
import type { Source } from "@/types/neurorx";
import { NovelCard } from "./NovelCard";
import {
  SubspecialtySelect,
  matchesSubspecialty,
  type SubspecialtyFilter,
} from "./SubspecialtySelect";

interface NovelTabProps {
  drugs: DrugWithEffectiveStatus[];
  sources?: Source[];
  darkMode?: boolean;
}

export function NovelTab({
  drugs,
  sources = [],
  darkMode = false,
}: NovelTabProps) {
  // Drugs with a novel block
  const novelDrugs = drugs.filter((d) => Boolean(d.drug.novel));

  const [activeSubspecialty, setActiveSubspecialty] = useState<SubspecialtyFilter>("all");

  const displayedDrugs = novelDrugs.filter((d) =>
    matchesSubspecialty(d, activeSubspecialty)
  );

  return (
    <div className="space-y-6">
      {novelDrugs.length > 0 && (
        <div className="space-y-6">
          {/* Subspecialty Filter Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text-muted)]">
              Novel Therapies ({displayedDrugs.length})
            </span>

            <SubspecialtySelect
              value={activeSubspecialty}
              onChange={setActiveSubspecialty}
              drugs={novelDrugs}
              darkMode={darkMode}
              hideEmpty
              className="w-full sm:w-auto"
            />
          </div>

          {/* Cards List */}
          <div className="space-y-5">
            {displayedDrugs.map((drugItem) => (
              <NovelCard
                key={drugItem.drug.id}
                drugItem={drugItem}
                sources={sources}
                darkMode={darkMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
