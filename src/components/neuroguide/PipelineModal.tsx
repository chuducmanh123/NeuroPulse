"use client";

import React, { useState, useRef } from "react";

interface PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  darkMode: boolean;
}

export function PipelineModal({ isOpen, onClose, onSuccess, darkMode }: PipelineModalProps) {
  const [mode, setMode] = useState<"MANUAL" | "DISCOVER">("MANUAL");
  const [url, setUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [society, setSociety] = useState<string>("ESO");
  const [title, setTitle] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setErrorMessage("Please select a valid PDF document (.pdf).");
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);

      // Auto-suggest title if current title is empty
      if (!title) {
        const cleanName = file.name
          .replace(/\.pdf$/i, "")
          .replace(/[_-]+/g, " ")
          .trim();
        setTitle(cleanName);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResultMessage(null);
    setErrorMessage(null);

    try {
      if (mode === "MANUAL" && !url && !selectedFile) {
        setErrorMessage("Please provide either a direct PDF URL or upload a local PDF file.");
        setIsLoading(false);
        return;
      }

      let res: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("society", society);
        formData.append("discover", String(mode === "DISCOVER"));
        if (title) formData.append("title", title);
        if (year) formData.append("year", year);
        if (url) formData.append("url", url);

        res = await fetch("/api/neuroguide/pipeline", {
          method: "POST",
          body: formData,
        });
      } else {
        const payload: Record<string, unknown> = {
          society,
          discover: mode === "DISCOVER",
        };
        if (mode === "MANUAL") {
          if (url) payload.url = url;
          if (title) payload.title = title;
          if (year) payload.year = parseInt(year, 10);
        }

        res = await fetch("/api/neuroguide/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Response was not JSON (e.g. 413 Payload Too Large or 504 Timeout from reverse proxy)
      }

      if (!res.ok && !data) {
        if (res.status === 413) {
          setErrorMessage(
            "Tệp PDF (4.4 MB) vượt quá giới hạn tải lên trực tiếp của máy chủ (tối đa 4.5 MB). Vui lòng nén bớt dung lượng PDF hoặc chỉ xuất các trang có bảng khuyến cáo."
          );
        } else if (res.status === 504) {
          setErrorMessage(
            "Quá trình phân tích 81 trang vượt quá thời gian chờ của máy chủ (504 Timeout). Vui lòng thử lại hoặc giảm số trang của tệp."
          );
        } else {
          setErrorMessage(`Máy chủ phản hồi mã lỗi ${res.status}: ${res.statusText || "Lỗi xử lý yêu cầu."}`);
        }
        setIsLoading(false);
        return;
      }

      if (data && data.ok) {
        if (mode === "DISCOVER") {
          setResultMessage(
            `✅ Discovery complete! Found ${data.data?.total_discovered || 0} guidelines, including ${
              data.data?.new_discovered_count || 0
            } new publications ready for analysis.`
          );
        } else {
          setResultMessage(
            `✅ Extraction complete! Extracted ${data.data?.total_recommendations || 0} clinical recommendations and submitted directly to the Review Queue.`
          );
        }
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1800);
      } else {
        const errorMsg =
          typeof data?.error === "string"
            ? data.error
            : data?.error?.message || "Đã xảy ra lỗi trong quá trình thực thi AI Pipeline.";
        setErrorMessage(errorMsg);
      }
    } catch {
      setErrorMessage("Network connection error calling the Pipeline Orchestrator API.");
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
              GUIDELINE AI EXTRACTION PIPELINE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector: Manual vs Automated Radar Scan */}
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
            📥 Manual URL / File Upload
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
            📡 Multi-Society Radar Scan
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === "MANUAL" ? (
            <>
              <div>
                <label className="block font-bold mb-1">Medical Society:</label>
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
                <label className="block font-bold mb-1">Direct Guideline PDF URL:</label>
                <input
                  type="url"
                  placeholder="https://example.com/guideline-2026.pdf or DOI URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className={`w-full p-2.5 rounded-lg border ${
                    darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                  }`}
                />
              </div>

              {/* Dedicated File Upload Picker */}
              <div>
                <label className="block font-bold mb-1">OR Upload PDF Document:</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!selectedFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer ${
                      darkMode
                        ? "border-slate-700 hover:border-amber-500 bg-slate-800/40 hover:bg-slate-800 text-slate-300"
                        : "border-slate-300 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/50 text-slate-600"
                    }`}
                  >
                    <span className="text-2xl">📄</span>
                    <span className="font-bold text-xs">Click to browse or drop PDF guideline</span>
                    <span className="text-[10px] opacity-70">
                      Upload journal PDF directly from your computer
                    </span>
                  </button>
                ) : (
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      darkMode
                        ? "bg-slate-800/80 border-slate-700 text-white"
                        : "bg-amber-50/70 border-amber-200 text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className="text-xl shrink-0">📄</span>
                      <div className="overflow-hidden">
                        <p className="font-bold text-xs truncate" title={selectedFile.name}>
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] opacity-70">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI extraction
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="px-2.5 py-1 text-xs font-bold rounded-md bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 transition-colors shrink-0"
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold mb-1">Guideline Title (Optional):</label>
                  <input
                    type="text"
                    placeholder="e.g., Prevention and Treatment of Maternal Stroke"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full p-2.5 rounded-lg border ${
                      darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Year:</label>
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
              <p className="font-bold mb-1">📡 Automated Radar Discovery Mode:</p>
              <p className="leading-relaxed">
                The system executes the Discovery Core across 12 authoritative medical societies and high-impact journals (ESO, AHA/ASA, ILAE, AES, NCS, EAN, PNS, AHS, Wiley, NICE) to detect newly published guidelines not yet in the repository.
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-lg font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                  <span>Processing 5-Step Pipeline...</span>
                </>
              ) : mode === "MANUAL" ? (
                "⚡ Launch AI Extraction"
              ) : (
                "📡 Launch Radar Discovery"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
