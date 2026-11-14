import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Author guidelines" };

export default function GuidelinesPage() {
  return <ComingSoon eyebrow="Journal guidelines" title="Author guidelines & template" phase="a later phase (content managed from Admin)" />;
}
