import type { Metadata } from "next";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/Feedback";
import { SubmissionPanel } from "@/components/admin/SubmissionPanel";
import { Pill } from "@/components/ui/Pill";
import { requireRole, ROLE_GROUPS } from "@/lib/auth/session";
import { BOARD_TABS, getBoard, getIssues, getReviewerPool, getSubmissionDetail, type BoardTab } from "@/lib/editorial/queries";
import { STATUS } from "@/lib/submissions/labels";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Submissions" };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "");

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; id?: string }> }) {
  const viewer = await requireRole(ROLE_GROUPS.admin, "/admin");
  const sp = await searchParams;
  const tab: BoardTab = sp.tab && sp.tab in BOARD_TABS ? (sp.tab as BoardTab) : "all";
  const q = (sp.q ?? "").trim().toLowerCase();

  const board = await getBoard();
  const count = (statuses: readonly string[]) => board.filter((r) => statuses.includes(r.status)).length;
  const rows = board
    .filter((r) => (BOARD_TABS[tab].statuses as readonly string[]).includes(r.status))
    .filter((r) => !q || r.ref.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || (r.submitter ?? "").toLowerCase().includes(q));
  const selectedId = sp.id && rows.some((r) => r.id === sp.id) ? sp.id : sp.id && board.some((r) => r.id === sp.id) ? sp.id : rows[0]?.id;
  const [detail, pool, issues] = await Promise.all([
    selectedId ? getSubmissionDetail(selectedId) : Promise.resolve(null),
    getReviewerPool(),
    getIssues(),
  ]);
  const href = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const merged = { tab, q: sp.q, ...p };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "tab" && v === "all")) u.set(k, v);
    const s = u.toString();
    return s ? `/admin?${s}` : "/admin";
  };
  const first = (viewer.profile?.full_name || "Editor").split(" ")[0];

  return (
    <div className="flex flex-col gap-5">
      <AdminHeader greeting={`Hello, ${first}`} title="Submissions">
        <form action="/admin" role="search" className="flex items-center gap-2 rounded-full bg-surface py-1.5 pl-[18px] pr-1.5">
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <label htmlFor="admin-q" className="sr-only">
            Search submissions
          </label>
          <input id="admin-q" name="q" type="search" defaultValue={sp.q} placeholder="Search submissions" className="h-10 w-[min(220px,50vw)] bg-transparent text-sm focus:outline-none" />
          <button type="submit" aria-label="Search" className="inline-flex size-10 items-center justify-center rounded-full bg-ink text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </form>
      </AdminHeader>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "New", n: count(BOARD_TABS.new.statuses), tab: "new", tone: "bg-surface" },
          { label: "In review", n: count(BOARD_TABS.review.statuses), tab: "review", tone: "bg-surface" },
          { label: "Awaiting revision", n: count(BOARD_TABS.revision.statuses), tab: "revision", tone: "bg-surface" },
          { label: "Ready to publish", n: count(BOARD_TABS.accepted.statuses), tab: "accepted", tone: "bg-lime" },
        ].map((t) => (
          <Link key={t.label} href={href({ tab: t.tab, id: undefined })} className={cn("rounded-[26px] p-5 transition-shadow hover:shadow-[0_8px_24px_rgb(20_26_25/0.06)]", t.tone)}>
            <span className="block text-[13px] text-ink-soft">{t.label}</span>
            <span className="mt-2 block text-[34px] font-extrabold leading-none tracking-[-0.03em]">{t.n}</span>
          </Link>
        ))}
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2.2fr)]">
        <section aria-label="Queue" className="min-w-0 rounded-[32px] bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5 px-1 pb-3.5" role="tablist" aria-label="Filter">
            {(Object.entries(BOARD_TABS) as [BoardTab, (typeof BOARD_TABS)[BoardTab]][]).map(([key, t]) => (
              <Link
                key={key}
                href={href({ tab: key, id: undefined })}
                role="tab"
                aria-selected={tab === key}
                className={cn("inline-flex min-h-10 items-center rounded-full px-3.5 text-[13px] font-bold", tab === key ? "bg-ink text-white" : "bg-bg hover:bg-line")}
              >
                {t.label}
                <span className={cn("ml-1.5 font-mono text-[11px]", tab === key ? "text-white/70" : "text-muted")}>{count(t.statuses)}</span>
              </Link>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="rounded-[20px] bg-bg p-6 text-sm text-muted">{q ? "No submissions match your search." : "Nothing here right now."}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={href({ id: r.id })}
                    aria-current={r.id === selectedId ? "true" : undefined}
                    scroll={false}
                    className={cn("flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-[20px] p-4 transition-colors", r.id === selectedId ? "bg-bg" : "hover:bg-bg/60")}
                  >
                    <span className="w-[72px] font-mono text-xs text-muted">{r.ref}</span>
                    <span className="min-w-0 flex-[1_1_220px]">
                      <span className="block text-[15px] font-bold leading-snug">{r.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {[r.submitter, r.discipline, r.submitted_at ? `received ${fmt(r.submitted_at)}` : null, r.version && r.version > 1 ? `v${r.version}` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <Pill tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Pill>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Submission detail" className="min-w-0 rounded-[32px] bg-surface p-5 sm:p-[26px] xl:sticky xl:top-5">
          {detail ? (
            <SubmissionPanel detail={detail} pool={pool} issues={issues.issues.map((i) => ({ ...i, volume: issues.volumes.find((v) => v.id === i.volume_id)?.number ?? null }))} />
          ) : (
            <p className="text-sm text-muted">Select a submission to see its details.</p>
          )}
        </section>
      </div>
    </div>
  );
}
