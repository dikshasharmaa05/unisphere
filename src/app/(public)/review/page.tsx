import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/PageIntro";
import { ROLE_GROUPS, requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

export default async function ReviewPage() {
  await requireRole(ROLE_GROUPS.review, "/review");
  return (
    <section className="container-page pt-6">
      <PageIntro eyebrow="Reviewer workspace" title="Your assigned reviews">
        Manuscripts assigned to you will appear here (Phase 5).
      </PageIntro>
    </section>
  );
}
