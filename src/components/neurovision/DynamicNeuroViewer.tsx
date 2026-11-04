"use client";

import dynamic from "next/dynamic";
import React from "react";

export const DynamicNeuroViewer = dynamic(
  () => import("./NeuroViewerCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[480px] bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium">Khởi tạo WebGL NiiVue Viewer...</p>
      </div>
    ),
  }
);
