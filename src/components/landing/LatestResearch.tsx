import Link from "next/link";
import { latestPapers } from "@/lib/placeholder-data";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { MonoLabel, Pill } from "@/components/ui/Pill";
import { Reveal } from "@/components/ui/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { TiltCard } from "@/components/motion/TiltCard";
import { Eyebrow, SectionTitle } from "./SectionHeading";
import { PaperCardActions } from "./PaperCardActions";

export function LatestResearch() {
  return (
    <section aria-labelledby="latest-title" className="container-page pt-20 sm:pt-[100px]">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Eyebrow>01 — Latest research</Eyebrow>
          <SectionTitle id="latest-title" className="text-[clamp(32px,4vw,52px)] leading-[1.02]">
            Fresh from the review desk
          </SectionTitle>
        </div>
        <Magnetic>
          <ButtonLink href="/archive" variant="whiteArrow" size="sm" className="h-[50px]">
            View all papers
          </ButtonLink>
        </Magnetic>
      </div>

      <Reveal stagger variant="zoom" className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
        {latestPapers.map((p) => (
          <TiltCard key={p.slug} cursor="Read" className="rounded-[28px]">
            <Card as="article" className="flex h-full min-h-[360px] flex-col gap-4 p-6 sm:p-[26px]">
              <div className="flex items-center justify-between gap-2.5">
                <Pill tone={p.tone}>{p.field}</Pill>
                <MonoLabel>{p.meta}</MonoLabel>
              </div>
              <h3 className="text-[22px] font-bold leading-[1.25] tracking-[-0.02em]">
                <Link href={`/articles/${p.slug}`} className="bg-[linear-gradient(#E9F5B8,#E9F5B8)] bg-[length:0%_40%] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 hover:bg-[length:100%_40%]">
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
          </TiltCard>
        ))}
      </Reveal>
    </section>
  );
}
