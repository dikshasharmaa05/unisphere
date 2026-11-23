import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireRole, ROLE_GROUPS } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: { default: "Editorial desk", template: "%s · Editorial desk" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireRole(ROLE_GROUPS.admin, "/admin");
  const supabase = await createClient();
  const [{ count: open }, { count: changes }, { count: comments }] = await Promise.all([
    supabase.from("submissions").select("id", { count: "exact", head: true }).in("status", ["submitted", "editorial_check", "in_review", "accepted"]),
    supabase.from("change_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("comments").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return (
    <div className="min-h-dvh bg-bg">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-white">
        Skip to content
      </a>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 p-3 sm:p-5 lg:flex-row lg:items-start">
        <AdminSidebar
          counts={{ submissions: open ?? 0, changes: changes ?? 0, comments: comments ?? 0 }}
          name={viewer.profile?.full_name || viewer.user.email || "Editor"}
          isAdmin={viewer.roles.includes("admin")}
        />
        <main id="admin-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
