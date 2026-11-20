import type { ReactNode } from "react";

export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-muted">{eyebrow}</p>
      <h1 className="mt-3.5 text-[clamp(34px,4.4vw,56px)] font-extrabold leading-none tracking-[-0.045em]">{title}</h1>
      {children && <div className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{children}</div>}
    </div>
  );
}
