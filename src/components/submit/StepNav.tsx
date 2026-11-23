"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

/** Back / Continue row at the bottom of each step. */
export function StepNav({
  backHref,
  onContinue,
  continueLabel = "Continue",
  busy = false,
  disabled = false,
}: {
  backHref?: string;
  onContinue: () => void;
  continueLabel?: string;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-[#ECEFEC] pt-5">
      {backHref ? (
        <Link href={backHref} className="inline-flex h-[54px] items-center rounded-full bg-bg px-6 text-[15px] font-bold hover:bg-line">
          Back
        </Link>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onContinue}
        disabled={busy || disabled}
        aria-busy={busy}
        className="nudge-arrow inline-flex h-[54px] items-center gap-4 rounded-full bg-ink pl-6 pr-[7px] text-[15px] font-bold text-white hover:bg-[#26302e] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Saving…" : continueLabel}
        <span className="inline-flex size-10 items-center justify-center rounded-full bg-lime text-ink">
          <Icon name="arrowRight" strokeWidth={2.2} />
        </span>
      </button>
    </div>
  );
}

export function StepHeading({ step, title, children }: { step: number; title: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-xs text-teal-deep">Step {step} of 4</p>
      <h2 className="mt-2 text-[28px] font-extrabold tracking-[-0.025em]">{title}</h2>
      {children && <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>}
    </div>
  );
}
