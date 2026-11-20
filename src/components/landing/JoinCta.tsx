import { AuthTrigger } from "@/components/auth/AuthModal";
import { Reveal } from "@/components/ui/Reveal";

export function JoinCta() {
  return (
    <section aria-labelledby="join-title" className="container-page pt-24 sm:pt-[120px]">
      <Reveal className="flex flex-wrap items-center gap-7 rounded-[40px] bg-surface p-[clamp(24px,4vw,56px)]">
        <div className="flex-[1_1_420px]">
          <h2 id="join-title" className="text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Read every paper in full.
          </h2>
          <p className="mt-3.5 max-w-[520px] text-base leading-relaxed text-muted">
            Abstracts are open to everyone. A free account unlocks full text, figures and video, plus comments and likes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AuthTrigger mode="register" className="h-[58px] rounded-full bg-ink px-7 text-[15px] font-bold text-white hover:bg-[#26302e]">
            Create free account
          </AuthTrigger>
          <AuthTrigger mode="signin" className="h-[58px] rounded-full bg-line px-7 text-[15px] font-bold hover:bg-[#d9dfd9]">
            Sign in
          </AuthTrigger>
        </div>
      </Reveal>
    </section>
  );
}
