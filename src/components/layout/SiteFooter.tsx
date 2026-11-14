import Link from "next/link";
import { journal } from "@/config/journal";
import { LogoMark } from "@/components/ui/Icon";

const columns = [
  {
    title: "Journal",
    links: [
      { href: "/archive", label: "Archive" },
      { href: "/archive?issue=current", label: "Current issue" },
      { href: "/#indexing", label: "Indexing" },
    ],
  },
  {
    title: "Authors",
    links: [
      { href: "/#guidelines", label: "Guidelines" },
      { href: "/submit", label: "Submit article" },
      { href: "/#guidelines", label: "Ethics & policies" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about/editorial-board", label: "Editorial board" },
      { href: "/about/contact", label: "Contact" },
      { href: "/about/privacy", label: "Privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="container-page pb-12 pt-20">
      <div className="flex flex-wrap justify-between gap-10 border-t border-line-strong pt-10">
        <div className="flex-[1_1_280px]">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <span className="text-lg font-extrabold">{journal.name}</span>
          </div>
          <p className="mt-4 max-w-[300px] text-sm leading-relaxed text-muted">
            {journal.fullTitle}. ISSN {journal.issn}.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-14 gap-y-8 text-sm">
          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-1">
              <h2 className="mb-1.5 font-bold">{col.title}</h2>
              {col.links.map((l) => (
                <Link key={l.label} href={l.href} className="py-1 text-ink-soft hover:text-teal-deep">
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <p className="mt-9 font-mono text-xs text-muted">
        © {journal.copyrightYear} {journal.name} · Content licensed under {journal.licence}
      </p>
    </footer>
  );
}
