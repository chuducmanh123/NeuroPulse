"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpRight } from "lucide-react";

export const COMMAND_PALETTE_OPEN_EVENT = "neuro-open-command-palette";

interface PaletteItem {
  id: string;
  tag: string;
  color: string;
  title: string;
  subtitle?: string;
  href?: string;
  isComingSoon?: boolean;
}

interface LazyDrugSummary {
  id: string;
  genericName: string;
  classes: string[];
  brandNames: string[];
}

interface LazyGuidelineSummary {
  id: string;
  title: string;
  society: string;
  year: number;
  subspecialty: string;
}

interface LazyArticleSummary {
  id: string;
  title: string;
  journal: string;
  pub_date?: string;
}

const APP_ITEMS: PaletteItem[] = [
  {
    id: "app-hub",
    tag: "ECOSYSTEM",
    color: "#1C1917",
    title: "Neuro Ecosystem Hub",
    subtitle: "Trang chủ hệ sinh thái lâm sàng",
    href: "/",
  },
  {
    id: "app-neuropulse",
    tag: "NEUROPULSE",
    color: "#B91C1C",
    title: "NeuroPulse — Journal Monitor",
    subtitle: "LIVE • NEJM, Lancet Neurol, JAMA Neurol, Stroke",
    href: "/neuropulse",
  },
  {
    id: "app-neurocase",
    tag: "NEUROCASE",
    color: "#6D28D9",
    title: "NeuroCase — Clinical Cases",
    subtitle: "NEW • Daily Challenge, Archive & Exam Mode",
    href: "/neurocase",
  },
  {
    id: "app-neuroguide",
    tag: "NEUROGUIDE",
    color: "#C25934",
    title: "NeuroGuide — Guidelines & PICO",
    subtitle: "BETA • AHA/ASA 2026, ESO, AAN & Clinical Navigator",
    href: "/neuroguide",
  },
  {
    id: "app-neurorx",
    tag: "NEURORX",
    color: "#2F855A",
    title: "NeuroRx — Bedside Pharmacology",
    subtitle: "BETA • Drug Lookup, Interactions & Renal Dosing",
    href: "/neurorx",
  },
  {
    id: "app-neurovision",
    tag: "NEUROVISION",
    color: "#1D4ED8",
    title: "NeuroVision — Atlas & NiiVue Viewer",
    subtitle: "BETA • MNI152 1mm & ASPECTS Reference",
    href: "/neurovision",
  },
  {
    id: "app-neurocalc",
    tag: "NEUROCALC",
    color: "#0E7490",
    title: "NeuroCalc — Clinical Scales",
    subtitle: "BETA • NIHSS, mRS, GCS, ICH & Bedside Formulas",
    href: "/neurocalc",
  },
];

