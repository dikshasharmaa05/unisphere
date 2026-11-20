import Link from "next/link";
import { guidelineSteps } from "@/lib/placeholder-data";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { HorizontalPin } from "@/components/motion/HorizontalPin";
import { Magnetic } from "@/components/motion/Magnetic";
import { AnimatedGlobe } from "./AnimatedGlobe";
import { Eyebrow, SectionTitle } from "./SectionHeading";

export function Guidelines() {
  return (
    <HorizontalPin id="guidelines" labelledBy="guide-title" className="scroll-mt-6 overflow-hidden pt-24 sm:pt-[120px] lg:pt-16">
      <div className="container-page flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>04 — Journal guidelines</Eyebrow>
          <SectionTitle id="guide-title" className="max-w-[720px]">
            From manuscript to published in four steps.
          </SectionTitle>
        </div>
        <div className="hidden w-[260px] lg:block" aria-hidden="true">
          <div className="flex justify-between font-mono text-xs text-muted">
            <span>Prepare</span>
            <span>Publish</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div data-hpin-progress="" className="h-full origin-left scale-x-0 rounded-full bg-[linear-gradient(90deg,#2E9C88,#D7EC8C)]" />
          </div>
        </div>
      </div>

      <div className="mt-10 lg:mt-12 lg:pl-[max(32px,calc((100vw-1360px)/2+32px))]">
        <div data-hpin-track="" className="container-page flex flex-col gap-4 lg:mx-0 lg:w-max lg:max-w-none lg:flex-row lg:items-stretch lg:gap-5 lg:px-0 lg:pr-8">
          <ol className="contents">
            {guidelineSteps.map((s) => (
              <li
                key={s.n}
                data-hpin-card=""
                className="relative flex flex-col gap-3 overflow-hidden rounded-[32px] bg-surface p-7 lg:h-[clamp(420px,56vh,540px)] lg:w-[400px] lg:p-9"
              >
                <span
                  data-hpin-num=""
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-4 -top-6 select-none font-extrabold leading-none tracking-[-0.06em] text-seafoam/60 text-[150px] lg:text-[230px]"
                >
                  {String(s.n).padStart(2, "0")}
                </span>
                <span className="relative font-mono text-[13px] text-teal-deep">Step {s.n}</span>
                <span aria-hidden="true" className="relative inline-flex size-12 items-center justify-center rounded-full bg-seafoam text-lg font-extrabold">
                  {s.n}
                </span>
                <h3 className="relative mt-auto text-[28px] font-extrabold tracking-[-0.03em] lg:text-[34px]">{s.title}</h3>
                <p className="relative max-w-[300px] text-[15px] leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>

          <div
            data-hpin-card=""
            className="relative flex min-h-[420px] flex-col gap-[18px] overflow-hidden rounded-[32px] bg-ink p-8 text-white sm:p-9 lg:h-[clamp(420px,56vh,540px)] lg:w-[520px]"
          >
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-[140px] -right-[120px] size-[420px] opacity-70">
              <AnimatedGlobe tone="dark" interactive={false} className="size-full" />
            </div>
            <span className="relative w-max rounded-full bg-lime px-3 py-1.5 text-xs font-bold text-ink">Submissions open</span>
            <h3 className="relative text-[clamp(30px,3vw,40px)] font-extrabold leading-[1.05] tracking-[-0.035em]">Share your research with the world.</h3>
            <p className="relative max-w-[340px] text-[15px] leading-relaxed text-[#C6D0CC]">
              Create a free account, upload your manuscript with figures, graphs and video, and track it through review.
            </p>
            <Magnetic className="relative mt-auto w-max">
              <ButtonLink href="/submit" variant="whiteArrow" size="lg">
                Submit your article
              </ButtonLink>
            </Magnetic>
          </div>

          <Link
            href="/guidelines"
            data-hpin-card=""
            className="group relative flex flex-col justify-between gap-6 overflow-hidden rounded-[32px] bg-lime p-8 lg:h-[clamp(420px,56vh,540px)] lg:w-[340px]"
          >
            <Icon name="download" size={34} strokeWidth={1.6} className="text-ink transition-transform duration-500 group-hover:-translate-y-1" />
            <span className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em]">Author guidelines &amp; manuscript template</span>
            <span className="flex items-center justify-between font-mono text-xs">
              PDF · DOCX
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-ink text-white transition-transform duration-500 group-hover:-rotate-45">
                <Icon name="arrowRight" strokeWidth={2.2} />
              </span>
            </span>
          </Link>
        </div>
      </div>
    </HorizontalPin>
  );
}
