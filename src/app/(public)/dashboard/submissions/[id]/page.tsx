import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/ui/Pill";
import { requireUser } from "@/lib/auth/session";
import { articleTypeLabel, STATUS } from "@/lib/submissions/labels";
import { getSubmissionOverview } from "@/lib/submissions/queries";
import { startRevisionAction } from "@/lib/submissions/actions";
import { cn } from "@/lib/cn";
import { DeleteDraftButton } from "./DeleteDraftButton";

export const metadata: Metadata = { title: "Submission", robots: { index: false } };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const DECISION = { accept: "Accepted", revise: "Revision requested", decline: "Declined" } as const;
const REC = { accept: "Accept", minor_revision: "Minor revision", major_revision: "Major revision", reject: "Reject" } as const;
const PIPELINE = ["submitted", "editorial_check", "in_review", "decision", "published"] as const;

export default async function SubmissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  await requireUser(`/dashboard/submissions/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const s = await getSubmissionOverview(id);
  if (!s) notFound();

  const latest = s.versions[0];
  const status = STATUS[s.status];
  const reached = (stage: (typeof PIPELINE)[number]) => {
    const order = { draft: -1, submitted: 0, editorial_check: 1, in_review: 2, revision_requested: 3, accepted: 3, declined: 3, published: 4, withdrawn: 4 }[s.status];
    return PIPELINE.indexOf(stage) <= order;
  };
  const hasOpenVersion = s.versions.some((v) => !v.submitted_at);

  return (
    <section className="container-page pt-6">
      <Link href="/dashboard" className="text-sm font-semibold text-teal-deep hover:text-ink">
        ← Dashboard
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow text-muted">
            {s.ref} · {articleTypeLabel(s.article_type)}
            {s.discipline ? ` · ${s.discipline}` : ""}
          </p>
          <h1 className="mt-3 text-[clamp(28px,3.6vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em]">{latest?.title || "Untitled submission"}</h1>
        </div>
        <Pill tone={status.tone} className="text-sm">
          {status.label}
        </Pill>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-pink px-4 py-3 text-[13px] font-semibold text-[#7a1631]">
          We couldn’t start the revision. Please try again.
        </p>
      )}

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div className={cn("rounded-[28px] p-6", s.status === "revision_requested" ? "bg-pink" : "bg-surface")}>
            <p className="text-[15px] font-bold">{status.help}</p>
            {s.status === "draft" && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`/submit/${s.id}`} className="inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-bold text-white">
                  Continue draft
                </Link>
                <DeleteDraftButton submissionId={s.id} />
              </div>
            )}
            {s.status === "revision_requested" && (
              <form action={startRevisionAction.bind(null, s.id)} className="mt-4">
                <button type="submit" className="inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-bold text-white">
                  {hasOpenVersion ? "Continue revision" : "Start revision"}
                </button>
              </form>
            )}
          </div>

          {s.decisions.length > 0 && (
            <div className="rounded-[28px] bg-surface p-6">
              <h2 className="text-lg font-extrabold">Editorial decisions</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {s.decisions.map((d) => (
                  <li key={d.id} className="rounded-[20px] bg-bg p-4">
                    <p className="text-sm font-bold">
                      {DECISION[d.decision]} <span className="font-normal text-muted">· {fmt(d.created_at)}</span>
                    </p>
                    {d.note_to_author && <p className="mt-2 whitespace-pre-line font-serif text-[15px] leading-relaxed text-ink-soft">{d.note_to_author}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {s.reviews.length > 0 && (
            <div className="rounded-[28px] bg-surface p-6">
              <h2 className="text-lg font-extrabold">Reviewer comments</h2>
              <p className="mt-1 text-xs text-muted">Reviewers are anonymous.</p>
              <ul className="mt-3 flex flex-col gap-3">
                {s.reviews.map((r, i) => (
                  <li key={i} className="rounded-[20px] bg-bg p-4">
                    <p className="text-sm font-bold">
                      {r.reviewer_label} · version {r.version}
                      {r.recommendation && <span className="font-normal text-muted"> · recommends {REC[r.recommendation].toLowerCase()}</span>}
                    </p>
                    <p className="mt-2 whitespace-pre-line font-serif text-[15px] leading-relaxed text-ink-soft">{r.comments_to_author}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-[28px] bg-surface p-6">
            <h2 className="text-lg font-extrabold">Versions</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {s.versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-[18px] bg-bg px-4 py-3 text-sm">
                  <span className="font-mono text-xs">v{v.version}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{v.title || "Untitled"}</span>
                  <span className="text-xs text-muted">{v.submitted_at ? `Submitted ${fmt(v.submitted_at)}` : "In progress"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="rounded-[28px] bg-surface p-6">
          <h2 className="text-[15px] font-extrabold">Progress</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {[
              ["submitted", "Submitted", fmt(s.submitted_at)],
              ["editorial_check", "Editorial check", ""],
              ["in_review", "Peer review", ""],
              ["decision", "Decision", fmt(s.decided_at)],
              ["published", "Published", ""],
            ].map(([key, label, date]) => {
              const on = reached(key as (typeof PIPELINE)[number]);
              return (
                <li key={key} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", on ? "bg-teal text-white" : "bg-bg text-muted")}
                  >
                    {on ? "✓" : ""}
                  </span>
                  <span className={cn("text-sm", on ? "font-bold" : "text-muted")}>
                    {label}
                    <span className="sr-only">{on ? " — reached" : " — not yet"}</span>
                  </span>
                  {date && <span className="ml-auto text-xs text-muted">{date}</span>}
                </li>
              );
            })}
          </ol>
        </aside>
      </div>
    </section>
  );
}
