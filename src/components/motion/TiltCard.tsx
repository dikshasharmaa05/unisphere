"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { cn } from "@/lib/cn";

/**
 * 3D tilt toward the cursor with a moving light glare. The outer element is left
 * untouched (safe to animate from outside); the inner one tilts.
 */
export function TiltCard({ children, className, max = 7, cursor }: { children: ReactNode; className?: string; max?: number; cursor?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const o = outer.current!;
      const i = inner.current!;
      const g = glare.current!;
      const mm = gsap.matchMedia();
      mm.add(MQ.fine, () => {
        gsap.set(i, { transformPerspective: 1000, transformStyle: "preserve-3d" });
        const rx = gsap.quickTo(i, "rotationX", { duration: 0.6, ease: "power3" });
        const ry = gsap.quickTo(i, "rotationY", { duration: 0.6, ease: "power3" });
        const move = (e: PointerEvent) => {
          const r = o.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          ry((px - 0.5) * max * 2);
          rx((0.5 - py) * max * 2);
          g.style.setProperty("--gx", `${px * 100}%`);
          g.style.setProperty("--gy", `${py * 100}%`);
        };
        const enter = () => {
          gsap.to(g, { opacity: 1, duration: 0.4 });
          gsap.to(i, { y: -6, duration: 0.5, ease: "power3.out" });
        };
        const leave = () => {
          rx(0);
          ry(0);
          gsap.to(g, { opacity: 0, duration: 0.5 });
          gsap.to(i, { y: 0, duration: 0.6, ease: "power3.out" });
        };
        o.addEventListener("pointermove", move);
        o.addEventListener("pointerenter", enter);
        o.addEventListener("pointerleave", leave);
        return () => {
          o.removeEventListener("pointermove", move);
          o.removeEventListener("pointerenter", enter);
          o.removeEventListener("pointerleave", leave);
        };
      });
      return () => mm.revert();
    },
    { scope: outer },
  );

  return (
    <div ref={outer} className={cn("h-full", className)} data-cursor={cursor}>
      <div ref={inner} className="relative h-full will-change-transform">
        {children}
        <div
          ref={glare}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-soft-light"
          style={{ background: "radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,0.9), rgba(255,255,255,0) 55%)" }}
        />
      </div>
    </div>
  );
}
