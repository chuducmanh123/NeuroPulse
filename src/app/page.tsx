"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  NeuroPulseIllustration,
  NeuroCaseIllustration,
  NeuroCalcIllustration,
  NeuroVisionIllustration,
  NeuroGuideIllustration,
  NeuroRxIllustration,
} from "@/components/ecosystem/BentoIllustrations";

interface BentoAppConfig {
  id: "neuropulse" | "neurocase" | "neurocalc" | "neurovision" | "neuroguide" | "neurorx";
  name: string;
  badge: "LIVE" | "NEW" | "SOON" | "BETA";
  hasPing?: boolean;
  href?: string;
  isComingSoon?: boolean;
  accent: string;
  cardTint: string;
  cardHover: string;
  cardTintDark: string;
  cardHoverDark: string;
  pillText: string;
  illustration: React.ReactNode;
}

const BENTO_APPS: BentoAppConfig[] = [
  {
    id: "neuropulse",
    name: "NeuroPulse",
    badge: "LIVE",
    hasPing: true,
    href: "/neuropulse",
    accent: "#B91C1C",
    cardTint: "#FDF8F8",
    cardHover: "#FBF1F1",
    cardTintDark: "#1F1919",
    cardHoverDark: "#271E1E",
    pillText: "LAUNCH APP ↗",
    illustration: <NeuroPulseIllustration />,
  },
  {
    id: "neurocase",
    name: "NeuroCase",
    badge: "NEW",
    href: "/neurocase",
    accent: "#6D28D9",
    cardTint: "#FAF8FD",
    cardHover: "#F4EEFC",
    cardTintDark: "#1C1922",
    cardHoverDark: "#241F2E",
    pillText: "LAUNCH APP ↗",
    illustration: <NeuroCaseIllustration />,
  },
  {
    id: "neurocalc",
    name: "NeuroCalc",
    badge: "SOON",
    isComingSoon: true,
    accent: "#B45309",
    cardTint: "#FDF9F3",
    cardHover: "#FAF2E4",
    cardTintDark: "#211D17",
    cardHoverDark: "#2B251C",
    pillText: "COMING SOON",
    illustration: <NeuroCalcIllustration />,
  },
  {
    id: "neurovision",
    name: "NeuroVision",
    badge: "BETA",
    href: "/neurovision",
    accent: "#1D4ED8",
    cardTint: "#F6F9FE",
    cardHover: "#ECF2FD",
    cardTintDark: "#171B24",
    cardHoverDark: "#1D2330",
    pillText: "LAUNCH APP ↗",
    illustration: <NeuroVisionIllustration />,
  },
  {
    id: "neuroguide",
    name: "NeuroGuide",
    badge: "BETA",
    href: "/neuroguide",
    accent: "#C25934",
    cardTint: "#FDF8F5",
    cardHover: "#FAEFE8",
    cardTintDark: "#211B18",
    cardHoverDark: "#2A211D",
    pillText: "LAUNCH APP ↗",
    illustration: <NeuroGuideIllustration />,
  },
  {
    id: "neurorx",
    name: "NeuroRx",
    badge: "BETA",
    href: "/neurorx",
    accent: "#2F855A",
    cardTint: "#F5FAF7",
    cardHover: "#EAF5EE",
    cardTintDark: "#171F1B",
    cardHoverDark: "#1D2923",
    pillText: "LAUNCH APP ↗",
    illustration: <NeuroRxIllustration />,
  },
];

