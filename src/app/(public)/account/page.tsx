import type { Metadata } from "next";
import { OrcidBadge } from "@/components/auth/OrcidBadge";
import { PageIntro } from "@/components/layout/PageIntro";
import { Pill } from "@/components/ui/Pill";
import { signOutAction } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default async function AccountPage() {
  const viewer = await requireUser("/account");
  const p = viewer.profile;
  const isGoogle = viewer.user.app_metadata?.provider === "google";

  return (
    <section className="container-page pt-6">
      <PageIntro eyebrow="Account" title="Your profile">
        This is how your name and affiliation appear on articles you submit. Your profile itself is never public.
      </PageIntro>

      <div className="mt-10 flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[999_1_560px] rounded-[32px] bg-surface p-[clamp(24px,3.4vw,44px)]">
          <h2 className="text-2xl font-extrabold tracking-[-0.025em]">Profile details</h2>
          <ProfileForm
            defaults={{ fullName: p?.full_name ?? "", affiliation: p?.affiliation ?? "", orcid: p?.orcid ?? "" }}
          />
        </div>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
          <div className="rounded-[28px] bg-surface p-6">
            <p className="text-[13px] font-bold">Signed in as</p>
            <p className="mt-1 break-all text-[15px]">{viewer.user.email}</p>
            {p?.orcid && <OrcidBadge orcid={p.orcid} className="mt-3" />}
            <p className="mt-4 text-[13px] font-bold">Roles</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {viewer.roles.map((r) => (
                <Pill key={r} tone={r === "admin" || r === "editor" ? "lime" : "seafoam"} className="capitalize">
                  {r}
                </Pill>
              ))}
            </div>
          </div>
          <div className="rounded-[28px] bg-surface p-6">
            <p className="text-[13px] font-bold">Password</p>
            <p className="mt-1 text-[13px] text-muted">
              {isGoogle ? "You sign in with Google. You can also set a password for email sign-in." : "Change the password you use to sign in."}
            </p>
            <a href="/account/password" className="mt-3 inline-flex h-11 items-center rounded-full bg-bg px-5 text-sm font-bold hover:bg-line">
              {isGoogle ? "Set a password" : "Change password"}
            </a>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="h-[54px] w-full rounded-full bg-ink text-[15px] font-bold text-white hover:bg-[#26302e]">
              Sign out
            </button>
          </form>
        </aside>
      </div>
    </section>
  );
}
