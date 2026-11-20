"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";

/**
 * Hero choreography:
 *  intro  — eyebrow/copy/buttons rise in after the headline, the globe spins in from
 *           small, hotspots pop out, the strip cards flip up.
 *  scroll — copy drifts up and fades, the globe sinks and shrinks (parallax).
 * Targets are found by data attributes inside this wrapper.
 */
export function HeroMotion({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current!;
      const q = gsap.utils.selector(root);
      const items = q("[data-hero-item]");
      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        gsap.set(items, { autoAlpha: 0, y: 34 });
        items.forEach((el) => el.classList.add("is-ready"));

        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.fromTo(q("[data-hero-globe]"), { scale: 0.55, autoAlpha: 0, rotation: -35 }, { scale: 1, autoAlpha: 1, rotation: 0, duration: 2.2 }, 0)
          .to(items, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.09 }, 0.55)
          .from(q("[data-hero-rail] > *"), { x: -40, autoAlpha: 0, duration: 0.9, stagger: 0.07 }, 0.6)
          .from(q("[data-hero-hotspot]"), { scale: 0, autoAlpha: 0, duration: 0.9, stagger: 0.14, ease: "back.out(2.6)" }, 1.1)
          .from(
            q("[data-hero-card]"),
            { y: 90, rotationX: -35, autoAlpha: 0, transformPerspective: 1000, transformOrigin: "50% 100%", duration: 1.3, stagger: 0.12 },
            0.9,
          );

        // Scroll parallax
        gsap.to(q("[data-hero-copy]"), {
          yPercent: -14,
          autoAlpha: 0.15,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(q("[data-hero-globe-wrap]"), {
          yPercent: 22,
          scale: 0.82,
          ease: "none",
          scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: true },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        items.forEach((el) => el.classList.add("is-ready"));
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
