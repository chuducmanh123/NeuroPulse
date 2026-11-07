"use client";

import React, { useState, useEffect } from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import { useNeuroViewer } from "./NeuroViewerContext";
import SearchBar from "./SearchBar";
import type { BaseModality, ActiveOverlay, ViewMode } from "../../types/neurovision";

interface CentroidData {
  [atlas: string]: {
    [label_id: string]: {
      mean_mm: [number, number, number];
      in_mask_mm: [number, number, number];
      in_mask_vox: [number, number, number];
    };
  };
}

let cachedCentroids: CentroidData | null = null;

const MODALITIES: Array<{ id: BaseModality; label: string; shortLabel: string; desc: string }> = [
  { id: "T1", label: "MRI T1", shortLabel: "T1", desc: "Tương phản giải phẫu chuẩn MNI152" },
  { id: "T2", label: "MRI T2", shortLabel: "T2", desc: "Tương phản dịch não tủy & bệnh lý" },
  { id: "CT", label: "CT Não", shortLabel: "CT", desc: "Mô phỏng cửa sổ nhu mô CT sọ não" },
];

const OVERLAYS: Array<{ id: ActiveOverlay; label: string }> = [
  { id: "none", label: "Ảnh gốc" },
  { id: "aspects", label: "ASPECTS 10 vùng" },
  { id: "arterial_level2", label: "Chi phối động mạch tổng quát" },
  { id: "arterial", label: "Chi phối động mạch chi tiết" },
  { id: "brainstem_aan", label: "Hệ thống lưới thức tỉnh" },
  { id: "whitematter", label: "Chất trắng (JHU DTI-81) (50 bó)" },
  { id: "venous", label: "Xoang Tĩnh mạch (VENAT 7T QSM) (7T)" },
  { id: "anatomy", label: "Giải phẫu vỏ & dưới vỏ (Harvard-Oxford) (67 vùng)" },
  { id: "aal3", label: "Giải phẫu chi tiết (AAL3) (170 vùng)" },
  { id: "glasser", label: "HCP Glasser 2016 (360 vùng & fMRI)" },
  { id: "brainnetome", label: "Brainnetome Atlas (246 vùng & Yeo 7)" },
];

const VIEW_MODES: Array<{ id: ViewMode; label: string; icon: string }> = [
  { id: "multiplanar", label: "Đa diện", icon: "⊞" },
  { id: "axial", label: "Axial", icon: "━" },
  { id: "coronal", label: "Coronal", icon: "┃" },
  { id: "sagittal", label: "Sagittal", icon: "┫" },
  { id: "3d", label: "3D Mesh", icon: "🧊" },
];

