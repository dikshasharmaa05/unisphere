"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type State = { status: "idle" | "saving" | "saved" | "error"; at?: Date; message?: string };
type Ctx = State & { saving: () => void; saved: (at?: string) => void; failed: (message: string) => void };

const SaveCtx = createContext<Ctx | null>(null);

export function SaveStatusProvider({ initialSavedAt, children }: { initialSavedAt: string; children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "saved", at: new Date(initialSavedAt) });
  const saving = useCallback(() => setState((s) => ({ ...s, status: "saving" })), []);
  const saved = useCallback((at?: string) => setState({ status: "saved", at: at ? new Date(at) : new Date() }), []);
  const failed = useCallback((message: string) => setState((s) => ({ ...s, status: "error", message })), []);
  const value = useMemo(() => ({ ...state, saving, saved, failed }), [state, saving, saved, failed]);
  return <SaveCtx.Provider value={value}>{children}</SaveCtx.Provider>;
}

export function useSaveStatus() {
  const ctx = useContext(SaveCtx);
  if (!ctx) throw new Error("useSaveStatus must be used inside <SaveStatusProvider>");
  return ctx;
}

/** "Draft saved · 14:05" indicator from the design. */
export function SaveBadge() {
  const { status, at, message } = useSaveStatus();
  const time = at?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-[13px] text-muted">
      <span
        aria-hidden="true"
        className={
          status === "saving"
            ? "size-2 animate-pulse rounded-full bg-teal"
            : status === "error"
              ? "size-2 rounded-full bg-[#b4234a]"
              : "size-2 rounded-full bg-teal"
        }
      />
      {status === "saving" ? "Saving…" : status === "error" ? (message ?? "Not saved") : `Draft saved · ${time}`}
    </span>
  );
}
