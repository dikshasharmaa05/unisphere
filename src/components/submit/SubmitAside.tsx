import { journal } from "@/config/journal";

/** Right-hand "What happens next" + help panel from the design. */
export function SubmitAside() {
  const steps = [
    ["Editorial check", "Scope and formatting"],
    ["Peer review", "Independent reviewers assess the work"],
    ["Decision", "Accept, revise or decline — you’re notified by email"],
    ["Published", "DOI assigned, abstract goes public"],
  ];
  return (
    <aside className="flex min-w-0 flex-col gap-3.5">
      <div className="flex flex-col gap-4 rounded-[28px] bg-ink p-6 text-white">
        <h2 className="text-[15px] font-extrabold">What happens next</h2>
        <ol className="flex flex-col gap-3.5 border-l border-[#3A4542] pl-4 text-sm leading-normal text-[#D9E1DE]">
          {steps.map(([t, d]) => (
            <li key={t}>
              <strong className="text-white">{t}</strong>
              <br />
              {d}
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-[28px] bg-seafoam p-5 text-sm leading-relaxed text-[#2A3B37]">
        <strong className="text-ink">Need help?</strong>
        <br />
        Contact the editorial office at {journal.editorialEmail}.
      </div>
    </aside>
  );
}
