"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MQ, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

/**
 * On each page (re)mount: an ink + lime curtain wipes up off the screen while the new
 * page rises in from a slight blur. Skipped on the very first load (the hero has its
 * own intro) and with reduced motion.
 */
let firstLoad = true;

export function PageTransition({ children }: { children: ReactNode }) {
  const page = useRef<HTMLDivElement>(null);
  const curtain = useRef<HTMLDivElement>(null);
  const accent = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const isFirst = firstLoad;
    firstLoad = false;
    const mm = gsap.matchMedia();
    mm.add(MQ.motion, () => {
      if (isFirst) {
        gsap.set([curtain.current, accent.current], { yPercent: -100 });
        return;
      }
      const tl = gsap.timeline({ onComplete: () => ScrollTrigger.refresh() });
      tl.set([curtain.current, accent.current], { yPercent: 0 })
        .to(curtain.current, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, 0)
        .to(accent.current, { yPercent: -100, duration: 0.9, ease: "expo.inOut" }, 0.08)
        .from(page.current, { y: 40, autoAlpha: 0, filter: "blur(8px)", duration: 0.9, ease: "expo.out", clearProps: "filter,transform" }, 0.35);
    });
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set([curtain.current, accent.current], { yPercent: -100 });
    });
    return () => mm.revert();
  });

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[80]">
        <div ref={accent} className="absolute inset-0 -translate-y-full bg-lime" />
        <div ref={curtain} className="absolute inset-0 -translate-y-full bg-ink" />
      </div>
      <div ref={page}>{children}</div>
    </>
  );
}
