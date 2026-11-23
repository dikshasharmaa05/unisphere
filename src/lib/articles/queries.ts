import "server-only";
import { cache } from "react";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { sanitizeArticleHtml, type TocEntry } from "@/lib/content/sanitize";
import type { ArticleType, MediaKind } from "@/lib/supabase/types";

export type PublicArticle = {
  id: string;
  submission_id: string;
  version_id: string;
  slug: string;
  paper_no: number;
  doi: string | null;
  licence: string;
  article_type: ArticleType;
  published_at: string;
  received_at: string | null;
  accepted_at: string | null;
  withdrawn_at: string | null;
  withdrawal_note: string | null;
  first_page: number | null;
  last_page: number | null;
  final_pdf_path: string | null;
  like_count: number;
  comment_count: number;
  has_images: boolean;
  has_figures: boolean;
  has_video: boolean;
  has_datasets: boolean;
  title: string;
  abstract: string;
  version: number;
  discipline: { name: string; slug: string } | null;
  issue: { number: number; label: string | null; volume: number } | null;
  authors: { position: number; full_name: string; affiliation: string | null; affiliation_ror: string | null; orcid: string | null; is_corresponding: boolean }[];
  keywords: string[];
  history: { version: number; published_at: string | null; reason: string | null }[];
};

/** Everything public about a published article (works signed out; RLS allows it). Cached per request. */
export const getArticle = cache(async (slug: string): Promise<PublicArticle | null> => {
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("articles")
    .select(
      "id, submission_id, version_id, slug, paper_no, doi, licence, article_type, published_at, received_at, accepted_at, withdrawn_at, withdrawal_note, first_page, last_page, final_pdf_path, like_count, comment_count, has_images, has_figures, has_video, has_datasets, discipline_id, issue_id",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!a) return null;
  const [v, disc, issue, authors, kw, history] = await Promise.all([
    supabase.from("submission_versions").select("title, abstract, version").eq("id", a.version_id).single(),
    a.discipline_id ? supabase.from("disciplines").select("name, slug").eq("id", a.discipline_id).maybeSingle() : Promise.resolve({ data: null }),
    a.issue_id ? supabase.from("issues").select("number, label, volumes(number)").eq("id", a.issue_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.rpc("published_authors", { p_version: a.version_id }),
    supabase.from("version_keywords").select("position, keywords(label)").eq("version_id", a.version_id).order("position"),
    supabase.from("submission_versions").select("version, published_at, reason").eq("submission_id", a.submission_id).not("published_at", "is", null).order("version"),
  ]);
  const iss = issue.data as { number: number; label: string | null; volumes: { number: number } | null } | null;
  return {
    ...a,
    title: v.data?.title ?? "",
    abstract: v.data?.abstract ?? "",
    version: v.data?.version ?? 1,
    discipline: disc.data ?? null,
    issue: iss && iss.volumes ? { number: iss.number, label: iss.label, volume: iss.volumes.number } : null,
    authors: (authors.data ?? []) as PublicArticle["authors"],
    keywords: ((kw.data ?? []) as { keywords: unknown }[]).map((k) => (k.keywords as { label: string } | null)?.label ?? "").filter(Boolean),
    history: history.data ?? [],
  };
});

export type ArticleFullText = {
  html: string;
  toc: TocEntry[];
  references: string | null;
  media: { id: string; kind: MediaKind; file_name: string | null; caption: string | null; url: string | null; mime_type: string | null }[];
};

/**
 * Full text for a signed-in reader (RLS) or a verified crawler (service role, text only).
 * Returns null for anyone else.
 */
export async function getFullText(versionId: string, mode: "member" | "crawler"): Promise<ArticleFullText | null> {
  const supabase = mode === "member" ? await createClient() : createAdminClient();
  const { data: body } = await supabase.from("version_bodies").select("body_html, references_text").eq("version_id", versionId).maybeSingle();
  // Crawlers: only for published versions (service role bypasses RLS, so check explicitly).
  if (mode === "crawler") {
    const { data: v } = await supabase.from("submission_versions").select("published_at").eq("id", versionId).single();
    if (!v?.published_at) return null;
  }
  const { html, toc } = sanitizeArticleHtml(body?.body_html ?? "");
  let media: ArticleFullText["media"] = [];
  if (mode === "member") {
    const { data: files } = await supabase
      .from("submission_files")
      .select("id, kind, file_name, caption, storage_path, embed_url, mime_type, contains_identity")
      .eq("version_id", versionId)
      .neq("kind", "manuscript")
      .order("kind")
      .order("position");
    const rows = (files ?? []).filter((f) => !(f.kind === "supplementary" && f.contains_identity)); // title pages aren't article content
    const paths = rows.map((f) => f.storage_path).filter((p): p is string => !!p);
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data } = await supabase.storage.from("submissions").createSignedUrls(paths, 60 * 60);
      for (const s of data ?? []) if (s.path && s.signedUrl) signed.set(s.path, s.signedUrl);
    }
    media = rows.map((f) => ({ id: f.id, kind: f.kind, file_name: f.file_name, caption: f.caption, mime_type: f.mime_type, url: f.storage_path ? (signed.get(f.storage_path) ?? null) : f.embed_url }));
  }
  return { html, toc, references: body?.references_text ?? null, media };
}

export async function hasLiked(articleId: string, userId: string | undefined) {
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase.from("likes").select("article_id").eq("article_id", articleId).eq("user_id", userId).maybeSingle();
  return !!data;
}

/** Is the viewer the submitting author or a listed author (for "request a change")? */
export async function isAuthorOf(articleId: string, userId: string | undefined) {
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_article_author", { p_article: articleId });
  return !!data;
}
