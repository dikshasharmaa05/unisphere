"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer, hasAnyRole, ROLE_GROUPS } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/types";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

const msg = (err: { code?: string; message?: string } | null, fallback = "Something went wrong. Please try again.") => {
  if (!err) return fallback;
  if (err.code === "P0001" && err.message) return err.message;
  if (err.code === "42501") return "You don’t have permission to do that.";
  if (err.code === "23505") return "That already exists.";
  if (err.code === "23514") return "One of the values isn’t valid.";
  if (err.code === "23503") return "It’s still in use, so it can’t be removed.";
  return fallback;
};

async function requireEditor() {
  const viewer = await getViewer();
  if (!hasAnyRole(viewer, ROLE_GROUPS.admin)) throw new Error("Editors only");
  return viewer!;
}
async function requireAdmin() {
  const viewer = await getViewer();
  if (!hasAnyRole(viewer, ["admin"])) throw new Error("Admins only");
  return viewer!;
}

const refresh = (submissionId?: string) => {
  revalidatePath("/admin", "layout");
  if (submissionId) revalidatePath(`/dashboard/submissions/${submissionId}`);
};

const uuid = z.uuid();

// ── Submissions ──────────────────────────────────────────────────────────────
export async function startEditorialCheckAction(submissionId: string): Promise<Result> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_editorial_check", { p_submission: uuid.parse(submissionId) });
  if (error) return { ok: false, error: msg(error) };
  refresh(submissionId);
  return { ok: true, message: "Moved to editorial check." };
}

export async function assignReviewerAction(submissionId: string, reviewerId: string, dueDays: number): Promise<Result> {
  await requireEditor();
  const supabase = await createClient();
  const due = new Date(Date.now() + Math.min(Math.max(dueDays, 1), 120) * 86400000).toISOString();
  const { error } = await supabase.rpc("assign_reviewer", { p_submission: uuid.parse(submissionId), p_reviewer: uuid.parse(reviewerId), p_due_at: due });
  if (error) return { ok: false, error: msg(error) };
  refresh(submissionId);
  return { ok: true, message: "Reviewer assigned." };
}

export async function withdrawReviewAction(submissionId: string, reviewId: string): Promise<Result> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_review", { p_review: uuid.parse(reviewId) });
  if (error) return { ok: false, error: msg(error) };
  refresh(submissionId);
  return { ok: true, message: "Assignment withdrawn." };
}

const decisionSchema = z.object({
  submissionId: uuid,
  decision: z.enum(["accept", "revise", "decline"]),
  note: z.string().trim().max(10000).optional(),
});

export async function recordDecisionAction(input: unknown): Promise<Result> {
  await requireEditor();
  const p = decisionSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid decision." };
  if (p.data.decision === "revise" && !p.data.note) return { ok: false, error: "Tell the author what to change in the note." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_decision", { p_submission: p.data.submissionId, p_decision: p.data.decision, p_note: p.data.note ?? undefined });
  if (error) return { ok: false, error: msg(error) };
  refresh(p.data.submissionId);
  const label = { accept: "Accepted", revise: "Revision requested", decline: "Declined" }[p.data.decision];
  return { ok: true, message: `${label}.` };
}

const publishSchema = z.object({
  submissionId: uuid,
  issueId: z.coerce.number().int().positive().nullable(),
  doi: z
    .string()
    .trim()
    .transform((v) => v.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""))
    .refine((v) => v === "" || /^10\.\d{4,9}\/\S+$/.test(v), "DOI should look like 10.xxxx/…")
    .optional(),
  featured: z.boolean().optional(),
});

export async function publishAction(input: unknown): Promise<Result & { slug?: string }> {
  await requireEditor();
  const p = publishSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input." };
  const supabase = await createClient();
  const { data: articleId, error } = await supabase.rpc("publish_submission", {
    p_submission: p.data.submissionId,
    p_issue_id: p.data.issueId ?? undefined,
    p_doi: p.data.doi || undefined,
  });
  if (error || !articleId) return { ok: false, error: msg(error) };
  if (p.data.featured) await supabase.from("articles").update({ featured: true }).eq("id", articleId);
  const { data: a } = await supabase.from("articles").select("slug").eq("id", articleId).single();
  refresh(p.data.submissionId);
  revalidatePath("/", "layout");
  return { ok: true, message: "Published.", slug: a?.slug };
}

