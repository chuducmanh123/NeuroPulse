"use client";

import React, { useState, useEffect } from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import { useNeuroViewer } from "./NeuroViewerContext";
import type { OntologyEntry } from "../../types/neurovision";

interface CentroidData {
  [atlas: string]: {
    [label_id: string]: {
      mean_mm: [number, number, number];
      in_mask_mm: [number, number, number];
      in_mask_vox: [number, number, number];
    };
  };
}

export default function ClinicalInspector() {
  const { getNiivue } = useNeuroViewer();

  // Zustand Store
  const selectedRegion = useNeuroVisionStore((s) => s.selectedRegion);
  const crosshair = useNeuroVisionStore((s) => s.crosshair);
  const activeOverlay = useNeuroVisionStore((s) => s.activeOverlay);
  const highlightedLabelId = useNeuroVisionStore((s) => s.highlightedLabelId);

  const setHighlightedLabelId = useNeuroVisionStore((s) => s.setHighlightedLabelId);
  const setCrosshair = useNeuroVisionStore((s) => s.setCrosshair);
  const setIsProgrammaticChange = useNeuroVisionStore((s) => s.setIsProgrammaticChange);
  const setIsSidebarOpen = useNeuroVisionStore((s) => s.setIsSidebarOpen);

  const [centroids, setCentroids] = useState<CentroidData | null>(null);

  useEffect(() => {
    fetch("/neurovision/data/centroids.json")
      .then((r) => r.json())
      .then((data) => setCentroids(data))
      .catch((err) => console.warn("[ClinicalInspector] Centroids load error:", err));
  }, []);

  const [mmX, mmY, mmZ] = crosshair.mm;
  const [voxX, voxY, voxZ] = crosshair.vox;

  // Toggle reverse highlight for current region
  const handleToggleHighlight = () => {
    if (!selectedRegion) return;
    const nv = getNiivue();
    if (!nv || nv.volumes.length <= 1) return;

    const overlayVol = nv.volumes[1];
    if (highlightedLabelId === selectedRegion.label_id) {
      setHighlightedLabelId(null);
      overlayVol.cal_min = 0;
      overlayVol.cal_max = 0;
      nv.updateGLVolume();
    } else {
      setHighlightedLabelId(selectedRegion.label_id);
      overlayVol.cal_min = selectedRegion.label_id - 0.5;
      overlayVol.cal_max = selectedRegion.label_id + 0.5;
      nv.updateGLVolume();
    }
  };

  // Jump to exact in-mask centroid
  const handleJumpToCentroid = () => {
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

  const isIsolated = selectedRegion && highlightedLabelId === selectedRegion.label_id;

  return (
    <div className="w-full h-full bg-slate-900/95 border-l border-slate-800 flex flex-col text-slate-200 overflow-hidden select-none">
      {/* Header (Ẩn trên mobile < lg để tiết kiệm không gian, bật/tắt qua icon phía trên) */}
      <div className="hidden lg:flex p-2.5 sm:p-3 border-b border-slate-800 bg-slate-950/70 items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400"></div>
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-200">
            Giám sát Giải phẫu & Lâm sàng
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60">
            MNI: [{mmX}, {mmY}, {mmZ}]
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="w-5 h-5 rounded bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 flex items-center justify-center font-bold text-xs transition border border-slate-700/60"
            title="Đóng bảng lâm sàng"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-2.5 sm:space-y-4 text-xs">
        {selectedRegion ? (
          <>
            {/* 1. Name & Action Card */}
            <div className="bg-slate-950/70 p-2.5 sm:p-3.5 rounded-xl border border-slate-800 space-y-2 shadow-sm">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-semibold">
                    {selectedRegion.code || `ID: ${selectedRegion.label_id}`}
                  </span>

                  {/* Hiển thị tọa độ MNI nhỏ gọn trên mobile khi header bị ẩn */}
                  <span className="lg:hidden text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    MNI: [{mmX}, {mmY}, {mmZ}]
                  </span>
                </div>

                {/* Governance Labels with Vietnam annotations */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedRegion.review_status === "unreviewed" && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-800 font-semibold"
                      title="Nội dung tự động trích xuất từ dữ liệu chuẩn, chưa qua chuyên gia lâm sàng thẩm định"
                    >
                      chưa kiểm duyệt
                    </span>
                  )}

                  {selectedRegion.evidence_level === "approximate" && (
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/90 text-purple-300 border border-purple-800 font-semibold"
                      title="Không gian xấp xỉ do độ phân giải 1mm không giải quyết trực tiếp vi mạch"
                    >
                      ước lượng
                    </span>
                  )}

                  {selectedRegion.evidence_level === "literature" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                      y văn
                    </span>
                  )}
                </div>
              </div>

              {/* Names */}
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                  {selectedRegion.name_vi}
                </h3>
                <p className="text-xs text-sky-300 font-medium italic mt-0.5">
                  {selectedRegion.name_en}
                </p>
              </div>

              {/* Category & Aspects tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                  Phân loại: {selectedRegion.category}
                </span>
                {selectedRegion.aspects_zone && (
                  <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] font-bold border border-rose-800">
                    Vùng ASPECTS: {selectedRegion.aspects_zone}
                  </span>
                )}
              </div>

              {/* Interactive Reverse Highlight & Jump buttons */}
              <div className="pt-2 flex items-center gap-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={handleToggleHighlight}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    isIsolated
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/50"
                      : "bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-900/50"
                  }`}
                  title="Cô lập vùng này trên lát cắt và mô hình 3D (ẩn các nhãn khác)"
                >
                  <span>{isIsolated ? "✕ Tắt cô lập nhãn" : "🔍 Highlight ngược (Cô lập)"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleJumpToCentroid}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
                  title="Di chuyển tâm ngắm đến tâm khối giải phẫu (Centroid)"
                >
                  Đến tâm
                </button>
              </div>
            </div>

            {/* 2. Vascular Supply & Drainage */}
            <div className="bg-slate-950/40 p-2.5 sm:p-3 rounded-xl border border-slate-800 space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Động và tĩnh mạch chi phối
              </h4>

              <div className="space-y-1.5 text-[11px]">
                <div>
                  <span className="text-slate-400">Động mạch chính: </span>
                  <span className="text-slate-200 font-semibold">
                    {selectedRegion.arterial_supply?.primary?.length > 0
                      ? selectedRegion.arterial_supply.primary.join(", ")
                      : "Chưa phân tích trực tiếp trên atlas"}
                  </span>
                </div>

                {selectedRegion.arterial_supply?.perforators?.length > 0 && (
                  <div>
                    <span className="text-slate-400">Nhánh xuyên (Perforators): </span>
                    <span className="text-amber-300">
                      {selectedRegion.arterial_supply.perforators.join(", ")}
                    </span>
                    <span className="ml-1 text-[9px] text-purple-400 font-mono">(ước lượng)</span>
                  </div>
                )}

                {selectedRegion.venous_drainage?.length > 0 && (
                  <div>
                    <span className="text-slate-400">Dẫn lưu tĩnh mạch: </span>
                    <span className="text-sky-300">
                      {selectedRegion.venous_drainage.join(", ")}
                    </span>
                    <span className="ml-1 text-[9px] text-purple-400 font-mono">(ước lượng)</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Functions & Brodmann Areas (Ẩn khi xem HCP Glasser hoặc Brainnetome do đã có khung chuyên biệt) */}
            {!selectedRegion.hcp_metrics && !selectedRegion.brainnetome_metrics && (selectedRegion.brodmann_area?.length > 0 || selectedRegion.functions?.length > 0) && (
              <div className="bg-slate-950/40 p-2.5 sm:p-3 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Chức năng sinh lý thần kinh
                </h4>

                {selectedRegion.brodmann_area?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedRegion.brodmann_area.map((ba) => (
                      <span key={ba} className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono">
                        {ba}
                      </span>
                    ))}
                  </div>
                )}

                {selectedRegion.functions?.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                    {selectedRegion.functions.map((fn, idx) => (
                      <li key={idx}>{fn}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 3B. HCP Glasser 2016 Dedicated Characterization */}
            {selectedRegion.hcp_metrics && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-teal-800/60 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                    HCP-MMP1.0 Glasser 2016
                  </h4>
                </div>

                <div className="text-[10.5px] bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-medium">Khu vực vĩ mô: </span>
                  <span className="text-teal-200 font-semibold">{selectedRegion.hcp_metrics.macro_region}</span>
                </div>

                {selectedRegion.hcp_metrics.synonyms?.length > 0 && (
                  <div>
                    <span className="text-[9.5px] text-slate-400 block mb-1">Đồng nghĩa y văn:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedRegion.hcp_metrics.synonyms.map((syn, sIdx) => (
                        <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[9.5px]">
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 space-y-0.5">
                    <span className="text-slate-400 block text-[9px]">Myelin vỏ não:</span>
                    <span className="text-amber-300 font-semibold block">{selectedRegion.hcp_metrics.myelin_profile}</span>
                  </div>
                  <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 space-y-0.5">
                    <span className="text-slate-400 block text-[9px]">Độ dày vỏ não:</span>
                    <span className="text-sky-300 font-semibold block">{selectedRegion.hcp_metrics.cortical_thickness}</span>
                  </div>
                </div>

                {selectedRegion.hcp_metrics.task_contrasts?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[9.5px] text-slate-400 block">Tác vụ fMRI kích hoạt:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedRegion.hcp_metrics.task_contrasts.map((tc, tcIdx) => (
                        <span key={tcIdx} className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/70 font-mono text-[9px] font-medium">
                          ⚡ {tc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRegion.hcp_metrics.original_profile && (
                  <div className="bg-slate-900/80 p-2 rounded-lg border-l-2 border-l-teal-500 border-slate-800 text-[10px] italic text-slate-300 leading-relaxed">
                    &ldquo;{selectedRegion.hcp_metrics.original_profile}&rdquo;
                  </div>
                )}
              </div>
            )}

            {/* 3C. Brainnetome Atlas Dedicated Connectivity & Behavior */}
            {selectedRegion.brainnetome_metrics && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-indigo-800/60 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    Brainnetome Atlas (BNA 2016)
                  </h4>
                </div>

                <div className="text-[10.5px] bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Cấu trúc: </span>
                  <span className="text-slate-200 font-semibold">{selectedRegion.brainnetome_metrics.lobe} &bull; {selectedRegion.brainnetome_metrics.gyrus}</span>
                </div>

                <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 space-y-0.5">
                  <span className="text-[9px] text-slate-400 block">Mạng chức năng Yeo 7 Networks:</span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 text-[10px] font-bold">
                      🌐 {selectedRegion.brainnetome_metrics.yeo_network_7}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {selectedRegion.brainnetome_metrics.yeo_network_overlap_pct}%
                    </span>
                  </div>
                </div>

                {selectedRegion.brainnetome_metrics.behavioral_domains && (
                  <div className="space-y-1">
                    <span className="text-[9.5px] text-slate-400 block font-medium">Xác suất hành vi (BrainMap):</span>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                      <div style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.cognition}%` }} className="bg-sky-500 h-full" />
                      <div style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.action}%` }} className="bg-amber-500 h-full" />
                      <div style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.perception}%` }} className="bg-emerald-500 h-full" />
                      <div style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.emotion}%` }} className="bg-rose-500 h-full" />
                      <div style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.interoception}%` }} className="bg-purple-500 h-full" />
                    </div>

                    <div className="grid grid-cols-2 gap-1 text-[9.5px] pt-0.5">
                      <span className="text-slate-300"><span className="text-sky-400 font-bold">●</span> Nhận thức: {selectedRegion.brainnetome_metrics.behavioral_domains.cognition}%</span>
                      <span className="text-slate-300"><span className="text-amber-400 font-bold">●</span> Vận động: {selectedRegion.brainnetome_metrics.behavioral_domains.action}%</span>
                      <span className="text-slate-300"><span className="text-emerald-400 font-bold">●</span> Cảm giác: {selectedRegion.brainnetome_metrics.behavioral_domains.perception}%</span>
                      <span className="text-slate-300"><span className="text-rose-400 font-bold">●</span> Cảm xúc: {selectedRegion.brainnetome_metrics.behavioral_domains.emotion}%</span>
                      <span className="text-slate-300 col-span-2"><span className="text-purple-400 font-bold">●</span> Nội quan: {selectedRegion.brainnetome_metrics.behavioral_domains.interoception}%</span>
                    </div>
                  </div>
                )}

                {selectedRegion.brainnetome_metrics.primary_subdomains?.length > 0 && (
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block">Tiểu miền nổi trội:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedRegion.brainnetome_metrics.primary_subdomains.map((sub, sIdx) => (
                        <span key={sIdx} className="px-1.5 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 font-mono text-[9px]">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Clinical Syndromes / Symptoms */}
            {selectedRegion.clinical_syndromes?.length > 0 && (
              <div className="bg-slate-950/40 p-2.5 sm:p-3 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Triệu chứng và hội chứng khi tổn thương
                </h4>

                <div className="space-y-2">
                  {selectedRegion.clinical_syndromes.map((syn, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-2 sm:p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                      {syn.name ? <p className="font-bold text-amber-300">{syn.name}</p> : null}
                      <p className="text-slate-300 text-[10.5px] leading-relaxed">{syn.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Provenance & Citations */}
            {selectedRegion.source?.length > 0 && (
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-[10px]">
                <h4 className="font-bold uppercase tracking-wider text-slate-400">
                  Nguồn dữ liệu y văn & Atlas:
                </h4>
                <ul className="space-y-1 text-slate-400">
                  {selectedRegion.source.map((src, idx) => (
                    <li key={idx} className="flex items-start gap-1 font-mono">
                      <span className="text-sky-500">•</span>
                      <span>{src}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 text-slate-500 space-y-2 sm:space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 text-lg sm:text-xl">
              🎯
            </div>
            <div>
              <p className="text-slate-300 font-semibold mb-1 text-xs sm:text-sm">Chưa chọn vùng giải phẫu</p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 leading-relaxed max-w-xs">
                {activeOverlay === "none"
                  ? "Hãy chọn một lớp phủ Atlas ở thanh công cụ để tra cứu thông tin giải phẫu."
                  : "Chạm lên lát cắt hoặc tìm kiếm trên thanh tìm kiếm để xem giải phẫu & lâm sàng."}
              </p>
            </div>
            <div className="bg-slate-950/80 p-2 sm:p-2.5 rounded-lg border border-slate-800/80 text-[10px] sm:text-[11px] font-mono text-slate-400 space-y-0.5 sm:space-y-1">
              <div>Voxel: [{voxX}, {voxY}, {voxZ}]</div>
              <div>MNI152: [{mmX}, {mmY}, {mmZ}] mm</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
