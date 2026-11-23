"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Textarea } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { saveReviewAction, submitReviewAction } from "@/lib/review/actions";

type Rec = "accept" | "minor_revision" | "major_revision" | "reject";
const RECS: { value: Rec; label: string; help: string }[] = [
  { value: "accept", label: "Accept", help: "Publish as is" },
  { value: "minor_revision", label: "Minor revision", help: "Small changes needed" },
  { value: "major_revision", label: "Major revision", help: "Substantial changes needed" },
  { value: "reject", label: "Reject", help: "Not suitable for publication" },
];

export function ReviewForm({ reviewId, open, initial }: { reviewId: string; open: boolean; initial: { recommendation: Rec | null; toAuthor: string; toEditor: string } }) {
  const router = useRouter();
  const [rec, setRec] = useState<Rec | null>(initial.recommendation);
  const [toAuthor, setToAuthor] = useState(initial.toAuthor);
  const [toEditor, setToEditor] = useState(initial.toEditor);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const payload = () => ({ reviewId, recommendation: rec, toAuthor, toEditor });
  const ready = !!rec && toAuthor.trim().length >= 20;

  return (
    <form
      className="flex flex-col gap-4 rounded-[28px] bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const r = await saveReviewAction(payload());
          setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Saved.") : r.error });
        });
      }}
    >
      <h2 className="text-lg font-extrabold">{open ? "Your review" : "Your submitted review"}</h2>
      <fieldset disabled={!open} className="flex flex-col gap-2">
        <legend className="mb-2 text-[13px] font-bold">Recommendation</legend>
        {RECS.map((r) => (
          <label key={r.value} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-[16px] border px-3.5 py-2", rec === r.value ? "border-teal-deep bg-aqua" : "border-line hover:bg-bg")}>
            <input type="radio" name="recommendation" value={r.value} checked={rec === r.value} onChange={() => setRec(r.value)} className="size-4 accent-teal-deep" />
            <span>
              <span className="block text-sm font-bold">{r.label}</span>
              <span className="block text-xs text-muted">{r.help}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Textarea label="Comments for the author" rows={8} value={toAuthor} onChange={(e) => setToAuthor(e.target.value)} disabled={!open} hint="Shared with the author anonymously. At least 20 characters." maxLength={20000} />
      <Textarea label="Confidential comments for the editor" rows={4} value={toEditor} onChange={(e) => setToEditor(e.target.value)} disabled={!open} hint="Only editors see this." maxLength={20000} />
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "rounded-2xl bg-aqua px-4 py-2.5 text-[13px] font-semibold text-teal-deep" : "rounded-2xl bg-pink px-4 py-2.5 text-[13px] font-semibold text-[#7a1631]"}>
          {msg.text}
        </p>
      )}
      {open && (
        <div className="flex flex-wrap gap-2.5">
          <button type="submit" disabled={pending} className="h-[52px] flex-1 rounded-full bg-bg px-5 text-sm font-bold hover:bg-line">
            {pending ? "Saving…" : "Save draft"}
          </button>
          <button type="button" disabled={pending || !ready} onClick={() => setConfirm(true)} className="h-[52px] flex-1 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:opacity-50">
            Submit review
          </button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() =>
          startTransition(async () => {
            const r = await submitReviewAction(payload());
            setMsg({ ok: r.ok, text: r.ok ? (r.message ?? "Submitted.") : r.error });
            if (r.ok) router.refresh();
          })
        }
        title="Submit your review?"
        body="You won’t be able to edit it afterwards. The editor will see your recommendation and both comments; the author sees only your comments for them, anonymously."
        confirmLabel="Submit review"
      />
    </form>
  );
}