// ── Articles (metadata after publication) ───────────────────────────────────
const articleSchema = z.object({
  articleId: uuid,
  issueId: z.coerce.number().int().positive().nullable(),
  doi: z
    .string()
    .trim()
    .transform((v) => v.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""))
    .refine((v) => v === "" || /^10\.\d{4,9}\/\S+$/.test(v), "DOI should look like 10.xxxx/…"),
  firstPage: z.coerce.number().int().positive().nullable(),
  lastPage: z.coerce.number().int().positive().nullable(),
  featured: z.boolean(),
});

export async function updateArticleAction(input: unknown): Promise<Result> {
  await requireEditor();
  const p = articleSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input." };
  const a = p.data;
  if (a.firstPage && a.lastPage && a.lastPage < a.firstPage) return { ok: false, error: "Last page must be after the first page." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("articles")
    .update({ issue_id: a.issueId, doi: a.doi || null, first_page: a.firstPage, last_page: a.lastPage, featured: a.featured })
    .eq("id", a.articleId);
  if (error) return { ok: false, error: msg(error) };
  refresh();
  revalidatePath("/", "layout");
  return { ok: true, message: "Article updated." };
}

// ── Issues & volumes ─────────────────────────────────────────────────────────
export async function createVolumeAction(number: number, year: number | null): Promise<Result> {
  await requireEditor();
  if (!Number.isInteger(number) || number < 1) return { ok: false, error: "Volume number must be 1 or more." };
  const supabase = await createClient();
  const { error } = await supabase.from("volumes").insert({ number, year: year || null });
  if (error) return { ok: false, error: msg(error) };
  refresh();
  return { ok: true, message: `Volume ${number} created.` };
}

const issueSchema = z.object({
  volumeId: z.coerce.number().int().positive(),
  number: z.coerce.number().int().positive(),
  label: z.string().trim().max(80).optional(),
});

export async function createIssueAction(input: unknown): Promise<Result> {
  await requireEditor();
  const p = issueSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Choose a volume and an issue number." };
  const supabase = await createClient();
  const { error } = await supabase.from("issues").insert({ volume_id: p.data.volumeId, number: p.data.number, label: p.data.label || null });
  if (error) return { ok: false, error: msg(error) };
  refresh();
  return { ok: true, message: "Issue created." };
}

export async function publishIssueAction(issueId: number, publish: boolean): Promise<Result> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase.from("issues").update({ published_at: publish ? new Date().toISOString() : null, ...(publish ? {} : { is_current: false }) }).eq("id", issueId);
  if (error) return { ok: false, error: msg(error) };
  refresh();
  revalidatePath("/", "layout");
  return { ok: true, message: publish ? "Issue published." : "Issue unpublished." };
}

export async function setCurrentIssueAction(issueId: number): Promise<Result> {
  await requireEditor();
  const supabase = await createClient();
  const { data: issue } = await supabase.from("issues").select("published_at").eq("id", issueId).single();
  if (!issue?.published_at) return { ok: false, error: "Publish the issue before making it current." };
  await supabase.from("issues").update({ is_current: false }).eq("is_current", true);
  const { error } = await supabase.from("issues").update({ is_current: true }).eq("id", issueId);
  if (error) return { ok: false, error: msg(error) };
  refresh();
  revalidatePath("/", "layout");
  return { ok: true, message: "Current issue updated." };
}

// ── Users & roles (admins grant; RLS enforces) ──────────────────────────────
const GRANTABLE: AppRole[] = ["reviewer", "editor", "admin"];

