"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminAuthModal } from "../neurocase/modals/AdminAuthModal";

interface AdminButtonProps {
  darkMode?: boolean;
}

export function AdminButton({ darkMode = false }: AdminButtonProps) {
  const router = useRouter();
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const token =
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token");
    setIsAdminVerified(Boolean(token));
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const token =
      sessionStorage.getItem("neurocase_admin_token") ||
      localStorage.getItem("neurocase_admin_token");
    if (token) {
      router.push("/admin");
    } else {
      setShowModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsAdminVerified(true);
    setShowModal(false);
    router.push("/admin");
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`px-2.5 py-2 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 relative group ${
          isAdminVerified
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
            : darkMode
            ? "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        }`}
        title={isAdminVerified ? "Admin Command Center (Verified)" : "Admin Command Center Login"}
        aria-label="Admin Control Center"
      >
        <span className="text-sm">🛡️</span>
        <span className="hidden sm:inline">Admin</span>
        {isAdminVerified && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        )}
      </button>

      {/* Admin Quick Login Modal */}
      <AdminAuthModal
        show={showModal}
        darkMode={darkMode}
        onClose={() => setShowModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
