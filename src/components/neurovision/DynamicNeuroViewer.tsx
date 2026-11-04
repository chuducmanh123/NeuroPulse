"use client";

import dynamic from "next/dynamic";
import React from "react";

export const DynamicNeuroViewer = dynamic(
  () => import("./NeuroViewerCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[480px] bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-9 h-9 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-sky-400 tracking-wider">ĐANG TẢI DỮ LIỆU</p>
      </div>
    ),
  }
);
