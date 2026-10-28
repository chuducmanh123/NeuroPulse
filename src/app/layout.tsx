import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neurology & Stroke Journal Monitor | Multi-Journal Clinical Tracker",
  description:
    "Automated clinical research aggregator for Neurology & Stroke from NEJM, The Lancet, Lancet Neurology, JAMA, JAMA Neurology, Stroke, Neurology, and Annals of Neurology.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 bg-slate-100">{children}</body>
    </html>
  );
}
