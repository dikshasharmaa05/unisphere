import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow text-muted", className)}>{children}</p>;
}

export function SectionTitle({ children, className, as: Tag = "h2" }: { children: ReactNode; className?: string; as?: "h2" | "h3" }) {
  return (
    <Tag className={cn("mt-3.5 text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em]", className)}>
      {children}
    </Tag>
  );
}
