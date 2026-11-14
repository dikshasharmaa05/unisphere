"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconButton, IconLink } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { useAuthModal } from "@/components/auth/AuthModal";

/** Like (requires login → opens auth pop-up), Share (popover), Open. */
export function PaperCardActions({ slug, title }: { slug: string; title: string }) {
  const { openAuth } = useAuthModal();
  const href = `/articles/${slug}`;
  return (
    <div className="flex gap-1.5">
      <IconButton icon="heart" label={`Like “${title}”`} tone="soft" onClick={() => openAuth("signin")} />
      <SharePopover href={href} title={title} />
      <IconLink href={href} icon="arrowUpRight" label={`Open “${title}”`} tone="ink" />
    </div>
  );
}

export function SharePopover({ href, title }: { href: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const absolute = () => (typeof window === "undefined" ? href : new URL(href, window.location.origin).toString());

  return (
    <Popover
      triggerLabel={`Share “${title}”`}
      triggerClassName="inline-flex size-11 items-center justify-center rounded-full bg-bg text-ink transition-colors hover:bg-line aria-expanded:bg-line"
      trigger={<Icon name="share" />}
      side="top"
    >
      {(close) => (
        <div className="flex flex-col gap-1">
          <p className="px-2 pb-1 pt-0.5 text-[13px] font-bold">Share this paper</p>
          <button
            type="button"
            className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold hover:bg-bg"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(absolute());
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                /* clipboard blocked — user can still use the links below */
              }
            }}
          >
            <Icon name={copied ? "check" : "link"} />
            <span aria-live="polite">{copied ? "Link copied" : "Copy link"}</span>
          </button>
          <a
            className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold hover:bg-bg"
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(absolute())}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            <Icon name="arrowUpRight" /> LinkedIn
          </a>
          <a
            className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold hover:bg-bg"
            href={`https://x.com/intent/post?url=${encodeURIComponent(absolute())}&text=${encodeURIComponent(title)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
          >
            <Icon name="arrowUpRight" /> X
          </a>
          <a
            className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold hover:bg-bg"
            href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(absolute())}`}
            onClick={close}
          >
            <Icon name="arrowUpRight" /> Email
          </a>
        </div>
      )}
    </Popover>
  );
}
