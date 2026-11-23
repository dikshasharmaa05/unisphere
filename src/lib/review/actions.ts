"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

const schema = z.object({
  reviewId: z.uuid(),
  recommendation: z.enum(["accept", "minor_revision", "major_revision", "reject"]).nullable(),
  toAuthor: z.string().max(20000),
  toEditor: z.string().max(20000),
});

async function save(input: unknown) {
  const user = await getUser();
  if (!user) return { ok: false as const, error: "Your session has ended. Please sign in again." };
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false as const, error: "Please check the form." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .update({ recommendation: p.data.recommendation, comments_to_author: p.data.toAuthor || null, comments_to_editor: p.data.toEditor || null })
    .eq("id", p.data.reviewId)
    .select("id");
  if (error || !data?.length) return { ok: false as const, error: "This review can no longer be edited." };
  return { ok: true as const, id: p.data.reviewId };
}

export async function saveReviewAction(input: unknown): Promise<Result> {
  const r = await save(input);
  if (!r.ok) return r;
  revalidatePath(`/review/${r.id}`);
  return { ok: true, message: "Draft saved." };
}

export async function submitReviewAction(input: unknown): Promise<Result> {
  const r = await save(input);
  if (!r.ok) return r;
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", { p_review: r.id });
  if (error) return { ok: false, error: error.code === "P0001" ? error.message : "We couldn’t submit your review." };
  revalidatePath("/review");
  revalidatePath(`/review/${r.id}`);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Review submitted. Thank you!" };
}
