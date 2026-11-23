import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/Feedback";
import { IssuesManager } from "@/components/admin/IssuesManager";
import { requireRole, ROLE_GROUPS } from "@/lib/auth/session";
import { getIssues } from "@/lib/editorial/queries";

export const metadata: Metadata = { title: "Issues & archive" };

export default async function IssuesPage() {
  await requireRole(ROLE_GROUPS.admin, "/admin/issues");
  const data = await getIssues();
  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title="Issues & archive" />
      <IssuesManager {...data} />
    </div>
  );
}
