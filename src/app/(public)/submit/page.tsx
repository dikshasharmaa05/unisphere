import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/PageIntro";
import { Pill } from "@/components/ui/Pill";
import { requireUser } from "@/lib/auth/session";
import { createSubmissionAction } from "@/lib/submissions/actions";
import { STATUS } from "@/lib/submissions/labels";
import { listMySubmissions } from "@/lib/submissions/queries";
import { SubmitAside } from "@/components/submit/SubmitAside";

export const metadata: Metadata = { title: "Submit your article", robots: { index: false } };

export default async function SubmitStartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const viewer = await requireUser("/submit");
  const { error } = await searchParams;
  const open = (await listMySubmissions(viewer.user.id)).filter((s) => s.has_open_version);

  return (
    <section className="container-page pt-4">
      <PageIntro eyebrow="New submission" title="Submit your article">
        Four short steps. Your submission goes to the editorial team for review before anything is published.
      </PageIntro>
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5 rounded-[32px] bg-surface p-[clamp(24px,3.4vw,44px)]">
          {error && (
            <p role="alert" className="rounded-2xl bg-pink px-4 py-3 text-[13px] font-semibold text-[#7a1631]">
              We couldn’t start a new submission. Please try again.
            </p>
          )}
          <div>
            <h2 className="text-2xl font-extrabold tracking-[-0.025em]">Start a new submission</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              Your progress is saved as you go, so you can stop and come back any time. You’ll need your title, abstract, author details and
              the manuscript file (DOCX or PDF).
            </p>
            <form action={createSubmissionAction} className="mt-5">
              <button
                type="submit"
                className="nudge-arrow inline-flex h-[58px] items-center gap-[18px] rounded-full bg-line pl-[26px] pr-[7px] text-[15px] font-bold hover:bg-[#d9dfd9]"
              >
                Start submission
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-lime">→</span>
              </button>
            </form>
          </div>
          {open.length > 0 && (
            <div className="border-t border-line pt-5">
              <h2 className="text-lg font-extrabold">Continue where you left off</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {open.map((s) => (
                  <li key={s.id}>
                    <Link href={`/submit/${s.id}`} className="flex flex-wrap items-center gap-3 rounded-[20px] bg-bg px-5 py-4 hover:bg-line">
                      <span className="font-mono text-xs text-muted">{s.ref}</span>
                      <span className="min-w-0 flex-1 truncate font-bold">{s.title}</span>
                      <Pill tone={STATUS[s.status].tone}>{s.status === "revision_requested" ? `Revision · v${s.version}` : STATUS[s.status].label}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <SubmitAside />
      </div>
    </section>
  );
}
