import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { authErrorMessage } from "@/lib/auth/errors";
import { safeNext } from "@/lib/auth/redirect";
import { SignInCard } from "./SignInCard";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const areaLabels: Record<string, string> = {
  "/submit": "submit your article",
  "/dashboard": "open your dashboard",
  "/review": "open your reviews",
  "/admin": "open the editorial desk",
  "/account": "manage your account",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; mode?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/account");
  if (await getUser()) redirect(next);

  const area = Object.entries(areaLabels).find(([p]) => next === p || next.startsWith(`${p}/`))?.[1];
  const notice = sp.error
    ? authErrorMessage({ code: sp.error, message: "", status: 400 })
    : area
      ? `Please sign in to ${area}.`
      : undefined;

  return (
    <section className="container-page pt-4">
      <div className="mx-auto max-w-[980px] overflow-hidden rounded-[32px] bg-surface shadow-pop sm:rounded-[40px]">
        <SignInCard next={next} notice={notice} initialMode={sp.mode === "register" ? "register" : "signin"} />
      </div>
    </section>
  );
}
