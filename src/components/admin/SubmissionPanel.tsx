"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { OrcidBadge } from "@/components/auth/OrcidBadge";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/Input";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";
import {
  assignReviewerAction,
  publishAction,
  recordDecisionAction,
  startEditorialCheckAction,
  withdrawReviewAction,
} from "@/lib/editorial/actions";
import type { Person, SubmissionDetail } from "@/lib/editorial/queries";
import { articleTypeLabel, formatBytes, STATUS } from "@/lib/submissions/labels";
import { Feedback } from "./Feedback";
import { FinalPdfPanel, FullTextPanel } from "./PublishingTools";
import { useAction } from "./useAction";

type IssueOption = { id: number; number: number; label: string | null; published_at: string | null; volume: number | null };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const REC = { accept: "Recommends accept", minor_revision: "Minor revision", major_revision: "Major revision", reject: "Recommends reject" } as const;
const KIND = { manuscript: "Manuscript", image: "Image", figure: "Figure", dataset: "Dataset", video_upload: "Video", video_embed: "Video link", supplementary: "Supplementary" } as const;

export function SubmissionPanel({ detail: d, pool, issues }: { detail: SubmissionDetail; pool: Person[]; issues: IssueOption[] }) {
  const { run, pending, feedback } = useAction();
  const [assignOpen, setAssignOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "accept" | "revise" | "decline">(null);
  const [note, setNote] = useState("");
  const status = STATUS[d.status];
  const underConsideration = ["submitted", "editorial_check", "in_review"].includes(d.status);
  const activeReviews = d.reviews.filter((r) => r.status !== "withdrawn");
  const currentVersion = d.version?.version ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-mono text-xs text-muted">
          {d.ref} · received {fmt(d.submitted_at)}
          {currentVersion > 1 ? ` · v${currentVersion}` : ""}
        </span>
        <Pill tone={status.tone}>{status.label}</Pill>
      </div>
      <h2 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">{d.version?.title || "Untitled"}</h2>
      <p className="text-[13px] text-muted">
        {[articleTypeLabel(d.article_type), d.discipline].filter(Boolean).join(" · ")}
      </p>

      {/* Authors (editors only — reviewers never see this) */}
      <ul className="flex flex-col gap-1.5 text-[13px]">
        {d.authors.map((a, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-bold">{a.full_name}</span>
            {a.affiliation && <span className="text-muted">· {a.affiliation}</span>}
            {a.is_corresponding && a.email && (
              <a href={`mailto:${a.email}`} className="text-teal-deep underline underline-offset-2">
                {a.email}
              </a>
            )}
            {a.orcid && <OrcidBadge orcid={a.orcid} />}
          </li>
        ))}
      </ul>

      {/* Files */}
      {d.files.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Files">
          {d.files.map((f) => (
            <li key={f.id}>
              <a
                href={f.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-bg px-3 text-xs font-semibold hover:bg-line"
                title={f.file_name ?? f.url ?? ""}
              >
                {KIND[f.kind]}
                {f.file_name ? `: ${f.file_name.length > 22 ? f.file_name.slice(0, 20) + "…" : f.file_name}` : ""}
                {f.bytes ? <span className="text-muted">({formatBytes(f.bytes)})</span> : null}
                {f.contains_identity && <span className="rounded-full bg-pink px-1.5 text-[10px]">identifying</span>}
              </a>
            </li>
          ))}
        </ul>
      )}

      <details className="rounded-[18px] bg-bg p-4 text-sm">
        <summary className="cursor-pointer font-bold">Abstract & keywords</summary>
        <p className="mt-2 whitespace-pre-line font-serif text-[15px] leading-relaxed text-ink-soft">{d.version?.abstract}</p>
        {d.keywords.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {d.keywords.map((k) => (
              <span key={k} className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">
                {k}
              </span>
            ))}
          </p>
        )}
      </details>
      {d.cover_letter && (
        <details className="rounded-[18px] bg-bg p-4 text-sm">
          <summary className="cursor-pointer font-bold">Cover letter</summary>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{d.cover_letter}</p>
        </details>
      )}

      {/* Reviewers */}
      <div className="rounded-[20px] bg-bg p-4">
        <h3 className="text-[13px] font-extrabold">Reviewers</h3>
        {activeReviews.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">No reviewers yet.</p>
        ) : (
          <ul className="mt-2.5 flex flex-col gap-2 text-[13px]">
            {activeReviews.map((r) => (
              <li key={r.id} className="rounded-[14px] bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    {r.reviewer_name}
                    {r.version !== currentVersion && <span className="font-normal text-muted"> · v{r.version}</span>}
                  </span>
                  {r.status === "submitted" && r.recommendation ? (
                    <span className={cn("font-bold", r.recommendation === "reject" ? "text-[#9b1c3d]" : "text-teal-deep")}>{REC[r.recommendation]}</span>
                  ) : (
                    <span className="text-muted">{r.due_at ? `Due ${fmt(r.due_at)}` : "Pending"}</span>
                  )}
                </div>
                {r.status === "submitted" && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-bold text-teal-deep">Read review</summary>
                    <p className="mt-2 text-xs font-bold text-muted">To the author</p>
                    <p className="whitespace-pre-line text-[13px] leading-relaxed">{r.comments_to_author}</p>
                    {r.comments_to_editor && (
                      <>
                        <p className="mt-2 text-xs font-bold text-muted">Confidential, to the editor</p>
                        <p className="whitespace-pre-line text-[13px] leading-relaxed">{r.comments_to_editor}</p>
                      </>
                    )}
                  </details>
                )}
                {r.status === "assigned" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => withdrawReviewAction(d.id, r.id))}
                    className="mt-1.5 min-h-9 text-xs font-bold text-[#9b1c3d] underline underline-offset-2"
                  >
                    Withdraw assignment
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {underConsideration && (
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="mt-3 h-10 rounded-full border border-[#C9D2CD] bg-surface px-3.5 text-[13px] font-bold hover:bg-line"
          >
            + Assign reviewer
          </button>
        )}
      </div>

      <Feedback feedback={feedback} />

      {d.status === "submitted" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => startEditorialCheckAction(d.id))}
          className="h-11 rounded-full bg-aqua text-sm font-bold text-teal-deep hover:bg-seafoam"
        >
          Start editorial check
        </button>
      )}

      {underConsideration && (
        <>
          <Textarea label="Note to author" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Visible to the corresponding author" maxLength={10000} />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
            <button type="button" disabled={pending} onClick={() => setConfirm("accept")} className="h-[52px] rounded-full bg-ink text-sm font-bold text-white hover:bg-[#26302e]">
              Approve
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirm("revise")} className="h-[52px] rounded-full bg-lime text-sm font-bold hover:bg-[#dff0a0]">
              Request revision
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirm("decline")} className="h-[52px] rounded-full bg-pink text-sm font-bold hover:bg-[#f0ccd5]">
              Decline
            </button>
          </div>
        </>
      )}

      {d.status === "revision_requested" && <p className="rounded-[18px] bg-pink p-4 text-sm">Waiting for the author’s revision.</p>}

      {d.status === "accepted" && d.version && <FullTextPanel key={d.version.id} submissionId={d.id} versionId={d.version.id} initial={d.body} />}

      {d.status === "accepted" && <PublishPanel submissionId={d.id} issues={issues} />}

      {d.article && (
        <p className="rounded-[18px] bg-lime p-4 text-sm">
          Published as paper {d.article.paper_no}.{" "}
          <Link href={`/articles/${d.article.slug}`} className="font-bold underline underline-offset-2">
            View article
          </Link>
        </p>
      )}

      {d.article && <FinalPdfPanel articleId={d.article.id} slug={d.article.slug} current={d.article.final_pdf_path} />}

      {d.decisions.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-bold">Decision history ({d.decisions.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {d.decisions.map((x, i) => (
              <li key={i} className="rounded-[14px] bg-bg p-3 text-[13px]">
                <strong>{{ accept: "Accepted", revise: "Revision requested", decline: "Declined" }[x.decision]}</strong>
                <span className="text-muted">
                  {" "}
                  · {fmt(x.created_at)}
                  {x.version ? ` · v${x.version}` : ""}
                </span>
                {x.note_to_author && <p className="mt-1 whitespace-pre-line text-ink-soft">{x.note_to_author}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {assignOpen && (
        <AssignDialog
          pool={pool}
          exclude={new Set([d.submitter_id, ...d.authors.map((a) => a.user_id).filter((x): x is string => !!x), ...activeReviews.filter((r) => r.version === currentVersion).map((r) => r.reviewer_id)])}
          onClose={() => setAssignOpen(false)}
          onAssign={(reviewerId, days) => run(() => assignReviewerAction(d.id, reviewerId, days), () => setAssignOpen(false))}
          pending={pending}
        />
      )}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && run(() => recordDecisionAction({ submissionId: d.id, decision: confirm, note: note || undefined }), () => setNote(""))}
        title={confirm === "accept" ? "Accept this manuscript?" : confirm === "revise" ? "Request a revision?" : "Decline this manuscript?"}
        body={
          confirm === "revise" && !note.trim()
            ? "Add a note telling the author what to change first."
            : `The author will see this decision${note.trim() ? " and your note" : ""}. Open review assignments will be closed.`
        }
        confirmLabel={confirm === "accept" ? "Accept" : confirm === "revise" ? "Request revision" : "Decline"}
        tone={confirm === "decline" ? "danger" : "ink"}
      />
    </div>
  );
}

