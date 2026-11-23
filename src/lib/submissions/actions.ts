"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, type FieldErrors } from "@/lib/validation/auth";
import { authorSchema, detailsSchema, fileSchema, submitSchema, videoLinkSchema } from "@/lib/validation/submission";

export type Result<T = undefined> = { ok: true; data?: T; savedAt?: string } | { ok: false; error: string; fields?: FieldErrors };

const fail = (error: string, fields?: FieldErrors): Result<never> => ({ ok: false, error, fields });

/** Database errors raised by our functions/triggers are already human-readable (P0001). */
function dbMessage(err: { code?: string; message?: string } | null, fallback = "Something went wrong. Please try again.") {
  if (!err) return fallback;
  if (err.code === "P0001" && err.message) return err.message;
  if (err.code === "23514") return "One of the values isn’t valid. Please check the form.";
  if (err.code === "42501") return "You don’t have permission to do that.";
  return fallback;
}

async function requireSignedIn() {
  const user = await getUser();
  if (!user) redirect("/sign-in?next=/submit");
  return user;
}

const touch = (submissionId: string) => {
  revalidatePath(`/submit/${submissionId}`);
  revalidatePath("/dashboard");
};

// ── Drafts ───────────────────────────────────────────────────────────────────
export async function createSubmissionAction(): Promise<void> {
  await requireSignedIn();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_submission_draft", {});
  if (error || !data) redirect("/submit?error=create");
  revalidatePath("/dashboard");
  redirect(`/submit/${data}`);
}

export async function deleteDraftAction(submissionId: string): Promise<Result> {
  await requireSignedIn();
  const supabase = await createClient();
  const { data: sub } = await supabase.from("submissions").select("status").eq("id", submissionId).maybeSingle();
  if (!sub || sub.status !== "draft") return fail("Only drafts can be deleted.");
  // Remove uploaded objects BEFORE the rows: the storage policy checks the draft version still exists.
  const { data: files } = await supabase.from("submission_files").select("storage_path").eq("submission_id", submissionId);
  const paths = (files ?? []).map((f) => f.storage_path).filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from("submissions").remove(paths);
  const { error } = await supabase.from("submissions").delete().eq("id", submissionId).eq("status", "draft");
  if (error) return fail(dbMessage(error));
  revalidatePath("/dashboard");
  revalidatePath("/submit");
  return { ok: true };
}

// ── Step 1: details ──────────────────────────────────────────────────────────
export async function saveDetailsAction(input: unknown): Promise<Result> {
  await requireSignedIn();
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the highlighted fields.", fieldErrors(parsed.error));
  const { submissionId, title, abstract, disciplineId, articleType, keywords } = parsed.data;
  const supabase = await createClient();

  const { data: v } = await supabase
    .from("submission_versions")
    .select("id")
    .eq("submission_id", submissionId)
    .is("submitted_at", null)
    .maybeSingle();
  if (!v) return fail("This submission can’t be edited any more.");

  const { error: vErr } = await supabase.from("submission_versions").update({ title, abstract }).eq("id", v.id);
  if (vErr) return fail(dbMessage(vErr));

  // Discipline/type only change while it's a first draft (locked during revisions by RLS).
  if (disciplineId !== undefined || articleType) {
    const patch: { discipline_id?: number | null; article_type?: typeof articleType } = {};
    if (disciplineId !== undefined) patch.discipline_id = disciplineId;
    if (articleType) patch.article_type = articleType;
    await supabase.from("submissions").update(patch).eq("id", submissionId).eq("status", "draft");
  }

  const { error: kErr } = await supabase.rpc("set_version_keywords", { p_version: v.id, p_labels: keywords });
  if (kErr) return fail(dbMessage(kErr));

  touch(submissionId);
  return { ok: true, savedAt: new Date().toISOString() };
}

// ── Step 2: authors ──────────────────────────────────────────────────────────
async function versionSubmission(versionId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("submission_versions").select("submission_id").eq("id", versionId).maybeSingle();
  return data?.submission_id as string | undefined;
}

