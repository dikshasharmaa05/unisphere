import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { toneClass, type Tone } from "./Card";

/** Static label: discipline chips, status badges ("In review", "Accepted"). */
export function Pill({
  tone = "seafoam",
  size = "sm",
  className,
  ...rest
}: { tone?: Tone; size?: "xs" | "sm" } & ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex w-max items-center gap-1.5 rounded-full font-bold whitespace-nowrap",
        size === "xs" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs",
        toneClass[tone],
        className,
      )}
      {...rest}
    />
  );
}

/** Toggleable filter chip ("All disciplines", "Life Sciences"…). Uses aria-pressed. */
export function Chip({
  selected = false,
  className,
  type = "button",
  ...rest
}: { selected?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-bold transition-colors",
        selected ? "bg-ink text-white" : "bg-bg text-ink hover:bg-line",
        className,
      )}
      {...rest}
    />
  );
}

/** Mono uppercase label — "Paper No. 237", "Vol. 1 · Issue 3". */
export function MonoLabel({ className, ...rest }: ComponentProps<"span">) {
  return <span className={cn("font-mono text-xs text-muted", className)} {...rest} />;
}
