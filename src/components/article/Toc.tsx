"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/** "In this paper" with the current section highlighted while scrolling. */
export function Toc({ items }: { items: { id: string; text: string; level: number }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [items]);
  return (
    <nav aria-label="In this paper" className="rounded-[28px] bg-surface p-5">
      <h2 className="text-[13px] font-extrabold">In this paper</h2>
      <ol className="mt-3 flex flex-col gap-1">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? "location" : undefined}
              className={cn("block rounded-[12px] px-3 py-2 text-[13px] transition-colors", i.level === 3 && "pl-6", active === i.id ? "bg-lime font-bold" : "text-ink-soft hover:bg-bg")}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
