"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Checkbox, Textarea } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icon";
import { submitAction } from "@/lib/submissions/actions";
import { articleTypeLabel } from "@/lib/submissions/labels";
import type { SubmissionForEdit } from "@/lib/submissions/queries";
import { cn } from "@/lib/cn";
import { StepHeading } from "./StepNav";

export type ChecklistItem = { ok: boolean; label: string; step: number };

export function StepReview({
  submission,
  disciplineName,
  checklist,
  isRevision,
}: {
  submission: SubmissionForEdit;
  disciplineName: string | null;
  checklist: ChecklistItem[];
  isRevision: boolean;
}) {
  const [coverLetter, setCoverLetter] = useState(submission.cover_letter ?? "");
  const [originality, setOriginality] = useState(false);
  const [changesByRequest, setChangesByRequest] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = checklist.every((c) => c.ok);
  const v = submission.version;
  const counts = (kinds: string[]) => submission.files.filter((f) => kinds.includes(f.kind)).length;

  if (done !== null) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 py-4">
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-lime">
          <Icon name="check" size={24} strokeWidth={2.6} />
        </span>
        <h2 className="text-[28px] font-extrabold tracking-[-0.025em]">{isRevision ? "Revision submitted" : "Submitted for review"}</h2>
        <p className="max-w-lg text-[15px] leading-relaxed text-muted">
          Thank you. Your submission <strong className="font-mono text-ink">{done}</strong> is with the editorial team. You can follow its
          status on your dashboard; we’ll email you when it changes.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <Link href={`/dashboard/submissions/${submission.id}`} className="inline-flex h-[54px] items-center rounded-full bg-ink px-6 text-[15px] font-bold text-white">
            View submission
          </Link>
          <Link href="/dashboard" className="inline-flex h-[54px] items-center rounded-full bg-bg px-6 text-[15px] font-bold hover:bg-line">
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const rows: [string, React.ReactNode][] = [
    ["Title", v.title || <em className="text-muted">Missing</em>],
    ["Discipline", disciplineName ?? <em className="text-muted">Missing</em>],
    ["Type", articleTypeLabel(submission.article_type)],
    ["Keywords", submission.keywords.length ? submission.keywords.join(", ") : <em className="text-muted">None</em>],
    ["Authors", submission.authors.map((a) => a.full_name).join(", ")],
    [
      "Files",
      [
        counts(["manuscript"]) ? "Manuscript" : null,
        counts(["image"]) ? `${counts(["image"])} images` : null,
        counts(["figure"]) ? `${counts(["figure"])} graphs/figures` : null,
        counts(["dataset"]) ? `${counts(["dataset"])} datasets` : null,
        counts(["video_upload", "video_embed"]) ? `${counts(["video_upload", "video_embed"])} video` : null,
        counts(["supplementary"]) ? `${counts(["supplementary"])} supplementary` : null,
      ]
        .filter(Boolean)
        .join(", ") || <em className="text-muted">No files yet</em>,
    ],
  ];

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step={4} title="Review & submit" />

      <dl className="grid grid-cols-[auto_1fr] gap-x-[18px] gap-y-2.5 rounded-[22px] bg-bg p-5 text-sm">
        {rows.map(([k, val]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className="min-w-0 break-words font-semibold">{val}</dd>
          </div>
        ))}
      </dl>

      <div className="rounded-[22px] border border-line p-5">
        <h3 className="text-[15px] font-bold">Checklist</h3>
        <ul className="mt-3 flex flex-col gap-2">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden="true"
                className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full", c.ok ? "bg-teal text-white" : "bg-pink text-[#7a1631]")}
              >
                {c.ok ? <Icon name="check" size={12} strokeWidth={3} /> : "!"}
              </span>
              <span className={c.ok ? "" : "font-semibold"}>
                {c.label}
                <span className="sr-only">{c.ok ? " — done" : " — missing"}</span>
              </span>
              {!c.ok && (
                <Link href={`/submit/${submission.id}?step=${c.step}`} className="ml-auto text-[13px] font-bold text-teal-deep underline underline-offset-2">
                  Fix in step {c.step}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>

      {!isRevision && (
        <Textarea
          label={
            <>
              Cover letter <span className="font-medium text-muted">· optional, only editors see it</span>
            </>
          }
          rows={4}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          maxLength={5000}
        />
      )}

      <div className="flex flex-col gap-1">
        <Checkbox
          checked={originality}
          onChange={(e) => setOriginality(e.target.checked)}
          label="This work is original, not under review elsewhere, and all authors agree to submission."
          className="items-start text-sm leading-relaxed [&_input]:mt-1"
        />
        <Checkbox
          checked={changesByRequest}
          onChange={(e) => setChangesByRequest(e.target.checked)}
          label="I understand that after submission, changes are made by request to the editorial team."
          className="items-start text-sm leading-relaxed [&_input]:mt-1"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-pink px-4 py-3 text-[13px] font-semibold text-[#7a1631]">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap justify-between gap-3 border-t border-[#ECEFEC] pt-5">
        <Link href={`/submit/${submission.id}?step=3`} className="inline-flex h-[54px] items-center rounded-full bg-bg px-6 text-[15px] font-bold hover:bg-line">
          Back
        </Link>
        <button
          type="button"
          disabled={pending || !ready || !originality || !changesByRequest}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await submitAction({ submissionId: submission.id, originality, changesByRequest, coverLetter: isRevision ? undefined : coverLetter });
              if (res.ok) setDone(res.data?.ref ?? submission.ref);
              else setError(res.error);
            })
          }
          className="nudge-arrow inline-flex h-[54px] items-center gap-4 rounded-full bg-ink pl-6 pr-[7px] text-[15px] font-bold text-white hover:bg-[#26302e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Submitting…" : isRevision ? "Submit revision" : "Submit for review"}
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-lime text-ink">
            <Icon name="arrowRight" strokeWidth={2.2} />
          </span>
        </button>
      </div>
      {!ready && <p className="text-right text-xs text-muted">Complete the checklist to submit.</p>}
    </div>
  );
}