export async function setRoleAction(userId: string, role: AppRole, grant: boolean): Promise<Result> {
  const viewer = await requireAdmin();
  if (!GRANTABLE.includes(role)) return { ok: false, error: "That role can’t be changed here." };
  if (!grant && role === "admin" && userId === viewer.user.id) return { ok: false, error: "You can’t remove your own admin role." };
  const supabase = await createClient();
  const { error } = grant
    ? await supabase.from("user_roles").insert({ user_id: uuid.parse(userId), role })
    : await supabase.from("user_roles").delete().eq("user_id", uuid.parse(userId)).eq("role", role);
  if (error) return { ok: false, error: msg(error) };
  refresh();
  return { ok: true, message: grant ? `Granted ${role}.` : `Removed ${role}.` };
}

// ── Taxonomy ─────────────────────────────────────────────────────────────────
const disciplineSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(2, "Name is too short.").max(80),
  tone: z.enum(["seafoam", "lime", "aqua", "pink", "stone"]),
  sort: z.coerce.number().int().min(0).max(999),
  active: z.boolean(),
});

const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export async function saveDisciplineAction(input: unknown): Promise<Result> {
  await requireEditor();
  const p = disciplineSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input." };
  const d = p.data;
  const supabase = await createClient();
  const row = { name: d.name, tone: d.tone, sort: d.sort, active: d.active };
  const { error } = d.id
    ? await supabase.from("disciplines").update(row).eq("id", d.id)
    : await supabase.from("disciplines").insert({ ...row, slug: slugify(d.name) });
  if (error) return { ok: false, error: msg(error) };
  refresh();
  revalidatePath("/", "layout");
  return { ok: true, message: d.id ? "Discipline saved." : "Discipline added." };
}

export async function deleteKeywordAction(id: number): Promise<Result> {
  await requireEditor();
  const supabase = await createClient();
  const { error } = await supabase.from("keywords").delete().eq("id", id);
  if (error) return { ok: false, error: msg(error) };
  refresh();
  return { ok: true, message: "Keyword deleted." };
}

export async function renameKeywordAction(id: number, label: string): Promise<Result> {
  await requireEditor();
  const clean = label.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!clean) return { ok: false, error: "Enter a keyword." };
  const supabase = await createClient();
  const { error } = await supabase.from("keywords").update({ label: clean }).eq("id", id);
  if (error) return { ok: false, error: msg(error) };
  refresh();
  return { ok: true, message: "Keyword renamed." };
}

// ── Site settings (admins; RLS enforces) ────────────────────────────────────
export async function setReviewModelAction(model: "single_blind" | "double_blind"): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update({ value: model }).eq("key", "review_model");
  if (error) return { ok: false, error: msg(error) };
  refresh();
  return { ok: true, message: model === "double_blind" ? "Double-blind review on." : "Single-blind review on." };
}

const limitsSchema = z.record(z.string(), z.coerce.number().int().min(1).max(50));

export async function saveUploadLimitsAction(maxMb: unknown, maxVisual: number): Promise<Result> {
  await requireAdmin();
  const p = limitsSchema.safeParse(maxMb);
  if (!p.success) return { ok: false, error: "Limits must be between 1 and 50 MB (the storage plan maximum)." };
  if (!Number.isInteger(maxVisual) || maxVisual < 1 || maxVisual > 100) return { ok: false, error: "Images + figures limit must be 1–100." };
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", "upload_limits").single();
  const current = (data?.value ?? {}) as Record<string, { maxMb: number; types: string[] } | number>;
  const next: Record<string, unknown> = { ...current, maxImagesAndFiguresPerVersion: maxVisual };
  for (const [kind, mb] of Object.entries(p.data)) {
    const rule = current[kind];
    if (rule && typeof rule === "object") next[kind] = { ...rule, maxMb: mb };
  }
  const { error } = await supabase.from("site_settings").update({ value: next as never }).eq("key", "upload_limits");
  if (error) return { ok: false, error: msg(error) };
  refresh();
  return { ok: true, message: "Upload limits saved." };
}

export async function saveDefaultLicenceAction(licence: string): Promise<Result> {
  await requireAdmin();
  const clean = licence.trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Enter a licence." };
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").update({ value: clean }).eq("key", "default_licence");
  if (error) return { ok: false, error: msg(error) };
  refresh();
  return { ok: true, message: "Default licence saved." };
}
