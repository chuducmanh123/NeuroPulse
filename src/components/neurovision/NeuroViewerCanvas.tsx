"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Niivue, SLICE_TYPE } from "@niivue/niivue";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import { useNeuroViewer } from "./NeuroViewerContext";
import { loadWithCache } from "../../lib/niivue-cache";
import SliceScrollbar from "./SliceScrollbar";
import type { OntologyEntry, NeuroOntology, ViewMode } from "../../types/neurovision";

interface NeuroViewerCanvasProps {
  className?: string;
  darkMode?: boolean;
}

const VIEW_MODE_MAP: Record<ViewMode, SLICE_TYPE> = {
  multiplanar: SLICE_TYPE.MULTIPLANAR,
  axial: SLICE_TYPE.AXIAL,
  coronal: SLICE_TYPE.CORONAL,
  sagittal: SLICE_TYPE.SAGITTAL,
  "3d": SLICE_TYPE.RENDER,
};

export default function NeuroViewerCanvas({ className = "", darkMode = true }: NeuroViewerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { setNiivue } = useNeuroViewer();

  // Zustand Store
  const baseModality = useNeuroVisionStore((s) => s.baseModality);
  const activeOverlay = useNeuroVisionStore((s) => s.activeOverlay);
  const overlayOpacity = useNeuroVisionStore((s) => s.overlayOpacity);
  const viewMode = useNeuroVisionStore((s) => s.viewMode);
  const clipPlane = useNeuroVisionStore((s) => s.clipPlane);
  const activeMesh = useNeuroVisionStore((s) => s.activeMesh);
  const highlightedLabelId = useNeuroVisionStore((s) => s.highlightedLabelId);
  const isProgrammaticChange = useNeuroVisionStore((s) => s.isProgrammaticChange);
  const isSlidersOpen = useNeuroVisionStore((s) => s.isSlidersOpen);
  const isLoading = useNeuroVisionStore((s) => s.isLoading);
  const loadProgress = useNeuroVisionStore((s) => s.loadProgress);

  const setCrosshair = useNeuroVisionStore((s) => s.setCrosshair);
  const setSelectedRegion = useNeuroVisionStore((s) => s.setSelectedRegion);
  const setVolumeDimensions = useNeuroVisionStore((s) => s.setVolumeDimensions);
  const setFps = useNeuroVisionStore((s) => s.setFps);
  const setLoading = useNeuroVisionStore((s) => s.setLoading);
  const setIsSlidersOpen = useNeuroVisionStore((s) => s.setIsSlidersOpen);
  const setActiveSliceAxis = useNeuroVisionStore((s) => s.setActiveSliceAxis);

  // Local refs
  const nvInstanceRef = useRef<Niivue | null>(null);
  const ontologyMapRef = useRef<Map<string, OntologyEntry>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentColormapRef = useRef<any>(null);
  const isProgrammaticRef = useRef(isProgrammaticChange);
  isProgrammaticRef.current = isProgrammaticChange;

  const [canvasReady, setCanvasReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // 1. Load Neuro Ontology Map
  useEffect(() => {
    let isMounted = true;
    fetch("/neurovision/data/neuro_ontology.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<NeuroOntology>;
      })
      .then((data) => {
        if (!isMounted) return;
        const map = new Map<string, OntologyEntry>();
        for (const entry of data.entries) {
          map.set(`${entry.atlas}:${entry.label_id}`, entry);
        }
        ontologyMapRef.current = map;
      })
      .catch((err) => {
        console.warn("[NeuroViewer] Failed to load neuro_ontology.json:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize Niivue instance
  useEffect(() => {
    if (!canvasRef.current) return;

    const backRgba = darkMode
      ? [0.08, 0.09, 0.12, 1.0]
      : [0.94, 0.95, 0.98, 1.0];

    const nv = new Niivue({
      backColor: backRgba,
      show3Dcrosshair: true,
      crosshairColor: [0.18, 0.8, 1.0, 0.85], // Bright medical cyan
      crosshairWidth: 1.2,
      isColorbar: false,
      textHeight: 0.035,
      loadingText: "", // Rendered cleanly via HTML overlay with full UTF-8 Vietnamese font
      scrollRequiresFocus: false, // Instant wheel slice scrolling on PC/touchpads without requiring prior click
    });

    nv.attachToCanvas(canvasRef.current);
    nvInstanceRef.current = nv;
    setNiivue(nv);
    setCanvasReady(true);

    // Frame-rate measurement
    let frameCounter = 0;
    let lastFpsTime = performance.now();
    let animId: number;

    const fpsLoop = () => {
      frameCounter++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        const measuredFps = Math.round((frameCounter * 1000) / (now - lastFpsTime));
        setFps(measuredFps);
        frameCounter = 0;
        lastFpsTime = now;
      }
      animId = requestAnimationFrame(fpsLoop);
    };
    animId = requestAnimationFrame(fpsLoop);

    // Location Change Callback
    nv.onLocationChange = (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const d = data as {
        mm?: number[];
        vox?: number[];
        values?: Array<{ name: string; value: number }>;
      };

      if (d.mm && d.vox) {
        const mm: [number, number, number] = [
          Math.round(d.mm[0] * 10) / 10,
          Math.round(d.mm[1] * 10) / 10,
          Math.round(d.mm[2] * 10) / 10,
        ];
        const vox: [number, number, number] = [
          Math.round(d.vox[0]),
          Math.round(d.vox[1]),
          Math.round(d.vox[2]),
        ];

        if (!isProgrammaticRef.current) {
          setCrosshair({ mm, vox });
        }
      }

      // Atlas Region Query
      const currentActiveOverlay = useNeuroVisionStore.getState().activeOverlay;
      if (currentActiveOverlay !== "none" && d.values && d.values.length > 1) {
        const rawVal = d.values[1]?.value;
        const labelId = Math.round(rawVal || 0);
        if (labelId > 0) {
          const entry = ontologyMapRef.current.get(`${currentActiveOverlay}:${labelId}`);
          setSelectedRegion(entry || null);
        } else {
          setSelectedRegion(null);
        }
      } else {
        setSelectedRegion(null);
      }
    };

    return () => {
      cancelAnimationFrame(animId);
      setNiivue(null);
      nvInstanceRef.current = null;
    };
  }, [setNiivue, setCrosshair, setSelectedRegion, setFps, darkMode]);

  // 3. Update Theme Background Color
  useEffect(() => {
    const nv = nvInstanceRef.current;
    if (!nv) return;
    const backRgba = darkMode
      ? [0.08, 0.09, 0.12, 1.0]
      : [0.94, 0.95, 0.98, 1.0];
    nv.opts.backColor = backRgba;
    nv.drawScene();
  }, [darkMode]);

  // 4. Update View Mode
  useEffect(() => {
    const nv = nvInstanceRef.current;
    if (!nv || !canvasReady) return;
    const sliceType = VIEW_MODE_MAP[viewMode] ?? SLICE_TYPE.MULTIPLANAR;
    nv.setSliceType(sliceType);
  }, [viewMode, canvasReady]);

  // 5. Update Clip Plane
  useEffect(() => {
    const nv = nvInstanceRef.current;
    if (!nv || !canvasReady) return;
    nv.setClipPlane([clipPlane.depth, clipPlane.azimuth, clipPlane.elevation]);
  }, [clipPlane, canvasReady]);

  // 6. Load Volumes (Base Modality + Active Overlay)
  const loadVolumes = useCallback(async () => {
    const nv = nvInstanceRef.current;
    if (!nv || !canvasReady) return;

    setLoading(true, "Đang nạp volume qua IndexedDB cache...");
    setErrorMsg(null);

    try {
      // 1. Base Volume
      const baseFilename = `${baseModality}.nii.gz`;
      const baseUrl = `/neurovision/volumes/${baseFilename}`;
      const baseAsset = await loadWithCache(baseUrl, baseFilename);

      const volumeList: Array<{
        url: string;
        name: string;
        opacity?: number;
      }> = [
        {
          url: baseAsset.blobUrl,
          name: baseAsset.filename,
          opacity: 1.0,
        },
      ];

      // 2. Overlay Volume
      let overlayAsset: { blobUrl: string; filename: string } | null = null;
      let colormapJson: unknown = null;

      if (activeOverlay !== "none") {
        const overlayFilename = `${activeOverlay}.nii.gz`;
        const overlayUrl = `/neurovision/atlases/${overlayFilename}`;
        overlayAsset = await loadWithCache(overlayUrl, overlayFilename);

        // Fetch colormap (with cache busting)
        const cmRes = await fetch(`/neurovision/data/colormaps/${activeOverlay}.json?v=2026.11.5_arterial_v3`);
        if (cmRes.ok) {
          colormapJson = await cmRes.json();
        }

        volumeList.push({
          url: overlayAsset.blobUrl,
          name: overlayAsset.filename,
          opacity: overlayOpacity,
        });
      }

      await nv.loadVolumes(volumeList);

      // Apply Colormap to overlay
      if (activeOverlay !== "none" && colormapJson && nv.volumes.length > 1) {
        currentColormapRef.current = colormapJson;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const overlayVol = nv.volumes[1] as any;
        // Ensure NiiVue activates orientShaderAtlasU (label atlas shader) with 100% transparent background (index 0)
        if (overlayVol.hdr) {
          overlayVol.hdr.intent_code = 1002;
        }
        overlayVol.cal_min = 1;
        overlayVol.setColormapLabel(colormapJson);
        overlayVol.opacity = overlayOpacity;
        nv.updateGLVolume();
      } else {
        currentColormapRef.current = null;
      }

      // Update volume dimension metadata
      if (nv.volumes.length > 0) {
        const vol = nv.volumes[0];
        const dims: [number, number, number] =
          vol && vol.dims && vol.dims.length >= 4
            ? [vol.dims[1], vol.dims[2], vol.dims[3]]
            : [193, 229, 193];
        setVolumeDimensions({
          dims,
          minMM: [-96, -132, -78],
          maxMM: [96, 96, 114],
        });
      }

      // Apply view mode
      nv.setSliceType(VIEW_MODE_MAP[viewMode] ?? SLICE_TYPE.MULTIPLANAR);
      nv.drawScene();
    } catch (err) {
      console.error("[NeuroViewer] Volume loading failed:", err);
      setErrorMsg(err instanceof Error ? err.message : "Lỗi nạp volume");
    } finally {
      setLoading(false);
    }
  }, [baseModality, activeOverlay, overlayOpacity, viewMode, canvasReady, setLoading, setVolumeDimensions]);

  useEffect(() => {
    loadVolumes();
  }, [loadVolumes]);

  // 7. Update Overlay Opacity dynamically without reloading
  useEffect(() => {
    const nv = nvInstanceRef.current;
    if (!nv || nv.volumes.length < 2) return;
    nv.volumes[1].opacity = overlayOpacity;
    nv.updateGLVolume();
  }, [overlayOpacity]);

  // 8. Load Active 3D Mesh
  useEffect(() => {
    const nv = nvInstanceRef.current;
    if (!nv || !canvasReady) return;

    if (!activeMesh) {
      // Remove meshes if any
      if (nv.meshes && nv.meshes.length > 0) {
        nv.meshes = [];
        nv.drawScene();
      }
      return;
    }

    const meshFilename = activeMesh.split("/").pop() || "mesh.gii";
    loadWithCache(activeMesh, meshFilename)
      .then((asset) => {
        return nv.loadMeshes([{ url: asset.blobUrl, name: asset.filename }]);
      })
      .then(() => {
        nv.drawScene();
      })
      .catch((err) => {
        console.warn("[NeuroViewer] Mesh load failed:", err);
      });
  }, [activeMesh, canvasReady]);

  // 9. Reverse Highlight (Label Isolation via Alpha Colormap)
  useEffect(() => {
    const nv = nvInstanceRef.current;
    if (!nv || nv.volumes.length < 2 || !currentColormapRef.current) return;

    const baseCm = currentColormapRef.current;

    if (highlightedLabelId !== null && highlightedLabelId > 0) {
      // Isolate label: set Alpha=0 for all other labels, Alpha=255 for target label
      const isolatedCm = {
        ...baseCm,
        A: baseCm.I.map((labelId: number) =>
          labelId === highlightedLabelId ? 255 : 0
        ),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (nv.volumes[1] as any).setColormapLabel(isolatedCm);
      nv.updateGLVolume();
    } else {
      // Restore full colormap
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (nv.volumes[1] as any).setColormapLabel(baseCm);
      nv.updateGLVolume();
    }
  }, [highlightedLabelId]);

  // Responsive canvas resize listener for iPad, laptop, and mobile devices
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      const nv = nvInstanceRef.current;
      if (nv) {
        nv.resizeListener();
        nv.drawScene();
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Zoom controls
  const handleZoomIn = () => {
    const nv = nvInstanceRef.current;
    if (!nv) return;
    const currentZoom = nv.scene.pan2Dxyzmm ? nv.scene.pan2Dxyzmm[3] : 1.0;
    const nextZoom = Math.min(5.0, Math.round(currentZoom * 1.25 * 100) / 100);
    if (nv.scene.pan2Dxyzmm) nv.scene.pan2Dxyzmm[3] = nextZoom;
    nv.scene.volScaleMultiplier = nextZoom;
    nv.drawScene();
    setZoomLevel(nextZoom);
  };

  const handleZoomOut = () => {
    const nv = nvInstanceRef.current;
    if (!nv) return;
    const currentZoom = nv.scene.pan2Dxyzmm ? nv.scene.pan2Dxyzmm[3] : 1.0;
    const nextZoom = Math.max(0.4, Math.round((currentZoom / 1.25) * 100) / 100);
    if (nv.scene.pan2Dxyzmm) nv.scene.pan2Dxyzmm[3] = nextZoom;
    nv.scene.volScaleMultiplier = nextZoom;
    nv.drawScene();
    setZoomLevel(nextZoom);
  };

  const handleResetZoom = () => {
    const nv = nvInstanceRef.current;
    if (!nv) return;
    if (nv.scene.pan2Dxyzmm) {
      nv.scene.pan2Dxyzmm[3] = 1.0;
      nv.scene.pan2Dxyzmm[0] = 0;
      nv.scene.pan2Dxyzmm[1] = 0;
      nv.scene.pan2Dxyzmm[2] = 0;
    }
    nv.scene.volScaleMultiplier = 1.0;
    nv.drawScene();
    setZoomLevel(1.0);
  };

  /**
   * Handle canvas pointer down:
   * When in multiplanar mode, detect which tile was clicked/tapped (Axial, Coronal, Sagittal)
   * and automatically sync the active axis for the slice scrollbar.
   */
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const nv = nvInstanceRef.current;
    if (!nv || viewMode !== "multiplanar" || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tileIdx = typeof (nv as any).tileIndex === "function" ? (nv as any).tileIndex(x, y) : -1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slice = (nv as any).screenSlices && tileIdx >= 0 ? (nv as any).screenSlices[tileIdx] : null;
      if (slice && typeof slice.axCorSag === "number") {
        if (slice.axCorSag === 0) setActiveSliceAxis("z");
        else if (slice.axCorSag === 1) setActiveSliceAxis("y");
        else if (slice.axCorSag === 2) setActiveSliceAxis("x");
      }
    } catch {
      // Safe fallback
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full h-full min-h-0 bg-slate-950 overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointerDown}
        className="w-full h-full block cursor-crosshair outline-none"
        tabIndex={0}
      />

      {/* Floating Canvas Zoom Controls */}
      <div className="absolute top-3 right-2 sm:right-3 z-20 flex flex-col items-center gap-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-1 shadow-2xl select-none">
        <button
          type="button"
          onClick={handleZoomIn}
          title="Phóng to hình ảnh (+)"
          className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-sky-600 text-slate-200 hover:text-white flex items-center justify-center font-bold text-base transition active:scale-95 border border-slate-700/40 shadow-sm"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          title="Đặt lại kích thước chuẩn (100%)"
          className="px-1.5 h-6 rounded-md bg-slate-800/60 hover:bg-slate-700 text-[10px] font-mono text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 border border-slate-700/30"
        >
          {Math.round(zoomLevel * 100)}%
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          title="Thu nhỏ hình ảnh (−)"
          className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-sky-600 text-slate-200 hover:text-white flex items-center justify-center font-bold text-base transition active:scale-95 border border-slate-700/40 shadow-sm"
        >
          −
        </button>
      </div>

      {/* Floating Responsive Slice Scrollbar (PACS Slice Scroller for PC, iPad, Phone) */}
      <SliceScrollbar />

      {/* Floating Quick Action: Open Slice Sliders if hidden */}
      {!isSlidersOpen && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsSlidersOpen(true)}
            className="px-3.5 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-sky-400 shadow-2xl backdrop-blur-md flex items-center gap-2 transition active:scale-95"
            title="Mở thanh trượt điều khiển lát cắt 3 trục (X, Y, Z & 3D Clip)"
          >
            <span>🎚️</span>
            <span>Điều khiển trục cắt</span>
          </button>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-20 transition-opacity">
          <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-sky-400 tracking-wider">ĐANG TẢI DỮ LIỆU</p>
          <p className="text-xs text-slate-400 font-mono">
            {loadProgress || "Không gian chuẩn MNI152 1mm"}
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="absolute inset-x-4 top-4 bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs p-3 rounded-lg shadow-xl backdrop-blur-md z-30">
          <p className="font-semibold mb-1">Cảnh báo tải volume:</p>
          <p>{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
