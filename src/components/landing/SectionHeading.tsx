import type { ReactNode } from "react";
import { Scramble } from "@/components/motion/Scramble";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { cn } from "@/lib/cn";

/** Mono section label that decodes itself on scroll. */
export function Eyebrow({ children, className }: { children: string; className?: string }) {
  return <Scramble className={cn("text-muted", className)}>{children}</Scramble>;
}

/** Section heading whose lines slide up from a mask on scroll. */
export function SectionTitle({ children, className, id, as = "h2" }: { children: ReactNode; className?: string; id?: string; as?: "h2" | "h3" }) {
  return (
    <SplitReveal as={as} id={id} className={cn("mt-3.5 text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em]", className)}>
      {children}
    </SplitReveal>
  );
}
