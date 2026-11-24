import Link from "next/link";
import { issues as sampleIssues, type IssuePreview } from "@/lib/placeholder-data";
import { ButtonLink } from "@/components/ui/Button";
import { toneClass } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { cn } from "@/lib/cn";
import { Eyebrow, SectionTitle } from "./SectionHeading";

export function ArchivePreview({ issues = sampleIssues }: { issues?: IssuePreview[] }) {
  return (
    <section aria-labelledby="archive-title" className="container-page flex flex-wrap gap-10 pt-24 sm:pt-[120px]">
      <div className="flex-[1_1_340px]">
        <Eyebrow>03 — Archive</Eyebrow>
        <SectionTitle id="archive-title">
          Every issue,
          <br />
          permanently on record.
        </SectionTitle>
        <p className="mt-[18px] max-w-[380px] text-base leading-relaxed text-muted">
          Each published paper keeps its volume, issue and DOI forever — so it can be cited with confidence.
        </p>
        <Magnetic className="mt-7">
          <ButtonLink href="/archive" variant="signature" size="md">
            Browse the archive
          </ButtonLink>
        </Magnetic>
      </div>
      <Reveal as="ul" stagger variant="slide" className="flex flex-[2_1_560px] flex-col gap-2.5">
        {issues.map((i) => (
          <li key={i.short}>
            <Link
              href={i.href}
              className="group relative flex items-center gap-4 overflow-hidden rounded-[22px] bg-surface px-[22px] py-5 sm:gap-5"
            >
              <span aria-hidden="true" className="absolute inset-0 origin-left scale-x-0 bg-lime/50 transition-transform duration-700 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-x-100" />
              <span
                aria-hidden="true"
                className={cn(
                  "relative flex h-20 w-16 shrink-0 items-end rounded-[10px] p-2 font-mono text-[10px] shadow-[0_6px_14px_rgb(20_26_25/0.08)] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110",
                  toneClass[i.cover],
                )}
              >
                {i.short}
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="block text-lg font-bold">{i.label}</span>
                <span className="mt-1 block text-[13px] text-muted">{i.sub}</span>
                <span className="mt-1 block font-mono text-xs text-muted sm:hidden">{i.count ?? "[n] articles"}</span>
              </span>
              <span className="relative hidden font-mono text-xs text-muted sm:inline">{i.count ?? "[n] articles"}</span>
              <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-bg transition-all duration-500 group-hover:-rotate-45 group-hover:bg-ink group-hover:text-white">
                <Icon name="arrowRight" strokeWidth={2.2} />
              </span>
            </Link>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
