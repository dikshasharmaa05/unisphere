import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createPublicClient: () => ({}) }));
const { shortAuthors } = await import("./queries");

describe("shortAuthors", () => {
  it("initials + surname", () => expect(shortAuthors("Rhea Iyer, Musa Okafor")).toBe("R. Iyer, M. Okafor"));
  it("et al. after three", () => expect(shortAuthors("A B, C D, E F, G H")).toBe("A. B, C. D, E. F et al."));
  it("single names and Unicode", () => expect(shortAuthors("Plato, Zoë Ångström")).toBe("Plato, Z. Ångström"));
  it("empty", () => expect(shortAuthors(null)).toBe(""));
});
