"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/Input";
import { Icon, LogoMark } from "@/components/ui/Icon";
import { journal } from "@/config/journal";
import {
  forgotPasswordAction,
  oauthAction,
  resendConfirmationAction,
  signInAction,
  signUpAction,
  type ActionState,
} from "@/lib/auth/actions";
import { enabledProviders } from "@/lib/auth/providers";
import { cn } from "@/lib/cn";
import { useFormAction } from "./useFormAction";

export type AuthMode = "signin" | "register" | "forgot";

const perks = ["Read full papers, figures and video", "Comment, like and share research", "Submit and track your own articles"];

/** Sign in · Register · Forgot password — used in the pop-up and on /sign-in. */
export function AuthPanel({
  initialMode = "signin",
  next = "",
  notice,
  onSignedIn,
  titleId = "auth-title",
  showBrand = true,
}: {
  initialMode?: AuthMode;
  next?: string;
  /** Message shown above the form (e.g. "Sign in to continue to Submit"). */
  notice?: string;
  onSignedIn: (next: string) => void;
  titleId?: string;
  showBrand?: boolean;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [sentTo, setSentTo] = useState<{ email: string; kind: "verify" | "reset" } | null>(null);

  const heading = sentTo
    ? "Check your email"
    : mode === "register"
      ? "Create your free account"
      : mode === "forgot"
        ? "Reset your password"
        : "Welcome back";
  const sub = sentTo
    ? null
    : mode === "register"
      ? "Free for readers and authors. Takes under a minute."
      : mode === "forgot"
        ? "Enter your account email and we’ll send you a reset link."
        : "Sign in to read full papers and join the discussion.";

  return (
    <div className="flex flex-wrap">
      {showBrand && (
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
      )}

      <div className="flex-[1_1_420px] p-6 pt-8 sm:p-10">
        {!sentTo && mode !== "forgot" && (
          <div role="tablist" aria-label="Account" className="inline-flex gap-1 rounded-full bg-bg p-[5px]">
            {(["signin", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "h-[42px] rounded-full px-5 text-sm font-bold transition-colors",
                  mode === m ? "bg-ink text-white" : "text-ink hover:bg-line",
                )}
              >
                {m === "signin" ? "Sign in" : "Register"}
              </button>
            ))}
          </div>
        )}

        <h2 id={titleId} className={cn("text-[30px] font-extrabold tracking-[-0.03em]", sentTo || mode === "forgot" ? "mt-2" : "mt-6")}>
          {heading}
        </h2>
        {sub && <p className="mt-2 text-sm text-muted">{sub}</p>}
        {notice && !sentTo && (
          <p className="mt-4 rounded-2xl bg-lime px-4 py-3 text-[13px] font-semibold text-ink">{notice}</p>
        )}

        {sentTo ? (
          <SentView
            email={sentTo.email}
            kind={sentTo.kind}
            onBack={() => {
              setSentTo(null);
              setMode("signin");
            }}
          />
        ) : mode === "signin" ? (
          <SignInForm next={next} onSignedIn={onSignedIn} onForgot={() => setMode("forgot")} />
        ) : mode === "register" ? (
          <RegisterForm next={next} onSent={(email) => setSentTo({ email, kind: "verify" })} />
        ) : (
          <ForgotForm onSent={(email) => setSentTo({ email, kind: "reset" })} onBack={() => setMode("signin")} />
        )}

        {!sentTo && mode !== "forgot" && <OAuthButtons next={next} />}
      </div>
    </div>
  );
}

