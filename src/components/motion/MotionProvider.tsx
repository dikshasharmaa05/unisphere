"use client";

import "lenis/dist/lenis.css";
import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";
import { gsap, motionState, prefersReducedMotion, ScrollTrigger } from "@/lib/motion/gsap";
import { Cursor } from "./Cursor";
import { ScrollProgress } from "./ScrollProgress";

/**
 * Smooth (inertial) scrolling via Lenis, synced to GSAP ScrollTrigger, plus the
 * custom cursor and scroll-progress bar. Disabled entirely for reduced motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      anchors: { offset: -16 },
      // Let dialogs, popovers and scrollable panels scroll natively.
      prevent: (node) => !!node.closest("dialog, [role='dialog'], [data-lenis-prevent]"),
    });
    motionState.lenis = lenis;

    lenis.on("scroll", (e: Lenis) => {
      motionState.velocity = e.velocity;
      ScrollTrigger.update();
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      motionState.lenis = null;
      motionState.velocity = 0;
    };
  }, []);

  return (
    <>
      <ScrollProgress />
      {children}
      <Cursor />
    </>
  );
}
