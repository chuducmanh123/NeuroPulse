"use client";

import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Sun, X } from "lucide-react";

interface NihssStimulusModalProps {
  isOpen: boolean;
  initialCard?: 0 | 1 | 2 | 3;
  onClose: () => void;
}

const CARD_TABS = [
  { id: 0 as const, label: "1. Kitchen Scene", item: "Item 9 · Best Language" },
  { id: 1 as const, label: "2. Object Naming", item: "Item 9 · Best Language" },
  { id: 2 as const, label: "3. Sentences", item: "Item 9 · Best Language" },
  { id: 3 as const, label: "4. Dysarthria Words", item: "Item 10 · Dysarthria" },
];

const NIHSS_SENTENCES = [
  "You know how.",
  "Down to earth.",
  "I got home from work.",
  "Near the table in the dining room.",
  "They heard him speak on the radio last night.",
];

const DYSARTHRIA_WORDS = [
  "MAMA",
  "TIP-TOP",
  "FIFTY-FIFTY",
  "THANKS",
  "HUCKLEBERRY",
  "BASEBALL PLAYER",
];

function KitchenSceneSvg() {
  return (
    <svg
      viewBox="0 0 640 380"
      className="w-full max-w-[600px] mx-auto rounded-xl border border-slate-300 bg-white"
      role="img"
      aria-label="Domestic kitchen scene for NIHSS language and visual attention assessment"
    >
      {/* Room backdrop & floor */}
      <rect x="0" y="0" width="640" height="380" fill="#ffffff" />
      <line x1="20" y1="320" x2="620" y2="320" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="20" y1="30" x2="20" y2="320" stroke="#cbd5e1" strokeWidth="1.5" />

      {/* LEFT SIDE: Upper Cupboard & Cookie Jar */}
      <rect x="45" y="42" width="160" height="105" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="125" y1="42" x2="125" y2="147" stroke="#0f172a" strokeWidth="2" />
      <line x1="45" y1="95" x2="125" y2="95" stroke="#0f172a" strokeWidth="1.5" />
      {/* Open cabinet door */}
      <polygon points="125,42 178,28 178,133 125,147" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
      <circle cx="166" cy="86" r="3.5" fill="#0f172a" />
      {/* Cookie jar */}
      <rect x="72" y="64" width="38" height="30" rx="5" fill="#fef3c7" stroke="#0f172a" strokeWidth="2" />
      <rect x="69" y="57" width="44" height="8" rx="3" fill="#fde68a" stroke="#0f172a" strokeWidth="2" />
      <text x="91" y="83" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#0f172a">
        COOKIES
      </text>

      {/* Girl reaching up (far left) */}
      <circle cx="62" cy="212" r="14" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
      <path d="M50,206 Q62,195 74,206" fill="none" stroke="#0f172a" strokeWidth="2.5" />
      <path d="M62,226 L50,278 L76,278 Z" fill="#f1f5f9" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="66" y1="234" x2="92" y2="188" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="56" y1="278" x2="54" y2="320" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="69" y1="278" x2="71" y2="320" stroke="#0f172a" strokeWidth="2.5" />

      {/* Boy on tipping 3-legged stool */}
      {/* Tipping stool */}
      <line x1="122" y1="248" x2="178" y2="236" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      <line x1="132" y1="246" x2="118" y2="320" stroke="#0f172a" strokeWidth="3" />
      <line x1="152" y1="242" x2="152" y2="314" stroke="#0f172a" strokeWidth="3" />
      <line x1="168" y1="238" x2="188" y2="318" stroke="#0f172a" strokeWidth="3" />
      {/* Boy */}
      <circle cx="146" cy="146" r="14" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="146" y1="160" x2="146" y2="208" stroke="#0f172a" strokeWidth="3" />
      {/* Arm reaching into jar */}
      <line x1="146" y1="170" x2="108" y2="102" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="146" y1="175" x2="172" y2="195" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Legs on stool */}
      <line x1="146" y1="208" x2="132" y2="245" stroke="#0f172a" strokeWidth="3" />
      <line x1="146" y1="208" x2="165" y2="237" stroke="#0f172a" strokeWidth="3" />

      {/* RIGHT SIDE: Window with Outdoor Tree & Cat */}
      <rect x="435" y="45" width="160" height="125" fill="#f0f9ff" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="515" y1="45" x2="515" y2="170" stroke="#0f172a" strokeWidth="2" />
      <line x1="435" y1="108" x2="595" y2="108" stroke="#0f172a" strokeWidth="2" />
      {/* Tree outside window */}
      <rect x="548" y="122" width="10" height="46" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
      <circle cx="553" cy="105" r="24" fill="#dcfce7" stroke="#0f172a" strokeWidth="1.5" />
      {/* Cat on windowsill */}
      <ellipse cx="468" cy="158" rx="14" ry="9" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
      <circle cx="480" cy="147" r="7" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
      <polygon points="474,142 477,134 481,140" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
      <polygon points="481,140 485,134 487,142" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
      <path d="M454,158 Q442,148 446,136" fill="none" stroke="#0f172a" strokeWidth="2" />

      {/* Kitchen Counter & Overflowing Sink */}
      <rect x="330" y="218" width="275" height="102" fill="#f8fafc" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="330" y1="234" x2="605" y2="234" stroke="#0f172a" strokeWidth="2" />
      {/* Faucet & Sink */}
      <path d="M495,218 L495,186 Q495,176 508,176 Q518,176 518,186" fill="none" stroke="#0f172a" strokeWidth="3" />
      <rect x="462" y="212" width="84" height="12" fill="#bae6fd" stroke="#0f172a" strokeWidth="2" />
      {/* Water overflowing onto floor */}
      <path d="M472,224 Q466,272 476,320" fill="none" stroke="#0284c7" strokeWidth="3" strokeDasharray="5 3" />
      <path d="M518,224 Q528,272 516,320" fill="none" stroke="#0284c7" strokeWidth="3" strokeDasharray="5 3" />
      <ellipse cx="496" cy="336" rx="68" ry="12" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />

      {/* Dishes stacked on counter */}
      <ellipse cx="380" cy="212" rx="20" ry="5" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
      <ellipse cx="380" cy="206" rx="18" ry="5" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
      <rect x="415" y="196" width="16" height="22" rx="2" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />

      {/* Parent washing/drying dish */}
      <circle cx="372" cy="118" r="16" fill="#ffffff" stroke="#0f172a" strokeWidth="2.5" />
      <path d="M358,112 Q372,96 386,112" fill="none" stroke="#0f172a" strokeWidth="2.5" />
      <path d="M356,136 L388,136 L396,218 L348,218 Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="2.5" />
      <line x1="386" y1="148" x2="438" y2="178" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
      {/* Plate in hand */}
      <circle cx="446" cy="178" r="14" fill="#ffffff" stroke="#0f172a" strokeWidth="2" />
      <line x1="364" y1="218" x2="364" y2="320" stroke="#0f172a" strokeWidth="3" />
      <line x1="382" y1="218" x2="382" y2="320" stroke="#0f172a" strokeWidth="3" />
    </svg>
  );
}