function AssignDialog({
  pool,
  exclude,
  onClose,
  onAssign,
  pending,
}: {
  pool: Person[];
  exclude: Set<string>;
  onClose: () => void;
  onAssign: (id: string, days: number) => void;
  pending: boolean;
}) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [days, setDays] = useState(21);
  const list = useMemo(
    () => pool.filter((p) => !q || `${p.full_name} ${p.email ?? ""} ${p.affiliation ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [pool, q],
  );
  return (
    <Modal open onClose={onClose} labelledBy="assign-title" size="md">
      <div className="flex flex-col gap-4 p-6 pt-8 sm:p-9">
        <h2 id="assign-title" className="text-2xl font-extrabold tracking-[-0.03em]">
          Assign a reviewer
        </h2>
        <p className="text-sm text-muted">
          People with the reviewer role (grant it in{" "}
          <Link href="/admin/users" className="font-bold text-teal-deep underline underline-offset-2">
            Users & reviewers
          </Link>
          ). Authors of this manuscript are excluded.
        </p>
        <Input label="Search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email or institution" />
        <fieldset className="max-h-[300px] overflow-y-auto rounded-[18px] border border-line p-1.5" data-lenis-prevent="">
          <legend className="sr-only">Reviewer</legend>
          {list.length === 0 && <p className="p-3 text-sm text-muted">No reviewers found.</p>}
          {list.map((p) => {
            const blocked = exclude.has(p.id);
            return (
              <label
                key={p.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2",
                  picked === p.id ? "bg-aqua" : "hover:bg-bg",
                  blocked && "cursor-not-allowed opacity-50",
                )}
              >
                <input type="radio" name="reviewer" value={p.id} disabled={blocked} checked={picked === p.id} onChange={() => setPicked(p.id)} className="size-4 accent-teal-deep" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{p.full_name}</span>
                  <span className="block truncate text-xs text-muted">
                    {[p.affiliation, p.email].filter(Boolean).join(" · ")}
                    {blocked ? " · author or already assigned" : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <Select label="Review due in" value={days} onChange={(e) => setDays(Number(e.target.value))}>
          {[7, 14, 21, 30, 45].map((n) => (
            <option key={n} value={n}>
              {n} days
            </option>
          ))}
        </Select>
        <div className="flex flex-wrap justify-end gap-2.5">
          <button type="button" onClick={onClose} className="h-12 rounded-full bg-bg px-5 text-sm font-bold hover:bg-line">
            Cancel
          </button>
          <button
            type="button"
            disabled={!picked || pending}
            onClick={() => picked && onAssign(picked, days)}
            className="h-12 rounded-full bg-ink px-6 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "Assigning…" : "Assign reviewer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PublishPanel({ submissionId, issues }: { submissionId: string; issues: IssueOption[] }) {
  const { run, pending, feedback } = useAction();
  const [issueId, setIssueId] = useState<string>(issues.find((i) => i.published_at === null)?.id.toString() ?? "");
  const [doi, setDoi] = useState("");
  const [featured, setFeatured] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-3 rounded-[20px] bg-lime/60 p-4">
      <h3 className="text-[15px] font-extrabold">Publish</h3>
      <Select label="Issue" value={issueId} onChange={(e) => setIssueId(e.target.value)} hint="You can change it later in Issues & archive.">
        <option value="">No issue yet (online first)</option>
        {issues.map((i) => (
          <option key={i.id} value={i.id}>
            Vol. {i.volume ?? "?"} · Issue {i.number}
            {i.label ? ` — ${i.label}` : ""}
            {i.published_at ? "" : " (unpublished)"}
          </option>
        ))}
      </Select>
      <Input label="DOI (optional)" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.xxxxx/…" hint="Add later once registered with Crossref." />
      <Checkbox checked={featured} onChange={(e) => setFeatured(e.target.checked)} label="Feature on homepage when published" />
      <Feedback feedback={feedback} />
      <button type="button" disabled={pending} onClick={() => setConfirm(true)} className="h-[52px] rounded-full bg-ink text-sm font-bold text-white disabled:opacity-60">
        {pending ? "Publishing…" : "Publish article"}
      </button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => run(() => publishAction({ submissionId, issueId: issueId ? Number(issueId) : null, doi, featured }))}
        title="Publish this article?"
        body="It gets a permanent paper number and web address, its abstract becomes public and the full text becomes available to signed-in readers. Published versions can only change through a correction."
        confirmLabel="Publish"
      />
    </div>
  );
}
