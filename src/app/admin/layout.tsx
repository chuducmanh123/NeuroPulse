import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Neuro Admin Command Center | Centralized Ecosystem Operations",
  description: "Centralized moderation, guideline radar intelligence, and multi-journal operations for the Neuro ecosystem.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
