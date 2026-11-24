"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Collapsible filters on phones/tablets; always open on desktop. One copy in the DOM (unique ids). */
export function FiltersToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="archive-filters"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between text-sm font-extrabold lg:hidden"
      >
        Filters & sort
        <span className="font-mono text-xs text-muted">{open ? "Hide" : "Show"}</span>
      </button>
      <div id="archive-filters" className={cn(open ? "mt-4 block" : "hidden", "lg:mt-0 lg:block")}>
        {children}
      </div>
    </>
  );
}
