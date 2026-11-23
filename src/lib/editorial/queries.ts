import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, ArticleType, MediaKind, SubmissionStatus } from "@/lib/supabase/types";

/** Editor-facing reads. RLS restricts all of these to editors/admins. */

export type BoardRow = {
  id: string;
  ref: string;
  status: SubmissionStatus;
  submitted_at: string | null;
  updated_at: string;
  title: string;
  version: number | null;
  discipline: string | null;
  submitter: string | null;
};

export const BOARD_TABS = {
  all: { label: "All", statuses: ["submitted", "editorial_check", "in_review", "revision_requested", "accepted"] },
  new: { label: "New", statuses: ["submitted", "editorial_check"] },
  review: { label: "In review", statuses: ["in_review"] },
  revision: { label: "Revision", statuses: ["revision_requested"] },
  accepted: { label: "Ready to publish", statuses: ["accepted"] },
  closed: { label: "Closed", statuses: ["published", "declined", "withdrawn"] },
} as const satisfies Record<string, { label: string; statuses: readonly SubmissionStatus[] }>;
export type BoardTab = keyof typeof BOARD_TABS;

export async function getBoard(): Promise<BoardRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select(
      "id, ref, status, submitted_at, updated_at, disciplines(name), current:submission_versions!submissions_current_version_fk(title, version), submitter:profiles!submissions_submitter_id_fkey(full_name)",
    )
    .neq("status", "draft")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .limit(500);
  return (data ?? []).map((s) => {
    const cur = s.current as unknown as { title: string; version: number } | null;
    return {
      id: s.id,
      ref: s.ref,
      status: s.status,
      submitted_at: s.submitted_at,
      updated_at: s.updated_at,
      title: cur?.title || "Untitled",
      version: cur?.version ?? null,
      discipline: (s.disciplines as unknown as { name: string } | null)?.name ?? null,
      submitter: (s.submitter as unknown as { full_name: string } | null)?.full_name ?? null,
    };
  });
}

export type ReviewRow = {
  id: string;
  reviewer_id: string;
  reviewer_name: string;
  status: "assigned" | "submitted" | "withdrawn";
  recommendation: "accept" | "minor_revision" | "major_revision" | "reject" | null;
  comments_to_author: string | null;
  comments_to_editor: string | null;
  due_at: string | null;
  assigned_at: string;
  submitted_at: string | null;
  version: number;
};

export type SubmissionDetail = {
  id: string;
  ref: string;
  status: SubmissionStatus;
  article_type: ArticleType;
  discipline: string | null;
  cover_letter: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  submitter_id: string;
  version: { id: string; version: number; title: string; abstract: string } | null;
  keywords: string[];
  authors: { full_name: string; affiliation: string | null; orcid: string | null; email: string | null; is_corresponding: boolean; user_id: string | null }[];
  files: { id: string; kind: MediaKind; file_name: string | null; embed_url: string | null; bytes: number | null; contains_identity: boolean; url: string | null }[];
  reviews: ReviewRow[];
  decisions: { decision: "accept" | "revise" | "decline"; note_to_author: string | null; created_at: string; version: number | null }[];
  article: { id: string; slug: string; paper_no: number; featured: boolean; final_pdf_path: string | null } | null;
  body: { html: string; references: string | null } | null;
};

