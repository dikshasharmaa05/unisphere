import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { PAGE_SIZE, type ArchiveQuery } from "./params";

export type ArchiveRow = {
  article_id: string;
  slug: string;
  paper_no: number;
  doi: string | null;
  title: string;
  abstract: string;
  authors: string | null;
  keywords: string[];
  discipline_slug: string | null;
  discipline_name: string | null;
  article_type: ArchiveQuery["types"][number];
  volume: number | null;
  issue: number | null;
  published_at: string;
  withdrawn: boolean;
  has_images: boolean;
  has_figures: boolean;
  has_video: boolean;
  has_datasets: boolean;
  like_count: number;
  comment_count: number;
};

export type ArchiveIssue = { issue_id: number; volume: number; year: number | null; issue: number; label: string | null; published_at: string; is_current: boolean; article_count: number };
export type Discipline = { slug: string; name: string; tone: "seafoam" | "lime" | "aqua" | "pink" | "stone" };

export const getArchiveIssues = cache(async (): Promise<ArchiveIssue[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("archive_issues");
  return (data ?? []) as ArchiveIssue[];
});

export const getDisciplines = cache(async (): Promise<Discipline[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("disciplines").select("slug, name, tone").eq("active", true).order("sort");
  return (data ?? []) as Discipline[];
});

/** Run an archive search. Unknown volume/issue → no results (never "everything"). */
export async function searchArchive(q: ArchiveQuery): Promise<{ rows: ArchiveRow[]; total: number; issueMissing: boolean }> {
  let issueId: number | null = null;
  if (q.volume && q.issue) {
    const match = (await getArchiveIssues()).find((i) => i.volume === q.volume && i.issue === q.issue);
    if (!match) return { rows: [], total: 0, issueMissing: true };
    issueId = match.issue_id;
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_articles", {
    p_q: q.q || undefined,
    p_discipline: q.discipline ?? undefined,
    p_issue: issueId ?? undefined,
    p_types: q.types.length ? q.types : undefined,
    p_includes: q.inc.length ? q.inc : undefined,
    p_sort: q.sort,
    p_limit: PAGE_SIZE,
    p_offset: (q.page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(`search failed: ${error.message}`);
  const rows = (data ?? []) as (ArchiveRow & { total_count: number })[];
  let total = rows[0]?.total_count ?? 0;
  // Past the last page: count without paging so we can say how many there are.
  if (!rows.length && q.page > 1) {
    const { data: probe } = await supabase.rpc("search_articles", {
      p_q: q.q || undefined, p_discipline: q.discipline ?? undefined, p_issue: issueId ?? undefined,
      p_types: q.types.length ? q.types : undefined, p_includes: q.inc.length ? q.inc : undefined, p_limit: 1,
    });
    total = (probe as { total_count: number }[] | null)?.[0]?.total_count ?? 0;
  }
  return { rows, total: Number(total), issueMissing: false };
}
