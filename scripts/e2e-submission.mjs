/**
 * Live Phase 4 test: submission wizard end to end against the configured Supabase project.
 * Creates a test author + editor, uploads real files to Storage, submits, gets a
 * "revise" decision from the editor, submits a revision, deletes a draft — then cleans up.
 *
 *   node --env-file=.env.local scripts/e2e-submission.mjs   (app running on BASE_URL)
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const stamp = Date.now();
const startedAt = new Date().toISOString();
const author = { email: `e2e.author.${stamp}@unisphere-e2e.invalid`, password: `Au-${stamp}-pw`, name: "Ada Author" };
const editor = { email: `e2e.editor.${stamp}@unisphere-e2e.invalid`, password: `Ed-${stamp}-pw`, name: "Eli Editor" };
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const userIds = [];
const submissionIds = new Set();

async function mkUser(u, roles = []) {
  const { data, error } = await admin.auth.admin.createUser({ email: u.email, password: u.password, email_confirm: true, user_metadata: { full_name: u.name, affiliation: "Test University" } });
  if (error) throw error;
  userIds.push(data.user.id);
  for (const role of roles) await admin.from("user_roles").insert({ user_id: data.user.id, role });
  return data.user.id;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => check("no page errors", false, e.message));
try {
  const authorId = await mkUser(author);
  await mkUser(editor, ["editor"]);

  // Sign in
  await page.goto(`${BASE}/sign-in?next=/submit`);
  await page.getByLabel("Email").fill(author.email);
  await page.getByLabel("Password").fill(author.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await page.waitForURL(/\/submit$/, { timeout: 20000 });
  check("signed-in author lands on /submit", true);

  // Start
  await page.getByRole("button", { name: "Start submission" }).click();
  await page.waitForURL(/\/submit\/[0-9a-f-]{36}/, { timeout: 20000 });
  const subId = page.url().match(/submit\/([0-9a-f-]{36})/)[1];
  submissionIds.add(subId);
  check("draft created → wizard step 1", true, subId.slice(0, 8));

  // Step 1 (autosave)
  await page.getByLabel("Title").fill("Sleep-dependent memory consolidation in adolescent learners");
  await page.getByLabel("Discipline").selectOption({ label: "Life Sciences" });
  await page.getByLabel(/^Abstract/).fill("Sleep plays a central role in consolidating new memories. We followed secondary-school students across a full academic term, pairing wearable sleep tracking with weekly retention tests.");
  const kw = page.getByLabel(/^Keywords/);
  await kw.fill("sleep,");
  await kw.fill("memory consolidation");
  await kw.press("Enter");
  // The badge already says "Draft saved" on load, so poll the database for the autosaved values.
  let v1, s1, kwCount = 0;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    ({ data: v1 } = await admin.from("submission_versions").select("id, title").eq("submission_id", subId).single());
    ({ data: s1 } = await admin.from("submissions").select("discipline_id").eq("id", subId).single());
    ({ count: kwCount } = await admin.from("version_keywords").select("*", { count: "exact", head: true }).eq("version_id", v1.id));
    if (v1.title.startsWith("Sleep-dependent") && s1.discipline_id !== null && kwCount === 2) break;
  }
  check("step 1 autosaves title, discipline, keywords", v1.title.startsWith("Sleep-dependent") && s1.discipline_id !== null && kwCount === 2, `title="${v1.title.slice(0, 20)}" discipline=${s1.discipline_id} keywords=${kwCount}`);

  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.waitForURL(/step=2/);

  // Step 2
  const authorList = page.getByRole("list", { name: "Authors in order" });
  check("corresponding author prefilled from profile", await authorList.getByText("Ada Author", { exact: true }).isVisible());
  await page.getByRole("button", { name: "+ Add co-author" }).click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Full name", { exact: true }).fill("Ben Coauthor");
  await dlg.getByLabel("Email", { exact: true }).fill("ben@example.org");
  await dlg.getByRole("button", { name: "Add author" }).click();
  await authorList.getByText("Ben Coauthor", { exact: true }).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: "Move Ben Coauthor up" }).click();
  await page.waitForTimeout(2500);
  const { data: authorsRows } = await admin.from("submission_authors").select("full_name, position").eq("version_id", v1.id).order("position");
  check("co-author added via pop-up and reordered", authorsRows.map((a) => a.full_name).join(",") === "Ben Coauthor,Ada Author", authorsRows.map((a) => a.full_name).join(","));
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.waitForURL(/step=3/);

  // Step 3: uploads
  await page.locator("#manuscript-input").setInputFiles({ name: "manuscript.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("list", { name: "Uploaded files" }).getByText("manuscript.pdf", { exact: true }).waitFor({ timeout: 30000 });
  check("manuscript uploads to Storage and is listed", true);
  await page.locator('input[type=file][accept=".png,.jpg,.jpeg"]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: png });
  await page.getByRole("list", { name: "Uploaded files" }).getByText("photo.png", { exact: true }).waitFor({ timeout: 30000 });
  check("image uploads", true);
  await page.locator('input[type=file][accept=".png,.jpg,.jpeg"]').setInputFiles({ name: "huge.png", mimeType: "image/png", buffer: Buffer.alloc(11 * 1048576) });
  check("too-large file rejected before upload", await page.getByText(/Too large — the limit for images is 10 MB/).isVisible());
  await page.locator('input[type=file][accept=".pdf"]').setInputFiles({ name: "title-page.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("list", { name: "Uploaded files" }).getByText("title-page.pdf", { exact: true }).waitFor({ timeout: 30000 });
  await page.getByLabel("YouTube or Vimeo link").fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("list", { name: "Uploaded files" }).getByText("https://youtu.be/dQw4w9WgXcQ", { exact: true }).waitFor({ timeout: 15000 });
  const { data: fileRows } = await admin.from("submission_files").select("kind, storage_path, contains_identity").eq("version_id", v1.id);
  const { data: objects } = await admin.storage.from("submissions").list(`${subId}/${v1.id}`);
  const titlePage = fileRows.find((f) => f.kind === "supplementary");
  check("files recorded (manuscript, image, title page, video link)", fileRows.length === 4, fileRows.map((f) => f.kind).join(","));
  check("objects stored in the private bucket", (objects ?? []).length === 3, `${(objects ?? []).length} objects`);
  check("title page marked as identifying (hidden from reviewers)", titlePage?.contains_identity === true);
  await page.getByRole("button", { name: /^Continue/ }).click();
  await page.waitForURL(/step=4/);

  // Step 4
  const submitBtn = page.getByRole("button", { name: /Submit for review/ });
  check("submit disabled until declarations ticked", await submitBtn.isDisabled());
  await page.getByLabel(/This work is original/).check();
  await page.getByLabel(/changes are made by request/).check();
  await submitBtn.click();
  await page.getByRole("heading", { name: "Submitted for review" }).waitFor({ timeout: 20000 });
  const { data: s2 } = await admin.from("submissions").select("status, ref, current_version_id").eq("id", subId).single();
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", authorId);
  check("submission is submitted with a reference", s2.status === "submitted" && /^SUB-\d{4}$/.test(s2.ref), s2.ref);
  check("first submission made the user an author", roles.some((r) => r.role === "author"));

  // Locked after submit
  await page.goto(`${BASE}/submit/${subId}`);
  await page.waitForURL(new RegExp(`/dashboard/submissions/${subId}`), { timeout: 15000 });
  check("wizard locked after submit → status page", (await page.getByText("Submitted", { exact: true }).count()) > 0);
  await page.goto(`${BASE}/dashboard`);
  check("dashboard lists the submission", await page.getByText(s2.ref).isVisible());

  // Editor requests a revision (as a real signed-in editor, through the RPCs)
  const ed = createClient(url, anon, { auth: { persistSession: false } });
  await ed.auth.signInWithPassword({ email: editor.email, password: editor.password });
  const e1 = await ed.rpc("start_editorial_check", { p_submission: subId });
  const e2 = await ed.rpc("record_decision", { p_submission: subId, p_decision: "revise", p_note: "Please add a limitations section and clarify sampling." });
  check("editor records 'revise' via RPC", !e1.error && !e2.error, e1.error?.message ?? e2.error?.message ?? "");

  // Author revises
  await page.goto(`${BASE}/dashboard/submissions/${subId}`);
  check("author sees decision note", await page.getByText("Please add a limitations section").isVisible());
  await page.getByRole("button", { name: "Start revision" }).click();
  await page.waitForURL(new RegExp(`/submit/${subId}`), { timeout: 20000 });
  const revOpened = await page.getByText(/Revision · version 2/).waitFor({ timeout: 15000 }).then(() => true, () => false);
  check("revision opens wizard (version 2)", revOpened);
  check("discipline locked during revision", await page.getByLabel("Discipline").isDisabled());
  await page.getByLabel("Title").fill("Sleep-dependent memory consolidation in adolescent learners (revised)");
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    const { data } = await admin.from("submission_versions").select("title").eq("submission_id", subId).eq("version", 2).maybeSingle();
    if (data?.title?.includes("revised")) break;
  }
  await page.goto(`${BASE}/submit/${subId}?step=4`);
  await page.getByLabel(/This work is original/).check();
  await page.getByLabel(/changes are made by request/).check();
  await page.getByRole("button", { name: /Submit revision/ }).click();
  await page.getByRole("heading", { name: "Revision submitted" }).waitFor({ timeout: 20000 });
  const { data: s3 } = await admin.from("submissions").select("status, submission_versions!submission_versions_submission_id_fkey(version, title, submitted_at)").eq("id", subId).single();
  const vs = s3.submission_versions.sort((a, b) => a.version - b.version);
  check("revision submitted; v1 unchanged, v2 revised", s3.status === "submitted" && vs.length === 2 && !vs[0].title.includes("revised") && vs[1].title.includes("revised") && !!vs[1].submitted_at);

  // Delete a draft (with an uploaded file)
  await page.goto(`${BASE}/submit`);
  await page.getByRole("button", { name: "Start submission" }).click();
  await page.waitForURL(/\/submit\/[0-9a-f-]{36}/, { timeout: 20000 });
  const draftId = page.url().match(/submit\/([0-9a-f-]{36})/)[1];
  submissionIds.add(draftId);
  await page.goto(`${BASE}/submit/${draftId}?step=3`);
  await page.locator("#manuscript-input").setInputFiles({ name: "draft.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("list", { name: "Uploaded files" }).getByText("draft.pdf", { exact: true }).waitFor({ timeout: 30000 });
  const { data: dv } = await admin.from("submission_versions").select("id").eq("submission_id", draftId).single();
  await page.goto(`${BASE}/dashboard/submissions/${draftId}`);
  await page.getByRole("button", { name: "Delete draft" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete draft" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
  const { data: gone } = await admin.from("submissions").select("id").eq("id", draftId);
  const { data: leftovers } = await admin.storage.from("submissions").list(`${draftId}/${dv.id}`);
  check("draft deleted with its files", gone.length === 0 && (leftovers ?? []).length === 0, `rows=${gone.length} files=${(leftovers ?? []).length}`);
  if (gone.length === 0) submissionIds.delete(draftId);

  // Phone layout
  const phone = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await phone.goto(`${BASE}/sign-in`);
  await phone.getByLabel("Email").fill(author.email);
  await phone.getByLabel("Password").fill(author.password);
  await phone.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await phone.waitForURL(/\/account$/, { timeout: 20000 });
  for (const p of ["/dashboard", `/dashboard/submissions/${subId}`, "/submit"]) {
    await phone.goto(`${BASE}${p}`);
    const w = await phone.evaluate(() => document.documentElement.scrollWidth);
    check(`360px: ${p.replace(subId, ":id")} has no horizontal scroll`, w <= 360, `${w}px`);
  }
  await phone.close();
} catch (e) {
  check("unexpected error", false, e.message.split("\n")[0]);
  await page.screenshot({ path: process.env.E2E_SCREENSHOT ?? "e2e-submission-failure.png" }).catch(() => {});
} finally {
  // Cleanup: storage objects, submissions (service role), users
  for (const id of submissionIds) {
    const { data: vers } = await admin.from("submission_versions").select("id").eq("submission_id", id);
    for (const v of vers ?? []) {
      const { data: objs } = await admin.storage.from("submissions").list(`${id}/${v.id}`);
      if (objs?.length) await admin.storage.from("submissions").remove(objs.map((o) => `${id}/${v.id}/${o.name}`));
    }
    await admin.from("submissions").update({ current_version_id: null }).eq("id", id);
    await admin.from("submissions").delete().eq("id", id);
  }
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  // Keywords created during this run that are no longer used by any version.
  const { data: kws } = await admin.from("keywords").select("id").gte("created_at", startedAt);
  for (const k of kws ?? []) {
    const { count: used } = await admin.from("version_keywords").select("*", { count: "exact", head: true }).eq("keyword_id", k.id);
    if (!used) await admin.from("keywords").delete().eq("id", k.id);
  }
  const { count } = await admin.from("submissions").select("id", { count: "exact", head: true }).in("id", [...submissionIds]);
  check("cleanup removed test data", (count ?? 0) === 0);
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