export async function getSubmissionDetail(id: string): Promise<SubmissionDetail | null> {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("submissions")
    .select("id, ref, status, article_type, cover_letter, submitted_at, decided_at, submitter_id, current_version_id, disciplines(name)")
    .eq("id", id)
    .maybeSingle();
  if (!s) return null;
  const vid = s.current_version_id;
  const [version, kw, authors, files, reviews, decisions, article, versions, body] = await Promise.all([
    vid ? supabase.from("submission_versions").select("id, version, title, abstract").eq("id", vid).maybeSingle() : Promise.resolve({ data: null }),
    vid ? supabase.from("version_keywords").select("position, keywords(label)").eq("version_id", vid).order("position") : Promise.resolve({ data: [] }),
    vid
      ? supabase.from("submission_authors").select("full_name, affiliation, orcid, email, is_corresponding, user_id").eq("version_id", vid).order("position")
      : Promise.resolve({ data: [] }),
    vid
      ? supabase.from("submission_files").select("id, kind, file_name, storage_path, embed_url, bytes, contains_identity").eq("version_id", vid).order("kind").order("position")
      : Promise.resolve({ data: [] }),
    supabase
      .from("reviews")
      .select("id, reviewer_id, status, recommendation, comments_to_author, comments_to_editor, due_at, assigned_at, submitted_at, version_id, reviewer:profiles!reviews_reviewer_id_fkey(full_name)")
      .eq("submission_id", id)
      .order("assigned_at"),
    supabase.from("editorial_decisions").select("decision, note_to_author, created_at, version_id").eq("submission_id", id).order("created_at", { ascending: false }),
    supabase.from("articles").select("id, slug, paper_no, featured, final_pdf_path").eq("submission_id", id).maybeSingle(),
    supabase.from("submission_versions").select("id, version").eq("submission_id", id),
    vid ? supabase.from("version_bodies").select("body_html, references_text").eq("version_id", vid).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const vnum = new Map((versions.data ?? []).map((v) => [v.id, v.version]));

  // Short-lived signed links so editors can open files.
  const fileRows = (files.data ?? []) as { id: string; kind: MediaKind; file_name: string | null; storage_path: string | null; embed_url: string | null; bytes: number | null; contains_identity: boolean }[];
  const paths = fileRows.map((f) => f.storage_path).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data } = await supabase.storage.from("submissions").createSignedUrls(paths, 60 * 15);
    for (const d of data ?? []) if (d.path && d.signedUrl) signed.set(d.path, d.signedUrl);
  }

  return {
    id: s.id,
    ref: s.ref,
    status: s.status,
    article_type: s.article_type,
    cover_letter: s.cover_letter,
    submitted_at: s.submitted_at,
    decided_at: s.decided_at,
    submitter_id: s.submitter_id,
    discipline: (s.disciplines as unknown as { name: string } | null)?.name ?? null,
    version: (version.data as SubmissionDetail["version"]) ?? null,
    keywords: ((kw.data ?? []) as { keywords: unknown }[]).map((k) => (k.keywords as { label: string } | null)?.label ?? "").filter(Boolean),
    authors: (authors.data ?? []) as SubmissionDetail["authors"],
    files: fileRows.map((f) => ({ ...f, url: f.storage_path ? (signed.get(f.storage_path) ?? null) : f.embed_url })),
    reviews: (reviews.data ?? []).map((r) => ({
      ...r,
      reviewer_name: (r.reviewer as unknown as { full_name: string } | null)?.full_name || "Reviewer",
      version: vnum.get(r.version_id) ?? 0,
    })) as ReviewRow[],
    decisions: (decisions.data ?? []).map((d) => ({ ...d, version: d.version_id ? (vnum.get(d.version_id) ?? null) : null })),
    article: article.data ?? null,
    body: body.data ? { html: body.data.body_html, references: body.data.references_text } : null,
  };
}

export type Person = { id: string; full_name: string; email: string | null; affiliation: string | null; roles: AppRole[]; created_at: string };

export async function getPeople(): Promise<Person[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, affiliation, created_at").order("created_at", { ascending: false }).limit(1000),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const byUser = new Map<string, AppRole[]>();
  for (const r of roles ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
  return (profiles ?? []).map((p) => ({ ...p, full_name: p.full_name || p.email || "Unnamed", roles: byUser.get(p.id) ?? [] }));
}

export async function getReviewerPool() {
  return (await getPeople()).filter((p) => p.roles.some((r) => r === "reviewer" || r === "editor" || r === "admin"));
}

export async function getIssues() {
  const supabase = await createClient();
  const [{ data: volumes }, { data: issues }, { data: articles }] = await Promise.all([
    supabase.from("volumes").select("id, number, year").order("number", { ascending: false }),
    supabase.from("issues").select("id, volume_id, number, label, published_at, is_current").order("number", { ascending: false }),
    supabase
      .from("articles")
      .select("id, slug, paper_no, doi, issue_id, featured, first_page, last_page, published_at, withdrawn_at, version:submission_versions!articles_version_id_fkey(title)")
      .order("published_at", { ascending: false })
      .limit(500),
  ]);
  return {
    volumes: volumes ?? [],
    issues: issues ?? [],
    articles: (articles ?? []).map((a) => ({ ...a, title: (a.version as unknown as { title: string } | null)?.title ?? "Untitled" })),
  };
}

export async function getTaxonomy() {
  const supabase = await createClient();
  const [{ data: disciplines }, { data: keywords }, { data: usage }] = await Promise.all([
    supabase.from("disciplines").select("id, slug, name, tone, sort, active").order("sort"),
    supabase.from("keywords").select("id, label, slug").order("label").limit(2000),
    supabase.from("version_keywords").select("keyword_id"),
  ]);
  const counts = new Map<number, number>();
  for (const u of usage ?? []) counts.set(u.keyword_id, (counts.get(u.keyword_id) ?? 0) + 1);
  return { disciplines: disciplines ?? [], keywords: (keywords ?? []).map((k) => ({ ...k, uses: counts.get(k.id) ?? 0 })) };
}

export async function getSettings() {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("key, value");
  return Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>;
}
