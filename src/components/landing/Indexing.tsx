import { journal } from "@/config/journal";
import { indexes } from "@/lib/placeholder-data";
import { Reveal } from "@/components/ui/Reveal";
import { Scramble } from "@/components/motion/Scramble";
import { ScrubWords } from "@/components/motion/ScrubWords";

export function Indexing() {
  const facts = [
    { k: "Online ISSN", v: journal.issn },
    { k: "DOI prefix", v: journal.doiPrefix },
    { k: "Publishing frequency", v: journal.frequency },
  ];
  return (
    <section id="indexing" aria-labelledby="index-title" className="container-page scroll-mt-6 pt-24 sm:pt-[120px]">
      <Reveal variant="zoom" className="relative flex flex-wrap items-start gap-10 overflow-hidden rounded-[40px] bg-seafoam p-[clamp(24px,4vw,56px)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-32 -top-32 size-[420px] rounded-full bg-aqua/80 blur-3xl motion-safe:animate-[float-y_9s_ease-in-out_infinite]"
        />
        <div className="relative flex-[1_1_320px]">
          <Scramble className="text-on-seafoam">05 — Indexing</Scramble>
          <ScrubWords id="index-title" className="mt-3.5 text-[clamp(34px,4vw,56px)] font-extrabold leading-[1.02] tracking-[-0.04em]">
            Discoverable, citable, permanent.
          </ScrubWords>
          <Reveal as="dl" stagger variant="slide" className="mt-7 flex flex-col gap-2.5">
            {facts.map((f) => (
              <div key={f.k} className="flex flex-wrap justify-between gap-3 rounded-[18px] bg-white/70 px-[18px] py-4">
                <dt className="font-bold">{f.k}</dt>
                <dd className="font-mono">{f.v}</dd>
              </div>
            ))}
          </Reveal>
        </div>
        <Reveal as="ul" stagger variant="flip" delay={150} className="relative grid flex-[2_1_520px] grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
          {indexes.map((name) => (
            <li
              key={name}
              className="group flex min-h-[130px] flex-col justify-between gap-2 rounded-[22px] bg-surface p-[22px] transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-1 hover:rotate-[-1.5deg]"
            >
              <span
                aria-hidden="true"
                className="inline-flex size-11 items-center justify-center rounded-xl bg-bg font-mono text-[11px] text-muted transition-colors duration-300 group-hover:bg-lime group-hover:text-ink"
              >
                logo
              </span>
              <span className="text-base font-bold">{name}</span>
              <span className="w-max rounded-full bg-bg px-2.5 py-1 text-xs font-semibold text-ink-soft">[status]</span>
            </li>
          ))}
        </Reveal>
      </Reveal>
    </section>
  );
}
