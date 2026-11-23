"use client";

import { useId, useState } from "react";

/** Chip input: Enter or comma adds, Backspace on empty removes the last, × removes one. */
export function KeywordsInput({ value, onChange, max = 10, error }: { value: string[]; onChange: (v: string[]) => void; max?: number; error?: string }) {
  const id = useId();
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const parts = raw.split(",").map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      if (next.length >= max) break;
      if (!next.some((k) => k.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 60));
    }
    onChange(next);
    setDraft("");
  };

  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-bold">
        Keywords <span className="font-medium text-muted">· up to {max}</span>
      </label>
      <div className="mt-2 flex min-h-[54px] flex-wrap items-center gap-2 rounded-2xl border border-line-strong bg-field p-2.5 focus-within:border-teal focus-within:bg-surface">
        {value.map((k) => (
          <span key={k} className="inline-flex items-center gap-1 rounded-full bg-seafoam py-1 pl-3 pr-1 text-[13px] font-semibold">
            {k}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== k))}
              aria-label={`Remove keyword ${k}`}
              className="inline-flex size-6 items-center justify-center rounded-full hover:bg-white/70"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          disabled={value.length >= max}
          placeholder={value.length >= max ? "Keyword limit reached" : value.length ? "Add keyword" : "e.g. sleep, memory consolidation"}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          aria-describedby={`${id}-hint`}
          className="h-9 min-w-[140px] flex-1 bg-transparent px-1 text-sm focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      <p id={`${id}-hint`} className={error ? "mt-1.5 text-xs font-semibold text-[#9b1c3d]" : "mt-1.5 text-xs text-muted"}>
        {error ?? "Press Enter or type a comma to add each keyword."}
      </p>
    </div>
  );
}
