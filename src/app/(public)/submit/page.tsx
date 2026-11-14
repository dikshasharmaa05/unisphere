import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const metadata: Metadata = { title: "Submit your article" };

export default function SubmitPage() {
  return <ComingSoon eyebrow="New submission" title="Submit your article" phase="the submission-flow phase" />;
}
