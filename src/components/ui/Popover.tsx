"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Lightweight anchored popover (citation, share, quick actions).
 * The trigger is a real <button> with aria-expanded; Esc and outside-click close it,
 * and focus returns to the trigger.
 */
export function Popover({
  trigger,
  triggerLabel,
  triggerClassName,
  children,
  align = "end",
  side = "bottom",
  panelClassName,
}: {
  trigger: ReactNode;
  /** Accessible name when the trigger is icon-only. */
  triggerLabel?: string;
  triggerClassName?: string;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  side?: "top" | "bottom";
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const wasOpen = useRef(false);
  const skipFocus = useRef(false);

  // Return focus to the trigger whenever the panel closes.
  useEffect(() => {
    if (wasOpen.current && !open && !skipFocus.current) btn.current?.focus();
    skipFocus.current = false;
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) {
        skipFocus.current = true; // user clicked elsewhere — leave focus there
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={wrap} className="relative inline-flex">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={triggerLabel}
        title={triggerLabel}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label={triggerLabel}
          className={cn(
            "absolute z-40 w-72 max-w-[calc(100vw-32px)] animate-[pop-in_140ms_ease-out] rounded-3xl bg-surface p-4 shadow-pop ring-1 ring-line",
            side === "bottom" ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]",
            align === "end" ? "right-0" : "left-0",
            panelClassName,
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </div>
  );
}
