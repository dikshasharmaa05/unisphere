/**
 * Particle globe — dots on a sphere linked by great-circle arcs, teal palette.
 * Rendered as static SVG on the server (deterministic, no JS shipped).
 * Mirrors design-reference/assets/globe.svg, but generated procedurally so it
 * stays crisp at any size and can be tuned (density, tilt, arcs) in one place.
 */

type V3 = [number, number, number];

const SIZE = 900;
const C = SIZE / 2;
const R = 330;
const DOTS = 760;
const TILT = (-22 * Math.PI) / 180; // rotate around X (lean toward viewer)
const SPIN = (35 * Math.PI) / 180; // rotate around Y

// Seeded PRNG (mulberry32) so server output is stable between renders.
function prng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rotate([x, y, z]: V3): V3 {
  // around Y
  const x1 = x * Math.cos(SPIN) + z * Math.sin(SPIN);
  const z1 = -x * Math.sin(SPIN) + z * Math.cos(SPIN);
  // around X
  const y2 = y * Math.cos(TILT) - z1 * Math.sin(TILT);
  const z2 = y * Math.sin(TILT) + z1 * Math.cos(TILT);
  return [x1, y2, z2];
}

const fromLatLon = (lat: number, lon: number): V3 => {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  return [Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

const r1 = (n: number) => Math.round(n * 10) / 10;

function slerp(a: V3, b: V3, t: number): V3 {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const om = Math.acos(dot);
  if (om < 1e-6) return a;
  const s = Math.sin(om);
  const k1 = Math.sin((1 - t) * om) / s;
  const k2 = Math.sin(t * om) / s;
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
}

function buildGlobe() {
  const rand = prng(237);

  // Fibonacci sphere dots, front hemisphere brighter.
  const dots: { x: number; y: number; r: number; fill: string; o: number }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < DOTS; i++) {
    const y = 1 - (i / (DOTS - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    const [px, py, pz] = rotate([Math.cos(th) * rad, y, Math.sin(th) * rad]);
    if (pz < -0.25) continue; // far back — skip to keep markup light
    const depth = (pz + 1) / 2; // 0 back … 1 front
    const fill = pz < 0 ? "#A9E3D8" : depth > 0.86 ? "#2E9C88" : depth > 0.7 ? "#3FBFB0" : "#7FD6CF";
    dots.push({
      x: r1(C + px * R),
      y: r1(C + py * R),
      r: r1(1.1 + depth * 1.9 + rand() * 0.5),
      fill: rand() < 0.035 && pz > 0.2 ? "#D7EC8C" : fill,
      o: Math.round((pz < 0 ? 0.25 : 0.45 + depth * 0.5) * 100) / 100,
    });
  }

  // Research hubs (lat, lon) — abstract, not a literal map.
  const hubs: V3[] = [
    [38, -20], [52, 10], [18, 40], [-8, 25], [30, 70], [-22, -10],
    [8, -45], [55, 60], [-35, 50], [12, 5], [42, 35], [-12, 75],
  ].map(([la, lo]) => fromLatLon(la as number, lo as number));

  const links: [number, number][] = [
    [0, 1], [1, 4], [0, 6], [6, 5], [5, 3], [3, 2], [2, 4], [1, 10],
    [10, 7], [9, 3], [9, 2], [3, 8], [8, 11], [4, 11], [0, 9],
  ];

  const arcs = links.map(([a, b]) => {
    const pa = hubs[a]!;
    const pb = hubs[b]!;
    const steps = 40;
    let d = "";
    let pen = false;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const p = slerp(pa, pb, t);
      const lift = 1 + Math.sin(Math.PI * t) * 0.12; // arc rises off the surface
      const [x, y, z] = rotate([p[0] * lift, p[1] * lift, p[2] * lift]);
      if (z < -0.05) {
        pen = false;
        continue;
      }
      d += `${pen ? "L" : "M"}${r1(C + x * R)} ${r1(C + y * R)} `;
      pen = true;
    }
    return d.trim();
  });

  const nodes = hubs
    .map((h) => rotate(h))
    .filter(([, , z]) => z > 0)
    .map(([x, y]) => ({ x: r1(C + x * R), y: r1(C + y * R) }));

  return { dots, arcs, nodes };
}

const globe = buildGlobe();

export function Globe({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <radialGradient id="globe-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E4F6F1" stopOpacity="0.95" />
          <stop offset="62%" stopColor="#D3F0E8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#F4F5F3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="globe-core" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#BFE7DC" stopOpacity="0.25" />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={440} fill="url(#globe-halo)" />
      <circle cx={C} cy={C} r={R} fill="url(#globe-core)" />
      <g>
        {globe.dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.fill} fillOpacity={d.o} />
        ))}
      </g>
      <g fill="none" stroke="#2E9C88" strokeOpacity="0.55" strokeWidth="1.3">
        {globe.arcs.map((d, i) => (d ? <path key={i} d={d} /> : null))}
      </g>
      <g>
        {globe.nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={9} fill="#2E9C88" fillOpacity="0.16" />
            <circle cx={n.x} cy={n.y} r={3.6} fill="#0E6E62" />
          </g>
        ))}
      </g>
      <g style={{ transformOrigin: "450px 450px", animation: "globe-spin 120s linear infinite" }}>
        <ellipse cx={C} cy={C} rx={410} ry={120} fill="none" stroke="#2E9C88" strokeOpacity="0.22" transform={`rotate(-18 ${C} ${C})`} />
      </g>
      <ellipse
        cx={C}
        cy={C}
        rx={430}
        ry={150}
        fill="none"
        stroke="#7FD6CF"
        strokeOpacity="0.35"
        strokeDasharray="2 6"
        transform={`rotate(14 ${C} ${C})`}
      />
    </svg>
  );
}
