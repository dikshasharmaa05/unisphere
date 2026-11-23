"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { saveDefaultLicenceAction, saveUploadLimitsAction, setReviewModelAction } from "@/lib/editorial/actions";
import { FILE_KINDS } from "@/lib/submissions/labels";
import { Feedback } from "./Feedback";
import { useAction } from "./useAction";

type Limits = Record<string, { maxMb: number; types: string[] } | number>;

export function SettingsManager({ isAdmin, reviewModel, licence, limits }: { isAdmin: boolean; reviewModel: "single_blind" | "double_blind"; licence: string; limits: Limits }) {
  const { run, pending, feedback } = useAction();
  const [pendingModel, setPendingModel] = useState<"single_blind" | "double_blind" | null>(null);
  const kinds = Object.entries(limits).filter(([, v]) => typeof v === "object") as [string, { maxMb: number }][];
  const [mb, setMb] = useState<Record<string, number>>(Object.fromEntries(kinds.map(([k, v]) => [k, v.maxMb])));
  const [maxVisual, setMaxVisual] = useState<number>(typeof limits.maxImagesAndFiguresPerVersion === "number" ? limits.maxImagesAndFiguresPerVersion : 20);
  const [lic, setLic] = useState(licence);

  return (
    <>
      {!isAdmin && <p className="rounded-2xl bg-aqua px-4 py-3 text-[13px] font-semibold text-teal-deep">Only admins can change site settings.</p>}
      <Feedback feedback={feedback} />
      <section className="rounded-[32px] bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">Peer review model</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">Enforced by the database: in double-blind mode reviewers never see author names, affiliations, ORCID or identifying files. Authors never see reviewer identities in either mode.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Review model">
          {(
            [
              ["double_blind", "Double-blind", "Neither side knows the other. Recommended."],
              ["single_blind", "Single-blind", "Reviewers see the authors; authors don’t see reviewers."],
            ] as const
          ).map(([value, label, help]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={reviewModel === value}
              disabled={!isAdmin || pending}
              onClick={() => reviewModel !== value && setPendingModel(value)}
              className={cn("rounded-[22px] border-2 p-5 text-left transition-colors disabled:cursor-default", reviewModel === value ? "border-teal-deep bg-aqua" : "border-line hover:bg-bg")}
            >
              <span className="block font-bold">{label}</span>
              <span className="mt-1 block text-sm text-muted">{help}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">Default licence</h2>
        <form
          className="mt-3 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveDefaultLicenceAction(lic));
          }}
        >
          <Input label="Applied to newly published articles" value={lic} onChange={(e) => setLic(e.target.value)} disabled={!isAdmin} className="min-w-0 flex-[1_1_260px]" maxLength={80} />
          <button type="submit" disabled={!isAdmin || pending} className="h-[52px] rounded-full bg-ink px-6 text-sm font-bold text-white disabled:opacity-50">
            Save
          </button>
        </form>
      </section>

      <section className="rounded-[32px] bg-surface p-5 sm:p-7">
        <h2 className="text-xl font-extrabold tracking-[-0.02em]">Upload limits</h2>
        <p className="mt-1 text-sm text-muted">Per file, in MB. The storage plan allows at most 50 MB per file.</p>
        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveUploadLimitsAction(mb, maxVisual));
          }}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-3">
            {kinds.map(([k]) => (
              <Input
                key={k}
                label={FILE_KINDS[k as keyof typeof FILE_KINDS]?.label ?? k}
                type="number"
                min={1}
                max={50}
                value={mb[k] ?? 1}
                onChange={(e) => setMb((s) => ({ ...s, [k]: Number(e.target.value) }))}
                disabled={!isAdmin}
                hint={FILE_KINDS[k as keyof typeof FILE_KINDS]?.hint}
              />
            ))}
            <Input label="Images + figures per version" type="number" min={1} max={100} value={maxVisual} onChange={(e) => setMaxVisual(Number(e.target.value))} disabled={!isAdmin} />
          </div>
          <button type="submit" disabled={!isAdmin || pending} className="h-[52px] w-max rounded-full bg-ink px-6 text-sm font-bold text-white disabled:opacity-50">
            Save limits
          </button>
        </form>
      </section>

      <ConfirmDialog
        open={!!pendingModel}
        onClose={() => setPendingModel(null)}
        onConfirm={() => pendingModel && run(() => setReviewModelAction(pendingModel))}
        title={pendingModel === "single_blind" ? "Switch to single-blind?" : "Switch to double-blind?"}
        body={
          pendingModel === "single_blind"
            ? "Reviewers will immediately see author names, affiliations and ORCID iDs on all open assignments."
            : "Author identities will be hidden from reviewers on all open assignments."
        }
        confirmLabel="Switch"
      />
    </>
  );
}
