"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Live particle globe on <canvas>: a dotted sphere that rotates in 3D, great-circle
 * arcs between research hubs with light pulses travelling along them, and pulsing hub
 * nodes. Drag (or swipe) to spin it; it eases back to its own rotation.
 *
 * - Pauses when off-screen or when the tab is hidden.
 * - prefers-reduced-motion: draws a single still frame.
 * - The static SVG `fallback` stays visible until the first frame is painted (and without JS).
 */

type V3 = [number, number, number];

const DOTS = 900;
const AUTO_SPEED = 0.22; // rad/s ≈ one full turn every ~28s
const TILT = (-20 * Math.PI) / 180;

const HUBS: [number, number][] = [
  [38, -20], [52, 10], [18, 40], [-8, 25], [30, 70], [-22, -10], [8, -45],
  [55, 60], [-35, 50], [12, 5], [42, 35], [-12, 75], [25, 120], [-30, 150],
  [45, -100], [-15, -70], [60, 160], [5, 100],
];
const LINKS: [number, number][] = [
  [0, 1], [1, 4], [0, 6], [6, 5], [5, 3], [3, 2], [2, 4], [1, 10], [10, 7], [9, 3],
  [9, 2], [3, 8], [8, 11], [4, 11], [0, 9], [4, 12], [12, 13], [11, 17], [17, 12],
  [7, 16], [16, 12], [6, 14], [14, 0], [15, 5], [15, 6], [13, 8],
];

