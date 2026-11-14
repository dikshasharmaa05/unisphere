import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-2xl border border-line-strong bg-field px-4 text-[15px] text-ink placeholder:text-muted/80 transition-colors focus:border-teal focus:bg-surface focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-teal-deep aria-[invalid=true]:border-[#b4234a]";

type FieldShell = { label: ReactNode; hint?: ReactNode; error?: string; className?: string };

function Shell({ id, label, hint, error, className, children }: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[13px] font-bold">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-semibold text-[#9b1c3d]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

/** Labelled text input. The label is always rendered (accessibility). */
export function Input({ label, hint, error, className, id, ...rest }: FieldShell & Omit<ComponentProps<"input">, "className">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} hint={hint} error={error} className={className}>
      <input
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        className={cn(fieldBase, "h-[52px]")}
        {...rest}
      />
    </Shell>
  );
}

export function Textarea({ label, hint, error, className, id, rows = 5, ...rest }: FieldShell & Omit<ComponentProps<"textarea">, "className">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={fid}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        className={cn(fieldBase, "resize-y py-3.5 leading-relaxed")}
        {...rest}
      />
    </Shell>
  );
}

export function Select({ label, hint, error, className, id, children, ...rest }: FieldShell & Omit<ComponentProps<"select">, "className">) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Shell id={fid} label={label} hint={hint} error={error} className={className}>
      <select
        id={fid}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, error, hint)}
        className={cn(fieldBase, "h-[52px] px-3.5")}
        {...rest}
      >
        {children}
      </select>
    </Shell>
  );
}

export function Checkbox({ label, className, ...rest }: { label: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-center gap-2.5 text-sm", className)}>
      <input type="checkbox" className="size-[18px] shrink-0 accent-teal-deep" {...rest} />
      <span>{label}</span>
    </label>
  );
}

/** Pill-shaped search field with a 44px ink submit circle (GET form, works without JS). */
export function SearchField({
  action = "/archive",
  name = "q",
  label,
  placeholder,
  defaultValue,
  className,
  hideLabel = false,
}: {
  action?: string;
  name?: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <form action={action} method="get" role="search" className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-[13px] font-bold"}>
        {label}
      </label>
      <div className={cn("flex items-center gap-2 rounded-full bg-bg py-1.5 pl-5 pr-1.5", !hideLabel && "mt-2")}>
        <input
          id={id}
          type="search"
          name={name}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white hover:bg-[#26302e]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
      </div>
    </form>
  );
}
