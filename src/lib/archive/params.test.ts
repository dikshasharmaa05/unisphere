import { describe, expect, it } from "vitest";
import { archiveHref, pageList, parseArchiveParams, toggle } from "./params";

describe("parseArchiveParams", () => {
  it("defaults", () => {
    expect(parseArchiveParams({})).toEqual({ q: "", discipline: null, volume: null, issue: null, types: [], inc: [], sort: "newest", view: "list", page: 1 });
  });
  it("relevance by default when searching", () => {
    expect(parseArchiveParams({ q: "  memory   sleep " })).toMatchObject({ q: "memory sleep", sort: "relevance" });
  });
  it("drops invalid values", () => {
    const p = parseArchiveParams({ discipline: "Bad Slug!", volume: "-1", issue: "2", type: ["case_study", "nope", "case_study"], inc: ["video", "x"], sort: "random", page: "0", view: "tiles" });
    expect(p).toMatchObject({ discipline: null, volume: null, issue: null, types: ["case_study"], inc: ["video"], sort: "newest", page: 1, view: "list" });
  });
  it("relevance without a query falls back to newest", () => {
    expect(parseArchiveParams({ sort: "relevance" }).sort).toBe("newest");
  });
  it("issue needs a volume", () => {
    expect(parseArchiveParams({ volume: "1", issue: "3" })).toMatchObject({ volume: 1, issue: 3 });
    expect(parseArchiveParams({ issue: "3" }).issue).toBeNull();
  });
});

describe("archiveHref", () => {
  const base = parseArchiveParams({ q: "memory", type: "review_article", page: "3" });
  it("round-trips", () => {
    const href = archiveHref(base);
    expect(href).toBe("/archive?q=memory&type=review_article&page=3");
    const back = parseArchiveParams(Object.fromEntries(new URL(href, "http://x").searchParams));
    expect(back.q).toBe("memory");
  });
  it("filter change resets page; view change keeps it", () => {
    expect(archiveHref(base, { discipline: "engineering" })).toBe("/archive?q=memory&discipline=engineering&type=review_article");
    expect(archiveHref(base, { view: "grid" })).toBe("/archive?q=memory&type=review_article&view=grid&page=3");
  });
  it("omits default sort", () => {
    expect(archiveHref(parseArchiveParams({}), { sort: "newest" })).toBe("/archive");
    expect(archiveHref(parseArchiveParams({}), { sort: "liked" })).toBe("/archive?sort=liked");
  });
  it("encodes queries", () => {
    expect(archiveHref(parseArchiveParams({}), { q: "a&b \"c\"" })).toBe("/archive?q=a%26b+%22c%22");
  });
});

describe("helpers", () => {
  it("toggle", () => {
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
  });
  it("pageList", () => {
    expect(pageList(1, 3)).toEqual([1, 2, 3]);
    expect(pageList(6, 20)).toEqual([1, "…", 5, 6, 7, "…", 20]);
    expect(pageList(1, 20)).toEqual([1, 2, "…", 20]);
  });
});
