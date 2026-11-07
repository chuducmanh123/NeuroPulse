"use client";

import React, { useState, useEffect } from "react";
import { useNeuroVisionStore } from "../../store/useNeuroVisionStore";
import { AppSwitcher } from "../../components/ecosystem/AppSwitcher";
import { NeuroViewerProvider } from "../../components/neurovision/NeuroViewerContext";
import { DynamicNeuroViewer } from "../../components/neurovision/DynamicNeuroViewer";
import ViewerToolbar from "../../components/neurovision/ViewerToolbar";
import SliceSlidersBar from "../../components/neurovision/SliceSlidersBar";
import ClinicalInspector from "../../components/neurovision/ClinicalInspector";
import AspectsScoreModal from "../../components/neurovision/AspectsScoreModal";
import { getStoredAdminToken } from "../../utils/clientAuth";

const VALIDATION_IMAGES = [
  { file: "mesh_volume_alignment.png", title: "Đối chiếu Trực quan Mesh - Volume (Não thất bên trùng khít với mặt phẳng T1)" },
  { file: "crosshair_ac.png", title: "T1 tại MNI (0,0,0): Kiểm tra Mép trước (Anterior Commissure)" },
  { file: "overlay_aspects.png", title: "ASPECTS 10 phân vùng (MCA Ganglionic + Supraganglionic) trên T1" },
  { file: "overlay_arterial.png", title: "Lãnh thổ Động mạch (JHU M1, M2, ACA, PCA) trên T1" },
  { file: "overlay_brainstem_aan.png", title: "Thân não thức tỉnh (Harvard AAN v2, 16 nhân) trên T1" },
  { file: "overlay_anatomy.png", title: "Giải phẫu vỏ & dưới vỏ (Harvard-Oxford 67 vùng) trên T1" },
  { file: "overlay_whitematter.png", title: "Chất trắng (JHU ICBM-DTI-81, 50 bó) trên T1" },
  { file: "venous_territories_8slices.png", title: "Phân vùng Lãnh thổ Dẫn lưu Tĩnh mạch (Venous Territories - Radiopaedia 8 lát cắt)" },
  { file: "overlay_venous.png", title: "Mật độ Tĩnh mạch 7T QSM (VENAT) trên T1" },
  { file: "overlay_aal3.png", title: "AAL3 (170 vùng bao gồm thân não & đồi thị) trên T1" },
  { file: "overlay_hemispheres.png", title: "Phân định bán cầu Trái / Phải trên T1" },
];

