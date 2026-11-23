import "server-only";
import { promises as dns } from "node:dns";

/**
 * Verified search-engine crawlers may read full text (Google Scholar indexing).
 * Verification = reverse DNS of the request IP must end in googlebot.com / google.com,
 * AND forward DNS of that hostname must resolve back to the same IP.
 * The user-agent alone is never trusted. Results are cached per IP.
 */

const CRAWLER_UA = /Googlebot|Google-InspectionTool|GoogleOther|Google Scholar|Googlebot-Scholar/i;
const ALLOWED = [/\.googlebot\.com\.?$/i, /\.google\.com\.?$/i];
const TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { ok: boolean; exp: number }>();

export const claimsToBeGoogleCrawler = (ua: string | null | undefined) => !!ua && CRAWLER_UA.test(ua);

/** Client IP as reported by the platform proxy (Vercel sets x-real-ip / x-forwarded-for). */
export function clientIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = headers.get("x-forwarded-for");
  return fwd ? (fwd.split(",")[0]?.trim() ?? null) : null;
}

const withTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error("dns timeout")), ms))]);

export type DnsLike = { reverse: (ip: string) => Promise<string[]>; lookup: (host: string, opts: { all: true }) => Promise<{ address: string }[]> };

export async function verifyGoogleCrawlerIp(ip: string, resolver: DnsLike = dns as unknown as DnsLike): Promise<boolean> {
  const hit = cache.get(ip);
  if (hit && hit.exp > Date.now()) return hit.ok;
  let ok = false;
  try {
    const hosts = await withTimeout(resolver.reverse(ip), 1500);
    for (const host of hosts) {
      if (!ALLOWED.some((re) => re.test(host))) continue;
      const addrs = await withTimeout(resolver.lookup(host, { all: true }), 1500);
      if (addrs.some((a) => a.address === ip)) {
        ok = true;
        break;
      }
    }
  } catch {
    ok = false;
  }
  if (cache.size > 2000) cache.clear();
  cache.set(ip, { ok, exp: Date.now() + (ok ? TTL_MS : TTL_MS / 6) });
  return ok;
}

/** True only for requests whose UA claims Google AND whose IP verifies. */
export async function isVerifiedCrawler(headers: Headers, resolver?: DnsLike): Promise<boolean> {
  if (!claimsToBeGoogleCrawler(headers.get("user-agent"))) return false;
  const ip = clientIp(headers);
  if (!ip) return false;
  return verifyGoogleCrawlerIp(ip, resolver);
}

export const _resetCrawlerCache = () => cache.clear();
