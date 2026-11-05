"use client";

import React, { useState, useEffect } from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import { useNeuroViewer } from "./NeuroViewerContext";

interface CentroidData {
  [atlas: string]: {
    [label_id: string]: {
      mean_mm: [number, number, number];
      in_mask_mm: [number, number, number];
      in_mask_vox: [number, number, number];
    };
  };
}

export default function RegionFloatingToolbar() {
  const { getNiivue } = useNeuroViewer();

  // Zustand Store
  const selectedRegion = useNeuroVisionStore((s) => s.selectedRegion);
  const highlightedLabelId = useNeuroVisionStore((s) => s.highlightedLabelId);
  const setHighlightedLabelId = useNeuroVisionStore((s) => s.setHighlightedLabelId);
  const setCrosshair = useNeuroVisionStore((s) => s.setCrosshair);
  const setIsProgrammaticChange = useNeuroVisionStore((s) => s.setIsProgrammaticChange);

  const [centroids, setCentroids] = useState<CentroidData | null>(null);

  useEffect(() => {
    fetch("/neurovision/data/centroids.json")
      .then((r) => r.json())
      .then((data) => setCentroids(data))
      .catch((err) => console.warn("[RegionFloatingToolbar] Centroids load error:", err));
  }, []);

  // Show if a region is selected or if an isolation is currently active
  if (!selectedRegion && highlightedLabelId === null) {
    return null;
  }

  const isIsolated = selectedRegion && highlightedLabelId === selectedRegion.label_id;

  // Toggle reverse highlight for current region
  const handleToggleHighlight = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nv = getNiivue();
    if (!nv || nv.volumes.length <= 1) return;

    const overlayVol = nv.volumes[1];
    if (highlightedLabelId !== null && (highlightedLabelId === selectedRegion?.label_id || !selectedRegion)) {
      setHighlightedLabelId(null);
      overlayVol.cal_min = 0;
      overlayVol.cal_max = 0;
      nv.updateGLVolume();
    } else if (selectedRegion) {
      setHighlightedLabelId(selectedRegion.label_id);
      overlayVol.cal_min = selectedRegion.label_id - 0.5;
      overlayVol.cal_max = selectedRegion.label_id + 0.5;
      nv.updateGLVolume();
    }
  };

  // Jump to exact in-mask centroid
  const handleJumpToCentroid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedRegion || !centroids) return;
    const nv = getNiivue();
    if (!nv) return;

    const cent = centroids[selectedRegion.atlas]?.[String(selectedRegion.label_id)];
    if (!cent) return;

    setIsProgrammaticChange(true);
    try {
      const frac = nv.mm2frac(cent.in_mask_mm, 0);
      nv.scene.crosshairPos = frac;
      nv.drawScene();
      setCrosshair({ mm: cent.in_mask_mm, vox: cent.in_mask_vox });
    } finally {
      setTimeout(() => setIsProgrammaticChange(false), 50);
    }
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute top-3 left-2 sm:left-3 z-20 pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-900/95 backdrop-blur-md border border-slate-700/70 rounded-xl p-1 sm:p-1.5 shadow-2xl select-none transition-all max-w-[calc(100%-70px)] sm:max-w-none overflow-hidden"
    >
      {/* Selected region label pill */}
      {selectedRegion && (
        <div
          className="flex items-center gap-1.5 px-2 py-1 bg-slate-950/80 rounded-lg border border-slate-800 text-[11px] font-semibold text-slate-200 max-w-[130px] sm:max-w-[200px] md:max-w-[260px] truncate"
          title={`${selectedRegion.name_vi} (${selectedRegion.name_en})`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0 animate-pulse"></span>
          <span className="truncate">{selectedRegion.name_vi}</span>
        </div>
      )}

      {/* Button Highlight ngược (Cô lập) / Tắt cô lập */}
      <button
        type="button"
        onClick={handleToggleHighlight}
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm shrink-0 ${
          isIsolated || (highlightedLabelId !== null && !selectedRegion)
            ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50"
            : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-900/50"
        }`}
        title={
          isIsolated || highlightedLabelId !== null
            ? "Tắt cô lập nhãn (hiển thị lại toàn bộ nhãn)"
            : "Cô lập vùng này trên lát cắt và mô hình 3D (ẩn các nhãn khác)"
        }
      >
        <span>{isIsolated || highlightedLabelId !== null ? "✕" : "🔍"}</span>
        <span className="whitespace-nowrap">
          {isIsolated || highlightedLabelId !== null ? "Tắt cô lập" : "Highlight ngược"}
        </span>
      </button>

      {/* Button Đến tâm (Centroid) */}
      {selectedRegion && (
        <button
          type="button"
          onClick={handleJumpToCentroid}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 transition active:scale-95 shadow-sm shrink-0"
          title="Di chuyển tâm ngắm đến tâm khối giải phẫu (Centroid)"
        >
          <span>🎯</span>
          <span className="whitespace-nowrap">Đến tâm</span>
        </button>
      )}
    </div>
  );
}
