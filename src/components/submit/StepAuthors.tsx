"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AffiliationField } from "@/components/auth/AffiliationField";
import { OrcidBadge } from "@/components/auth/OrcidBadge";
import { Checkbox, Input } from "@/components/ui/Input";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { moveAuthorAction, removeAuthorAction, saveAuthorAction } from "@/lib/submissions/actions";
import type { EditableAuthor } from "@/lib/submissions/queries";
import type { FieldErrors } from "@/lib/validation/auth";
import { cn } from "@/lib/cn";
import { useSaveStatus } from "./SaveStatus";
import { StepHeading, StepNav } from "./StepNav";

const tones = ["bg-seafoam", "bg-lime", "bg-aqua", "bg-pink", "bg-stone"];
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export function StepAuthors({ submissionId, versionId, authors }: { submissionId: string; versionId: string; authors: EditableAuthor[] }) {
  const router = useRouter();
  const save = useSaveStatus();
  const [editing, setEditing] = useState<EditableAuthor | "new" | null>(null);
  const [removing, setRemoving] = useState<EditableAuthor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string; savedAt?: string }>) =>
    startTransition(async () => {
      save.saving();
      const res = await fn();
      if (res.ok) {
        setError(null);
        save.saved(res.savedAt);
        router.refresh();
      } else {
        setError(res.error ?? "Something went wrong.");
        save.failed(res.error ?? "Not saved");
      }
    });

  const hasCorresponding = authors.some((a) => a.is_corresponding && a.email);

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step={2} title="Authors">
        List every author in publication order. The corresponding author receives editorial emails.
      </StepHeading>

      {error && (
        <p role="alert" className="rounded-2xl bg-pink px-4 py-3 text-[13px] font-semibold text-[#7a1631]">
          {error}
        </p>
      )}

      <ol className="flex flex-col gap-3" aria-label="Authors in order">
        {authors.map((a, i) => (
          <li key={a.id} className="flex flex-wrap items-center gap-3.5 rounded-[20px] bg-bg p-4">
            <span aria-hidden="true" className={cn("flex size-11 shrink-0 items-center justify-center rounded-full font-bold", tones[i % tones.length])}>
              {initials(a.full_name)}
            </span>
            <span className="min-w-0 flex-[1_1_200px]">
              <span className="block font-bold">
                <span className="sr-only">Author {i + 1}: </span>
                {a.full_name}
              </span>
              <span className="block text-[13px] text-muted">
                {[a.affiliation, a.email].filter(Boolean).join(" · ") || "No affiliation yet"}
              </span>
              {a.orcid && <OrcidBadge orcid={a.orcid} className="mt-1" />}
            </span>
            <span className={cn("rounded-full px-3 py-1.5 text-xs font-bold", a.is_corresponding ? "bg-lime" : "bg-surface")}>
              {a.is_corresponding ? "Corresponding" : "Co-author"}
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                aria-label={`Move ${a.full_name} up`}
                disabled={i === 0 || pending}
                onClick={() => run(() => moveAuthorAction(versionId, a.id, "up"))}
                className="inline-flex size-11 items-center justify-center rounded-full bg-surface hover:bg-line disabled:opacity-30"
              >
                <Icon name="upload" size={15} />
              </button>
              <button
                type="button"
                aria-label={`Move ${a.full_name} down`}
                disabled={i === authors.length - 1 || pending}
                onClick={() => run(() => moveAuthorAction(versionId, a.id, "down"))}
                className="inline-flex size-11 rotate-180 items-center justify-center rounded-full bg-surface hover:bg-line disabled:opacity-30"
              >
                <Icon name="upload" size={15} />
              </button>
              <button
                type="button"
                onClick={() => setEditing(a)}
                className="inline-flex h-11 items-center rounded-full bg-surface px-4 text-sm font-bold hover:bg-line"
              >
                Edit<span className="sr-only"> {a.full_name}</span>
              </button>
              <button
                type="button"
                aria-label={`Remove ${a.full_name}`}
                disabled={authors.length <= 1}
                onClick={() => setRemoving(a)}
                className="inline-flex size-11 items-center justify-center rounded-full bg-surface hover:bg-pink disabled:opacity-30"
              >
                <Icon name="close" size={15} />
              </button>
            </span>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => setEditing("new")}
        className="h-[54px] rounded-full border-[1.5px] border-dashed border-[#9FB0AA] text-[15px] font-bold hover:bg-bg"
      >
        + Add co-author
      </button>

      {!hasCorresponding && (
        <p className="rounded-2xl bg-aqua px-4 py-3 text-[13px] font-semibold text-teal-deep">
          Mark one author as corresponding and give them an email address — it’s required to submit.
        </p>
      )}

      <StepNav backHref={`/submit/${submissionId}?step=1`} onContinue={() => router.push(`/submit/${submissionId}?step=3`)} />

      {editing && (
        <AuthorDialog
          key={editing === "new" ? "new" : editing.id}
          versionId={versionId}
          author={editing === "new" ? null : editing}
          defaultCorresponding={editing === "new" && !authors.some((a) => a.is_corresponding)}
          onClose={() => setEditing(null)}
          onSaved={(at) => {
            setEditing(null);
            save.saved(at);
            router.refresh();
          }}
        />
      )}
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && run(() => removeAuthorAction(versionId, removing.id))}
        title="Remove this author?"
        body={removing ? `${removing.full_name} will be removed from this submission.` : ""}
        confirmLabel="Remove"
        tone="danger"
      />
    </div>
  );
}

