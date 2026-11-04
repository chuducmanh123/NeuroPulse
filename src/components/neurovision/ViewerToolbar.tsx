"use client";

import React from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import SearchBar from "./SearchBar";
import type { BaseModality, ActiveOverlay, ViewMode } from "../../types/neurovision";

const MODALITIES: Array<{ id: BaseModality; label: string; desc: string }> = [
  { id: "T1", label: "MRI T1", desc: "Tương phản giải phẫu chuẩn MNI152" },
  { id: "T2", label: "MRI T2", desc: "Tương phản dịch não tủy & bệnh lý" },
  { id: "CT", label: "CT Não", desc: "Mô phỏng cửa sổ nhu mô CT sọ não" },
];

const OVERLAYS: Array<{ id: ActiveOverlay; label: string; badge: string }> = [
  { id: "aspects", label: "ASPECTS 10 vùng (MCA)", badge: "Cốt lõi" },
  { id: "arterial_level2", label: "Lãnh thổ Động mạch (M1, M2, ACA, PCA)", badge: "L2" },
  { id: "arterial", label: "Động mạch toàn não (JHU)", badge: "L1" },
  { id: "brainstem_aan", label: "Thân não thức tỉnh (Harvard AAN)", badge: "16 nhân" },
  { id: "anatomy", label: "Giải phẫu vỏ & dưới vỏ (Harvard-Oxford)", badge: "67 vùng" },
  { id: "whitematter", label: "Chất trắng (JHU DTI-81)", badge: "50 bó" },
  { id: "venous", label: "Xoang Tĩnh mạch (VENAT 7T QSM)", badge: "7T" },
  { id: "aal3", label: "AAL3 (Thân não & Đồi thị)", badge: "170 vùng" },
  { id: "none", label: "Tắt lớp phủ (Chỉ ảnh gốc)", badge: "Tắt" },
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

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
      {/* Left section: Modality & Atlas selection */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 1. Base Modality Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 tracking-wider">Nền:</span>
          {MODALITIES.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => setBaseModality(mod.id)}
              title={mod.desc}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                baseModality === mod.id
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {mod.label}
            </button>
          ))}
        </div>

        {/* 2. Atlas Overlay Dropdown & Opacity */}
        <div className="flex items-center gap-2">
          <select
            id="atlas-select"
            value={activeOverlay}
            onChange={(e) => setActiveOverlay(e.target.value as ActiveOverlay)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-medium"
          >
            {OVERLAYS.map((ov) => (
              <option key={ov.id} value={ov.id}>
                {ov.label} ({ov.badge})
              </option>
            ))}
          </select>

          {activeOverlay !== "none" && (
            <div className="flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400">Mờ:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-16 accent-sky-400 h-1 bg-slate-700 rounded cursor-pointer"
              />
              <span className="font-mono text-[10px] text-sky-400 font-semibold w-6 text-right">
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Middle section: Search Bar with Reverse Highlight */}
      <div className="flex-1 max-w-sm mx-auto">
        <SearchBar />
      </div>

      {/* Right section: ASPECTS tool, View Mode, Diagnostics */}
      <div className="flex flex-wrap items-center gap-2">
        {/* ASPECTS Score Modal Trigger */}
        <button
          type="button"
          onClick={() => setAspectsModalOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/50 transition active:scale-95"
          title="Mở công cụ chấm điểm ASPECTS & pc-ASPECTS trên CT não"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
          ASPECTS Tool
        </button>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
          {VIEW_MODES.map((vm) => (
            <button
              key={vm.id}
              type="button"
              onClick={() => setViewMode(vm.id)}
              className={`px-2 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                viewMode === vm.id
                  ? "bg-slate-700 text-sky-300 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>{vm.icon}</span>
              <span className="hidden sm:inline">{vm.label}</span>
            </button>
          ))}
        </div>

        {/* Diagnostics & FPS */}
        <div className="flex items-center gap-2 text-[11px]">
          {isLoading ? (
            <span className="text-amber-400 font-medium animate-pulse flex items-center gap-1">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              {loadProgress || "Nạp..."}
            </span>
          ) : (
            <span className="text-emerald-400 font-mono hidden md:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Cache
            </span>
          )}

          <div className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono text-slate-300">
            FPS: <span className={fps >= 30 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>{fps || "--"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
