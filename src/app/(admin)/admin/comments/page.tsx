import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/Feedback";
import { requireRole, ROLE_GROUPS } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Comment moderation" };

export default async function Page() {
  await requireRole(ROLE_GROUPS.admin, "/admin/comments");
  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title="Comment moderation" />
      <section className="rounded-[32px] bg-surface p-6 sm:p-8">
        <p className="eyebrow text-muted">Coming in Phase 8 (comments & likes)</p>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">Reader comments on published articles will queue here for approval. The database side is ready: comments are hidden until an editor approves them.</p>
      </section>
    </div>
  );
}
