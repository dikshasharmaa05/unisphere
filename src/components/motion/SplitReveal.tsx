"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, MQ, SplitText, useGSAP } from "@/lib/motion/gsap";
import { cn } from "@/lib/cn";

/**
 * Masked text reveal: lines (or words/chars) slide up from behind a clip, staggered.
 * - trigger "load": plays on mount (hero); "scroll": plays when scrolled into view.
 * - Re-splits on resize/font load (autoSplit). Screen readers get the plain text (aria: auto).
 * - Hidden pre-split only when JS + motion are on (see [data-split] in globals.css).
 */
export function SplitReveal({
  as: Tag = "h2",
  children,
  className,
  id,
  by = "lines",
  trigger = "scroll",
  delay = 0,
  stagger,
  duration = 1.15,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  id?: string;
  by?: "lines" | "words" | "chars";
  trigger?: "load" | "scroll";
  delay?: number;
  stagger?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current!;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const split = SplitText.create(el, {
          type: by === "chars" ? "lines,words,chars" : by === "words" ? "lines,words" : "lines",
          mask: by === "chars" ? "lines" : by,
          linesClass: "split-line",
          autoSplit: true,
          aria: "auto",
          onSplit(self) {
            el.classList.add("is-split");
            const targets = by === "chars" ? self.chars : by === "words" ? self.words : self.lines;
            return gsap.from(targets, {
              yPercent: 115,
              rotate: by === "lines" ? 2.5 : 0,
              duration,
              ease: "expo.out",
              stagger: stagger ?? (by === "chars" ? 0.025 : by === "words" ? 0.05 : 0.11),
              delay,
              scrollTrigger: trigger === "scroll" ? { trigger: el, start: "top 88%", once: true } : undefined,
            });
          },
        });
        return () => split.revert();
      });
      // Reduced motion / no split: make sure it's visible.
      mm.add("(prefers-reduced-motion: reduce)", () => el.classList.add("is-split"));
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} id={id} data-split="" className={cn(className)}>
      {children}
    </Tag>
  );
}
