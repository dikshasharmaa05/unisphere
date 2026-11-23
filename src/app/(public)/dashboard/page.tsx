import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/PageIntro";
import { ButtonLink } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { requireUser } from "@/lib/auth/session";
import { STATUS } from "@/lib/submissions/labels";
import { listMySubmissions } from "@/lib/submissions/queries";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function DashboardPage() {
  const viewer = await requireUser("/dashboard");
  const first = viewer.profile?.full_name?.split(" ")[0];
  const subs = await listMySubmissions(viewer.user.id);
  const needsAction = subs.filter((s) => s.status === "revision_requested" || s.status === "draft");

  return (
    <section className="container-page pt-6">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <PageIntro eyebrow="Dashboard" title={first ? `Hello, ${first}` : "Your dashboard"} />
        <ButtonLink href="/submit" variant="signature" size="lg">
          New submission
        </ButtonLink>
      </div>

      {needsAction.length > 0 && (
        <div className="mt-8 rounded-[28px] bg-lime p-5 sm:p-6">
          <h2 className="text-[15px] font-extrabold">Needs your attention</h2>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {needsAction.map((s) => (
              <li key={s.id}>
                <Link href={s.has_open_version ? `/submit/${s.id}` : `/dashboard/submissions/${s.id}`} className="font-semibold underline underline-offset-2">
                  {s.title}
                </Link>{" "}
                — {s.status === "draft" ? "draft not submitted yet" : "revision requested"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 rounded-[32px] bg-surface p-[clamp(20px,3vw,36px)]">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">Your submissions</h2>
        {subs.length === 0 ? (
          <div className="mt-4 rounded-[22px] bg-bg p-6 text-sm text-muted">
            You haven’t submitted anything yet.{" "}
            <Link href="/submit" className="font-bold text-teal-deep underline underline-offset-2">
              Start your first submission
            </Link>
            .
          </div>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {subs.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.status === "draft" ? `/submit/${s.id}` : `/dashboard/submissions/${s.id}`}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] bg-bg px-5 py-4 transition-colors hover:bg-line"
                >
                  <span className="font-mono text-xs text-muted">{s.ref}</span>
                  <span className="min-w-0 flex-[1_1_260px]">
                    <span className="block truncate font-bold">{s.title}</span>
                    <span className="block text-xs text-muted">
                      {s.submitted_at ? `Submitted ${fmt(s.submitted_at)}` : `Started ${fmt(s.updated_at)}`}
                      {s.version > 1 ? ` · version ${s.version}` : ""}
                    </span>
                  </span>
                  <Pill tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Pill>
                  <span aria-hidden="true" className="text-muted transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
