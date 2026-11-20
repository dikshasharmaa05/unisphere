"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { journal } from "@/config/journal";
import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, LogoMark } from "@/components/ui/Icon";
import { IconButton, IconLink } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { Popover } from "@/components/ui/Popover";
import { useAuthModal } from "@/components/auth/AuthModal";
import { signOutAction } from "@/lib/auth/actions";
import { primaryNav } from "./nav";

export type HeaderViewer = { name: string; email: string; canReview: boolean; canAdmin: boolean };

const initials = (name: string) =>
  name
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "U";

function accountLinks(v: HeaderViewer) {
  return [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/account", label: "Account & profile" },
    ...(v.canReview ? [{ href: "/review", label: "Reviews" }] : []),
    ...(v.canAdmin ? [{ href: "/admin", label: "Editorial desk" }] : []),
  ];
}

export function SiteHeader({ viewer }: { viewer: HeaderViewer | null }) {
  const pathname = usePathname();
  const { openAuth } = useAuthModal();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));

  return (
    <header className="container-page flex items-center gap-3 py-[22px] sm:gap-6">
      <Link href="/" className="flex items-center gap-3 rounded-full" aria-label={`${journal.name} — home`}>
        <LogoMark />
        <span className="text-[19px] font-extrabold tracking-[-0.02em]">{journal.name}</span>
      </Link>

      <nav aria-label="Primary" className="ml-6 hidden gap-1.5 rounded-full bg-surface p-1.5 lg:flex">
        {primaryNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={cn(
              "rounded-full px-[18px] py-2.5 text-sm font-semibold transition-colors",
              isActive(item.href) ? "bg-ink text-white" : "text-ink hover:bg-bg",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2.5">
        <IconLink href="/archive" icon="search" label="Search papers" iconSize={18} />
        {viewer ? (
          <div className="hidden sm:block">
            <Popover
              triggerLabel={`Account menu for ${viewer.name}`}
              triggerClassName="inline-flex size-11 items-center justify-center rounded-full bg-seafoam text-sm font-bold text-ink hover:bg-[#bfe6da] aria-expanded:ring-2 aria-expanded:ring-teal-deep"
              trigger={<span aria-hidden="true">{initials(viewer.name)}</span>}
            >
              {(close) => (
                <div className="flex flex-col gap-1">
                  <div className="px-3 pb-2 pt-1">
                    <p className="truncate text-sm font-bold">{viewer.name}</p>
                    <p className="truncate text-xs text-muted">{viewer.email}</p>
                  </div>
                  {accountLinks(viewer).map((l) => (
                    <Link key={l.href} href={l.href} onClick={close} className="flex min-h-11 items-center rounded-2xl px-3 text-sm font-semibold hover:bg-bg">
                      {l.label}
                    </Link>
                  ))}
                  <form action={signOutAction} className="mt-1 border-t border-line pt-1">
                    <button type="submit" className="flex min-h-11 w-full items-center rounded-2xl px-3 text-left text-sm font-semibold hover:bg-bg">
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </Popover>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openAuth("signin")}
            className="hidden h-11 items-center rounded-full bg-surface px-5 text-sm font-semibold hover:bg-[#fafbfa] sm:flex"
          >
            Sign in
          </button>
        )}
        <div className="hidden sm:block">
          <ButtonLink href="/submit" variant="signature" size="sm">
            Submit article
          </ButtonLink>
        </div>
        <IconButton
          icon="menu"
          label="Open menu"
          tone="white"
          iconSize={18}
          className="lg:hidden"
          onClick={() => setMenuOpen(true)}
          aria-haspopup="dialog"
        />
      </div>

      <Modal open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="menu-title" size="sm">
        <div className="p-6 pt-7">
          <h2 id="menu-title" className="eyebrow text-muted">
            Menu
          </h2>
          <nav aria-label="Mobile" className="mt-5 flex flex-col gap-1.5">
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "flex min-h-[52px] items-center justify-between rounded-2xl px-4 text-base font-bold",
                  isActive(item.href) ? "bg-ink text-white" : "bg-bg hover:bg-line",
                )}
              >
                {item.label}
                <Icon name="arrowRight" />
              </Link>
            ))}
          </nav>
          <div className="mt-5 grid gap-2.5">
            <ButtonLink href="/submit" variant="signature" size="md" onClick={() => setMenuOpen(false)} className="justify-between">
              Submit article
            </ButtonLink>
            {viewer ? (
              <>
                <div className="mt-2 rounded-2xl bg-bg px-4 py-3">
                  <p className="truncate text-sm font-bold">{viewer.name}</p>
                  <p className="truncate text-xs text-muted">{viewer.email}</p>
                </div>
                {accountLinks(viewer).map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex min-h-[52px] items-center justify-between rounded-2xl bg-bg px-4 text-base font-bold hover:bg-line"
                  >
                    {l.label}
                    <Icon name="arrowRight" />
                  </Link>
                ))}
                <form action={signOutAction}>
                  <button type="submit" className="h-[54px] w-full rounded-full bg-ink text-[15px] font-bold text-white">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openAuth("signin");
                }}
                className="h-[54px] rounded-full bg-ink text-[15px] font-bold text-white"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </Modal>
    </header>
  );
}
