import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/PageIntro";
import { Pill } from "@/components/ui/Pill";
import { ROLE_GROUPS, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { articleTypeLabel } from "@/lib/submissions/labels";

export const metadata: Metadata = { title: "Reviews", robots: { index: false } };

type Row = { review_id: string; submission_ref: string; version: number; title: string; discipline: string | null; article_type: import("@/lib/supabase/types").ArticleType; status: "assigned" | "submitted" | "withdrawn"; due_at: string | null; assigned_at: string; submitted_at: string | null };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

export default async function ReviewListPage() {
  await requireRole(ROLE_GROUPS.review, "/review");
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_review_assignments");
  const rows = data ?? [];
  const open = rows.filter((r) => r.status === "assigned");
  const done = rows.filter((r) => r.status !== "assigned");

  return (
    <section className="container-page pt-6">
      <PageIntro eyebrow="Reviewer workspace" title="Your reviews">
        Manuscripts the editors have asked you to review. Reviews are anonymous: authors never see your name.
      </PageIntro>
      <div className="mt-8 rounded-[32px] bg-surface p-[clamp(20px,3vw,36px)]">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">To review ({open.length})</h2>
        {open.length ? <ReviewList items={open} /> : <p className="mt-4 rounded-[20px] bg-bg p-5 text-sm text-muted">Nothing waiting for you. Thank you!</p>}
        {done.length > 0 && (
          <>
            <h2 className="mt-8 text-xl font-extrabold tracking-[-0.02em]">Completed</h2>
            <ReviewList items={done} />
          </>
        )}
      </div>
    </section>
  );
}

function ReviewList({ items }: { items: Row[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {items.map((r) => {
        const overdue = r.status === "assigned" && r.due_at && new Date(r.due_at) < new Date();
        return (
          <li key={r.review_id}>
            <Link href={`/review/${r.review_id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] bg-bg px-5 py-4 hover:bg-line">
              <span className="font-mono text-xs text-muted">{r.submission_ref}</span>
              <span className="min-w-0 flex-[1_1_260px]">
                <span className="block font-bold">{r.title || "Untitled"}</span>
                <span className="block text-xs text-muted">
                  {[r.discipline, articleTypeLabel(r.article_type), r.version > 1 ? `revision v${r.version}` : null].filter(Boolean).join(" · ")}
                </span>
              </span>
              {r.status === "assigned" ? (
                <Pill tone={overdue ? "pink" : "aqua"}>{r.due_at ? `${overdue ? "Overdue" : "Due"} ${fmt(r.due_at)}` : "Open"}</Pill>
              ) : (
                <Pill tone={r.status === "submitted" ? "seafoam" : "stone"}>{r.status === "submitted" ? `Submitted ${fmt(r.submitted_at)}` : "Withdrawn"}</Pill>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
