"use client";

import { useMemo, useState } from "react";
import { Checkbox, Input, Select } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { toneClass, type Tone } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { deleteKeywordAction, renameKeywordAction, saveDisciplineAction } from "@/lib/editorial/actions";
import { Feedback } from "./Feedback";
import { SimpleDialog } from "./IssuesManager";
import { useAction } from "./useAction";

type Discipline = { id: number; slug: string; name: string; tone: string; sort: number; active: boolean };
type Keyword = { id: number; label: string; slug: string; uses: number };
const TONES = ["seafoam", "lime", "aqua", "pink", "stone"] as const;

export function TaxonomyManager({ disciplines, keywords }: { disciplines: Discipline[]; keywords: Keyword[] }) {
  const { run, pending, feedback } = useAction();
  const [editing, setEditing] = useState<Discipline | "new" | null>(null);
  const [renaming, setRenaming] = useState<Keyword | null>(null);
  const [deleting, setDeleting] = useState<Keyword | null>(null);
  const [q, setQ] = useState("");
  const kw = useMemo(() => keywords.filter((k) => !q || k.label.toLowerCase().includes(q.toLowerCase())), [keywords, q]);

  return (
    <>
      <Feedback feedback={feedback} />
      <section className="rounded-[32px] bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-[-0.02em]">Disciplines</h2>
            <p className="text-sm text-muted">Shown on the homepage, in the archive filters and in the submission form.</p>
          </div>
          <button type="button" onClick={() => setEditing("new")} className="ml-auto h-11 rounded-full bg-ink px-4 text-sm font-bold text-white">
            + Discipline
          </button>
        </div>
        <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(240px,100%),1fr))] gap-3">
          {disciplines.map((d) => (
            <li key={d.id} className={cn("flex flex-col gap-2 rounded-[22px] p-4", toneClass[d.tone as Tone], !d.active && "opacity-50")}>
              <span className="font-mono text-xs">#{d.sort}</span>
              <span className="font-bold">{d.name}</span>
              <span className="font-mono text-xs text-ink-soft">/{d.slug}</span>
              <span className="mt-auto flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{d.active ? "Visible" : "Hidden"}</span>
                <button type="button" onClick={() => setEditing(d)} className="h-9 rounded-full bg-white/80 px-3.5 text-xs font-bold hover:bg-white">
                  Edit<span className="sr-only"> {d.name}</span>
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[32px] bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-[-0.02em]">Keywords</h2>
            <p className="text-sm text-muted">Created by authors when they submit. Rename to fix spelling; unused keywords can be deleted.</p>
          </div>
          <label htmlFor="kw-q" className="sr-only">
            Search keywords
          </label>
          <input id="kw-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search keywords" className="ml-auto h-11 w-[min(260px,100%)] rounded-full bg-bg px-5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-teal-deep" />
        </div>
        {kw.length === 0 ? (
          <p className="mt-4 rounded-[20px] bg-bg p-5 text-sm text-muted">{keywords.length ? "No keywords match." : "No keywords yet — they appear as authors submit."}</p>
        ) : (
          <ul className="mt-4 flex flex-wrap gap-2">
            {kw.map((k) => (
              <li key={k.id} className="flex items-center gap-1 rounded-full bg-bg py-1 pl-3.5 pr-1 text-sm">
                <span className="font-semibold">{k.label}</span>
                <span className="font-mono text-[11px] text-muted">{k.uses}</span>
                <button type="button" onClick={() => setRenaming(k)} className="ml-1 h-8 rounded-full px-2.5 text-xs font-bold hover:bg-surface">
                  Rename<span className="sr-only"> {k.label}</span>
                </button>
                {k.uses === 0 && (
                  <button type="button" onClick={() => setDeleting(k)} aria-label={`Delete ${k.label}`} className="inline-flex size-8 items-center justify-center rounded-full text-xs hover:bg-pink">
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <SimpleDialog
          title={editing === "new" ? "New discipline" : "Edit discipline"}
          onClose={() => setEditing(null)}
          pending={pending}
          onSubmit={(fd) =>
            run(
              () =>
                saveDisciplineAction({
                  id: editing === "new" ? undefined : editing.id,
                  name: String(fd.get("name") ?? ""),
                  tone: String(fd.get("tone") ?? "stone"),
                  sort: Number(fd.get("sort") ?? 0),
                  active: fd.get("active") === "on",
                }),
              () => setEditing(null),
            )
          }
        >
          <Input label="Name" name="name" defaultValue={editing === "new" ? "" : editing.name} required maxLength={80} hint={editing === "new" ? "The web address is generated from the name." : `Web address stays /${editing.slug}.`} />
          <Select label="Colour" name="tone" defaultValue={editing === "new" ? "stone" : editing.tone}>
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Input label="Order" name="sort" type="number" min={0} max={999} defaultValue={editing === "new" ? disciplines.length + 1 : editing.sort} />
          <Checkbox name="active" defaultChecked={editing === "new" ? true : editing.active} label="Visible on the site and in the submission form" />
        </SimpleDialog>
      )}
      {renaming && (
        <SimpleDialog title="Rename keyword" onClose={() => setRenaming(null)} pending={pending} onSubmit={(fd) => run(() => renameKeywordAction(renaming.id, String(fd.get("label") ?? "")), () => setRenaming(null))}>
          <Input label="Keyword" name="label" defaultValue={renaming.label} maxLength={60} required />
        </SimpleDialog>
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && run(() => deleteKeywordAction(deleting.id))}
        title="Delete keyword?"
        body={deleting ? `“${deleting.label}” isn’t used by any submission.` : ""}
        confirmLabel="Delete"
        tone="danger"
      />
    </>
  );
}
