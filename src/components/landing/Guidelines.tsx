import Link from "next/link";
import { guidelineSteps } from "@/lib/placeholder-data";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AnimatedGlobe } from "./AnimatedGlobe";
import { Reveal } from "@/components/ui/Reveal";
import { Eyebrow, SectionTitle } from "./SectionHeading";

export function Guidelines() {
  return (
    <section id="guidelines" aria-labelledby="guide-title" className="container-page scroll-mt-6 pt-24 sm:pt-[120px]">
      <Eyebrow>04 — Journal guidelines</Eyebrow>
      <SectionTitle>
        <span id="guide-title">From manuscript to published in four steps.</span>
      </SectionTitle>
      <div className="mt-10 flex flex-wrap gap-5">
        <div className="flex flex-[3_1_600px] flex-col gap-3.5">
          <Reveal as="ol" stagger className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3.5">
            {guidelineSteps.map((s) => (
              <li key={s.n} className="lift flex flex-col gap-3 rounded-[26px] bg-surface p-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13px] text-teal-deep">Step {s.n}</span>
                  <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-full bg-seafoam font-extrabold">
                    {s.n}
                  </span>
                </div>
                <h3 className="text-[19px] font-bold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </Reveal>
          <Link
            href="/guidelines"
            className="lift flex flex-wrap items-center gap-3.5 rounded-[22px] bg-surface px-[22px] py-[18px] hover:bg-[#fbfcfb]"
          >
            <Icon name="download" size={22} strokeWidth={1.8} className="text-teal-deep" />
            <span className="font-bold">Download author guidelines &amp; manuscript template</span>
            <span className="ml-auto font-mono text-xs text-muted">PDF · DOCX</span>
          </Link>
        </div>

        <div className="relative flex min-h-[420px] flex-[2_1_380px] flex-col gap-[18px] overflow-hidden rounded-[32px] bg-ink p-8 text-white sm:p-9">
          <AnimatedGlobe tone="dark" interactive={false} className="pointer-events-none absolute -bottom-[140px] -right-[120px] size-[420px] opacity-70" />
          <span className="relative w-max rounded-full bg-lime px-3 py-1.5 text-xs font-bold text-ink">Submissions open</span>
          <h3 className="relative text-[clamp(30px,3vw,40px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Share your research with the world.
          </h3>
          <p className="relative max-w-[340px] text-[15px] leading-relaxed text-[#C6D0CC]">
            Create a free account, upload your manuscript with figures, graphs and video, and track it through review.
          </p>
          <ButtonLink href="/submit" variant="whiteArrow" size="lg" className="relative mt-auto w-max">
            Submit your article
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
