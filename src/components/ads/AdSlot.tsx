import { siteFlags } from "@/config/site";

/**
 * Reserved slot for future research-related sponsorship (no ads at launch).
 * Renders nothing while `siteFlags.adsEnabled` is false, so it costs no layout.
 * When enabled, it shows a clearly labelled "Sponsored" container.
 */
export function AdSlot({ placement, className }: { placement: "landing-mid" | "article-sidebar" | "archive-list"; className?: string }) {
  if (!siteFlags.adsEnabled) return null;
  return (
    <aside aria-label="Sponsored" data-ad-placement={placement} className={className}>
      <div className="rounded-[22px] border border-dashed border-line-strong bg-surface p-5">
        <p className="eyebrow text-muted">Sponsored</p>
      </div>
    </aside>
  );
}
