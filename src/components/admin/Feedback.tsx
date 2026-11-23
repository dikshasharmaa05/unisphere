export function Feedback({ feedback }: { feedback: { ok: boolean; text: string } | null }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.ok ? "status" : "alert"}
      className={feedback.ok ? "rounded-2xl bg-aqua px-4 py-2.5 text-[13px] font-semibold text-teal-deep" : "rounded-2xl bg-pink px-4 py-2.5 text-[13px] font-semibold text-[#7a1631]"}
    >
      {feedback.text}
    </p>
  );
}

export function AdminHeader({ greeting, title, children }: { greeting?: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end gap-4">
      <div>
        {greeting && <p className="text-sm text-muted">{greeting}</p>}
        <h1 className="mt-1 text-[clamp(30px,3.2vw,42px)] font-extrabold leading-none tracking-[-0.04em]">{title}</h1>
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2.5">{children}</div>}
    </header>
  );
}
