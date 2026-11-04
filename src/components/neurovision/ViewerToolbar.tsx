"use client";

import React from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import SearchBar from "./SearchBar";
import type { BaseModality, ActiveOverlay, ViewMode } from "../../types/neurovision";

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
  { id: "anatomy", label: "Giải phẫu vỏ & dưới vỏ (Harvard-Oxford) (67 vùng)" },
  { id: "whitematter", label: "Chất trắng (JHU DTI-81) (50 bó)" },
  { id: "venous", label: "Xoang Tĩnh mạch (VENAT 7T QSM) (7T)" },
  { id: "aal3", label: "Giải phẫu chi tiết (AAL3) (170 vùng)" },
];

const VIEW_MODES: Array<{ id: ViewMode; label: string; icon: string }> = [
  { id: "multiplanar", label: "Đa diện", icon: "⊞" },
  { id: "axial", label: "Axial", icon: "━" },
  { id: "coronal", label: "Coronal", icon: "┃" },
  { id: "sagittal", label: "Sagittal", icon: "┫" },
  { id: "3d", label: "3D Mesh", icon: "🧊" },
];

export default function ViewerToolbar() {
  const baseModality = useNeuroVisionStore((s) => s.baseModality);
  const activeOverlay = useNeuroVisionStore((s) => s.activeOverlay);
  const overlayOpacity = useNeuroVisionStore((s) => s.overlayOpacity);
  const viewMode = useNeuroVisionStore((s) => s.viewMode);
  const fps = useNeuroVisionStore((s) => s.fps);
  const isLoading = useNeuroVisionStore((s) => s.isLoading);
  const loadProgress = useNeuroVisionStore((s) => s.loadProgress);

  const setBaseModality = useNeuroVisionStore((s) => s.setBaseModality);
  const setActiveOverlay = useNeuroVisionStore((s) => s.setActiveOverlay);
  const setOverlayOpacity = useNeuroVisionStore((s) => s.setOverlayOpacity);
  const setViewMode = useNeuroVisionStore((s) => s.setViewMode);
  const setAspectsModalOpen = useNeuroVisionStore((s) => s.setAspectsModalOpen);

  const isSlidersOpen = useNeuroVisionStore((s) => s.isSlidersOpen);
  const setIsSlidersOpen = useNeuroVisionStore((s) => s.setIsSlidersOpen);
  const isSidebarOpen = useNeuroVisionStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useNeuroVisionStore((s) => s.setIsSidebarOpen);

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

      {/* 3. Right section: Sliders toggle, ASPECTS tool, View Mode, Sidebar toggle */}
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
