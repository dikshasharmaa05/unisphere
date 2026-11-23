import sanitizeHtml from "sanitize-html";

export type TocEntry = { id: string; text: string; level: 2 | 3 };

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "section";

/**
 * Cleans article HTML (editor input / DOCX import): whitelisted tags only, no scripts,
 * styles or embedded images; h1 → h2; links open safely. Headings get stable ids
 * and are returned as a table of contents.
 */
export function sanitizeArticleHtml(input: string): { html: string; toc: TocEntry[] } {
  const clean = sanitizeHtml(input ?? "", {
    allowedTags: ["p", "h2", "h3", "h4", "ul", "ol", "li", "em", "strong", "i", "b", "sup", "sub", "a", "blockquote", "table", "thead", "tbody", "tr", "th", "td", "caption", "figure", "figcaption", "code", "pre", "br", "hr"],
    allowedAttributes: { a: ["href", "title", "rel", "target"], th: ["colspan", "rowspan", "scope"], td: ["colspan", "rowspan"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      h1: "h2",
      h5: "h4",
      h6: "h4",
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "nofollow noopener noreferrer", target: "_blank" } }),
    },
    allowedAttributesByTag: undefined,
    exclusiveFilter: (frame) => (frame.tag === "p" || frame.tag === "li") && !frame.text.trim() && !frame.mediaChildren?.length,
  } as sanitizeHtml.IOptions);

  // Add ids to h2/h3 and collect a table of contents.
  const toc: TocEntry[] = [];
  const used = new Map<string, number>();
  const html = clean.replace(/<(h2|h3)>([\s\S]*?)<\/\1>/g, (_m, tag: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
    let id = slug(text);
    const n = used.get(id) ?? 0;
    used.set(id, n + 1);
    if (n) id = `${id}-${n + 1}`;
    toc.push({ id, text, level: tag === "h2" ? 2 : 3 });
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
  return { html, toc };
}

/** Plain-text paragraphs from sanitized HTML (for the PDF fallback). */
export function htmlToBlocks(html: string): { type: "h2" | "h3" | "p" | "li"; text: string }[] {
  const blocks: { type: "h2" | "h3" | "p" | "li"; text: string }[] = [];
  const re = /<(h2|h3|h4|p|li|blockquote|pre|td|th)[^>]*>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1]!;
    const text = decode(m[2]!.replace(/<br\s*\/?>/g, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (!text) continue;
    blocks.push({ type: tag === "h2" ? "h2" : tag === "h3" || tag === "h4" ? "h3" : tag === "li" ? "li" : "p", text });
  }
  return blocks;
}

const decode = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
