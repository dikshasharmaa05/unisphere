import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin/Feedback";
import { SettingsManager } from "@/components/admin/SettingsManager";
import { journal } from "@/config/journal";
import { requireRole, ROLE_GROUPS } from "@/lib/auth/session";
import { getSettings } from "@/lib/editorial/queries";

export const metadata: Metadata = { title: "Site settings" };

export default async function SettingsPage() {
  const viewer = await requireRole(ROLE_GROUPS.admin, "/admin/settings");
  const s = await getSettings();
  const identity: [string, string][] = [
    ["Journal name", journal.name],
    ["Full title", journal.fullTitle],
    ["ISSN", journal.issn],
    ["DOI prefix", journal.doiPrefix],
    ["Publisher", journal.publisher],
    ["Frequency", journal.frequency],
    ["Editorial email", journal.editorialEmail],
  ];
  return (
    <div className="flex flex-col gap-5">
      <AdminHeader title="Site settings" />
      <SettingsManager
        isAdmin={viewer.roles.includes("admin")}
        reviewModel={(s.review_model as string) === "single_blind" ? "single_blind" : "double_blind"}
        licence={(s.default_licence as string) ?? "CC BY 4.0"}
        limits={(s.upload_limits ?? {}) as Record<string, { maxMb: number; types: string[] } | number>}
      />
      <section className="rounded-[32px] bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">Journal identity</h2>
        <p className="mt-1 text-sm text-muted">
          Set in <code className="rounded bg-bg px-1.5 py-0.5 font-mono text-xs">src/config/journal.ts</code>. Values in [brackets] are placeholders until registered.
        </p>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {identity.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-2 rounded-[18px] bg-bg px-4 py-3 text-sm">
              <dt className="font-bold">{k}</dt>
              <dd className="font-mono text-xs">{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
