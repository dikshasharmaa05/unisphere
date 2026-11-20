import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/**
 * Button variants (design system Option A):
 * - signature: grey pill (#E3E7E3) + lime circle with an arrow on the right
 * - ink:       solid ink pill (secondary CTA)
 * - inkArrow:  ink pill + lime arrow circle (form primary, e.g. "Sign in", "Continue")
 * - white:     white pill (on grey/colour backgrounds)
 * - whiteArrow:white pill + lime arrow circle (on dark panels)
 * - soft:      background-grey pill (e.g. "Back")
 * - outline:   white pill with hairline border (e.g. ORCID / Google)
 */
export type ButtonVariant = "signature" | "ink" | "inkArrow" | "white" | "whiteArrow" | "soft" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-3 rounded-full font-bold whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variantClass: Record<ButtonVariant, string> = {
  signature: "bg-line text-ink hover:bg-[#d9dfd9]",
  ink: "bg-ink text-white hover:bg-[#26302e]",
  inkArrow: "bg-ink text-white hover:bg-[#26302e]",
  white: "bg-surface text-ink hover:bg-[#fafbfa] hover:shadow-[0_2px_10px_rgb(20_26_25/0.06)]",
  whiteArrow: "bg-surface text-ink hover:bg-[#fafbfa]",
  soft: "bg-bg text-ink hover:bg-line",
  outline: "border border-line-strong bg-surface text-ink hover:bg-bg",
};

const hasArrow = (v: ButtonVariant) => v === "signature" || v === "inkArrow" || v === "whiteArrow";

// [height, padding without arrow, padding with arrow, circle size, font size]
const sizeClass: Record<ButtonSize, { plain: string; arrow: string; circle: string }> = {
  sm: { plain: "h-11 px-5 text-sm", arrow: "h-12 pl-[22px] pr-1.5 text-sm gap-3.5", circle: "size-9" },
  md: { plain: "h-[54px] px-6 text-[15px]", arrow: "h-[54px] pl-6 pr-[7px] text-[15px] gap-4", circle: "size-10" },
  lg: { plain: "h-[58px] px-7 text-[15px]", arrow: "h-[58px] pl-[26px] pr-[7px] text-[15px] gap-[18px]", circle: "size-11" },
};

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  const s = sizeClass[size];
  return cn(base, variantClass[variant], hasArrow(variant) ? cn(s.arrow, "nudge-arrow") : s.plain, className);
}

function Content({ variant, size, children }: { variant: ButtonVariant; size: ButtonSize; children: ReactNode }) {
  if (!hasArrow(variant)) return <>{children}</>;
  return (
    <>
      <span>{children}</span>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-lime text-ink",
          sizeClass[size].circle,
        )}
      >
        <Icon name="arrowRight" size={size === "lg" ? 18 : 16} strokeWidth={2.2} />
      </span>
    </>
  );
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; className?: string; children: ReactNode };

export function Button({
  variant = "ink",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: Common & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button type={type} className={classes(variant, size, className)} {...rest}>
      <Content variant={variant} size={size}>
        {children}
      </Content>
    </button>
  );
}

export function ButtonLink({
  variant = "ink",
  size = "md",
  className,
  children,
  ...rest
}: Common & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link className={classes(variant, size, className)} {...rest}>
      <Content variant={variant} size={size}>
        {children}
      </Content>
    </Link>
  );
}

/** For full-width form submit buttons where the label sits left and the arrow right. */
export function SubmitPill({ children, className, ...rest }: Omit<ComponentProps<"button">, "type">) {
  return (
    <button
      type="submit"
      className={cn(
        "flex h-14 w-full items-center justify-between rounded-full bg-ink pl-6 pr-[7px] text-[15px] font-bold text-white transition-colors hover:bg-[#26302e] disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
      <span className="inline-flex size-[42px] items-center justify-center rounded-full bg-lime text-ink">
        <Icon name="arrowRight" strokeWidth={2.2} />
      </span>
    </button>
  );
}
