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
    ring: "focus:ring-sky-400",
    glow: "shadow-[0_0_12px_rgba(56,189,248,0.45)]",
    pillActive: "bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/30",
    pillInactive: "text-slate-400 hover:text-sky-300 hover:bg-slate-800/80",
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
      ring: "focus:ring-emerald-400",
      glow: "shadow-[0_0_12px_rgba(52,211,153,0.45)]",
      pillActive: "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30",
      pillInactive: "text-slate-400 hover:text-emerald-300 hover:bg-slate-800/80",
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
      ring: "focus:ring-rose-400",
      glow: "shadow-[0_0_12px_rgba(251,113,133,0.45)]",
      pillActive: "bg-rose-500 text-slate-950 font-bold shadow-md shadow-rose-500/30",
      pillInactive: "text-slate-400 hover:text-rose-300 hover:bg-slate-800/80",
      fillGradient: "from-rose-600 to-rose-400",
    };
  }

  // Fraction for track & thumb:
  // For 2D: bottom = 0 (Inferior/Posterior/Left), top = max (Superior/Anterior/Right)
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

  // Clean up timers on unmount
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

      // Pointer position: 0 at top of track, height at bottom
      const relY = Math.max(0, Math.min(height, clientY - rect.top));
      // Top is max slice (Superior/Anterior/Right), Bottom is 0 (Inferior/Posterior/Left)
      const fracFromBottom = 1 - relY / height;

      if (is3D) {
        // 3D mode: depth 0 to 2.0 (or 2.5)
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

  /**
   * Pointer down on track (mouse, touch on mobile/ipad, stylus)
   */
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

  /**
   * Mouse wheel on scrollbar container
   */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      stepSlice(1);
    } else if (e.deltaY > 0) {
      stepSlice(-1);
    }
  };

  /**
   * Reset to Anterior Commissure (AC: 0,0,0 mm)
   */
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

  // Minimized state on small screens if user collapses it
  if (isCollapsed) {
    return (
      <div className={`absolute top-28 right-2 z-20 pointer-events-auto ${className}`}>
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs font-semibold ${axisColorTheme.text} transition active:scale-95`}
          title="Mở thanh cuộn lát cắt"
        >
          <span>🎚️</span>
          <span className="font-mono text-[11px]">
            {is3D ? "3D" : `${axis.toUpperCase()}:${currentVox + 1}`}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={handleWheel}
      className={`absolute top-28 bottom-4 right-2 sm:right-3 z-20 pointer-events-auto flex flex-col items-center select-none ${className}`}
    >
      {/* Scrollbar Card Container */}
      <div className="h-full flex flex-col items-center bg-slate-900/90 hover:bg-slate-900/95 backdrop-blur-md border border-slate-700/70 hover:border-slate-600 rounded-2xl shadow-2xl p-1 sm:p-1.5 w-10 sm:w-12 transition-all relative">
        {/* 1. Header: Axis Switcher or Plane Label */}
        <div className="w-full flex flex-col items-center gap-1 pb-1 border-b border-slate-800/80 shrink-0">
          {viewMode === "multiplanar" ? (
            /* Multiplanar 3-Axis Switcher Pill */
            <div className="flex flex-col gap-0.5 w-full">
              {(["z", "y", "x"] as const).map((axKey) => {
                const isActive = axis === axKey;
                const keyLabel = axKey === "z" ? "Z" : axKey === "y" ? "Y" : "X";
                const activeClasses =
                  axKey === "z"
                    ? "bg-sky-500 text-slate-950 font-bold shadow-sm shadow-sky-500/40"
                    : axKey === "y"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/40"
                    : "bg-rose-500 text-slate-950 font-bold shadow-sm shadow-rose-500/40";

                return (
                  <button
                    key={axKey}
                    type="button"
                    onClick={() => setActiveSliceAxis(axKey)}
                    className={`w-full py-0.5 rounded text-[10px] font-bold transition text-center ${
                      isActive ? activeClasses : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
                    }`}
                    title={`Chọn trục ${axKey === "z" ? "Axial (Z)" : axKey === "y" ? "Coronal (Y)" : "Sagittal (X)"}`}
                  >
                    {keyLabel}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Single Plane Badge */
            <div className="flex flex-col items-center">
              <span className={`text-[10px] font-bold ${axisColorTheme.text} uppercase tracking-wider leading-none`}>
                {is3D ? "3D" : axis.toUpperCase()}
              </span>
            </div>
          )}

          {/* Current Slice Indicator (Compact) */}
          <div className="text-center font-mono text-[9px] text-slate-300 font-semibold leading-tight mt-0.5">
            {is3D ? (
              <span className="text-[8px] text-indigo-300">
                {clipPlane.depth > 2.0 ? "OFF" : clipPlane.depth.toFixed(1)}
              </span>
            ) : (
              <span>{currentVox + 1}</span>
            )}
          </div>
        </div>

        {/* 2. Step Up (Superior / Anterior / Next) Button */}
        <button
          type="button"
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className={`w-7 h-7 sm:w-8 sm:h-8 my-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-xs transition border border-slate-700/50 hover:border-slate-500 hover:${axisColorTheme.text} shrink-0`}
          title="Lát sau (+1) • Nhấn giữ để cuộn nhanh"
        >
          ▲
        </button>

        {/* 3. The Vertical Scrollbar Track */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex-1 w-full flex items-center justify-center relative cursor-pointer touch-none py-1 group/track"
          title="Kéo thanh cuộn hoặc chạm để đổi lát cắt"
        >
          {/* Background Groove */}
          <div className="w-2 sm:w-2.5 h-full rounded-full bg-slate-950/90 border border-slate-700/60 shadow-inner relative overflow-hidden flex flex-col justify-end">
            {/* Filled Progress Bar from Bottom */}
            <div
              className={`w-full bg-gradient-to-t ${axisColorTheme.fillGradient} opacity-75 transition-[height] duration-75`}
              style={{ height: `${fraction * 100}%` }}
            />
          </div>

          {/* Draggable Thumb / Handle */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-7 sm:w-8 h-4 sm:h-5 rounded-md ${axisColorTheme.bg} ${axisColorTheme.glow} border border-white/60 flex items-center justify-center transition-[top] duration-75 shadow-lg cursor-grab active:cursor-grabbing active:scale-105 z-10`}
            style={{
              top: `calc(${(1 - fraction) * 100}% - ${fraction > 0.5 ? 16 : 4}px)`,
            }}
          >
            {/* Grip Ribs */}
            <div className="flex flex-col gap-[2px] opacity-80 pointer-events-none">
              <span className="w-3.5 h-[1.5px] bg-slate-950 rounded-full"></span>
              <span className="w-3.5 h-[1.5px] bg-slate-950 rounded-full"></span>
            </div>
          </div>

          {/* Live Floating Callout Bubble (Appears to the left of the scrollbar during drag or hover) */}
          {(isDragging || isHovered) && (
            <div
              className="absolute right-full mr-2.5 z-30 pointer-events-none transition-opacity duration-150 animate-fadeIn"
              style={{
                top: `calc(${(1 - fraction) * 100}% - 14px)`,
              }}
            >
              <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-1.5 shadow-2xl text-[11px] whitespace-nowrap flex items-center gap-1.5 text-slate-100 font-medium">
                <span className={`w-2 h-2 rounded-full ${axisColorTheme.bg}`}></span>
                <span className="font-semibold">{axisLabel}:</span>
                <span className="font-mono font-bold text-white">
                  {currentVox + 1} / {maxVox + 1}
                </span>
                <span className="font-mono text-slate-400 text-[10px]">
                  ({currentMM >= 0 ? `+${currentMM}` : currentMM} mm)
                </span>
              </div>
              {/* Triangular Pointer Arrow */}
              <div className="absolute right-[-5px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-l-[6px] border-l-slate-700/80"></div>
            </div>
          )}
        </div>

        {/* 4. Step Down (Inferior / Posterior / Prev) Button */}
        <button
          type="button"
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className={`w-7 h-7 sm:w-8 sm:h-8 my-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 flex items-center justify-center font-bold text-xs transition border border-slate-700/50 hover:border-slate-500 hover:${axisColorTheme.text} shrink-0`}
          title="Lát trước (−1) • Nhấn giữ để cuộn nhanh"
        >
          ▼
        </button>

        {/* 5. Footer Quick Actions (AC Reset & Collapse) */}
        <div className="w-full flex items-center justify-between pt-1 border-t border-slate-800/80 shrink-0 gap-0.5">
          <button
            type="button"
            onClick={handleResetAC}
            className="w-5 h-5 rounded hover:bg-slate-800 text-amber-400 hover:text-amber-300 flex items-center justify-center text-[10px] font-bold transition"
            title="Đưa tâm ngắm về Mép trước AC (0, 0, 0 mm)"
          >
            ⊙
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="w-5 h-5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300 flex items-center justify-center text-[11px] font-bold transition"
            title="Thu gọn thanh cuộn"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
