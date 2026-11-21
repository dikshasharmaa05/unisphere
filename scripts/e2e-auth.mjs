/**
 * Live auth smoke test against the configured Supabase project.
 *   1. health check
 *   2. register form validation (bad ORCID) in the browser
 *   3. create an unverified test user via admin.generateLink (no email is sent)
 *   4. open the verification link through /auth/confirm → lands signed in on /account
 *   5. profile row + reader role created by the trigger
 *   6. sign out → wrong password error → sign in via the pop-up
 *   7. reader is blocked from /admin and /review, allowed on /dashboard
 *   8. sign out → protected pages redirect to sign-in
 *   9. delete the test user
 *
 * Usage: app running on BASE_URL (default http://localhost:3000), env from .env.local:
 *   node --env-file=.env.local scripts/e2e-auth.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only; never printed).
 */
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const stamp = Date.now();
const email = `e2e.${stamp}@unisphere-e2e.invalid`;
const password = `E2e-${stamp}-pw`;
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

let userId;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
try {
  // 1
  const h = await (await fetch(`${BASE}/api/health`)).json();
  check("health check", h.ok === true, JSON.stringify(h));

  // 2
  await page.goto(`${BASE}/sign-in?mode=register`);
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel(/ORCID iD/).fill("0000-0002-1825-0098");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  const orcidErr = page.getByText("That ORCID iD isn’t valid");
  await orcidErr.waitFor({ timeout: 10000 });
  check("register form rejects invalid ORCID checksum", await orcidErr.isVisible());
  check("register form keeps typed values after error", (await page.getByLabel("Full name").inputValue()) === "E2E Tester");

  // 3
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { full_name: "E2E Tester", affiliation: "Test University", orcid: "0000-0002-1825-0097", role: "admin" } },
  });
  userId = link?.user?.id;
  check("test user created (unverified)", !linkErr && !!userId && !link.user.email_confirmed_at, linkErr?.message ?? "");

  // unverified sign-in is refused with a clear message
  await page.goto(`${BASE}/sign-in`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).last().click();
  const unverified = page.getByText("Please verify your email first");
  await unverified.waitFor({ timeout: 10000 });
  check("unverified account cannot sign in (friendly message + resend)", await page.getByRole("button", { name: "Resend verification email" }).isVisible());

  // 4
  const hash = link.properties.hashed_token;
  await page.goto(`${BASE}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=signup&next=/account`);
  await page.waitForURL(/\/account$/, { timeout: 15000 });
  check("verification link signs in and lands on /account", page.url().endsWith("/account"));
  check("account page shows profile from sign-up", (await page.getByLabel("Full name").inputValue()) === "E2E Tester" && (await page.getByLabel("Affiliation").inputValue()) === "Test University");
  check("ORCID shown on account page", await page.getByRole("link", { name: /ORCID iD 0000-0002-1825-0097/ }).isVisible());

  // reused link fails gracefully
  const reuse = await browser.newPage();
  await reuse.goto(`${BASE}/auth/confirm?token_hash=${encodeURIComponent(hash)}&type=signup&next=/account`);
  check("reused verification link → friendly error", /\/sign-in\?error=/.test(reuse.url()) && (await reuse.getByText(/expired or was already used|went wrong/).count()) > 0, reuse.url());
  await reuse.close();

  // 5
  const { data: prof } = await admin.from("profiles").select("full_name, affiliation, orcid").eq("id", userId).single();
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  check("trigger created profile", prof?.full_name === "E2E Tester" && prof?.orcid === "0000-0002-1825-0097");
  check("trigger granted only 'reader' (metadata role ignored)", JSON.stringify(roles?.map((r) => r.role)) === '["reader"]', JSON.stringify(roles));

  // profile edit with an institution suggestion (ROR), chosen by keyboard
  const aff = page.getByRole("combobox", { name: "Affiliation" });
  await aff.fill("");
  await aff.pressSequentially("university of oxf", { delay: 40 });
  const firstOption = page.getByRole("option").first();
  await firstOption.waitFor({ timeout: 15000 });
  check("affiliation suggestions appear while typing", (await firstOption.textContent())?.includes("University of Oxford") ?? false, (await firstOption.textContent()) ?? "");
  await aff.press("ArrowDown");
  await aff.press("Enter");
  check("keyboard pick fills the field", (await aff.inputValue()) === "University of Oxford");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByText("Profile saved.").waitFor({ timeout: 10000 });
  const { data: prof2 } = await admin.from("profiles").select("affiliation, affiliation_ror").eq("id", userId).single();
  check("account page saves affiliation + ROR ID", prof2?.affiliation === "University of Oxford" && prof2?.affiliation_ror === "052gg0110", JSON.stringify(prof2));
  // free text clears the ROR ID
  await aff.fill("Edited Institute");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save profile" }).click();
  // The previous "Profile saved." is still on screen — poll the database instead.
  let prof3 = null;
  for (let i = 0; i < 20; i++) {
    ({ data: prof3 } = await admin.from("profiles").select("affiliation, affiliation_ror").eq("id", userId).single());
    if (prof3?.affiliation === "Edited Institute") break;
    await page.waitForTimeout(300);
  }
  check("free-text affiliation saves without ROR ID", prof3?.affiliation === "Edited Institute" && prof3?.affiliation_ror === null, JSON.stringify(prof3));

  // 6
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  check("sign out returns to home with Sign in button", await page.getByRole("button", { name: "Sign in" }).first().isVisible());

  await page.getByRole("button", { name: "Sign in" }).first().click();
  const dlg = page.getByRole("dialog");
  await dlg.getByLabel("Email").fill(email);
  await dlg.getByLabel("Password").fill("wrong-password");
  await dlg.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await dlg.getByText("That email and password don’t match").waitFor({ timeout: 10000 });
  check("wrong password → clear error, email kept", (await dlg.getByLabel("Email").inputValue()) === email);
  await dlg.getByLabel("Password").fill(password);
  await dlg.getByRole("button", { name: "Sign in", exact: true }).last().click();
  await page.getByRole("button", { name: /Account menu for E2E Tester/ }).waitFor({ timeout: 15000 });
  check("sign in via pop-up → header shows account menu", true);

  // 7
  await page.goto(`${BASE}/admin`);
  check("reader blocked from /admin (→ /forbidden)", /\/forbidden/.test(page.url()), page.url());
  await page.goto(`${BASE}/review`);
  check("reader blocked from /review", /\/forbidden/.test(page.url()), page.url());
  await page.goto(`${BASE}/dashboard`);
  check("reader can open /dashboard", page.url().endsWith("/dashboard"));

  // editor can reach /admin (role granted with the service key, as an admin would)
  await admin.from("user_roles").insert({ user_id: userId, role: "editor" });
  await page.goto(`${BASE}/admin`);
  check("editor can open /admin", page.url().endsWith("/admin") && (await page.getByRole("heading", { name: "Submissions" }).isVisible()), page.url());
  await page.getByRole("button", { name: /Account menu/ }).click();
  check("editor sees 'Editorial desk' in account menu", await page.getByRole("link", { name: "Editorial desk" }).isVisible());
  await page.keyboard.press("Escape");

  // 8
  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 15000 });
  await page.goto(`${BASE}/admin`);
  check("signed out /admin → sign-in with next", /\/sign-in\?next=%2Fadmin/.test(page.url()), page.url());
  check("sign-in page explains why", await page.getByText("Please sign in to open the editorial desk.").isVisible());

  // Google button while the provider is not yet enabled in Supabase → friendly error, no crash
  await page.goto(`${BASE}/sign-in`);
  await page.getByRole("button", { name: "Google" }).click();
  await page.waitForURL(/accounts\.google\.com|\/sign-in\?error=|supabase\.co/, { timeout: 15000 }).catch(() => {});
  const gUrl = page.url();
  check("Google button: redirects to Google, or explains it isn't enabled", /accounts\.google\.com/.test(gUrl) || /error=/.test(gUrl) || /supabase\.co/.test(gUrl), gUrl.replace(/\?.*/, "?…"));

  // 360px: header + pop-up fit without horizontal scroll
  const phone = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await phone.goto(`${BASE}/`);
  await phone.getByRole("button", { name: "Open menu" }).click();
  await phone.getByRole("dialog").getByRole("button", { name: "Sign in" }).click();
  await phone.getByRole("dialog").getByLabel("Email").waitFor();
  check("360px: sign-in pop-up opens from mobile menu, no horizontal scroll", (await phone.evaluate(() => document.documentElement.scrollWidth)) <= 360);
  await phone.close();
} catch (e) {
  check("unexpected error", false, e.message);
  await page.screenshot({ path: process.env.E2E_SCREENSHOT ?? "e2e-failure.png" }).catch(() => {});
} finally {
  // 9
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("id", userId);
    check("test user deleted (profile + roles cascade)", !error && count === 0, error?.message ?? "");
  }
  await browser.close();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
