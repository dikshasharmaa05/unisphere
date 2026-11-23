"use client";

import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { importManuscriptAction, saveFullTextAction, setFinalPdfAction } from "@/lib/editorial/actions";
import { createClient } from "@/lib/supabase/client";
import { Feedback } from "./Feedback";
import { useAction } from "./useAction";

const PREVIEW_CSS =
  "body{font:16px/1.7 Georgia,serif;color:#141A19;margin:16px}h2,h3,h4{font-family:system-ui,sans-serif;line-height:1.2}table{border-collapse:collapse}td,th{border:1px solid #E3E7E3;padding:4px 8px}a{color:#0E6E62}";

/** Typeset the full text of an accepted (not yet published) version. */
export function FullTextPanel({ submissionId, versionId, initial }: { submissionId: string; versionId: string; initial: { html: string; references: string | null } | null }) {
  const { run, pending, feedback } = useAction();
  const [html, setHtml] = useState(initial?.html ?? "");
  const [refs, setRefs] = useState(initial?.references ?? "");
  const [preview, setPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  async function importDocx() {
    setImporting(true);
    setNote(null);
    try {
      const res = await importManuscriptAction(submissionId);
      if (res.ok) {
        setHtml(res.html);
        setNote({ ok: true, text: `Imported from the manuscript${res.warnings.length ? ` (${res.warnings.length} formatting note${res.warnings.length > 1 ? "s" : ""})` : ""}. Check it, remove the references section if it’s duplicated below, then save.` });
      } else setNote({ ok: false, text: res.error });
    } catch {
      setNote({ ok: false, text: "Import failed." });
    } finally {
      setImporting(false);
    }
  }

  return (
    <section aria-labelledby="fulltext-title" className="flex flex-col gap-3 rounded-[20px] bg-aqua p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="fulltext-title" className="text-[15px] font-extrabold">Full text</h3>
        <span className="text-xs text-muted">{initial?.html ? "Saved" : "Not added yet"} · editable until published</span>
      </div>
      <p className="text-xs leading-relaxed text-ink-soft">Members read this on the article page and it is used for the generated PDF. Import it from a DOCX manuscript or paste HTML (headings, paragraphs, lists, tables). Unsafe markup is removed on save.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={importDocx} disabled={importing} className="min-h-11 rounded-full bg-surface px-4 text-sm font-bold disabled:opacity-60">
          {importing ? "Importing…" : "Import from manuscript (DOCX)"}
        </button>
        <button type="button" onClick={() => setPreview((p) => !p)} aria-pressed={preview} className="min-h-11 rounded-full bg-surface px-4 text-sm font-bold">
          {preview ? "Edit HTML" : "Preview"}
        </button>
      </div>
      {note && <Feedback feedback={note} />}
      {preview ? (
        <iframe title="Full text preview" sandbox="" srcDoc={`<style>${PREVIEW_CSS}</style>${html}`} className="h-[420px] w-full rounded-[14px] bg-surface" />
      ) : (
        <Textarea label="Body (HTML)" value={html} onChange={(e) => setHtml(e.target.value)} rows={12} className="font-mono text-xs" />
      )}
      <Textarea label="References (one per line)" value={refs} onChange={(e) => setRefs(e.target.value)} rows={5} className="text-xs" />
      <Feedback feedback={feedback} />
      <button
        type="button"
        disabled={pending || !html.trim()}
        onClick={() => run(() => saveFullTextAction({ versionId, html, references: refs }))}
        className="h-[48px] rounded-full bg-ink text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save full text"}
      </button>
    </section>
  );
}

const MAX_PDF = 50 * 1024 * 1024;

/** Attach the typeset final PDF (otherwise readers get a generated one). */
export function FinalPdfPanel({ articleId, slug, current }: { articleId: string; slug: string; current: string | null }) {
  const { run, pending, feedback } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function upload(file: File) {
    setErr(null);
    if (file.type !== "application/pdf") return setErr("Choose a PDF file.");
    if (file.size > MAX_PDF) return setErr("The PDF is larger than 50 MB.");
    setBusy(true);
    const path = `${articleId}/final-${Date.now()}.pdf`;
    const { error } = await createClient().storage.from("final-pdfs").upload(path, file, { contentType: "application/pdf", upsert: false });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (error) return setErr("Upload failed. Try again.");
    run(() => setFinalPdfAction(articleId, path));
  }

  return (
    <section aria-labelledby="finalpdf-title" className="flex flex-col gap-3 rounded-[20px] bg-bg p-4">
      <h3 id="finalpdf-title" className="text-[15px] font-extrabold">Final PDF</h3>
      <p className="text-xs leading-relaxed text-ink-soft">
        {current ? "A typeset PDF is attached; readers download it." : "No typeset PDF yet — readers get a PDF generated from the full text (journal name, volume/issue, DOI, licence and page numbers)."}{" "}
        <a href={`/articles/${slug}/pdf`} className="font-bold text-teal-deep underline underline-offset-2">
          Open current PDF
        </a>
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-ink px-4 text-sm font-bold text-white has-[:disabled]:opacity-60">
          {busy ? "Uploading…" : current ? "Replace PDF" : "Upload PDF"}
          <input ref={input} type="file" accept="application/pdf" className="sr-only" disabled={busy || pending} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
        {current && (
          <button type="button" disabled={pending} onClick={() => setConfirm(true)} className="min-h-11 rounded-full bg-surface px-4 text-sm font-bold disabled:opacity-60">
            Remove
          </button>
        )}
      </div>
      {err && <Feedback feedback={{ ok: false, text: err }} />}
      <Feedback feedback={feedback} />
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => run(() => setFinalPdfAction(articleId, null))}
        title="Remove the final PDF?"
        body="Readers will get the generated PDF instead. The uploaded file is deleted."
        confirmLabel="Remove"
      />
    </section>
  );
}
