import "server-only";

/**
 * Institution search against the Research Organization Registry (ROR) v2 API.
 * Partial typing ("delhi univ", "iit bom") works via prefix wildcards on the last
 * word; short single words also get an exact-name query so acronyms (IITB, UCLA)
 * surface. Results are re-ranked toward exact acronyms, name prefixes and
 * education institutions.
 *
 * Optional: set ROR_CLIENT_ID (free at ror.org) for higher API rate limits.
 */

export type Institution = {
  id: string; // bare ROR ID, e.g. 052gg0110
  name: string;
  city: string | null;
  country: string | null;
  types: string[];
};

type RorName = { value: string; types: string[]; lang?: string | null };
type RorItem = {
  id: string;
  names: RorName[];
  types: string[];
  status: string;
  locations?: { geonames_details?: { name?: string; country_name?: string } }[];
};

const ROR = "https://api.ror.org/v2/organizations";
const STOP = new Set(["of", "the", "and", "de", "for", "in", "at", "&"]);

// Characters with meaning in the Elasticsearch query string syntax.
const escape = (w: string) => w.replace(/[+\-=&|><!(){}[\]^"~*?:\\/]/g, "\\$&");

function tokens(q: string) {
  return q
    .toLowerCase()
    .normalize("NFKC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .slice(0, 8);
}

function wildcardQuery(words: string[]) {
  const terms = words
    .filter((w, i) => i === words.length - 1 || !STOP.has(w))
    .map((w, i, arr) => (i === arr.length - 1 ? `names.value:${escape(w)}*` : `names.value:${escape(w)}`));
  return `${terms.join(" AND ")} AND status:active`;
}

async function fetchRor(params: Record<string, string>): Promise<RorItem[]> {
  const url = `${ROR}?${new URLSearchParams(params)}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.ROR_CLIENT_ID) headers["Client-Id"] = process.env.ROR_CLIENT_ID;
  const res = await fetch(url, { headers, next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) throw new Error(`ROR ${res.status}`);
  const data = (await res.json()) as { items?: RorItem[] };
  return data.items ?? [];
}

const displayName = (it: RorItem) =>
  it.names.find((n) => n.types.includes("ror_display"))?.value ?? it.names[0]?.value ?? "";

function toInstitution(it: RorItem): Institution {
  const loc = it.locations?.[0]?.geonames_details;
  return {
    id: it.id.replace(/^https?:\/\/ror\.org\//, ""),
    name: displayName(it),
    city: loc?.name ?? null,
    country: loc?.country_name ?? null,
    types: it.types ?? [],
  };
}

export async function searchInstitutions(query: string, limit = 8): Promise<Institution[]> {
  const words = tokens(query);
  if (!words.length || query.trim().length < 2) return [];
  const q = words.join(" ");
  const single = words.length === 1 && words[0]!.length <= 6;

  const [wild, exact] = await Promise.all([
    fetchRor({ "query.advanced": wildcardQuery(words) }),
    single ? fetchRor({ "query.advanced": `names.value:${escape(words[0]!)} AND status:active` }) : Promise.resolve([]),
  ]);

  const seen = new Map<string, { item: RorItem; order: number }>();
  [...exact, ...wild].forEach((item, order) => {
    if (!seen.has(item.id)) seen.set(item.id, { item, order });
  });

  const score = ({ item, order }: { item: RorItem; order: number }) => {
    const name = displayName(item).toLowerCase();
    let s = -order;
    if (item.names.some((n) => n.types.includes("acronym") && n.value.toLowerCase() === q)) s += 200;
    if (name.startsWith(q)) s += 80;
    else if (item.names.some((n) => n.value.toLowerCase().startsWith(q))) s += 40;
    if (item.types.includes("education")) s += 25;
    return s;
  };

  return [...seen.values()]
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
    .map((x) => toInstitution(x.item));
}
