import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NeuroGuide | Clinical Guidelines & Conference Intelligence Hub",
  description:
    "Evidence-based neurology & stroke clinical guideline comparator (AHA/ASA, ESO, AAN, EAN), scenario matrices, and major conference highlights (ISC, ESOC, WSC, AAN).",
  openGraph: {
    title: "NeuroGuide | Neurology Guidelines & Conference Intelligence",
    description: "Compare international stroke & neurology guideline recommendations, conflicting scenario matrix, and conference trial updates.",
    type: "website",
  },
};

export default function NeuroGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
