"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { useGSAP } from "@gsap/react";
import type Lenis from "lenis";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP);
}

export { gsap, ScrollTrigger, SplitText, useGSAP };

/** Shared, mutable motion state (written by MotionProvider, read by the globe/marquee). */
export const motionState: { velocity: number; lenis: Lenis | null } = { velocity: 0, lenis: null };

/** Media queries used with gsap.matchMedia(). */
export const MQ = {
  motion: "(prefers-reduced-motion: no-preference)",
  fine: "(pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)",
  desktopMotion: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
} as const;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
