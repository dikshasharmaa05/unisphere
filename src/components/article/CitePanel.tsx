"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Formats = { apa: { text: string; html: string }; mla: { text: string; html: string }; bibtex: string };

/** "Cite this paper": APA / MLA / BibTeX tabs with copy-to-clipboard (dark card from the design). */
export function CitePanel({ formats }: { formats: Formats }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"apa" | "mla" | "bibtex">("apa");
  const [copied, setCopied] = useState(false);
  const plain = tab === "bibtex" ? formats.bibtex : formats[tab].text;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="cite-panel"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center gap-2.5 rounded-full bg-bg px-4 text-sm font-bold hover:bg-line"
      >
        <span aria-hidden="true" className="font-serif text-lg leading-none">
          ”
        </span>
        Cite this paper
      </button>
      {open && (
        <div id="cite-panel" className="mt-2 animate-[pop-in_140ms_ease-out] rounded-[22px] bg-ink p-4 text-white">
          <div role="tablist" aria-label="Citation format" className="flex gap-1.5">
            {(["apa", "mla", "bibtex"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => {
                  setTab(t);
                  setCopied(false);
                }}
                className={cn("min-h-11 rounded-full px-3.5 text-xs font-bold", tab === t ? "bg-lime text-ink" : "bg-white/10 hover:bg-white/20")}
              >
                {t === "bibtex" ? "BibTeX" : t.toUpperCase()}
              </button>
            ))}
          </div>
          <div role="tabpanel" className="mt-3 max-h-56 overflow-auto font-mono text-[11.5px] leading-relaxed text-[#D9E1DE]" data-lenis-prevent="">
            {tab === "bibtex" ? <pre className="whitespace-pre-wrap break-words">{formats.bibtex}</pre> : <p className="break-words" dangerouslySetInnerHTML={{ __html: formats[tab].html }} />}
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(plain);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard blocked */
              }
            }}
            className="mt-3 h-11 w-full rounded-full bg-surface text-[13px] font-bold text-ink hover:bg-lime"
          >
            <span aria-live="polite">{copied ? "Copied ✓" : "Copy citation"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
