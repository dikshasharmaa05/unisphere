import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { PDFDocument } from "pdf-lib";
import { renderArticlePdf } from "./article-pdf";

describe("renderArticlePdf", () => {
  it("produces a multi-page PDF with metadata, Unicode names and page numbers", async () => {
    const body = Array.from({ length: 60 }, (_, i) => `<h2>Section ${i}</h2><p>${"Sleep and memory consolidation in adolescents. ".repeat(12)}</p>`).join("");
    const bytes = await renderArticlePdf({
      title: "Sleep-dependent memory consolidation in adolescent learners",
      authors: [{ full_name: "Zoë Müller", affiliation: "Universität Zürich", orcid: "0000-0002-1825-0097" }, { full_name: "Иван Петров", affiliation: null, orcid: null }],
      abstract: "We followed students across a term.",
      keywords: ["sleep", "memory"],
      bodyHtml: body,
      references: "Ref A.\nRef B.",
      doi: "10.99999/usj.1",
      url: "https://example.org/a",
      volume: 1,
      issue: 3,
      paperNo: 7,
      licence: "CC BY 4.0",
      received: "2026-01-02T00:00:00Z",
      accepted: "2026-02-03T00:00:00Z",
      published: "2026-03-04T00:00:00Z",
      firstPage: null,
    });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThan(2);
    expect(doc.getTitle()).toContain("Sleep-dependent");
    expect(doc.getAuthor()).toContain("Zoë Müller");
  });
});