export function GlobalCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [drugs, setDrugs] = useState<LazyDrugSummary[]>([]);
  const [guidelines, setGuidelines] = useState<LazyGuidelineSummary[]>([]);
  const [articles, setArticles] = useState<LazyArticleSummary[]>([]);
  const loadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const handleOpenEvent = () => setOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, handleOpenEvent);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);

    if (!loadedRef.current) {
      loadedRef.current = true;

      // 1. Lazy-load NeuroGuide mock guidelines
      import("@/data/neuroguideMockData")
        .then((mod) => {
          const docs = Array.isArray(mod.MOCK_GUIDELINE_DOCS) ? mod.MOCK_GUIDELINE_DOCS : [];
          setGuidelines(
            docs.map((g) => ({
              id: g.id,
              title: g.title,
              society: g.society,
              year: g.year,
              subspecialty: g.subspecialty,
            }))
          );
        })
        .catch(() => {});

      // 2. Lazy-load NeuroPulse articles feed
      fetch("/data/articles.json")
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (Array.isArray(data)) {
            setArticles(
              data.slice(0, 120).map((a) => ({
                id: String(a.id || a.title),
                title: String(a.title || ""),
                journal: String(a.journal || ""),
                pub_date: a.pub_date ? String(a.pub_date) : undefined,
              }))
            );
          }
        })
        .catch(() => {});

      // 3. Lazy-load NeuroRx synced drugs: read local IndexedDB first (0 Egress),
      //    then fall back to lightweight projected /api/neurorx/search-index (~15-30 KB).
      (async () => {
        try {
          const { createLocalStore } = await import("@/lib/neurorx/sync/localStore");
          const store = createLocalStore();
          const snap = await store.load();
          store.close?.();
          if (snap.rows.size > 0) {
            const localParsed: LazyDrugSummary[] = [];
            for (const row of snap.rows.values()) {
              if (row.deletedAt !== null) continue;
              const d = row.data;
              if (!d || typeof d.id !== "string" || typeof d.generic_name !== "string") continue;
              const vnList = Array.isArray(d.vn_products?.value)
                ? d.vn_products.value
                    .map((p) => p?.brand || (p as { brand_name?: string })?.brand_name)
                    .filter((b): b is string => typeof b === "string" && b.length > 0)
                : [];
              localParsed.push({
                id: d.id,
                genericName: d.generic_name,
                classes: Array.isArray(d.classes) ? d.classes : [],
                brandNames: vnList,
              });
            }
            if (localParsed.length > 0) {
              setDrugs(localParsed);
              return;
            }
          }
        } catch {
          // IndexedDB unavailable or empty; fall back to lightweight search-index endpoint
        }

        try {
          const res = await fetch("/api/neurorx/search-index");
          if (!res.ok) return;
          const payload = await res.json();
          if (Array.isArray(payload?.drugs)) {
            setDrugs(payload.drugs as LazyDrugSummary[]);
          }
        } catch {
          // ignore
        }
      })();
    }

    return () => window.clearTimeout(timer);
  }, [open]);

  const results = useMemo<PaletteItem[]>(() => {
    const q = query.trim().toLowerCase();

    const matchedApps = APP_ITEMS.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.tag.toLowerCase().includes(q) ||
        (a.subtitle && a.subtitle.toLowerCase().includes(q))
    );

    const matchedDrugs: PaletteItem[] = drugs
      .filter((d) => {
        if (!q) return false;
        return (
          d.genericName.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.classes.some((c) => c.toLowerCase().includes(q)) ||
          d.brandNames.some((b) => b.toLowerCase().includes(q))
        );
      })
      .slice(0, 5)
      .map((d) => ({
        id: `rx-${d.id}`,
        tag: "NEURORX",
        color: "#2F855A",
        title: d.genericName,
        subtitle:
          d.brandNames.length > 0
            ? `${d.brandNames.slice(0, 2).join(", ")} • ${d.classes[0] || "NeuroRx"}`
            : d.classes.slice(0, 2).join(" • "),
        href: `/neurorx?tab=lookup&drug=${encodeURIComponent(d.id)}`,
      }));

    const matchedGuidelines: PaletteItem[] = guidelines
      .filter((g) => {
        if (!q) return true;
        return (
          g.title.toLowerCase().includes(q) ||
          g.society.toLowerCase().includes(q) ||
          g.subspecialty.toLowerCase().includes(q) ||
          String(g.year).includes(q)
        );
      })
      .slice(0, q ? 4 : 2)
      .map((g) => ({
        id: `ng-${g.id}`,
        tag: "NEUROGUIDE",
        color: "#C25934",
        title: g.title,
        subtitle: `${g.society} ${g.year} • ${g.subspecialty}`,
        href: "/neuroguide",
      }));

    const matchedArticles: PaletteItem[] = q
      ? articles
          .filter(
            (a) =>
              a.title.toLowerCase().includes(q) || a.journal.toLowerCase().includes(q)
          )
          .slice(0, 4)
          .map((a) => ({
            id: `np-${a.id}`,
            tag: "NEUROPULSE",
            color: "#B91C1C",
            title: a.title,
            subtitle: [a.journal, a.pub_date].filter(Boolean).join(" • "),
            href: "/neuropulse",
          }))
      : [];

    return [...matchedApps, ...matchedDrugs, ...matchedGuidelines, ...matchedArticles];
  }, [query, drugs, guidelines, articles]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelect = (item: PaletteItem) => {
    if (item.isComingSoon || !item.href) {
      setToastMsg("⏳ NeuroCalc (Clinical Scales) đang được thiết kế");
      window.setTimeout(() => setToastMsg(null), 2400);
      return;
    }
    setOpen(false);
    router.push(item.href, {
      transitionTypes: [item.href === "/" ? "nav-back" : "nav-switch"],
    });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : 0
      );
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    }
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-black/50 px-4 pt-16 sm:pt-20 backdrop-blur-xs"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Global Ecosystem Search"
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--border-hairline)] px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Tìm ứng dụng, guidelines (AHA/ASA 2026), thuốc (alteplase, keppra) hoặc bài báo..."
                className="w-full bg-transparent text-xs sm:text-sm text-[var(--text-ink)] placeholder-[var(--text-muted)] focus:outline-none"
              />
              <kbd className="font-mono-tech rounded border border-[var(--border-hairline)] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                ESC
              </kbd>
            </div>

            <div className="custom-scrollbar max-h-80 overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                  Không tìm thấy module, thuốc hoặc hướng dẫn phù hợp.
                </div>
              ) : (
                results.map((item, idx) => {
                  const active = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelect(item)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        active ? "bg-[var(--bg-subtle)]" : "hover:bg-[var(--bg-subtle)]/70"
                      } ${item.isComingSoon ? "opacity-65" : ""}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="font-mono-tech shrink-0 rounded px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-white"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.tag}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-[var(--text-ink)]">
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="truncate text-[11px] text-[var(--text-muted)]">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                    </button>
                  );
                })
              )}
            </div>

            <div className="font-mono-tech flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-subtle)]/60 px-4 py-2 text-[10px] text-[var(--text-muted)]">
              <span>↑↓ Di chuyển • ↵ Mở nhanh</span>
              <span>⌘K / Ctrl+K</span>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="font-mono-tech pointer-events-none fixed bottom-5 right-5 z-[95] rounded-full bg-[#1C1917] px-4 py-2 text-xs font-medium text-[#FAF8F5] shadow-lg border border-[#322E29]">
          {toastMsg}
        </div>
      )}
    </>
  );
}
