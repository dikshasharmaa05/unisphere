import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getDisciplines, getSubmissionForEdit, getUploadLimits } from "@/lib/submissions/queries";
import { SaveBadge, SaveStatusProvider } from "@/components/submit/SaveStatus";
import { Stepper } from "@/components/submit/Stepper";
import { SubmitAside } from "@/components/submit/SubmitAside";
import { StepDetails } from "@/components/submit/StepDetails";
import { StepAuthors } from "@/components/submit/StepAuthors";
import { StepMedia } from "@/components/submit/StepMedia";
import { StepReview, type ChecklistItem } from "@/components/submit/StepReview";

export const metadata: Metadata = { title: "Submit your article", robots: { index: false } };

export default async function SubmissionWizardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const { id } = await params;
  const { step: stepParam } = await searchParams;
  await requireUser(`/submit/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const submission = await getSubmissionForEdit(id);
  if (!submission) {
    // Not the owner, or nothing open to edit → show its status instead.
    const supabase = await createClient();
    const { data } = await supabase.from("submissions").select("id").eq("id", id).maybeSingle();
    if (data) redirect(`/dashboard/submissions/${id}`);
    notFound();
  }

  const [disciplines, limits, model] = await Promise.all([
    getDisciplines(),
    getUploadLimits(),
    (async () => {
      const supabase = await createClient();
      const { data } = await supabase.from("site_settings").select("value").eq("key", "review_model").maybeSingle();
      return (data?.value as string | undefined) ?? "double_blind";
    })(),
  ]);

  const step = Math.min(4, Math.max(1, Number(stepParam) || 1));
  const isRevision = submission.status === "revision_requested";
  const v = submission.version;
  const hasManuscript = submission.files.some((f) => f.kind === "manuscript");
  const hasCorresponding = submission.authors.some((a) => a.is_corresponding && a.email);
  const checklist: ChecklistItem[] = [
    { ok: v.title.trim().length >= 5, label: "Title (at least 5 characters)", step: 1 },
    { ok: v.abstract.trim().length >= 50, label: "Abstract (at least 50 characters)", step: 1 },
    { ok: submission.discipline_id !== null, label: "Discipline chosen", step: 1 },
    { ok: hasCorresponding, label: "Corresponding author with email", step: 2 },
    { ok: hasManuscript, label: "Manuscript uploaded", step: 3 },
  ];
  const done = [
    checklist.slice(0, 3).every((c) => c.ok),
    hasCorresponding,
    hasManuscript,
    false,
  ];
  const disciplineName = disciplines.find((d) => d.id === submission.discipline_id)?.name ?? null;

  return (
    <SaveStatusProvider initialSavedAt={v.updated_at}>
      <section className="container-page pt-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted">
              {submission.ref} · {isRevision ? `Revision · version ${v.version}` : "New submission"}
            </p>
            <h1 className="mt-3.5 text-[clamp(34px,4.4vw,56px)] font-extrabold leading-none tracking-[-0.045em]">
              {isRevision ? "Revise your article" : "Submit your article"}
            </h1>
          </div>
          <SaveBadge />
        </div>
        {isRevision ? (
          <p className="mt-4 max-w-2xl rounded-2xl bg-pink px-4 py-3 text-sm leading-relaxed text-[#5a1226]">
            The editors asked for changes. Update the details and files below — your earlier version stays on record. Reviewer comments are on
            your{" "}
            <a href={`/dashboard/submissions/${submission.id}`} className="font-bold underline underline-offset-2">
              submission page
            </a>
            .
          </p>
        ) : (
          <p className="mt-3.5 max-w-2xl text-base leading-relaxed text-muted">
            Four short steps. Your submission goes to the editorial team for review before anything is published.
          </p>
        )}

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]">
          <Stepper submissionId={submission.id} current={step} done={done} />
          <div className="min-w-0 rounded-[32px] bg-surface p-[clamp(20px,3.4vw,44px)]">
            {step === 1 && (
              <StepDetails
                submissionId={submission.id}
                locked={isRevision}
                disciplines={disciplines}
                initial={{
                  title: v.title,
                  abstract: v.abstract,
                  disciplineId: submission.discipline_id,
                  articleType: submission.article_type,
                  keywords: submission.keywords,
                }}
              />
            )}
            {step === 2 && <StepAuthors submissionId={submission.id} versionId={v.id} authors={submission.authors} />}
            {step === 3 && (
              <StepMedia submissionId={submission.id} versionId={v.id} files={submission.files} limits={limits} doubleBlind={model === "double_blind"} />
            )}
            {step === 4 && <StepReview submission={submission} disciplineName={disciplineName} checklist={checklist} isRevision={isRevision} />}
          </div>
          <div className="lg:col-span-2 xl:col-span-1">
            <SubmitAside />
          </div>
        </div>
      </section>
    </SaveStatusProvider>
  );
}
