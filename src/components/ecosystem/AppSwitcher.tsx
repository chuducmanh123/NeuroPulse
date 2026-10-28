"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface AppSwitcherProps {
  currentApp: "neuropulse" | "neurocase" | "neuroguide";
  darkMode?: boolean;
}

interface EcosystemAppItem {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  badge?: string;
  gradient: string;
  icon: React.ReactNode;
  isCurrent?: boolean;
  isComingSoon?: boolean;
}

export function AppSwitcher({
  currentApp,
  darkMode = false,
}: AppSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [mobileTop, setMobileTop] = useState<number>(116);
  const [alignLeftOnDesktop, setAlignLeftOnDesktop] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePopoverPosition = () => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    setMobileTop(Math.round(rect.bottom + 8));
    setAlignLeftOnDesktop(rect.right < 372);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition);
    };
  }, [open]);

  const ecosystemApps: EcosystemAppItem[] = [
    {
      id: "neuropulse",
      name: "NeuroPulse",
      subtitle: "Journal Monitor",
      href: "/",
      badge: "LIVE",
      gradient: "from-red-500 to-rose-700",
      isCurrent: currentApp === "neuropulse",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-8 4 16 3-8h4" />
        </svg>
      ),
    },
    {
      id: "neurocase",
      name: "NeuroCase",
      subtitle: "Clinical Cases",
      href: "/neurocase",
      badge: "NEW",
      gradient: "from-indigo-500 to-violet-700",
      isCurrent: currentApp === "neurocase",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      id: "neurocalc",
      name: "NeuroCalc",
      subtitle: "Clinical Scales",
      href: "#",
      badge: "SOON",
      gradient: "from-emerald-500 to-teal-700",
      isComingSoon: true,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "neurovision",
      name: "NeuroVision",
      subtitle: "ASPECTS & Imaging",
      href: "#",
      badge: "SOON",
      gradient: "from-blue-500 to-indigo-700",
      isComingSoon: true,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      id: "neuroguide",
      name: "NeuroGuide",
      subtitle: "Guidelines & Conf",
      href: "/neuroguide",
      badge: "NEW",
      gradient: "from-amber-500 to-orange-600",
      isCurrent: currentApp === "neuroguide",
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: "neurorx",
      name: "NeuroRx",
      subtitle: "Drugs & Dosing",
      href: "#",
      badge: "SOON",
      gradient: "from-sky-500 to-cyan-700",
      isComingSoon: true,
      icon: (
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="relative flex items-center" ref={menuRef}>
      {/* 9-Dots Google-Style Ecosystem App Launcher Button */}
      <button
        type="button"
        onClick={() => {
          updatePopoverPosition();
          setOpen((prev) => !prev);
        }}
        aria-label="Neuro Ecosystem Apps"
        title="Neuro Ecosystem Apps"
        className={`p-2 rounded-lg border transition-all flex items-center justify-center ${
          open
            ? darkMode
              ? "bg-slate-800 border-indigo-500 text-white ring-2 ring-indigo-500/40"
              : "bg-slate-200 border-slate-400 text-slate-900 ring-2 ring-indigo-500/30"
            : darkMode
            ? "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
        }`}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="5" r="2" />
          <circle cx="12" cy="5" r="2" />
          <circle cx="19" cy="5" r="2" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
          <circle cx="5" cy="19" r="2" />
          <circle cx="12" cy="19" r="2" />
          <circle cx="19" cy="19" r="2" />
        </svg>
      </button>

      {/* Google Workspace-Style App Launcher Popover (Mobile-Safe + Desktop-Anchored) */}
      {open && (
        <div
          style={{ top: `${mobileTop}px` }}
          className={`fixed left-3 right-3 mx-auto max-w-[356px] sm:absolute sm:!top-full sm:mt-2 sm:w-[356px] sm:max-w-none sm:mx-0 ${
            alignLeftOnDesktop ? "sm:left-0 sm:right-auto" : "sm:right-0 sm:left-auto"
          } rounded-2xl border shadow-2xl z-50 overflow-hidden transition-all ${
            darkMode
              ? "bg-slate-900 border-slate-700 text-slate-100 shadow-black/70"
              : "bg-white border-slate-200 text-slate-900 shadow-slate-400/30"
          }`}
        >
          <div
            className={`px-4 py-2.5 border-b flex items-center justify-between ${
              darkMode ? "border-slate-800 bg-slate-950/60" : "border-slate-100 bg-slate-50"
            }`}
          >
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-500">
              NEURO ECOSYSTEM
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700"
              }`}
            >
              6 Apps
            </span>
          </div>

          <div className="p-3 sm:p-3.5 grid grid-cols-3 gap-2 sm:gap-2.5">
            {ecosystemApps.map((app) => (
              <Link
                key={app.id}
                href={app.href}
                onClick={(e) => {
                  if (app.isComingSoon) {
                    e.preventDefault();
                    return;
                  }
                  setOpen(false);
                }}
                className={`group relative px-1 py-2.5 sm:px-1.5 sm:py-3 rounded-xl flex flex-col items-center text-center transition-all ${
                  app.isComingSoon
                    ? "opacity-65 cursor-not-allowed"
                    : app.isCurrent
                    ? darkMode
                      ? "bg-indigo-950/70 ring-1 ring-indigo-500/60"
                      : "bg-indigo-50/90 ring-1 ring-indigo-300"
                    : darkMode
                    ? "hover:bg-slate-800/80"
                    : "hover:bg-slate-100/90"
                }`}
              >
                <div className="relative mb-2 sm:mb-2.5">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}
                  >
                    {app.icon}
                  </div>
                  {app.badge && (
                    <span
                      className={`absolute -top-1.5 -right-2.5 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase leading-none shadow-xs ${
                        app.badge === "LIVE"
                          ? "bg-red-600 text-white"
                          : app.badge === "NEW"
                          ? "bg-amber-400 text-slate-950"
                          : "bg-slate-600 text-white"
                      }`}
                    >
                      {app.badge}
                    </span>
                  )}
                </div>

                <span className="text-[11px] sm:text-xs font-bold leading-tight whitespace-nowrap">
                  {app.name}
                </span>
                <span
                  className={`text-[9.5px] sm:text-[10px] leading-tight mt-1 whitespace-nowrap ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {app.subtitle}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
