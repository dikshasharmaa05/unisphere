"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

/**
 * Accessible modal built on the native <dialog> element:
 * focus is trapped and restored by the browser, Esc closes, the page behind is inert.
 * Clicking the backdrop closes it as well.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  className,
  size = "md",
  hideClose = false,
}: {
  open: boolean;
  onClose: () => void;
  /** id of the element that names the dialog (usually its heading). */
  labelledBy: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  hideClose?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.documentElement.style.overflow = "hidden";
    }
    if (!open && el.open) el.close();
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const widths = { sm: "max-w-[440px]", md: "max-w-[620px]", lg: "max-w-[980px]" };

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-32px)] overflow-visible bg-transparent p-0 text-ink backdrop:bg-[rgb(20_26_25/0.32)] backdrop:backdrop-blur-[6px] open:animate-[pop-in_180ms_ease-out]",
        widths[size],
      )}
    >
      <div
        className={cn(
          "relative max-h-[calc(100dvh-32px)] overflow-y-auto rounded-[32px] bg-surface shadow-modal sm:rounded-[40px]",
          className,
        )}
      >
        {!hideClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 inline-flex size-11 items-center justify-center rounded-full bg-bg text-ink hover:bg-line sm:right-6 sm:top-6"
          >
            <Icon name="close" strokeWidth={2.2} />
          </button>
        )}
        {children}
      </div>
    </dialog>
  );
}

/** Small confirmation dialog for destructive or irreversible actions. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirm",
  tone = "ink",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  tone?: "ink" | "danger";
}) {
  const id = "confirm-title";
  return (
    <Modal open={open} onClose={onClose} labelledBy={id} size="sm" hideClose>
      <div className="p-7 sm:p-8">
        <h2 id={id} className="text-2xl font-extrabold tracking-[-0.03em]">
          {title}
        </h2>
        <div className="mt-2 text-sm leading-relaxed text-muted">{body}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          <button type="button" onClick={onClose} className="h-12 rounded-full bg-bg px-5 text-sm font-bold hover:bg-line">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "h-12 rounded-full px-5 text-sm font-bold",
              tone === "danger" ? "bg-pink text-[#7a1631] hover:bg-[#f0ccd5]" : "bg-ink text-white hover:bg-[#26302e]",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
