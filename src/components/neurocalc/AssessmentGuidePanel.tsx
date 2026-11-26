"use client";

import React, { useEffect } from "react";
import { AlertTriangle, BookOpen, CheckSquare, MessageSquareQuote, X } from "lucide-react";
import type { AssessmentGuide, ScaleReference } from "@/types/neurocalc";

interface GuideContentProps {
  guide: AssessmentGuide;
  references: ScaleReference[];
  compact?: boolean;
}

function resolveCitation(refId: string, references: ScaleReference[]): ScaleReference | undefined {
  return references.find((r) => r.id === refId);
}

function GuideStructuredBody({ guide, references, compact = false }: GuideContentProps) {
  return (
    <div className={compact ? "space-y-3 text-xs" : "space-y-4 text-sm"}>
      {guide.bedside_steps.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0E7490] dark:text-cyan-400 mb-1.5">
            <CheckSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Bedside Exam Steps</span>
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-[var(--text-secondary)] leading-relaxed">
            {guide.bedside_steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {guide.exam_prompts && guide.exam_prompts.length > 0 && (
        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-subtle)]/70 p-3">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-ink)] mb-1.5">
            <MessageSquareQuote className="w-3.5 h-3.5 shrink-0 text-[#0E7490] dark:text-cyan-400" aria-hidden="true" />
            <span>Verbal / Reading Prompts</span>
          </h4>
          <ul className="space-y-1 text-xs sm:text-[13px] font-medium text-[var(--text-ink)]">
            {guide.exam_prompts.map((prompt, idx) => (
              <li key={idx} className="leading-relaxed">
                {prompt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {guide.pitfalls_and_exceptions.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-50/70 dark:bg-amber-950/25 p-3">
          <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Edge Cases &amp; Pitfalls</span>
          </h4>
          <ul className="list-disc list-inside space-y-1 text-amber-950 dark:text-amber-100/90 leading-relaxed">
            {guide.pitfalls_and_exceptions.map((pitfall, idx) => (
              <li key={idx}>{pitfall}</li>
            ))}
          </ul>
        </div>
      )}

      {guide.refs.length > 0 && (
        <div className="pt-2 border-t border-[var(--border-hairline)]">
          <h4 className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
            <span>Source Citation</span>
          </h4>
          <ul className="space-y-1.5 text-[11.5px] text-[var(--text-muted)] leading-relaxed">
            {guide.refs.map((ref, idx) => {
              const source = resolveCitation(ref.source_id, references);
              return (
                <li key={idx}>
                  <span className="font-semibold text-[var(--text-secondary)]">
                    {source ? source.citation : ref.source_id}
                  </span>
                  {ref.locator && <span> — {ref.locator}</span>}
                  {ref.quote && (
                    <blockquote className="mt-1 pl-2.5 border-l-2 border-[var(--border-hairline)] italic text-[11px]">
                      &ldquo;{ref.quote}&rdquo;
                    </blockquote>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

interface InlineAssessmentGuideProps {
  id?: string;
  guide: AssessmentGuide;
  references: ScaleReference[];
  onClose: () => void;
}

export function InlineAssessmentGuide({
  id,
  guide,
  references,
  onClose,
}: InlineAssessmentGuideProps) {
  return (
    <div
      id={id}
      role="region"
      aria-label={guide.title}
      className="mt-2.5 rounded-xl border border-[#0E7490]/35 bg-[var(--bg-paper)] p-3.5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <h3 className="text-xs font-bold text-[var(--text-ink)] leading-snug">
          {guide.title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
          aria-label="Close assessment guide"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
      <GuideStructuredBody guide={guide} references={references} compact />
    </div>
  );
}

interface AssessmentGuideDrawerProps {
  guide: AssessmentGuide | null;
  references: ScaleReference[];
  onClose: () => void;
}

export function AssessmentGuideDrawer({
  guide,
  references,
  onClose,
}: AssessmentGuideDrawerProps) {
  useEffect(() => {
    if (!guide) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [guide, onClose]);

  if (!guide) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={guide.title}
    >
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-md h-full overflow-y-auto border-l border-[var(--border-hairline)] bg-[var(--bg-surface)] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-[var(--border-hairline)]">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-widest text-[#0E7490] dark:text-cyan-400">
              Bedside Assessment Methodology
            </p>
            <h2 className="mt-1 text-base sm:text-lg font-bold text-[var(--text-ink)] leading-snug">
              {guide.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors shrink-0"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <GuideStructuredBody guide={guide} references={references} />
      </aside>
    </div>
  );
}
