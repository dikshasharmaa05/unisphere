import { AuthTrigger } from "@/components/auth/AuthModal";
import { Reveal } from "@/components/ui/Reveal";
import { Magnetic } from "@/components/motion/Magnetic";
import { SplitReveal } from "@/components/motion/SplitReveal";

export function JoinCta() {
  return (
    <section aria-labelledby="join-title" className="container-page pt-24 sm:pt-[120px]">
      <Reveal variant="rise" className="relative flex flex-wrap items-center gap-7 overflow-hidden rounded-[40px] bg-surface p-[clamp(24px,4vw,56px)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-40 size-[420px] rounded-full bg-lime/70 blur-3xl motion-safe:animate-[float-y_8s_ease-in-out_infinite]"
        />
        <div className="relative flex-[1_1_420px]">
          <SplitReveal as="h2" id="join-title" by="words" className="text-[clamp(30px,3.4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.035em]">
            Read every paper in full.
          </SplitReveal>
          <p className="mt-3.5 max-w-[520px] text-base leading-relaxed text-muted">
            Abstracts are open to everyone. A free account unlocks full text, figures and video, plus comments and likes.
          </p>
        </div>
        <div className="relative flex flex-wrap gap-3">
          <Magnetic>
            <AuthTrigger mode="register" className="h-[58px] rounded-full bg-ink px-7 text-[15px] font-bold text-white hover:bg-[#26302e]">
              Create free account
            </AuthTrigger>
          </Magnetic>
          <Magnetic>
            <AuthTrigger mode="signin" className="h-[58px] rounded-full bg-line px-7 text-[15px] font-bold hover:bg-[#d9dfd9]">
              Sign in
            </AuthTrigger>
          </Magnetic>
        </div>
      </Reveal>
    </section>
  );
}
