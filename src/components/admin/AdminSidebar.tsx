"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { journal } from "@/config/journal";
import { signOutAction } from "@/lib/auth/actions";

const items = [
  { href: "/admin", label: "Submissions", count: "submissions" as const, badge: "bg-lime", icon: <path d="M4 4h16v16H4zM4 10h16" /> },
  { href: "/admin/change-requests", label: "Change requests", count: "changes" as const, badge: "bg-pink", icon: <path d="M4 20h4L19 9l-4-4L4 16z" /> },
  { href: "/admin/comments", label: "Comment moderation", count: "comments" as const, badge: "bg-pink", icon: <path d="M4 5h16v11H9l-5 4z" /> },
  { href: "/admin/issues", label: "Issues & archive", icon: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10h14V9" /></> },
  { href: "/admin/users", label: "Users & reviewers", icon: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c1.9.7 3.1 2.5 3.5 5.2" /></> },
  { href: "/admin/taxonomy", label: "Categories & tags", icon: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></> },
  { href: "/admin/settings", label: "Site settings", icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></> },
];

export function AdminSidebar({ counts, name, isAdmin }: { counts: Record<"submissions" | "changes" | "comments", number>; name: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const active = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <nav aria-label="Editorial desk" className="flex shrink-0 flex-col gap-1.5 rounded-[28px] bg-surface p-4 lg:sticky lg:top-5 lg:w-[270px] lg:rounded-[32px] lg:p-5">
      <Link href="/admin" className="flex items-center gap-2.5 px-1.5 pb-3 lg:pb-4">
        <LogoMark size={40} />
        <span>
          <span className="block font-extrabold">{journal.name}</span>
          <span className="block text-xs text-muted">Editorial desk</span>
        </span>
      </Link>
      <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0" data-lenis-prevent="">
        {items.map((it) => {
          const on = active(it.href);
          const n = it.count ? counts[it.count] : 0;
          return (
            <li key={it.href} className="shrink-0">
              <Link
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 whitespace-nowrap rounded-[18px] px-3.5 py-3 text-sm transition-colors",
                  on ? "bg-ink font-bold text-white" : "font-semibold text-ink hover:bg-bg",
                )}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  {it.icon}
                </svg>
                {it.label}
                {n > 0 && (
                  <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs font-bold text-ink", it.badge)}>
                    {n}
                    <span className="sr-only"> waiting</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 hidden border-t border-line pt-4 text-xs text-muted lg:block">
        Signed in as <span className="font-semibold text-ink">{name}</span>
        <br />
        {isAdmin ? "Admin" : "Editor"} ·{" "}
        <Link href="/" className="font-semibold text-teal-deep underline underline-offset-2">
          View site
        </Link>
        <form action={signOutAction} className="mt-3">
          <button type="submit" className="h-10 w-full rounded-full bg-bg text-xs font-bold text-ink hover:bg-line">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
