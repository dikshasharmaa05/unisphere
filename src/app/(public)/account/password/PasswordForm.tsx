"use client";

import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { useFormAction } from "@/components/auth/useFormAction";
import { updatePasswordAction } from "@/lib/auth/actions";

export function PasswordForm() {
  const { state, pending, onSubmit } = useFormAction(updatePasswordAction);
  const fields = state.status === "error" ? state.fields : undefined;

  if (state.status === "success") {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p className="rounded-2xl bg-aqua px-4 py-3 text-sm font-semibold text-teal-deep">{state.message}</p>
        <Link href="/account" className="inline-flex h-[54px] w-max items-center rounded-full bg-ink px-7 text-[15px] font-bold text-white">
          Back to your account
        </Link>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {state.status === "error" && state.message && (
        <p role="alert" className="rounded-2xl bg-pink px-4 py-3 text-[13px] font-semibold text-[#7a1631]">
          {state.message}
        </p>
      )}
      <Input label="New password" type="password" name="password" autoComplete="new-password" required error={fields?.password} hint="At least 8 characters." />
      <Input label="Confirm new password" type="password" name="confirm" autoComplete="new-password" required error={fields?.confirm} />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="mt-2 h-[54px] rounded-full bg-ink text-[15px] font-bold text-white hover:bg-[#26302e] disabled:cursor-wait disabled:opacity-80"
      >
        {pending ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}