const NAMING_OBJECTS: Array<{
  id: string;
  label: string;
  renderSvg: () => React.ReactNode;
}> = [
  {
    id: "key",
    label: "Key",
    renderSvg: () => (
      <svg viewBox="0 0 120 80" className="w-24 h-16" aria-hidden="true">
        <circle cx="30" cy="40" r="16" fill="none" stroke="#0f172a" strokeWidth="4" />
        <circle cx="26" cy="40" r="4" fill="#0f172a" />
        <line x1="46" y1="40" x2="104" y2="40" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="84" y1="40" x2="84" y2="54" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
        <line x1="96" y1="40" x2="96" y2="58" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "watch",
    label: "Watch",
    renderSvg: () => (
      <svg viewBox="0 0 120 90" className="w-24 h-18" aria-hidden="true">
        <rect x="48" y="6" width="24" height="18" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="3" />
        <rect x="48" y="66" width="24" height="18" rx="3" fill="#e2e8f0" stroke="#0f172a" strokeWidth="3" />
        <circle cx="60" cy="45" r="22" fill="#ffffff" stroke="#0f172a" strokeWidth="3.5" />
        <line x1="60" y1="45" x2="60" y2="30" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="45" x2="72" y2="45" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="45" r="2.5" fill="#0f172a" />
      </svg>
    ),
  },
  {
    id: "glove",
    label: "Glove",
    renderSvg: () => (
      <svg viewBox="0 0 120 90" className="w-24 h-18" aria-hidden="true">
        <path
          d="M40,78 L40,42 L30,48 C25,50 22,44 26,40 L40,28 L40,14 C40,10 47,10 47,14 L47,32 L51,10 C51,6 58,6 58,10 L58,32 L63,11 C63,7 70,7 70,11 L70,34 L75,18 C75,14 82,14 82,18 L82,56 L78,78 Z"
          fill="#f8fafc"
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <line x1="40" y1="68" x2="79" y2="68" stroke="#0f172a" strokeWidth="2.5" />
      </svg>
    ),
  },
  {
    id: "chair",
    label: "Chair",
    renderSvg: () => (
      <svg viewBox="0 0 120 90" className="w-24 h-18" aria-hidden="true">
        <rect x="36" y="12" width="44" height="36" fill="none" stroke="#0f172a" strokeWidth="3.5" />
        <line x1="36" y1="24" x2="80" y2="24" stroke="#0f172a" strokeWidth="2.5" />
        <polygon points="36,48 80,48 92,58 28,58" fill="#e2e8f0" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round" />
        <line x1="30" y1="58" x2="30" y2="82" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="88" y1="58" x2="88" y2="82" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="40" y1="58" x2="40" y2="76" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <line x1="78" y1="58" x2="78" y2="76" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "feather",
    label: "Feather",
    renderSvg: () => (
      <svg viewBox="0 0 120 90" className="w-24 h-18" aria-hidden="true">
        <path
          d="M22,74 Q42,20 98,14 Q86,52 38,64 Z"
          fill="#f1f5f9"
          stroke="#0f172a"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path d="M16,80 Q52,44 96,15" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
        <line x1="56" y1="42" x2="48" y2="28" stroke="#0f172a" strokeWidth="2" />
        <line x1="70" y1="32" x2="62" y2="20" stroke="#0f172a" strokeWidth="2" />
        <line x1="62" y1="40" x2="74" y2="48" stroke="#0f172a" strokeWidth="2" />
      </svg>
    ),
  },
  {
    id: "cactus",
    label: "Cactus",
    renderSvg: () => (
      <svg viewBox="0 0 120 90" className="w-24 h-18" aria-hidden="true">
        <polygon points="40,66 80,66 74,84 46,84" fill="#fed7aa" stroke="#0f172a" strokeWidth="3" />
        <rect x="52" y="14" width="16" height="52" rx="8" fill="#dcfce7" stroke="#0f172a" strokeWidth="3" />
        <path d="M52,38 L38,38 Q32,38 32,30 L32,24 Q32,20 36,20 Q40,20 40,24 L40,30 L52,30" fill="#dcfce7" stroke="#0f172a" strokeWidth="2.5" />
        <path d="M68,46 L82,46 Q88,46 88,38 L88,30 Q88,26 84,26 Q80,26 80,30 L80,38 L68,38" fill="#dcfce7" stroke="#0f172a" strokeWidth="2.5" />
      </svg>
    ),
  },
];

export function NihssStimulusModal({
  isOpen,
  initialCard = 0,
  onClose,
}: NihssStimulusModalProps) {
  const [activeCard, setActiveCard] = useState<0 | 1 | 2 | 3>(initialCard);
  const [showLabels, setShowLabels] = useState(false);
  const [patientHighContrast, setPatientHighContrast] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setActiveCard(initialCard);
    }
  }, [isOpen, initialCard]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") {
        setActiveCard((prev) => ((prev + 1) % 4) as 0 | 1 | 2 | 3);
      }
      if (e.key === "ArrowLeft") {
        setActiveCard((prev) => ((prev + 3) % 4) as 0 | 1 | 2 | 3);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentTab = CARD_TABS[activeCard];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="NIHSS Bedside Stimulus Cards"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-3xl max-h-[92dvh] flex flex-col rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl overflow-hidden">
        {/* Top Bar */}
        <div className="px-4 py-3 sm:px-5 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0E7490] dark:text-cyan-400">
              {currentTab.item}
            </p>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-ink)]">
              NIHSS Bedside Visual Stimulus Cards
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPatientHighContrast((p) => !p)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                patientHighContrast
                  ? "border-[#0E7490] bg-[#0E7490]/12 text-[#0E7490] dark:text-cyan-300"
                  : "border-[var(--border-hairline)] text-[var(--text-secondary)]"
              }`}
              title="Toggle high-contrast white background for patient viewing"
            >
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Patient View</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close stimulus cards"
              className="p-1.5 rounded-lg border border-[var(--border-hairline)] text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Card Selector Tabs */}
        <div className="px-4 py-2 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] flex items-center gap-1.5 overflow-x-auto">
          {CARD_TABS.map((tab) => {
            const active = activeCard === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCard(tab.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-[#0E7490] text-white"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Stimulus Canvas */}
        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-6 ${
            patientHighContrast
              ? "bg-white text-slate-950"
              : "bg-[var(--bg-surface)] text-[var(--text-ink)]"
          }`}
        >
          {activeCard === 0 && (
            <div className="space-y-3">
              <p
                className={`text-xs font-medium text-center ${
                  patientHighContrast ? "text-slate-600" : "text-[var(--text-muted)]"
                }`}
              >
                Ask the patient to describe everything happening in the picture.
              </p>
              <KitchenSceneSvg />
            </div>
          )}

          {activeCard === 1 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={`text-xs font-medium ${
                    patientHighContrast ? "text-slate-600" : "text-[var(--text-muted)]"
                  }`}
                >
                  Ask the patient to name each item shown below.
                </p>
                <button
                  type="button"
                  onClick={() => setShowLabels((p) => !p)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-200 transition-colors"
                >
                  {showLabels ? (
                    <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{showLabels ? "Hide Labels" : "Show Labels"}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                {NAMING_OBJECTS.map((obj) => (
                  <div
                    key={obj.id}
                    className="rounded-xl border-2 border-slate-300 bg-white p-4 flex flex-col items-center justify-center min-h-[120px]"
                  >
                    {obj.renderSvg()}
                    {showLabels && (
                      <span className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-800">
                        {obj.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeCard === 2 && (
            <div className="max-w-xl mx-auto py-2 space-y-4">
              <p
                className={`text-xs font-medium text-center ${
                  patientHighContrast ? "text-slate-600" : "text-[var(--text-muted)]"
                }`}
              >
                Ask the patient to read each sentence aloud.
              </p>
              <div className="space-y-3">
                {NIHSS_SENTENCES.map((sentence, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border px-4 py-3.5 text-lg sm:text-2xl font-bold tracking-tight leading-snug ${
                      patientHighContrast
                        ? "border-slate-300 bg-slate-50 text-slate-950"
                        : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)]"
                    }`}
                  >
                    {sentence}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeCard === 3 && (
            <div className="max-w-lg mx-auto py-2 space-y-4 text-center">
              <p
                className={`text-xs font-medium ${
                  patientHighContrast ? "text-slate-600" : "text-[var(--text-muted)]"
                }`}
              >
                Ask the patient to read or repeat the words below (assess articulation).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DYSARTHRIA_WORDS.map((word) => (
                  <div
                    key={word}
                    className={`rounded-xl border px-4 py-4 text-xl sm:text-2xl font-extrabold tracking-wide ${
                      patientHighContrast
                        ? "border-slate-300 bg-slate-50 text-slate-950"
                        : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--text-ink)]"
                    }`}
                  >
                    {word}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-4 py-3 border-t border-[var(--border-hairline)] bg-[var(--bg-paper)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              setActiveCard((prev) => ((prev + 3) % 4) as 0 | 1 | 2 | 3)
            }
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)]"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Previous</span>
          </button>

          <span className="text-xs font-mono-tech text-[var(--text-muted)]">
            Card {activeCard + 1} / 4
          </span>

          <button
            type="button"
            onClick={() =>
              setActiveCard((prev) => ((prev + 1) % 4) as 0 | 1 | 2 | 3)
            }
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-ink)]"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
