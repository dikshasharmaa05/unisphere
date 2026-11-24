"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { archiveHref, toggle, type ArchiveQuery, type Sort } from "@/lib/archive/params";
import { ARTICLE_TYPES } from "@/lib/submissions/labels";
import { cn } from "@/lib/cn";

const SORT_LABELS: Record<Sort, string> = { relevance: "Relevance", newest: "Newest first", oldest: "Oldest first", liked: "Most liked", discussed: "Most discussed" };

/** Article-type checkboxes + sort select. Each change navigates (URL is the state), so results are shareable. */
export function ArchiveFilters({ query }: { query: ArchiveQuery }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Show the new choice immediately while the results load.
  const [shown, setShown] = useOptimistic({ types: query.types, sort: query.sort });
  const go = (patch: Partial<ArchiveQuery>) =>
    start(() => {
      setShown({ types: patch.types ?? shown.types, sort: patch.sort ?? shown.sort });
      router.push(archiveHref({ ...query, types: shown.types }, patch), { scroll: false });
    });

  return (
    <div className={cn("flex flex-col gap-6 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
      <fieldset>
        <legend className="text-sm font-extrabold">Article type</legend>
        <div className="mt-2 flex flex-col">
          {ARTICLE_TYPES.map((t) => (
            <label key={t.value} className="flex min-h-11 cursor-pointer items-center gap-3 text-[13px]">
              <input type="checkbox" checked={shown.types.includes(t.value)} onChange={() => go({ types: toggle(shown.types, t.value) })} className="size-[18px] shrink-0 accent-teal-deep" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="archive-sort" className="text-sm font-extrabold">
          Sort by
        </label>
        <select
          id="archive-sort"
          value={shown.sort}
          onChange={(e) => go({ sort: e.target.value as Sort })}
          className="mt-2 h-12 w-full rounded-[16px] border-0 bg-bg px-4 text-[13px] font-semibold"
        >
          {(Object.keys(SORT_LABELS) as Sort[])
            .filter((s) => s !== "relevance" || query.q)
            .map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}
