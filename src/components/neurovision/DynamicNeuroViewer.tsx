"use client";

import dynamic from "next/dynamic";
import React from "react";
import { DrawLoader } from "../ecosystem/DrawLoader";

export const DynamicNeuroViewer = dynamic(
  () => import("./NeuroViewerCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[480px] bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <DrawLoader
          variant="brain"
          label="ĐANG TẢI DỮ LIỆU"
          accentClassName="text-sky-400"
          labelClassName="text-xs font-bold text-sky-400 tracking-wider"
        />
      </div>
    ),
  }
);
