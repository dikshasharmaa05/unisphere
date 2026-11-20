import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Submit your article", robots: { index: false } };

export default async function SubmitPage() {
  await requireUser("/submit");
  return <ComingSoon eyebrow="New submission" title="Submit your article" phase="the submission-flow phase" />;
}
