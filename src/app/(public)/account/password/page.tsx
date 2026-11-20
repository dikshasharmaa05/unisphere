import type { Metadata } from "next";
import { PageIntro } from "@/components/layout/PageIntro";
import { requireUser } from "@/lib/auth/session";
import { PasswordForm } from "./PasswordForm";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

export default async function PasswordPage() {
  await requireUser("/account/password");
  return (
    <section className="container-page pt-6">
      <div className="mx-auto max-w-[620px]">
        <PageIntro eyebrow="Account" title="Set a new password" />
        <div className="mt-8 rounded-[32px] bg-surface p-[clamp(24px,3.4vw,44px)]">
          <PasswordForm />
        </div>
      </div>
    </section>
  );
}
