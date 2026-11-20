"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { AuthPanel, type AuthMode } from "@/components/auth/AuthPanel";

export function SignInCard({ next, notice, initialMode }: { next: string; notice?: string; initialMode: AuthMode }) {
  const router = useRouter();
  const onSignedIn = useCallback(() => {
    router.replace(next);
    router.refresh();
  }, [router, next]);
  return <AuthPanel initialMode={initialMode} next={next} notice={notice} onSignedIn={onSignedIn} titleId="signin-title" />;
}
