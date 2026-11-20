"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, MQ, SplitText, useGSAP } from "@/lib/motion/gsap";
import { cn } from "@/lib/cn";

/** Words light up one by one as you scroll through the block (scroll-scrubbed). */
export function ScrubWords({ as: Tag = "h2", children, className, id }: { as?: ElementType; children: ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const el = ref.current!;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const split = SplitText.create(el, {
          type: "words",
          autoSplit: true,
          aria: "auto",
          onSplit(self) {
            return gsap.fromTo(
              self.words,
              { opacity: 0.14 },
              { opacity: 1, ease: "none", stagger: 0.1, scrollTrigger: { trigger: el, start: "top 85%", end: "top 35%", scrub: 0.6 } },
            );
          },
        });
        return () => split.revert();
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} id={id} className={cn(className)}>
      {children}
    </Tag>
  );
}
