import Link from "next/link";
import { disciplines } from "@/lib/placeholder-data";
import { toneClass } from "@/components/ui/Card";
import { SearchField } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { Eyebrow, SectionTitle } from "./SectionHeading";

export function Disciplines() {
  return (
    <section aria-labelledby="disc-title" className="container-page pt-24 sm:pt-[120px]">
      <div className="flex flex-wrap gap-10 rounded-[40px] bg-surface p-[clamp(24px,4vw,56px)]">
        <div className="flex-[1_1_320px]">
          <Eyebrow>02 — Browse by discipline</Eyebrow>
          <SectionTitle>
            <span id="disc-title">
              Every field.
              <br />
              One shared library.
            </span>
          </SectionTitle>
          <p className="mt-[18px] max-w-[380px] text-base leading-relaxed text-muted">
            Papers are tagged by discipline and keyword, so readers can follow a field — or wander across into a neighbouring one.
          </p>
          <SearchField
            className="mt-7 max-w-[420px]"
            label="Search the journal"
            placeholder="Title, author, keyword or DOI"
          />
        </div>
        <ul className="grid flex-[2_1_520px] grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          {disciplines.map((d, i) => (
            <li key={d.slug}>
              <Link
                href={`/archive?discipline=${d.slug}`}
                className={cn(
                  "flex h-full min-h-[120px] flex-col justify-between gap-2 rounded-[22px] p-5 transition-transform hover:-translate-y-0.5",
                  toneClass[d.tone],
                )}
              >
                <span className="inline-flex size-[34px] items-center justify-center rounded-full bg-white/75 font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-base font-bold">{d.name}</span>
                <span className="text-xs text-ink-soft">[n] papers</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
