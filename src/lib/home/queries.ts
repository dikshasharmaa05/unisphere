import "server-only";
import type { Tone } from "@/components/ui/Card";
import type { FeaturedPreview, IssuePreview, PaperPreview } from "@/lib/placeholder-data";
import { createPublicClient } from "@/lib/supabase/server";

const COVERS: Tone[] = ["seafoam", "lime", "aqua"];
const monthYear = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** Initials-style author list: "R. Iyer, M. Okafor, L. Brandt" (max 3, then "et al."). */
export function shortAuthors(list: string | null): string {
  if (!list) return "";
  const names = list.split(", ").filter(Boolean);
  const short = names.slice(0, 3).map((n) => {
    const parts = n.trim().split(/\s+/);
    const last = parts.pop() ?? "";
    return parts.length ? `${parts.map((p) => `${p[0]!.toUpperCase()}.`).join(" ")} ${last}` : last;
  });
  return names.length > 3 ? `${short.join(", ")} et al.` : short.join(", ");
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * Real homepage content. Each part is null when there is nothing published yet,
 * so the landing page keeps its sample cards (which link to the archive) until then.
 */
export async function getHomeData(): Promise<{ latest: PaperPreview[] | null; featured: FeaturedPreview | null; issues: IssuePreview[] | null }> {
  try {
    const supabase = createPublicClient();
    const [{ data: rows }, { data: feat }, { data: iss }, { data: tones }] = await Promise.all([
      supabase.rpc("search_articles", { p_sort: "newest", p_limit: 3 }),
      supabase
        .from("articles")
        .select("slug, paper_no, version:submission_versions!articles_version_id_fkey(title), discipline:disciplines(name)")
        .eq("featured", true)
        .is("withdrawn_at", null)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("archive_issues"),
      supabase.from("disciplines").select("slug, tone"),
    ]);
    const toneOf = new Map((tones ?? []).map((t) => [t.slug, t.tone as Tone]));
    const live = (rows ?? []).filter((r) => !r.withdrawn);
    const latest: PaperPreview[] | null = live.length
      ? live.map((r) => ({
          href: `/articles/${r.slug}`,
          field: r.discipline_name ?? "Research",
          tone: toneOf.get(r.discipline_slug ?? "") ?? "seafoam",
          meta: r.volume && r.issue ? `Vol. ${r.volume} · No. ${r.issue}` : `Paper ${r.paper_no}`,
          title: r.title,
          authors: shortAuthors(r.authors),
          abstract: clip(r.abstract, 220),
        }))
      : null;
    const f = feat as { slug: string; paper_no: number; version: { title: string } | null; discipline: { name: string } | null } | null;
    const first = live[0];
    const featured: FeaturedPreview | null = f?.version
      ? { href: `/articles/${f.slug}`, paperNo: String(f.paper_no), title: f.version.title, field: f.discipline?.name ?? "Research" }
      : first
        ? { href: `/articles/${first.slug}`, paperNo: String(first.paper_no), title: first.title, field: first.discipline_name ?? "Research" }
        : null;
    const issues: IssuePreview[] | null = iss?.length
      ? iss.slice(0, 3).map((i, n) => ({
          href: `/archive?volume=${i.volume}&issue=${i.issue}`,
          short: `V${i.volume}·I${i.issue}`,
          label: `Volume ${i.volume} · Issue ${i.issue}`,
          sub: [i.label ?? monthYear(i.published_at), i.is_current ? "Current issue" : null].filter(Boolean).join(" · "),
          cover: COVERS[n % COVERS.length]!,
          count: `${i.article_count} ${i.article_count === 1 ? "article" : "articles"}`,
        }))
      : null;
    return { latest, featured, issues };
  } catch {
    return { latest: null, featured: null, issues: null };
  }
}