function AuthorDialog({
  versionId,
  author,
  defaultCorresponding,
  onClose,
  onSaved,
}: {
  versionId: string;
  author: EditableAuthor | null;
  defaultCorresponding: boolean;
  onClose: () => void;
  onSaved: (at?: string) => void;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Modal open onClose={onClose} labelledBy="author-dialog-title" size="md">
      <form
        className="flex flex-col gap-4 p-6 pt-8 sm:p-9"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await saveAuthorAction({
              versionId,
              authorId: author?.id,
              fullName: String(fd.get("fullName") ?? ""),
              affiliation: String(fd.get("affiliation") ?? ""),
              affiliationRor: String(fd.get("affiliationRor") ?? ""),
              orcid: String(fd.get("orcid") ?? ""),
              email: String(fd.get("email") ?? ""),
              isCorresponding: fd.get("isCorresponding") === "on",
            });
            if (res.ok) onSaved(res.savedAt);
            else {
              setErrors(res.fields ?? {});
              setFormError(res.error);
            }
          });
        }}
      >
        <h2 id="author-dialog-title" className="text-2xl font-extrabold tracking-[-0.03em]">
          {author ? "Edit author" : "Add co-author"}
        </h2>
        {formError && (
          <p role="alert" className="rounded-2xl bg-pink px-4 py-3 text-[13px] font-semibold text-[#7a1631]">
            {formError}
          </p>
        )}
        <Input label="Full name" name="fullName" defaultValue={author?.full_name ?? ""} required error={errors.fullName} autoFocus />
        <AffiliationField defaultValue={author?.affiliation ?? ""} defaultRor={author?.affiliation_ror ?? ""} error={errors.affiliation} />
        <Input
          label={
            <>
              ORCID iD <span className="font-medium text-muted">· optional</span>
            </>
          }
          name="orcid"
          defaultValue={author?.orcid ?? ""}
          placeholder="0000-0000-0000-0000"
          error={errors.orcid}
        />
        <Input label="Email" type="email" name="email" defaultValue={author?.email ?? ""} error={errors.email} hint="Never shown publicly." />
        <Checkbox
          name="isCorresponding"
          defaultChecked={author?.is_corresponding ?? defaultCorresponding}
          label="Corresponding author (receives editorial emails)"
        />
        <div className="mt-2 flex flex-wrap justify-end gap-2.5">
          <button type="button" onClick={onClose} className="h-12 rounded-full bg-bg px-5 text-sm font-bold hover:bg-line">
            Cancel
          </button>
          <button type="submit" disabled={pending} aria-busy={pending} className="h-12 rounded-full bg-ink px-6 text-sm font-bold text-white disabled:opacity-70">
            {pending ? "Saving…" : author ? "Save author" : "Add author"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
