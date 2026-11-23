/**
 * Live Phase 5 test: editorial desk + reviewer workspace, end to end.
 * Author submits (via API) → editor: editorial check, assign reviewer → reviewer: blind review →
 * editor: request revision → author revises → editor: accept, create/publish issue, publish article,
 * set DOI → admin: roles, discipline, review-model switch → access checks → cleanup.
 *
 *   node --env-file=.env.local scripts/e2e-editorial.mjs   (app running on BASE_URL)
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
const mk = (r) => ({ email: `e2e.${r}.${stamp}@unisphere-e2e.invalid`, password: `${r}-${stamp}-Pw`, name: { author: "Ada Author", reviewer: "Rex Reviewer", editor: "Eva Editor", boss: "Abe Admin" }[r] });
const U = { author: mk("author"), reviewer: mk("reviewer"), editor: mk("editor"), boss: mk("boss") };
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const created = { users: [], submission: null, volumes: [], disciplines: [] };
const pdf = Buffer.from("%PDF-1.4\n%%EOF\n");

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
const statusOf = async (id) => (await admin.from("submissions").select("status").eq("id", id).single()).data?.status;
async function waitStatus(id, want, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    if ((await statusOf(id)) === want) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const browser = await chromium.launch();
try {
  await mkUser(U.author, []);
  await mkUser(U.reviewer, ["reviewer"]);
  await mkUser(U.editor, ["editor"]);
  await mkUser(U.boss, ["admin"]);

  // 1. Author submits via the API (UI covered by e2e-submission)
  const au = await apiClient(U.author);
  const { data: subId } = await au.rpc("create_submission_draft", { p_discipline_id: 1 });
  created.submission = subId;
  const { data: v1 } = await au.from("submission_versions").select("id").eq("submission_id", subId).single();
  await au.from("submission_versions").update({ title: "Editorial E2E: memory and sleep", abstract: "A study of how sleep shapes memory consolidation in secondary-school students over a full term." }).eq("id", v1.id);
  const path = `${subId}/${v1.id}/manuscript.pdf`;
  const up = await au.storage.from("submissions").upload(path, pdf, { contentType: "application/pdf" });
  await au.from("submission_files").insert({ submission_id: subId, version_id: v1.id, kind: "manuscript", storage_path: path, file_name: "manuscript.pdf", mime_type: "application/pdf", bytes: pdf.length });
  const sub = await au.rpc("submit_submission", { p_submission: subId });
  check("author submitted via API", !up.error && !sub.error, up.error?.message ?? sub.error?.message ?? "");
  const { data: refRow } = await admin.from("submissions").select("ref").eq("id", subId).single();

  // 2. Editor desk
  const edCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const ed = await signIn(edCtx, U.editor, "/admin");
  check("editor reaches the desk", await ed.getByRole("heading", { name: "Submissions", level: 1 }).isVisible());
  const newTile = await ed.getByRole("link", { name: /^New\s*\d+/ }).textContent();
  check("count tile shows the new submission", /New\s*[1-9]/.test(newTile ?? ""), newTile?.replace(/\s+/g, " "));
  await ed.getByRole("link", { name: new RegExp(refRow.ref) }).click();
  const panel = ed.getByRole("region", { name: "Submission detail" });
  await panel.getByText("Editorial E2E: memory and sleep").waitFor({ timeout: 15000 });
  check("detail shows author name to editors", await panel.getByText("Ada Author").isVisible());
  check("manuscript opens via signed link", (await panel.getByRole("link", { name: /Manuscript: manuscript\.pdf/ }).getAttribute("href"))?.includes("/storage/v1/object/sign/") ?? false);
  await panel.getByRole("button", { name: "Start editorial check" }).click();
  check("start editorial check", await waitStatus(subId, "editorial_check"));
  await panel.getByRole("button", { name: "+ Assign reviewer" }).waitFor();
  await panel.getByRole("button", { name: "+ Assign reviewer" }).click();
  const dlg = ed.getByRole("dialog");
  check("author is not offered as reviewer", !(await dlg.getByText("Ada Author").count()) || (await dlg.getByRole("radio", { name: /Ada Author/ }).count()) === 0);
  await dlg.getByLabel("Search").fill("Rex");
  await dlg.getByRole("radio", { name: /Rex Reviewer/ }).check();
  await dlg.getByRole("button", { name: "Assign reviewer" }).click();
  check("reviewer assigned → in review", await waitStatus(subId, "in_review"));

  // 3. Reviewer workspace (blind)
  const rvCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const rv = await signIn(rvCtx, U.reviewer, "/review");
  await rv.getByRole("link", { name: /Editorial E2E: memory and sleep/ }).click();
  await rv.waitForURL(/\/review\/[0-9a-f-]{36}/);
  check("reviewer sees the manuscript", await rv.getByRole("heading", { name: "Editorial E2E: memory and sleep" }).isVisible());
  check("double-blind: no author name on review page", (await rv.getByText("Ada Author").count()) === 0 && (await rv.getByText(/author identities are hidden/i).isVisible()));
  check("reviewer can open the manuscript", (await rv.getByRole("link", { name: /Manuscript/ }).getAttribute("href"))?.includes("/storage/v1/object/sign/") ?? false);
  await rv.getByRole("radio", { name: /Minor revision/ }).check();
  await rv.getByLabel("Comments for the author").fill("Clear and well designed. Please add a limitations section and report effect sizes.");
  await rv.getByLabel("Confidential comments for the editor").fill("Solid work; recommend publishing after minor changes.");
  await rv.getByRole("button", { name: "Save draft" }).click();
  await rv.getByText("Draft saved.").waitFor({ timeout: 15000 });
  check("review draft saved", true);
  await rv.getByRole("button", { name: "Submit review" }).click();
  await rv.getByRole("dialog").getByRole("button", { name: "Submit review" }).click();
  await rv.getByText(/Review submitted/).waitFor({ timeout: 15000 });
  const { data: rev } = await admin.from("reviews").select("status, recommendation").eq("submission_id", subId).single();
  check("review submitted", rev.status === "submitted" && rev.recommendation === "minor_revision");
  // Reviewer cannot enter the desk
  await rv.goto(`${BASE}/admin`);
  check("reviewer blocked from the desk", /\/forbidden/.test(rv.url()));

  // 4. Editor reads review, requests revision
  await ed.goto(`${BASE}/admin?id=${subId}`);
  await panel.getByText("Minor revision").waitFor({ timeout: 15000 });
  check("editor sees recommendation", true);
  await panel.getByText("Read review").click();
  check("editor sees confidential comment", await panel.getByText("recommend publishing after minor changes").isVisible());
  await panel.getByLabel("Note to author").fill("Please address the reviewer’s comments.");
  await panel.getByRole("button", { name: "Request revision" }).click();
  await ed.getByRole("dialog").getByRole("button", { name: "Request revision" }).click();
  check("revision requested", await waitStatus(subId, "revision_requested"));

  // 5. Author revises (API)
  const { data: v2 } = await au.rpc("start_revision", { p_submission: subId });
  await au.from("submission_versions").update({ title: "Editorial E2E: memory and sleep (revised)" }).eq("id", v2);
  const resub = await au.rpc("submit_submission", { p_submission: subId });
  check("author resubmitted v2", !resub.error && (await statusOf(subId)) === "submitted", resub.error?.message ?? "");
  const authorSeesReviewer = await au.from("reviews").select("id");
  check("author cannot read reviews", (authorSeesReviewer.data ?? []).length === 0);

  // 6. Accept, issue, publish
  await ed.goto(`${BASE}/admin?id=${subId}`);
  await panel.getByRole("button", { name: "Approve" }).click();
  await ed.getByRole("dialog").getByRole("button", { name: "Accept" }).click();
  check("accepted", await waitStatus(subId, "accepted"));
  await ed.goto(`${BASE}/admin/issues`);
  await ed.getByRole("button", { name: "+ Volume" }).click();
  const volNumber = 900 + Math.floor(Math.random() * 90);
  await ed.getByRole("dialog").getByLabel("Volume number").fill(String(volNumber));
  await ed.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await ed.getByText(`Volume ${volNumber}`, { exact: true }).waitFor({ timeout: 15000 });
  const { data: vol } = await admin.from("volumes").select("id").eq("number", volNumber).single();
  created.volumes.push(vol.id);
  await ed.getByRole("button", { name: "+ Issue" }).click();
  await ed.getByRole("dialog").getByLabel("Volume").selectOption({ label: `Volume ${volNumber}` });
  await ed.getByRole("dialog").getByLabel("Issue number").fill("1");
  await ed.getByRole("dialog").getByLabel("Label (optional)").fill("[Month Year]");
  await ed.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  const fb = ed.locator("[role=status], [role=alert]").filter({ hasText: /Issue created|exists|isn’t valid|Choose a volume|permission|wrong/ }).first();
  const fbText = await fb.waitFor({ timeout: 15000 }).then(() => fb.textContent(), () => "no feedback");
  const { data: iss } = await admin.from("issues").select("id").eq("volume_id", vol.id).maybeSingle();
  check("volume + issue created", !!iss, fbText ?? "");
  await ed.goto(`${BASE}/admin?id=${subId}`);
  await panel.getByLabel("Issue").selectOption(String(iss.id));
  await panel.getByLabel("DOI (optional)").fill("10.99999/e2e." + stamp);
  await panel.getByLabel("Feature on homepage when published").check();
  await panel.getByRole("button", { name: "Publish article" }).click();
  await ed.getByRole("dialog").getByRole("button", { name: "Publish" }).click();
  check("published", await waitStatus(subId, "published"));
  const { data: art } = await admin.from("articles").select("id, slug, paper_no, doi, issue_id, featured").eq("submission_id", subId).single();
  check("article has paper no., issue, DOI, featured", !!art && art.issue_id === iss.id && art.doi === "10.99999/e2e." + stamp && art.featured, art ? `paper ${art.paper_no}` : "");
  await ed.goto(`${BASE}/admin/issues`);
  await ed.getByRole("button", { name: "Publish issue" }).first().click();
  await ed.waitForTimeout(1500);
  const { data: issAfter } = await admin.from("issues").select("published_at").eq("id", iss.id).single();
  check("issue published", !!issAfter.published_at);
  await ed.getByRole("button", { name: /Edit Editorial E2E/ }).click();
  await ed.getByRole("dialog").getByLabel("First page").fill("1");
  await ed.getByRole("dialog").getByLabel("Last page").fill("12");
  await ed.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await ed.waitForTimeout(1500);
  const { data: pages } = await admin.from("articles").select("first_page, last_page").eq("id", art.id).single();
  check("article pages edited", pages.first_page === 1 && pages.last_page === 12);

  // 7. Roles: editor read-only, admin can grant
  await ed.goto(`${BASE}/admin/users`);
  check("editor sees users but cannot change roles", await ed.getByText("Only admins can change roles").isVisible());
  const bossCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const boss = await signIn(bossCtx, U.boss, "/admin/users");
  await boss.getByLabel("Search people").fill("Ada Author");
  await boss.getByRole("button", { name: "+ Reviewer for Ada Author" }).click();
  await boss.getByRole("dialog").getByRole("button", { name: "Grant" }).click();
  await boss.waitForTimeout(1500);
  const { data: r1 } = await admin.from("user_roles").select("role").eq("user_id", U.author.id);
  check("admin granted reviewer role", r1.some((r) => r.role === "reviewer"));
  await boss.getByRole("button", { name: "Reviewer for Ada Author" }).click();
  await boss.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await boss.waitForTimeout(1500);
  const { data: r2 } = await admin.from("user_roles").select("role").eq("user_id", U.author.id);
  check("admin removed reviewer role", !r2.some((r) => r.role === "reviewer"));

  // 8. Taxonomy
  await boss.goto(`${BASE}/admin/taxonomy`);
  await boss.getByRole("button", { name: "+ Discipline" }).click();
  await boss.getByRole("dialog").getByLabel("Name").fill(`E2E Discipline ${stamp}`);
  await boss.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await boss.getByText(`E2E Discipline ${stamp}`, { exact: true }).first().waitFor({ timeout: 15000 });
  const { data: disc } = await admin.from("disciplines").select("id, slug").eq("name", `E2E Discipline ${stamp}`).single();
  created.disciplines.push(disc.id);
  check("discipline added with slug", disc.slug === `e2e-discipline-${stamp}`);

  // 9. Settings: review model switch
  await boss.goto(`${BASE}/admin/settings`);
  await boss.getByRole("radio", { name: /Single-blind/ }).click();
  await boss.getByRole("dialog").getByRole("button", { name: "Switch" }).click();
  await boss.waitForTimeout(1500);
  const { data: m1 } = await admin.from("site_settings").select("value").eq("key", "review_model").single();
  check("admin switched to single-blind", m1.value === "single_blind");
  await boss.getByRole("radio", { name: /Double-blind/ }).click();
  await boss.getByRole("dialog").getByRole("button", { name: "Switch" }).click();
  await boss.waitForTimeout(1500);
  const { data: m2 } = await admin.from("site_settings").select("value").eq("key", "review_model").single();
  check("switched back to double-blind", m2.value === "double_blind");
  await ed.goto(`${BASE}/admin/settings`);
  check("editor cannot change settings", await ed.getByRole("radio", { name: /Single-blind/ }).isDisabled());

  // 10. Access: author blocked from desk
  const auCtx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const ap = await signIn(auCtx, U.author, "/dashboard");
  await ap.goto(`${BASE}/admin`);
  check("author blocked from the desk", /\/forbidden/.test(ap.url()));
  await ap.goto(`${BASE}/review`);
  check("author without reviewer role blocked from /review", /\/forbidden/.test(ap.url()));

  // 11. Phone layout
  const ph = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const pp = await signIn(ph, U.boss, "/admin");
  for (const p of ["/admin", `/admin?id=${subId}`, "/admin/issues", "/admin/users", "/admin/taxonomy", "/admin/settings"]) {
    await pp.goto(`${BASE}${p}`);
    const w = await pp.evaluate(() => document.documentElement.scrollWidth);
    check(`360px ${p.replace(subId, ":id")}: no horizontal scroll`, w <= 360, `${w}px`);
  }
} catch (e) {
  check("unexpected error", false, e.message.split("\n")[0]);
} finally {
  // Cleanup (service role)
  if (created.submission) {
    const id = created.submission;
    await admin.from("articles").delete().eq("submission_id", id);
    const { data: vers } = await admin.from("submission_versions").select("id").eq("submission_id", id);
    for (const v of vers ?? []) {
      const { data: o } = await admin.storage.from("submissions").list(`${id}/${v.id}`);
      if (o?.length) await admin.storage.from("submissions").remove(o.map((x) => `${id}/${v.id}/${x.name}`));
    }
    await admin.from("submissions").update({ current_version_id: null }).eq("id", id);
    await admin.from("reviews").delete().eq("submission_id", id);
    await admin.from("submissions").delete().eq("id", id);
  }
  for (const v of created.volumes) {
    await admin.from("issues").delete().eq("volume_id", v);
    await admin.from("volumes").delete().eq("id", v);
  }
  for (const d of created.disciplines) await admin.from("disciplines").delete().eq("id", d);
  await admin.from("disciplines").delete().eq("name", `E2E Discipline ${stamp}`);
  await admin.from("site_settings").update({ value: "double_blind" }).eq("key", "review_model");
  for (const id of created.users) await admin.auth.admin.deleteUser(id);
  const { count } = await admin.from("submissions").select("id", { count: "exact", head: true }).eq("id", created.submission ?? "00000000-0000-0000-0000-000000000000");
  check("cleanup removed test data", (count ?? 0) === 0);
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
