"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Res = { ok: boolean; error?: string; message?: string };

/** Runs a server action, shows its message, refreshes server data on success. */
export function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<Res>, onOk?: () => void) =>
    startTransition(async () => {
      try {
        const res = await fn();
        setFeedback({ ok: res.ok, text: res.ok ? (res.message ?? "Saved.") : (res.error ?? "Something went wrong.") });
        if (res.ok) {
          onOk?.();
          router.refresh();
        }
      } catch {
        setFeedback({ ok: false, text: "You don’t have permission to do that." });
      }
    });
  return { run, pending, feedback, clear: () => setFeedback(null) };
}
