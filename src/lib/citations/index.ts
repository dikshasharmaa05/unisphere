/**
 * Citation strings generated from article data: APA 7, MLA 9, BibTeX.
 * Pure functions (unit-tested in citations.test.ts).
 */

export type CitationAuthor = { fullName: string };
export type CitationData = {
  title: string;
  authors: CitationAuthor[];
  journal: string;
  published: Date | null;
  volume?: string | number | null;
  issue?: string | number | null;
  firstPage?: number | null;
  lastPage?: number | null;
  doi?: string | null;
  url: string;
  paperNo?: number | null;
};

/** "Riya K. Iyer" → { given: "Riya K.", family: "Iyer" }. Single names stay as family. */
export function splitName(full: string): { given: string; family: string } {
  const parts = full.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length === 1) return { given: "", family: parts[0] ?? "" };
  // Keep common surname particles with the family name ("van der Berg", "de Souza").
  const particles = new Set(["van", "von", "der", "den", "de", "da", "del", "di", "la", "le", "du", "dos", "bin", "al"]);
  let i = parts.length - 1;
  while (i > 1 && particles.has(parts[i - 1]!.toLowerCase())) i--;
  return { given: parts.slice(0, i).join(" "), family: parts.slice(i).join(" ") };
}

const initials = (given: string) =>
  given
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((g) => `${g[0]!.toUpperCase()}.`)
    .join(" ");

const pages = (d: CitationData, sep = "–") => (d.firstPage ? (d.lastPage && d.lastPage !== d.firstPage ? `${d.firstPage}${sep}${d.lastPage}` : `${d.firstPage}`) : "");
const link = (d: CitationData) => (d.doi ? `https://doi.org/${d.doi}` : d.url);
const sentence = (s: string) => (/[.?!]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/** APA 7: Iyer, R., Okafor, M., & Brandt, L. (2026). Title. Journal, 1(3), 1–12. https://doi.org/… */
export function apa(d: CitationData): { text: string; html: string } {
  const names = d.authors.map((a) => {
    const { given, family } = splitName(a.fullName);
    return given ? `${family}, ${initials(given)}` : family;
  });
  let authors: string;
  if (names.length === 0) authors = "";
  else if (names.length === 1) authors = names[0]!;
  else if (names.length <= 20) authors = `${names.slice(0, -1).join(", ")}, & ${names[names.length - 1]}`;
  else authors = `${names.slice(0, 19).join(", ")}, … ${names[names.length - 1]}`;
  const year = d.published ? `(${d.published.getUTCFullYear()})` : "(n.d.)";
  const vol = d.volume ? `${d.volume}` : "";
  const iss = d.issue ? `(${d.issue})` : "";
  const pp = pages(d);
  const tail = [vol || iss ? `${vol}${iss}` : "", pp].filter(Boolean).join(", ");
  const head = authors ? `${sentence(authors)} ${year}.` : `${year}.`;
  const text = `${head} ${sentence(d.title)} ${d.journal}${tail ? `, ${tail}` : ""}. ${link(d)}`;
  const html = `${esc(head)} ${esc(sentence(d.title))} <i>${esc(d.journal)}</i>${vol ? `, <i>${esc(vol)}</i>${esc(iss)}` : iss ? `, ${esc(iss)}` : ""}${pp ? `, ${esc(pp)}` : ""}. ${esc(link(d))}`;
  return { text, html };
}

/** MLA 9: Iyer, Riya, et al. "Title." Journal, vol. 1, no. 3, 2026, pp. 1–12. https://doi.org/… */
export function mla(d: CitationData): { text: string; html: string } {
  const n = d.authors.map((a) => splitName(a.fullName));
  const inverted = (x: { given: string; family: string }) => (x.given ? `${x.family}, ${x.given}` : x.family);
  const natural = (x: { given: string; family: string }) => [x.given, x.family].filter(Boolean).join(" ");
  let authors = "";
  if (n.length === 1) authors = inverted(n[0]!);
  else if (n.length === 2) authors = `${inverted(n[0]!)}, and ${natural(n[1]!)}`;
  else if (n.length > 2) authors = `${inverted(n[0]!)}, et al`;
  const parts = [
    d.volume ? `vol. ${d.volume}` : "",
    d.issue ? `no. ${d.issue}` : "",
    d.published ? `${d.published.getUTCFullYear()}` : "",
    pages(d) ? `pp. ${pages(d)}` : "",
  ].filter(Boolean);
  const title = `“${d.title.trim().replace(/\.$/, "")}.”`;
  const lead = authors ? `${sentence(authors)} ` : "";
  const text = `${lead}${title} ${d.journal}${parts.length ? `, ${parts.join(", ")}` : ""}. ${link(d)}.`;
  const html = `${esc(lead)}${esc(title)} <i>${esc(d.journal)}</i>${parts.length ? `, ${esc(parts.join(", "))}` : ""}. ${esc(link(d))}.`;
  return { text, html };
}

/** BibTeX @article entry. Special characters are escaped; the key is family+year+first title word. */
export function bibtex(d: CitationData): string {
  const first = d.authors[0] ? splitName(d.authors[0].fullName).family : "anon";
  const year = d.published ? String(d.published.getUTCFullYear()) : "nd";
  const word = d.title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{3,}/)?.[0] ?? "article";
  const key = `${first.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "")}${year}${word}`;
  const field = (k: string, v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? null : `  ${k.padEnd(7)} = {${tex(String(v))}}`);
  const lines = [
    field("title", d.title),
    field("author", d.authors.map((a) => { const s = splitName(a.fullName); return s.given ? `${s.family}, ${s.given}` : s.family; }).join(" and ")),
    field("journal", d.journal),
    field("year", d.published ? d.published.getUTCFullYear() : null),
    field("volume", d.volume ?? null),
    field("number", d.issue ?? null),
    field("pages", pages(d, "--") || null),
    field("doi", d.doi ?? null),
    field("url", link(d)),
  ].filter(Boolean);
  return `@article{${key},\n${lines.join(",\n")}\n}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// URLs/DOIs keep their characters; text fields escape LaTeX specials.
const tex = (s: string) => (/^https?:\/\//.test(s) || /^10\.\d/.test(s) ? s : s.replace(/([&%$#_{}])/g, "\\$1").replace(/~/g, "\\textasciitilde{}").replace(/\^/g, "\\textasciicircum{}"));
