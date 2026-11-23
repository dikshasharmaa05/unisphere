"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function toggleLikeAction(articleId: string, slug: string): Promise<{ ok: boolean; liked?: boolean; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "signin" };
  const id = z.uuid().parse(articleId);
  const supabase = await createClient();
  const { data: existing } = await supabase.from("likes").select("article_id").eq("article_id", id).eq("user_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("likes").delete().eq("article_id", id).eq("user_id", user.id)
    : await supabase.from("likes").insert({ article_id: id });
  if (error) return { ok: false, error: "Couldn’t update your like." };
  revalidatePath(`/articles/${slug}`);
  return { ok: true, liked: !existing };
}
