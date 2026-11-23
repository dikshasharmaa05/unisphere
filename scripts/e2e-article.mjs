/**
 * Live Phase 6 test: the article page.
 * Author submits a DOCX manuscript + figure (API) → editor accepts (API) → editor imports the full text
 * from the DOCX and saves it (desk UI) → editor publishes (API) → anonymous visitor: public abstract,
 * gated body, Scholar meta, JSON-LD, PDF needs sign-in, fake Googlebot UA still gated → member: full
 * text, figure, TOC, like, cite, generated PDF → editor uploads a final PDF (desk UI) → PDF redirects
 * to it → remove → 360px layout → cleanup.
 *
 *   node --env-file=.env.local scripts/e2e-article.mjs   (app running on BASE_URL)
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const JSZip = require("jszip");
const { PDFDocument, StandardFonts } = require("pdf-lib");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const stamp = Date.now();
const mk = (r, name) => ({ email: `e2e.${r}.${stamp}@unisphere-e2e.invalid`, password: `${r}-${stamp}-Pw`, name });
const U = { author: mk("author", "Zoë Ångström"), editor: mk("editor", "Eva Editor"), reader: mk("reader", "Rita Reader") };
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const created = { users: [], submission: null, articleId: null };
const TITLE = `Article E2E: tidal mixing in estuaries ${stamp}`;
const SECRET = "Secret-body-sentence-only-members-see";
const DOI = `10.99999/e2e.art.${stamp}`;

async function makeDocx() {
  const p = (t, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  const body = [p("Introduction", "Heading1"), p(`${SECRET}. Estuaries mix salt and fresh water through tides.`), p("Methods", "Heading1"), p("We sampled twelve sites over a spring–neap cycle."), p("Results", "Heading1"), p("Stratification weakened during spring tides.")].join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`);
  return zip.generateAsync({ type: "nodebuffer" });
}
async function makePdf(text) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  page.drawText(text, { x: 60, y: 760, size: 14, font: await doc.embedFont(StandardFonts.Helvetica) });
  return Buffer.from(await doc.save());
}
// 1×1 PNG
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

async function mkUser(u, roles) {
  const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true, user_metadata: { full_name: u.name, affiliation: "Test University" } });
  if (error) throw error;
  u.id = data.user.id;
  created.users.push(u.id);
  for (const role of roles) await admin.from("user_roles").insert({ user_id: u.id, role });
}
async function apiClient(u) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: u.email, password: u.password });
  if (error) throw error;
  return c;
}
async function signIn(ctx, u, next = "/account") {
  const p = await ctx.newPage();
  p.on("pageerror", (e) => check(`no page errors (${u.name})`, false, e.message));
  await p.goto(`${BASE}/sign-in?next=${encodeURIComponent(next)}`);
  await p.getByLabel("Email").fill(u.email);
  await p.getByLabel("Password").fill(u.password);
  await p.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await p.waitForURL((x) => x.pathname === next, { timeout: 20000 });
  return p;
}
async function poll(fn, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}
const metas = (page, name) => page.locator(`meta[name="${name}"]`).evaluateAll((els) => els.map((e) => e.getAttribute("content")));

const browser = await chromium.launch();
try {
  await mkUser(U.author, []);
  await mkUser(U.editor, ["editor"]);
  await mkUser(U.reader, []);

  // 1. Author submits (API): DOCX manuscript + captioned figure
  const au = await apiClient(U.author);
  const { data: subId } = await au.rpc("create_submission_draft", { p_discipline_id: 1 });
  created.submission = subId;
  const { data: v } = await au.from("submission_versions").select("id").eq("submission_id", subId).single();
  await au.from("submission_versions").update({ title: TITLE, abstract: "We measure how tidal mixing changes stratification in three estuaries across a spring–neap cycle, with open data." }).eq("id", v.id);
  await au.rpc("set_version_keywords", { p_version: v.id, p_labels: ["estuaries", "tidal mixing"] });
  await au.from("submission_authors").update({ affiliation: "Test University", orcid: "0000-0002-1825-0097" }).eq("version_id", v.id);
  const docx = await makeDocx();
  const mPath = `${subId}/${v.id}/manuscript.docx`;
  const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const up1 = await au.storage.from("submissions").upload(mPath, docx, { contentType: DOCX });
  await au.from("submission_files").insert({ submission_id: subId, version_id: v.id, kind: "manuscript", storage_path: mPath, file_name: "manuscript.docx", mime_type: DOCX, bytes: docx.length });
  const fPath = `${subId}/${v.id}/figure-1.png`;
  const up2 = await au.storage.from("submissions").upload(fPath, png, { contentType: "image/png" });
  await au.from("submission_files").insert({ submission_id: subId, version_id: v.id, kind: "figure", storage_path: fPath, file_name: "figure-1.png", mime_type: "image/png", bytes: png.length, caption: "Salinity profiles at site 4." });
  const sub = await au.rpc("submit_submission", { p_submission: subId });
  check("author submitted DOCX + figure", !up1.error && !up2.error && !sub.error, up1.error?.message ?? up2.error?.message ?? sub.error?.message ?? "");

  // 2. Editor accepts (API)
  const edApi = await apiClient(U.editor);
  const acc = await edApi.rpc("record_decision", { p_submission: subId, p_decision: "accept" });
  check("editor accepted", !acc.error, acc.error?.message ?? "");

  // 3. Desk: import full text from DOCX, add references, save
  const edCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const ed = await signIn(edCtx, U.editor, "/admin");
  await ed.goto(`${BASE}/admin?id=${subId}`);
  const panel = ed.getByRole("region", { name: "Full text" });
  await panel.waitFor({ timeout: 15000 });
  await panel.getByRole("button", { name: "Import from manuscript (DOCX)" }).click();
  const body = panel.getByLabel("Body (HTML)");
  const imported = await poll(async () => ((await body.inputValue()).includes(SECRET) ? await body.inputValue() : null));
  check("DOCX imported to HTML with headings", !!imported && /<h2[^>]*>Introduction<\/h2>/.test(imported), imported?.slice(0, 80) ?? "");
  await panel.getByLabel("References (one per line)").fill("Smith J. (2020). Estuaries. Ocean Letters, 4, 1–9.\nLee K. (2021). Tides. Coastal Science, 2, 10–20.");
  await panel.getByRole("button", { name: "Preview" }).click();
  check("preview renders in a sandboxed frame", (await panel.locator("iframe[sandbox]").count()) === 1);
  await panel.getByRole("button", { name: "Save full text" }).click();
  const saved = await poll(async () => (await admin.from("version_bodies").select("body_html, references_text").eq("version_id", v.id).maybeSingle()).data?.body_html?.includes(SECRET) ? true : null);
  check("full text saved via set_version_body", !!saved);

  // 4. Publish (API) + pages
  const pub = await edApi.rpc("publish_submission", { p_submission: subId, p_doi: DOI });
  check("published", !pub.error, pub.error?.message ?? "");
  created.articleId = pub.data;
  await admin.from("articles").update({ first_page: 5, last_page: 14 }).eq("id", pub.data);
  const { data: art } = await admin.from("articles").select("slug, paper_no, received_at, accepted_at").eq("id", pub.data).single();
  check("received/accepted dates copied to the article", !!art.received_at && !!art.accepted_at);
  const artUrl = `${BASE}/articles/${art.slug}`;
  const sneak = await edApi.rpc("set_version_body", { p_version: v.id, p_body_html: "<p>changed</p>" });
  check("published body can't be rewritten (corrections only)", !!sneak.error);

  // 5. Anonymous visitor
  const anonCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const an = await anonCtx.newPage();
  an.on("pageerror", (e) => check("no page errors (anonymous)", false, e.message));
  const res = await an.goto(artUrl);
  check("article page 200", res.status() === 200);
  check("title + abstract are public", (await an.getByRole("heading", { name: TITLE, level: 1 }).isVisible()) && (await an.getByText("Open to everyone").isVisible()));
  const html = await res.text();
  check("body text is NOT sent to visitors", !html.includes(SECRET));
  check("gated card shows sign-in options", (await an.getByRole("heading", { name: "Read the full paper" }).isVisible()) && (await an.getByRole("button", { name: "Create free account" }).isVisible()));
  check("citation_title", (await metas(an, "citation_title"))[0] === TITLE);
  check("citation_author (Unicode)", (await metas(an, "citation_author")).includes("Zoë Ångström"));
  check("citation_doi + citation_pdf_url", (await metas(an, "citation_doi"))[0] === DOI && (await metas(an, "citation_pdf_url"))[0] === `${artUrl}/pdf`.replace(BASE, process.env.NEXT_PUBLIC_SITE_URL ?? BASE));
  check("citation_publication_date YYYY/MM/DD", /^\d{4}\/\d{2}\/\d{2}$/.test((await metas(an, "citation_publication_date"))[0] ?? ""));
  check("citation_firstpage/lastpage + journal title", (await metas(an, "citation_firstpage"))[0] === "5" && (await metas(an, "citation_lastpage"))[0] === "14" && !!(await metas(an, "citation_journal_title"))[0]);
  check("citation_abstract_html_url", !!(await metas(an, "citation_abstract_html_url"))[0]?.endsWith(`/articles/${art.slug}`));
  const ld = JSON.parse((await an.locator('script[type="application/ld+json"]').first().textContent()) ?? "{}");
  check("JSON-LD ScholarlyArticle, paywalled part", ld["@type"] === "ScholarlyArticle" && ld.isAccessibleForFree === false && ld.hasPart?.cssSelector === ".paywalled-body");
  check("meta box: DOI, paper no., received", (await an.getByRole("link", { name: DOI }).isVisible()) && (await an.getByText("Received").isVisible()));
  const pdfAnon = await anonCtx.request.get(`${artUrl}/pdf`, { maxRedirects: 0 });
  check("PDF needs sign-in", pdfAnon.status() >= 300 && pdfAnon.status() < 400 && (pdfAnon.headers().location ?? "").includes("/sign-in"), String(pdfAnon.status()));
  await an.getByRole("button", { name: /^Like/ }).click();
  check("Like when signed out opens sign-in", await an.getByRole("dialog").isVisible());
  const botCtx = await browser.newContext({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" });
  const botRes = await botCtx.request.get(artUrl);
  check("fake Googlebot (UA only) still gated", !(await botRes.text()).includes(SECRET));
  const botPdf = await botCtx.request.get(`${artUrl}/pdf`, { maxRedirects: 0 });
  check("fake Googlebot can't fetch the PDF", botPdf.status() >= 300 && botPdf.status() < 400);
  const missing = await anonCtx.request.get(`${BASE}/articles/no-such-article-${stamp}`);
  check("unknown slug → 404", missing.status() === 404);

  // 6. Member
  const rdCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const rd = await signIn(rdCtx, U.reader, `/articles/${art.slug}`);
  await rd.getByText(SECRET, { exact: false }).waitFor({ timeout: 15000 }).catch(() => {});
  check("member reads the full text", await rd.getByText(SECRET, { exact: false }).isVisible());
  check("headings + TOC", (await rd.getByRole("heading", { name: "Methods", level: 2 }).isVisible()) && (await rd.getByRole("navigation", { name: "In this paper" }).getByRole("link", { name: "Methods" }).isVisible()));
  check("references listed", await rd.getByText("Smith J. (2020). Estuaries.").isVisible());
  const fig = rd.locator("figure img");
  check("figure shown with caption", (await fig.count()) === 1 && (await rd.getByText("Salinity profiles at site 4.").isVisible()) && ((await fig.getAttribute("src")) ?? "").includes("/storage/v1/object/sign/"));
  check("manuscript file is not exposed", !(await rd.content()).includes("manuscript.docx"));
  await rd.getByRole("button", { name: /^Like/ }).click();
  const liked = await poll(async () => ((await admin.from("articles").select("like_count").eq("id", pub.data).single()).data?.like_count === 1 ? true : null));
  check("like recorded", !!liked && (await rd.getByRole("button", { name: /^Liked/ }).getAttribute("aria-pressed")) === "true");
  await rd.reload();
  check("like persists after reload", (await rd.getByRole("button", { name: /^Liked/ }).count()) === 1);
  await rd.getByRole("button", { name: /^Liked/ }).click();
  const unliked = await poll(async () => ((await admin.from("articles").select("like_count").eq("id", pub.data).single()).data?.like_count === 0 ? true : null));
  check("unlike", !!unliked);
  await rd.getByRole("button", { name: /Cite this paper/ }).click();
  check("cite panel: APA", ((await rd.getByRole("tabpanel").textContent()) ?? "").includes(`https://doi.org/${DOI}`));
  await rd.getByRole("tab", { name: "BibTeX" }).click();
  check("cite panel: BibTeX", ((await rd.getByRole("tabpanel").textContent()) ?? "").includes("@article{"));
  await rdCtx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await rd.getByRole("button", { name: "Copy citation" }).click();
  check("copy citation", await rd.getByText("Copied ✓").waitFor({ timeout: 5000 }).then(() => true, () => false));
  const gen = await rdCtx.request.get(`${artUrl}/pdf`, { maxRedirects: 0 });
  const genBuf = await gen.body();
  check("generated PDF for members", gen.status() === 200 && gen.headers()["content-type"] === "application/pdf" && genBuf.subarray(0, 5).toString() === "%PDF-", `${genBuf.length} bytes`);
  const genDoc = await PDFDocument.load(genBuf);
  check("generated PDF has metadata", genDoc.getTitle() === TITLE && genDoc.getPageCount() >= 1);

  // 7. Desk: upload final PDF → readers are redirected to it → remove
  await ed.goto(`${BASE}/admin?id=${subId}`);
  const fp = ed.getByRole("region", { name: "Final PDF" });
  await fp.waitFor({ timeout: 15000 });
  await fp.locator('input[type="file"]').setInputFiles({ name: "final.pdf", mimeType: "application/pdf", buffer: await makePdf("Typeset final version") });
  const finalPath = await poll(async () => (await admin.from("articles").select("final_pdf_path").eq("id", pub.data).single()).data?.final_pdf_path);
  check("final PDF uploaded + attached", !!finalPath && finalPath.startsWith(`${pub.data}/final-`), finalPath ?? "");
  const red = await rdCtx.request.get(`${artUrl}/pdf`, { maxRedirects: 0 });
  check("PDF download redirects to the final PDF", red.status() >= 300 && red.status() < 400 && (red.headers().location ?? "").includes("/storage/v1/object/sign/final-pdfs/"));
  const dl = await fetch(red.headers().location); // Node fetch uses the sandbox proxy; Playwright's request context doesn't
  check("final PDF downloads", dl.status === 200 && Buffer.from(await dl.arrayBuffer()).subarray(0, 5).toString() === "%PDF-");
  await ed.reload();
  await fp.getByRole("button", { name: "Remove" }).click();
  await ed.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  const cleared = await poll(async () => ((await admin.from("articles").select("final_pdf_path").eq("id", pub.data).single()).data?.final_pdf_path === null ? true : null));
  const { data: left } = await admin.storage.from("final-pdfs").list(pub.data);
  check("final PDF removed (row + file)", !!cleared && (left ?? []).length === 0);

  // 8. Phone layout
  for (const [label, ctxOpts, login] of [["anonymous", {}, null], ["member", {}, U.reader]]) {
    const ph = await browser.newContext({ viewport: { width: 360, height: 780 }, ...ctxOpts });
    const pp = login ? await signIn(ph, login, `/articles/${art.slug}`) : await ph.newPage();
    if (!login) await pp.goto(artUrl);
    await pp.getByRole("heading", { name: TITLE, level: 1 }).waitFor({ timeout: 15000 });
    await pp.waitForTimeout(800);
    const w = await pp.evaluate(() => document.documentElement.scrollWidth);
    check(`360px article (${label}): no horizontal scroll`, w <= 360, `${w}px`);
    if (label === "member") await pp.screenshot({ path: "e2e-article-360.png", fullPage: false });
    await ph.close();
  }
  await an.screenshot({ path: "e2e-article-anon.png", fullPage: true });
  await rd.screenshot({ path: "e2e-article-member.png", fullPage: true });
} catch (e) {
  check("unexpected error", false, e.message.split("\n")[0]);
} finally {
  if (created.articleId) {
    const { data: o } = await admin.storage.from("final-pdfs").list(created.articleId);
    if (o?.length) await admin.storage.from("final-pdfs").remove(o.map((x) => `${created.articleId}/${x.name}`));
  }
  if (created.submission) {
    const id = created.submission;
    await admin.from("likes").delete().eq("article_id", created.articleId ?? "00000000-0000-0000-0000-000000000000");
    await admin.from("articles").delete().eq("submission_id", id);
    const { data: vers } = await admin.from("submission_versions").select("id").eq("submission_id", id);
    for (const ver of vers ?? []) {
      const { data: o } = await admin.storage.from("submissions").list(`${id}/${ver.id}`);
      if (o?.length) await admin.storage.from("submissions").remove(o.map((x) => `${id}/${ver.id}/${x.name}`));
    }
    await admin.from("submissions").update({ current_version_id: null }).eq("id", id);
    await admin.from("submissions").delete().eq("id", id);
  }
  await admin.from("keywords").delete().in("label", ["estuaries", "tidal mixing"]);
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
  const { count } = await admin.from("submissions").select("id", { count: "exact", head: true }).eq("id", created.submission ?? "00000000-0000-0000-0000-000000000000");
  check("cleanup removed test data", (count ?? 0) === 0);
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
