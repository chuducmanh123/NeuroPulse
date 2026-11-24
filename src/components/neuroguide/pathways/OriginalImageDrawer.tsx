"use client";

import React, { useEffect, useState } from "react";
import { Maximize2, RotateCcw, X, ZoomIn, ZoomOut, ImageOff } from "lucide-react";

interface OriginalImageDrawerProps {
  imageUrl: string;
  title: string;
  sourceLabel: string;
  mode: "split" | "lightbox";
  isOpen: boolean;
  onClose: () => void;
  onExpandToLightbox?: () => void;
}

export function OriginalImageDrawer({
  imageUrl,
  title,
  sourceLabel,
  mode,
  isOpen,
  onClose,
  onExpandToLightbox,
}: OriginalImageDrawerProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    setImgError(false);
  }, [imageUrl]);

  useEffect(() => {
    if (!isOpen || mode !== "lightbox") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, mode, onClose]);

  if (!isOpen) return null;

  const zoomOut = () => setZoom((z) => Math.max(50, z - 25));
  const zoomIn = () => setZoom((z) => Math.min(250, z + 25));
  const resetZoom = () => setZoom(100);

  const imageStage = imgError ? (
    <div className="flex flex-col items-center justify-center p-10 text-center text-[var(--text-muted)]">
      <ImageOff size={28} className="mb-2 opacity-60" />
      <p className="text-xs font-medium">Không thể tải ảnh lưu đồ gốc.</p>
      <p className="text-[11px] opacity-75 mt-1 break-all">{imageUrl}</p>
    </div>
  ) : (
    <div className="p-3 flex items-start justify-center min-h-[240px]">
      <img
        src={imageUrl}
        alt={title}
        onError={() => setImgError(true)}
        style={{ width: `${zoom}%`, maxWidth: "none" }}
        className="rounded-lg shadow-xs border border-[var(--border-hairline)] bg-white object-contain transition-[width] duration-150"
      />
    </div>
  );

  if (mode === "lightbox") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-xs"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Original Flowchart — ${title}`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/15 bg-black/50 text-white">
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{title}</p>
            <p className="text-[11px] text-white/70 truncate">{sourceLabel}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= 50}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono w-11 text-center">{zoom}%</span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= 250}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Reset zoom"
            >
              <RotateCcw size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div
          className="flex-1 overflow-auto p-4 flex items-start justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {imgError ? (
            <div className="text-white/75 text-sm p-10 text-center">
              Không thể tải ảnh lưu đồ gốc.
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={title}
              onError={() => setImgError(true)}
              style={{ width: `${zoom}%`, maxWidth: "none" }}
              className="rounded-xl bg-white shadow-2xl object-contain transition-[width] duration-150"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <aside className="lg:sticky lg:top-20 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden shadow-2xs">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--text-ink)] truncate">
            Original Flowchart
          </p>
          <p className="text-[11px] text-[var(--text-muted)] truncate">{sourceLabel}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= 50}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] disabled:opacity-40 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] w-9 text-center">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= 250}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] disabled:opacity-40 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors"
            title="Reset zoom"
          >
            <RotateCcw size={13} />
          </button>
          {onExpandToLightbox && (
            <button
              type="button"
              onClick={onExpandToLightbox}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors"
              title="Open fullscreen lightbox"
            >
              <Maximize2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-ink)] hover:bg-[var(--bg-surface)] transition-colors"
            title="Hide original image"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="max-h-[72vh] overflow-auto bg-[var(--bg-subtle)]/60">
        {imageStage}
      </div>
    </aside>
  );
}
