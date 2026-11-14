"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input, Checkbox } from "@/components/ui/Input";
import { SubmitPill } from "@/components/ui/Button";
import { Icon, LogoMark } from "@/components/ui/Icon";
import { journal } from "@/config/journal";
import { cn } from "@/lib/cn";

type Mode = "signin" | "register";
type Ctx = { openAuth: (mode?: Mode) => void };

const AuthModalContext = createContext<Ctx | null>(null);

export function useAuthModal(): Ctx {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used inside <AuthModalProvider>");
  return ctx;
}

/** Hosts the single sign-in / register pop-up used across the public site. */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const openAuth = useCallback((m: Mode = "signin") => {
    setMode(m);
    setOpen(true);
  }, []);
  const value = useMemo(() => ({ openAuth }), [openAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="auth-title" size="lg">
        <AuthPanel mode={mode} setMode={setMode} />
      </Modal>
    </AuthModalContext.Provider>
  );
}

/** Button that opens the auth pop-up (usable from server components). */
export function AuthTrigger({ mode = "signin", className, children }: { mode?: Mode; className?: string; children: ReactNode }) {
  const { openAuth } = useAuthModal();
  return (
    <button type="button" className={className} onClick={() => openAuth(mode)}>
      {children}
    </button>
  );
}

const perks = ["Read full papers, figures and video", "Comment, like and share research", "Submit and track your own articles"];

function AuthPanel({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  const reg = mode === "register";
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap">
      {/* Brand side */}
      <div className="relative hidden min-h-[300px] flex-[1_1_340px] flex-col justify-between overflow-hidden bg-seafoam p-10 md:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-36 size-[520px] rounded-full opacity-80"
          style={{
            background:
              "radial-gradient(circle at 40% 35%, rgba(255,255,255,.85), rgba(191,231,220,.25) 70%), radial-gradient(#2E9C88 1.2px, transparent 1.4px) 0 0/14px 14px",
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <LogoMark size={40} />
          <span className="text-lg font-extrabold">{journal.name}</span>
        </div>
        <div className="relative max-w-[300px]">
          <p className="text-[30px] font-extrabold leading-[1.08] tracking-[-0.035em]">Join a global community of researchers.</p>
          <ul className="mt-[18px] flex flex-col gap-2.5 text-sm text-[#1f3631]">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-2.5">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface text-teal-deep">
                  <Icon name="check" size={12} strokeWidth={3} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-[1_1_420px] p-6 pt-8 sm:p-10">
        <div role="tablist" aria-label="Account" className="inline-flex gap-1 rounded-full bg-bg p-[5px]">
          {(["signin", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setNotice(null);
              }}
              className={cn(
                "h-[42px] rounded-full px-5 text-sm font-bold transition-colors",
                mode === m ? "bg-ink text-white" : "text-ink hover:bg-line",
              )}
            >
              {m === "signin" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>

        <h2 id="auth-title" className="mt-6 text-[30px] font-extrabold tracking-[-0.03em]">
          {reg ? "Create your free account" : "Welcome back"}
        </h2>
        <p className="mt-2 text-sm text-muted">
          {reg ? "Free for readers and authors. Takes under a minute." : "Sign in to read full papers and join the discussion."}
        </p>

        <form
          className="mt-6 flex flex-col gap-3.5"
          onSubmit={(e) => {
            e.preventDefault();
            // Phase 2 wires this to Supabase Auth (server action + zod validation).
            setNotice("Accounts open soon — sign-in is being connected in the next build phase.");
          }}
        >
          {reg && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
              <Input label="Full name" name="fullName" autoComplete="name" required />
              <Input label="Institution" name="institution" autoComplete="organization" />
            </div>
          )}
          <Input label="Email" type="email" name="email" placeholder="you@university.edu" autoComplete="email" required />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete={reg ? "new-password" : "current-password"}
            minLength={8}
            required
          />
          {!reg && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <Checkbox label="Keep me signed in" name="remember" />
              <a href="#" className="font-bold text-teal-deep hover:text-ink">
                Forgot password?
              </a>
            </div>
          )}
          <SubmitPill className="mt-1">{reg ? "Create account" : "Sign in"}</SubmitPill>
          {notice && (
            <p role="status" className="rounded-2xl bg-aqua px-4 py-3 text-[13px] font-semibold text-teal-deep">
              {notice}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            or continue with
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {["ORCID", "Google"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setNotice(`${p} sign-in is being connected in the next build phase.`)}
                className="h-[52px] rounded-full border border-line-strong bg-surface text-sm font-bold hover:bg-bg"
              >
                {p}
              </button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
