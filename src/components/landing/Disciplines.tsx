import Link from "next/link";
import { disciplines } from "@/lib/placeholder-data";
import { toneClass } from "@/components/ui/Card";
import { SearchField } from "@/components/ui/Input";
import { Reveal } from "@/components/ui/Reveal";
import { Spotlight } from "@/components/motion/Spotlight";
import { cn } from "@/lib/cn";
import { Eyebrow, SectionTitle } from "./SectionHeading";

export function Disciplines() {
  return (
    <section aria-labelledby="disc-title" className="container-page pt-24 sm:pt-[120px]">
      <Reveal variant="blur" className="flex flex-wrap gap-10 rounded-[40px] bg-surface p-[clamp(24px,4vw,56px)]">
        <div className="flex-[1_1_320px]">
          <Eyebrow>02 — Browse by discipline</Eyebrow>
          <SectionTitle id="disc-title">
            Every field.
            <br />
            One shared library.
          </SectionTitle>
          <p className="mt-[18px] max-w-[380px] text-base leading-relaxed text-muted">
            Papers are tagged by discipline and keyword, so readers can follow a field — or wander across into a neighbouring one.
          </p>
          <SearchField className="mt-7 max-w-[420px]" label="Search the journal" placeholder="Title, author, keyword or DOI" />
        </div>
        <Spotlight className="flex-[2_1_520px]">
          <Reveal as="ul" stagger variant="flip" delay={150} className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
            {disciplines.map((d, i) => (
              <li key={d.slug}>
                <Link
                  href={`/archive?discipline=${d.slug}`}
                  data-spot=""
                  className={cn(
                    "group relative flex h-full min-h-[120px] flex-col justify-between gap-2 overflow-hidden rounded-[22px] p-5 transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-1",
                    toneClass[d.tone],
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: "radial-gradient(220px circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.75), transparent 70%)" }}
                  />
                  <span className="relative inline-flex size-[34px] items-center justify-center rounded-full bg-white/75 font-mono text-xs transition-transform duration-500 group-hover:rotate-[360deg]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="relative text-base font-bold">{d.name}</span>
                  <span className="relative flex items-center justify-between text-xs text-ink-soft">
                    [n] papers
                    <span aria-hidden="true" className="translate-x-[-6px] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </Reveal>
        </Spotlight>
      </Reveal>
    </section>
  );
}
