"use client";

import Link from "next/link";
import { useState } from "react";
import { Checkbox, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { createIssueAction, createVolumeAction, publishIssueAction, setCurrentIssueAction, updateArticleAction } from "@/lib/editorial/actions";
import { Feedback } from "./Feedback";
import { useAction } from "./useAction";

type Volume = { id: number; number: number; year: number | null };
type Issue = { id: number; volume_id: number; number: number; label: string | null; published_at: string | null; is_current: boolean };
type Article = {
  id: string;
  slug: string;
  paper_no: number;
  doi: string | null;
  issue_id: number | null;
  featured: boolean;
  first_page: number | null;
  last_page: number | null;
  published_at: string;
  withdrawn_at: string | null;
  title: string;
};

export function IssuesManager({ volumes, issues, articles }: { volumes: Volume[]; issues: Issue[]; articles: Article[] }) {
  const { run, pending, feedback } = useAction();
  const [newVol, setNewVol] = useState(false);
  const [newIssue, setNewIssue] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const issueName = (id: number | null) => {
    const i = issues.find((x) => x.id === id);
    if (!i) return "Online first (no issue)";
    const v = volumes.find((x) => x.id === i.volume_id);
    return `Vol. ${v?.number ?? "?"} · Issue ${i.number}${i.label ? ` — ${i.label}` : ""}`;
  };

  return (
    <>
      <Feedback feedback={feedback} />
      <section className="rounded-[32px] bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-extrabold tracking-[-0.02em]">Volumes & issues</h2>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={() => setNewVol(true)} className="h-11 rounded-full bg-bg px-4 text-sm font-bold hover:bg-line">
              + Volume
            </button>
            <button type="button" disabled={!volumes.length} onClick={() => setNewIssue(true)} className="h-11 rounded-full bg-ink px-4 text-sm font-bold text-white disabled:opacity-40">
              + Issue
            </button>
          </div>
        </div>
        {volumes.length === 0 ? (
          <p className="mt-4 rounded-[20px] bg-bg p-5 text-sm text-muted">No volumes yet. Create Volume 1 to start the archive.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {volumes.map((v) => (
              <div key={v.id}>
                <h3 className="text-sm font-extrabold">
                  Volume {v.number}
                  {v.year ? <span className="font-normal text-muted"> · {v.year}</span> : null}
                </h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {issues.filter((i) => i.volume_id === v.id).length === 0 && <li className="text-sm text-muted">No issues yet.</li>}
                  {issues
                    .filter((i) => i.volume_id === v.id)
                    .map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-[20px] bg-bg px-4 py-3">
                        <span className="font-bold">Issue {i.number}</span>
                        {i.label && <span className="text-sm text-muted">{i.label}</span>}
                        <span className="font-mono text-xs text-muted">{articles.filter((a) => a.issue_id === i.id).length} articles</span>
                        <span className="ml-auto flex flex-wrap items-center gap-2">
                          {i.is_current && <Pill tone="lime">Current</Pill>}
                          <Pill tone={i.published_at ? "seafoam" : "stone"}>{i.published_at ? "Published" : "Unpublished"}</Pill>
                          {!i.published_at ? (
                            <button type="button" disabled={pending} onClick={() => run(() => publishIssueAction(i.id, true))} className="h-10 rounded-full bg-ink px-3.5 text-xs font-bold text-white">
                              Publish issue
                            </button>
                          ) : (
                            <>
                              {!i.is_current && (
                                <button type="button" disabled={pending} onClick={() => run(() => setCurrentIssueAction(i.id))} className="h-10 rounded-full bg-lime px-3.5 text-xs font-bold">
                                  Make current
                                </button>
                              )}
                              <button type="button" disabled={pending} onClick={() => run(() => publishIssueAction(i.id, false))} className="h-10 rounded-full bg-surface px-3.5 text-xs font-bold hover:bg-line">
                                Unpublish
                              </button>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[32px] bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">Published articles</h2>
        {articles.length === 0 ? (
          <p className="mt-4 rounded-[20px] bg-bg p-5 text-sm text-muted">Nothing published yet. Accepted submissions are published from the Submissions board.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {articles.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[20px] bg-bg px-4 py-3">
                <span className="font-mono text-xs text-muted">No. {a.paper_no}</span>
                <span className="min-w-0 flex-[1_1_240px]">
                  <Link href={`/articles/${a.slug}`} className="block truncate font-bold hover:text-teal-deep">
                    {a.title}
                  </Link>
                  <span className="block text-xs text-muted">
                    {issueName(a.issue_id)}
                    {a.doi ? ` · ${a.doi}` : " · no DOI yet"}
                    {a.first_page ? ` · pp. ${a.first_page}–${a.last_page ?? "?"}` : ""}
                  </span>
                </span>
                {a.featured && <Pill tone="lime">Featured</Pill>}
                {a.withdrawn_at && <Pill tone="pink">Withdrawn</Pill>}
                <button type="button" onClick={() => setEditing(a)} className="h-10 rounded-full bg-surface px-4 text-xs font-bold hover:bg-line">
                  Edit<span className="sr-only"> {a.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {newVol && (
        <SimpleDialog
          title="New volume"
          onClose={() => setNewVol(false)}
          onSubmit={(fd) => run(() => createVolumeAction(Number(fd.get("number")), fd.get("year") ? Number(fd.get("year")) : null), () => setNewVol(false))}
          pending={pending}
        >
          <Input label="Volume number" name="number" type="number" min={1} defaultValue={(volumes[0]?.number ?? 0) + 1} required />
          <Input label="Year (optional)" name="year" type="number" min={1900} max={2200} />
        </SimpleDialog>
      )}
      {newIssue && (
        <SimpleDialog
          title="New issue"
          onClose={() => setNewIssue(false)}
          onSubmit={(fd) =>
            run(() => createIssueAction({ volumeId: fd.get("volumeId"), number: fd.get("number"), label: String(fd.get("label") ?? "") }), () => setNewIssue(false))
          }
          pending={pending}
        >
          <Select label="Volume" name="volumeId" defaultValue={volumes[0]?.id}>
            {volumes.map((v) => (
              <option key={v.id} value={v.id}>
                Volume {v.number}
              </option>
            ))}
          </Select>
          <Input label="Issue number" name="number" type="number" min={1} defaultValue={(issues.filter((i) => i.volume_id === volumes[0]?.id).length || 0) + 1} required />
          <Input label="Label (optional)" name="label" placeholder="e.g. [Month Year]" maxLength={80} />
        </SimpleDialog>
      )}
      {editing && (
        <SimpleDialog
          title="Edit article details"
          onClose={() => setEditing(null)}
          pending={pending}
          onSubmit={(fd) =>
            run(
              () =>
                updateArticleAction({
                  articleId: editing.id,
                  issueId: fd.get("issueId") ? Number(fd.get("issueId")) : null,
                  doi: String(fd.get("doi") ?? ""),
                  firstPage: fd.get("firstPage") ? Number(fd.get("firstPage")) : null,
                  lastPage: fd.get("lastPage") ? Number(fd.get("lastPage")) : null,
                  featured: fd.get("featured") === "on",
                }),
              () => setEditing(null),
            )
          }
        >
          <p className="text-sm font-semibold">{editing.title}</p>
          <Select label="Issue" name="issueId" defaultValue={editing.issue_id ?? ""}>
            <option value="">Online first (no issue)</option>
            {issues.map((i) => (
              <option key={i.id} value={i.id}>
                {issueName(i.id)}
              </option>
            ))}
          </Select>
          <Input label="DOI" name="doi" defaultValue={editing.doi ?? ""} placeholder="10.xxxxx/…" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="First page" name="firstPage" type="number" min={1} defaultValue={editing.first_page ?? ""} />
            <Input label="Last page" name="lastPage" type="number" min={1} defaultValue={editing.last_page ?? ""} />
          </div>
          <Checkbox name="featured" defaultChecked={editing.featured} label="Feature on homepage" />
        </SimpleDialog>
      )}
    </>
  );
}

export function SimpleDialog({
  title,
  children,
  onClose,
  onSubmit,
  pending,
  submitLabel = "Save",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
  submitLabel?: string;
}) {
  return (
    <Modal open onClose={onClose} labelledBy="simple-dialog-title" size="sm">
      <form
        className="flex flex-col gap-4 p-6 pt-8 sm:p-8"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(new FormData(e.currentTarget));
        }}
      >
        <h2 id="simple-dialog-title" className="text-2xl font-extrabold tracking-[-0.03em]">
          {title}
        </h2>
        {children}
        <div className="mt-1 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} className="h-12 rounded-full bg-bg px-5 text-sm font-bold hover:bg-line">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="h-12 rounded-full bg-ink px-6 text-sm font-bold text-white disabled:opacity-60">
            {pending ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
