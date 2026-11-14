import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Article", robots: { index: false } };

export default function ArticlePage() {
  return <ComingSoon eyebrow="Article" title="Article pages" phase="the article page phase (gating, Scholar tags, citations, PDF)" />;
}
