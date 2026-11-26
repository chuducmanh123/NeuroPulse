import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "NeuroCalc — Clinical Neurology Scales & Bedside Calculators",
  description:
    "Point-of-care clinical neurology scales, bedside assessment guides, and medical calculators.",
};

export default function NeuroCalcLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen medical-journal-app">{children}</div>;
}
