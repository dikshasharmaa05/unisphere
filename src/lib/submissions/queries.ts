import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ArticleType, MediaKind, SubmissionStatus } from "@/lib/supabase/types";
import { DEFAULT_LIMITS, type UploadLimits } from "./labels";

export type EditableAuthor = {
  id: string;
  position: number;
  full_name: string;
  affiliation: string | null;
  affiliation_ror: string | null;
  orcid: string | null;
  email: string | null;
  is_corresponding: boolean;
  user_id: string | null;
};

export type EditableFile = {
  id: string;
  kind: MediaKind;
  storage_path: string | null;
  embed_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  bytes: number | null;
  caption: string | null;
  position: number;
  contains_identity: boolean;
};

export type SubmissionForEdit = {
  id: string;
  ref: string;
  status: SubmissionStatus;
  discipline_id: number | null;
  article_type: ArticleType;
  cover_letter: string | null;
  updated_at: string;
  version: { id: string; version: number; title: string; abstract: string; updated_at: string; submitted_at: string | null };
  keywords: string[];
  authors: EditableAuthor[];
  files: EditableFile[];
};

/** The caller's submission with its OPEN version (draft or revision), or null. RLS limits to the owner. */
export async function getSubmissionForEdit(id: string): Promise<SubmissionForEdit | null> {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("submissions")
    .select("id, ref, status, discipline_id, article_type, cover_letter, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!s) return null;
  const { data: v } = await supabase
    .from("submission_versions")
    .select("id, version, title, abstract, updated_at, submitted_at")
    .eq("submission_id", id)
    .is("submitted_at", null)
    .maybeSingle();
  if (!v) return null;

  const [{ data: kw }, { data: authors }, { data: files }] = await Promise.all([
    supabase.from("version_keywords").select("position, keywords(label)").eq("version_id", v.id).order("position"),
    supabase
      .from("submission_authors")
      .select("id, position, full_name, affiliation, affiliation_ror, orcid, email, is_corresponding, user_id")
      .eq("version_id", v.id)
      .order("position"),
    supabase
      .from("submission_files")
      .select("id, kind, storage_path, embed_url, file_name, mime_type, bytes, caption, position, contains_identity")
      .eq("version_id", v.id)
      .order("position")
      .order("created_at"),
  ]);

  return {
    ...s,
    version: v,
    keywords: (kw ?? []).map((k) => (k.keywords as unknown as { label: string } | null)?.label ?? "").filter(Boolean),
    authors: (authors ?? []) as EditableAuthor[],
    files: (files ?? []) as EditableFile[],
  };
}

export async function getDisciplines() {
  const supabase = await createClient();
  const { data } = await supabase.from("disciplines").select("id, name, slug").eq("active", true).order("sort");
  return data ?? [];
}

export async function getUploadLimits(): Promise<UploadLimits> {
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "upload_limits").maybeSingle();
  return (data?.value as UploadLimits | undefined) ?? DEFAULT_LIMITS;
}

export type MySubmission = {
  id: string;
  ref: string;
  status: SubmissionStatus;
  updated_at: string;
  submitted_at: string | null;
  title: string;
  version: number;
  has_open_version: boolean;
};

export async function listMySubmissions(userId: string): Promise<MySubmission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select("id, ref, status, updated_at, submitted_at, submission_versions!submission_versions_submission_id_fkey(version, title, submitted_at)")
    .eq("submitter_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((s) => {
    const versions = (s.submission_versions ?? []) as { version: number; title: string; submitted_at: string | null }[];
    const latest = [...versions].sort((a, b) => b.version - a.version)[0];
    return {
      id: s.id,
      ref: s.ref,
      status: s.status,
      updated_at: s.updated_at,
      submitted_at: s.submitted_at,
      title: latest?.title || "Untitled submission",
      version: latest?.version ?? 1,
      has_open_version: versions.some((v) => !v.submitted_at),
    };
  });
}

export async function getSubmissionOverview(id: string) {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("submissions")
    .select("id, ref, status, article_type, created_at, submitted_at, decided_at, updated_at, disciplines(name)")
    .eq("id", id)
    .maybeSingle();
  if (!s) return null;
  const [{ data: versions }, { data: decisions }, { data: reviews }] = await Promise.all([
    supabase.from("submission_versions").select("id, version, title, abstract, submitted_at, reason").eq("submission_id", id).order("version", { ascending: false }),
    supabase.from("editorial_decisions").select("id, decision, note_to_author, created_at, version_id").eq("submission_id", id).order("created_at", { ascending: false }),
    supabase.rpc("author_reviews", { p_submission: id }),
  ]);
  return {
    ...s,
    discipline: (s.disciplines as unknown as { name: string } | null)?.name ?? null,
    versions: versions ?? [],
    decisions: decisions ?? [],
    reviews: reviews ?? [],
  };
}
