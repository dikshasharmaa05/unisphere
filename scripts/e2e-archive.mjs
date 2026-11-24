/**
 * Live Phase 7 test: archive & search + homepage data.
 * Seeds 12 published papers (API) across disciplines, types, issues (one unpublished), figures,
 * a DOI, likes and a withdrawal → archive: counts, search (word, prefix, author, DOI, keyword),
 * discipline / type / includes / issue filters, sort by most liked, pagination, list/grid,
 * quick-look pop-up, active-filter chips, no-JS search form, SEO meta → homepage shows the real
 * papers & issue → 360px layout → cleanup.
 *
 *   node --env-file=.env.local scripts/e2e-archive.mjs   (app running on BASE_URL)
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const stamp = Date.now();
const TAG = `e2etag${stamp}`;
const mk = (r, name) => ({ email: `e2e.${r}.${stamp}@unisphere-e2e.invalid`, password: `${r}-${stamp}-Pw`, name });
const U = { author: mk("author", "Ingrid Thorsdottir"), editor: mk("editor", "Eva Editor"), reader: mk("reader", "Rita Reader") };
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const created = { users: [], submissions: [], articles: [], volume: null };
const pdf = Buffer.from("%PDF-1.4\n%%EOF\n");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const TYPES = ["original_research", "review_article", "case_study", "short_communication"];
const TITLES = [
  "Glacier retreat and meltwater chemistry in alpine catchments",
  "Federated learning for rural clinic triage",
  "Tidal energy yield forecasting with sparse buoys",
  "Bilingual classrooms and early numeracy",
  "Soil microbiome shifts under drip irrigation",
  "Urban heat islands and night-time mortality",
  "Microfinance repayment under monsoon shocks",
  "Low-cost prosthetic knee joints from recycled polymer",
  "Oral histories of coastal resettlement",
  "Sleep timing and adolescent memory consolidation",
  "Ethics of predictive policing datasets",
  "Coral larval settlement on 3D-printed reefs",
];

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
const resultCount = async (p) => Number(((await p.locator("#results-title strong").textContent()) ?? "").match(/\d+/)?.[0] ?? -1);
const titles = async (p) => p.locator("article h3 a").allTextContents();
async function waitCount(p, n, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if ((await resultCount(p)) === n) return true;
    await p.waitForTimeout(250);
  }
  return false;
}
async function settle(p, urlPart) {
  if (urlPart) await p.waitForURL((u) => u.href.includes(urlPart), { timeout: 15000 });
  await p.waitForLoadState("networkidle").catch(() => {});
}

const browser = await chromium.launch();
try {
  await mkUser(U.author, []);
  await mkUser(U.editor, ["editor"]);
  await mkUser(U.reader, []);
  const au = await apiClient(U.author);
  const ed = await apiClient(U.editor);
  const { data: discs } = await admin.from("disciplines").select("id, slug, name").order("sort");

  // Volume with a published issue 1 and an unpublished issue 2
  const volNo = 800 + Math.floor(Math.random() * 99);
  const { data: vol } = await ed.from("volumes").insert({ number: volNo, year: 2026 }).select("id").single();
  created.volume = vol.id;
  const { data: iss1 } = await ed.from("issues").insert({ volume_id: vol.id, number: 1, label: "[Month Year]", published_at: new Date().toISOString() }).select("id").single();
  const { data: iss2 } = await ed.from("issues").insert({ volume_id: vol.id, number: 2, label: "[Month Year]" }).select("id").single();

  // 1. Seed 12 published papers
  for (let i = 0; i < 12; i++) {
    const d = discs[i % discs.length];
    const { data: sid } = await au.rpc("create_submission_draft", { p_discipline_id: d.id, p_article_type: TYPES[i % 4] });
    created.submissions.push(sid);
    const { data: v } = await au.from("submission_versions").select("id").eq("submission_id", sid).single();
    await au.from("submission_versions").update({ title: TITLES[i], abstract: `Abstract ${i}: ${TITLES[i]}. A study written for the archive search test with enough words to pass.` }).eq("id", v.id);
    await au.rpc("set_version_keywords", { p_version: v.id, p_labels: [TAG, i === 3 ? `numeracy${stamp}` : `kw${i}x${stamp}`] });
    const path = `${sid}/${v.id}/manuscript.pdf`;
    await au.storage.from("submissions").upload(path, pdf, { contentType: "application/pdf" });
    await au.from("submission_files").insert({ submission_id: sid, version_id: v.id, kind: "manuscript", storage_path: path, file_name: "manuscript.pdf", mime_type: "application/pdf", bytes: pdf.length });
    if (i < 2) {
      const fp = `${sid}/${v.id}/fig.png`;
      await au.storage.from("submissions").upload(fp, png, { contentType: "image/png" });
      await au.from("submission_files").insert({ submission_id: sid, version_id: v.id, kind: "figure", storage_path: fp, file_name: "fig.png", mime_type: "image/png", bytes: png.length, caption: "Fig" });
    }
    const s = await au.rpc("submit_submission", { p_submission: sid });
    if (s.error) throw new Error(`submit ${i}: ${s.error.message}`);
    const a = await ed.rpc("record_decision", { p_submission: sid, p_decision: "accept" });
    if (a.error) throw new Error(`accept ${i}: ${a.error.message}`);
    const issue = i < 4 ? iss1.id : i === 11 ? iss2.id : null;
    const p = await ed.rpc("publish_submission", { p_submission: sid, p_issue_id: issue, p_doi: i === 2 ? `10.99999/e2e.arc.${stamp}` : null });
    if (p.error) throw new Error(`publish ${i}: ${p.error.message}`);
    created.articles.push(p.data);
    await new Promise((r) => setTimeout(r, 30));
  }
  check("seeded 12 published papers", created.articles.length === 12);
  const rd = await apiClient(U.reader);
  await rd.from("likes").insert({ article_id: created.articles[5] });
  await rd.from("likes").insert({ article_id: created.articles[7] });
  await admin.from("likes").insert({ article_id: created.articles[5], user_id: U.author.id });
  await admin.from("articles").update({ featured: true }).eq("id", created.articles[4]);
  await admin.from("articles").update({ withdrawn_at: new Date().toISOString(), withdrawal_note: "Test withdrawal." }).eq("id", created.articles[8]);
  const { data: arts } = await admin.from("articles").select("id, slug").in("id", created.articles);
  const slugOf = new Map(arts.map((a) => [a.id, a.slug]));

  // 2. Archive basics
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => check("no page errors", false, e.message));
  await p.goto(`${BASE}/archive?q=${TAG}`);
  check("archive heading", await p.getByRole("heading", { name: "Search every paper we’ve published.", level: 1 }).isVisible());
  check("tag search finds all 12", (await resultCount(p)) === 12);
  check("10 per page", (await p.locator("article").count()) === 10);
  check("newest first by default for tag (relevance ties → newest)", (await titles(p))[0] === TITLES[11]);
  await p.getByRole("link", { name: "Page 2" }).click();
  await settle(p, "page=2");
  await p.waitForFunction(() => document.querySelectorAll("article").length === 2, null, { timeout: 15000 }).catch(() => {});
  check("pagination: page 2 has 2", (await p.locator("article").count()) === 2);
  check("pagination: previous link", await p.getByRole("link", { name: "Previous page" }).isVisible());
  await p.goto(`${BASE}/archive?q=${TAG}&page=99`);
  check("past last page → helpful message", (await p.getByText("That page is past the last result.").isVisible()) && (await p.getByText("There are 12 results in total.").isVisible()));

  // 3. Search variants
  await p.goto(`${BASE}/archive`);
  await p.getByLabel("Search by title, author, keyword or DOI").fill("glacier meltwater");
  await p.getByRole("button", { name: "Search" }).click();
  await settle(p, "q=glacier");
  check("word search", (await titles(p))[0] === TITLES[0]);
  await p.goto(`${BASE}/archive?q=glaci`);
  check("prefix search (glaci → glacier)", (await titles(p)).includes(TITLES[0]));
  await p.goto(`${BASE}/archive?q=Thorsdottir`);
  check("author search", (await resultCount(p)) >= 12);
  await p.goto(`${BASE}/archive?q=${encodeURIComponent(`https://doi.org/10.99999/e2e.arc.${stamp}`)}`);
  check("DOI search (URL form)", (await resultCount(p)) === 1 && (await titles(p))[0] === TITLES[2]);
  await p.goto(`${BASE}/archive?q=numeracy${stamp}`);
  check("keyword search", (await resultCount(p)) === 1 && (await titles(p))[0] === TITLES[3]);
  await p.goto(`${BASE}/archive?q=zzzqqq${stamp}`);
  check("no-match empty state", await p.getByText("No papers match these filters.").isVisible());

  // 4. Filters
  await p.goto(`${BASE}/archive?q=${TAG}`);
  const d0 = discs[0];
  await p.getByRole("navigation", { name: "Disciplines" }).getByRole("link", { name: d0.name, exact: true }).click();
  await settle(p, `discipline=${d0.slug}`);
  const expectD0 = TITLES.filter((_, i) => i % discs.length === 0).length;
  check("discipline filter", await waitCount(p, expectD0), `${await resultCount(p)} vs ${expectD0}`);
  await p.getByLabel("Search by title, author, keyword or DOI").fill(TAG);
  await p.getByRole("button", { name: "Search" }).click();
  await settle(p);
  check("search keeps the discipline filter", p.url().includes(`discipline=${d0.slug}`));
  await p.goto(`${BASE}/archive?q=${TAG}`);
  await p.getByRole("checkbox", { name: "Case study" }).check();
  await settle(p, "type=case_study");
  check("article type filter", await waitCount(p, 3));
  await p.getByRole("checkbox", { name: "Review article" }).check();
  await settle(p, "type=review_article");
  check("several article types", await waitCount(p, 6));
  await p.getByRole("link", { name: "Remove filter Case study" }).click();
  check("remove filter chip", (await waitCount(p, 3)) && !p.url().includes("case_study"));
  await p.getByRole("link", { name: "Clear all" }).first().click();
  await p.waitForURL((u) => u.search === "", { timeout: 15000 }).catch(() => {});
  check("clear all", new URL(p.url()).search === "");
  await p.goto(`${BASE}/archive?q=${TAG}`);
  await p.getByRole("link", { name: "Graphs & figures" }).first().click();
  await settle(p, "inc=figures");
  check("includes: figures", await waitCount(p, 2));
  await p.goto(`${BASE}/archive?q=${TAG}`);
  await p.getByLabel("Sort by").selectOption("liked");
  await settle(p, "sort=liked");
  await p.waitForFunction((t) => document.querySelector("article h3 a")?.textContent === t, TITLES[5], { timeout: 15000 }).catch(() => {});
  check("sort by most liked", (await titles(p))[0] === TITLES[5] && (await titles(p))[1] === TITLES[7]);
  await p.goto(`${BASE}/archive`);
  await p.getByRole("link", { name: new RegExp(`Vol\\. ${volNo} · Issue 1`) }).first().click();
  await settle(p, `volume=${volNo}`);
  check("issue sidebar filter", await waitCount(p, 4));
  check("unpublished issue not listed", (await p.getByRole("link", { name: new RegExp(`Vol\\. ${volNo} · Issue 2`) }).count()) === 0);
  await p.goto(`${BASE}/archive?volume=${volNo}&issue=2`);
  check("unpublished issue URL → not published message", await p.getByText("That issue isn’t published.").isVisible());
  await p.goto(`${BASE}/archive?q=${encodeURIComponent(TITLES[11])}`);
  check("paper in unpublished issue shows as online (no issue leak)", (await p.locator("article").first().textContent())?.includes("Online") ?? false);
  await p.goto(`${BASE}/archive?q=${encodeURIComponent("oral histories coastal")}`);
  check("withdrawn paper marked", await p.locator("article").first().getByText("Withdrawn", { exact: true }).first().isVisible());

  // 5. Grid + quick look
  await p.goto(`${BASE}/archive?q=${TAG}`);
  await p.getByRole("link", { name: "grid" }).click();
  await settle(p, "view=grid");
  await p.locator("ol.grid").waitFor({ timeout: 15000 }).catch(() => {});
  check("grid view", (await p.locator("ol.grid article").count()) === 10);
  await p.getByRole("button", { name: `Quick look: ${TITLES[11]}` }).click();
  const dlg = p.getByRole("dialog");
  await dlg.waitFor({ timeout: 5000 });
  check("quick look shows the abstract", (await dlg.getByText(`Abstract 11:`).isVisible()) && (await dlg.getByRole("heading", { name: TITLES[11] }).isVisible()));
  await dlg.getByRole("link", { name: "Read the paper" }).click();
  await p.waitForURL((u) => u.pathname === `/articles/${slugOf.get(created.articles[11])}`, { timeout: 15000 });
  check("quick look → article page", true);

  // 6. SEO
  await p.goto(`${BASE}/archive?q=${TAG}`);
  check("filtered pages are noindex", ((await p.locator('meta[name="robots"]').getAttribute("content")) ?? "").includes("noindex"));
  check("canonical /archive", ((await p.locator('link[rel="canonical"]').getAttribute("href")) ?? "").endsWith("/archive"));
  await p.goto(`${BASE}/archive`);
  check("plain archive is indexable", (await p.locator('meta[name="robots"][content*="noindex"]').count()) === 0);

  // 7. No-JavaScript search
  const nojs = await browser.newContext({ javaScriptEnabled: false });
  const nj = await nojs.newPage();
  await nj.goto(`${BASE}/archive?discipline=${d0.slug}`);
  await nj.getByLabel("Search by title, author, keyword or DOI").fill(TAG);
  await nj.getByRole("button", { name: "Search" }).click();
  await nj.waitForURL((u) => u.search.includes(TAG), { timeout: 15000 });
  check("search works without JavaScript", nj.url().includes(`discipline=${d0.slug}`) && (await resultCount(nj)) === expectD0);
  await nojs.close();

  // 8. Homepage uses real data
  await p.goto(`${BASE}/`);
  const latest = p.locator("#latest-title").locator("xpath=ancestor::section[1]");
  const latestLinks = await latest.locator("h3 a").evaluateAll((els) => els.map((e) => [e.textContent, e.getAttribute("href")]));
  check("homepage latest papers are real", latestLinks.length === 3 && latestLinks[0][0] === TITLES[11] && latestLinks[0][1] === `/articles/${slugOf.get(created.articles[11])}`, JSON.stringify(latestLinks[0]));
  check("withdrawn papers not in latest", !latestLinks.some(([t]) => t === TITLES[8]));
  check("featured paper in hero", (await p.locator(`a[href="/articles/${slugOf.get(created.articles[4])}"]`).first().textContent())?.includes(TITLES[4]) ?? false);
  const issueLink = p.locator(`a[href="/archive?volume=${volNo}&issue=1"]`);
  const issueText = (await issueLink.count()) ? await issueLink.first().textContent() : await p.locator("#archive-title").locator("xpath=ancestor::section[1]").textContent();
  check("homepage issue list is real", issueText?.includes("4 articles") ?? false, issueText?.slice(0, 160));

  // 9. Phone layout
  const ph = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true });
  const pp = await ph.newPage();
  for (const path of [`/archive?q=${TAG}`, `/archive?q=${TAG}&view=grid`, "/"]) {
    await pp.goto(`${BASE}${path}`);
    await pp.waitForTimeout(500);
    const w = await pp.evaluate(() => document.documentElement.scrollWidth);
    check(`360px ${path.replace(TAG, "…")}: no horizontal scroll`, w <= 360, `${w}px`);
  }
  await pp.goto(`${BASE}/archive?q=${TAG}`);
  await pp.getByText("Filters & sort").click();
  check("phone: filters expand", await pp.getByRole("checkbox", { name: "Case study" }).isVisible());
  await pp.screenshot({ path: "e2e-archive-360.png", fullPage: true });
  await p.goto(`${BASE}/archive?q=${TAG}`);
  await p.screenshot({ path: "e2e-archive.png", fullPage: true });
  await ph.close();
} catch (e) {
  check("unexpected error", false, e.message.split("\n")[0]);
} finally {
  await admin.from("likes").delete().in("article_id", created.articles.length ? created.articles : ["00000000-0000-0000-0000-000000000000"]);
  for (const id of created.submissions) {
    await admin.from("articles").delete().eq("submission_id", id);
    const { data: vers } = await admin.from("submission_versions").select("id").eq("submission_id", id);
    for (const v of vers ?? []) {
      const { data: o } = await admin.storage.from("submissions").list(`${id}/${v.id}`);
      if (o?.length) await admin.storage.from("submissions").remove(o.map((x) => `${id}/${v.id}/${x.name}`));
    }
    await admin.from("submissions").update({ current_version_id: null }).eq("id", id);
    await admin.from("submissions").delete().eq("id", id);
  }
  if (created.volume) {
    await admin.from("issues").delete().eq("volume_id", created.volume);
    await admin.from("volumes").delete().eq("id", created.volume);
  }
  await admin.from("keywords").delete().like("label", `%${stamp}%`);
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
  const { count } = await admin.from("articles").select("id", { count: "exact", head: true }).in("id", created.articles.length ? created.articles : ["00000000-0000-0000-0000-000000000000"]);
  check("cleanup removed test data", (count ?? 0) === 0);
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
