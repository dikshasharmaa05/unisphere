import type { ComponentProps, ElementType } from "react";
import { cn } from "@/lib/cn";

export type Tone = "surface" | "bg" | "ink" | "lime" | "seafoam" | "aqua" | "pink" | "stone";

export const toneClass: Record<Tone, string> = {
  surface: "bg-surface text-ink",
  bg: "bg-bg text-ink",
  ink: "bg-ink text-white",
  lime: "bg-lime text-ink",
  seafoam: "bg-seafoam text-ink",
  aqua: "bg-aqua text-ink",
  pink: "bg-pink text-ink",
  stone: "bg-stone text-ink",
};

const radii = { tile: "rounded-[22px]", card: "rounded-[28px]", panel: "rounded-[32px]", hero: "rounded-[40px]" };

type CardProps<T extends ElementType> = {
  as?: T;
  tone?: Tone;
  radius?: keyof typeof radii;
} & Omit<ComponentProps<T>, "as">;

/** Large rounded surface. Polymorphic: `as="article"`, `as="section"`, etc. */
export function Card<T extends ElementType = "div">({ as, tone = "surface", radius = "card", className, ...rest }: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return <Tag className={cn(toneClass[tone], radii[radius], className)} {...rest} />;
}
