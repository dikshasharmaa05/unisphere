import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { searchInstitutions } from "@/lib/ror/search";

const querySchema = z.string().trim().min(2).max(100);

/** GET /api/affiliations?q=delhi%20univ → up to 8 institutions from ROR. */
export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ items: [] });
  try {
    const items = await searchInstitutions(parsed.data);
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch {
    // Suggestions are a convenience — never block typing a free-text affiliation.
    return NextResponse.json({ items: [], unavailable: true }, { status: 200 });
  }
}