export default function NeuroVisionPage() {
  const [activeTab, setActiveTab] = useState<"viewer" | "validation">("viewer");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(true);

  useEffect(() => {
    setIsAdmin(Boolean(getStoredAdminToken()));
  }, []);

  // Zustand Store for UI controls
  const isSidebarOpen = useNeuroVisionStore((s) => s.isSidebarOpen);
  const setIsSidebarOpen = useNeuroVisionStore((s) => s.setIsSidebarOpen);
  const isSlidersOpen = useNeuroVisionStore((s) => s.isSlidersOpen);

  return (
    <NeuroViewerProvider>
      <div className="h-[100dvh] max-h-[100dvh] w-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden relative">
        {/* 1. Global Navigation Bar */}
        <header className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between shrink-0 shadow-md z-40">
          <div className="flex items-center gap-2.5">
            <AppSwitcher currentApp="neurovision" darkMode={true} />
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span className="text-sky-400">NeuroVision</span>
                <span className="text-slate-500 font-normal hidden sm:inline">|</span>
                <span className="text-xs font-semibold text-slate-300 hidden sm:inline">Atlas & NiiVue Viewer</span>
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                BETA 2.0
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hidden md:inline">
                MNI152 1mm
              </span>
            </div>
          </div>

          {/* View mode / Tabs (Chỉ hiển thị cho quản trị viên) */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("viewer")}
                  className={`px-2.5 py-1 rounded-md font-medium transition text-xs ${
                    activeTab === "viewer"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Trình xem
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("validation")}
                  className={`px-2.5 py-1 rounded-md font-medium transition text-xs ${
                    activeTab === "validation"
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Kiểm định
                </button>
              </div>
            )}

            {activeTab === "viewer" && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`p-1.5 rounded-lg border text-xs font-medium transition ${
                  isSidebarOpen
                    ? "bg-slate-800 border-slate-700 text-sky-400"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title="Bật/Tắt bảng thông tin lâm sàng"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </header>

        {/* 2. Main Body */}
        {activeTab === "viewer" ? (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {/* Toolbar */}
            <ViewerToolbar />

            {/* Split View: Canvas + Right Clinical Panel */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0">
              <div className="flex-1 flex flex-col overflow-hidden relative min-h-0 h-full w-full">
                {/* NiiVue WebGL Canvas */}
                <div className="flex-1 w-full h-full relative min-h-0 overflow-hidden">
                  <DynamicNeuroViewer darkMode={true} />
                </div>

                {/* Interactive Sliders Bar (Axial / Coronal / Sagittal + 3D Clip) - Only shown when requested */}
                {isSlidersOpen && (
                  <div className="shrink-0 z-30 transition-all duration-200">
                    <SliceSlidersBar />
                  </div>
                )}
              </div>

              {/* Collapsible Clinical Information Sidebar */}
              {isSidebarOpen && (
                <div className="w-full lg:w-80 xl:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col h-56 sm:h-64 lg:h-full min-h-0 overflow-hidden z-20 bg-slate-900">
                  <ClinicalInspector />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Validation & Provenance Inspector Tab */
          <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                Bản đồ kiểm định không gian MNI152 (11 Overlays)
              </h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Các bản chụp lát cắt đối chiếu trực giao giữa các bộ Atlas (ASPECTS, Arterial, Harvard AAN, AAL3,
                Harvard-Oxford, JHU DTI-81, VENAT 7T QSM) chồng trên ảnh gốc T1 MNI152NLin2009cAsym (193×229×193, 1 mm).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {VALIDATION_IMAGES.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden hover:border-slate-700 transition"
                  >
                    <div className="aspect-[4/3] bg-black relative flex items-center justify-center p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/neurovision/validation/${item.file}`}
                        alt={item.title}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3 border-t border-slate-800/80">
                      <p className="text-xs font-semibold text-slate-200">{item.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">{item.file}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. Mandatory Medical Educational Disclaimer (Làm gọn & có nút ẩn trên mobile) */}
        {isDisclaimerVisible ? (
          <footer className="bg-amber-950/60 border-t border-amber-900/60 px-2 sm:px-4 py-1 sm:py-1.5 flex items-center justify-between text-[10px] sm:text-[11px] text-amber-200/90 shrink-0 gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-amber-400 font-bold shrink-0">
                ⚠️ <span className="hidden sm:inline">CÔNG CỤ HỌC TẬP:</span>
              </span>
              <span className="truncate sm:whitespace-normal">
                <span className="sm:hidden">Đào tạo & nghiên cứu MNI152. Không dùng chỉ định điều trị y khoa độc lập.</span>
                <span className="hidden sm:inline">
                  Phần mềm được phát triển phục vụ mục đích đào tạo và nghiên cứu giải phẫu thần kinh học MNI152.
                  Tuyệt đối không sử dụng kết quả định khu làm chỉ định điều trị y khoa độc lập.
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden md:inline font-mono text-[10px] text-amber-400/80">
                NeuroPulse • NeuroVision
              </span>
              <button
                type="button"
                onClick={() => setIsDisclaimerVisible(false)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-amber-900/60 text-amber-300 hover:text-amber-100 transition text-[11px] leading-none"
                title="Ẩn dòng cảnh báo"
              >
                ✕
              </button>
            </div>
          </footer>
        ) : (
          <button
            type="button"
            onClick={() => setIsDisclaimerVisible(true)}
            className="fixed bottom-2 right-2 z-30 bg-amber-950/90 hover:bg-amber-900 border border-amber-800/80 text-amber-300 rounded-full px-2.5 py-0.5 text-[10px] font-medium shadow-md transition flex items-center gap-1 backdrop-blur-sm opacity-75 hover:opacity-100"
            title="Hiện lại cảnh báo đào tạo y khoa"
          >
            <span>⚠️</span>
            <span className="hidden sm:inline">Cảnh báo đào tạo</span>
          </button>
        )}

        {/* 4. Interactive ASPECTS & pc-ASPECTS Modal */}
        <AspectsScoreModal />
      </div>
    </NeuroViewerProvider>
  );
}
