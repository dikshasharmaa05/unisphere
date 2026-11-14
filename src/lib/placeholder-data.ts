/**
 * Static placeholder content for Phase 1 (landing page).
 * Replaced by Supabase queries in later phases. Paper numbers, dates and counts
 * are bracketed placeholders on purpose.
 */
import type { Tone } from "@/components/ui/Card";

export type Discipline = { slug: string; name: string; tone: Tone };

export const disciplines: Discipline[] = [
  { slug: "life-sciences", name: "Life Sciences", tone: "seafoam" },
  { slug: "ai-computing", name: "AI & Computing", tone: "lime" },
  { slug: "climate-earth", name: "Climate & Earth", tone: "aqua" },
  { slug: "medicine-health", name: "Medicine & Health", tone: "pink" },
  { slug: "engineering", name: "Engineering", tone: "stone" },
  { slug: "social-sciences", name: "Social Sciences", tone: "aqua" },
  { slug: "economics-business", name: "Economics & Business", tone: "stone" },
  { slug: "humanities-education", name: "Humanities & Education", tone: "lime" },
];

export type PaperPreview = {
  slug: string;
  field: string;
  tone: Tone;
  meta: string;
  title: string;
  authors: string;
  abstract: string;
};

export const latestPapers: PaperPreview[] = [
  {
    slug: "sleep-dependent-memory-consolidation",
    field: "Neuroscience",
    tone: "seafoam",
    meta: "Vol. 1 · No. 3",
    title: "Sleep-dependent memory consolidation in adolescent learners",
    authors: "R. Iyer, M. Okafor, L. Brandt",
    abstract:
      "A longitudinal study of secondary-school students linking sleep architecture to retention across a full academic term.",
  },
  {
    slug: "low-resource-language-models-agriculture",
    field: "AI & Computing",
    tone: "lime",
    meta: "Vol. 1 · No. 2",
    title: "Low-resource language models for agricultural advisory",
    authors: "S. Nair, J. Kowalski",
    abstract: "We fine-tune compact models on regional farming dialogues and evaluate advice quality against agronomists.",
  },
  {
    slug: "community-screening-rural-clinics",
    field: "Public Health",
    tone: "pink",
    meta: "Vol. 1 · No. 1",
    title: "Community screening and early detection in rural clinics",
    authors: "A. Mehta, T. Haddad, P. Silva",
    abstract: "A mixed-methods evaluation of a volunteer-led screening programme across rural districts.",
  },
];

export const featuredPaper = {
  slug: "microplastic-transport-monsoon-rivers",
  paperNo: "[000]",
  title: "Microplastic transport in monsoon-fed river systems",
  field: "Environmental Science",
};

export type IssuePreview = { href: string; short: string; label: string; sub: string; cover: Tone };

export const issues: IssuePreview[] = [
  { href: "/archive?volume=1&issue=3", short: "V1·I3", label: "Volume 1 · Issue 3", sub: "[Month Year] · Current issue", cover: "seafoam" },
  { href: "/archive?volume=1&issue=2", short: "V1·I2", label: "Volume 1 · Issue 2", sub: "[Month Year]", cover: "lime" },
  { href: "/archive?volume=1&issue=1", short: "V1·I1", label: "Volume 1 · Issue 1", sub: "[Month Year] · Inaugural issue", cover: "aqua" },
];

export const guidelineSteps = [
  { n: 1, title: "Prepare", body: "Format your manuscript with the journal template: abstract, keywords, figures and references." },
  { n: 2, title: "Submit", body: "Create an account and upload text, images, graphs and video in one guided form." },
  { n: 3, title: "Review", body: "Editors check scope and quality, then reviewers assess the work. Track status any time." },
  { n: 4, title: "Publish", body: "Accepted papers get a DOI and appear in the next issue — abstract open to all." },
];

/** Indexing services — every status stays a placeholder until confirmed. */
export const indexes = ["Google Scholar", "Crossref (DOI)", "DOAJ", "ROAD", "Index Copernicus", "[Add index]"];

export const heroHotspots = [
  { slug: "life-sciences", label: "Life Sciences", pos: "left-[14%] top-[22%]", labelFirst: false },
  { slug: "ai-computing", label: "AI & Computing", pos: "right-[6%] top-[34%]", labelFirst: true },
  { slug: "climate-earth", label: "Climate & Earth", pos: "left-[22%] bottom-[20%]", labelFirst: false },
  { slug: "social-sciences", label: "Social Sciences", pos: "right-[16%] bottom-[12%]", labelFirst: true },
] as const;
