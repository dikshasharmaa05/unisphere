import "server-only";
import mammoth from "mammoth";
import { sanitizeArticleHtml } from "./sanitize";

/**
 * Converts a DOCX manuscript to clean article HTML. Embedded images are dropped
 * (figures are uploaded separately and shown in the Figures section).
 */
export async function docxToArticleHtml(buffer: Buffer): Promise<{ html: string; warnings: string[] }> {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: ["p[style-name='Title'] => h2:fresh", "p[style-name='Heading 1'] => h2:fresh", "p[style-name='Heading 2'] => h3:fresh", "p[style-name='Heading 3'] => h4:fresh"],
      convertImage: mammoth.images.imgElement(async () => ({ src: "" })),
    },
  );
  const { html } = sanitizeArticleHtml(result.value);
  return { html, warnings: result.messages.filter((m) => m.type === "warning").map((m) => m.message).slice(0, 5) };
}
