"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { setRoleAction } from "@/lib/editorial/actions";
import type { Person } from "@/lib/editorial/queries";
import type { AppRole } from "@/lib/supabase/types";
import { Feedback } from "./Feedback";
import { useAction } from "./useAction";

const ROLE_FILTERS = ["all", "reviewer", "editor", "admin", "author"] as const;
const GRANTABLE: { role: AppRole; label: string; help: string }[] = [
  { role: "reviewer", label: "Reviewer", help: "Can be assigned manuscripts to review" },
  { role: "editor", label: "Editor", help: "Runs the editorial desk" },
  { role: "admin", label: "Admin", help: "Editor + manages roles and site settings" },
];

export function UsersManager({ people, isAdmin, selfId }: { people: Person[]; isAdmin: boolean; selfId: string }) {
  const { run, pending, feedback } = useAction();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof ROLE_FILTERS)[number]>("all");
  const [confirm, setConfirm] = useState<{ person: Person; role: AppRole; grant: boolean } | null>(null);
  const list = useMemo(
    () =>
      people.filter(
        (p) =>
          (filter === "all" || p.roles.includes(filter as AppRole)) &&
          (!q || `${p.full_name} ${p.email ?? ""} ${p.affiliation ?? ""}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [people, q, filter],
  );

  return (
    <section className="flex flex-col gap-4 rounded-[32px] bg-surface p-5 sm:p-7">
      {!isAdmin && <p className="rounded-2xl bg-aqua px-4 py-3 text-[13px] font-semibold text-teal-deep">Only admins can change roles. You can view everyone here.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="user-q" className="sr-only">
          Search people
        </label>
        <input
          id="user-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email or institution"
          className="h-11 min-w-0 flex-[1_1_240px] rounded-full bg-bg px-5 text-sm focus:outline-none focus-visible:outline-2 focus-visible:outline-teal-deep"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by role">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn("h-10 rounded-full px-3.5 text-[13px] font-bold capitalize", filter === f ? "bg-ink text-white" : "bg-bg hover:bg-line")}
            >
              {f === "all" ? `All (${people.length})` : f}
            </button>
          ))}
        </div>
      </div>
      <Feedback feedback={feedback} />
      <ul className="flex flex-col gap-2">
        {list.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-[20px] bg-bg px-4 py-3">
            <span className="min-w-0 flex-[1_1_240px]">
              <span className="block font-bold">
                {p.full_name}
                {p.id === selfId && <span className="font-normal text-muted"> (you)</span>}
              </span>
              <span className="block truncate text-xs text-muted">{[p.email, p.affiliation].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="flex flex-wrap gap-1.5">
              {p.roles.includes("author") && <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold">Author</span>}
              {GRANTABLE.map((g) => {
                const has = p.roles.includes(g.role);
                return (
                  <button
                    key={g.role}
                    type="button"
                    disabled={!isAdmin || pending}
                    aria-pressed={has}
                    title={isAdmin ? `${has ? "Remove" : "Grant"} ${g.label.toLowerCase()} — ${g.help}` : g.help}
                    onClick={() => setConfirm({ person: p, role: g.role, grant: !has })}
                    className={cn(
                      "min-h-9 rounded-full px-3 text-xs font-bold transition-colors disabled:cursor-default",
                      has ? (g.role === "reviewer" ? "bg-seafoam" : "bg-lime") : "border border-dashed border-[#9FB0AA] text-muted hover:bg-surface",
                    )}
                  >
                    {has ? g.label : `+ ${g.label}`}
                    <span className="sr-only"> for {p.full_name}</span>
                  </button>
                );
              })}
            </span>
          </li>
        ))}
        {list.length === 0 && <li className="rounded-[20px] bg-bg p-5 text-sm text-muted">No one matches.</li>}
      </ul>
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => confirm && run(() => setRoleAction(confirm.person.id, confirm.role, confirm.grant))}
        title={confirm ? `${confirm.grant ? "Grant" : "Remove"} ${confirm.role}?` : ""}
        body={confirm ? `${confirm.person.full_name} will ${confirm.grant ? "get" : "lose"} the ${confirm.role} role.` : ""}
        confirmLabel={confirm?.grant ? "Grant" : "Remove"}
        tone={confirm && !confirm.grant ? "danger" : "ink"}
      />
    </section>
  );
}
