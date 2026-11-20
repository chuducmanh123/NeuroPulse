"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string | number;
}

export type CustomSelectAccent = "cyan" | "amber" | "sky" | "teal";

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  ariaLabel: string;
  icon?: React.ReactNode;
  darkMode?: boolean;
  accent?: CustomSelectAccent;
  align?: "left" | "right";
  compact?: boolean;
  showIndicator?: "checkbox" | "check" | "none";
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  placeholder?: string;
}

const ACCENT_RING: Record<CustomSelectAccent, string> = {
  cyan: "focus:ring-cyan-500/35 focus:border-cyan-500",
  amber: "focus:ring-amber-500/35 focus:border-amber-500",
  sky: "focus:ring-sky-500/35 focus:border-sky-500",
  teal: "focus:ring-teal-500/35 focus:border-teal-500",
};

const ACCENT_SELECTED: Record<
  CustomSelectAccent,
  { dark: string; light: string; check: string }
> = {
  cyan: {
    dark: "bg-cyan-500/15 text-cyan-200",
    light: "bg-cyan-50 text-cyan-800",
    check: "text-cyan-500 dark:text-cyan-400",
  },
  amber: {
    dark: "bg-amber-500/15 text-amber-200",
    light: "bg-amber-50 text-amber-800",
    check: "text-amber-500 dark:text-amber-400",
  },
  sky: {
    dark: "bg-sky-500/15 text-sky-200",
    light: "bg-sky-50 text-sky-800",
    check: "text-sky-500 dark:text-sky-400",
  },
  teal: {
    dark: "bg-teal-500/15 text-teal-200",
    light: "bg-teal-50 text-teal-800",
    check: "text-teal-500 dark:text-teal-400",
  },
};

/**
 * Custom accessible dropdown menu replacing native OS `<select>` popups
 * so options render consistently in a styled floating panel across mobile and desktop.
 */
export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  ariaLabel,
  icon,
  darkMode = false,
  accent = "cyan",
  align = "left",
  compact = false,
  showIndicator = "checkbox",
  className = "",
  buttonClassName = "",
  menuClassName = "",
  placeholder = "Select...",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const accentStyle = ACCENT_SELECTED[accent];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border transition-colors cursor-pointer focus:outline-none focus:ring-2 ${
          ACCENT_RING[accent]
        } ${
          compact
            ? "min-h-[34px] px-2.5 py-1.5 rounded-lg text-xs font-medium"
            : "min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold"
        } ${
          darkMode
            ? "bg-slate-900 border-slate-700 text-slate-100 hover:border-slate-500"
            : "bg-[var(--bg-surface)] border-[var(--border-hairline)] text-[var(--text-ink)] hover:border-stone-300 shadow-xs"
        } ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {icon && <span className="shrink-0 flex items-center">{icon}</span>}
          <span className="truncate">
            {selectedOption
              ? selectedOption.badge !== undefined
                ? `${selectedOption.label} (${selectedOption.badge})`
                : selectedOption.label
              : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`custom-scrollbar absolute z-50 mt-1.5 min-w-full w-max max-w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border p-1.5 max-h-72 overflow-y-auto shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          } ${
            darkMode
              ? "bg-slate-900 border-slate-700 shadow-black/60"
              : "bg-[var(--bg-surface)] border-[var(--border-hairline)] shadow-stone-900/10"
          } ${menuClassName}`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                  compact ? "px-2.5 py-1.5 text-xs" : "px-2.5 py-2 text-xs sm:text-sm"
                } ${
                  isSelected
                    ? `${darkMode ? accentStyle.dark : accentStyle.light} font-bold`
                    : darkMode
                    ? "text-slate-200 hover:bg-slate-800/80 font-medium"
                    : "text-slate-700 hover:bg-slate-100/80 font-medium"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {showIndicator === "checkbox" && (
                    <span
                      className={`w-4 h-4 shrink-0 inline-flex items-center justify-center rounded border ${
                        isSelected
                          ? "border-current bg-current/10"
                          : darkMode
                          ? "border-slate-700 bg-slate-800/60"
                          : "border-slate-300 bg-slate-50"
                      }`}
                      aria-hidden="true"
                    >
                      {isSelected && <Check className={`w-3 h-3 ${accentStyle.check}`} />}
                    </span>
                  )}
                  {showIndicator === "check" && (
                    <span className="w-4 h-4 shrink-0 inline-flex items-center justify-center" aria-hidden="true">
                      {isSelected && <Check className={`w-3.5 h-3.5 ${accentStyle.check}`} />}
                    </span>
                  )}
                  <span className="leading-snug whitespace-normal break-words">{opt.label}</span>
                </span>

                {opt.badge !== undefined && (
                  <span
                    className={`shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                      darkMode
                        ? "bg-slate-800 text-slate-300"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {opt.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
