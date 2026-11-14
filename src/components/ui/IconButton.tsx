import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

export type IconButtonTone = "ink" | "soft" | "lime" | "white";

const tones: Record<IconButtonTone, string> = {
  ink: "bg-ink text-white hover:bg-[#26302e]",
  soft: "bg-bg text-ink hover:bg-line",
  lime: "bg-lime text-ink hover:bg-[#dff0a0]",
  white: "bg-surface text-ink hover:bg-bg",
};

const base =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:opacity-50";

type Common = { icon: IconName; label: string; tone?: IconButtonTone; iconSize?: number; className?: string };

/** 44px circular icon button. `label` is required and becomes the accessible name. */
export function IconButton({
  icon,
  label,
  tone = "ink",
  iconSize = 16,
  className,
  type = "button",
  ...rest
}: Common & Omit<ComponentProps<"button">, "className" | "children" | "aria-label">) {
  return (
    <button type={type} aria-label={label} title={label} className={cn(base, tones[tone], className)} {...rest}>
      <Icon name={icon} size={iconSize} />
    </button>
  );
}

export function IconLink({
  icon,
  label,
  tone = "ink",
  iconSize = 16,
  className,
  ...rest
}: Common & Omit<ComponentProps<typeof Link>, "className" | "children" | "aria-label">) {
  return (
    <Link aria-label={label} title={label} className={cn(base, tones[tone], className)} {...rest}>
      <Icon name={icon} size={iconSize} />
    </Link>
  );
}
