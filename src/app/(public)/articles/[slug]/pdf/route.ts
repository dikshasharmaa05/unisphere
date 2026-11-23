import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/auth/session";
import { getArticle, getFullText } from "@/lib/articles/queries";
import { isVerifiedCrawler } from "@/lib/crawler/verify";
import { siteUrl } from "@/lib/env";
import { renderArticlePdf } from "@/lib/pdf/article-pdf";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * PDF download: signed-in readers and verified search crawlers only.
 * Editor-uploaded typeset PDF if present (short-lived signed redirect), otherwise a generated PDF.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return new NextResponse("Not found", { status: 404 });

  const user = await getUser();
  const crawler = !user && (await isVerifiedCrawler(request.headers));
  if (!user && !crawler) {
    return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(`/articles/${slug}`)}`, request.url));
  }

  if (article.final_pdf_path) {
    const supabase = crawler ? createAdminClient() : await createClient();
    const { data } = await supabase.storage.from("final-pdfs").createSignedUrl(article.final_pdf_path, 120, { download: `${slug}.pdf` });
    if (data?.signedUrl) return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
  }

  const text = await getFullText(article.version_id, crawler ? "crawler" : "member");
  const bytes = await renderArticlePdf({
    title: article.title,
    authors: article.authors,
    abstract: article.abstract,
    keywords: article.keywords,
    bodyHtml: text?.html ?? "",
    references: text?.references ?? null,
    doi: article.doi,
    url: `${siteUrl()}/articles/${slug}`,
    volume: article.issue?.volume ?? null,
    issue: article.issue?.number ?? null,
    paperNo: article.paper_no,
    licence: article.licence,
    received: article.received_at,
    accepted: article.accepted_at,
    published: article.published_at,
    firstPage: article.first_page,
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noarchive",
    },
  });
}
