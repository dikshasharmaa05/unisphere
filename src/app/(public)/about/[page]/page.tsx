import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "About", robots: { index: false } };

export default function AboutPage() {
  return <ComingSoon eyebrow="About" title="About the journal" phase="a later phase (content managed from Admin)" />;
}
