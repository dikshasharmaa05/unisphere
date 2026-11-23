import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/Feedback";
import { requireRole, ROLE_GROUPS } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Change requests" };

export default async function Page() {
  await requireRole(ROLE_GROUPS.admin, "/admin/change-requests");
  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title="Change requests" />
      <section className="rounded-[32px] bg-surface p-6 sm:p-8">
        <p className="eyebrow text-muted">Coming in Phase 9 (change requests)</p>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">Authors’ correction and withdrawal requests for published articles will queue here. The database side is ready: approving a correction creates a new public version and keeps the history.</p>
      </section>
    </div>
  );
}
