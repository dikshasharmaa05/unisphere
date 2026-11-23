import Link from "next/link";
import { cn } from "@/lib/cn";

export const STEPS = [
  { title: "Article details", sub: "Title, abstract, keywords" },
  { title: "Authors", sub: "Names, affiliations, ORCID" },
  { title: "Manuscript & media", sub: "Text, images, graphs, video" },
  { title: "Review & submit", sub: "Declarations" },
] as const;

/** Left-hand step navigation from the design. `done` marks steps whose requirements are met. */
export function Stepper({ submissionId, current, done }: { submissionId: string; current: number; done: boolean[] }) {
  return (
    <>
      {/* Phones/tablets: compact step row */}
      <nav aria-label="Submission steps" className="rounded-[24px] bg-surface p-3 lg:hidden">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const isCurrent = n === current;
            const isDone = done[i] && !isCurrent;
            return (
              <li key={s.title} className={isCurrent ? "min-w-0 flex-1" : ""}>
                <Link
                  href={`/submit/${submissionId}?step=${n}`}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Step ${n}: ${s.title}${isDone ? " — complete" : ""}`}
                  className={cn("flex min-h-11 items-center gap-2.5 rounded-full p-1", isCurrent && "bg-lime pr-4")}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold",
                      isDone ? "bg-teal text-white" : isCurrent ? "bg-ink text-white" : "bg-bg text-ink",
                    )}
                  >
                    {isDone ? "✓" : n}
                  </span>
                  {isCurrent && <span aria-hidden="true" className="truncate text-sm font-bold">{s.title}</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    <nav aria-label="Submission steps" className="hidden flex-col gap-1.5 rounded-[28px] bg-surface p-4 sm:p-5 lg:flex">
      <ol className="flex flex-col gap-1.5">
        {STEPS.map((s, i) => {
          const n = i + 1;
          const isCurrent = n === current;
          const isDone = done[i] && !isCurrent;
          return (
            <li key={s.title}>
              <Link
                href={`/submit/${submissionId}?step=${n}`}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-3.5 rounded-[20px] p-3.5 transition-colors",
                  isCurrent ? "bg-lime" : "hover:bg-bg",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold",
                    isDone ? "bg-teal text-white" : isCurrent ? "bg-ink text-white" : "bg-bg text-ink",
                  )}
                >
                  {isDone ? "✓" : n}
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-bold">{s.title}</span>
                  <span className="block text-xs text-muted">
                    {s.sub}
                    <span className="sr-only">{isDone ? " — complete" : ""}</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 rounded-[20px] bg-bg p-4 text-[13px] leading-relaxed text-ink-soft">
        <strong className="text-ink">Before you start</strong>
        <br />
        Read the{" "}
        <Link href="/guidelines" className="text-teal-deep underline underline-offset-2">
          author guidelines
        </Link>{" "}
        and use the manuscript template.
      </div>
    </nav>
    </>
  );
}
