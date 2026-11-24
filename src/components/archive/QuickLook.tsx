"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { MonoLabel, Pill } from "@/components/ui/Pill";

export type QuickLookData = { slug: string; title: string; abstract: string; authors: string | null; keywords: string[]; discipline: string | null; meta: string; type: string; doi: string | null; withdrawn: boolean };

/** "Quick look" — abstract preview pop-up without leaving the results. */
export function QuickLook({ data }: { data: QuickLookData }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-bg px-4 text-xs font-bold transition-colors hover:bg-line"
        aria-label={`Quick look: ${data.title}`}
      >
        <Icon name="document" size={14} />
        Quick look
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={id} size="lg">
        <div className="flex flex-col gap-4 p-[clamp(20px,4vw,36px)]" data-lenis-prevent="">
          <div className="flex flex-wrap items-center gap-2 pr-12">
            {data.discipline && <Pill tone="seafoam">{data.discipline}</Pill>}
            <Pill tone="bg">{data.type}</Pill>
            {data.withdrawn && <Pill tone="pink">Withdrawn</Pill>}
            <MonoLabel>{data.meta}</MonoLabel>
          </div>
          <h2 id={id} className="text-[clamp(22px,3vw,30px)] font-extrabold leading-[1.15] tracking-[-0.03em]">
            {data.title}
          </h2>
          {data.authors && <p className="text-[13px] text-muted">{data.authors}</p>}
          <div>
            <p className="eyebrow text-muted">Abstract</p>
            <p className="mt-2 max-h-[45vh] overflow-y-auto whitespace-pre-line font-serif text-[16px] leading-[1.7] text-ink-soft">{data.abstract}</p>
          </div>
          {data.keywords.length > 0 && (
            <p className="flex flex-wrap gap-1.5 text-xs">
              {data.keywords.map((k) => (
                <span key={k} className="rounded-full bg-bg px-3 py-1.5 font-semibold">
                  {k}
                </span>
              ))}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Link href={`/articles/${data.slug}`} className="nudge-arrow inline-flex h-12 items-center gap-3 rounded-full bg-ink pl-5 pr-1.5 text-sm font-bold text-white">
              Read the paper
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-lime text-ink">
                <Icon name="arrowRight" strokeWidth={2.2} />
              </span>
            </Link>
            {data.doi && <span className="break-all font-mono text-xs text-muted">doi:{data.doi}</span>}
          </div>
        </div>
      </Modal>
    </>
  );
}
