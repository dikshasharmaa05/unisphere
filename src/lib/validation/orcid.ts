/**
 * ORCID iD validation: format 0000-0000-0000-000X and ISO 7064 mod 11-2 checksum.
 * Mirrors public.is_valid_orcid() in the database (which enforces it too).
 */
export const ORCID_PATTERN = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/** Accepts common pasted forms (URL, spaces, no dashes, lowercase x) and returns the canonical form or null. */
export function normalizeOrcid(input: string): string | null {
  const raw = input.trim().replace(/^https?:\/\/(www\.)?orcid\.org\//i, "").replace(/[\s-]/g, "").toUpperCase();
  if (!/^\d{15}[\dX]$/.test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export function isValidOrcid(orcid: string): boolean {
  if (!ORCID_PATTERN.test(orcid)) return false;
  const digits = orcid.replace(/-/g, "");
  let total = 0;
  for (let i = 0; i < 15; i++) total = (total + Number(digits[i])) * 2;
  const result = (12 - (total % 11)) % 11;
  const expected = result === 10 ? "X" : String(result);
  return digits[15] === expected;
}

export const orcidUrl = (orcid: string) => `https://orcid.org/${orcid}`;
