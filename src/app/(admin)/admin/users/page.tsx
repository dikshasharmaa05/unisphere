import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/Feedback";
import { UsersManager } from "@/components/admin/UsersManager";
import { requireRole, ROLE_GROUPS } from "@/lib/auth/session";
import { getPeople } from "@/lib/editorial/queries";

export const metadata: Metadata = { title: "Users & reviewers" };

export default async function UsersPage() {
  const viewer = await requireRole(ROLE_GROUPS.admin, "/admin/users");
  const people = await getPeople();
  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title="Users & reviewers" />
      <UsersManager people={people} isAdmin={viewer.roles.includes("admin")} selfId={viewer.user.id} />
    </div>
  );
}
