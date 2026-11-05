"use client";

import React from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";

export default function ClinicalDetailsPanel() {
  const selectedRegion = useNeuroVisionStore((s) => s.selectedRegion);
  const crosshair = useNeuroVisionStore((s) => s.crosshair);
  const activeOverlay = useNeuroVisionStore((s) => s.activeOverlay);

  const [mmX, mmY, mmZ] = crosshair.mm;
  const [voxX, voxY, voxZ] = crosshair.vox;

  return (
    <div className="w-full h-full bg-slate-900/90 border-l border-slate-800 flex flex-col text-slate-200 overflow-hidden">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></div>
          <h2 className="text-xs uppercase tracking-wider font-bold text-slate-200">
            Thông tin Giải phẫu & Lâm sàng
          </h2>
        </div>
        <div className="font-mono text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
          MNI: [{mmX}, {mmY}, {mmZ}]
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {selectedRegion ? (
          <>
            {/* 1. Primary Name & Code */}
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-semibold">
                  {selectedRegion.code || `ID: ${selectedRegion.label_id}`}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-medium">
                    {selectedRegion.review_status}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-medium">
                    {selectedRegion.evidence_level}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white leading-tight">
                {selectedRegion.name_vi}
              </h3>
              <p className="text-xs text-slate-400 italic">
                {selectedRegion.name_en}
              </p>

              {/* Badges row */}
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                  Phân nhóm: {selectedRegion.category}
                </span>
                {selectedRegion.aspects_zone && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-950/80 text-rose-300 text-[10px] font-bold border border-rose-800">
                    Vùng ASPECTS: {selectedRegion.aspects_zone}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                  Atlas: {selectedRegion.atlas}
                </span>
              </div>
            </div>

            {/* 2. Vascular Supply & Drainage */}
            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
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
                    {selectedRegion.arterial_supply?.primary?.join(", ") || "Chưa xác định trực tiếp"}
                  </span>
                </div>

                {selectedRegion.arterial_supply?.perforators?.length > 0 && (
                  <div>
                    <span className="text-slate-400">Nhánh xuyên (Perforators): </span>
                    <span className="text-amber-300">
                      {selectedRegion.arterial_supply.perforators.join(", ")}
                    </span>
                  </div>
                )}

                {selectedRegion.venous_drainage?.length > 0 && (
                  <div>
                    <span className="text-slate-400">Dẫn lưu tĩnh mạch: </span>
                    <span className="text-sky-300">
                      {selectedRegion.venous_drainage.join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Brodmann & Functions (Ẩn khi xem HCP Glasser hoặc Brainnetome do đã có khung chuyên biệt) */}
            {!selectedRegion.hcp_metrics && !selectedRegion.brainnetome_metrics && (selectedRegion.brodmann_area?.length > 0 || selectedRegion.functions?.length > 0) && (
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
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
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-teal-800/60 space-y-3">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                    HCP-MMP1.0 Glasser 2016
                  </h4>
                </div>

                {/* Macro-Region */}
                <div className="text-[11px] bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-medium">Khu vực vĩ mô: </span>
                  <span className="text-teal-200 font-semibold">{selectedRegion.hcp_metrics.macro_region}</span>
                </div>

                {/* Synonyms */}
                {selectedRegion.hcp_metrics.synonyms?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Từ đồng nghĩa y văn:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedRegion.hcp_metrics.synonyms.map((syn, sIdx) => (
                        <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono text-[10px]">
                          {syn}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Microstructure Metrics Grid: Myelin & Thickness */}
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 block text-[9.5px]">Mật độ Myelin vỏ não:</span>
                    <span className="text-amber-300 font-semibold block">{selectedRegion.hcp_metrics.myelin_profile}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800/80 space-y-1">
                    <span className="text-slate-400 block text-[9.5px]">Độ dày vỏ não:</span>
                    <span className="text-sky-300 font-semibold block">{selectedRegion.hcp_metrics.cortical_thickness}</span>
                  </div>
                </div>

                {/* Task fMRI Activations */}
                {selectedRegion.hcp_metrics.task_contrasts?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">Kích hoạt tác vụ tâm lý - nhận thức (Task-fMRI):</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedRegion.hcp_metrics.task_contrasts.map((tc, tcIdx) => (
                        <span key={tcIdx} className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/70 font-mono text-[10px] font-medium">
                          ⚡ {tc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original Quote from Nature 2016 Supplementary Results */}
                {selectedRegion.hcp_metrics.original_profile && (
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border-l-2 border-l-teal-500 border-slate-800/80 text-[10.5px] italic text-slate-300 leading-relaxed">
                    &ldquo;{selectedRegion.hcp_metrics.original_profile}&rdquo;
                  </div>
                )}
              </div>
            )}

            {/* 3C. Brainnetome Atlas Dedicated Connectivity & Behavior */}
            {selectedRegion.brainnetome_metrics && (
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-indigo-800/60 space-y-3">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    Brainnetome Atlas (BNA 2016)
                  </h4>
                </div>

                {/* Lobe & Gyrus */}
                <div className="text-[11px] bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Vùng cấu trúc: </span>
                  <span className="text-slate-200 font-semibold">{selectedRegion.brainnetome_metrics.lobe} &bull; {selectedRegion.brainnetome_metrics.gyrus}</span>
                </div>

                {/* Yeo 7 Network Badge */}
                <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/90 space-y-1">
                  <span className="text-[10px] text-slate-400 block">Ánh xạ mạng chức năng kinh điển (Yeo 7 Networks):</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 text-[11px] font-bold">
                      🌐 {selectedRegion.brainnetome_metrics.yeo_network_7}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Khớp: {selectedRegion.brainnetome_metrics.yeo_network_overlap_pct}%
                    </span>
                  </div>
                </div>

                {/* Behavioral Domains Stacked Progress Bar (BrainMap) */}
                {selectedRegion.brainnetome_metrics.behavioral_domains && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Ma trận xác suất hành vi (BrainMap Domains):</span>
                    </div>

                    {/* Stacked bar */}
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.cognition}%` }}
                        className="bg-sky-500 h-full"
                        title={`Nhận thức: ${selectedRegion.brainnetome_metrics.behavioral_domains.cognition}%`}
                      />
                      <div
                        style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.action}%` }}
                        className="bg-amber-500 h-full"
                        title={`Vận động: ${selectedRegion.brainnetome_metrics.behavioral_domains.action}%`}
                      />
                      <div
                        style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.perception}%` }}
                        className="bg-emerald-500 h-full"
                        title={`Cảm giác: ${selectedRegion.brainnetome_metrics.behavioral_domains.perception}%`}
                      />
                      <div
                        style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.emotion}%` }}
                        className="bg-rose-500 h-full"
                        title={`Cảm xúc: ${selectedRegion.brainnetome_metrics.behavioral_domains.emotion}%`}
                      />
                      <div
                        style={{ width: `${selectedRegion.brainnetome_metrics.behavioral_domains.interoception}%` }}
                        className="bg-purple-500 h-full"
                        title={`Nội quan: ${selectedRegion.brainnetome_metrics.behavioral_domains.interoception}%`}
                      />
                    </div>

                    {/* Legend grid */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                        <span className="text-slate-400">Nhận thức:</span>
                        <span className="font-semibold text-slate-200">{selectedRegion.brainnetome_metrics.behavioral_domains.cognition}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-slate-400">Vận động:</span>
                        <span className="font-semibold text-slate-200">{selectedRegion.brainnetome_metrics.behavioral_domains.action}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-400">Cảm giác:</span>
                        <span className="font-semibold text-slate-200">{selectedRegion.brainnetome_metrics.behavioral_domains.perception}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span className="text-slate-400">Cảm xúc:</span>
                        <span className="font-semibold text-slate-200">{selectedRegion.brainnetome_metrics.behavioral_domains.emotion}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        <span className="text-slate-400">Nội quan:</span>
                        <span className="font-semibold text-slate-200">{selectedRegion.brainnetome_metrics.behavioral_domains.interoception}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Primary Subdomains */}
                {selectedRegion.brainnetome_metrics.primary_subdomains?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">Tiểu miền chức năng liên quan cao nhất:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedRegion.brainnetome_metrics.primary_subdomains.map((sub, sIdx) => (
                        <span key={sIdx} className="px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 font-mono text-[9.5px]">
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Clinical Syndromes */}
            {selectedRegion.clinical_syndromes?.length > 0 && (
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Triệu chứng và hội chứng khi tổn thương
                </h4>

                <div className="space-y-2">
                  {selectedRegion.clinical_syndromes.map((syn, idx) => (
                    <div key={idx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                      {syn.name ? <p className="font-bold text-amber-300">{syn.name}</p> : null}
                      <p className="text-slate-300 text-[10.5px] leading-relaxed">{syn.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Medical Governance Sources */}
            {selectedRegion.source?.length > 0 && (
              <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Nguồn dữ liệu & Tài liệu tham khảo:
                </h4>
                <ul className="space-y-1 text-[10px] text-slate-400">
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
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-400 text-xl">
              🎯
            </div>
            <div>
              <p className="text-slate-300 font-semibold mb-1">Tâm ngắm đang ở ngoài phân vùng atlas</p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs">
                {activeOverlay === "none"
                  ? "Hãy chọn một lớp phủ Atlas ở thanh công cụ để tra cứu thông tin giải phẫu."
                  : "Bấm chuột lên lát cắt hoặc kéo thanh trượt Z / Y / X để di chuyển tâm ngắm vào một vùng nhu mô não."}
              </p>
            </div>
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
              <div>Voxel: [{voxX}, {voxY}, {voxZ}]</div>
              <div>MNI152: [{mmX}, {mmY}, {mmZ}] mm</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
