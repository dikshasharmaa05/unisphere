import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, ProfileRow } from "@/lib/supabase/types";
import { signInPath } from "./redirect";

export type Viewer = {
  user: User;
  profile: Pick<ProfileRow, "full_name" | "affiliation" | "affiliation_ror" | "orcid" | "email"> | null;
  roles: AppRole[];
};

/**
 * The authenticated user, verified with Supabase Auth (not just decoded from the cookie).
 * Cached per request.
 */
export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/** User + profile + roles (RLS limits the reads to the user's own rows). Cached per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, affiliation, affiliation_ror, orcid, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  const roles = (roleRows ?? []).map((r) => r.role);
  return { user, profile, roles: roles.length ? roles : ["reader"] };
});

export const hasAnyRole = (viewer: Viewer | null, roles: readonly AppRole[]) =>
  !!viewer && viewer.roles.some((r) => roles.includes(r));

/** Redirects to the sign-in page (then back to `next`) when signed out. */
export async function requireUser(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(signInPath(next));
  return viewer;
}

/**
 * Requires one of `roles`. Signed out → sign in; signed in without the role → friendly 403.
 * Pages must call this even though the proxy also checks the session: it is the real guard
 * (and RLS is the backstop for data).
 */
export async function requireRole(roles: readonly AppRole[], next: string): Promise<Viewer> {
  const viewer = await requireUser(next);
  if (!hasAnyRole(viewer, roles)) redirect(`/forbidden?from=${encodeURIComponent(next)}`);
  return viewer;
}

/** Role groups used by route guards. */
export const ROLE_GROUPS = {
  review: ["reviewer", "editor", "admin"],
  admin: ["editor", "admin"],
} as const satisfies Record<string, readonly AppRole[]>;
