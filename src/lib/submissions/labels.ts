import type { Tone } from "@/components/ui/Card";
import type { ArticleType, MediaKind, SubmissionStatus } from "@/lib/supabase/types";

export const ARTICLE_TYPES: { value: ArticleType; label: string }[] = [
  { value: "original_research", label: "Original research" },
  { value: "review_article", label: "Review article" },
  { value: "case_study", label: "Case study" },
  { value: "short_communication", label: "Short communication" },
];
export const articleTypeLabel = (t: ArticleType) => ARTICLE_TYPES.find((x) => x.value === t)?.label ?? t;

export const STATUS: Record<SubmissionStatus, { label: string; tone: Tone; help: string }> = {
  draft: { label: "Draft", tone: "stone", help: "Not submitted yet — only you can see it." },
  submitted: { label: "Submitted", tone: "aqua", help: "Received. The editorial team will check scope and formatting." },
  editorial_check: { label: "Editorial check", tone: "aqua", help: "Editors are checking scope and formatting." },
  in_review: { label: "In review", tone: "seafoam", help: "Independent reviewers are assessing your work." },
  revision_requested: { label: "Revision requested", tone: "pink", help: "The editors have asked for changes. Read the comments and submit a revision." },
  accepted: { label: "Accepted", tone: "lime", help: "Accepted for publication. It will appear in an upcoming issue." },
  declined: { label: "Declined", tone: "pink", help: "The editors decided not to publish this manuscript." },
  published: { label: "Published", tone: "lime", help: "Published — your abstract is public and the article has a permanent record." },
  withdrawn: { label: "Withdrawn", tone: "stone", help: "Withdrawn from the journal." },
};

export const FILE_KINDS: Record<Exclude<MediaKind, "video_embed">, { label: string; accept: string; hint: string }> = {
  manuscript: { label: "Manuscript", accept: ".pdf,.docx", hint: "DOCX or PDF" },
  image: { label: "Images", accept: ".png,.jpg,.jpeg", hint: "PNG, JPG" },
  figure: { label: "Graphs & figures", accept: ".png,.jpg,.jpeg,.svg", hint: "PNG, JPG, SVG" },
  dataset: { label: "Datasets", accept: ".csv,.xlsx", hint: "CSV, XLSX" },
  video_upload: { label: "Video", accept: ".mp4,.webm", hint: "MP4, WebM" },
  supplementary: { label: "Supplementary / title page", accept: ".pdf", hint: "PDF" },
};

export type UploadLimits = Record<string, { maxMb: number; types: string[] }> & { maxImagesAndFiguresPerVersion?: number };

export const DEFAULT_LIMITS: UploadLimits = {
  manuscript: { maxMb: 20, types: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  image: { maxMb: 10, types: ["image/png", "image/jpeg"] },
  figure: { maxMb: 10, types: ["image/png", "image/jpeg", "image/svg+xml"] },
  dataset: { maxMb: 20, types: ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] },
  video_upload: { maxMb: 50, types: ["video/mp4", "video/webm"] },
  supplementary: { maxMb: 20, types: ["application/pdf"] },
};

export const formatBytes = (b: number | null | undefined) => {
  if (!b && b !== 0) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
};

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
