import { describe, expect, it } from "vitest";
import { htmlToBlocks, sanitizeArticleHtml } from "./sanitize";

describe("sanitizeArticleHtml", () => {
  it("strips scripts, styles, event handlers and images", () => {
    const { html } = sanitizeArticleHtml('<p onclick="x()">Hi<script>alert(1)</script></p><style>p{}</style><img src="data:image/png;base64,AAA"><iframe src="https://evil"></iframe>');
    expect(html).toBe("<p>Hi</p>");
  });
  it("turns h1 into h2 and builds a TOC with unique ids", () => {
    const { html, toc } = sanitizeArticleHtml("<h1>Introduction</h1><p>x</p><h3>Methods &amp; data</h3><h2>Introduction</h2>");
    expect(html).toContain('<h2 id="introduction">Introduction</h2>');
    expect(html).toContain('<h2 id="introduction-2">');
    expect(toc).toEqual([
      { id: "introduction", text: "Introduction", level: 2 },
      { id: "methods-data", text: "Methods & data", level: 3 },
      { id: "introduction-2", text: "Introduction", level: 2 },
    ]);
  });
  it("makes links safe and drops javascript: URLs", () => {
    const { html } = sanitizeArticleHtml('<p><a href="https://doi.org/x">doi</a><a href="javascript:alert(1)">bad</a></p>');
    expect(html).toContain('href="https://doi.org/x" rel="nofollow noopener noreferrer" target="_blank"');
    expect(html).not.toContain("javascript:");
  });
  it("keeps tables and lists", () => {
    const { html } = sanitizeArticleHtml("<table><tr><td>a</td></tr></table><ul><li>b</li></ul>");
    expect(html).toContain("<td>a</td>");
    expect(html).toContain("<li>b</li>");
  });
});

describe("htmlToBlocks", () => {
  it("extracts headings, paragraphs and list items as text", () => {
    expect(htmlToBlocks('<h2 id="a">Intro</h2><p>One &amp; two</p><ul><li>Item</li></ul>')).toEqual([
      { type: "h2", text: "Intro" },
      { type: "p", text: "One & two" },
      { type: "li", text: "Item" },
    ]);
  });
});
