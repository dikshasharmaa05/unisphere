"use client";

import { useRef, type ReactNode } from "react";
import { gsap, motionState, MQ, useGSAP } from "@/lib/motion/gsap";
import { cn } from "@/lib/cn";

/**
 * Endless ticker whose speed (and direction) follows your scrolling — scroll fast and
 * it races, scroll up and it reverses. Static, wrapped row with reduced motion.
 * Decorative: content is aria-hidden; pass meaningful text elsewhere.
 */
export function VelocityMarquee({ children, className, speed = 60, reverse = false }: { children: ReactNode; className?: string; speed?: number; reverse?: boolean }) {
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const t = track.current!;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        let x = 0;
        let dir = reverse ? 1 : -1;
        let boost = 0;
        const tick = (_time: number, deltaMs: number) => {
          const v = motionState.velocity;
          if (Math.abs(v) > 0.2) dir = (v > 0 ? -1 : 1) * (reverse ? -1 : 1);
          boost += (Math.min(Math.abs(v) * 14, 900) - boost) * 0.08;
          const half = t.scrollWidth / 2;
          x += dir * (speed + boost) * (deltaMs / 1000);
          if (x <= -half) x += half;
          if (x > 0) x -= half;
          gsap.set(t, { x, skewX: Math.max(-8, Math.min(8, -dir * boost * 0.012)) });
        };
        gsap.ticker.add(tick);
        return () => {
          gsap.ticker.remove(tick);
          gsap.set(t, { x: 0, skewX: 0 });
        };
      });
      return () => mm.revert();
    },
    { scope: track },
  );

  return (
    <div aria-hidden="true" className={cn("overflow-hidden", className)}>
      <div ref={track} className="flex w-max will-change-transform motion-reduce:w-full motion-reduce:flex-wrap">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center motion-reduce:hidden">{children}</div>
      </div>
    </div>
  );
}
