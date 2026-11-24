import Link from "next/link";
import { journal } from "@/config/journal";
import { featuredPaper as sampleFeatured, heroHotspots, type FeaturedPreview } from "@/lib/placeholder-data";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { HeroMotion } from "@/components/motion/HeroMotion";
import { Magnetic } from "@/components/motion/Magnetic";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { TiltCard } from "@/components/motion/TiltCard";
import { cn } from "@/lib/cn";
import { AnimatedGlobe } from "./AnimatedGlobe";
import { Globe } from "./Globe";

const rail: { href: string; label: string; icon: IconName; active?: boolean }[] = [
  { href: "/", label: "Home", icon: "home", active: true },
  { href: "/archive", label: "Archive", icon: "archive" },
  { href: "/#guidelines", label: "Guidelines", icon: "document" },
  { href: "/submit", label: "Submit", icon: "upload" },
];

export function Hero({ featured: featuredPaper = sampleFeatured }: { featured?: FeaturedPreview }) {
  return (
    <section aria-labelledby="hero-title" className="container-page relative pt-6">
      <HeroMotion>
        {/* Vertical icon rail */}
        <nav
          aria-label="Quick links"
          data-hero-rail=""
          className="absolute left-4 top-[200px] z-[3] hidden flex-col gap-2.5 rounded-full bg-surface p-2 sm:left-7 xl:flex"
        >
          {rail.map((r) => (
            <Link
              key={r.label}
              href={r.href}
              aria-label={r.label}
              title={r.label}
              aria-current={r.active ? "page" : undefined}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors",
                r.active ? "bg-lime" : "bg-bg hover:bg-line",
              )}
            >
              <Icon name={r.icon} size={18} strokeWidth={1.8} />
            </Link>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-6 xl:pl-[72px]">
          <div data-hero-copy="" className="relative z-[2] min-w-0 flex-[1_1_440px]">
            <p data-hero-item="" className="eyebrow flex items-center gap-2.5 text-muted">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inset-0 animate-ping rounded-full bg-teal opacity-60 motion-reduce:hidden" />
                <span className="relative size-2 rounded-full bg-teal" />
              </span>
              Peer-reviewed · Multidisciplinary · Global
            </p>
            <SplitReveal
              as="h1"
              id="hero-title"
              by="chars"
              trigger="load"
              delay={0.15}
              stagger={0.022}
              duration={1.3}
              className="mt-[22px] text-[clamp(44px,6.2vw,86px)] font-extrabold leading-[0.98] tracking-[-0.045em]"
            >
              Research that
              <br />
              unites the world.
            </SplitReveal>
            <p data-hero-item="" className="mt-[26px] max-w-[470px] text-lg leading-relaxed text-muted">
              {journal.description}
            </p>
            <div data-hero-item="" className="mt-9 flex flex-wrap gap-3">
              <Magnetic>
                <ButtonLink href="/archive?issue=current" variant="signature" size="lg">
                  Read the latest issue
                </ButtonLink>
              </Magnetic>
              <Magnetic>
                <ButtonLink href="/submit" variant="ink" size="lg">
                  Submit your article
                </ButtonLink>
              </Magnetic>
            </div>

            <dl data-hero-item="" className="mt-14 flex flex-col gap-[18px] border-l border-[#D5DBD6] pl-5">
              <div>
                <dt className="font-mono text-xs text-muted">Current issue</dt>
                <dd className="mt-1 text-[15px] font-bold">
                  Vol. {journal.current.volume} · Issue {journal.current.issue} — {journal.current.label}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs text-muted">Call for papers</dt>
                <dd className="mt-1 text-[15px] font-bold">Open until {journal.callForPapers.deadline} · all disciplines</dd>
              </div>
            </dl>
          </div>

          <div data-hero-globe-wrap="" className="relative flex min-w-0 flex-[1_1_560px] justify-center">
            <div
              aria-hidden="true"
              className="halo-breathe pointer-events-none absolute left-1/2 top-1/2 aspect-square w-full max-w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full xl:w-[118%]"
              style={{ background: "radial-gradient(circle, rgba(228,246,241,0.95) 0%, rgba(211,240,232,0.55) 52%, rgba(244,245,243,0) 72%)" }}
            />
            <div data-hero-globe="" className="w-full max-w-[680px]">
              <AnimatedGlobe
                className="w-full"
                label="A rotating globe of research nodes linked by arcs across continents. Drag to spin."
                fallback={<Globe className="block h-auto w-full" />}
              />
            </div>
            {heroHotspots.map((h, i) => (
              <Link
                key={h.slug}
                href={`/archive?discipline=${h.slug}`}
                data-hero-hotspot=""
                className={cn(
                  "group absolute z-[2] hidden items-center gap-2.5 rounded-full md:flex",
                  ["float-a", "float-b", "float-c", "float-d"][i % 4],
                  h.pos,
                  h.labelFirst && "flex-row-reverse",
                )}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-10 items-center justify-center rounded-full bg-[rgb(233_245_184/0.92)] font-bold shadow-[0_0_0_8px_rgb(233_245_184/0.35)] transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110 motion-safe:animate-[pulse-ring_3.2s_ease-in-out_infinite]"
                >
                  <Icon name="plus" size={14} strokeWidth={2.4} />
                </span>
                <span className="rounded-full bg-white/80 px-3.5 py-2 text-[13px] font-semibold backdrop-blur-[10px] transition-colors group-hover:bg-ink group-hover:text-white">
                  {h.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Hero strip: latest · guidelines · indexing */}
        <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4 rounded-[32px] bg-white/60 p-3 backdrop-blur-[16px] sm:p-4 xl:ml-[72px]">
          <div data-hero-card="">
            <TiltCard cursor="Read" className="rounded-3xl">
              <Link href={featuredPaper.href} className="group flex h-full flex-col gap-3 rounded-3xl bg-surface p-[22px]">
                <span className="flex items-center justify-between">
                  <span className="font-mono text-xs text-muted">Latest · Paper No. {featuredPaper.paperNo}</span>
                  <span className="inline-flex size-[34px] items-center justify-center rounded-full bg-lime transition-transform duration-500 group-hover:rotate-45">
                    <Icon name="arrowUpRight" size={14} strokeWidth={2.2} />
                  </span>
                </span>
                <span className="text-lg font-bold leading-[1.3] tracking-[-0.01em]">{featuredPaper.title}</span>
                <span className="text-[13px] text-muted">{featuredPaper.field} · Open abstract</span>
              </Link>
            </TiltCard>
          </div>
          <div data-hero-card="">
            <TiltCard className="rounded-3xl">
              <Link href="/#guidelines" className="flex h-full flex-col gap-3 rounded-3xl bg-seafoam p-[22px]">
                <span className="font-mono text-xs text-on-seafoam">Journal guidelines</span>
                <span className="text-lg font-bold leading-[1.3]">Formatting, ethics and review — everything an author needs before submitting.</span>
                <span className="text-[13px] font-bold underline underline-offset-2">Read guidelines</span>
              </Link>
            </TiltCard>
          </div>
          <div data-hero-card="">
            <TiltCard className="rounded-3xl">
              <Link href="/#indexing" className="flex h-full flex-col gap-3 rounded-3xl bg-ink p-[22px] text-white">
                <span className="font-mono text-xs text-on-ink-muted">Indexing &amp; identifiers</span>
                <span className="text-lg font-bold leading-[1.3]">ISSN {journal.issn} · DOI for every article</span>
                <span className="flex flex-wrap gap-2">
                  {["Google Scholar", "Crossref", "+ more"].map((t) => (
                    <span key={t} className="rounded-full border border-[#3A4542] px-2.5 py-1 text-xs">
                      {t}
                    </span>
                  ))}
                </span>
              </Link>
            </TiltCard>
          </div>
        </div>
      </HeroMotion>
    </section>
  );
}
