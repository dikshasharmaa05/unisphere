"use client";

import { useState, useTransition } from "react";
import { useAuthModal } from "@/components/auth/AuthModal";
import { SharePopover } from "@/components/landing/PaperCardActions";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { toggleLikeAction } from "@/lib/articles/actions";

export function LikeButton({ articleId, slug, initialLiked, initialCount, signedIn }: { articleId: string; slug: string; initialLiked: boolean; initialCount: number; signedIn: boolean }) {
  const { openAuth } = useAuthModal();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={liked}
      disabled={pending}
      onClick={() => {
        if (!signedIn) return openAuth("signin", `/articles/${slug}`);
        const next = !liked;
        setLiked(next);
        setCount((c) => c + (next ? 1 : -1));
        startTransition(async () => {
          const r = await toggleLikeAction(articleId, slug);
          if (!r.ok) {
            setLiked(!next);
            setCount((c) => c + (next ? -1 : 1));
          }
        });
      }}
      className={cn("flex min-h-12 w-full items-center gap-2.5 rounded-full px-4 text-sm font-bold transition-colors", liked ? "bg-pink" : "bg-bg hover:bg-line")}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" />
      </svg>
      {liked ? "Liked" : "Like"}
      <span className="ml-auto font-mono text-xs text-muted">{count}</span>
    </button>
  );
}

export function ShareButton({ slug, title }: { slug: string; title: string }) {
  return (
    <div className="[&>div]:flex [&>div]:w-full">
      <SharePopover href={`/articles/${slug}`} title={title} wide />
    </div>
  );
}

export function PdfButton({ slug, signedIn }: { slug: string; signedIn: boolean }) {
  const { openAuth } = useAuthModal();
  const cls = "flex min-h-12 w-full items-center gap-2.5 rounded-full bg-ink px-4 text-sm font-bold text-white hover:bg-[#26302e]";
  const inner = (
    <>
      <Icon name="download" size={16} />
      Download PDF
      <span className="ml-auto text-[11px] font-semibold text-on-ink-muted">{signedIn ? "PDF" : "Members"}</span>
    </>
  );
  return signedIn ? (
    <a href={`/articles/${slug}/pdf`} className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={() => openAuth("signin", `/articles/${slug}`)} className={cls}>
      {inner}
    </button>
  );
}
