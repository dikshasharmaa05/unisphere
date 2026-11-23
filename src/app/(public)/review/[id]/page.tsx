import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "@/components/ui/Pill";
import { ROLE_GROUPS, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { articleTypeLabel } from "@/lib/submissions/labels";
import type { ArticleType } from "@/lib/supabase/types";
import { ReviewForm } from "./ReviewForm";

export const metadata: Metadata = { title: "Review", robots: { index: false } };

type Packet = {
  review: { id: string; status: "assigned" | "submitted" | "withdrawn"; due_at: string | null; recommendation: string | null; comments_to_author: string | null; comments_to_editor: string | null; submitted_at: string | null };
  review_model: "double_blind" | "single_blind";
  submission: { ref: string; article_type: ArticleType; discipline: string | null };
  version: { number: number; title: string; abstract: string; video_url: string | null; body_html: string | null; references_text: string | null };
  keywords: string[];
  files: { id: string; kind: string; storage_path: string | null; embed_url: string | null; file_name: string | null; caption: string | null }[];
  authors: { full_name: string; affiliation: string | null; orcid: string | null }[] | null;
};

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
const KIND: Record<string, string> = { manuscript: "Manuscript", image: "Image", figure: "Figure", dataset: "Dataset", video_upload: "Video", video_embed: "Video link", supplementary: "Supplementary" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(ROLE_GROUPS.review, `/review/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_review_packet", { p_review: id });
  if (error || !data) notFound();
  const p = data as unknown as Packet;

  const paths = p.files.map((f) => f.storage_path).filter((x): x is string => !!x);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: s } = await supabase.storage.from("submissions").createSignedUrls(paths, 60 * 30);
    for (const d of s ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
  }
  const open = p.review.status === "assigned";

  return (
    <section className="container-page pt-6">
      <Link href="/review" className="text-sm font-semibold text-teal-deep hover:text-ink">
        ← Your reviews
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <p className="eyebrow text-muted">
            {p.submission.ref} · {articleTypeLabel(p.submission.article_type)}
            {p.submission.discipline ? ` · ${p.submission.discipline}` : ""}
            {p.version.number > 1 ? ` · revision v${p.version.number}` : ""}
          </p>
          <h1 className="mt-3 text-[clamp(28px,3.6vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em]">{p.version.title}</h1>
        </div>
        <Pill tone={open ? "aqua" : "seafoam"}>{open ? (p.review.due_at ? `Due ${fmt(p.review.due_at)}` : "Open") : p.review.status === "submitted" ? "Submitted" : "Withdrawn"}</Pill>
      </div>

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
        <article className="flex min-w-0 flex-col gap-5">
          <div className="rounded-[28px] bg-surface p-6">
            {p.authors ? (
              <p className="text-sm">
                <strong>Authors:</strong> {p.authors.map((a) => [a.full_name, a.affiliation].filter(Boolean).join(", ")).join("; ")}
              </p>
            ) : (
              <p className="rounded-2xl bg-aqua px-4 py-3 text-[13px] font-semibold text-teal-deep">Double-blind review: author identities are hidden from you, and yours from them.</p>
            )}
            <h2 className="mt-5 text-lg font-extrabold">Abstract</h2>
            <p className="mt-2 whitespace-pre-line font-serif text-[17px] leading-[1.75] text-ink-soft">{p.version.abstract}</p>
            {p.keywords.length > 0 && (
              <p className="mt-4 flex flex-wrap gap-1.5">
                {p.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-bg px-3 py-1 text-xs font-semibold">
                    {k}
                  </span>
                ))}
              </p>
            )}
          </div>
          <div className="rounded-[28px] bg-surface p-6">
            <h2 className="text-lg font-extrabold">Files</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {p.files.map((f) => {
                const href = f.storage_path ? signed.get(f.storage_path) : f.embed_url;
                return (
                  <li key={f.id}>
                    <a href={href ?? "#"} target="_blank" rel="noopener noreferrer" className="flex flex-wrap items-center gap-3 rounded-[18px] bg-bg px-4 py-3 text-sm hover:bg-line">
                      <span className="font-bold">{KIND[f.kind] ?? f.kind}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">{f.file_name ?? f.embed_url}</span>
                      <span className="text-xs font-bold text-teal-deep">Open ↗</span>
                    </a>
                    {f.caption && <p className="mt-1 px-4 text-xs text-muted">{f.caption}</p>}
                  </li>
                );
              })}
              {p.files.length === 0 && <li className="text-sm text-muted">No files.</li>}
            </ul>
            <p className="mt-3 text-xs text-muted">Links expire after 30 minutes — reload the page for fresh ones.</p>
          </div>
        </article>
        <aside className="lg:sticky lg:top-5">
          <ReviewForm
            reviewId={p.review.id}
            open={open}
            initial={{ recommendation: (p.review.recommendation as never) ?? null, toAuthor: p.review.comments_to_author ?? "", toEditor: p.review.comments_to_editor ?? "" }}
          />
        </aside>
      </div>
    </section>
  );
}
