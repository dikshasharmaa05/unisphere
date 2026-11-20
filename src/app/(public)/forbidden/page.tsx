import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { journal } from "@/config/journal";

export const metadata: Metadata = { title: "No access", robots: { index: false } };

export default function ForbiddenPage() {
  return (
    <section className="container-page pt-6">
      <div className="rounded-[40px] bg-surface p-[clamp(24px,5vw,64px)]">
        <p className="eyebrow text-muted">403 · No access</p>
        <h1 className="mt-3.5 text-[clamp(34px,4.4vw,56px)] font-extrabold leading-none tracking-[-0.045em]">This area is for the editorial team.</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Your account doesn’t have access to this page. If you think it should, contact the editorial office at {journal.editorialEmail}.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/dashboard" variant="signature" size="md">
            Go to your dashboard
          </ButtonLink>
          <ButtonLink href="/" variant="soft" size="md">
            Back to the journal
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
