import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthTrigger } from "@/components/auth/AuthModal";
import { OrcidBadge } from "@/components/auth/OrcidBadge";
import { LikeButton, PdfButton, ShareButton } from "@/components/article/ArticleActions";
import { CitePanel } from "@/components/article/CitePanel";
import { Media } from "@/components/article/Media";
import { Toc } from "@/components/article/Toc";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { journal } from "@/config/journal";
import { getFullText, getArticle, hasLiked, type PublicArticle } from "@/lib/articles/queries";
import { getUser } from "@/lib/auth/session";
import { apa, bibtex, mla, type CitationData } from "@/lib/citations";
import { isVerifiedCrawler } from "@/lib/crawler/verify";
import { siteUrl } from "@/lib/env";
import { articleTypeLabel } from "@/lib/submissions/labels";
import { cn } from "@/lib/cn";

type Props = { params: Promise<{ slug: string }> };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");
const scholarDate = (d: string) => new Date(d).toISOString().slice(0, 10).replace(/-/g, "/");
const tones = ["bg-seafoam", "bg-lime", "bg-pink", "bg-aqua", "bg-stone"];
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

function citationData(a: PublicArticle): CitationData {
  return {
    title: a.title,
    authors: a.authors.map((x) => ({ fullName: x.full_name })),
    journal: journal.name,
    published: new Date(a.published_at),
    volume: a.issue?.volume ?? null,
    issue: a.issue?.number ?? null,
    firstPage: a.first_page,
    lastPage: a.last_page,
    doi: a.doi,
    url: `${siteUrl()}/articles/${a.slug}`,
    paperNo: a.paper_no,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return { title: "Article not found", robots: { index: false } };
  const url = `${siteUrl()}/articles/${a.slug}`;
  // Google Scholar inclusion guidelines: one citation_author per author, in order.
  const other: Record<string, string | string[]> = {
    citation_title: a.title,
    citation_author: a.authors.map((x) => x.full_name),
    citation_publication_date: scholarDate(a.published_at),
    citation_online_date: scholarDate(a.published_at),
    citation_journal_title: journal.fullTitle,
    citation_journal_abbrev: journal.name,
    citation_publisher: journal.publisher,
    citation_abstract_html_url: url,
    citation_fulltext_html_url: url,
    citation_pdf_url: `${url}/pdf`,
    citation_language: "en",
    citation_keywords: a.keywords.join("; "),
  };
  if (!journal.issn.startsWith("[")) other.citation_issn = journal.issn;
  if (a.issue) {
    other.citation_volume = String(a.issue.volume);
    other.citation_issue = String(a.issue.number);
  }
  if (a.first_page) other.citation_firstpage = String(a.first_page);
  if (a.last_page) other.citation_lastpage = String(a.last_page);
  if (a.doi) other.citation_doi = a.doi;
  const institutions = a.authors.map((x) => x.affiliation).filter((x): x is string => !!x);
  if (institutions.length) other.citation_author_institution = institutions;
  const orcids = a.authors.map((x) => x.orcid).filter((x): x is string => !!x);
  if (orcids.length) other.citation_author_orcid = orcids.map((o) => `https://orcid.org/${o}`);

  const description = a.abstract.length > 300 ? `${a.abstract.slice(0, 297)}…` : a.abstract;
  return {
    title: a.title,
    description,
    alternates: { canonical: url },
    robots: a.withdrawn_at ? { index: true, follow: true } : undefined,
    openGraph: { type: "article", title: a.title, description, url, publishedTime: a.published_at, authors: a.authors.map((x) => x.full_name), siteName: journal.name },
    twitter: { card: "summary", title: a.title, description },
    other,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();
  const user = await getUser();
  const crawler = !user && (await isVerifiedCrawler(await headers()));
  const [text, liked] = await Promise.all([user ? getFullText(a.version_id, "member") : crawler ? getFullText(a.version_id, "crawler") : Promise.resolve(null), hasLiked(a.id, user?.id)]);

  const cite = citationData(a);
  const formats = { apa: apa(cite), mla: mla(cite), bibtex: bibtex(cite) };
  const url = `${siteUrl()}/articles/${a.slug}`;
  const toc = [{ id: "abstract", text: "Abstract", level: 2 }, ...(text?.toc ?? []), ...(text?.references ? [{ id: "references", text: "References", level: 2 }] : [])];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    headline: a.title,
    name: a.title,
    abstract: a.abstract,
    url,
    datePublished: a.published_at,
    ...(a.doi ? { sameAs: `https://doi.org/${a.doi}`, identifier: { "@type": "PropertyValue", propertyID: "DOI", value: a.doi } } : {}),
    author: a.authors.map((x) => ({
      "@type": "Person",
      name: x.full_name,
      ...(x.affiliation ? { affiliation: { "@type": "Organization", name: x.affiliation } } : {}),
      ...(x.orcid ? { sameAs: `https://orcid.org/${x.orcid}` } : {}),
    })),
    keywords: a.keywords.join(", "),
    license: a.licence,
    isPartOf: {
      "@type": "PublicationIssue",
      ...(a.issue ? { issueNumber: String(a.issue.number), isPartOf: { "@type": "PublicationVolume", volumeNumber: String(a.issue.volume), isPartOf: { "@type": "Periodical", name: journal.fullTitle } } } : { isPartOf: { "@type": "Periodical", name: journal.fullTitle } }),
    },
    publisher: { "@type": "Organization", name: journal.publisher },
    // Paywalled content markup: full text is for members (verified crawlers may index it).
    isAccessibleForFree: false,
    hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".paywalled-body" },
  };

  return (
    <article className="container-page pt-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="text-xs text-muted">
        <ol className="flex flex-wrap gap-1.5">
          <li>
            <Link href="/archive" className="hover:text-teal-deep">Archive</Link> /
          </li>
          {a.issue && (
            <li>
              <Link href={`/archive?volume=${a.issue.volume}&issue=${a.issue.number}`} className="hover:text-teal-deep">
                Vol. {a.issue.volume} · Issue {a.issue.number}
              </Link>{" "}
              /
            </li>
          )}
          {a.discipline && (
            <li>
              <Link href={`/archive?discipline=${a.discipline.slug}`} className="hover:text-teal-deep">{a.discipline.name}</Link>
            </li>
          )}
        </ol>
      </nav>

      {a.withdrawn_at && (
        <div role="alert" className="mt-4 rounded-[24px] bg-pink p-5">
          <p className="font-extrabold">This article was withdrawn on {fmt(a.withdrawn_at)}.</p>
          {a.withdrawal_note && <p className="mt-1 text-sm leading-relaxed">{a.withdrawal_note}</p>}
        </div>
      )}

      {/* Header card */}
      <header className="relative mt-4 overflow-hidden rounded-[32px] bg-surface p-[clamp(22px,3.6vw,44px)]">
        <div className="flex flex-wrap items-start gap-8">
          <div className="min-w-0 flex-[1_1_480px]">
            <div className="flex flex-wrap gap-2">
              {a.discipline && <Pill tone="seafoam">{a.discipline.name}</Pill>}
              <Pill tone="bg">{articleTypeLabel(a.article_type)}</Pill>
              <Pill tone="lime">Peer-reviewed</Pill>
              {a.history.length > 1 && <Pill tone="aqua">Corrected</Pill>}
            </div>
            <h1 className="mt-5 text-[clamp(30px,4.4vw,52px)] font-extrabold leading-[1.04] tracking-[-0.04em]">{a.title}</h1>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3" aria-label="Authors">
              {a.authors.map((au, i) => (
                <li key={au.position} className="flex items-center gap-2.5">
                  <span aria-hidden="true" className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold", tones[i % tones.length])}>
                    {initials(au.full_name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">
                      {au.full_name}
                      {au.is_corresponding && <span className="sr-only"> (corresponding author)</span>}
                    </span>
                    {au.affiliation && <span className="block text-xs text-muted">{au.affiliation}</span>}
                    {au.orcid && <OrcidBadge orcid={au.orcid} className="mt-0.5" />}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <dl className="grid w-full max-w-[320px] flex-[0_1_320px] grid-cols-[auto_1fr] gap-x-4 gap-y-2 self-start rounded-[22px] bg-bg p-5 text-[13px]">
            {[
              ["DOI", a.doi ? <a key="d" href={`https://doi.org/${a.doi}`} className="break-all font-mono text-teal-deep underline underline-offset-2">{a.doi}</a> : <span key="d" className="font-mono">{journal.doiPrefix}/[pending]</span>],
              ["Paper No.", <span key="p" className="font-mono">{a.paper_no}</span>],
              ["Received", fmt(a.received_at)],
              ["Accepted", fmt(a.accepted_at)],
              ["Published", fmt(a.published_at)],
              ["Issue", a.issue ? `Vol. ${a.issue.volume} · Issue ${a.issue.number}` : "Online first"],
              ["Licence", a.licence],
            ].map(([k, v]) => (
              <div key={k as string} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Abstract (public) */}
          <section aria-labelledby="abstract" className="rounded-[32px] bg-surface p-[clamp(22px,3.4vw,40px)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="abstract" className="scroll-mt-6 text-xl font-extrabold tracking-[-0.02em]">Abstract</h2>
              <Pill tone="aqua" className="text-teal-deep">✓ Open to everyone</Pill>
            </div>
            <p className="mt-4 whitespace-pre-line font-serif text-[17px] leading-[1.75] text-ink-soft">{a.abstract}</p>
            {a.keywords.length > 0 && (
              <p className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">Keywords</span>
                {a.keywords.map((k) => (
                  <Link key={k} href={`/archive?q=${encodeURIComponent(k)}`} className="rounded-full bg-bg px-3 py-1.5 font-semibold hover:bg-line">
                    {k}
                  </Link>
                ))}
              </p>
            )}
          </section>

          {/* Full text */}
          <section aria-label="Full text" className="relative overflow-hidden rounded-[32px] bg-surface p-[clamp(22px,3.4vw,40px)]">
            {text ? (
              <>
                {text.html ? (
                  <div className="article-body paywalled-body" dangerouslySetInnerHTML={{ __html: text.html }} />
                ) : (
                  <p className="paywalled-body text-sm text-muted">The full text is being typeset. Download the PDF for the complete article.</p>
                )}
                {text.references && (
                  <section aria-labelledby="references" className="paywalled-body mt-10 border-t border-line pt-8">
                    <h2 id="references" className="scroll-mt-6 text-xl font-extrabold tracking-[-0.02em]">References</h2>
                    <ol className="mt-4 flex list-decimal flex-col gap-2 pl-5 font-serif text-[15px] leading-relaxed text-ink-soft">
                      {text.references.split(/\n+/).map((r) => r.trim()).filter(Boolean).map((r, i) => (
                        <li key={i}>{r.replace(/^\[?\d+[\].]\s*/, "")}</li>
                      ))}
                    </ol>
                  </section>
                )}
                {user && <Media media={text.media} />}
              </>
            ) : (
              <GatedPreview slug={a.slug} />
            )}
          </section>

          {a.history.length > 1 && (
            <section aria-labelledby="history" className="rounded-[28px] bg-surface p-6">
              <h2 id="history" className="text-lg font-extrabold">Version history</h2>
              <ol className="mt-3 flex flex-col gap-2 text-sm">
                {[...a.history].reverse().map((h) => (
                  <li key={h.version} className="flex flex-wrap gap-x-3 rounded-[16px] bg-bg px-4 py-3">
                    <span className="font-mono text-xs">v{h.version}</span>
                    <span className="font-semibold">{fmt(h.published_at)}</span>
                    <span className="text-muted">{h.version === a.version ? "Current version" : h.reason ?? "Original publication"}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-5">
          <div className="flex flex-col gap-2.5 rounded-[28px] bg-surface p-4">
            <LikeButton articleId={a.id} slug={a.slug} initialLiked={liked} initialCount={a.like_count} signedIn={!!user} />
            <CitePanel formats={formats} />
            <ShareButton slug={a.slug} title={a.title} />
            <PdfButton slug={a.slug} signedIn={!!user} />
          </div>
          {toc.length > 1 && <Toc items={toc} />}
          <div className="rounded-[28px] bg-seafoam p-5 text-[13px] leading-relaxed text-[#2A3B37]">
            <p className="font-extrabold text-ink">Are you an author of this paper?</p>
            <p className="mt-1">Published papers can’t be edited directly. Send a correction or withdrawal request to the editorial team.</p>
            <a href={`mailto:${journal.editorialEmail}?subject=${encodeURIComponent(`Change request: ${a.title} (paper ${a.paper_no})`)}`} className="mt-2 inline-block font-bold text-teal-deep underline underline-offset-2">
              Request a change
            </a>
          </div>
        </aside>
      </div>
    </article>
  );
}

/** Blurred placeholder text + sign-in card (design: "Read the full paper"). No real text is sent. */
function GatedPreview({ slug }: { slug: string }) {
  return (
    <div className="relative min-h-[420px]">
      <div aria-hidden="true" className="pointer-events-none select-none blur-[6px]">
        <div className="h-5 w-48 rounded bg-line" />
        <div className="mt-5 space-y-3">
          {[100, 96, 92, 98, 70].map((w, i) => (
            <div key={i} className="h-3 rounded bg-line" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="mt-8 h-40 rounded-[22px] bg-aqua" />
        <div className="mt-8 space-y-3">
          {[94, 99, 88, 60].map((w, i) => (
            <div key={i} className="h-3 rounded bg-line" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-2">
        <div className="w-full max-w-[400px] rounded-[28px] bg-surface p-7 text-center shadow-pop">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-lime">
            <Icon name="lock" size={18} />
          </span>
          <h2 className="mt-4 text-xl font-extrabold tracking-[-0.02em]">Read the full paper</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">Sign in or create a free account to read the full text, view figures, graphs and video, and download the PDF.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <AuthTrigger mode="signin" next={`/articles/${slug}`} className="nudge-arrow inline-flex h-12 items-center gap-3 rounded-full bg-ink pl-5 pr-1.5 text-sm font-bold text-white">
              Sign in
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-lime text-ink">
                <Icon name="arrowRight" strokeWidth={2.2} />
              </span>
            </AuthTrigger>
            <AuthTrigger mode="register" next={`/articles/${slug}`} className="inline-flex h-12 items-center rounded-full bg-line px-5 text-sm font-bold hover:bg-[#d9dfd9]">
              Create free account
            </AuthTrigger>
          </div>
        </div>
      </div>
    </div>
  );
}