export default function EcosystemHubPage() {
  const [articleCount, setArticleCount] = useState<number | null>(null);
  const [caseStreak, setCaseStreak] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    try {
      const savedStreak = window.localStorage.getItem("neurocase_streak_days");
      if (savedStreak) {
        const parsed = Number(savedStreak);
        if (Number.isFinite(parsed) && parsed > 0) {
          setCaseStreak(parsed);
        }
      }
    } catch {
      // Ignore storage access errors
    }

    fetch("/data/articles.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && Array.isArray(data)) {
          setArticleCount(data.length);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const getMicroSignal = (id: BentoAppConfig["id"]): string => {
    switch (id) {
      case "neuropulse":
        return articleCount !== null
          ? `Journal Monitor • ${articleCount} Articles Tracked`
          : "Journal Monitor • Multi-Journal Live";
      case "neurocase":
        return caseStreak !== null
          ? `Clinical Reasoning • 🔥 ${caseStreak}d Streak`
          : "Clinical Reasoning • Daily Challenge";
      case "neurocalc":
        return "Clinical Scales • NIHSS & Bedside Scores";
      case "neurovision":
        return "Atlas & NiiVue • MNI152 1mm";
      case "neuroguide":
        return "Guidelines & PICO • AHA/ASA & ESO 2026";
      case "neurorx":
        return "Bedside Pharmacology • Dosing & Safety";
    }
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (typeof window !== "undefined" && window.matchMedia("(hover: none)").matches) {
      return;
    }
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(1000px) rotateX(${(-ny * 3.2).toFixed(2)}deg) rotateY(${(nx * 3.6).toFixed(2)}deg) translateY(-2px)`;
    const art = card.querySelector<HTMLElement>(".bento-art");
    if (art) {
      art.style.transform = `translate3d(${(nx * 9).toFixed(1)}px, ${(ny * 7).toFixed(1)}px, 12px) scale(1.03)`;
    }
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    card.style.transform = "";
    const art = card.querySelector<HTMLElement>(".bento-art");
    if (art) {
      art.style.transform = "";
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-44px)] sm:min-h-screen flex-col justify-center px-4 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-7">
      <div className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
        {BENTO_APPS.map((app) => {
          const cardStyle = {
            "--accent": app.accent,
            "--card-tint": app.cardTint,
            "--card-hover": app.cardHover,
            "--card-tint-dark": app.cardTintDark,
            "--card-hover-dark": app.cardHoverDark,
          } as React.CSSProperties;

          const cardInner = (
            <>
              <div className="relative z-10 flex w-full items-center justify-between gap-2">
                <h2 className="bento-title font-editorial text-4xl sm:text-[42px] leading-none">
                  {app.name}
                </h2>
                <span
                  className="font-mono-tech inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold tracking-widest text-white shadow-sm"
                  style={{ backgroundColor: app.accent }}
                >
                  {app.hasPing && (
                    <span className="h-1.5 w-1.5 animate-ping rounded-full bg-white" />
                  )}
                  {app.badge}
                </span>
              </div>

              <div className="bento-art relative z-10 my-auto flex w-full items-center justify-center py-2">
                {app.illustration}
              </div>

              <div className="relative z-10 flex w-full items-center justify-between gap-2 pt-1">
                <span className="font-mono-tech truncate text-[10px] uppercase tracking-wider text-[var(--text-muted)] opacity-85">
                  {getMicroSignal(app.id)}
                </span>
                <span
                  className="bento-launch-pill font-mono-tech inline-flex shrink-0 items-center gap-1 rounded-full px-3.5 py-1 text-[10.5px] font-semibold tracking-wider text-white shadow-sm"
                  style={{ backgroundColor: app.accent }}
                >
                  {app.pillText}
                </span>
              </div>
            </>
          );

          const sharedClassName =
            "bento-card group flex min-h-[240px] sm:min-h-[255px] flex-col justify-between p-6 text-left sm:p-7 focus-visible:outline-2 focus-visible:outline-offset-2";

          if (app.isComingSoon || !app.href) {
            return (
              <button
                key={app.id}
                type="button"
                style={cardStyle}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                onClick={() =>
                  showToast("⏳ NeuroCalc (Clinical Scales) đang được thiết kế")
                }
                className={`${sharedClassName} cursor-pointer opacity-90`}
              >
                {cardInner}
              </button>
            );
          }

          return (
            <Link
              key={app.id}
              href={app.href}
              style={cardStyle}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className={sharedClassName}
            >
              {cardInner}
            </Link>
          );
        })}
      </div>

      {toastMessage && (
        <div
          role="status"
          className="font-mono-tech pointer-events-none fixed bottom-5 right-5 z-[80] rounded-full border border-[#322E29] bg-[#1C1917] px-4 py-2 text-xs font-medium text-[#FAF8F5] shadow-lg"
        >
          {toastMessage}
        </div>
      )}
    </main>
  );
}
