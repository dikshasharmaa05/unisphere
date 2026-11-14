import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Archive" };

export default function ArchivePage() {
  return <ComingSoon eyebrow="Archive" title="Search every paper we’ve published." phase="the archive & search phase" />;
}
