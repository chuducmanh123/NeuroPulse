"use client";

import React, { useState, useEffect } from "react";
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
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [revealSpoiler, setRevealSpoiler] = useState(false);

  useEffect(() => {
    setRevealSpoiler(false);
    setZoomIndex(null);
  }, [imagingList]);

  if (!imagingList || imagingList.length === 0) return null;
  const zoomedImg = zoomIndex !== null ? imagingList[zoomIndex] : null;
  const showCaptions = isSolved || revealSpoiler;

  return (
    <div
      className={`rounded-xl border overflow-hidden ${
        darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-950 border-slate-800 text-white"
      }`}
    >
      {/* Minimal NEJM-Style Viewer Toolbar */}
      <div className="px-3.5 py-2 bg-slate-950 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {imagingList.length > 1
              ? `${imagingList.length} Clinical Figures`
              : imagingList[0].modality}
          </span>
          {showCaptions && imagingList[0].pmcid && (
            <a
              href={
                imagingList[0].doi_url ||
                `https://pmc.ncbi.nlm.nih.gov/articles/${imagingList[0].pmcid}/`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-sky-400 hover:text-sky-300 underline"
            >
              Source: {imagingList[0].pmcid} ↗
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isSolved && (
            <button
              type="button"
              onClick={() => setRevealSpoiler((prev) => !prev)}
              className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-800/90 text-slate-300 hover:bg-slate-700 transition-colors"
              title="Toggle original figure caption hint"
            >
              {revealSpoiler ? "Hide Caption Hint" : "💡 Caption Hint"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setZoomIndex(0)}
            className="px-2.5 py-1 rounded text-[11px] font-bold bg-slate-800 text-slate-200 hover:bg-slate-700"
          >
            🔍 Enlarge
          </button>
        </div>
      </div>

      {/* Stacked / Multi-Panel Clinical Figures (NEJM Image Challenge Style) */}
      <div className="p-2.5 bg-black space-y-2.5">
        {imagingList.map((img, idx) => (
          <div
            key={idx}
            onClick={() => setZoomIndex(idx)}
            className="group relative rounded-lg bg-black border border-slate-800/80 overflow-hidden cursor-zoom-in flex flex-col items-center justify-center"
          >
            <img
              src={img.image_url}
              alt={showCaptions ? img.caption : `Clinical Challenge Figure ${idx + 1}`}
              className="w-full max-h-[420px] object-contain transition-transform duration-200 group-hover:scale-[1.01]"
              loading="eager"
            />
            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-bold text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity">
              🔍 Click to Zoom
            </span>
          </div>
        ))}
      </div>

      {/* Original Figure Caption & Radiological Interpretation (Unlocked after solving or clicking Caption Hint) */}
      {showCaptions && (
        <div className="p-3.5 bg-slate-900/95 border-t border-slate-800 text-xs space-y-3 animate-fadeIn">
          {imagingList.map((img, idx) => (
            <div key={idx} className="space-y-1.5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block">
                  {img.figure_label || `Figure ${idx + 1}`} — {img.modality}
                </span>
                <p className="text-slate-200 leading-relaxed mt-0.5">{img.caption}</p>
              </div>
              {isSolved && img.findings_summary && (
                <div className="p-2.5 rounded-lg bg-indigo-950/70 border border-indigo-700/60 text-indigo-100">
                  <span className="font-black uppercase text-[10px] text-amber-300 block mb-0.5">
                    Key Radiological / Electrographic Finding:
                  </span>
                  {img.findings_summary}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full-Screen High-Resolution Figure Modal */}
      {zoomedImg && zoomIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomIndex(null)}
        >
          <div
            className="max-w-5xl w-full rounded-2xl bg-slate-950 border border-slate-700 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-indigo-400">
                  {zoomedImg.figure_label || `Figure ${zoomIndex + 1}`}
                </span>
                <span className="text-sm font-bold text-white">{zoomedImg.modality}</span>
              </div>
              <div className="flex items-center gap-2">
                {imagingList.length > 1 &&
                  imagingList.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setZoomIndex(i)}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        zoomIndex === i
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {item.figure_label || `Fig ${i + 1}`}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => setZoomIndex(null)}
                  className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-700"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] w-full bg-black flex items-center justify-center p-3 overflow-auto">
              <img
                src={zoomedImg.image_url}
                alt="Enlarged clinical figure"
                className="max-h-[70vh] max-w-full object-contain"
              />
            </div>

            {showCaptions && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-200 space-y-1.5">
                <p className="font-bold text-white">{zoomedImg.caption}</p>
                {isSolved && (
                  <p className="text-amber-300 font-medium">{zoomedImg.findings_summary}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