function FormAlert({ state }: { state: ActionState }) {
  if (state.status !== "error" || !state.message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-pink px-4 py-3 text-[13px] font-semibold text-[#7a1631]">
      {state.message}
    </p>
  );
}

function SubmitButton({ pending, children, pendingLabel }: { pending: boolean; children: string; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-1 flex h-14 w-full items-center justify-between rounded-full bg-ink pl-6 pr-[7px] text-[15px] font-bold text-white transition-colors hover:bg-[#26302e] disabled:cursor-wait disabled:opacity-80"
    >
      <span>{pending ? pendingLabel : children}</span>
      <span className="inline-flex size-[42px] items-center justify-center rounded-full bg-lime text-ink">
        {pending ? <Spinner /> : <Icon name="arrowRight" strokeWidth={2.2} />}
      </span>
    </button>
  );
}

function Spinner() {
  return (
    <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-ink/25 border-t-ink motion-reduce:animate-none" />
  );
}

function SignInForm({ next, onSignedIn, onForgot }: { next: string; onSignedIn: (next: string) => void; onForgot: () => void }) {
  const { state, pending, onSubmit } = useFormAction(signInAction);
  const password = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "success") onSignedIn(state.next ?? "");
    if (state.status === "error" && password.current) password.current.value = "";
  }, [state, onSignedIn]);

  const fields = state.status === "error" ? state.fields : undefined;
  return (
    <form className="mt-6 flex flex-col gap-3.5" onSubmit={onSubmit} noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert state={state} />
      {state.status === "error" && state.code === "email_not_confirmed" && state.email && <ResendLink email={state.email} />}
      <Input label="Email" type="email" name="email" placeholder="you@university.edu" autoComplete="email" required error={fields?.email} />
      <Input
        ref={password}
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        required
        error={fields?.password}
      />
      <div className="flex justify-end text-[13px]">
        <button type="button" onClick={onForgot} className="min-h-11 font-bold text-teal-deep hover:text-ink">
          Forgot password?
        </button>
      </div>
      <SubmitButton pending={pending} pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

function RegisterForm({ next, onSent }: { next: string; onSent: (email: string) => void }) {
  const { state, pending, onSubmit } = useFormAction(signUpAction);
  useEffect(() => {
    if (state.status === "success" && state.email) onSent(state.email);
  }, [state, onSent]);

  const fields = state.status === "error" ? state.fields : undefined;
  return (
    <form className="mt-6 flex flex-col gap-3.5" onSubmit={onSubmit} noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert state={state} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3">
        <Input label="Full name" name="fullName" autoComplete="name" required error={fields?.fullName} />
        <Input label="Affiliation" name="affiliation" autoComplete="organization" placeholder="University or institute" error={fields?.affiliation} />
      </div>
      <Input
        label={
          <>
            ORCID iD <span className="font-medium text-muted">· optional</span>
          </>
        }
        name="orcid"
        placeholder="0000-0000-0000-0000"
        inputMode="text"
        autoComplete="off"
        error={fields?.orcid}
        hint="Shown next to your name on published articles."
      />
      <Input label="Email" type="email" name="email" placeholder="you@university.edu" autoComplete="email" required error={fields?.email} />
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        minLength={8}
        required
        error={fields?.password}
        hint="At least 8 characters."
      />
      <SubmitButton pending={pending} pendingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}

function ForgotForm({ onSent, onBack }: { onSent: (email: string) => void; onBack: () => void }) {
  const { state, pending, onSubmit } = useFormAction(forgotPasswordAction);
  useEffect(() => {
    if (state.status === "success" && state.email) onSent(state.email);
  }, [state, onSent]);
  const fields = state.status === "error" ? state.fields : undefined;
  return (
    <form className="mt-6 flex flex-col gap-3.5" onSubmit={onSubmit} noValidate>
      <FormAlert state={state} />
      <Input label="Email" type="email" name="email" placeholder="you@university.edu" autoComplete="email" required error={fields?.email} />
      <SubmitButton pending={pending} pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
      <button type="button" onClick={onBack} className="min-h-11 text-sm font-bold text-teal-deep hover:text-ink">
        Back to sign in
      </button>
    </form>
  );
}

function SentView({ email, kind, onBack }: { email: string; kind: "verify" | "reset"; onBack: () => void }) {
  return (
    <div className="mt-5 flex flex-col gap-4">
      <div role="status" className="flex gap-3 rounded-3xl bg-aqua p-5">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-teal-deep">
          <Icon name="check" strokeWidth={2.6} />
        </span>
        <p className="text-sm leading-relaxed text-ink">
          {kind === "verify" ? (
            <>
              We’ve sent a verification link to <strong className="break-all">{email}</strong>. Open it to activate your account, then sign
              in.
            </>
          ) : (
            <>
              If an account exists for <strong className="break-all">{email}</strong>, a password-reset link is on its way.
            </>
          )}
        </p>
      </div>
      <p className="text-[13px] text-muted">Didn’t get it? Check spam, or wait a minute and resend.</p>
      {kind === "verify" && <ResendLink email={email} />}
      <button type="button" onClick={onBack} className="h-[52px] rounded-full bg-bg text-sm font-bold hover:bg-line">
        Back to sign in
      </button>
    </div>
  );
}

function ResendLink({ email }: { email: string }) {
  const { state, pending, onSubmit } = useFormAction(resendConfirmationAction);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2 text-[13px]">
      <input type="hidden" name="email" value={email} />
      <button type="submit" disabled={pending} className="min-h-11 font-bold text-teal-deep underline underline-offset-2 hover:text-ink disabled:opacity-60">
        {pending ? "Sending…" : "Resend verification email"}
      </button>
      {state.status === "success" && (
        <span role="status" className="font-semibold text-teal-deep">
          {state.message}
        </span>
      )}
      {state.status === "error" && state.message && (
        <span role="alert" className="font-semibold text-[#9b1c3d]">
          {state.message}
        </span>
      )}
    </form>
  );
}

function OAuthButtons({ next }: { next: string }) {
  const providers = enabledProviders();
  if (!providers.length) return null;
  return (
    <div className="mt-3.5 flex flex-col gap-3.5">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" />
        or continue with
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-2.5">
        {providers.map((p) => (
          <form key={p.id} action={oauthAction}>
            <input type="hidden" name="provider" value={p.id} />
            <input type="hidden" name="next" value={next} />
            <OAuthButton label={p.label} />
          </form>
        ))}
      </div>
    </div>
  );
}

function OAuthButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-surface text-sm font-bold hover:bg-bg disabled:opacity-70"
    >
      {pending ? <Spinner /> : null}
      {pending ? `Opening ${label}…` : label}
    </button>
  );
}
