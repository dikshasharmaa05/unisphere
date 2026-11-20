import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/PageIntro";
import { ROLE_GROUPS, requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Editorial desk", robots: { index: false } };

export default async function AdminPage() {
  const viewer = await requireRole(ROLE_GROUPS.admin, "/admin");
  return (
    <section className="container-page pt-6">
      <PageIntro eyebrow="Editorial desk" title="Submissions">
        Signed in with {viewer.roles.filter((r) => r === "admin" || r === "editor").join(" + ")} access. The full admin panel arrives in Phase 5.
      </PageIntro>
    </section>
  );
}
