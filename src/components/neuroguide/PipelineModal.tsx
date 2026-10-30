"use client";

import React, { useState } from "react";

interface PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  darkMode: boolean;
}

export function PipelineModal({ isOpen, onClose, onSuccess, darkMode }: PipelineModalProps) {
  const [mode, setMode] = useState<"MANUAL" | "DISCOVER">("MANUAL");
  const [url, setUrl] = useState<string>("");
  const [localPath, setLocalPath] = useState<string>("");
  const [society, setSociety] = useState<string>("ESO");
  const [title, setTitle] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      const payload: Record<string, unknown> = {
        society,
        discover: mode === "DISCOVER",
      };

      if (mode === "MANUAL") {
        if (!url && !localPath) {
          setErrorMessage("Vui lòng nhập đường dẫn URL trực tiếp hoặc tệp PDF cục bộ.");
          setIsLoading(false);
          return;
        }
        if (url) payload.url = url;
        if (localPath) payload.local_path = localPath;
        if (title) payload.title = title;
        if (year) payload.year = parseInt(year, 10);
      }

      const res = await fetch("/api/neuroguide/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        if (mode === "DISCOVER") {
          setResultMessage(
            `✅ Đã quét xong! Phát hiện ${data.data?.total_discovered || 0} bài, trong đó có ${
              data.data?.new_discovered_count || 0
            } bài mới chưa có trong kho.`
          );
        } else {
          setResultMessage(
            `✅ Bóc tách thành công! Đã trích xuất ${data.data?.total_recommendations || 0} khuyến cáo lâm sàng và chuyển vào Hàng đợi chờ duyệt.`
          );
        }
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        setErrorMessage(data.error?.message || "Có lỗi xảy ra khi thực thi Pipeline.");
      }
    } catch {
      setErrorMessage("Lỗi kết nối khi gọi Bộ điều phối Orchestrator.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
          darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h3 className="text-sm font-black uppercase tracking-wide">
              BỘ ĐIỀU PHỐI BÓC TÁCH GUIDELINE (AI PIPELINE)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Chuyển chế độ: Thủ công vs Tự động quét */}
        <div className="flex gap-2 mb-4 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("MANUAL")}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mode === "MANUAL"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            📥 Nhập File / URL Thủ Công
          </button>
          <button
            type="button"
            onClick={() => setMode("DISCOVER")}
            className={`flex-1 py-1.5 rounded-md transition-all ${
              mode === "DISCOVER"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            📡 Quét Tự Động 12 Hội
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === "MANUAL" ? (
            <>
              <div>
                <label className="block font-bold mb-1">Hiệp hội Y khoa:</label>
                <select
                  value={society}
                  onChange={(e) => setSociety(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border font-semibold ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <option value="ESO">ESO (European Stroke Organisation - GRADE/PICO)</option>
                  <option value="AHA">AHA/ASA (American Heart / Stroke Association - COR/LOE)</option>
                  <option value="ILAE">ILAE (International League Against Epilepsy)</option>
                  <option value="AES">AES (American Epilepsy Society)</option>
                  <option value="NCS">NCS (Neurocritical Care Society)</option>
                  <option value="AAN">AAN (American Academy of Neurology)</option>
                  <option value="EAN">EAN (European Academy of Neurology)</option>
                  <option value="PNS">PNS (Peripheral Nerve Society)</option>
                  <option value="AHS">AHS (American Headache Society)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">URL trực tiếp của file PDF Guideline:</label>
                <input
                  type="url"
                  placeholder="https://example.com/guideline-2026.pdf"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">HOẶC Đường dẫn tệp cục bộ trên máy:</label>
                <input
                  type="text"
                  placeholder="data/sample_eso_sap_guideline.pdf"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border font-mono ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold mb-1">Tựa đề hướng dẫn (tùy chọn):</label>
                  <input
                    type="text"
                    placeholder="VD: Early Management of Acute Stroke"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Năm:</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
              <p className="font-bold mb-1">📡 Chế độ Quét Tự Động Radar:</p>
              <p className="leading-relaxed">
                Hệ thống sẽ chạy Lõi Discovery quét 12 nguồn chính thống (ESO, AHA, ILAE, AES, NCS, EAN, PNS, AHS, Wiley, NICE) để phát hiện tất cả các bài mới chưa có trong kho.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 font-bold">
              {errorMessage}
            </div>
          )}

          {resultMessage && (
            <div className="p-3 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 font-bold">
              {resultMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Đang xử lý qua 5 Lõi...</span>
                </>
              ) : mode === "MANUAL" ? (
                "⚡ Bắt Đầu Bóc Tách AI"
              ) : (
                "📡 Bắt Đầu Quét Nguồn"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
