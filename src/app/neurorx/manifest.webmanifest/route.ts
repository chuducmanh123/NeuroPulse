import { NextResponse } from "next/server";

export function GET() {
  const manifest = {
    name: "NeuroRx — Clinical Neuropharmacology & Bedside Dosing Suite",
    short_name: "NeuroRx",
    description: "Point-of-care clinical decision support system for neurology and stroke therapeutics.",
    start_url: "/neurorx",
    scope: "/neurorx",
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    icons: [
      {
        src: "/neurorx-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
