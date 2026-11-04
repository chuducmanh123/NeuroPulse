"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import { useNeuroViewer } from "./NeuroViewerContext";
import { matchesQuery } from "../../lib/vietnamese-search";
import type { OntologyEntry, NeuroOntology, ActiveOverlay } from "../../types/neurovision";

interface CentroidData {
  [atlas: string]: {
    [label_id: string]: {
      mean_mm: [number, number, number];
      in_mask_mm: [number, number, number];
      in_mask_vox: [number, number, number];
    };
  };
}

export default function SearchBar() {
  const { getNiivue } = useNeuroViewer();

  // Zustand Store
  const activeOverlay = useNeuroVisionStore((s) => s.activeOverlay);
  const highlightedLabelId = useNeuroVisionStore((s) => s.highlightedLabelId);
  const setActiveOverlay = useNeuroVisionStore((s) => s.setActiveOverlay);
  const setCrosshair = useNeuroVisionStore((s) => s.setCrosshair);
  const setSelectedRegion = useNeuroVisionStore((s) => s.setSelectedRegion);
  const setHighlightedLabelId = useNeuroVisionStore((s) => s.setHighlightedLabelId);
  const setIsProgrammaticChange = useNeuroVisionStore((s) => s.setIsProgrammaticChange);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [allEntries, setAllEntries] = useState<OntologyEntry[]>([]);
  const [centroids, setCentroids] = useState<CentroidData | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load Ontology & Centroids once
  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetch("/neurovision/data/neuro_ontology.json").then((r) => r.json() as Promise<NeuroOntology>),
      fetch("/neurovision/data/centroids.json").then((r) => r.json() as Promise<CentroidData>),
    ])
      .then(([ontoData, centData]) => {
        if (!mounted) return;
        setAllEntries(ontoData.entries || []);
        setCentroids(centData);
      })
      .catch((err) => {
        console.warn("[SearchBar] Failed to load search indices:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter entries based on diacritic-insensitive query
  const filtered = query.trim()
    ? allEntries
        .filter((entry) => {
          const searchCorpus = `${entry.name_vi} ${entry.name_en} ${entry.code} ${entry.category} ${entry.aspects_zone || ""} ${entry.brodmann_area?.join(" ") || ""}`;
          return matchesQuery(searchCorpus, query);
        })
        .slice(0, 10)
    : [];

  const handleSelect = (entry: OntologyEntry) => {
    const nv = getNiivue();
    setIsOpen(false);
    setQuery("");

    // 1. Switch atlas overlay if needed
    if (activeOverlay !== entry.atlas) {
      setActiveOverlay(entry.atlas as ActiveOverlay);
    }

    // 2. Lookup in-mask centroid
    const atlasCentroids = centroids?.[entry.atlas];
    const cent = atlasCentroids?.[String(entry.label_id)];

    if (cent && nv) {
      setIsProgrammaticChange(true);
      try {
        const targetMM = cent.in_mask_mm;
        const targetVox = cent.in_mask_vox;

        const frac = nv.mm2frac(targetMM, 0);
        nv.scene.crosshairPos = frac;
        nv.drawScene();

        setCrosshair({ mm: targetMM, vox: targetVox });
      } catch (err) {
        console.warn("[SearchBar] Jump to centroid failed:", err);
      } finally {
        setTimeout(() => setIsProgrammaticChange(false), 50);
      }
    }

    // 3. Highlight label & set selected region
    setHighlightedLabelId(entry.label_id);
    setSelectedRegion(entry);
  };

  const handleClearHighlight = () => {
    setHighlightedLabelId(null);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Tìm vùng giải phẫu (Vd: nhân bèo, MCA, C, M1, BA 4)..."
          className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-16 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-medium"
        />

        {/* Search icon */}
        <svg
          className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Clear Highlight Badge / Button */}
        {highlightedLabelId !== null && (
          <button
            type="button"
            onClick={handleClearHighlight}
            className="absolute right-2 text-[10px] bg-rose-950/90 hover:bg-rose-900 border border-rose-700 text-rose-300 px-1.5 py-0.5 rounded font-medium flex items-center gap-1 transition"
            title="Bỏ cô lập nhãn (hiện lại toàn bộ atlas)"
          >
            <span>Bỏ tô</span>
            <span className="font-bold">✕</span>
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden z-50 max-h-72 overflow-y-auto backdrop-blur-md">
          {filtered.map((entry) => (
            <button
              key={`${entry.atlas}:${entry.label_id}`}
              type="button"
              onClick={() => handleSelect(entry)}
              className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 border-b border-slate-800/60 last:border-b-0 flex items-start justify-between gap-2 transition"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-100 truncate">
                    {entry.name_vi}
                  </span>
                  {entry.aspects_zone && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono font-bold">
                      {entry.aspects_zone}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 italic truncate">
                  {entry.name_en}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  {entry.atlas}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
