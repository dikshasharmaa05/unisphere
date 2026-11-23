import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { _resetCrawlerCache, clientIp, isVerifiedCrawler, verifyGoogleCrawlerIp, type DnsLike } from "./verify";

const resolver = (reverse: Record<string, string[]>, forward: Record<string, string[]>): DnsLike => ({
  reverse: async (ip) => {
    if (!reverse[ip]) throw new Error("ENOTFOUND");
    return reverse[ip]!;
  },
  lookup: async (host) => (forward[host] ?? []).map((address) => ({ address })),
});

const GOOGLE_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

describe("crawler verification", () => {
  beforeEach(() => _resetCrawlerCache());

  it("accepts a genuine Googlebot (reverse + forward match)", async () => {
    const r = resolver({ "66.249.66.1": ["crawl-66-249-66-1.googlebot.com"] }, { "crawl-66-249-66-1.googlebot.com": ["66.249.66.1"] });
    expect(await verifyGoogleCrawlerIp("66.249.66.1", r)).toBe(true);
  });
  it("rejects a hostname outside Google", async () => {
    const r = resolver({ "1.2.3.4": ["googlebot.com.evil.example"] }, { "googlebot.com.evil.example": ["1.2.3.4"] });
    expect(await verifyGoogleCrawlerIp("1.2.3.4", r)).toBe(false);
  });
  it("rejects a spoofed PTR whose forward lookup doesn't match", async () => {
    const r = resolver({ "5.6.7.8": ["crawl-1.googlebot.com"] }, { "crawl-1.googlebot.com": ["66.249.66.9"] });
    expect(await verifyGoogleCrawlerIp("5.6.7.8", r)).toBe(false);
  });
  it("rejects when DNS fails", async () => {
    expect(await verifyGoogleCrawlerIp("9.9.9.9", resolver({}, {}))).toBe(false);
  });
  it("never trusts the user-agent alone", async () => {
    const h = new Headers({ "user-agent": GOOGLE_UA, "x-real-ip": "1.2.3.4" });
    expect(await isVerifiedCrawler(h, resolver({}, {}))).toBe(false);
  });
  it("skips DNS entirely for ordinary browsers", async () => {
    const r = { reverse: vi.fn(), lookup: vi.fn() } as unknown as DnsLike;
    expect(await isVerifiedCrawler(new Headers({ "user-agent": "Mozilla/5.0 Safari", "x-real-ip": "66.249.66.1" }), r)).toBe(false);
    expect(r.reverse).not.toHaveBeenCalled();
  });
  it("reads the client IP from proxy headers", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "66.249.66.1, 10.0.0.1" }))).toBe("66.249.66.1");
  });
});
