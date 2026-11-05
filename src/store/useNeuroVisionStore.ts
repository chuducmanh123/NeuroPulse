import { create } from 'zustand';
import type {
  BaseModality,
  ActiveOverlay,
  ViewMode,
  CrosshairPosition,
  ClipPlaneState,
  OntologyEntry,
} from '../types/neurovision';

export interface VolumeDimensions {
  dims: [number, number, number];    // e.g. [193, 229, 193]
  minMM: [number, number, number];   // e.g. [-96, -132, -78]
  maxMM: [number, number, number];   // e.g. [96, 96, 114]
}

export interface NeuroVisionState {
  // 1. Modality & Overlays
  baseModality: BaseModality;
  activeOverlay: ActiveOverlay;
  overlayOpacity: number; // 0.0 - 1.0

  // 2. Viewport & Navigation
  viewMode: ViewMode;
  activeSliceAxis: 'x' | 'y' | 'z'; // Active axis for slice scrolling ('z': Axial, 'y': Coronal, 'x': Sagittal)
  crosshair: CrosshairPosition;
  isProgrammaticChange: boolean; // Flag to prevent slider <-> onLocationChange feedback loops
  volumeDimensions: VolumeDimensions | null;

  // 3. Clinical & Anatomical Selection
  selectedRegion: OntologyEntry | null;
  highlightedLabelId: number | null; // Phase 3 search / hover integration

  // 4. ASPECTS & pc-ASPECTS Tool (Phase 3)
  isAspectsModalOpen: boolean;
  aspectsMode: 'aspects' | 'pc-aspects';
  aspectsHemisphere: 'left' | 'right';
  affectedAspects: string[];     // Keys: 'C', 'L', 'IC', 'I', 'M1'...'M6'
  affectedPcAspects: string[];   // Keys: 'midbrain', 'pons', etc.

  // 5. 3D Clip Plane
  clipPlane: ClipPlaneState;

  // 6. 3D Surface Mesh
  activeMesh: string | null;

  // 7. UI Controls & Responsiveness
  isSlidersOpen: boolean; // Bottom XYZ / Clip sliders drawer (only open when needed)
  isSidebarOpen: boolean; // Clinical Inspector sidebar

  // 8. Runtime Diagnostics
  fps: number;
  isLoading: boolean;
  loadProgress: string;

  // Actions
  setBaseModality: (modality: BaseModality) => void;
  setActiveOverlay: (overlay: ActiveOverlay) => void;
  setOverlayOpacity: (opacity: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setActiveSliceAxis: (axis: 'x' | 'y' | 'z') => void;
  setCrosshair: (crosshair: CrosshairPosition) => void;
  setIsProgrammaticChange: (flag: boolean) => void;
  setVolumeDimensions: (dims: VolumeDimensions) => void;
  setSelectedRegion: (region: OntologyEntry | null) => void;
  setHighlightedLabelId: (id: number | null) => void;
  setIsSlidersOpen: (open: boolean) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setAspectsModalOpen: (open: boolean) => void;
  setAspectsMode: (mode: 'aspects' | 'pc-aspects') => void;
  setAspectsHemisphere: (hemi: 'left' | 'right') => void;
  toggleAspectsRegion: (key: string) => void;
  togglePcAspectsRegion: (key: string) => void;
  resetAspectsScores: () => void;
  setClipPlane: (plane: Partial<ClipPlaneState>) => void;
  setActiveMesh: (mesh: string | null) => void;
  setFps: (fps: number) => void;
  setLoading: (loading: boolean, progress?: string) => void;
  resetCrosshair: () => void;
}

const DEFAULT_CROSSHAIR: CrosshairPosition = {
  mm: [0, 0, 0],       // Anterior Commissure in MNI space
  vox: [96, 114, 96],  // Center voxel in 193x229x193 grid
};

const DEFAULT_CLIP_PLANE: ClipPlaneState = {
  depth: 2.5,          // >2.0 disables clipping in NiiVue
  azimuth: 0,
  elevation: 0,
};

export const useNeuroVisionStore = create<NeuroVisionState>((set) => ({
  // Defaults
  baseModality: 'T1',
  activeOverlay: 'none',
  overlayOpacity: 0.7,

  viewMode: 'multiplanar',
  activeSliceAxis: 'z',
  crosshair: DEFAULT_CROSSHAIR,
  isProgrammaticChange: false,
  volumeDimensions: {
    dims: [193, 229, 193],
    minMM: [-96, -132, -78],
    maxMM: [96, 96, 114],
  },

  selectedRegion: null,
  highlightedLabelId: null,

  isAspectsModalOpen: false,
  aspectsMode: 'aspects',
  aspectsHemisphere: 'left',
  affectedAspects: [],
  affectedPcAspects: [],

  clipPlane: DEFAULT_CLIP_PLANE,
  activeMesh: null,

  isSlidersOpen: false, // Hidden by default, only shown when requested by user
  isSidebarOpen: true,

  fps: 0,
  isLoading: false,
  loadProgress: '',

  // Setters
  setBaseModality: (modality) => set({ baseModality: modality }),
  setActiveOverlay: (overlay) => set({ activeOverlay: overlay }),
  setOverlayOpacity: (opacity) => set({ overlayOpacity: Math.max(0, Math.min(1, opacity)) }),
  setViewMode: (mode) =>
    set((state) => {
      let nextAxis = state.activeSliceAxis;
      if (mode === 'axial') nextAxis = 'z';
      else if (mode === 'coronal') nextAxis = 'y';
      else if (mode === 'sagittal') nextAxis = 'x';
      return { viewMode: mode, activeSliceAxis: nextAxis };
    }),
  setActiveSliceAxis: (axis) => set({ activeSliceAxis: axis }),
  setCrosshair: (crosshair) => set({ crosshair }),
  setIsProgrammaticChange: (flag) => set({ isProgrammaticChange: flag }),
  setVolumeDimensions: (dims) => set({ volumeDimensions: dims }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setHighlightedLabelId: (id) => set({ highlightedLabelId: id }),
  setIsSlidersOpen: (open) => set({ isSlidersOpen: open }),
  setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),

  setAspectsModalOpen: (open) => set({ isAspectsModalOpen: open }),
  setAspectsMode: (mode) => set({ aspectsMode: mode }),
  setAspectsHemisphere: (hemi) => set({ aspectsHemisphere: hemi }),
  toggleAspectsRegion: (key) =>
    set((state) => ({
      affectedAspects: state.affectedAspects.includes(key)
        ? state.affectedAspects.filter((k) => k !== key)
        : [...state.affectedAspects, key],
    })),
  togglePcAspectsRegion: (key) =>
    set((state) => ({
      affectedPcAspects: state.affectedPcAspects.includes(key)
        ? state.affectedPcAspects.filter((k) => k !== key)
        : [...state.affectedPcAspects, key],
    })),
  resetAspectsScores: () => set({ affectedAspects: [], affectedPcAspects: [] }),
  setClipPlane: (plane) =>
    set((state) => ({
      clipPlane: { ...state.clipPlane, ...plane },
    })),
  setActiveMesh: (mesh) => set({ activeMesh: mesh }),
  setFps: (fps) => set({ fps }),
  setLoading: (isLoading, loadProgress = '') => set({ isLoading, loadProgress }),
  resetCrosshair: () =>
    set({
      crosshair: DEFAULT_CROSSHAIR,
      clipPlane: DEFAULT_CLIP_PLANE,
    }),
}));
