import { z } from "zod";
import { orcidField } from "./auth";
import { wordCount } from "@/lib/submissions/labels";

export const ABSTRACT_MAX_WORDS = 300;

const uuid = z.uuid();

export const detailsSchema = z.object({
  submissionId: uuid,
  title: z.string().trim().max(300, "Keep the title under 300 characters."),
  abstract: z
    .string()
    .trim()
    .max(5000)
    .refine((v) => wordCount(v) <= ABSTRACT_MAX_WORDS, `Keep the abstract to ${ABSTRACT_MAX_WORDS} words.`),
  disciplineId: z.coerce.number().int().positive().nullable().optional(),
  articleType: z.enum(["original_research", "review_article", "case_study", "short_communication"]).optional(),
  keywords: z.array(z.string().trim().min(1).max(60)).max(10, "Use at most 10 keywords."),
});

export const authorSchema = z.object({
  versionId: uuid,
  authorId: uuid.optional(),
  fullName: z.string().trim().min(2, "Enter the author’s full name.").max(200),
  affiliation: z.string().trim().max(300).transform((v) => (v === "" ? null : v)),
  affiliationRor: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.string().regex(/^0[a-z0-9]{6}[0-9]{2}$/).nullable()),
  orcid: orcidField,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email("Enter a valid email address.").nullable()),
  isCorresponding: z.boolean(),
});

export const fileSchema = z.object({
  submissionId: uuid,
  versionId: uuid,
  kind: z.enum(["manuscript", "image", "figure", "dataset", "video_upload", "supplementary"]),
  storagePath: z.string().min(10).max(500),
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().max(120),
  bytes: z.number().int().nonnegative(),
  containsIdentity: z.boolean().optional().default(false),
});

export const videoLinkSchema = z.object({
  submissionId: uuid,
  versionId: uuid,
  url: z
    .string()
    .trim()
    .regex(/^https:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)\//i, "Paste a YouTube or Vimeo link (https://…)."),
  caption: z.string().trim().max(1000).optional(),
});

export const submitSchema = z.object({
  submissionId: uuid,
  originality: z.literal(true, { error: "Confirm the work is original and all authors agree." }),
  changesByRequest: z.literal(true, { error: "Confirm you understand changes are made by request." }),
  coverLetter: z.string().trim().max(5000).optional(),
});
