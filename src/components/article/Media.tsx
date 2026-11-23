import type { ArticleFullText } from "@/lib/articles/queries";

const embed = (url: string) => {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
};

/** Figures, images, video and downloadable data for members. */
export function Media({ media }: { media: ArticleFullText["media"] }) {
  const visuals = media.filter((m) => (m.kind === "image" || m.kind === "figure") && m.url);
  const videos = media.filter((m) => (m.kind === "video_embed" || m.kind === "video_upload") && m.url);
  const downloads = media.filter((m) => (m.kind === "dataset" || m.kind === "supplementary") && m.url);
  if (!visuals.length && !videos.length && !downloads.length) return null;
  return (
    <div className="mt-10 flex flex-col gap-8 border-t border-line pt-8">
      {visuals.length > 0 && (
        <section aria-labelledby="figures-title">
          <h2 id="figures-title" className="text-xl font-extrabold tracking-[-0.02em]">
            Figures
          </h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {visuals.map((m, i) => {
              const n = i + 1;
              return (
                <figure key={m.id} className="overflow-hidden rounded-[22px] bg-bg">
                  <a href={m.url!} target="_blank" rel="noopener noreferrer" className="block bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs; no optimisation */}
                    <img src={m.url!} alt={m.caption || `Figure ${n}`} loading="lazy" className="max-h-[420px] w-full object-contain" />
                  </a>
                  <figcaption className="p-4 text-[13px] leading-relaxed text-ink-soft">
                    <strong className="text-ink">Figure {n}.</strong> {m.caption}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>
      )}
      {videos.length > 0 && (
        <section aria-labelledby="video-title">
          <h2 id="video-title" className="text-xl font-extrabold tracking-[-0.02em]">
            Video
          </h2>
          <div className="mt-4 flex flex-col gap-5">
            {videos.map((m) => {
              const src = m.kind === "video_embed" ? embed(m.url!) : null;
              return (
                <figure key={m.id} className="overflow-hidden rounded-[22px] bg-ink">
                  {m.kind === "video_upload" ? (
                    <video src={m.url!} controls preload="metadata" className="aspect-video w-full" />
                  ) : src ? (
                    <iframe src={src} title={m.caption || "Video"} allow="encrypted-media; picture-in-picture; fullscreen" loading="lazy" className="aspect-video w-full" />
                  ) : (
                    <a href={m.url!} target="_blank" rel="noopener noreferrer" className="block p-5 text-white underline">
                      Watch video
                    </a>
                  )}
                  {m.caption && <figcaption className="bg-bg p-4 text-[13px] text-ink-soft">{m.caption}</figcaption>}
                </figure>
              );
            })}
          </div>
        </section>
      )}
      {downloads.length > 0 && (
        <section aria-labelledby="data-title">
          <h2 id="data-title" className="text-xl font-extrabold tracking-[-0.02em]">
            Data & supplementary files
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {downloads.map((m) => (
              <li key={m.id}>
                <a href={m.url!} className="flex flex-wrap items-center gap-3 rounded-[18px] bg-bg px-4 py-3 text-sm hover:bg-line">
                  <span className="font-bold">{m.kind === "dataset" ? "Dataset" : "Supplementary"}</span>
                  <span className="min-w-0 flex-1 truncate text-muted">{m.caption || m.file_name}</span>
                  <span className="text-xs font-bold text-teal-deep">Download</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
