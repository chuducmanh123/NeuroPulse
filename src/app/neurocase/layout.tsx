import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NeuroCase | Clinical Case Challenge & Board Examination",
  description:
    "Interactive neurology case reasoning challenge with authentic neuroimaging (MRI, CT, DSA, EEG), clinical decision MCQs, and literature correlation from NeuroPulse.",
  openGraph: {
    title: "NeuroCase | Interactive Neurology Clinical Reasoning",
    description: "Test your diagnostic skills with real-world neurology and stroke cases, neuroimaging viewer, and high-yield clinical decision questions.",
    type: "website",
  },
};

export default function NeuroCaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
