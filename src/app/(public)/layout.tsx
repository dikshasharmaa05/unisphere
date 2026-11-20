import { AuthModalProvider } from "@/components/auth/AuthModal";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader, type HeaderViewer } from "@/components/layout/SiteHeader";
import { getViewer, hasAnyRole, ROLE_GROUPS } from "@/lib/auth/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const header: HeaderViewer | null = viewer
    ? {
        name: viewer.profile?.full_name || viewer.user.email || "Account",
        email: viewer.user.email ?? "",
        canReview: hasAnyRole(viewer, ROLE_GROUPS.review),
        canAdmin: hasAnyRole(viewer, ROLE_GROUPS.admin),
      }
    : null;

  return (
    <AuthModalProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-white"
      >
        Skip to content
      </a>
      <SiteHeader viewer={header} />
      <main id="main">{children}</main>
      <SiteFooter />
    </AuthModalProvider>
  );
}
