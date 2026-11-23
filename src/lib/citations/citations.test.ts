import { describe, expect, it } from "vitest";
import { apa, bibtex, mla, splitName, type CitationData } from "./index";

const base: CitationData = {
  title: "Sleep-dependent memory consolidation in adolescent learners",
  authors: [{ fullName: "Riya Iyer" }, { fullName: "Michael Okafor" }, { fullName: "Lena Brandt" }],
  journal: "Unisphere",
  published: new Date("2026-03-15T00:00:00Z"),
  volume: 1,
  issue: 3,
  firstPage: 1,
  lastPage: 12,
  doi: "10.99999/usj.0001",
  url: "https://example.org/articles/sleep-1",
};

describe("splitName", () => {
  it("splits given and family names", () => expect(splitName("Riya K. Iyer")).toEqual({ given: "Riya K.", family: "Iyer" }));
  it("keeps surname particles", () => expect(splitName("Anna van der Berg")).toEqual({ given: "Anna", family: "van der Berg" }));
  it("handles single names", () => expect(splitName("Sukarno")).toEqual({ given: "", family: "Sukarno" }));
});

describe("APA 7", () => {
  it("formats three authors with ampersand, volume(issue), pages and DOI", () => {
    expect(apa(base).text).toBe(
      "Iyer, R., Okafor, M., & Brandt, L. (2026). Sleep-dependent memory consolidation in adolescent learners. Unisphere, 1(3), 1–12. https://doi.org/10.99999/usj.0001",
    );
  });
  it("italicises journal and volume in HTML", () => expect(apa(base).html).toContain("<i>Unisphere</i>, <i>1</i>(3)"));
  it("falls back to the URL without a DOI and omits missing parts", () => {
    const t = apa({ ...base, doi: null, volume: null, issue: null, firstPage: null, authors: [{ fullName: "Riya Iyer" }] }).text;
    expect(t).toBe("Iyer, R. (2026). Sleep-dependent memory consolidation in adolescent learners. Unisphere. https://example.org/articles/sleep-1");
  });
  it("escapes HTML", () => expect(apa({ ...base, title: "A <b>bold</b> claim" }).html).not.toContain("<b>"));
});

describe("MLA 9", () => {
  it("uses et al. for three or more authors", () => {
    expect(mla(base).text).toBe(
      "Iyer, Riya, et al. “Sleep-dependent memory consolidation in adolescent learners.” Unisphere, vol. 1, no. 3, 2026, pp. 1–12. https://doi.org/10.99999/usj.0001.",
    );
  });
  it("joins two authors with and", () => expect(mla({ ...base, authors: base.authors.slice(0, 2) }).text).toMatch(/^Iyer, Riya, and Michael Okafor\. /));
});

describe("BibTeX", () => {
  it("builds a keyed @article entry", () => {
    const b = bibtex(base);
    expect(b).toMatch(/^@article\{iyer2026sleep,/);
    expect(b).toContain("author  = {Iyer, Riya and Okafor, Michael and Brandt, Lena}");
    expect(b).toContain("pages   = {1--12}");
    expect(b).toContain("doi     = {10.99999/usj.0001}");
  });
  it("escapes LaTeX special characters in text fields", () => expect(bibtex({ ...base, title: "Costs & 50% savings" })).toContain("Costs \\& 50\\% savings"));
});
