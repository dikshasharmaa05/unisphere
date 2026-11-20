import { journal } from "@/config/journal";
import { indexes } from "@/lib/placeholder-data";
import { SectionTitle } from "./SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export function Indexing() {
  const facts = [
    { k: "Online ISSN", v: journal.issn },
    { k: "DOI prefix", v: journal.doiPrefix },
    { k: "Publishing frequency", v: journal.frequency },
  ];
  return (
    <section id="indexing" aria-labelledby="index-title" className="container-page scroll-mt-6 pt-24 sm:pt-[120px]">
      <Reveal className="flex flex-wrap items-start gap-10 rounded-[40px] bg-seafoam p-[clamp(24px,4vw,56px)]">
        <div className="flex-[1_1_320px]">
          <p className="eyebrow text-on-seafoam">05 — Indexing</p>
          <SectionTitle>
            <span id="index-title">Discoverable, citable, permanent.</span>
          </SectionTitle>
          <dl className="mt-7 flex flex-col gap-2.5">
            {facts.map((f) => (
              <div key={f.k} className="flex flex-wrap justify-between gap-3 rounded-[18px] bg-white/70 px-[18px] py-4">
                <dt className="font-bold">{f.k}</dt>
                <dd className="font-mono">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Reveal as="ul" stagger delay={150} className="grid flex-[2_1_520px] grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
          {indexes.map((name) => (
            <li key={name} className="lift flex min-h-[130px] flex-col justify-between gap-2 rounded-[22px] bg-surface p-[22px]">
              <span
                aria-hidden="true"
                className="inline-flex size-11 items-center justify-center rounded-xl bg-bg font-mono text-[11px] text-muted"
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