export default function ViewerToolbar() {
  const { getNiivue } = useNeuroViewer();

  const baseModality = useNeuroVisionStore((s) => s.baseModality);
  const activeOverlay = useNeuroVisionStore((s) => s.activeOverlay);
  const overlayOpacity = useNeuroVisionStore((s) => s.overlayOpacity);
  const viewMode = useNeuroVisionStore((s) => s.viewMode);
  const fps = useNeuroVisionStore((s) => s.fps);
  const isLoading = useNeuroVisionStore((s) => s.isLoading);
  const loadProgress = useNeuroVisionStore((s) => s.loadProgress);

  const selectedRegion = useNeuroVisionStore((s) => s.selectedRegion);
  const highlightedLabelId = useNeuroVisionStore((s) => s.highlightedLabelId);
  const setHighlightedLabelId = useNeuroVisionStore((s) => s.setHighlightedLabelId);
  const setCrosshair = useNeuroVisionStore((s) => s.setCrosshair);
  const setIsProgrammaticChange = useNeuroVisionStore((s) => s.setIsProgrammaticChange);

  const setBaseModality = useNeuroVisionStore((s) => s.setBaseModality);
  const setActiveOverlay = useNeuroVisionStore((s) => s.setActiveOverlay);
  const setOverlayOpacity = useNeuroVisionStore((s) => s.setOverlayOpacity);
  const setViewMode = useNeuroVisionStore((s) => s.setViewMode);
  const setAspectsModalOpen = useNeuroVisionStore((s) => s.setAspectsModalOpen);

  const isSlidersOpen = useNeuroVisionStore((s) => s.isSlidersOpen);
  const setIsSlidersOpen = useNeuroVisionStore((s) => s.setIsSlidersOpen);
  const isSidebarOpen = useNeuroVisionStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useNeuroVisionStore((s) => s.setIsSidebarOpen);

  const [centroids, setCentroids] = useState<CentroidData | null>(cachedCentroids);

  useEffect(() => {
    if (cachedCentroids) return;
    let isMounted = true;
    fetch("/neurovision/data/centroids.json")
      .then((r) => r.json())
      .then((data: CentroidData) => {
        cachedCentroids = data;
        if (isMounted) setCentroids(data);
      })
      .catch((err) => console.warn("[ViewerToolbar] Centroids load error:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  const isIsolated = Boolean(
    selectedRegion && highlightedLabelId === selectedRegion.label_id
  );

  // Toggle reverse highlight for current region
  const handleToggleHighlight = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nv = getNiivue();

    if (highlightedLabelId !== null && (highlightedLabelId === selectedRegion?.label_id || !selectedRegion)) {
      setHighlightedLabelId(null);
      if (nv && nv.volumes.length > 1) {
        nv.volumes[1].cal_min = 0;
        nv.volumes[1].cal_max = 0;
        nv.updateGLVolume();
      }
    } else if (selectedRegion) {
      setHighlightedLabelId(selectedRegion.label_id);
      if (nv && nv.volumes.length > 1) {
        nv.volumes[1].cal_min = selectedRegion.label_id - 0.5;
        nv.volumes[1].cal_max = selectedRegion.label_id + 0.5;
        nv.updateGLVolume();
      }
    }
  };

  // Jump to exact in-mask centroid
  const handleJumpToCentroid = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedRegion) return;
    const cents = centroids || cachedCentroids;
    if (!cents) return;
    const nv = getNiivue();
    if (!nv) return;

    const cent = cents[selectedRegion.atlas]?.[String(selectedRegion.label_id)];
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
    <div className="bg-slate-900 border-b border-slate-800 px-2 sm:px-3 py-1.5 sm:py-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-xs text-slate-200 shrink-0 select-none">
      {/* 1. Modality & Atlas selection - Đặt cùng 1 dòng trên mobile */}
      <div className="flex items-center gap-1 sm:gap-2 w-full lg:w-auto shrink-0 min-w-0">
        {/* Base Modality Selector */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-1 tracking-wider hidden md:inline">Nền:</span>
          {MODALITIES.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => setBaseModality(mod.id)}
              title={mod.desc}
              className={`px-1.5 sm:px-2 py-0.5 rounded font-medium transition text-[11px] shrink-0 ${
                baseModality === mod.id
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <span className="sm:hidden">{mod.shortLabel}</span>
              <span className="hidden sm:inline">{mod.label}</span>
            </button>
          ))}
        </div>

        {/* Atlas Overlay Dropdown & Opacity */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <select
            id="atlas-select"
            value={activeOverlay}
            onChange={(e) => setActiveOverlay(e.target.value as ActiveOverlay)}
            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-sky-500 font-medium sm:max-w-[220px] lg:max-w-[240px] truncate"
          >
            {OVERLAYS.map((ov) => (
              <option key={ov.id} value={ov.id}>
                {ov.label}
              </option>
            ))}
          </select>

          {activeOverlay !== "none" && (
            <div className="hidden xl:flex items-center gap-1 bg-slate-950/70 px-2 py-0.5 rounded-lg border border-slate-800 shrink-0">
              <span className="text-[10px] text-slate-400">Mờ:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-14 accent-sky-400 h-1 bg-slate-700 rounded cursor-pointer"
              />
              <span className="font-mono text-[10px] text-sky-400 font-semibold w-5 text-right">
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Middle section: Search Bar with Reverse Highlight */}
      <div className="w-full sm:w-auto flex-1 min-w-[180px] max-w-sm order-3 lg:order-2">
        <SearchBar />
      </div>

      {/* 3. Right section: Sliders toggle, Actions (Highlight ngược, Đến tâm), ASPECTS tool, View Mode, Sidebar toggle */}
      <div className="flex items-center gap-1 sm:gap-1.5 order-2 lg:order-3 justify-between sm:justify-start w-full sm:w-auto">
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Toggle Axis Sliders Button */}
          <button
            type="button"
            onClick={() => setIsSlidersOpen(!isSlidersOpen)}
            className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition shrink-0 ${
              isSlidersOpen
                ? "bg-sky-600 text-white border-sky-500 shadow-sm"
                : "bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
            }`}
            title="Bật/Tắt thanh trượt điều khiển lát cắt 3 trục (X, Y, Z)"
          >
            <span>🎚️</span>
            <span className="hidden md:inline">Trục cắt</span>
          </button>

          {/* Highlight ngược / Cô lập Button */}
          <button
            type="button"
            onClick={handleToggleHighlight}
            disabled={!selectedRegion && highlightedLabelId === null}
            className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition shrink-0 ${
              isIsolated || (highlightedLabelId !== null && !selectedRegion)
                ? "bg-rose-600 text-white border-rose-500 shadow-sm hover:bg-rose-500"
                : !selectedRegion && highlightedLabelId === null
                ? "bg-slate-950/50 text-slate-500 border-slate-800/60 cursor-not-allowed opacity-40"
                : "bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
            }`}
            title={
              isIsolated || highlightedLabelId !== null
                ? "Tắt cô lập nhãn (hiển thị lại toàn bộ nhãn)"
                : selectedRegion
                ? `Highlight ngược / Cô lập vùng "${selectedRegion.name_vi}" (ẩn các nhãn khác)`
                : "Chọn một vùng giải phẫu trên ảnh để highlight ngược"
            }
          >
            {isIsolated || highlightedLabelId !== null ? (
              <span className="font-bold text-xs leading-none">✕</span>
            ) : (
              <svg
                className={`w-3.5 h-3.5 shrink-0 ${
                  !selectedRegion && highlightedLabelId === null
                    ? "text-slate-500"
                    : "text-amber-400"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 11-6 6v3h3l6-6" />
                <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
              </svg>
            )}
            <span className="hidden md:inline">
              {isIsolated || highlightedLabelId !== null ? "Tắt cô lập" : "Highlight ngược"}
            </span>
          </button>

          {/* Đến tâm (Centroid) Button */}
          <button
            type="button"
            onClick={handleJumpToCentroid}
            disabled={!selectedRegion}
            className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition shrink-0 ${
              !selectedRegion
                ? "bg-slate-950/50 text-slate-500 border-slate-800/60 cursor-not-allowed opacity-40"
                : "bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
            }`}
            title={
              selectedRegion
                ? `Di chuyển tâm ngắm đến tâm khối giải phẫu "${selectedRegion.name_vi}" (Centroid)`
                : "Chọn một vùng giải phẫu trên ảnh để di chuyển đến tâm"
            }
          >
            <span>🎯</span>
            <span className="hidden md:inline">Đến tâm</span>
          </button>

          {/* ASPECTS Score Modal Trigger */}
          {activeOverlay === "aspects" && (
            <button
              type="button"
              onClick={() => setAspectsModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1 shadow-sm transition active:scale-95 text-xs shrink-0"
              title="Mở công cụ chấm điểm ASPECTS & pc-ASPECTS trên CT não"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              <span>ASPECTS</span>
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-slate-950/70 p-0.5 rounded-lg border border-slate-800 shrink-0">
            {VIEW_MODES.map((vm) => (
              <button
                key={vm.id}
                type="button"
                onClick={() => setViewMode(vm.id)}
                title={vm.label}
                className={`p-1 rounded font-medium transition flex items-center gap-1 text-xs ${
                  viewMode === vm.id
                    ? "bg-slate-700 text-sky-300 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <span>{vm.icon}</span>
                <span className="hidden xl:inline">{vm.label}</span>
              </button>
            ))}
          </div>

          {/* Toggle Clinical Panel Button */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition shrink-0 ${
              isSidebarOpen
                ? "bg-indigo-600 text-white border-indigo-500 shadow-sm"
                : "bg-slate-950 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
            }`}
            title="Bật/Tắt bảng thông tin giải phẫu & lâm sàng"
          >
            <span>📋</span>
            <span className="hidden lg:inline">Lâm sàng</span>
          </button>
        </div>

        {/* FPS */}
        <div className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-[10px] text-slate-400 hidden sm:block shrink-0">
          FPS: <span className={fps >= 30 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{fps || "--"}</span>
        </div>
      </div>
    </div>
  );
}
