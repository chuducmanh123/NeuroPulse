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
  const [revealedCaptions, setRevealedCaptions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setRevealedCaptions({});
    setZoomIndex(null);
  }, [imagingList]);

  const visibleImaging = (imagingList || []).filter(
    (img) => img.reveal_timing !== "after" || isSolved
  );
  if (visibleImaging.length === 0) return null;

  const zoomedImg =
    zoomIndex !== null ? visibleImaging[zoomIndex] ?? null : null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0D111A] text-white overflow-hidden">
      {/* Minimal NEJM-Style Viewer Toolbar */}
      <div className="px-4 py-2.5 bg-[#0D111A] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-300">
            {visibleImaging.length > 1
              ? `${visibleImaging.length} Clinical Figures`
              : visibleImaging[0].modality || "Clinical & Imaging"}
          </span>
          {isSolved && visibleImaging[0].pmcid && (
            <a
              href={
                visibleImaging[0].doi_url ||
                `https://pmc.ncbi.nlm.nih.gov/articles/${visibleImaging[0].pmcid}/`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-indigo-300 hover:text-indigo-200 underline"
            >
              Source: {visibleImaging[0].pmcid} ↗
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoomIndex(0)}
            className="px-2.5 py-1 rounded-lg text-[10.5px] font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            🔍 Enlarge
          </button>
        </div>
      </div>

      {/* Stacked / Multi-Panel Clinical & Imaging Figures with Captions Directly Underneath */}
      <div className="p-3 bg-black space-y-3">
        {visibleImaging.map((img, idx) => {
          const isCaptionRevealed = isSolved || Boolean(revealedCaptions[idx]);

          return (
            <div
              key={idx}
              className="rounded-xl bg-[#0D111A] border border-slate-800/80 overflow-hidden flex flex-col"
            >
              {/* Figure Image with reserved aspect ratio & min-height to eliminate CLS */}
              <div
                onClick={() => setZoomIndex(idx)}
                className="group relative cursor-zoom-in flex flex-col items-center justify-center bg-black min-h-[260px] sm:min-h-[340px] aspect-[4/3] sm:aspect-video w-full overflow-hidden"
              >
                <img
                  src={img.image_url}
                  alt={img.caption || `Clinical Figure ${idx + 1}`}
                  className="w-full h-full max-h-[440px] object-contain transition-transform duration-200 group-hover:scale-[1.01]"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-bold text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none">
                  🔍 Zoom
                </span>
              </div>

              {/* Caption Directly Underneath the Image */}
              {(img.caption || img.figure_label || img.modality) && (
                <div className="p-3 bg-[#0D111A] border-t border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                        {img.figure_label || (visibleImaging.length > 1 ? `Figure ${idx + 1}` : "Figure")}
                      </span>
                      {img.modality && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {img.modality}
                        </span>
                      )}
                    </div>

                    {!isSolved && img.caption && (
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedCaptions((prev) => ({
                            ...prev,
                            [idx]: !prev[idx],
                          }))
                        }
                        className="px-2.5 py-1 rounded-lg text-[10.5px] font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 transition-colors flex items-center gap-1"
                      >
                        <span>{isCaptionRevealed ? "👁 Hide Caption Hint" : "👁 Show Caption Hint"}</span>
                      </button>
                    )}
                  </div>

                  {isCaptionRevealed && (
                    <div className="space-y-1.5 animate-fadeIn">
                      {img.caption && (
                        <p className="text-slate-200 leading-relaxed text-xs">{img.caption}</p>
                      )}
                      {isSolved && img.findings_summary && (
                        <div className="mt-1.5 p-2 rounded bg-indigo-950/70 border border-indigo-700/60 text-indigo-100 text-[11px]">
                          <span className="font-bold text-amber-300 mr-1">Key Finding:</span>
                          {img.findings_summary}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

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
                {visibleImaging.length > 1 &&
                  visibleImaging.map((item, i) => (
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

            {(zoomedImg.caption || (isSolved && zoomedImg.findings_summary)) && (
              <div className="p-4 bg-slate-900 border-t border-slate-800 text-xs text-slate-200 space-y-1.5">
                {isSolved || revealedCaptions[zoomIndex] ? (
                  <>
                    {zoomedImg.caption && <p className="font-bold text-white">{zoomedImg.caption}</p>}
                    {isSolved && zoomedImg.findings_summary && (
                      <p className="text-amber-300 font-medium">{zoomedImg.findings_summary}</p>
                    )}
                  </>
                ) : (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedCaptions((prev) => ({
                          ...prev,
                          [zoomIndex]: true,
                        }))
                      }
                      className="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500"
                    >
                      👁️ Show Caption Hint
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
