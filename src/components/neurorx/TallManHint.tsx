"use client";

import React from "react";
import { Info } from "lucide-react";
import type { Sourced } from "@/types/neurorx";

interface TallManHintProps {
  tallMan?: Sourced<string>;
  genericName: string;
  darkMode?: boolean;
}

/**
 * Displays a compact badge + hover/focus tooltip explaining FDA/ISMP Tall Man lettering
 * whenever the drug's Tall Man format differs from its plain generic name.
 */
export function TallManHint({
  tallMan,
  genericName,
  darkMode = false,
}: TallManHintProps) {
  const value = tallMan?.value;
  if (!value || value === genericName || !/[A-Z]/.test(value)) {
    return null;
  }

  const baseExplanation =
    "FDA/ISMP Tall Man lettering: uppercase letters highlight differences between look-alike drug names to prevent medication errors.";
  const tooltipText = tallMan?.note
    ? `${baseExplanation} (${tallMan.note})`
    : baseExplanation;

  return (
    <span
      className={`relative group/tallman inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase border cursor-help shrink-0 ${
        darkMode
          ? "bg-slate-800/80 text-slate-400 border-slate-700/80 hover:text-slate-200 hover:border-slate-600"
          : "bg-slate-100/90 text-slate-500 border-slate-200/80 hover:text-slate-700 hover:border-slate-300"
      }`}
      title={tooltipText}
      aria-label={tooltipText}
      tabIndex={0}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
        }
      }}
    >
      <Info className="w-3 h-3 opacity-80 shrink-0" />
      <span>Tall Man</span>
      <span
        role="tooltip"
        className={`pointer-events-none opacity-0 invisible group-hover/tallman:opacity-100 group-hover/tallman:visible group-focus-within/tallman:opacity-100 group-focus-within/tallman:visible transition-opacity duration-150 absolute left-0 top-full mt-1.5 z-50 w-64 p-2.5 rounded-xl text-[11px] leading-relaxed font-normal normal-case tracking-normal shadow-lg border ${
          darkMode
            ? "bg-slate-900 text-slate-200 border-slate-700"
            : "bg-white text-slate-700 border-slate-200"
        }`}
      >
        <span
          className={`font-semibold block mb-0.5 ${
            darkMode ? "text-cyan-400" : "text-cyan-600"
          }`}
        >
          FDA / ISMP Tall Man Lettering
        </span>
        Uppercase letters highlight differences between look-alike drug names to
        prevent medication errors.
        {tallMan?.note && (
          <span className="block mt-1 text-[10px] opacity-80">
            {tallMan.note}
          </span>
        )}
      </span>
    </span>
  );
}
