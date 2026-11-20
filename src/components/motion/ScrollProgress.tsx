"use client";

import { useRef } from "react";
import { gsap, MQ, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";

/** Thin teal→lime bar at the top of the viewport showing reading progress. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MQ.motion, () => {
      const set = gsap.quickSetter(bar.current, "scaleX");
      const st = ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => set(self.progress),
      });
      return () => st.kill();
    });
    return () => mm.revert();
  });
  return (
    <div
      ref={bar}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px] origin-left scale-x-0 bg-[linear-gradient(90deg,#2E9C88,#E9F5B8)]"
    />
  );
}
