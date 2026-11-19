"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Shield } from "lucide-react";
import { AdminAuthModal } from "@/components/neurocase/modals/AdminAuthModal";
import {
  COMMAND_PALETTE_OPEN_EVENT,
  GlobalCommandPalette,
} from "@/components/ecosystem/GlobalCommandPalette";
import {
  getEcosystemDarkMode,
  setEcosystemDarkMode,
  subscribeEcosystemDarkMode,
} from "@/utils/themeSync";

interface EcosystemRailProps {
  children: React.ReactNode;
}

export function EcosystemRail({ children }: EcosystemRailProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isNeuroVision = pathname?.startsWith("/neurovision");
  const isHub = pathname === "/";

  const [darkMode, setDarkMode] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  useEffect(() => {
    setDarkMode(getEcosystemDarkMode());
    const unsubscribe = subscribeEcosystemDarkMode(setDarkMode);

    const checkAdmin = () => {
      try {
        const token =
          sessionStorage.getItem("neurocase_admin_token") ||
          localStorage.getItem("neurocase_admin_token");
        setIsAdminVerified(Boolean(token));
      } catch {
        setIsAdminVerified(false);
      }
    };
    checkAdmin();
    window.addEventListener("storage", checkAdmin);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", checkAdmin);
    };
  }, [pathname]);

  if (isNeuroVision) {
    return <>{children}</>;
  }

  const handleToggleNight = () => {
    setEcosystemDarkMode(!darkMode);
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
  };

  const handleAdminClick = () => {
    try {
      const token =
        sessionStorage.getItem("neurocase_admin_token") ||
        localStorage.getItem("neurocase_admin_token");
      if (token) {
        router.push("/admin");
        return;
      }
    } catch {
      // Fall through to modal
    }
    setShowAdminModal(true);
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminVerified(true);
    setShowAdminModal(false);
    router.push("/admin");
  };

  return (
    <>
      {/* Desktop Slim Vertical Navigation Rail (44px) */}
      <aside
        aria-label="Neuro Ecosystem Navigation Rail"
        className="vertical-rail fixed inset-y-0 left-0 z-50 hidden flex-col items-center justify-between py-3 select-none sm:flex"
      >
        <div className="flex flex-col items-center gap-2.5">
          {/* Anatomical Brain Logo Button -> Returns to Homepage Hub (/) */}
          <Link
            href="/"
            title="Neuro Ecosystem Home"
            aria-label="Return to Neuro Ecosystem Home"
            className={`group relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
              isHub
                ? "bg-[#2C2825] text-[#FAF8F5] ring-1 ring-[#44403C]"
                : "text-[#FAF8F5] hover:bg-[#2C2825]"
            }`}
          >
            <svg
              viewBox="0 0 36 36"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.5 7.5C13.5 7.2 9.5 9.8 8.6 13.8C7.8 17.3 9.4 20.6 12.1 22.1C12.3 24.4 14.2 26.2 16.6 26.2H18V7.5H17.5Z" />
              <path d="M18.5 7.5C22.5 7.2 26.5 9.8 27.4 13.8C28.2 17.3 26.6 20.6 23.9 22.1C23.7 24.4 21.8 26.2 19.4 26.2H18" />
              <path d="M12.5 13.5C14.2 13.5 15.2 14.6 15.2 16.1" />
              <path d="M23.5 13.5C21.8 13.5 20.8 14.6 20.8 16.1" />
              <path d="M11.8 18.2C13.6 18.2 14.9 19.1 15.4 20.4" />
              <path d="M24.2 18.2C22.4 18.2 21.1 19.1 20.6 20.4" />
              <path d="M18 26.2V30" />
            </svg>
          </Link>

          <div className="h-px w-5 bg-[#2C2825]" />

          {/* Quick Search Button (⌘K) */}
          <button
            type="button"
            onClick={handleOpenSearch}
            title="Quick Search across Ecosystem (⌘K)"
            aria-label="Global Search"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#A8A29E] transition-colors hover:bg-[#2C2825] hover:text-[#FAF8F5]"
          >
            <Search className="h-4 w-4" strokeWidth={1.8} />
          </button>

          {/* Night Shift Toggle Switch */}
          <button
            type="button"
            onClick={handleToggleNight}
            title={
              darkMode
                ? "Switch to Warm Day Paper (#FAF8F5)"
                : "Switch to Night Shift Dark Paper (#151412)"
            }
            aria-label="Toggle Night Shift Mode"
            aria-pressed={darkMode}
            className="flex flex-col items-center gap-0.5 rounded-lg py-0.5 text-[#A8A29E] transition-colors hover:text-[#FAF8F5]"
          >
            <div className="relative flex h-7 w-4 flex-col items-center rounded-full border border-[#44403C] bg-[#292524] p-0.5">
              <span
                className={`h-2.5 w-2.5 rounded-full transition-transform duration-300 ${
                  darkMode
                    ? "translate-y-3 bg-amber-300"
                    : "translate-y-0 bg-[#FAF8F5]"
                }`}
              />
            </div>
            <span className="font-mono-tech text-[7px] uppercase tracking-wider opacity-80">
              Night
            </span>
          </button>

          {/* Admin Status Badge */}
          <button
            type="button"
            onClick={handleAdminClick}
            title={
              isAdminVerified
                ? "Admin Command Center (Verified)"
                : "Admin Command Center Login"
            }
            aria-label="Admin Control Center"
            className="flex flex-col items-center gap-0.5 rounded-lg py-1 text-[#A8A29E] transition-colors hover:bg-[#2C2825] hover:text-[#FAF8F5]"
          >
            <div className="relative flex h-5 w-5 items-center justify-center rounded-md border border-[#3F3A36] bg-[#262320] text-[#D6D3CD]">
              <Shield className="h-3 w-3" strokeWidth={1.8} />
              {isAdminVerified && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-[#1C1917] bg-emerald-500" />
              )}
            </div>
            <span className="font-mono-tech text-[6.5px] uppercase tracking-wider opacity-75">
              Admin
            </span>
          </button>
        </div>

        {/* Bottom Rotated Vertical Text */}
        <div className="flex flex-col items-center pb-0.5">
          <span className="vertical-text font-mono-tech text-[8.5px] font-medium text-[#A8A29E]">
            NEURO ECOSYSTEM
          </span>
        </div>
      </aside>

      {/* Mobile Slim Top Bar on Homepage Hub (subpages retain their own headers on mobile) */}
      {isHub && (
        <div className="sticky top-0 z-40 flex h-11 items-center justify-between border-b border-[var(--rail-border)] bg-[var(--rail-bg)] px-4 text-[#FAF8F5] sm:hidden">
          <Link href="/" className="flex items-center gap-2">
            <svg
              viewBox="0 0 36 36"
              className="h-4 w-4 text-[#FAF8F5]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.5 7.5C13.5 7.2 9.5 9.8 8.6 13.8C7.8 17.3 9.4 20.6 12.1 22.1C12.3 24.4 14.2 26.2 16.6 26.2H18V7.5H17.5Z" />
              <path d="M18.5 7.5C22.5 7.2 26.5 9.8 27.4 13.8C28.2 17.3 26.6 20.6 23.9 22.1C23.7 24.4 21.8 26.2 19.4 26.2H18" />
              <path d="M18 26.2V30" />
            </svg>
            <span className="font-mono-tech text-[10px] font-semibold tracking-widest uppercase">
              NEURO ECOSYSTEM
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenSearch}
              aria-label="Global Search"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-[#262320] text-[#D6D3CD]"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToggleNight}
              aria-label="Toggle Night Shift Mode"
              className="font-mono-tech rounded-md border border-[#3F3A36] bg-[#262320] px-2 py-1 text-[10px] font-semibold text-[#FAF8F5]"
            >
              {darkMode ? "☀️ Day" : "🌙 Night"}
            </button>
            <button
              type="button"
              onClick={handleAdminClick}
              aria-label="Admin Control Center"
              className="relative flex h-7 w-7 items-center justify-center rounded-md border border-[#3F3A36] bg-[#262320] text-[#D6D3CD]"
            >
              <Shield className="h-3.5 w-3.5" />
              {isAdminVerified && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container offset by Left Rail on Desktop */}
      <div className="min-h-screen sm:pl-[44px]">{children}</div>

      <GlobalCommandPalette />

      <AdminAuthModal
        show={showAdminModal}
        darkMode={darkMode}
        onClose={() => setShowAdminModal(false)}
        onSuccess={handleAdminAuthSuccess}
      />
    </>
  );
}
