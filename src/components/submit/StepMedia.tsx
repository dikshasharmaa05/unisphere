"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { addVideoLinkAction, registerFileAction, removeFileAction, updateFileAction } from "@/lib/submissions/actions";
import { FILE_KINDS, formatBytes, type UploadLimits } from "@/lib/submissions/labels";
import type { EditableFile } from "@/lib/submissions/queries";
import type { MediaKind } from "@/lib/supabase/types";
import { mimeOf, objectName, uploadWithProgress } from "@/lib/storage/upload";
import { useSaveStatus } from "./SaveStatus";
import { StepHeading, StepNav } from "./StepNav";

type UploadKind = Exclude<MediaKind, "video_embed">;
type QueueItem = { key: string; kind: UploadKind; name: string; bytes: number; progress: number; error?: string };

const extBadge = (name: string | null) => (name?.split(".").pop() ?? "file").slice(0, 4).toUpperCase();

export function StepMedia({
  submissionId,
  versionId,
  files,
  limits,
  doubleBlind,
}: {
  submissionId: string;
  versionId: string;
  files: EditableFile[];
  limits: UploadLimits;
  doubleBlind: boolean;
}) {
  const router = useRouter();
  const save = useSaveStatus();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [removing, setRemoving] = useState<EditableFile | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [, startTransition] = useTransition();

  const manuscript = files.find((f) => f.kind === "manuscript");
  const visualCount = files.filter((f) => f.kind === "image" || f.kind === "figure").length;
  const maxVisual = limits.maxImagesAndFiguresPerVersion ?? 20;

  const patch = (key: string, p: Partial<QueueItem>) => setQueue((q) => q.map((i) => (i.key === key ? { ...i, ...p } : i)));

  const upload = (kind: UploadKind, list: FileList | File[], containsIdentity = false) => {
    const rule = limits[kind];
    let visual = visualCount + queue.filter((q) => !q.error && (q.kind === "image" || q.kind === "figure")).length;
    for (const file of Array.from(list)) {
      const key = crypto.randomUUID();
      const item: QueueItem = { key, kind, name: file.name, bytes: file.size, progress: 0 };
      const mime = mimeOf(file);
      // Check limits before sending anything.
      if (rule && file.size > rule.maxMb * 1048576) item.error = `Too large — the limit for ${FILE_KINDS[kind].label.toLowerCase()} is ${rule.maxMb} MB.`;
      else if (rule && !rule.types.includes(mime)) item.error = `Not allowed — use ${FILE_KINDS[kind].hint}.`;
      else if ((kind === "image" || kind === "figure") && ++visual > maxVisual) item.error = `Limit reached — at most ${maxVisual} images and figures.`;
      setQueue((q) => [...q, item]);
      if (item.error) continue;

      const path = `${submissionId}/${versionId}/${objectName(file)}`;
      save.saving();
      void (async () => {
        try {
          await uploadWithProgress(path, file, (p) => patch(key, { progress: p }));
          const res = await registerFileAction({ submissionId, versionId, kind, storagePath: path, fileName: file.name, mimeType: mime, bytes: file.size, containsIdentity });
          if (!res.ok) throw new Error(res.error);
          setQueue((q) => q.filter((i) => i.key !== key));
          save.saved(res.savedAt);
          startTransition(() => router.refresh());
        } catch (e) {
          patch(key, { error: (e as Error).message });
          save.failed("Upload failed");
        }
      })();
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <StepHeading step={3} title="Manuscript & media">
        {doubleBlind
          ? "Reviews are double-blind: remove author names from the manuscript and upload them separately as a title page."
          : "Upload your manuscript and any images, figures, data and video."}
      </StepHeading>

      {/* Manuscript dropzone */}
      <label
        htmlFor="manuscript-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) upload("manuscript", [e.dataTransfer.files[0]!]);
        }}
        className={cn(
          "relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[26px] border-2 border-dashed p-6 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-deep",
          dragOver ? "border-teal bg-aqua" : "border-[#9FD8CC] bg-[#F2FAF7] hover:bg-aqua/60",
        )}
      >
        <span className="inline-flex size-14 items-center justify-center rounded-full bg-lime">
          <Icon name="upload" size={22} />
        </span>
        <span className="text-[17px] font-bold">{manuscript ? "Replace your manuscript" : "Drop your manuscript here, or browse"}</span>
        <span className="text-[13px] text-muted">
          {FILE_KINDS.manuscript.hint} · up to {limits.manuscript?.maxMb ?? 20} MB
        </span>
        <input
          id="manuscript-input"
          type="file"
          accept={FILE_KINDS.manuscript.accept}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) upload("manuscript", [e.target.files[0]!]);
            e.target.value = "";
          }}
        />
      </label>

      {/* Media cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3">
        <KindCard kind="image" icon="image" count={files.filter((f) => f.kind === "image").length} limits={limits} onFiles={(l) => upload("image", l)} />
        <KindCard kind="figure" icon="chart" count={files.filter((f) => f.kind === "figure").length} limits={limits} onFiles={(l) => upload("figure", l)} />
        <KindCard kind="dataset" icon="table" count={files.filter((f) => f.kind === "dataset").length} limits={limits} onFiles={(l) => upload("dataset", l)} />
        <VideoCard
          count={files.filter((f) => f.kind === "video_upload" || f.kind === "video_embed").length}
          limits={limits}
          onFiles={(l) => upload("video_upload", l)}
          onLink={async (url) => {
            save.saving();
            const res = await addVideoLinkAction({ submissionId, versionId, url });
            if (res.ok) {
              save.saved(res.savedAt);
              router.refresh();
            } else save.failed(res.error);
            return res.ok ? null : res.error;
          }}
        />
        <KindCard
          kind="supplementary"
          icon="document"
          title={doubleBlind ? "Title page" : "Supplementary"}
          note={doubleBlind ? "Author names & affiliations — hidden from reviewers" : undefined}
          count={files.filter((f) => f.kind === "supplementary").length}
          limits={limits}
          onFiles={(l) => upload("supplementary", l, doubleBlind)}
        />
      </div>

      {/* Uploads in progress / failed */}
      {queue.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Uploads in progress">
          {queue.map((q) => (
            <li key={q.key} className="flex items-center gap-3.5 rounded-[18px] border border-line px-4 py-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime font-mono text-[10px]">{extBadge(q.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{q.name}</span>
                {q.error ? (
                  <span role="alert" className="block text-xs font-semibold text-[#9b1c3d]">
                    {q.error}
                  </span>
                ) : (
                  <span
                    className="mt-2 block h-1.5 overflow-hidden rounded-full bg-line"
                    role="progressbar"
                    aria-label={`Uploading ${q.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(q.progress * 100)}
                  >
                    <span className="block h-full rounded-full bg-teal transition-[width] duration-200" style={{ width: `${Math.max(3, q.progress * 100)}%` }} />
                  </span>
                )}
              </span>
              {q.error ? (
                <button type="button" onClick={() => setQueue((x) => x.filter((i) => i.key !== q.key))} className="h-11 rounded-full bg-bg px-4 text-xs font-bold hover:bg-line">
                  Dismiss
                </button>
              ) : (
                <span className="font-mono text-xs font-bold text-muted">{Math.round(q.progress * 100)}%</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Uploaded files */}
      {files.length > 0 && (
        <ul className="flex flex-col gap-2" aria-label="Uploaded files">
          {files.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              doubleBlind={doubleBlind}
              onRemove={() => setRemoving(f)}
              onCaption={async (caption) => {
                save.saving();
                const r = await updateFileAction(submissionId, f.id, { caption });
                if (r.ok) save.saved(r.savedAt);
                else save.failed(r.error);
              }}
              onIdentity={async (containsIdentity) => {
                save.saving();
                const r = await updateFileAction(submissionId, f.id, { containsIdentity });
                if (r.ok) {
                  save.saved(r.savedAt);
                  router.refresh();
                } else save.failed(r.error);
              }}
            />
          ))}
        </ul>
      )}

      <StepNav backHref={`/submit/${submissionId}?step=2`} onContinue={() => router.push(`/submit/${submissionId}?step=4`)} />

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          const f = removing;
          if (!f) return;
          startTransition(async () => {
            save.saving();
            const r = await removeFileAction(submissionId, f.id);
            if (r.ok) {
              save.saved();
              router.refresh();
            } else save.failed(r.error);
          });
        }}
        title="Remove this file?"
        body={removing ? `${removing.file_name ?? removing.embed_url} will be removed from the submission.` : ""}
        confirmLabel="Remove"
        tone="danger"
      />
    </div>
  );
}

function KindIcon({ name }: { name: "image" | "chart" | "table" | "video" | "document" }) {
  const paths = {
    image: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M21 16l-5-5-8 8" />
      </>
    ),
    chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    table: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M9 4v16" />
      </>
    ),
    video: (
      <>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="M16 10l5-3v10l-5-3" />
      </>
    ),
    document: (
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M9 10h6M9 14h6M9 18h3" />
      </>
    ),
  };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0E6E62" strokeWidth="1.8" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function KindCard({
  kind,
  icon,
  count,
  limits,
  onFiles,
  title,
  note,
}: {
  kind: UploadKind;
  icon: "image" | "chart" | "table" | "document";
  count: number;
  limits: UploadLimits;
  onFiles: (l: FileList) => void;
  title?: string;
  note?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const meta = FILE_KINDS[kind];
  return (
    <div className="flex flex-col gap-2 rounded-[22px] bg-bg p-[18px]">
      <KindIcon name={icon} />
      <strong className="text-[15px]">{title ?? meta.label}</strong>
      <span className="text-[13px] text-muted">
        {count ? `${count} uploaded · ` : ""}
        {meta.hint} · {limits[kind]?.maxMb ?? "?"} MB
      </span>
      {note && <span className="text-xs text-muted">{note}</span>}
      <button type="button" onClick={() => ref.current?.click()} className="mt-auto h-11 w-max rounded-full bg-surface px-4 text-sm font-bold hover:bg-line">
        + Upload<span className="sr-only"> {title ?? meta.label}</span>
      </button>
      <input
        ref={ref}
        type="file"
        multiple={kind !== "supplementary"}
        accept={meta.accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function VideoCard({ count, limits, onFiles, onLink }: { count: number; limits: UploadLimits; onFiles: (l: FileList) => void; onLink: (url: string) => Promise<string | null> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-[22px] bg-bg p-[18px]">
      <KindIcon name="video" />
      <strong className="text-[15px]">Video</strong>
      <span className="text-[13px] text-muted">
        {count ? `${count} added · ` : ""}YouTube / Vimeo link, or MP4 up to {limits.video_upload?.maxMb ?? 50} MB
      </span>
      <form
        className="flex gap-1.5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!link.trim()) return;
          setBusy(true);
          const error = await onLink(link.trim());
          setBusy(false);
          setErr(error);
          if (!error) setLink("");
        }}
      >
        <label htmlFor="video-link" className="sr-only">
          YouTube or Vimeo link
        </label>
        <input
          id="video-link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://youtu.be/…"
          className="h-11 min-w-0 flex-1 rounded-full border border-line-strong bg-surface px-3.5 text-sm focus:border-teal focus:outline-none"
        />
        <button type="submit" disabled={busy} className="h-11 shrink-0 rounded-full bg-ink px-4 text-sm font-bold text-white disabled:opacity-60">
          {busy ? "…" : "Add"}
        </button>
      </form>
      {err && (
        <span role="alert" className="text-xs font-semibold text-[#9b1c3d]">
          {err}
        </span>
      )}
      <button type="button" onClick={() => ref.current?.click()} className="mt-auto h-11 w-max rounded-full bg-surface px-4 text-sm font-bold hover:bg-line">
        + Upload video
      </button>
      <input
        ref={ref}
        type="file"
        accept={FILE_KINDS.video_upload.accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function FileRow({
  file,
  doubleBlind,
  onRemove,
  onCaption,
  onIdentity,
}: {
  file: EditableFile;
  doubleBlind: boolean;
  onRemove: () => void;
  onCaption: (c: string) => void;
  onIdentity: (v: boolean) => void;
}) {
  const [caption, setCaption] = useState(file.caption ?? "");
  const isVideoLink = file.kind === "video_embed";
  const label = isVideoLink ? "Video link" : (FILE_KINDS[file.kind as UploadKind]?.label ?? file.kind);
  return (
    <li className="flex flex-wrap items-center gap-3.5 rounded-[18px] border border-line px-4 py-3.5">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl font-mono text-[10px]",
          file.kind === "manuscript" ? "bg-seafoam" : "bg-lime",
        )}
        aria-hidden="true"
      >
        {isVideoLink ? "LINK" : extBadge(file.file_name)}
      </span>
      <span className="min-w-0 flex-[1_1_220px]">
        <span className="block truncate text-sm font-bold">{isVideoLink ? file.embed_url : file.file_name}</span>
        <span className="block text-xs text-muted">
          {label}
          {file.bytes ? ` · ${formatBytes(file.bytes)}` : ""}
          {file.contains_identity ? " · hidden from reviewers" : ""}
        </span>
        {file.kind !== "manuscript" && (
          <>
            <label htmlFor={`cap-${file.id}`} className="sr-only">
              Caption for {file.file_name ?? "video"}
            </label>
            <input
              id={`cap-${file.id}`}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={() => caption !== (file.caption ?? "") && onCaption(caption)}
              placeholder="Add a caption (optional)"
              maxLength={1000}
              className="mt-2 h-10 w-full rounded-xl border border-line bg-field px-3 text-[13px] focus:border-teal focus:bg-surface focus:outline-none"
            />
          </>
        )}
        {doubleBlind && file.kind !== "manuscript" && !isVideoLink && (
          <label className="mt-1.5 flex min-h-9 items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={file.contains_identity} onChange={(e) => onIdentity(e.target.checked)} className="size-4 accent-teal-deep" />
            Contains author names (hide from reviewers)
          </label>
        )}
      </span>
      <span className="text-xs font-bold text-teal-deep">Ready</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.file_name ?? "video link"}`}
        className="inline-flex size-11 items-center justify-center rounded-full bg-bg hover:bg-pink"
      >
        <Icon name="close" size={15} />
      </button>
    </li>
  );
}
