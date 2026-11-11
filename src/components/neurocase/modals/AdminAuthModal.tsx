"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface AdminAuthModalProps {
  show: boolean;
  onClose: () => void;
  darkMode: boolean;
  onSuccess: () => void;
}

export function AdminAuthModal({ show, onClose, darkMode, onSuccess }: AdminAuthModalProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!show) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [show, onClose]);

  if (!show || !mounted || typeof document === "undefined") {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/neurocase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_admin",
          passcode: passcode.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.token) {
        sessionStorage.setItem("neurocase_admin_token", data.token);
        localStorage.setItem("neurocase_admin_token", data.token);
        setPasscode("");
        onSuccess();
        onClose();
      } else {
        setError(data?.error || "Invalid administrator passcode.");
      }
    } catch {
      setError("Network error verifying passcode.");
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`max-w-sm w-full rounded-2xl border p-6 shadow-2xl space-y-4 my-auto relative ${
          darkMode
            ? "bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/60"
            : "bg-white border-slate-200 text-slate-900 shadow-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-500">
            🛡️ ADMIN AUTHENTICATION
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <h3 className="text-base font-black">Verify Admin Access</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Enter the administrator passcode to unlock the Case Moderation Queue (<code>Admin Review</code>).
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              setError("");
            }}
            placeholder="Enter admin passcode"
            autoFocus
            className={`w-full px-3.5 py-2.5 rounded-lg border text-xs font-bold transition-colors ${
              darkMode
                ? "bg-slate-800 border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
                : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-500 focus:outline-none"
            }`}
          />
          {error && <p className="text-xs font-bold text-rose-500">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
                darkMode
                  ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              {loading ? "Verifying..." : "Unlock Admin Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
