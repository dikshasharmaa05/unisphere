"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { cn } from "@/lib/cn";

/** Mono label that decodes itself (scramble) when it scrolls into view. Text stays readable meanwhile. */
export function Scramble({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(
    () => {
      const el = ref.current!;
      const text = el.textContent ?? "";
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const tw = gsap.to(el, {
          duration: Math.min(1.6, 0.5 + text.length * 0.03),
          delay,
          scrambleText: { text, chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789—·", speed: 0.7, revealDelay: 0.15 },
          scrollTrigger: { trigger: el, start: "top 92%", once: true },
        });
        return () => {
          tw.kill();
          el.textContent = text;
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <p ref={ref} aria-label={typeof children === "string" ? children : undefined} className={cn("eyebrow", className)}>
      {children}
    </p>
  );
}
