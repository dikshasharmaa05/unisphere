"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { AuthPanel, type AuthMode } from "./AuthPanel";

type Ctx = { openAuth: (mode?: AuthMode, next?: string) => void };

const AuthModalContext = createContext<Ctx | null>(null);

export function useAuthModal(): Ctx {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used inside <AuthModalProvider>");
  return ctx;
}

/** Hosts the single sign-in / register pop-up used across the public site. */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [next, setNext] = useState("");
  const [session, setSession] = useState(0); // remounts the panel each time it opens

  const openAuth = useCallback((m: AuthMode = "signin", n = "") => {
    setMode(m);
    setNext(n);
    setSession((s) => s + 1);
    setOpen(true);
  }, []);

  const onSignedIn = useCallback(
    (dest: string) => {
      setOpen(false);
      if (dest) router.push(dest);
      router.refresh();
    },
    [router],
  );

  const value = useMemo(() => ({ openAuth }), [openAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="auth-title" size="lg">
        {open && <AuthPanel key={session} initialMode={mode} next={next} onSignedIn={onSignedIn} />}
      </Modal>
    </AuthModalContext.Provider>
  );
}

/** Button that opens the auth pop-up (usable from server components). */
export function AuthTrigger({
  mode = "signin",
  next,
  className,
  children,
}: {
  mode?: AuthMode;
  next?: string;
  className?: string;
  children: ReactNode;
}) {
  const { openAuth } = useAuthModal();
  return (
    <button type="button" className={className} onClick={() => openAuth(mode, next)}>
      {children}
    </button>
  );
}
