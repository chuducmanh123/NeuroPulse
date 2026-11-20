import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "NeuroPulse | Neurology & Stroke Journal Monitor",
  description:
    "Automated clinical research aggregator for Neurology & Stroke from NEJM, The Lancet, Lancet Neurology, JAMA, JAMA Neurology, Stroke, Neurology, and Annals of Neurology.",
};

export default function NeuroPulseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="medical-journal-app">{children}</div>;
}
