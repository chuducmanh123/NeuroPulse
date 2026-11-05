"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import { useNeuroViewer } from "./NeuroViewerContext";

interface SliceScrollbarProps {
  className?: string;
}

export default function SliceScrollbar({ className = "" }: SliceScrollbarProps) {
  const { getNiivue } = useNeuroViewer();

  // Zustand Store
  const crosshair = useNeuroVisionStore((s) => s.crosshair);
  const volumeDimensions = useNeuroVisionStore((s) => s.volumeDimensions);
  const viewMode = useNeuroVisionStore((s) => s.viewMode);
  const clipPlane = useNeuroVisionStore((s) => s.clipPlane);
  const activeSliceAxis = useNeuroVisionStore((s) => s.activeSliceAxis);

  const setCrosshair = useNeuroVisionStore((s) => s.setCrosshair);
  const setIsProgrammaticChange = useNeuroVisionStore((s) => s.setIsProgrammaticChange);
  const setActiveSliceAxis = useNeuroVisionStore((s) => s.setActiveSliceAxis);
  const setClipPlane = useNeuroVisionStore((s) => s.setClipPlane);
  const resetCrosshair = useNeuroVisionStore((s) => s.resetCrosshair);

  // Local state
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Refs for dragging and holding
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Volume bounds (MNI152 default: [193, 229, 193])
  const dims = volumeDimensions?.dims ?? [193, 229, 193];
  const [voxX, voxY, voxZ] = crosshair.vox;
  const [mmX, mmY, mmZ] = crosshair.mm;

  // Determine current active axis settings
  const axis = activeSliceAxis;
  const is3D = viewMode === "3d";

  // Slice count and current value for active axis
  let maxVox = dims[2] - 1;
  let currentVox = voxZ;
  let currentMM = mmZ;
  let axisLabel = "Axial";
  let axisColorTheme = {
    text: "text-sky-400",
    bg: "bg-sky-500",
    border: "border-sky-400",
    glow: "shadow-[0_0_8px_rgba(56,189,248,0.5)]",
    fillGradient: "from-sky-600 to-sky-400",
  };

  if (axis === "y") {
    maxVox = dims[1] - 1;
    currentVox = voxY;
    currentMM = mmY;
    axisLabel = "Coronal";
    axisColorTheme = {
      text: "text-emerald-400",
      bg: "bg-emerald-500",
      border: "border-emerald-400",
      glow: "shadow-[0_0_8px_rgba(52,211,153,0.5)]",
      fillGradient: "from-emerald-600 to-emerald-400",
    };
  } else if (axis === "x") {
    maxVox = dims[0] - 1;
    currentVox = voxX;
    currentMM = mmX;
    axisLabel = "Sagittal";
    axisColorTheme = {
      text: "text-rose-400",
      bg: "bg-rose-500",
      border: "border-rose-400",
      glow: "shadow-[0_0_8px_rgba(251,113,133,0.5)]",
      fillGradient: "from-rose-600 to-rose-400",
    };
  }

  // Fraction for track & thumb
  const fraction = is3D
    ? Math.max(0, Math.min(1, 1 - clipPlane.depth / 2.0))
    : Math.max(0, Math.min(1, maxVox > 0 ? currentVox / maxVox : 0.5));

  /**
   * Apply new voxel coordinate to NiiVue scene and update crosshair
   */
  const applyVoxel = useCallback(
    (targetAxis: "x" | "y" | "z", targetVox: number) => {
      const nv = getNiivue();
      if (!nv) return;

      setIsProgrammaticChange(true);

      const maxDim = (targetAxis === "x" ? dims[0] : targetAxis === "y" ? dims[1] : dims[2]) - 1;
      const clampedVox = Math.max(0, Math.min(maxDim, targetVox));

      const nextVox: [number, number, number] = [
        targetAxis === "x" ? clampedVox : crosshair.vox[0],
        targetAxis === "y" ? clampedVox : crosshair.vox[1],
        targetAxis === "z" ? clampedVox : crosshair.vox[2],
      ];

      try {
        const frac = nv.vox2frac(nextVox, 0);
        nv.scene.crosshairPos = frac;
        nv.drawScene();

        const mm4 = nv.frac2mm(frac, 0);
        const nextMM: [number, number, number] = [
          Math.round(mm4[0] * 10) / 10,
          Math.round(mm4[1] * 10) / 10,
          Math.round(mm4[2] * 10) / 10,
        ];

        setCrosshair({ mm: nextMM, vox: nextVox });
      } catch (err) {
        console.warn("[SliceScrollbar] Error updating voxel:", err);
      } finally {
        if (!isDraggingRef.current) {
          setTimeout(() => {
            setIsProgrammaticChange(false);
          }, 40);
        }
      }
    },
    [crosshair.vox, dims, getNiivue, setCrosshair, setIsProgrammaticChange]
  );

  /**
   * Step slice by delta (+1 or -1)
   */
  const stepSlice = useCallback(
    (delta: number) => {
      if (is3D) {
        const nextDepth = Math.max(0, Math.min(2.5, Math.round((clipPlane.depth - delta * 0.05) * 100) / 100));
        setClipPlane({ depth: nextDepth });
        return;
      }
      applyVoxel(axis, currentVox + delta);
    },
    [is3D, clipPlane.depth, setClipPlane, applyVoxel, axis, currentVox]
  );

  /**
   * Cycle axis Z -> Y -> X -> Z
   */
  const handleCycleAxis = () => {
    if (viewMode !== "multiplanar") return;
    const nextAxis = axis === "z" ? "y" : axis === "y" ? "x" : "z";
    setActiveSliceAxis(nextAxis);
  };

  /**
   * Continuous scrolling on press and hold
   */
  const startHold = useCallback(
    (delta: number) => {
      stepSlice(delta);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);

      holdTimerRef.current = setTimeout(() => {
        holdIntervalRef.current = setInterval(() => {
          stepSlice(delta);
        }, 45);
      }, 220);
    },
    [stepSlice]
  );

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    holdTimerRef.current = null;
    holdIntervalRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopHold();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [stopHold]);

  /**
   * Update slice position from pointer clientY
   */
  const updateFromPointerY = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const height = rect.height;
      if (height <= 0) return;

      const relY = Math.max(0, Math.min(height, clientY - rect.top));
      const fracFromBottom = 1 - relY / height;

      if (is3D) {
        const depth = Math.round((1 - fracFromBottom) * 2.0 * 100) / 100;
        setClipPlane({ depth });
        return;
      }

      const targetVox = Math.round(fracFromBottom * maxVox);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        applyVoxel(axis, targetVox);
      });
    },
    [is3D, setClipPlane, maxVox, applyVoxel, axis]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    isDraggingRef.current = true;
    setIsDragging(true);
    setIsProgrammaticChange(true);
    updateFromPointerY(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    updateFromPointerY(e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
      setTimeout(() => {
        setIsProgrammaticChange(false);
      }, 50);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      stepSlice(1);
    } else if (e.deltaY > 0) {
      stepSlice(-1);
    }
  };

  const handleResetAC = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nv = getNiivue();
    if (!nv) return;

    setIsProgrammaticChange(true);
    resetCrosshair();

    try {
      const frac = nv.mm2frac([0, 0, 0], 0);
      nv.scene.crosshairPos = frac;
      nv.drawScene();
    } catch (err) {
      console.warn("[SliceScrollbar] Reset AC failed:", err);
    } finally {
      setTimeout(() => {
        setIsProgrammaticChange(false);
      }, 50);
    }
  };

  // Minimized floating pill state
  if (isCollapsed) {
    return (
      <div className={`absolute top-28 right-2 z-20 pointer-events-auto ${className}`}>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 shadow-lg backdrop-blur-md text-[10px] font-semibold ${axisColorTheme.text} transition active:scale-95`}
          title="Mở lại thanh cuộn lát cắt"
        >
          <span>🎚️</span>
          <span className="font-mono">{is3D ? "3D" : `${axis.toUpperCase()}:${currentVox + 1}`}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={handleWheel}
      className={`absolute top-28 right-2 sm:right-3 z-20 pointer-events-auto flex flex-col items-center select-none ${className}`}
    >
      {/* Compact Scrollbar Card (w-7 sm:w-8, h-[240px] sm:h-[270px]) */}
      <div className="h-[240px] sm:h-[270px] flex flex-col items-center bg-slate-900/85 hover:bg-slate-900/95 backdrop-blur-md border border-slate-700/60 hover:border-slate-500 rounded-xl shadow-xl p-1 w-7 sm:w-8 transition-all relative">
        {/* 1. Header: Axis indicator (Click to toggle Z/Y/X in multiplanar) */}
        <div className="w-full flex flex-col items-center pb-0.5 border-b border-slate-800/80 shrink-0">
          {viewMode === "multiplanar" ? (
            <button
              type="button"
              onClick={handleCycleAxis}
              className={`w-full py-0.5 rounded text-[10px] font-bold ${axisColorTheme.text} hover:bg-slate-800 transition text-center leading-none`}
              title={`Đang cuộn trục ${axisLabel} (${axis.toUpperCase()}) • Bấm để đổi sang trục khác`}
            >
              {axis.toUpperCase()}
            </button>
          ) : (
            <span className={`text-[9px] font-bold ${axisColorTheme.text} uppercase leading-none py-0.5`}>
              {is3D ? "3D" : axis.toUpperCase()}
            </span>
          )}

          {/* Slice number */}
          <span className="font-mono text-[9px] text-slate-300 font-semibold leading-tight mt-0.5">
            {is3D ? (clipPlane.depth > 2.0 ? "OFF" : clipPlane.depth.toFixed(1)) : currentVox + 1}
          </span>
        </div>

        {/* 2. Step Up (▲) Button */}
        <button
          type="button"
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="w-5 h-5 sm:w-6 sm:h-6 my-1 rounded bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center text-[9px] transition border border-slate-700/40 shrink-0"
          title="Lát sau (+1) • Nhấn giữ để cuộn nhanh"
        >
          ▲
        </button>

        {/* 3. Slim Scrollbar Track */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex-1 w-full flex items-center justify-center relative cursor-pointer touch-none py-0.5 group/track"
          title="Kéo để đổi lát cắt"
        >
          {/* Track Groove */}
          <div className="w-1.5 sm:w-2 h-full rounded-full bg-slate-950/90 border border-slate-700/60 shadow-inner relative overflow-hidden flex flex-col justify-end">
            <div
              className={`w-full bg-gradient-to-t ${axisColorTheme.fillGradient} opacity-80 transition-[height] duration-75`}
              style={{ height: `${fraction * 100}%` }}
            />
          </div>

          {/* Compact Thumb Handle */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-5 sm:w-6 h-3 sm:h-3.5 rounded-sm ${axisColorTheme.bg} ${axisColorTheme.glow} border border-white/70 flex items-center justify-center transition-[top] duration-75 shadow-md cursor-grab active:cursor-grabbing active:scale-105 z-10`}
            style={{
              top: `calc(${(1 - fraction) * 100}% - ${fraction > 0.5 ? 12 : 2}px)`,
            }}
          >
            <span className="w-2.5 h-[1px] bg-slate-950/80 rounded-full"></span>
          </div>

          {/* Floating Callout Bubble */}
          {(isDragging || isHovered) && (
            <div
              className="absolute right-full mr-2 z-30 pointer-events-none transition-opacity duration-150 animate-fadeIn"
              style={{
                top: `calc(${(1 - fraction) * 100}% - 12px)`,
              }}
            >
              <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-lg px-2 py-1 shadow-2xl text-[10px] whitespace-nowrap flex items-center gap-1.5 text-slate-100 font-medium">
                <span className={`w-1.5 h-1.5 rounded-full ${axisColorTheme.bg}`}></span>
                <span className="font-semibold">{axisLabel}:</span>
                <span className="font-mono font-bold text-white">
                  {currentVox + 1} / {maxVox + 1}
                </span>
                <span className="font-mono text-slate-400 text-[9px]">
                  ({currentMM >= 0 ? `+${currentMM}` : currentMM} mm)
                </span>
              </div>
              <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[4px] border-y-transparent border-l-[5px] border-l-slate-700/80"></div>
            </div>
          )}
        </div>

        {/* 4. Step Down (▼) Button */}
        <button
          type="button"
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="w-5 h-5 sm:w-6 sm:h-6 my-1 rounded bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center text-[9px] transition border border-slate-700/40 shrink-0"
          title="Lát trước (−1) • Nhấn giữ để cuộn nhanh"
        >
          ▼
        </button>

        {/* 5. Minimal Footer: AC Reset & Collapse */}
        <div className="w-full flex items-center justify-between pt-0.5 border-t border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={handleResetAC}
            className="w-4 h-4 rounded hover:bg-slate-800 text-amber-400 hover:text-amber-300 flex items-center justify-center text-[9px] font-bold transition"
            title="Về AC (0,0,0 mm)"
          >
            ⊙
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="w-4 h-4 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 flex items-center justify-center text-[9px] transition"
            title="Thu nhỏ"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
