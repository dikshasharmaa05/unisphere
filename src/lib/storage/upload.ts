"use client";

import { createClient } from "@/lib/supabase/client";
import { supabaseEnv } from "@/lib/env";

/** Safe object name: keeps the extension, drops anything odd. */
export function objectName(file: File) {
  const ext = (file.name.match(/\.[a-z0-9]{1,8}$/i)?.[0] ?? "").toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file";
  return `${crypto.randomUUID().slice(0, 8)}-${base}${ext}`;
}

/** MIME type with fallbacks for browsers that leave it empty (e.g. .docx/.csv on some systems). */
export function mimeOf(file: File) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return (
    {
      pdf: "application/pdf",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      csv: "text/csv",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      svg: "image/svg+xml",
      mp4: "video/mp4",
      webm: "video/webm",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
    }[ext ?? ""] ?? "application/octet-stream"
  );
}

/**
 * Uploads a file to the private `submissions` bucket with progress.
 * 1. Ask Storage for a one-time signed upload URL (checks our RLS insert policy).
 * 2. PUT the bytes with XHR so we get upload progress events.
 */
export async function uploadWithProgress(
  path: string,
  file: File,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from("submissions").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message?.includes("row-level security") ? "You can’t upload to this submission." : "Upload could not start.");
  const env = supabaseEnv()!;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", data.signedUrl);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("content-type", mimeOf(file));
    xhr.setRequestHeader("apikey", env.anonKey);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(uploadError(xhr))));
    xhr.onerror = () => reject(new Error("Network error — check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

function uploadError(xhr: XMLHttpRequest) {
  try {
    const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
    if (xhr.status === 413 || /too large|maximum allowed size/i.test(body.message ?? "")) return "That file is too large.";
    if (/mime type/i.test(body.message ?? "")) return "That file type isn’t allowed.";
    return body.message ?? `Upload failed (${xhr.status}).`;
  } catch {
    return `Upload failed (${xhr.status}).`;
  }
}
