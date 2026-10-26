"use client";

import React, { useState } from "react";
import { CaseNeuroImaging } from "../../types/clinicalCase";

interface NeuroImagingViewerProps {
  imagingList: CaseNeuroImaging[];
  isSolved: boolean;
  darkMode?: boolean;
}

export function NeuroImagingViewer({
  imagingList,
  isSolved,
  darkMode = false,
}: NeuroImagingViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showFindings, setShowFindings] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  if (!imagingList || imagingList.length === 0) return null;
  const activeImg = imagingList[activeIndex] || imagingList[0];

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        darkMode ? "bg-slate-900 border-slate-700" : "bg-slate-900 border-slate-800 text-white"
      }`}
    >
      {/* Top PACS Header Bar */}
      <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-600 text-white">
            {activeImg.sequence_badge}
          </span>
          <span className="text-xs font-bold text-slate-200">{activeImg.modality}</span>
          {activeImg.pmcid && (
            <a
              href={
                activeImg.doi_url ||
                `https://pmc.ncbi.nlm.nih.gov/articles/${activeImg.pmcid}/`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 underline"
            >
              Source: {activeImg.pmcid} ↗
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {imagingList.length > 1 && (
            <div className="flex items-center gap-1 mr-1">
              {imagingList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                    activeIndex === idx
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {img.figure_label || `Fig ${idx + 1}`}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowFindings((prev) => !prev)}
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
              showFindings
                ? "bg-amber-400 text-slate-950"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {showFindings ? "Hide Key Findings" : "Reveal Key Findings"}
          </button>

          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            🔍 Enlarge Figure
          </button>
        </div>
      </div>

      {/* Actual Published Journal Article Figure */}
      <div
        onClick={() => setZoomOpen(true)}
        className="relative min-h-64 max-h-96 w-full bg-black cursor-zoom-in flex items-center justify-center p-2 overflow-hidden"
      >
        <img
          src={activeImg.image_url}
          alt={activeImg.caption}
          className="max-h-88 max-w-full object-contain rounded"
          loading="eager"
        />
      </div>

      {/* Original Figure Caption & Radiological Interpretation */}
      <div className="p-3.5 bg-slate-900/95 border-t border-slate-800 text-xs space-y-2">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
            {activeImg.figure_label ? `${activeImg.figure_label} — ` : ""}Original Published Article Caption:
          </span>
          <p className="text-slate-200 leading-relaxed">{activeImg.caption}</p>
        </div>

        {(showFindings || isSolved) && (
          <div className="p-2.5 rounded-lg bg-indigo-950/70 border border-indigo-700/60 text-indigo-100">
            <span className="font-black uppercase text-[10px] text-amber-300 block mb-0.5">
              Key Neuroimaging / Electrophysiology Interpretation:
            </span>
            {activeImg.findings_summary}
          </div>
        )}
      </div>

      {/* Full-Screen High-Resolution Figure Modal */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <div
            className="max-w-4xl w-full rounded-2xl bg-slate-950 border border-slate-700 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-indigo-400">
                  {activeImg.sequence_badge}
                </span>
                <span className="text-sm font-bold text-white">{activeImg.modality}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFindings((p) => !p)}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-400 text-slate-950"
                >
                  {showFindings ? "Hide Interpretation" : "Show Interpretation"}
                </button>
                <button
                  type="button"
                  onClick={() => setZoomOpen(false)}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-700"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] w-full bg-black flex items-center justify-center p-3 overflow-auto">
              <img
                src={activeImg.image_url}
                alt={activeImg.caption}
                className="max-h-[65vh] max-w-full object-contain"
              />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-200 space-y-1.5">
              <p className="font-bold text-white">
                {activeImg.figure_label || "Article Figure"}: {activeImg.caption}
              </p>
              {(showFindings || isSolved) && (
                <p className="text-amber-300 font-medium">{activeImg.findings_summary}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
