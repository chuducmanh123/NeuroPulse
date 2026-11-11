import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "NeuroRx — Clinical Neuropharmacology & Bedside Dosing Suite",
  description: "Point-of-care clinical decision support system for neurology and stroke therapeutics.",
  manifest: "/neurorx/manifest.webmanifest",
};

export default function NeuroRxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
}
