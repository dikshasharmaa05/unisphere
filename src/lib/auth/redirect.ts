/**
 * Only allow same-site relative paths as post-auth destinations (prevents open redirects).
 */
export function safeNext(next: unknown, fallback = "/"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/auth/")) return fallback;
  return next;
}

export const signInPath = (next?: string) => (next ? `/sign-in?next=${encodeURIComponent(safeNext(next))}` : "/sign-in");
