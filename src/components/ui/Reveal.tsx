"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Fades + lifts its children in when they scroll into view (once).
 * `stagger` reveals direct children one after another.
 * Content is fully visible without JS and with prefers-reduced-motion (see globals.css).
 */
export function Reveal({
  as: Tag = "div",
  children,
  className,
  stagger = false,
  delay = 0,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stagger) {
      Array.from(el.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--reveal-delay", `${delay + i * 90}ms`));
    } else {
      el.style.setProperty("--reveal-delay", `${delay}ms`);
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          el.dataset.revealed = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stagger, delay]);

  return (
    <Tag ref={ref} data-reveal={stagger ? "stagger" : "self"} className={cn(className)}>
      {children}
    </Tag>
  );
}
