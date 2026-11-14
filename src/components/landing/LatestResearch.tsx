import Link from "next/link";
import { latestPapers } from "@/lib/placeholder-data";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel, Pill } from "@/components/ui/Pill";
import { Eyebrow } from "./SectionHeading";
import { PaperCardActions } from "./PaperCardActions";

export function LatestResearch() {
  return (
    <section aria-labelledby="latest-title" className="container-page pt-24 sm:pt-[120px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow>01 — Latest research</Eyebrow>
          <h2 id="latest-title" className="mt-3.5 text-[clamp(32px,4vw,52px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
            Fresh from the review desk
          </h2>
        </div>
        <ButtonLink href="/archive" variant="whiteArrow" size="sm" className="h-[50px]">
          View all papers
        </ButtonLink>
      </div>

      <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
        {latestPapers.map((p) => (
          <Card as="article" key={p.slug} className="flex min-h-[360px] flex-col gap-4 p-6 sm:p-[26px]">
            <div className="flex items-center justify-between gap-2.5">
              <Pill tone={p.tone}>{p.field}</Pill>
              <MonoLabel>{p.meta}</MonoLabel>
            </div>
            <h3 className="text-[22px] font-bold leading-[1.25] tracking-[-0.02em]">
              <Link href={`/articles/${p.slug}`} className="hover:text-teal-deep">
                {p.title}
              </Link>
            </h3>
            <p className="text-[13px] text-muted">{p.authors}</p>
            <p className="text-[15px] leading-relaxed text-ink-soft">{p.abstract}</p>
            <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-[#ECEFEC] pt-3.5">
              <span className="flex items-center gap-2 text-xs text-muted">
                <Icon name="lock" size={14} />
                Full text for members
              </span>
              <PaperCardActions slug={p.slug} title={p.title} />
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
