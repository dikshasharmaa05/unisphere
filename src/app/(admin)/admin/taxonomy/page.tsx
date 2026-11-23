import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/Feedback";
import { TaxonomyManager } from "@/components/admin/TaxonomyManager";
import { requireRole, ROLE_GROUPS } from "@/lib/auth/session";
import { getTaxonomy } from "@/lib/editorial/queries";

export const metadata: Metadata = { title: "Categories & tags" };

export default async function TaxonomyPage() {
  await requireRole(ROLE_GROUPS.admin, "/admin/taxonomy");
  const data = await getTaxonomy();
  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title="Categories & tags" />
      <TaxonomyManager {...data} />
    </div>
  );
}
