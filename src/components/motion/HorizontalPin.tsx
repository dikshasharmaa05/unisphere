"use client";

import { useRef, type ReactNode } from "react";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { cn } from "@/lib/cn";

/**
 * Desktop (≥1024px, motion allowed): pins the section and scrolls [data-hpin-track]
 * sideways as you scroll down; [data-hpin-progress] fills; [data-hpin-num] numerals
 * drift inside their cards; cards straighten as they arrive.
 * Mobile / reduced motion: a normal vertical layout (no pinning).
 */
export function HorizontalPin({ children, className, id, labelledBy }: { children: ReactNode; className?: string; id?: string; labelledBy?: string }) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = ref.current!;
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add(MQ.desktopMotion, () => {
        const track = q("[data-hpin-track]")[0] as HTMLElement | undefined;
        if (!track) return;
        const distance = () => {
          const pad = parseFloat(getComputedStyle(track.parentElement!).paddingLeft) || 0;
          return Math.max(0, track.scrollWidth + pad - window.innerWidth + 32);
        };
        const bar = q("[data-hpin-progress]");

        const scroller = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => gsap.set(bar, { scaleX: self.progress }),
          },
        });

        q("[data-hpin-card]").forEach((card) => {
          gsap.fromTo(
            card,
            { rotation: 5, y: 40, scale: 0.94 },
            {
              rotation: 0,
              y: 0,
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: card, containerAnimation: scroller, start: "left 100%", end: "left 55%", scrub: true },
            },
          );
          const num = card.querySelector("[data-hpin-num]");
          if (num) {
            gsap.fromTo(
              num,
              { xPercent: 35 },
              { xPercent: -25, ease: "none", scrollTrigger: { trigger: card, containerAnimation: scroller, start: "left right", end: "right left", scrub: true } },
            );
          }
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id={id} aria-labelledby={labelledBy} className={cn(className)}>
      {children}
    </section>
  );
}
