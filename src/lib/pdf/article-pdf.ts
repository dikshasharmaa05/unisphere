import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { journal } from "@/config/journal";
import { htmlToBlocks } from "@/lib/content/sanitize";

/**
 * Fallback article PDF (used when editors haven't uploaded a typeset PDF).
 * A4, DejaVu fonts (wide Unicode coverage), running header with journal / volume /
 * issue / DOI and footer with licence + page numbers.
 */
export type PdfArticle = {
  title: string;
  authors: { full_name: string; affiliation: string | null; orcid: string | null }[];
  abstract: string;
  keywords: string[];
  bodyHtml: string;
  references: string | null;
  doi: string | null;
  url: string;
  volume: number | null;
  issue: number | null;
  paperNo: number;
  licence: string;
  received: string | null;
  accepted: string | null;
  published: string;
  firstPage: number | null;
};

const A4 = { w: 595.28, h: 841.89 };
const M = { x: 62, top: 70, bottom: 64 };
const INK = rgb(0.078, 0.102, 0.098);
const MUTED = rgb(0.337, 0.376, 0.365);
const TEAL = rgb(0.055, 0.431, 0.384);
const LIME = rgb(0.914, 0.961, 0.722);

let fontCache: { serif: Uint8Array; bold: Uint8Array; italic: Uint8Array; sans: Uint8Array } | null = null;
async function loadFonts() {
  if (fontCache) return fontCache;
  const dir = path.join(process.cwd(), "src/lib/pdf/fonts");
  const [serif, bold, italic, sans] = await Promise.all(
    ["DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf", "DejaVuSerif-Italic.ttf", "DejaVuSans.ttf"].map((f) => readFile(path.join(dir, f))),
  );
  fontCache = { serif: serif!, bold: bold!, italic: italic!, sans: sans! };
  return fontCache;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "—");

/** Greedy word wrap using real glyph widths; also breaks over-long tokens (URLs). */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const raw of para.split(/\s+/).filter(Boolean)) {
      let word = raw;
      while (font.widthOfTextAtSize(word, size) > width) {
        let cut = word.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(word.slice(0, cut), size) > width) cut--;
        if (line) {
          lines.push(line);
          line = "";
        }
        lines.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}

