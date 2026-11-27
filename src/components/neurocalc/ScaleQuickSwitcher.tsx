"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Search, Star, X } from "lucide-react";
import type { ScaleWithEffectiveStatus } from "@/types/neurocalc";

interface ScaleQuickSwitcherProps {
  isOpen: boolean;
  scales: ScaleWithEffectiveStatus[];
  favoriteIds: string[];
  recentIds: string[];
  onSelectScale: (slug: string) => void;
  onClose: () => void;
}

export function ScaleQuickSwitcher({
  isOpen,
  scales,
  favoriteIds,
  recentIds,
  onSelectScale,
  onClose,
}: ScaleQuickSwitcherProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const recentOrder = useMemo(() => {
    const map = new Map<string, number>();
    recentIds.forEach((id, idx) => map.set(id, idx));
    return map;
  }, [recentIds]);

  const results = useMemo(() => {
    const rawQ = query.trim().toLowerCase();
    const tokens = rawQ.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      // Prioritize recent, then favorites, then alphabetical
      const sorted = [...scales].sort((a, b) => {
        const aRec = recentOrder.get(a.scale.id);
        const bRec = recentOrder.get(b.scale.id);
        if (aRec !== undefined && bRec !== undefined) return aRec - bRec;
        if (aRec !== undefined) return -1;
        if (bRec !== undefined) return 1;

        const aFav = favoriteSet.has(a.scale.id) ? 0 : 1;
        const bFav = favoriteSet.has(b.scale.id) ? 0 : 1;
        if (aFav !== bFav) return aFav - bFav;

        return a.scale.metadata.short_name.localeCompare(
          b.scale.metadata.short_name
        );
      });
      return sorted.slice(0, 12);
    }

    return scales
      .filter((entry) => {
        const m = entry.scale.metadata;
        const haystack =
          `${m.short_name} ${m.name} ${m.summary} ${m.aliases.join(" ")} ${m.subspecialties.join(" ")}`.toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      })
      .slice(0, 15);
  }, [scales, query, favoriteSet, recentOrder]);

  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(0);
    }
  }, [results.length, activeIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) =>
          results.length > 0 ? (prev + 1) % results.length : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) =>
          results.length > 0 ? (prev - 1 + results.length) % results.length : 0
        );
      } else if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        onSelectScale(results[activeIndex].scale.id);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, activeIndex, onSelectScale, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Quick switch clinical scale"
    >
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--border-hairline)]">
          <Search
            className="w-4 h-4 text-[#0E7490] dark:text-cyan-400 shrink-0"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Jump to scale (e.g., NIHSS, GCS, ABC/2, ICH, mRS, PREVENT)..."
            aria-label="Quick jump search"
            className="flex-1 bg-transparent text-sm font-medium text-[var(--text-ink)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)]"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex rounded border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-1.5 py-0.5 font-mono-tech text-[10px] text-[var(--text-muted)]">
            ESC
          </kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto divide-y divide-[var(--border-hairline)]/60">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">
              No scales matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((entry, idx) => {
              const { scale } = entry;
              const isFav = favoriteSet.has(scale.id);
              const isRec = recentOrder.has(scale.id);
              const isActive = idx === activeIndex;

              return (
                <button
                  key={scale.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onSelectScale(scale.id);
                    onClose();
                  }}
                  className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors ${
                    isActive
                      ? "bg-[#0E7490]/10 dark:bg-cyan-500/15"
                      : "hover:bg-[var(--bg-subtle)]/60"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#0E7490]/12 dark:bg-cyan-500/20 px-1.5 py-0.5 font-mono-tech text-[10.5px] font-bold text-[#0E7490] dark:text-cyan-300 shrink-0">
                        {scale.metadata.short_name}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-[var(--text-ink)] truncate">
                        {scale.metadata.name}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)] truncate">
                      {scale.metadata.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isRec && (
                      <Clock
                        className="w-3.5 h-3.5 text-[var(--text-muted)]"
                        aria-label="Recently used"
                      />
                    )}
                    {isFav && (
                      <Star
                        className="w-3.5 h-3.5 text-amber-500 fill-amber-500"
                        aria-label="Favorite"
                      />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
