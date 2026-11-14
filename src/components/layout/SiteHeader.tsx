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
import { useAuthModal } from "@/components/auth/AuthModal";
import { primaryNav } from "./nav";

export function SiteHeader() {
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
        <button
          type="button"
          onClick={() => openAuth("signin")}
          className="hidden h-11 items-center rounded-full bg-surface px-5 text-sm font-semibold hover:bg-[#fafbfa] sm:flex"
        >
          Sign in
        </button>
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
          </div>
        </div>
      </Modal>
    </header>
  );
}