export async function renderArticlePdf(a: PdfArticle): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const f = await loadFonts();
  const serif = await doc.embedFont(f.serif, { subset: true });
  const bold = await doc.embedFont(f.bold, { subset: true });
  const italic = await doc.embedFont(f.italic, { subset: true });
  const sans = await doc.embedFont(f.sans, { subset: true });

  doc.setTitle(a.title);
  doc.setAuthor(a.authors.map((x) => x.full_name).join(", "));
  doc.setSubject(`${journal.name}${a.volume ? `, Vol. ${a.volume}` : ""}${a.issue ? `, Issue ${a.issue}` : ""}`);
  doc.setKeywords(a.keywords);
  doc.setCreator(journal.name);
  doc.setProducer(journal.name);

  const width = A4.w - M.x * 2;
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;
  const newPage = () => {
    page = doc.addPage([A4.w, A4.h]);
    pages.push(page);
    y = A4.h - M.top;
  };
  const ensure = (h: number) => {
    if (y - h < M.bottom) newPage();
  };
  const text = (s: string, font: PDFFont, size: number, opts: { color?: ReturnType<typeof rgb>; gap?: number; indent?: number; lead?: number } = {}) => {
    const lead = opts.lead ?? size * 1.45;
    for (const line of wrap(s, font, size, width - (opts.indent ?? 0))) {
      ensure(lead);
      page.drawText(line, { x: M.x + (opts.indent ?? 0), y: y - size, size, font, color: opts.color ?? INK });
      y -= lead;
    }
    y -= opts.gap ?? 0;
  };

  newPage();
  // Title block
  page.drawRectangle({ x: M.x, y: y - 22, width: 120, height: 22, color: LIME });
  page.drawText(`${journal.name} · Paper No. ${a.paperNo}`, { x: M.x + 8, y: y - 15, size: 8.5, font: sans, color: INK });
  y -= 40;
  text(a.title, bold, 19, { lead: 24, gap: 8 });
  text(a.authors.map((x) => x.full_name).join(", "), serif, 11, { gap: 2 });
  a.authors.forEach((x, i) => {
    const extra = [x.affiliation, x.orcid ? `ORCID ${x.orcid}` : null].filter(Boolean).join(" · ");
    if (extra) text(`${i + 1}. ${x.full_name} — ${extra}`, serif, 8.5, { color: MUTED });
  });
  y -= 6;
  text(`Received ${fmt(a.received)} · Accepted ${fmt(a.accepted)} · Published ${fmt(a.published)}`, sans, 8.5, { color: MUTED, gap: 4 });
  text(a.doi ? `https://doi.org/${a.doi}` : a.url, sans, 8.5, { color: TEAL, gap: 14 });

  // Abstract box
  const absLines = wrap(a.abstract, serif, 10, width - 28);
  const boxH = 30 + absLines.length * 14.5 + (a.keywords.length ? 18 : 0);
  ensure(Math.min(boxH, A4.h - M.top - M.bottom));
  page.drawRectangle({ x: M.x, y: y - boxH, width, height: boxH, color: rgb(0.953, 0.961, 0.949) });
  page.drawText("Abstract", { x: M.x + 14, y: y - 22, size: 10.5, font: bold, color: INK });
  let yy = y - 40;
  for (const l of absLines) {
    page.drawText(l, { x: M.x + 14, y: yy, size: 10, font: serif, color: INK });
    yy -= 14.5;
  }
  if (a.keywords.length) page.drawText(`Keywords: ${a.keywords.join(", ")}`, { x: M.x + 14, y: yy - 4, size: 8.5, font: italic, color: MUTED });
  y -= boxH + 22;

  // Body
  const blocks = htmlToBlocks(a.bodyHtml);
  if (!blocks.length) text("The full text of this article is available on the journal website.", italic, 10.5, { color: MUTED });
  for (const b of blocks) {
    if (b.type === "h2") {
      ensure(40);
      y -= 6;
      text(b.text, bold, 13, { gap: 4 });
    } else if (b.type === "h3") {
      ensure(30);
      text(b.text, bold, 11, { gap: 2 });
    } else if (b.type === "li") {
      text(`•  ${b.text}`, serif, 10.5, { indent: 12, gap: 2 });
    } else {
      text(b.text, serif, 10.5, { gap: 7 });
    }
  }
  if (a.references?.trim()) {
    ensure(40);
    y -= 8;
    text("References", bold, 13, { gap: 4 });
    for (const r of a.references.split(/\n+/).map((s) => s.trim()).filter(Boolean)) text(r, serif, 9, { gap: 3 });
  }

  // Running header + footer with page numbers.
  const header = [journal.name, a.volume ? `Vol. ${a.volume}` : null, a.issue ? `Issue ${a.issue}` : null, a.doi ? `DOI ${a.doi}` : null].filter(Boolean).join(" · ");
  pages.forEach((p, i) => {
    p.drawText(header, { x: M.x, y: A4.h - 38, size: 7.5, font: sans, color: MUTED });
    p.drawLine({ start: { x: M.x, y: A4.h - 46 }, end: { x: A4.w - M.x, y: A4.h - 46 }, thickness: 0.5, color: rgb(0.89, 0.906, 0.89) });
    const pageLabel = a.firstPage ? `${a.firstPage + i}` : `${i + 1} of ${pages.length}`;
    const footer = `${a.licence} · ${journal.name}, ISSN ${journal.issn}`;
    p.drawText(footer, { x: M.x, y: 36, size: 7.5, font: sans, color: MUTED });
    p.drawText(pageLabel, { x: A4.w - M.x - sans.widthOfTextAtSize(pageLabel, 8), y: 36, size: 8, font: sans, color: INK });
  });

  return doc.save();
}
