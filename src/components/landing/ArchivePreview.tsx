import Link from "next/link";
import { issues } from "@/lib/placeholder-data";
import { ButtonLink } from "@/components/ui/Button";
import { toneClass } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { Eyebrow, SectionTitle } from "./SectionHeading";

export function ArchivePreview() {
  return (
    <section aria-labelledby="archive-title" className="container-page flex flex-wrap gap-10 pt-24 sm:pt-[120px]">
      <div className="flex-[1_1_340px]">
        <Eyebrow>03 — Archive</Eyebrow>
        <SectionTitle>
          <span id="archive-title">
            Every issue,
            <br />
            permanently on record.
          </span>
        </SectionTitle>
        <p className="mt-[18px] max-w-[380px] text-base leading-relaxed text-muted">
          Each published paper keeps its volume, issue and DOI forever — so it can be cited with confidence.
        </p>
        <ButtonLink href="/archive" variant="signature" size="md" className="mt-7">
          Browse the archive
        </ButtonLink>
      </div>
      <ul className="flex flex-[2_1_560px] flex-col gap-2.5">
        {issues.map((i) => (
          <li key={i.short}>
            <Link
              href={i.href}
              className="group flex items-center gap-4 rounded-[22px] bg-surface px-[22px] py-5 transition-shadow hover:shadow-[0_8px_30px_rgb(20_26_25/0.06)] sm:gap-5"
            >
              <span
                aria-hidden="true"
                className={cn("flex h-20 w-16 shrink-0 items-end rounded-[10px] p-2 font-mono text-[10px]", toneClass[i.cover])}
              >
                {i.short}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold">{i.label}</span>
                <span className="mt-1 block text-[13px] text-muted">{i.sub}</span>
                <span className="mt-1 block font-mono text-xs text-muted sm:hidden">[n] articles</span>
              </span>
              <span className="hidden font-mono text-xs text-muted sm:inline">[n] articles</span>
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-bg transition-colors group-hover:bg-lime">
                <Icon name="arrowRight" strokeWidth={2.2} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
