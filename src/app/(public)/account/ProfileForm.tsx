"use client";

import { Input } from "@/components/ui/Input";
import { useFormAction } from "@/components/auth/useFormAction";
import { updateProfileAction } from "@/lib/auth/actions";
import { AffiliationField } from "@/components/auth/AffiliationField";

export function ProfileForm({ defaults }: { defaults: { fullName: string; affiliation: string; affiliationRor: string; orcid: string } }) {
  const { state, pending, onSubmit } = useFormAction(updateProfileAction);
  const fields = state.status === "error" ? state.fields : undefined;

  return (
    <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
      <Input label="Full name" name="fullName" defaultValue={defaults.fullName} autoComplete="name" required error={fields?.fullName} />
      <AffiliationField defaultValue={defaults.affiliation} defaultRor={defaults.affiliationRor} error={fields?.affiliation} />
      <Input
        label={
          <>
            ORCID iD <span className="font-medium text-muted">· optional</span>
          </>
        }
        name="orcid"
        defaultValue={defaults.orcid}
        placeholder="0000-0000-0000-0000"
        autoComplete="off"
        error={fields?.orcid}
        hint="Paste your iD or orcid.org link — we check it’s valid. Shown on your published articles."
      />
      <div className="flex flex-wrap items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="h-[54px] rounded-full bg-ink px-7 text-[15px] font-bold text-white hover:bg-[#26302e] disabled:cursor-wait disabled:opacity-80"
        >
          {pending ? "Saving…" : "Save profile"}
        </button>
        {state.status === "success" && (
          <p role="status" className="text-sm font-semibold text-teal-deep">
            {state.message}
          </p>
        )}
        {state.status === "error" && state.message && (
          <p role="alert" className="text-sm font-semibold text-[#9b1c3d]">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
