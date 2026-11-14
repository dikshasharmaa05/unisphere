/**
 * Single source of truth for journal identity.
 * Values in [square brackets] are deliberate placeholders — replace them with
 * the real, registered values before launch. Never invent real-looking numbers.
 */
export const journal = {
  name: "Unisphere",
  fullTitle: "International Journal of Multidisciplinary Research",
  tagline: "Research that unites the world.",
  description:
    "An open, international journal where researchers from every field share discoveries, read each other’s work and build on it together.",
  issn: "[XXXX-XXXX]",
  doiPrefix: "10.[XXXXX]",
  publisher: "[Publisher name]",
  frequency: "[Quarterly]",
  licence: "[CC BY 4.0]",
  licenceUrl: "[licence URL]",
  editorialEmail: "[editor@journal.org]",
  copyrightYear: "[Year]",
  current: { volume: "[01]", issue: "[01]", label: "[Month Year]" },
  callForPapers: { deadline: "[deadline]" },
  maxManuscriptMb: 20,
} as const;

export type JournalConfig = typeof journal;