export async function saveAuthorAction(input: unknown): Promise<Result<{ id: string }>> {
  await requireSignedIn();
  const parsed = authorSchema.safeParse(input);
  if (!parsed.success) return fail("Please check the highlighted fields.", fieldErrors(parsed.error));
  const a = parsed.data;
  if (a.isCorresponding && !a.email) return fail("The corresponding author needs an email address.", { email: "Required for the corresponding author." });
  const supabase = await createClient();
  const row = {
    full_name: a.fullName,
    affiliation: a.affiliation,
    affiliation_ror: a.affiliation ? a.affiliationRor : null,
    orcid: a.orcid,
    email: a.email,
    is_corresponding: a.isCorresponding,
  };

  // Only one corresponding author.
  if (a.isCorresponding) {
    let q = supabase.from("submission_authors").update({ is_corresponding: false }).eq("version_id", a.versionId);
    if (a.authorId) q = q.neq("id", a.authorId);
    await q;
  }

  let id = a.authorId;
  if (a.authorId) {
    const { error } = await supabase.from("submission_authors").update(row).eq("id", a.authorId).eq("version_id", a.versionId);
    if (error) return fail(dbMessage(error));
  } else {
    const { data: last } = await supabase
      .from("submission_authors")
      .select("position")
      .eq("version_id", a.versionId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from("submission_authors")
      .insert({ ...row, version_id: a.versionId, position: (last?.position ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return fail(dbMessage(error));
    id = data.id;
  }
  const sub = await versionSubmission(a.versionId);
  if (sub) touch(sub);
  return { ok: true, data: { id: id! }, savedAt: new Date().toISOString() };
}

export async function removeAuthorAction(versionId: string, authorId: string): Promise<Result> {
  await requireSignedIn();
  const supabase = await createClient();
  const { count } = await supabase.from("submission_authors").select("id", { count: "exact", head: true }).eq("version_id", versionId);
  if ((count ?? 0) <= 1) return fail("A submission needs at least one author.");
  const { error } = await supabase.from("submission_authors").delete().eq("id", authorId).eq("version_id", versionId);
  if (error) return fail(dbMessage(error));
  await renumberAuthors(versionId);
  const sub = await versionSubmission(versionId);
  if (sub) touch(sub);
  return { ok: true };
}

/** Moves an author up/down. Positions are unique, so park one at a temporary slot. */
export async function moveAuthorAction(versionId: string, authorId: string, direction: "up" | "down"): Promise<Result> {
  await requireSignedIn();
  const supabase = await createClient();
  const { data: list } = await supabase.from("submission_authors").select("id, position").eq("version_id", versionId).order("position");
  const rows = list ?? [];
  const i = rows.findIndex((r) => r.id === authorId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return { ok: true };
  const a = rows[i]!;
  const b = rows[j]!;
  const temp = 1000 + Math.floor(Math.random() * 1000);
  for (const [id, pos] of [[a.id, temp], [b.id, a.position], [a.id, b.position]] as const) {
    const { error } = await supabase.from("submission_authors").update({ position: pos }).eq("id", id);
    if (error) return fail(dbMessage(error));
  }
  const sub = await versionSubmission(versionId);
  if (sub) touch(sub);
  return { ok: true };
}

async function renumberAuthors(versionId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("submission_authors").select("id, position").eq("version_id", versionId).order("position");
  const rows = data ?? [];
  for (const [idx, r] of rows.entries()) {
    if (r.position !== idx + 1) await supabase.from("submission_authors").update({ position: 1000 + idx }).eq("id", r.id);
  }
  for (const [idx, r] of rows.entries()) {
    if (r.position !== idx + 1) await supabase.from("submission_authors").update({ position: idx + 1 }).eq("id", r.id);
  }
}

// ── Step 3: files ────────────────────────────────────────────────────────────
export async function registerFileAction(input: unknown): Promise<Result<{ id: string }>> {
  await requireSignedIn();
  const parsed = fileSchema.safeParse(input);
  if (!parsed.success) return fail("That file couldn’t be added.");
  const f = parsed.data;
  if (!f.storagePath.startsWith(`${f.submissionId}/${f.versionId}/`)) return fail("Invalid file location.");
  const supabase = await createClient();

  // One manuscript per version: replacing removes the previous file.
  if (f.kind === "manuscript") {
    const { data: old } = await supabase.from("submission_files").select("id, storage_path").eq("version_id", f.versionId).eq("kind", "manuscript");
    for (const o of old ?? []) await removeFile(o.id, o.storage_path);
  }

  const { data: last } = await supabase
    .from("submission_files")
    .select("position")
    .eq("version_id", f.versionId)
    .eq("kind", f.kind)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from("submission_files")
    .insert({
      submission_id: f.submissionId,
      version_id: f.versionId,
      kind: f.kind,
      storage_path: f.storagePath,
      file_name: f.fileName,
      mime_type: f.mimeType,
      bytes: f.bytes,
      contains_identity: f.containsIdentity,
      position: (last?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) {
    // The upload succeeded but the database refused it (size/type/limit) — clean up the object.
    await supabase.storage.from("submissions").remove([f.storagePath]);
    return fail(dbMessage(error, "That file couldn’t be added."));
  }
  touch(f.submissionId);
  return { ok: true, data: { id: data.id }, savedAt: new Date().toISOString() };
}

async function removeFile(fileId: string, storagePath: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("submission_files").delete().eq("id", fileId);
  if (error) return error;
  // The storage policy refuses to delete objects still used by a submitted version (revisions share files).
  if (storagePath) await supabase.storage.from("submissions").remove([storagePath]);
  return null;
}

export async function removeFileAction(submissionId: string, fileId: string): Promise<Result> {
  await requireSignedIn();
  const supabase = await createClient();
  const { data: f } = await supabase.from("submission_files").select("storage_path").eq("id", fileId).maybeSingle();
  if (!f) return fail("File not found.");
  const err = await removeFile(fileId, f.storage_path);
  if (err) return fail(dbMessage(err));
  touch(submissionId);
  return { ok: true };
}

export async function updateFileAction(submissionId: string, fileId: string, patch: { caption?: string; containsIdentity?: boolean }): Promise<Result> {
  await requireSignedIn();
  const supabase = await createClient();
  const row: { caption?: string | null; contains_identity?: boolean } = {};
  if (patch.caption !== undefined) row.caption = patch.caption.trim().slice(0, 1000) || null;
  if (patch.containsIdentity !== undefined) row.contains_identity = patch.containsIdentity;
  const { error } = await supabase.from("submission_files").update(row).eq("id", fileId);
  if (error) return fail(dbMessage(error));
  touch(submissionId);
  return { ok: true, savedAt: new Date().toISOString() };
}

export async function addVideoLinkAction(input: unknown): Promise<Result> {
  await requireSignedIn();
  const parsed = videoLinkSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid link.", fieldErrors(parsed.error));
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("submission_files").insert({
    submission_id: v.submissionId,
    version_id: v.versionId,
    kind: "video_embed",
    embed_url: v.url,
    caption: v.caption || null,
  });
  if (error) return fail(dbMessage(error));
  touch(v.submissionId);
  return { ok: true, savedAt: new Date().toISOString() };
}

// ── Step 4: submit ───────────────────────────────────────────────────────────
export async function submitAction(input: unknown): Promise<Result<{ ref: string }>> {
  await requireSignedIn();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return fail("Please confirm both declarations.", fieldErrors(parsed.error));
  const { submissionId, coverLetter } = parsed.data;
  const supabase = await createClient();
  if (coverLetter !== undefined) {
    await supabase.from("submissions").update({ cover_letter: coverLetter || null }).eq("id", submissionId).eq("status", "draft");
  }
  const { error } = await supabase.rpc("submit_submission", { p_submission: submissionId });
  if (error) return fail(dbMessage(error, "We couldn’t submit. Please try again."));
  const { data } = await supabase.from("submissions").select("ref").eq("id", submissionId).single();
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/submissions/${submissionId}`);
  revalidatePath("/", "layout"); // role may have changed (author)
  return { ok: true, data: { ref: data?.ref ?? "" } };
}

export async function startRevisionAction(submissionId: string): Promise<void> {
  await requireSignedIn();
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_revision", { p_submission: submissionId });
  if (error && !/already in progress/i.test(error.message)) redirect(`/dashboard/submissions/${submissionId}?error=revision`);
  revalidatePath("/dashboard");
  redirect(`/submit/${submissionId}`);
}
