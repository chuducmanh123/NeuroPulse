"use client";

import React, { createContext, useContext, useRef, useState } from "react";
import type { Niivue } from "@niivue/niivue";

interface NeuroViewerContextType {
  getNiivue: () => Niivue | null;
  setNiivue: (instance: Niivue | null) => void;
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
}

const NeuroViewerContext = createContext<NeuroViewerContextType>({
  getNiivue: () => null,
  setNiivue: () => {},
  isReady: false,
  setIsReady: () => {},
});

export function NeuroViewerProvider({ children }: { children: React.ReactNode }) {
  const nvRef = useRef<Niivue | null>(null);
  const [isReady, setIsReady] = useState(false);

  const getNiivue = () => nvRef.current;
  const setNiivue = (instance: Niivue | null) => {
    nvRef.current = instance;
    setIsReady(instance !== null);
  };

  return (
    <NeuroViewerContext.Provider value={{ getNiivue, setNiivue, isReady, setIsReady }}>
      {children}
    </NeuroViewerContext.Provider>
  );
}

export function useNeuroViewer() {
  return useContext(NeuroViewerContext);
}
