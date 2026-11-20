"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Sets --mx/--my (cursor position) on whichever [data-spot] child is hovered, so a
 * CSS radial "spotlight" follows the pointer inside each tile.
 */
export function Spotlight({ as: Tag = "div", children, className }: { as?: ElementType; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <Tag
      ref={ref}
      className={cn(className)}
      onPointerMove={(e: React.PointerEvent) => {
        const tile = (e.target as Element).closest<HTMLElement>("[data-spot]");
        if (!tile) return;
        const r = tile.getBoundingClientRect();
        tile.style.setProperty("--mx", `${e.clientX - r.left}px`);
        tile.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </Tag>
  );
}
