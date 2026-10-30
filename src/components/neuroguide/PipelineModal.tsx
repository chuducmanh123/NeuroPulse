"use client";

import React, { useState, useRef, useEffect } from "react";
import { upload } from "@vercel/blob/client";

interface PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  darkMode: boolean;
}

interface StreamRec {
  rec_id: string;
  cor?: string;
  loe?: string;
  statement: string;
  page_num?: number;
}

export function PipelineModal({ isOpen, onClose, onSuccess, darkMode }: PipelineModalProps) {
  const [mode, setMode] = useState<"MANUAL" | "DISCOVER">("MANUAL");
  const [url, setUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [society, setSociety] = useState<string>("AHA");
  const [title, setTitle] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [streamProgress, setStreamProgress] = useState<number>(0);
  const [streamMessage, setStreamMessage] = useState<string>("");
  const [liveRecs, setLiveRecs] = useState<StreamRec[]>([]);
  const [blobCleaned, setBlobCleaned] = useState<boolean>(false);
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
      setLiveRecs([]);
      setBlobCleaned(false);

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
    setLiveRecs([]);
    setBlobCleaned(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResultMessage(null);
    setErrorMessage(null);
    setStreamProgress(5);
    setLiveRecs([]);
    setBlobCleaned(false);

    try {
      if (mode === "DISCOVER") {
        setStreamMessage("Scanning medical registries & PubMed for new guideline publications...");
        const res = await fetch("/api/neuroguide/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ society, discover: true }),
        });
        const data = await res.json().catch(() => null);
        if (data && data.ok) {
          setResultMessage(
            `✅ Discovery complete! Found ${data.data?.total_discovered || 0} guidelines, including ${
              data.data?.new_discovered_count || 0
            } new publications ready for analysis.`
          );
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1800);
        } else {
          setErrorMessage(data?.error?.message || "Error running guideline discovery scan.");
        }
        setIsLoading(false);
        return;
      }

      // =======================================================================
      // MANUAL MODE: DIRECT VERCEL BLOB UPLOAD -> INCREMENTAL SSE -> AUTO-CLEANUP
      // =======================================================================
      if (!url && !selectedFile) {
        setErrorMessage("Please provide either a PDF document or a direct URL.");
        setIsLoading(false);
        return;
      }

      let blobUrl: string | undefined = undefined;
      let uploadId: string | undefined = undefined;
      let payloadToUpload: Blob | File | null = selectedFile;

      // Lấy token quản trị viên từ session/localStorage
      const adminToken =
        typeof window !== "undefined"
          ? sessionStorage.getItem("neurocase_admin_token") ||
            localStorage.getItem("neurocase_admin_token") ||
            ""
          : "";

      if (selectedFile) {
        setStreamMessage(`Preparing PDF document (${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)...`);
        setStreamProgress(8);

        // 1. Thử tải lên Vercel Blob (nếu Vercel Blob đã được kích hoạt trên hệ thống)
        try {
          const blobResult = await upload(selectedFile.name, selectedFile, {
            access: "public",
            handleUploadUrl: "/api/neuroguide/upload-blob",
            clientPayload: adminToken,
            onUploadProgress: (progress) => {
              const uploadPct = Math.round((progress.loaded / progress.total) * 20) + 10;
              setStreamProgress(uploadPct);
            },
          });
          blobUrl = blobResult.url;
          setStreamMessage("Uploaded to Vercel Blob successfully. Initializing AI pipeline...");
          setStreamProgress(30);
        } catch (uploadErr) {
          console.warn("Client Blob upload not available, switching to optimized streaming:", uploadErr);
        }

        // 2. Nếu không có Vercel Blob, tiến hành nén gzip phía client để vượt qua giới hạn 4.5 MB của Serverless
        if (!blobUrl && typeof CompressionStream !== "undefined") {
          try {
            setStreamMessage("Optimizing & compressing PDF for cloud streaming...");
            setStreamProgress(12);
            const cs = new CompressionStream("gzip");
            const writer = cs.writable.getWriter();
            writer.write(await selectedFile.arrayBuffer());
            writer.close();
            const gzBlob = await new Response(cs.readable).blob();
            if (gzBlob.size < selectedFile.size) {
              payloadToUpload = gzBlob;
              console.log(
                `PDF optimized: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB -> ${(gzBlob.size / (1024 * 1024)).toFixed(2)} MB`
              );
            }
          } catch (compErr) {
            console.warn("Client gzip compression skipped:", compErr);
          }
        }

        // 3. Nếu dung lượng (sau nén) vẫn > 4.1 MB, chia nhỏ tệp tải lên theo từng chunk 2MB (Chunked Upload)
        if (!blobUrl && payloadToUpload && payloadToUpload.size > 4.1 * 1024 * 1024) {
          setStreamMessage("Uploading large document in safe chunks (bypassing cloud limits)...");
          const generatedUploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const CHUNK_SIZE = 2 * 1024 * 1024;
          const totalChunks = Math.ceil(payloadToUpload.size / CHUNK_SIZE);

          for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
            const start = chunkIdx * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, payloadToUpload.size);
            const chunkBlob = payloadToUpload.slice(start, end);

            const chunkHeaders: Record<string, string> = {
              "x-upload-id": generatedUploadId,
              "x-chunk-index": String(chunkIdx),
              "x-total-chunks": String(totalChunks),
            };
            if (adminToken) chunkHeaders["x-admin-token"] = adminToken;

            const chunkRes = await fetch("/api/neuroguide/upload-chunk", {
              method: "POST",
              headers: chunkHeaders,
              body: chunkBlob,
            });

            if (!chunkRes.ok) {
              throw new Error(`Chunk upload failed at part ${chunkIdx + 1}/${totalChunks}`);
            }

            const pct = Math.round(((chunkIdx + 1) / totalChunks) * 18) + 12;
            setStreamProgress(pct);
          }

          uploadId = generatedUploadId;
          setStreamMessage("Document chunks assembled. Connecting to AI extraction stream...");
          setStreamProgress(32);
        }
      }

      // Connect to SSE Streaming Endpoint
      let streamResponse: Response;
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers["x-admin-token"] = adminToken;
      }

      if (blobUrl) {
        headers["Content-Type"] = "application/json";
        streamResponse = await fetch("/api/neuroguide/pipeline-stream", {
          method: "POST",
          headers,
          body: JSON.stringify({
            blob_url: blobUrl,
            fileName: selectedFile?.name || "guideline.pdf",
            society,
            title,
            year: year ? parseInt(year, 10) : undefined,
          }),
        });
      } else if (uploadId) {
        headers["Content-Type"] = "application/json";
        streamResponse = await fetch("/api/neuroguide/pipeline-stream", {
          method: "POST",
          headers,
          body: JSON.stringify({
            uploadId,
            fileName: selectedFile?.name || "guideline.pdf",
            society,
            title,
            year: year ? parseInt(year, 10) : undefined,
          }),
        });
      } else if (selectedFile && payloadToUpload) {
        // Fallback: direct multipart stream (với payload đã nén gzip nếu áp dụng)
        const formData = new FormData();
        formData.append("file", payloadToUpload, selectedFile.name);
        formData.append("society", society);
        if (title) formData.append("title", title);
        if (year) formData.append("year", year);

        streamResponse = await fetch("/api/neuroguide/pipeline-stream", {
          method: "POST",
          headers,
          body: formData,
        });
      } else {
        // Direct URL processing
        headers["Content-Type"] = "application/json";
        streamResponse = await fetch("/api/neuroguide/pipeline", {
          method: "POST",
          headers,
          body: JSON.stringify({
            url,
            society,
            title,
            year: year ? parseInt(year, 10) : undefined,
            discover: false,
          }),
        });

        const singleData = await streamResponse.json().catch(() => null);
        if (singleData && singleData.ok) {
          setResultMessage("✅ Clinical recommendations extracted successfully!");
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        } else {
          setErrorMessage(singleData?.error?.message || "Error processing URL extraction.");
        }
        setIsLoading(false);
        return;
      }

      if (!streamResponse.ok) {
        if (streamResponse.status === 413) {
          setErrorMessage("Tệp tin vượt quá giới hạn tải lên (4.5 MB). Vui lòng thử nén tệp tin hoặc giảm số trang PDF.");
        } else if (streamResponse.status === 401) {
          setErrorMessage("Phiên làm việc Quản trị viên (Admin) đã hết hạn. Vui lòng đăng nhập lại mật mã Admin.");
        } else {
          setErrorMessage(`Server returned HTTP ${streamResponse.status}`);
        }
        setIsLoading(false);
        return;
      }

      // Read Real-time SSE Stream
      const reader = streamResponse.body?.getReader();
      if (!reader) {
        throw new Error("Unable to initialize response stream reader.");
      }

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            try {
              const eventData = JSON.parse(trimmed.slice(5).trim());

              if (typeof eventData.percent === "number") {
                setStreamProgress(eventData.percent);
              }
              if (eventData.message) {
                setStreamMessage(eventData.message);
              }

              // Real-time batch received
              if (Array.isArray(eventData.recommendations) && eventData.recommendations.length > 0) {
                setLiveRecs((prev) => [...prev, ...eventData.recommendations]);
                onSuccess(); // Instantly refresh parent review queue in background
              }

              // Blob cleanup confirmation
              if (eventData.stage === "CLEANUP" && eventData.message?.toLowerCase().includes("success")) {
                setBlobCleaned(true);
              }

              if (eventData.stage === "COMPLETE") {
                setResultMessage(eventData.message || "Extraction complete!");
                onSuccess();
                setTimeout(() => {
                  onClose();
                }, 2200);
              } else if (eventData.stage === "ERROR") {
                setErrorMessage(eventData.message || eventData.error || "An error occurred during extraction.");
              }
            } catch (err) {
              console.warn("Error parsing SSE event:", err);
            }
          }
        }
      }
    } catch (submitErr) {
      const msg = submitErr instanceof Error ? submitErr.message : "Network error contacting AI Pipeline.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl transition-all ${
          darkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide">
                NEUROGUIDE AI PIPELINE & STREAMING
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Direct Blob Upload • Incremental Analysis • Auto-Storage Cleanup
              </p>
            </div>
          </div>
          {!isLoading && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 mb-4">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setMode("MANUAL");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "MANUAL"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>📥</span> Manual URL / File Upload
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setMode("DISCOVER");
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              mode === "DISCOVER"
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>📡</span> Multi-Society Radar Scan
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Medical Society */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Medical Society:
            </label>
            <select
              value={society}
              disabled={isLoading}
              onChange={(e) => setSociety(e.target.value)}
              className="w-full text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="AHA">AHA/ASA (American Heart / Stroke Association - COR/LOE)</option>
              <option value="ESO">ESO (European Stroke Organisation - GRADE)</option>
              <option value="AAN">AAN (American Academy of Neurology)</option>
              <option value="NCS">NCS (Neurocritical Care Society)</option>
              <option value="ILAE">ILAE / AES (Epilepsy Syndromes & Seizures)</option>
            </select>
          </div>

          {mode === "MANUAL" && (
            <>
              {/* Direct URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Direct Guideline PDF or DOI URL:
                </label>
                <input
                  type="text"
                  disabled={isLoading || Boolean(selectedFile)}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/guideline.pdf or 10.1161/STR..."
                  className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 outline-hidden focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                />
              </div>

              {/* Upload PDF Document - Concise & Clean */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Upload PDF Document:
                </label>
                {!selectedFile ? (
                  <div
                    onClick={() => !isLoading && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-colors ${
                      isLoading
                        ? "opacity-50 cursor-not-allowed"
                        : "border-slate-300 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-800/40"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,application/pdf"
                      className="hidden"
                      disabled={isLoading}
                    />
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg">📄</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Click to select guideline PDF file
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-300 dark:border-amber-500/40 bg-amber-500/5">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-base">📄</span>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for AI extraction
                        </p>
                      </div>
                    </div>
                    {!isLoading && (
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-xs text-rose-500 hover:text-rose-600 font-bold px-2 py-1 bg-rose-500/10 rounded-lg shrink-0 cursor-pointer"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Optional Title & Year */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Guideline Title (Optional):
                  </label>
                  <input
                    type="text"
                    disabled={isLoading}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 2024 AHA/ASA Stroke Prevention..."
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Year:</label>
                  <input
                    type="number"
                    disabled={isLoading}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 outline-hidden"
                  />
                </div>
              </div>
            </>
          )}

          {/* REAL-TIME STREAMING PROGRESS CARD */}
          {isLoading && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5 animate-in fade-in">
              <div className="flex justify-between items-center text-xs font-bold text-amber-600 dark:text-amber-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Real-Time AI Extraction Progress
                </span>
                <span>{streamProgress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: `${streamProgress}%` }}
                />
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                {streamMessage || "Initializing AI extraction pipeline..."}
              </p>

              {/* Blob cleanup indicator */}
              {blobCleaned && (
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-md">
                  <span>🗑️</span> Temporary PDF automatically deleted from Vercel Blob to conserve storage!
                </div>
              )}

              {/* Real-time Extracted Recommendations Preview */}
              {liveRecs.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-amber-500/20">
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <span>⚡ Newly Extracted Recommendations:</span>
                    <span className="bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-sm">
                      {liveRecs.length} total
                    </span>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-[11px]">
                    {liveRecs.slice(-3).map((r, i) => (
                      <div
                        key={r.rec_id || i}
                        className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-1.5"
                      >
                        <span className="shrink-0 px-1 py-0.5 text-[9px] font-black rounded-sm bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          COR: {r.cor || "I"}
                        </span>
                        <span className="shrink-0 px-1 py-0.5 text-[9px] font-black rounded-sm bg-blue-500/20 text-blue-600 dark:text-blue-400">
                          LOE: {r.loe || "A"}
                        </span>
                        <p className="line-clamp-1 text-slate-700 dark:text-slate-200">
                          {r.statement}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback Messages */}
          {resultMessage && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              {resultMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 text-xs font-semibold rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
              {errorMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t dark:border-slate-800">
            {!isLoading && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Hủy
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || (mode === "MANUAL" && !url && !selectedFile)}
              className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang phân tích trực tiếp...
                </>
              ) : (
                <>
                  <span>⚡</span> Bắt đầu bóc tách AI
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
