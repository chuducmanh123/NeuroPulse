import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NeuroVision | Neuroanatomy & Imaging Reference",
  description:
    "Educational neuroanatomy reference on the MNI152 template: anatomy, vascular territories and white-matter atlases. Not for diagnosis or treatment decisions.",
};

export default function NeuroVisionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
