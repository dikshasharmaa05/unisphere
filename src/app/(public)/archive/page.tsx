import type { Metadata } from "next";
import Link from "next/link";
import { ArchiveFilters } from "@/components/archive/ArchiveFilters";
import { FiltersToggle } from "@/components/archive/FiltersToggle";
import { QuickLook } from "@/components/archive/QuickLook";
import { AnimatedGlobe } from "@/components/landing/AnimatedGlobe";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel, Pill } from "@/components/ui/Pill";
import { archiveHref, INCLUDES, isFiltered, PAGE_SIZE, pageList, parseArchiveParams, toggle, type ArchiveQuery, type Include } from "@/lib/archive/params";
import { getArchiveIssues, getDisciplines, searchArchive, type ArchiveRow, type Discipline } from "@/lib/archive/queries";
import { cn } from "@/lib/cn";
import { articleTypeLabel } from "@/lib/submissions/labels";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const INCLUDE_LABELS: Record<Include, string> = { figures: "Graphs & figures", video: "Video", images: "Images", datasets: "Datasets" };
const monthYear = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const fullDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = parseArchiveParams(await searchParams);
  const filtered = isFiltered(q) || q.page > 1 || q.sort !== "newest" || q.view !== "list";
  return {
    title: q.q ? `“${q.q}” — Archive` : "Archive",
    description: "Search every peer-reviewed paper published in the journal by title, author, keyword or DOI, and browse by volume and issue.",
    alternates: { canonical: "/archive" },
    // Result pages are endless permutations; let crawlers index articles, not every filter combo.
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ArchivePage({ searchParams }: Props) {
  const query = parseArchiveParams(await searchParams);
  const [disciplines, issues, { rows, total, issueMissing }] = await Promise.all([getDisciplines(), getArchiveIssues(), searchArchive(query)]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const toneOf = new Map(disciplines.map((d) => [d.slug, d.tone]));
  const disciplineName = disciplines.find((d) => d.slug === query.discipline)?.name;
  const activeIssue = issues.find((i) => i.volume === query.volume && i.issue === query.issue);

  return (
    <div className="container-page pt-2">
      {/* Hero + search */}
      <section aria-labelledby="archive-title" className="relative overflow-hidden rounded-[40px] bg-surface p-[clamp(24px,5vw,56px)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 hidden w-[420px] opacity-70 md:block lg:w-[460px]">
          <AnimatedGlobe interactive={false} className="w-full" />
        </div>
        <div className="relative max-w-[760px]">
          <p className="eyebrow text-muted">Archive</p>
          <h1 id="archive-title" className="mt-3.5 text-[clamp(36px,5.4vw,68px)] font-extrabold leading-[0.98] tracking-[-0.05em]">
            Search every paper we’ve published.
          </h1>
          <form action="/archive" method="get" role="search" className="mt-8">
            <label htmlFor="archive-q" className="text-[13px] font-bold">
              Search by title, author, keyword or DOI
            </label>
            <div className="mt-2.5 flex items-center gap-2 rounded-full bg-bg p-1.5 pl-5 focus-within:outline focus-within:outline-2 focus-within:outline-teal-deep">
              <Icon name="search" size={18} className="shrink-0 text-muted" />
              <input
                id="archive-q"
                name="q"
                type="search"
                defaultValue={query.q}
                maxLength={200}
                placeholder="e.g. memory, Okafor, 10.xxxxx/…"
                autoComplete="off"
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
              />
              {query.discipline && <input type="hidden" name="discipline" value={query.discipline} />}
              {query.volume && <input type="hidden" name="volume" value={query.volume} />}
              {query.volume && query.issue && <input type="hidden" name="issue" value={query.issue} />}
              {query.types.map((t) => (
                <input key={t} type="hidden" name="type" value={t} />
              ))}
              {query.inc.map((t) => (
                <input key={t} type="hidden" name="inc" value={t} />
              ))}
              {query.view === "grid" && <input type="hidden" name="view" value="grid" />}
              <button type="submit" className="nudge-arrow inline-flex h-12 shrink-0 items-center gap-3 rounded-full bg-ink pl-5 pr-1.5 text-sm font-bold text-white">
                <span className="sr-only sm:not-sr-only">Search</span>
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-lime text-ink">
                  <Icon name="arrowRight" strokeWidth={2.2} />
                </span>
              </button>
            </div>
          </form>
        </div>
        <nav aria-label="Disciplines" className="relative mt-6">
          <ul className="flex flex-wrap gap-2">
            <li>
              <FilterLink href={archiveHref(query, { discipline: null })} active={!query.discipline}>
                All disciplines
              </FilterLink>
            </li>
            {disciplines.map((d) => (
              <li key={d.slug}>
                <FilterLink href={archiveHref(query, { discipline: d.slug })} active={query.discipline === d.slug}>
                  {d.name}
                </FilterLink>
              </li>
            ))}
          </ul>
        </nav>
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside aria-label="Filters" className="rounded-[28px] bg-surface p-5 lg:sticky lg:top-5">
          <FiltersToggle>
            <Sidebar query={query} issues={issues} />
          </FiltersToggle>
        </aside>

        {/* Results */}
        <section aria-labelledby="results-title" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <h2 id="results-title" className="text-sm text-muted" aria-live="polite">
              <strong className="font-extrabold text-ink">
                {total} {total === 1 ? "result" : "results"}
              </strong>
              {query.q && <> for “{query.q}”</>} in {disciplineName ?? "all disciplines"}
              {activeIssue && <> · Vol. {activeIssue.volume} · Issue {activeIssue.issue}</>}
            </h2>
            <div className="flex rounded-full bg-surface p-1" role="group" aria-label="Layout">
              {(["list", "grid"] as const).map((v) => (
                <Link
                  key={v}
                  href={archiveHref(query, { view: v })}
                  scroll={false}
                  aria-current={query.view === v ? "true" : undefined}
                  className={cn("inline-flex min-h-11 items-center rounded-full px-4 text-xs font-bold capitalize", query.view === v ? "bg-ink text-white" : "hover:bg-bg")}
                >
                  {v}
                </Link>
              ))}
            </div>
          </div>

          {isFiltered(query) && <ActiveFilters query={query} disciplineName={disciplineName} />}

          {rows.length === 0 ? (
            <EmptyState query={query} total={total} issueMissing={issueMissing} />
          ) : (
            <ol className={cn("mt-4", query.view === "grid" ? "grid grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4" : "flex flex-col gap-3")}>
              {rows.map((r) => (
                <li key={r.article_id} className="min-w-0">
                  <ResultCard row={r} tone={toneOf.get(r.discipline_slug ?? "") ?? "stone"} grid={query.view === "grid"} />
                </li>
              ))}
            </ol>
          )}

          {pages > 1 && rows.length > 0 && <Pagination query={query} pages={pages} />}
        </section>
      </div>
    </div>
  );
}

function FilterLink({ href, active, children, className }: { href: string; active: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn("inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition-colors", active ? "bg-ink text-white" : "bg-bg hover:bg-line", className)}
    >
      {children}
    </Link>
  );
}

function Sidebar({ query, issues }: { query: ArchiveQuery; issues: Awaited<ReturnType<typeof getArchiveIssues>> }) {
  const volumes = [...new Set(issues.map((i) => i.volume))];
  return (
    <div className="flex flex-col gap-6">
      <nav aria-labelledby="issues-title">
        <h3 id="issues-title" className="text-sm font-extrabold">
          Volume & issue
        </h3>
        {issues.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-muted">No issues published yet — papers appear here as soon as they’re published online.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            <li>
              <IssueLink href={archiveHref(query, { volume: null, issue: null })} active={!query.volume}>
                <span>All issues</span>
              </IssueLink>
            </li>
            {volumes.map((v) => (
              <li key={v}>
                <p className="px-3 pb-1 pt-2 font-mono text-[11px] uppercase tracking-wide text-muted">Volume {v}</p>
                <ul className="flex flex-col gap-1">
                  {issues
                    .filter((i) => i.volume === v)
                    .map((i) => (
                      <li key={i.issue_id}>
                        <IssueLink href={archiveHref(query, { volume: i.volume, issue: i.issue })} active={query.volume === i.volume && query.issue === i.issue}>
                          <span>
                            Vol. {i.volume} · Issue {i.issue}
                            <span className="sr-only">, {i.article_count} papers</span>
                          </span>
                          <span className="font-mono text-[11px]">{i.is_current ? "Current" : (i.label ?? monthYear(i.published_at))}</span>
                        </IssueLink>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </nav>
      <ArchiveFilters query={query} />
      <div>
        <h3 className="text-sm font-extrabold" id="includes-title">
          Includes
        </h3>
        <ul aria-labelledby="includes-title" className="mt-2 flex flex-wrap gap-1.5">
          {INCLUDES.map((i) => {
            const on = query.inc.includes(i);
            return (
              <li key={i}>
                <Link
                  href={archiveHref(query, { inc: toggle(query.inc, i) })}
                  scroll={false}
                  aria-current={on ? "true" : undefined}
                  className={cn("inline-flex min-h-11 items-center gap-1 rounded-full px-3.5 text-xs font-bold transition-colors", on ? "bg-seafoam" : "bg-bg hover:bg-line")}
                >
                  {on && <Icon name="check" size={12} />}
                  {INCLUDE_LABELS[i]}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function IssueLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn("flex min-h-11 items-center justify-between gap-2 rounded-[14px] px-3 text-[13px] transition-colors", active ? "bg-lime font-bold" : "text-ink-soft hover:bg-bg")}
    >
      {children}
    </Link>
  );
}

function ActiveFilters({ query, disciplineName }: { query: ArchiveQuery; disciplineName?: string }) {
  const chips: { label: string; href: string }[] = [];
  if (query.q) chips.push({ label: `“${query.q}”`, href: archiveHref(query, { q: "" }) });
  if (query.discipline) chips.push({ label: disciplineName ?? query.discipline, href: archiveHref(query, { discipline: null }) });
  if (query.volume && query.issue) chips.push({ label: `Vol. ${query.volume} · Issue ${query.issue}`, href: archiveHref(query, { volume: null, issue: null }) });
  for (const t of query.types) chips.push({ label: articleTypeLabel(t), href: archiveHref(query, { types: toggle(query.types, t) }) });
  for (const i of query.inc) chips.push({ label: INCLUDE_LABELS[i], href: archiveHref(query, { inc: toggle(query.inc, i) }) });
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-1.5 px-1" aria-label="Active filters">
      {chips.map((c) => (
        <li key={c.label}>
          <Link href={c.href} scroll={false} className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-xs font-semibold hover:bg-line" aria-label={`Remove filter ${c.label}`}>
            {c.label}
            <Icon name="close" size={12} />
          </Link>
        </li>
      ))}
      <li>
        <Link href="/archive" className="inline-flex min-h-11 items-center px-2 text-xs font-bold text-teal-deep underline underline-offset-2">
          Clear all
        </Link>
      </li>
    </ul>
  );
}

function ResultCard({ row: r, tone, grid }: { row: ArchiveRow; tone: Discipline["tone"]; grid: boolean }) {
  const meta = r.volume && r.issue ? `Vol. ${r.volume} · Issue ${r.issue}` : `Online ${fullDate(r.published_at)}`;
  const tile = cn("flex shrink-0 flex-col justify-between rounded-[18px] p-3", { seafoam: "bg-seafoam", lime: "bg-lime", aqua: "bg-aqua", pink: "bg-pink", stone: "bg-stone" }[tone]);
  const includes = [r.has_figures && "Figures", r.has_video && "Video", r.has_images && "Images", r.has_datasets && "Data"].filter(Boolean) as string[];
  return (
    <article className={cn("group relative flex h-full gap-4 rounded-[26px] bg-surface p-4 transition-shadow hover:shadow-pop sm:p-5", grid ? "flex-col" : "flex-col sm:flex-row")}>
      <div className={cn(tile, grid ? "h-[86px] w-full flex-row items-end" : "h-[86px] w-full flex-row items-end sm:h-[100px] sm:w-[82px] sm:flex-col sm:items-start")}>
        <span className="font-mono text-[10px] text-ink-soft">No.</span>
        <span className="text-[22px] font-extrabold tracking-[-0.03em]">{r.paper_no}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {r.discipline_name && (
            <Pill tone="bg" size="xs">
              {r.discipline_name}
            </Pill>
          )}
          <MonoLabel>{meta}</MonoLabel>
          {r.withdrawn && (
            <Pill tone="pink" size="xs">
              Withdrawn
            </Pill>
          )}
        </div>
        <h3 className="text-[18px] font-bold leading-[1.3] tracking-[-0.015em] sm:text-[19px]">
          <Link href={`/articles/${r.slug}`} className="after:absolute after:inset-0 after:rounded-[26px] focus-visible:outline-none group-focus-within:underline">
            {r.title}
          </Link>
        </h3>
        {r.authors && <p className="text-xs text-muted">{r.authors}</p>}
        <p className="line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{r.abstract}</p>
        <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">
          <QuickLook
            data={{
              slug: r.slug,
              title: r.title,
              abstract: r.abstract,
              authors: r.authors,
              keywords: r.keywords,
              discipline: r.discipline_name,
              meta,
              type: articleTypeLabel(r.article_type),
              doi: r.doi,
              withdrawn: r.withdrawn,
            }}
          />
          <span className="font-mono text-[11px] text-muted">{articleTypeLabel(r.article_type)}</span>
          {includes.length > 0 && <span className="font-mono text-[11px] text-muted">· {includes.join(" · ")}</span>}
          {r.like_count > 0 && (
            <span className="font-mono text-[11px] text-muted" aria-label={`${r.like_count} likes`}>
              · ♥ {r.like_count}
            </span>
          )}
        </div>
      </div>
      <span aria-hidden="true" className={cn("nudge-arrow hidden size-11 shrink-0 items-center justify-center rounded-full bg-lime", !grid && "sm:inline-flex")}>
        <Icon name="arrowUpRight" />
      </span>
    </article>
  );
}

function Pagination({ query, pages }: { query: ArchiveQuery; pages: number }) {
  const item = "inline-flex size-11 items-center justify-center rounded-full text-sm font-bold";
  return (
    <nav aria-label="Pagination" className="mt-6 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1.5">
        {query.page > 1 && (
          <li>
            <Link href={archiveHref(query, { page: query.page - 1 })} className={cn(item, "bg-surface hover:bg-line")} aria-label="Previous page">
              <Icon name="arrowRight" className="rotate-180" />
            </Link>
          </li>
        )}
        {pageList(query.page, pages).map((p, i) =>
          p === "…" ? (
            <li key={`gap${i}`} className="px-1 text-muted" aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <Link href={archiveHref(query, { page: p })} aria-current={p === query.page ? "page" : undefined} className={cn(item, p === query.page ? "bg-ink text-white" : "bg-surface hover:bg-line")} aria-label={`Page ${p}`}>
                {p}
              </Link>
            </li>
          ),
        )}
        {query.page < pages && (
          <li>
            <Link href={archiveHref(query, { page: query.page + 1 })} className={cn(item, "bg-lime")} aria-label="Next page">
              <Icon name="arrowRight" />
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

function EmptyState({ query, total, issueMissing }: { query: ArchiveQuery; total: number; issueMissing: boolean }) {
  const pastEnd = total > 0;
  return (
    <div className="mt-4 rounded-[26px] bg-surface p-[clamp(24px,4vw,40px)] text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-aqua">
        <Icon name="search" size={18} />
      </span>
      <h3 className="mt-4 text-lg font-extrabold">
        {pastEnd ? "That page is past the last result." : issueMissing ? "That issue isn’t published." : isFiltered(query) ? "No papers match these filters." : "No papers published yet."}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
        {pastEnd
          ? `There are ${total} results in total.`
          : isFiltered(query)
            ? "Try fewer words, check the spelling, or remove a filter. DOIs must be exact (e.g. 10.xxxxx/abc)."
            : "Accepted papers appear here as soon as they’re published. Have research to share?"}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {pastEnd ? (
          <Link href={archiveHref(query, { page: 1 })} className="inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-bold text-white">
            Go to page 1
          </Link>
        ) : isFiltered(query) ? (
          <Link href="/archive" className="inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-bold text-white">
            Clear all filters
          </Link>
        ) : (
          <Link href="/submit" className="inline-flex h-12 items-center rounded-full bg-ink px-5 text-sm font-bold text-white">
            Submit an article
          </Link>
        )}
      </div>
    </div>
  );
}
