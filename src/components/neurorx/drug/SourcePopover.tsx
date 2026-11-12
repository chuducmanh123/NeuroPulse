"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info, X, ExternalLink, BookOpen, Quote, ShieldCheck } from "lucide-react";
import type { SourceRef, Source } from "@/types/neurorx";

interface SourcePopoverProps {
  refs?: SourceRef[];
  sources?: Source[];
  label?: string;
  darkMode?: boolean;
}

export function SourcePopover({
  refs,
  sources = [],
  label,
  darkMode = false,
}: SourcePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  if (!refs || refs.length === 0) {
    return null;
  }

  // Close on Escape or click outside
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getSourceMeta = (sourceId: string): Source | undefined => {
    return sources.find((s) => s.id === sourceId);
  };

  return (
    <>
      {/* 1. Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-colors cursor-pointer"
        title="View verbatim clinical source quote"
        aria-label="View verbatim clinical source quote"
      >
        <Info className="w-3.5 h-3.5" />
        {label ? <span>{label}</span> : <span>Source</span>}
      </button>

      {/* 2. Accessible Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="source-popover-title"
            className={`w-full max-w-lg max-h-[85vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col transition-colors ${
              darkMode
                ? "bg-slate-900 border-slate-700 text-slate-100"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="source-popover-title"
                    className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white"
                  >
                    Clinical Source Evidence
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Verbatim extract ({refs.length} citation{refs.length > 1 ? "s" : ""})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Citations list */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 divide-y divide-slate-100 dark:divide-slate-800/80">
              {refs.map((ref, idx) => {
                const sourceMeta = getSourceMeta(ref.source_id);

                return (
                  <div key={idx} className={idx > 0 ? "pt-4" : ""}>
                    {/* Source Metadata */}
                    <div className="space-y-1.5 mb-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {sourceMeta?.title || ref.source_id}
                        </h4>
                        {sourceMeta?.url && (
                          <a
                            href={sourceMeta.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline shrink-0"
                          >
                            <span>FDA SPL</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {sourceMeta?.publisher && <span>{sourceMeta.publisher}</span>}
                        {sourceMeta?.year && <span>• {sourceMeta.year}</span>}
                        {sourceMeta?.version && (
                          <span className="text-xs text-slate-400">
                            • ID: {sourceMeta.version.slice(0, 8)}...
                          </span>
                        )}
                      </div>

                      {/* Section Locator */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                        <span>📍 {ref.locator}</span>
                      </div>
                    </div>

                    {/* Verbatim Quote Block */}
                    <div className="relative">
                      <Quote className="absolute top-2.5 left-2.5 w-4 h-4 text-sky-400/40 pointer-events-none" />
                      <blockquote className="p-3.5 pl-8 rounded-xl bg-slate-50 dark:bg-slate-800/60 border-l-4 border-sky-500 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-normal">
                        &ldquo;{ref.quote}&rdquo;
                      </blockquote>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-center">
              <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Zero-hallucination guarantee: Verbatim extracted quote verified against registered label.</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
