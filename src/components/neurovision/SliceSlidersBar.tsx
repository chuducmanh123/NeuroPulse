"use client";

import React, { useState } from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import { useNeuroViewer } from "./NeuroViewerContext";

export default function SliceSlidersBar() {
  const { getNiivue } = useNeuroViewer();

  // Zustand Store
  const crosshair = useNeuroVisionStore((s) => s.crosshair);
  const volumeDimensions = useNeuroVisionStore((s) => s.volumeDimensions);
  const clipPlane = useNeuroVisionStore((s) => s.clipPlane);
  const viewMode = useNeuroVisionStore((s) => s.viewMode);

  const setCrosshair = useNeuroVisionStore((s) => s.setCrosshair);
  const setIsProgrammaticChange = useNeuroVisionStore((s) => s.setIsProgrammaticChange);
  const setClipPlane = useNeuroVisionStore((s) => s.setClipPlane);
  const resetCrosshair = useNeuroVisionStore((s) => s.resetCrosshair);

  const [showClipControls, setShowClipControls] = useState(false);

  // Voxel grid boundaries (MNI152 default: [193, 229, 193])
  const dims = volumeDimensions?.dims ?? [193, 229, 193];
  const [voxX, voxY, voxZ] = crosshair.vox;
  const [mmX, mmY, mmZ] = crosshair.mm;

  /**
   * Update crosshair position from voxel slider input
   * Uses nv.vox2frac / nv.mm2frac to assign to nv.scene.crosshairPos
   */
  const handleVoxelChange = (axis: "x" | "y" | "z", newVox: number) => {
    const nv = getNiivue();
    if (!nv) return;

    // Set programmatic change flag to avoid feedback loops
    setIsProgrammaticChange(true);

    const nextVox: [number, number, number] = [
      axis === "x" ? Math.max(0, Math.min(dims[0] - 1, newVox)) : voxX,
      axis === "y" ? Math.max(0, Math.min(dims[1] - 1, newVox)) : voxY,
      axis === "z" ? Math.max(0, Math.min(dims[2] - 1, newVox)) : voxZ,
    ];

    try {
      // 1. Convert voxel to fractional coords
      const frac = nv.vox2frac(nextVox, 0);

      // 2. Assign to NiiVue scene
      nv.scene.crosshairPos = frac;
      nv.drawScene();

      // 3. Compute new millimeter coordinates
      const mm4 = nv.frac2mm(frac, 0);
      const nextMM: [number, number, number] = [
        Math.round(mm4[0] * 10) / 10,
        Math.round(mm4[1] * 10) / 10,
        Math.round(mm4[2] * 10) / 10,
      ];

      setCrosshair({ mm: nextMM, vox: nextVox });
    } catch (err) {
      console.warn("[SliceSlidersBar] Failed to update crosshair:", err);
    } finally {
      // Release lock after short tick
      setTimeout(() => {
        setIsProgrammaticChange(false);
      }, 50);
    }
  };

  /**
   * Reset crosshair to Anterior Commissure (0, 0, 0 mm)
   */
  const handleResetAC = () => {
    const nv = getNiivue();
    if (!nv) return;

    setIsProgrammaticChange(true);
    resetCrosshair();

    try {
      const frac = nv.mm2frac([0, 0, 0], 0);
      nv.scene.crosshairPos = frac;
      nv.drawScene();
    } catch (err) {
      console.warn("[SliceSlidersBar] Reset AC failed:", err);
    } finally {
      setTimeout(() => {
        setIsProgrammaticChange(false);
      }, 50);
    }
  };

  return (
    <div className="bg-slate-900/95 border-t border-slate-800 p-3 text-xs text-slate-200 select-none shadow-2xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
        {/* Sliders Grid */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Axial Slider (Z) */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                Axial (Z)
              </span>
              <span className="text-slate-400 font-mono">
                {voxZ + 1} / {dims[2]}{" "}
                <span className="text-slate-300 font-semibold">({mmZ >= 0 ? `+${mmZ}` : mmZ} mm)</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleVoxelChange("z", voxZ - 1)}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-xs"
                title="Lát trước (Inferior)"
              >
                -
              </button>
              <input
                type="range"
                min={0}
                max={dims[2] - 1}
                value={voxZ}
                onChange={(e) => handleVoxelChange("z", parseInt(e.target.value, 10))}
                className="flex-1 accent-sky-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleVoxelChange("z", voxZ + 1)}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-xs"
                title="Lát sau (Superior)"
              >
                +
              </button>
            </div>
          </div>

          {/* 2. Coronal Slider (Y) */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Coronal (Y)
              </span>
              <span className="text-slate-400 font-mono">
                {voxY + 1} / {dims[1]}{" "}
                <span className="text-slate-300 font-semibold">({mmY >= 0 ? `+${mmY}` : mmY} mm)</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleVoxelChange("y", voxY - 1)}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-xs"
                title="Lát trước (Posterior)"
              >
                -
              </button>
              <input
                type="range"
                min={0}
                max={dims[1] - 1}
                value={voxY}
                onChange={(e) => handleVoxelChange("y", parseInt(e.target.value, 10))}
                className="flex-1 accent-emerald-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleVoxelChange("y", voxY + 1)}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-xs"
                title="Lát sau (Anterior)"
              >
                +
              </button>
            </div>
          </div>

          {/* 3. Sagittal Slider (X) */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-2.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                Sagittal (X)
              </span>
              <span className="text-slate-400 font-mono">
                {voxX + 1} / {dims[0]}{" "}
                <span className="text-slate-300 font-semibold">({mmX >= 0 ? `+${mmX}` : mmX} mm)</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleVoxelChange("x", voxX - 1)}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-xs"
                title="Lát trước (Left)"
              >
                -
              </button>
              <input
                type="range"
                min={0}
                max={dims[0] - 1}
                value={voxX}
                onChange={(e) => handleVoxelChange("x", parseInt(e.target.value, 10))}
                className="flex-1 accent-rose-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => handleVoxelChange("x", voxX + 1)}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-xs"
                title="Lát sau (Right)"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions & 3D Clip Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleResetAC}
            className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition font-medium flex items-center gap-1.5"
            title="Đưa tâm ngắm về Mép trước (Anterior Commissure - MNI 0,0,0)"
          >
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Về AC (0,0,0)
          </button>

          <button
            type="button"
            onClick={() => setShowClipControls(!showClipControls)}
            className={`px-2.5 py-2 rounded-lg border transition font-medium flex items-center gap-1.5 ${
              showClipControls || clipPlane.depth <= 2.0
                ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            }`}
            title="Công cụ cắt vát khối 3D (Clip Plane)"
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
            3D Clip
          </button>
        </div>
      </div>

      {/* Expandable 3D Clip Plane Controls */}
      {showClipControls && (
        <div className="mt-3 pt-3 border-t border-slate-800 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-indigo-300 font-semibold">Độ sâu cắt (Depth)</span>
              <span className="font-mono text-slate-400">
                {clipPlane.depth > 2.0 ? "Tắt (Không cắt)" : clipPlane.depth.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2.5}
              step={0.05}
              value={clipPlane.depth}
              onChange={(e) => setClipPlane({ depth: parseFloat(e.target.value) })}
              className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-indigo-300 font-semibold">Góc phương vị (Azimuth)</span>
              <span className="font-mono text-slate-400">{Math.round(clipPlane.azimuth)}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={360}
              step={5}
              value={clipPlane.azimuth}
              onChange={(e) => setClipPlane({ azimuth: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-indigo-300 font-semibold">Góc nâng (Elevation)</span>
              <span className="font-mono text-slate-400">{Math.round(clipPlane.elevation)}°</span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              step={5}
              value={clipPlane.elevation}
              onChange={(e) => setClipPlane({ elevation: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
