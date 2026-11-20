import { orcidUrl } from "@/lib/validation/orcid";

/** ORCID iD link with the standard green "iD" mark (shown on articles and the account page). */
export function OrcidBadge({ orcid, className }: { orcid: string; className?: string }) {
  return (
    <a
      href={orcidUrl(orcid)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 font-mono text-xs text-teal-deep hover:text-ink ${className ?? ""}`}
      aria-label={`ORCID iD ${orcid} (opens orcid.org)`}
    >
      <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="16" fill="#A6CE39" />
        <path fill="#fff" d="M10.6 23.2H8.5V9.8h2.1zM9.55 8.6a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zM13.2 9.8h5.6c5.3 0 7.7 3.8 7.7 6.7 0 3.2-2.5 6.7-7.7 6.7h-5.6zm2.1 11.5h3.3c4.7 0 5.8-3.6 5.8-4.8 0-2-1.3-4.8-5.7-4.8h-3.4z" />
      </svg>
      {orcid}
    </a>
  );
}
