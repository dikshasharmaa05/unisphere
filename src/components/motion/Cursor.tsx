"use client";

import { useRef } from "react";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";

/**
 * Custom cursor for fine pointers: a dot that tracks exactly and a ring that trails.
 * Over links/buttons the ring grows; over [data-cursor="Label"] it becomes a lime
 * disc with that label ("Read", "Drag"…). The native cursor stays visible.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MQ.fine, () => {
      const d = dot.current!;
      const r = ring.current!;
      gsap.set([d, r], { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      const dx = gsap.quickTo(d, "x", { duration: 0.08, ease: "power3" });
      const dy = gsap.quickTo(d, "y", { duration: 0.08, ease: "power3" });
      const rx = gsap.quickTo(r, "x", { duration: 0.45, ease: "power3" });
      const ry = gsap.quickTo(r, "y", { duration: 0.45, ease: "power3" });
      let shown = false;
      let mode = "";

      const setMode = (next: string, text = "") => {
        if (next === mode && label.current?.textContent === text) return;
        mode = next;
        if (label.current) label.current.textContent = text;
        if (next === "label") {
          gsap.to(r, { width: 88, height: 88, backgroundColor: "#E9F5B8", borderColor: "rgba(20,26,25,0)", duration: 0.35, ease: "power3.out" });
          gsap.to(label.current, { autoAlpha: 1, scale: 1, duration: 0.25, delay: 0.05 });
          gsap.to(d, { scale: 0, duration: 0.2 });
        } else if (next === "link") {
          gsap.to(r, { width: 56, height: 56, backgroundColor: "rgba(233,245,184,0.35)", borderColor: "rgba(20,26,25,0.35)", duration: 0.3, ease: "power3.out" });
          gsap.to(label.current, { autoAlpha: 0, scale: 0.6, duration: 0.15 });
          gsap.to(d, { scale: 0.6, duration: 0.2 });
        } else {
          gsap.to(r, { width: 34, height: 34, backgroundColor: "rgba(233,245,184,0)", borderColor: "rgba(20,26,25,0.35)", duration: 0.3, ease: "power3.out" });
          gsap.to(label.current, { autoAlpha: 0, scale: 0.6, duration: 0.15 });
          gsap.to(d, { scale: 1, duration: 0.2 });
        }
      };

      let lastX = -1;
      let lastY = -1;
      const updateMode = (t: Element | null) => {
        const labelled = t?.closest<HTMLElement>("[data-cursor]");
        if (labelled) setMode("label", labelled.dataset.cursor ?? "");
        else if (t?.closest("a, button, [role='button'], input, select, textarea, label")) setMode("link");
        else setMode("");
      };
      // Content moves under a still mouse while scrolling — re-check what's beneath it.
      const onScroll = () => {
        if (shown && lastX >= 0) updateMode(document.elementFromPoint(lastX, lastY));
      };
      const move = (e: PointerEvent) => {
        if (e.pointerType !== "mouse") return;
        lastX = e.clientX;
        lastY = e.clientY;
        if (!shown) {
          gsap.set([d, r], { x: e.clientX, y: e.clientY });
          gsap.to([d, r], { autoAlpha: 1, duration: 0.3 });
          shown = true;
        }
        dx(e.clientX);
        dy(e.clientY);
        rx(e.clientX);
        ry(e.clientY);
        updateMode(e.target as Element | null);
      };
      const leave = () => {
        gsap.to([d, r], { autoAlpha: 0, duration: 0.25 });
        shown = false;
      };
      const down = () => gsap.to(r, { scale: 0.85, duration: 0.15 });
      const up = () => gsap.to(r, { scale: 1, duration: 0.3, ease: "back.out(3)" });

      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      document.documentElement.addEventListener("pointerleave", leave);
      window.addEventListener("pointerdown", down);
      window.addEventListener("pointerup", up);
      return () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("scroll", onScroll);
        document.documentElement.removeEventListener("pointerleave", leave);
        window.removeEventListener("pointerdown", down);
        window.removeEventListener("pointerup", up);
      };
    });
    return () => mm.revert();
  });

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100] hidden [@media(pointer:fine)]:block">
      <div ref={ring} className="invisible fixed left-0 top-0 flex size-[34px] items-center justify-center rounded-full border border-ink/35">
        <span ref={label} className="invisible scale-50 text-[13px] font-bold text-ink">
          {""}
        </span>
      </div>
      <div ref={dot} className="invisible fixed left-0 top-0 size-1.5 rounded-full bg-ink" />
    </div>
  );
}