const fromLatLon = (lat: number, lon: number): V3 => {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

function slerp(a: V3, b: V3, t: number): V3 {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const om = Math.acos(dot);
  if (om < 1e-6) return a;
  const s = Math.sin(om);
  const k1 = Math.sin((1 - t) * om) / s;
  const k2 = Math.sin(t * om) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

// Precompute geometry once (unit sphere, unrotated).
const dots: V3[] = (() => {
  const out: V3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < DOTS; i++) {
    const y = 1 - (i / (DOTS - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    out.push([Math.cos(golden * i) * r, y, Math.sin(golden * i) * r]);
  }
  return out;
})();
const hubs: V3[] = HUBS.map(([la, lo]) => fromLatLon(la, lo));
const ARC_STEPS = 48;
const arcs: V3[][] = LINKS.map(([a, b]) => {
  const pts: V3[] = [];
  for (let s = 0; s <= ARC_STEPS; s++) {
    const t = s / ARC_STEPS;
    const p = slerp(hubs[a]!, hubs[b]!, t);
    const lift = 1 + Math.sin(Math.PI * t) * 0.16;
    pts.push([p[0] * lift, p[1] * lift, p[2] * lift]);
  }
  return pts;
});
// Deterministic sprinkle of lime "highlight" dots.
const limeDot = dots.map((_, i) => (i * 2654435761) % 997 < 30);

type Palette = { dot: [number, number, number]; deep: [number, number, number]; arc: string; pulse: string; node: string };
const PALETTES: Record<"light" | "dark", Palette> = {
  light: { dot: [46, 156, 136], deep: [14, 110, 98], arc: "46,156,136", pulse: "#D7EC8C", node: "#0E6E62" },
  dark: { dot: [127, 214, 207], deep: [169, 227, 216], arc: "127,214,207", pulse: "#E9F5B8", node: "#A9E3D8" },
};

export function AnimatedGlobe({
  className,
  label,
  tone = "light",
  fallback,
  interactive = true,
}: {
  className?: string;
  /** Accessible description; omit for purely decorative use. */
  label?: string;
  tone?: "light" | "dark";
  fallback?: React.ReactNode;
  interactive?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    if (!el || !box) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const pal = PALETTES[tone];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let size = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = box.clientWidth;
      el.width = Math.round(size * dpr);
      el.height = Math.round(size * dpr);
    };
    resize();

    let angle = 0.6;
    let velocity = AUTO_SPEED;
    let tiltOffset = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let time = 0;

    const project = (p: V3, cy: number, sy: number, ct: number, st: number): V3 => {
      const x1 = p[0] * cy + p[2] * sy;
      const z1 = -p[0] * sy + p[2] * cy;
      const y2 = p[1] * ct - z1 * st;
      const z2 = p[1] * st + z1 * ct;
      return [x1, y2, z2];
    };

    const draw = () => {
      const S = size * dpr;
      const C = S / 2;
      const R = S * 0.37;
      ctx.clearRect(0, 0, S, S);

      const cy = Math.cos(angle);
      const sy = Math.sin(angle);
      const tilt = TILT + tiltOffset;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);

      // Soft core
      const g = ctx.createRadialGradient(C * 0.82, C * 0.72, R * 0.1, C, C, R * 1.05);
      if (tone === "light") {
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(1, "rgba(191,231,220,0.28)");
      } else {
        g.addColorStop(0, "rgba(205,237,228,0.20)");
        g.addColorStop(1, "rgba(205,237,228,0.02)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(C, C, R, 0, Math.PI * 2);
      ctx.fill();

      // Dots
      for (let i = 0; i < DOTS; i++) {
        const [x, y, z] = project(dots[i]!, cy, sy, ct, st);
        const depth = (z + 1) / 2; // 0 back … 1 front
        if (z < -0.55) continue;
        const r = (0.9 + depth * 2.1) * dpr;
        const a = z < 0 ? 0.12 + depth * 0.2 : 0.35 + depth * 0.6;
        if (limeDot[i] && z > 0.1) {
          ctx.fillStyle = `rgba(215,236,140,${Math.min(1, a + 0.2)})`;
        } else {
          const c = depth > 0.82 ? pal.deep : pal.dot;
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
        }
        ctx.beginPath();
        ctx.arc(C + x * R, C + y * R, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Arcs + travelling pulses
      ctx.lineWidth = 1.3 * dpr;
      for (let k = 0; k < arcs.length; k++) {
        const pts = arcs[k]!;
        let prev: V3 | null = null;
        for (let s = 0; s <= ARC_STEPS; s++) {
          const p = project(pts[s]!, cy, sy, ct, st);
          if (prev && p[2] > -0.1 && prev[2] > -0.1) {
            const a = 0.18 + ((p[2] + 1) / 2) * 0.5;
            ctx.strokeStyle = `rgba(${pal.arc},${a})`;
            ctx.beginPath();
            ctx.moveTo(C + prev[0] * R, C + prev[1] * R);
            ctx.lineTo(C + p[0] * R, C + p[1] * R);
            ctx.stroke();
          }
          prev = p;
        }
        // pulse
        const t = (((time * 0.18 + k * 0.137) % 1) + 1) % 1;
        const idx = Math.min(ARC_STEPS, Math.max(0, Math.floor(t * ARC_STEPS)));
        const p = project(pts[idx]!, cy, sy, ct, st);
        if (p[2] > 0) {
          const pr = (2.6 + p[2] * 1.8) * dpr;
          ctx.fillStyle = pal.pulse;
          ctx.shadowColor = pal.pulse;
          ctx.shadowBlur = 10 * dpr;
          ctx.beginPath();
          ctx.arc(C + p[0] * R, C + p[1] * R, pr, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Hub nodes with breathing rings
      for (let h = 0; h < hubs.length; h++) {
        const [x, y, z] = project(hubs[h]!, cy, sy, ct, st);
        if (z < 0.02) continue;
        const px = C + x * R;
        const py = C + y * R;
        const phase = (time * 0.9 + h * 0.31) % 1;
        ctx.strokeStyle = `rgba(${pal.arc},${(1 - phase) * 0.5 * z})`;
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath();
        ctx.arc(px, py, (5 + phase * 14) * dpr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(${pal.arc},${0.18 * z})`;
        ctx.beginPath();
        ctx.arc(px, py, 8 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.node;
        ctx.beginPath();
        ctx.arc(px, py, 3.4 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    setPainted(true);
    if (reduce) {
      const ro = new ResizeObserver(() => {
        resize();
        draw();
      });
      ro.observe(box);
      return () => ro.disconnect();
    }

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const loop = (now: number) => {
      // rAF timestamps can precede `last` (set via performance.now()) — never step backwards.
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      time += dt;
      if (!dragging) {
        velocity += (AUTO_SPEED - velocity) * Math.min(1, dt * 1.6); // ease back to cruise
        tiltOffset *= 1 - Math.min(1, dt * 1.2);
      }
      angle += velocity * dt;
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!raf && visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(box);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(box);

    // Drag / swipe to spin
    const down = (e: PointerEvent) => {
      if (!interactive) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const k = 4 / Math.max(200, size);
      angle += dx * k;
      velocity = dx * k * 60;
      tiltOffset = Math.max(-0.5, Math.min(0.5, tiltOffset - dy * k));
    };
    const up = () => {
      dragging = false;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    start();
    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
  }, [tone, interactive]);

  return (
    <div ref={wrap} className={cn("relative aspect-square", className)}>
      {fallback && (
        <div aria-hidden={painted || undefined} className={cn("absolute inset-0 transition-opacity duration-700", painted && "opacity-0")}>
          {fallback}
        </div>
      )}
      <canvas
        ref={canvas}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-700",
          painted ? "opacity-100" : "opacity-0",
          interactive && "cursor-grab touch-pan-y active:cursor-grabbing",
        )}
      />
    </div>
  );
}
