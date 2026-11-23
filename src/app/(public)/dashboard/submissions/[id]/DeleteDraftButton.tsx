"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/Modal";
import { deleteDraftAction } from "@/lib/submissions/actions";

export function DeleteDraftButton({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={pending} className="inline-flex h-12 items-center rounded-full bg-bg px-5 text-sm font-bold hover:bg-pink">
        {pending ? "Deleting…" : "Delete draft"}
      </button>
      {error && (
        <p role="alert" className="w-full text-xs font-semibold text-[#9b1c3d]">
          {error}
        </p>
      )}
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this draft?"
        body="The draft and its uploaded files will be deleted. This can’t be undone."
        confirmLabel="Delete draft"
        tone="danger"
        onConfirm={() =>
          startTransition(async () => {
            const res = await deleteDraftAction(submissionId);
            if (res.ok) router.push("/dashboard");
            else setError(res.error);
          })
        }
      />
    </>
  );
}
