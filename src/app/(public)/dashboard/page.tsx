import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/PageIntro";
import { ButtonLink } from "@/components/ui/Button";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const viewer = await requireUser("/dashboard");
  const first = viewer.profile?.full_name?.split(" ")[0];
  return (
    <section className="container-page pt-6">
      <PageIntro eyebrow="Dashboard" title={first ? `Hello, ${first}` : "Your dashboard"}>
        Your submissions, their review status and any change requests will appear here once the submission flow is live.
      </PageIntro>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/submit" variant="signature" size="lg">
          Submit an article
        </ButtonLink>
        <ButtonLink href="/account" variant="white" size="lg">
          Edit profile
        </ButtonLink>
      </div>
    </section>
  );
}
