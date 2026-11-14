import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-page grid min-h-dvh place-items-center">
      <div className="text-center">
        <p className="eyebrow text-muted">404</p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-[-0.045em]">Page not found</h1>
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-6 text-sm font-bold text-white">
          Back to the journal
        </Link>
      </div>
    </main>
  );
}
