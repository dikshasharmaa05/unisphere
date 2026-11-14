import { ButtonLink } from "@/components/ui/Button";

/** Temporary page body for routes built in later phases (keeps nav links from 404ing). */
export function ComingSoon({ eyebrow, title, phase }: { eyebrow: string; title: string; phase: string }) {
  return (
    <section className="container-page pt-10">
      <div className="rounded-[40px] bg-surface p-[clamp(24px,5vw,64px)]">
        <p className="eyebrow text-muted">{eyebrow}</p>
        <h1 className="mt-3.5 text-[clamp(34px,4.4vw,56px)] font-extrabold leading-none tracking-[-0.045em]">{title}</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">This page is being built — it arrives in {phase}.</p>
        <ButtonLink href="/" variant="signature" size="md" className="mt-8">
          Back to the journal
        </ButtonLink>
      </div>
    </section>
  );
}
