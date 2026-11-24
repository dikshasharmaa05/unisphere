import type { Database } from "@/lib/supabase/types.gen";

export type ArticleType = Database["public"]["Enums"]["article_type"];
export const SORTS = ["relevance", "newest", "oldest", "liked", "discussed"] as const;
export type Sort = (typeof SORTS)[number];
export const INCLUDES = ["figures", "video", "images", "datasets"] as const;
export type Include = (typeof INCLUDES)[number];
const TYPES: ArticleType[] = ["original_research", "review_article", "case_study", "short_communication"];
export const PAGE_SIZE = 10;

export type ArchiveQuery = {
  q: string;
  discipline: string | null;
  volume: number | null;
  issue: number | null;
  types: ArticleType[];
  inc: Include[];
  sort: Sort;
  view: "list" | "grid";
  page: number;
};

type Raw = Record<string, string | string[] | undefined>;
const all = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const first = (v: string | string[] | undefined) => all(v)[0];
const posInt = (v: string | undefined, max: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= max ? n : null;
};

/** Parse /archive search params. Anything invalid is dropped, never thrown. */
export function parseArchiveParams(raw: Raw): ArchiveQuery {
  const q = (first(raw.q) ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const discipline = first(raw.discipline);
  const sortRaw = first(raw.sort);
  // Default sort: relevance when searching, newest otherwise.
  const sort: Sort = SORTS.includes(sortRaw as Sort) ? (sortRaw as Sort) : q ? "relevance" : "newest";
  const volume = posInt(first(raw.volume), 32767);
  return {
    q,
    discipline: discipline && /^[a-z0-9-]{1,80}$/.test(discipline) ? discipline : null,
    volume,
    issue: volume ? posInt(first(raw.issue), 32767) : null,
    types: [...new Set(all(raw.type).filter((t): t is ArticleType => TYPES.includes(t as ArticleType)))],
    inc: [...new Set(all(raw.inc).filter((t): t is Include => INCLUDES.includes(t as Include)))],
    sort: sort === "relevance" && !q ? "newest" : sort,
    view: first(raw.view) === "grid" ? "grid" : "list",
    page: posInt(first(raw.page), 10000) ?? 1,
  };
}

/** Build an /archive URL from a query plus changes. Changing any filter resets to page 1. */
export function archiveHref(base: ArchiveQuery, patch: Partial<ArchiveQuery> = {}): string {
  const filtersChanged = Object.keys(patch).some((k) => k !== "page" && k !== "view");
  const s = { ...base, ...patch, page: patch.page ?? (filtersChanged ? 1 : base.page) };
  // A new search keeps an explicit sort, but a default sort follows the new query.
  if (patch.q !== undefined && patch.sort === undefined && base.sort === (base.q ? "relevance" : "newest")) s.sort = s.q ? "relevance" : "newest";
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.discipline) p.set("discipline", s.discipline);
  if (s.volume) {
    p.set("volume", String(s.volume));
    if (s.issue) p.set("issue", String(s.issue));
  }
  for (const t of s.types) p.append("type", t);
  for (const i of s.inc) p.append("inc", i);
  const defaultSort = s.q ? "relevance" : "newest";
  if (s.sort !== defaultSort && !(s.sort === "relevance" && !s.q)) p.set("sort", s.sort);
  if (s.view === "grid") p.set("view", "grid");
  if (s.page > 1) p.set("page", String(s.page));
  const qs = p.toString();
  return qs ? `/archive?${qs}` : "/archive";
}

export const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Compact page list: 1 … 4 5 [6] 7 8 … 20 */
export function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, current - 1);
  const hi = Math.min(total - 1, current + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push("…");
  out.push(total);
  return out;
}

export const isFiltered = (q: ArchiveQuery) => !!(q.q || q.discipline || q.volume || q.types.length || q.inc.length);
