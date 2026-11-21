"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

type Institution = { id: string; name: string; city: string | null; country: string | null; types: string[] };

/**
 * Affiliation input with live institution suggestions from ROR (via /api/affiliations).
 * Picking a suggestion stores its ROR ID in a hidden `affiliationRor` field; editing the
 * text afterwards clears it. Free text is always accepted.
 * Accessible combobox: arrow keys move, Enter picks, Escape closes.
 */
export function AffiliationField({
  label = "Affiliation",
  defaultValue = "",
  defaultRor = "",
  error,
  placeholder = "Start typing your university or institute",
  className,
}: {
  label?: React.ReactNode;
  defaultValue?: string;
  defaultRor?: string;
  error?: string;
  placeholder?: string;
  className?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [value, setValue] = useState(defaultValue);
  const [ror, setRor] = useState(defaultRor);
  const [items, setItems] = useState<Institution[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [touched, setTouched] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Debounced search while typing (only after the user has typed something).
  const q = value.trim();
  const searchable = touched && q.length >= 2 && !ror;
  useEffect(() => {
    if (!searchable) {
      abort.current?.abort();
      return;
    }
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/affiliations?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { items: Institution[] };
        setItems(data.items ?? []);
        setActive(-1);
        setOpen(true);
      } catch {
        /* aborted or offline — keep free text */
      } finally {
        if (abort.current === ctrl) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q, searchable]);

  const pick = (inst: Institution) => {
    setValue(inst.name);
    setRor(inst.id);
    setOpen(false);
    setItems([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !items.length) {
      if (e.key === "ArrowDown" && items.length) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(items[active]!);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const showList = open && searchable;
  const busy = loading && searchable;
  const hint = error ? undefined : ror ? "verified" : "Pick a suggestion, or type your institution’s full name if it isn’t listed.";

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="text-[13px] font-bold">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          name="affiliation"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setTouched(true);
            setValue(e.target.value);
            if (ror) setRor("");
          }}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-[52px] w-full rounded-2xl border border-line-strong bg-field pl-4 pr-11 text-[15px] text-ink placeholder:text-muted/80 transition-colors focus:border-teal focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-teal-deep aria-[invalid=true]:border-[#b4234a]"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
          {busy ? (
            <span className="block size-4 animate-spin rounded-full border-2 border-muted/30 border-t-teal-deep motion-reduce:animate-none" />
          ) : ror ? (
            <span className="text-teal-deep">
              <Icon name="check" strokeWidth={2.6} />
            </span>
          ) : (
            <Icon name="search" />
          )}
        </span>
      </div>
      <input type="hidden" name="affiliationRor" value={ror} />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Institution suggestions"
          data-lenis-prevent=""
          className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[300px] overflow-y-auto rounded-3xl bg-surface p-1.5 shadow-pop ring-1 ring-line"
        >
          {items.map((inst, i) => (
            <li
              key={inst.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(inst)}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5",
                i === active ? "bg-aqua" : "hover:bg-bg",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 block text-sm font-semibold leading-snug">{inst.name}</span>
                <span className="block truncate text-xs text-muted">{[inst.city, inst.country].filter(Boolean).join(", ")}</span>
              </span>
              {inst.types.includes("education") && (
                <span className="shrink-0 rounded-full bg-lime px-2 py-0.5 text-[11px] font-bold">Education</span>
              )}
            </li>
          ))}
          {!busy && items.length === 0 && (
            <li role="option" aria-selected={false} aria-disabled="true" className="px-3 py-3 text-[13px] text-muted">
              No match in the registry — that’s fine, keep typing the full name.
            </li>
          )}
          <li aria-hidden="true" className="px-3 pb-1 pt-2 text-[11px] text-muted">
            Suggestions from the Research Organization Registry (ROR)
          </li>
        </ul>
      )}

      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-[#9b1c3d]">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint === "verified" ? (
            <>
              Matched to{" "}
              <a href={`https://ror.org/${ror}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-deep underline underline-offset-2">
                ROR {ror}
              </a>
            </>
          ) : (
            hint
          )}
        </p>
      )}
    </div>
  );
}
