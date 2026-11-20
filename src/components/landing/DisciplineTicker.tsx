import { disciplines } from "@/lib/placeholder-data";
import { VelocityMarquee } from "@/components/motion/VelocityMarquee";

function Star() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true" className="mx-6 shrink-0 sm:mx-10">
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z" fill="#D7EC8C" stroke="#141A19" strokeWidth="1.2" />
    </svg>
  );
}

/** Two oversized tickers of disciplines that race / reverse with your scrolling. */
export function DisciplineTicker() {
  const names = disciplines.map((d) => d.name);
  return (
    <section aria-label="Disciplines we publish" className="relative mt-24 select-none py-4 sm:mt-28">
      <p className="sr-only">Disciplines: {names.join(", ")}.</p>
      <VelocityMarquee speed={22}>
        {names.map((n, i) => (
          <span key={n} className="flex items-center">
            <span
              className={
                i % 2
                  ? "whitespace-nowrap bg-[linear-gradient(90deg,#2E9C88,#8FD3C3)] bg-clip-text pb-[0.12em] text-[clamp(44px,8vw,120px)] font-extrabold leading-[1.15] tracking-[-0.045em] text-transparent"
                  : "whitespace-nowrap pb-[0.12em] text-[clamp(44px,8vw,120px)] font-extrabold leading-[1.15] tracking-[-0.045em] text-ink"
              }
            >
              {n}
            </span>
            <Star />
          </span>
        ))}
      </VelocityMarquee>
      <VelocityMarquee speed={16} reverse className="mt-3">
        {["Peer-reviewed", "Open abstracts", "DOI for every paper", "Figures, graphs & video", "Global authors", "Moderated discussion"].map((n) => (
          <span key={n} className="flex items-center">
            <span className="whitespace-nowrap rounded-full bg-seafoam px-6 py-3 font-mono text-sm uppercase tracking-[0.08em] text-ink sm:text-base">{n}</span>
            <span className="mx-3 size-2 rounded-full bg-teal" aria-hidden="true" />
          </span>
        ))}
      </VelocityMarquee>
    </section>
  );
}
