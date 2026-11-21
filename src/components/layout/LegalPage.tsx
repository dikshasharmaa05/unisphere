import type { ReactNode } from "react";

/** Readable long-form layout for policy pages (serif body, generous measure). */
export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return (
    <section className="container-page pt-6">
      <div className="mx-auto max-w-[760px] rounded-[32px] bg-surface p-[clamp(24px,5vw,64px)]">
        <p className="eyebrow text-muted">{eyebrow}</p>
        <h1 className="mt-3.5 text-[clamp(34px,4.4vw,52px)] font-extrabold leading-none tracking-[-0.045em]">{title}</h1>
        <p className="mt-4 font-mono text-xs text-muted">Last updated: {updated}</p>
        <div className="legal mt-8 font-serif text-[17px] leading-[1.75] text-ink-soft [&_a]:font-sans [&_a]:font-semibold [&_a]:text-teal-deep [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-[-0.02em] [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-4 [&_strong]:text-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </div>
    </section>
  );
}
