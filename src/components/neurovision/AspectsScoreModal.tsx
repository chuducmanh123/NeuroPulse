"use client";

import React from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import { useNeuroViewer } from "./NeuroViewerContext";
import {
  ASPECTS_LEVELS,
  ASPECTS_REGIONS,
  PC_ASPECTS_REGIONS,
  type AspectsRegionMeta,
  type PcAspectsRegionMeta,
} from "../../lib/aspects.config";

export default function AspectsScoreModal() {
  const { getNiivue } = useNeuroViewer();

  // Zustand Store
  const isAspectsModalOpen = useNeuroVisionStore((s) => s.isAspectsModalOpen);
  const aspectsMode = useNeuroVisionStore((s) => s.aspectsMode);
  const aspectsHemisphere = useNeuroVisionStore((s) => s.aspectsHemisphere);
  const affectedAspects = useNeuroVisionStore((s) => s.affectedAspects);
  const affectedPcAspects = useNeuroVisionStore((s) => s.affectedPcAspects);
  const highlightedLabelId = useNeuroVisionStore((s) => s.highlightedLabelId);

  const setAspectsModalOpen = useNeuroVisionStore((s) => s.setAspectsModalOpen);
  const setAspectsMode = useNeuroVisionStore((s) => s.setAspectsMode);
  const setAspectsHemisphere = useNeuroVisionStore((s) => s.setAspectsHemisphere);
  const toggleAspectsRegion = useNeuroVisionStore((s) => s.toggleAspectsRegion);
  const togglePcAspectsRegion = useNeuroVisionStore((s) => s.togglePcAspectsRegion);
  const resetAspectsScores = useNeuroVisionStore((s) => s.resetAspectsScores);

  const setBaseModality = useNeuroVisionStore((s) => s.setBaseModality);
  const setActiveOverlay = useNeuroVisionStore((s) => s.setActiveOverlay);
  const setCrosshair = useNeuroVisionStore((s) => s.setCrosshair);
  const setHighlightedLabelId = useNeuroVisionStore((s) => s.setHighlightedLabelId);
  const setIsProgrammaticChange = useNeuroVisionStore((s) => s.setIsProgrammaticChange);

  if (!isAspectsModalOpen) return null;

  // Jump slice helper
  const jumpToZ = (z_mm: number) => {
    const nv = getNiivue();
    if (!nv) return;

    setIsProgrammaticChange(true);
    try {
      const currentMM = useNeuroVisionStore.getState().crosshair.mm;
      const targetMM: [number, number, number] = [currentMM[0], currentMM[1], z_mm];
      const frac = nv.mm2frac(targetMM, 0);

      nv.scene.crosshairPos = frac;
      nv.drawScene();

      const vox = nv.frac2vox(frac, 0);
      setCrosshair({
        mm: targetMM,
        vox: [Math.round(vox[0]), Math.round(vox[1]), Math.round(vox[2])],
      });
    } finally {
      setTimeout(() => setIsProgrammaticChange(false), 50);
    }
  };

  // Switch to CT template & proper overlay
  const handleActivateCTTemplate = () => {
    setBaseModality("CT");
    setActiveOverlay("aspects");
    jumpToZ(ASPECTS_LEVELS.ganglionic_z_mm);
  };

  // ASPECTS Score calculation
  const aspectsScore = Math.max(0, 10 - affectedAspects.length);

  // pc-ASPECTS Score calculation
  const pcDeductions = affectedPcAspects.reduce((sum, key) => {
    const reg = PC_ASPECTS_REGIONS.find((r) => r.key === key);
    return sum + (reg ? reg.points : 0);
  }, 0);
  const pcScore = Math.max(0, 10 - pcDeductions);

  // Select & highlight region
  const handleSelectAspectsRegion = (region: AspectsRegionMeta) => {
    const labelId =
      aspectsHemisphere === "left" ? region.left_label_id : region.right_label_id;
    setHighlightedLabelId(labelId);

    const targetZ =
      region.tier === "ganglionic"
        ? ASPECTS_LEVELS.ganglionic_z_mm
        : ASPECTS_LEVELS.supraganglionic_z_mm;
    jumpToZ(targetZ);
  };

  const handleSelectPcRegion = (region: PcAspectsRegionMeta) => {
    jumpToZ(region.target_z_mm);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-white shadow-md">
              A
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Công cụ Chấm điểm ASPECTS & pc-ASPECTS
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
                  MNI152 CT Template
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Đánh giá tổn thương thiếu máu sớm (Early Ischemic Changes) trên CT sọ não
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAspectsModalOpen(false)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold transition"
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Modal Control Bar */}
        <div className="px-5 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setAspectsMode("aspects")}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                aspectsMode === "aspects"
                  ? "bg-rose-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              ASPECTS (MCA - 10 điểm)
            </button>
            <button
              type="button"
              onClick={() => setAspectsMode("pc-aspects")}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                aspectsMode === "pc-aspects"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              pc-ASPECTS (Tuần hoàn sau - 10 điểm)
            </button>
          </div>

          {/* Quick CT Template Loader & Z jumps */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleActivateCTTemplate}
              className="px-2.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-700 text-sky-200 font-medium flex items-center gap-1.5 transition"
              title="Chuyển ảnh nền sang CT chuẩn và nạp lớp phủ ASPECTS"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              Bật CT Template
            </button>

            {aspectsMode === "aspects" && (
              <>
                <button
                  type="button"
                  onClick={() => jumpToZ(ASPECTS_LEVELS.ganglionic_z_mm)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono transition"
                  title="Nhảy tới mức hạch nền (Ganglionic: C, L, IC, I, M1-M3)"
                >
                  Tầng Hạch nền (Z: +{ASPECTS_LEVELS.ganglionic_z_mm} mm)
                </button>
                <button
                  type="button"
                  onClick={() => jumpToZ(ASPECTS_LEVELS.supraganglionic_z_mm)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono transition"
                  title="Nhảy tới mức trên hạch nền (Supraganglionic: M4-M6)"
                >
                  Tầng Trên hạch nền (Z: +{ASPECTS_LEVELS.supraganglionic_z_mm} mm)
                </button>
              </>
            )}

            <button
              type="button"
              onClick={resetAspectsScores}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 font-medium transition"
            >
              Đặt lại (10/10)
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Score Banner */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-white shadow-xl ${
                  (aspectsMode === "aspects" ? aspectsScore : pcScore) >= 7
                    ? "bg-emerald-600 shadow-emerald-900/50"
                    : (aspectsMode === "aspects" ? aspectsScore : pcScore) >= 5
                    ? "bg-amber-600 shadow-amber-900/50"
                    : "bg-rose-700 shadow-rose-900/50"
                }`}
              >
                <span className="text-2xl leading-none">
                  {aspectsMode === "aspects" ? aspectsScore : pcScore}
                </span>
                <span className="text-[10px] text-white/80 font-mono">/ 10</span>
              </div>

              <div>
                <div className="text-sm font-bold text-white">
                  {aspectsMode === "aspects"
                    ? `Điểm ASPECTS Bán cầu ${aspectsHemisphere === "left" ? "Trái" : "Phải"}`
                    : "Điểm pc-ASPECTS (Hệ Sống - Nền)"}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(aspectsMode === "aspects" ? aspectsScore : pcScore) >= 6
                    ? "Tổn thương diện hẹp - Tiên lượng khả quan khi tái thông mạch (EVT / rtPA)."
                    : "Tổn thương diện rộng - Nguy cơ chuyển dạng xuất huyết cao khi can thiệp tái thông."}
                </p>
              </div>
            </div>

            {aspectsMode === "aspects" && (
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-400 px-2 font-semibold">Bán cầu:</span>
                <button
                  type="button"
                  onClick={() => setAspectsHemisphere("left")}
                  className={`px-3 py-1 rounded font-semibold text-xs transition ${
                    aspectsHemisphere === "left"
                      ? "bg-sky-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Trái (L)
                </button>
                <button
                  type="button"
                  onClick={() => setAspectsHemisphere("right")}
                  className={`px-3 py-1 rounded font-semibold text-xs transition ${
                    aspectsHemisphere === "right"
                      ? "bg-sky-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Phải (R)
                </button>
              </div>
            )}
          </div>

          {/* Regional Checklist Grid */}
          {aspectsMode === "aspects" ? (
            <div className="space-y-4">
              {/* Tầng Hạch Nền */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    Tầng Hạch Nền (Ganglionic Level - 7 vùng: C, L, IC, I, M1, M2, M3)
                  </h3>
                  <button
                    type="button"
                    onClick={() => jumpToZ(ASPECTS_LEVELS.ganglionic_z_mm)}
                    className="text-[11px] text-slate-400 hover:text-sky-300 font-mono underline"
                  >
                    Xem lát cắt Z: +{ASPECTS_LEVELS.ganglionic_z_mm} mm
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {ASPECTS_REGIONS.filter((r) => r.tier === "ganglionic").map((region) => {
                    const isAffected = affectedAspects.includes(region.key);
                    const isCurHighlighted =
                      highlightedLabelId ===
                      (aspectsHemisphere === "left"
                        ? region.left_label_id
                        : region.right_label_id);

                    return (
                      <div
                        key={region.key}
                        className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2 ${
                          isAffected
                            ? "bg-rose-950/50 border-rose-600/80 shadow-md shadow-rose-950/50"
                            : isCurHighlighted
                            ? "bg-sky-950/40 border-sky-500"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <span className="text-xs font-bold text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded mr-1.5">
                              {region.key}
                            </span>
                            <span className="text-xs font-semibold text-slate-200">
                              {region.label_vi.split("(")[0]}
                            </span>
                          </div>

                          <input
                            type="checkbox"
                            checked={isAffected}
                            onChange={() => toggleAspectsRegion(region.key)}
                            className="w-4 h-4 accent-rose-600 rounded cursor-pointer mt-0.5"
                            title="Đánh dấu giảm đậm độ (trừ 1 điểm)"
                          />
                        </div>

                        <p className="text-[10px] text-slate-400 line-clamp-2">
                          {region.description_vi}
                        </p>

                        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleSelectAspectsRegion(region)}
                            className="text-sky-400 hover:underline font-medium"
                          >
                            Định vị & Tô sáng
                          </button>
                          <span className={isAffected ? "text-rose-400 font-bold" : "text-slate-500"}>
                            {isAffected ? "-1 điểm" : "Bình thường"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tầng Trên Hạch Nền */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Tầng Trên Hạch Nền (Supraganglionic Level - 3 vùng: M4, M5, M6)
                  </h3>
                  <button
                    type="button"
                    onClick={() => jumpToZ(ASPECTS_LEVELS.supraganglionic_z_mm)}
                    className="text-[11px] text-slate-400 hover:text-emerald-300 font-mono underline"
                  >
                    Xem lát cắt Z: +{ASPECTS_LEVELS.supraganglionic_z_mm} mm
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ASPECTS_REGIONS.filter((r) => r.tier === "supraganglionic").map((region) => {
                    const isAffected = affectedAspects.includes(region.key);
                    const isCurHighlighted =
                      highlightedLabelId ===
                      (aspectsHemisphere === "left"
                        ? region.left_label_id
                        : region.right_label_id);

                    return (
                      <div
                        key={region.key}
                        className={`p-3 rounded-xl border transition flex flex-col justify-between gap-2 ${
                          isAffected
                            ? "bg-rose-950/50 border-rose-600/80 shadow-md shadow-rose-950/50"
                            : isCurHighlighted
                            ? "bg-sky-950/40 border-sky-500"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <span className="text-xs font-bold text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded mr-1.5">
                              {region.key}
                            </span>
                            <span className="text-xs font-semibold text-slate-200">
                              {region.label_vi.split("(")[0]}
                            </span>
                          </div>

                          <input
                            type="checkbox"
                            checked={isAffected}
                            onChange={() => toggleAspectsRegion(region.key)}
                            className="w-4 h-4 accent-rose-600 rounded cursor-pointer mt-0.5"
                            title="Đánh dấu giảm đậm độ (trừ 1 điểm)"
                          />
                        </div>

                        <p className="text-[10px] text-slate-400 line-clamp-2">
                          {region.description_vi}
                        </p>

                        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                          <button
                            type="button"
                            onClick={() => handleSelectAspectsRegion(region)}
                            className="text-sky-400 hover:underline font-medium"
                          >
                            Định vị & Tô sáng
                          </button>
                          <span className={isAffected ? "text-rose-400 font-bold" : "text-slate-500"}>
                            {isAffected ? "-1 điểm" : "Bình thường"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* pc-ASPECTS Checklist */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {PC_ASPECTS_REGIONS.map((region) => {
                const isAffected = affectedPcAspects.includes(region.key);

                return (
                  <div
                    key={region.key}
                    className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2.5 ${
                      isAffected
                        ? "bg-rose-950/50 border-rose-600/80 shadow-md shadow-rose-950/50"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div>
                        <div className="text-xs font-bold text-white">
                          {region.label_vi}
                        </div>
                        <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                          Trọng số: -{region.points} điểm
                        </div>
                      </div>

                      <input
                        type="checkbox"
                        checked={isAffected}
                        onChange={() => togglePcAspectsRegion(region.key)}
                        className="w-4 h-4 accent-rose-600 rounded cursor-pointer mt-0.5"
                        title={`Đánh dấu tổn thương (-${region.points} điểm)`}
                      />
                    </div>

                    <p className="text-[10.5px] text-slate-300 leading-relaxed">
                      {region.description_vi}
                    </p>

                    <p className="text-[10px] text-amber-300/80 italic">
                      Hội chứng: {region.clinical_deficit}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                      <button
                        type="button"
                        onClick={() => handleSelectPcRegion(region)}
                        className="text-sky-400 hover:underline font-medium font-mono"
                      >
                        Đến lát cắt (Z: {region.target_z_mm} mm)
                      </button>
                      <span className={isAffected ? "text-rose-400 font-bold" : "text-slate-500"}>
                        {isAffected ? `-${region.points} điểm` : "Bình thường"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Calibrator note */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">
              📌 Tinh chỉnh lát cắt giải phẫu ({ASPECTS_LEVELS.note}):
            </p>
            <p>
              Tọa độ Z chuẩn MNI152 cho tầng hạch nền ({ASPECTS_LEVELS.ganglionic_z_mm} mm) và tầng trên hạch nền ({ASPECTS_LEVELS.supraganglionic_z_mm} mm) được cấu hình tại file <code className="text-sky-300">src/lib/aspects.config.ts</code> để bác sĩ chẩn đoán hình ảnh có thể hiệu chuẩn dễ dàng.
            </p>
          </div>
        </div>

        {/* Modal Footer with Mandatory Medical Disclaimer */}
        <div className="p-3 bg-amber-950/50 border-t border-amber-900/60 px-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-amber-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400">⚠️ LƯU Ý HỌC TẬP:</span>
            <span>
              Đây là mô phỏng học tập trên template CT chuẩn MNI152, không thay thế việc chấm điểm ASPECTS trên CT thực tế của bệnh nhân.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAspectsModalOpen(false)}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium shrink-0"
          >
            Đóng bảng điểm
          </button>
        </div>
      </div>
    </div>
  );
}
