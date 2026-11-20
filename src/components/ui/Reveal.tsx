"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { cn } from "@/lib/cn";

export type RevealVariant = "rise" | "flip" | "slide" | "zoom" | "blur";

const FROM: Record<RevealVariant, gsap.TweenVars> = {
  rise: { y: 60, autoAlpha: 0, filter: "blur(6px)" },
  flip: { rotationX: -75, y: 40, autoAlpha: 0, transformOrigin: "50% 0%", transformPerspective: 900 },
  slide: { x: 80, autoAlpha: 0, clipPath: "inset(0 0 0 100%)" },
  zoom: { scale: 0.88, autoAlpha: 0, y: 30 },
  blur: { autoAlpha: 0, filter: "blur(14px)", scale: 1.04 },
};
const TO: Record<RevealVariant, gsap.TweenVars> = {
  rise: { y: 0, autoAlpha: 1, filter: "blur(0px)" },
  flip: { rotationX: 0, y: 0, autoAlpha: 1 },
  slide: { x: 0, autoAlpha: 1, clipPath: "inset(0 0 0 0%)" },
  zoom: { scale: 1, autoAlpha: 1, y: 0 },
  blur: { autoAlpha: 1, filter: "blur(0px)", scale: 1 },
};

/**
 * Scroll-triggered entrance. `stagger` animates direct children one after another
 * (grid-aware). Content is untouched without JS or with reduced motion.
 */
export function Reveal({
  as: Tag = "div",
  children,
  className,
  stagger = false,
  variant = "rise",
  delay = 0,
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  variant?: RevealVariant;
  delay?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current!;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const targets = stagger ? Array.from(el.children) : [el];
        gsap.fromTo(targets, FROM[variant], {
          ...TO[variant],
          duration: variant === "slide" ? 1.1 : 1.15,
          ease: "expo.out",
          delay: delay / 1000,
          stagger: stagger ? { each: 0.1, grid: "auto", from: "start" } : 0,
          clearProps: "filter,clipPath",
          scrollTrigger: { trigger: el, start: "top 86%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={cn(className)}>
      {children}
    </Tag>
  );
}
