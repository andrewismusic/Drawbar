// Garden plants (magical: glowing fungi, fruit and strange flowers). Each brush sprouts stalks from the drawn line
// with a head at the tip; with Beads, each bead becomes one head. Built once per stroke in the stroke's own space,
// seeded by the stroke's id, so the same drawing always grows the same garden. Flat colour pieces keyed by name
// (see styles/garden.js for their colours), no outlines, nothing lit: no re-lighting needed.
import { TAU, mulberry32, hash32 } from '../core/math.js';

// ----- Path helpers. A "frame" maps (u along the head's direction, v across it) to the drawing -----
const frame = (x, y, ang) => { const ux = Math.cos(ang), uy = Math.sin(ang); return (u, v) => [x + ux * u - uy * v, y + uy * u + ux * v]; };
const circ = (P, [x, y], r) => { P.moveTo(x + r, y); P.arc(x, y, r, 0, TAU); };
const ell = (P, [x, y], rx, ry, rot) => { P.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); P.ellipse(x, y, rx, ry, rot, 0, TAU); };
// A dome: half an ellipse bulging along ang, flat side at (x, y)
function dome(P, [x, y], rx, ry, ang) {
  const px = -Math.sin(ang), py = Math.cos(ang);
  P.moveTo(x - px * rx, y - py * rx); P.ellipse(x, y, rx, ry, ang + Math.PI / 2, Math.PI, TAU); P.closePath();
}
function leaf(P, [x, y], ang, len, wid) {
  const f = frame(x, y, ang), e = f(len, 0), a = f(len * 0.5, wid), b = f(len * 0.5, -wid);
  P.moveTo(x, y); P.quadraticCurveTo(a[0], a[1], e[0], e[1]); P.quadraticCurveTo(b[0], b[1], x, y); P.closePath();
}
// A curved, tapering stalk from a to b; returns the direction it arrives in
function stalk(P, a, b, bend, w0, w1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, px = -dy / d, py = dx / d;
  const c = [a[0] + dx * 0.5 + px * bend * d, a[1] + dy * 0.5 + py * bend * d];
  P.moveTo(a[0] + px * w0, a[1] + py * w0); P.quadraticCurveTo(c[0] + px * w1, c[1] + py * w1, b[0] + px * w1, b[1] + py * w1);
  P.lineTo(b[0] - px * w1, b[1] - py * w1); P.quadraticCurveTo(c[0] - px * w1, c[1] - py * w1, a[0] - px * w0, a[1] - py * w0); P.closePath();
  return Math.atan2(b[1] - c[1], b[0] - c[0]);
}
const halo = () => {};   // heads no longer glow (v24); kept so the head recipes read the same

// ----- Heads. g: { P: keyed paths, rnd }, (x, y): where the stalk ends, R: size, ang: the way the stalk points -----
const HEADS = {
  // Mushroom: a dome cap in one of two colours, pale gills, spots
  glowcap(g, x, y, R, ang) {
    const f = frame(x, y, ang), v = g.rnd() < 0.55 ? 'A' : 'B';
    halo(g, f(R * 0.4, 0), R);
    ell(g.P.gill, f(0, 0), R * 0.95, R * 0.16, ang + Math.PI / 2);
    dome(g.P['cap' + v], f(0, 0), R, R * 0.85, ang);
    dome(g.P['cap' + v + 'Hi'], f(R * 0.12, R * 0.18), R * 0.62, R * 0.5, ang);
    for (let k = 0, n = 3 + Math.floor(g.rnd() * 3); k < n; k++) circ(g.P.spot, f(R * (0.18 + 0.45 * g.rnd()), R * (g.rnd() * 1.2 - 0.6)), R * (0.07 + 0.08 * g.rnd()));
  },
  // Tall pointed cap with a frilled edge
  bellcap(g, x, y, R, ang) {
    const f = frame(x, y, ang), tip = f(R * 2.3, R * (g.rnd() - 0.5) * 0.5), P = g.P.cap, H = g.P.capHi;
    halo(g, f(R * 0.9, 0), R);
    let a = f(0, -R * 0.75), b = f(0, R * 0.75), c1 = f(R * 1.0, -R * 0.85), c2 = f(R * 1.0, R * 0.85);
    P.moveTo(a[0], a[1]); P.quadraticCurveTo(c1[0], c1[1], tip[0], tip[1]); P.quadraticCurveTo(c2[0], c2[1], b[0], b[1]); P.closePath();
    a = f(R * 0.1, R * 0.05); c1 = f(R * 1.0, R * 0.1); c2 = f(R * 0.9, R * 0.7); b = f(R * 0.1, R * 0.6);
    H.moveTo(a[0], a[1]); H.quadraticCurveTo(c1[0], c1[1], tip[0], tip[1]); H.quadraticCurveTo(c2[0], c2[1], b[0], b[1]); H.closePath();
    for (let k = 0; k < 5; k++) circ(g.P.frill, f(-R * 0.02, R * (-0.6 + k * 0.3)), R * 0.14);
  },
  // Trumpet: a funnel with a bright rim and stamens rising out of it
  trumpet(g, x, y, R, ang) {
    const f = frame(x, y, ang), P = g.P.horn, top = R * 1.25;
    halo(g, f(top, 0), R);
    const a = f(0, -R * 0.12), b = f(top, -R), c = f(top, R), d = f(0, R * 0.12), c1 = f(R * 0.85, -R * 0.12), c2 = f(R * 0.85, R * 0.12);
    P.moveTo(a[0], a[1]); P.quadraticCurveTo(c1[0], c1[1], b[0], b[1]); P.lineTo(c[0], c[1]); P.quadraticCurveTo(c2[0], c2[1], d[0], d[1]); P.closePath();
    ell(g.P.rim, f(top, 0), R, R * 0.3, ang + Math.PI / 2);
    ell(g.P.inner, f(top, 0), R * 0.72, R * 0.17, ang + Math.PI / 2);
    for (let k = 0; k < 4; k++) { const e = f(top + R * (0.5 + 0.5 * g.rnd()), R * (g.rnd() * 1.2 - 0.6)); stalk(g.P.stamen, f(top, R * (k - 1.5) * 0.2), e, 0.1, R * 0.03, R * 0.02); circ(g.P.dot, e, R * 0.07); }
  },
  // Curling tendril ending in a bud
  spiral(g, x, y, R, ang) {
    const dir = g.rnd() < 0.5 ? 1 : -1, c = frame(x, y, ang)(R * 0.9, 0);
    halo(g, c, R * 0.8);
    let q = c;
    for (let k = 0; k <= 16; k++) { const t = k / 16, a = ang + Math.PI + dir * t * 2.4 * Math.PI, rad = R * 0.9 * (1 - t * 0.85); q = [c[0] + Math.cos(a) * rad, c[1] + Math.sin(a) * rad]; circ(g.P.curl, q, R * (0.17 - 0.09 * t)); }
    circ(g.P.dot, q, R * 0.16);
    leaf(g.P.leaf, [x, y], ang + dir * 1.9, R * 0.9, R * 0.3);
  },
  // Branching coral with flat glowing pads at the tips
  coral(g, x, y, R, ang) {
    const grow = (p, a, len, depth) => {
      const e = [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len];
      stalk(g.P.branch, p, e, (g.rnd() - 0.5) * 0.3, len * 0.09 * (depth + 1), len * 0.07 * (depth + 1));
      if (depth > 0) { grow(e, a - 0.45 - 0.3 * g.rnd(), len * 0.72, depth - 1); grow(e, a + 0.45 + 0.3 * g.rnd(), len * 0.72, depth - 1); return; }
      halo(g, e, len * 0.5);
      ell(g.P.pad, e, len * 0.85, len * 0.26, a + Math.PI / 2); ell(g.P.padHi, [e[0] + Math.cos(a) * len * 0.08, e[1] + Math.sin(a) * len * 0.08], len * 0.6, len * 0.13, a + Math.PI / 2);
    };
    grow([x, y], ang, R, 2);
  },
  // A cluster of glowing fruit
  moonberry(g, x, y, R, ang) {
    const f = frame(x, y, ang);
    leaf(g.P.leaf, [x, y], ang + 1.1, R * 1.1, R * 0.35); leaf(g.P.leaf, [x, y], ang - 1.2, R * 0.9, R * 0.3);
    for (let k = 0, n = 2 + Math.floor(g.rnd() * 3); k < n; k++) {
      const c = f(R * (0.4 + 0.5 * g.rnd()), R * (g.rnd() - 0.5) * 1.1), r = R * (0.3 + 0.14 * g.rnd());
      halo(g, c, r * 1.2); circ(g.P.berry, c, r); circ(g.P.berryHi, [c[0] - r * 0.25, c[1] - r * 0.28], r * 0.55); circ(g.P.shine, [c[0] - r * 0.38, c[1] - r * 0.4], r * 0.16);
    }
  },
  // Lantern fruit: a teardrop with a bright heart
  lantern(g, x, y, R, ang) {
    const f = frame(x, y, ang), c = f(R * 1.0, 0), a = f(R * 0.55, -R * 0.52), b = f(R * 0.55, R * 0.52);
    halo(g, c, R * 1.1);
    g.P.lamp.moveTo(x, y); g.P.lamp.lineTo(a[0], a[1]); g.P.lamp.lineTo(b[0], b[1]); g.P.lamp.closePath(); circ(g.P.lamp, c, R * 0.7);
    ell(g.P.band, c, R * 0.7, R * 0.12, ang + Math.PI / 2);
    circ(g.P.lampHi, f(R * 1.05, 0), R * 0.38); circ(g.P.shine, f(R * 0.95, -R * 0.2), R * 0.12);
  },
  // Spotted puffball letting spores drift off
  puffball(g, x, y, R, ang) {
    const f = frame(x, y, ang), c = f(R * 0.7, 0), r = R * 0.8;
    halo(g, c, r);
    circ(g.P.ball, c, r); circ(g.P.ballHi, [c[0] - r * 0.22, c[1] - r * 0.25], r * 0.6);
    for (let k = 0, n = 4 + Math.floor(g.rnd() * 3); k < n; k++) { const a = g.rnd() * TAU, d = r * 0.7 * Math.sqrt(g.rnd()); circ(g.P.spot, [c[0] + Math.cos(a) * d, c[1] + Math.sin(a) * d], r * (0.1 + 0.1 * g.rnd())); }
    for (let k = 0; k < 4; k++) circ(g.P.spore, f(R * (1.7 + 1.3 * g.rnd()), R * (g.rnd() - 0.5) * 1.6), R * (0.04 + 0.05 * g.rnd()));
  },
  // Star-shaped bloom with two rings of pointed petals
  starbloom(g, x, y, R, ang) {
    const c = frame(x, y, ang)(R * 0.6, 0), rot = g.rnd() * TAU, n = 6 + Math.floor(g.rnd() * 3);
    halo(g, c, R);
    for (let k = 0; k < n; k++) leaf(g.P.petal, c, rot + k * TAU / n, R * 1.15, R * 0.32);
    for (let k = 0; k < n; k++) leaf(g.P.petalHi, c, rot + (k + 0.5) * TAU / n, R * 0.7, R * 0.2);
    circ(g.P.ctr, c, R * 0.26);
    for (let k = 0; k < 5; k++) { const a = g.rnd() * TAU; circ(g.P.dot, [c[0] + Math.cos(a) * R * 0.14, c[1] + Math.sin(a) * R * 0.14], R * 0.05); }
  },
};
// How each plant grows along a line, in multiples of the line's half-width: gap between plants, stalk length (0 = no
// stalk: flowers and fruit are just heads, sitting on the line), head size, stalk width, and which side (up = toward the top of the drawing, alt = alternating, any = either)
const SPROUT = {
  glowcap: { gap: [1.6, 2.8], len: [1.2, 2.8], R: [0.8, 1.3], w: 0.16, side: 'up' },
  bellcap: { gap: [1.3, 2.3], len: [1.4, 3.2], R: [0.55, 0.95], w: 0.14, side: 'up' },
  trumpet: { gap: [1.9, 2.9], len: [0.7, 1.8], R: [0.9, 1.3], w: 0.14, side: 'up' },
  spiral: { gap: [1.0, 1.7], len: [0, 0], R: [0.7, 1.2], w: 0, side: 'alt' },
  coral: { gap: [3.0, 4.2], len: [0.3, 0.6], R: [1.1, 1.6], w: 0.2, side: 'up' },
  moonberry: { gap: [1.0, 1.7], len: [0, 0], R: [0.7, 1.0], w: 0, side: 'any' },
  lantern: { gap: [1.3, 2.2], len: [0, 0], R: [0.7, 1.0], w: 0, side: 'any' },
  puffball: { gap: [1.4, 2.3], len: [1.0, 2.4], R: [0.7, 1.1], w: 0.13, side: 'up' },
  starbloom: { gap: [2.2, 3.2], len: [0, 0], R: [1.0, 1.5], w: 0, side: 'any' },
};

// Grow a plant. keys: the piece names this plant's material colours. Returns { key: Path2D, ..., all: every piece }.
// line: { xs, ys, nx, ny, w, L, n, w0 } along a drawn line, or beads: [{ x, y, r }] for one head per bead.
export function growPlant(kind, keys, id, line, beads) {
  const made = {}, P = new Proxy(made, { get: (t, k) => t[k] || (t[k] = new Path2D()) });
  const g = { P, rnd: mulberry32(hash32(id, 777)) }, rnd = g.rnd, between = ([a, b]) => a + (b - a) * rnd();
  if (beads) {
    for (const b of beads) HEADS[kind](g, b.x, b.y, b.r * 2.2, -Math.PI / 2 + (rnd() - 0.5) * 0.5);
  } else {
    const { xs, ys, nx, ny, L, n, w0 } = line, S = SPROUT[kind];
    // "Up" is the side of the line facing the top of the drawing, so caps and stalks rise in free mode
    let sy = 0;
    for (let i = 0; i < n; i++) sy += ny[i];
    const up = sy > 0 ? -1 : 1;
    let d = w0 * rnd(), j = 0, alt = 1;
    while (d < L[n - 1]) {
      while (j < n - 1 && L[j] < d) j++;
      const side = S.side === 'up' ? up : S.side === 'alt' ? (alt = -alt) : rnd() < 0.5 ? 1 : -1;
      const ang = Math.atan2(ny[j] * side, nx[j] * side) + (rnd() - 0.5) * 0.7, len = w0 * between(S.len);
      const base = [xs[j], ys[j]], tip = [xs[j] + Math.cos(ang) * len, ys[j] + Math.sin(ang) * len];
      const arrive = len > 0 ? stalk(P.stalk, base, tip, (rnd() - 0.5) * 0.5, w0 * S.w, w0 * S.w * 0.7) : S.side === 'any' ? rnd() * TAU : ang;
      HEADS[kind](g, tip[0], tip[1], w0 * between(S.R) * 1.35, arrive);
      d += w0 * between(S.gap);
    }
  }
  const out = {}, all = new Path2D();
  for (const k of keys) { out[k] = made[k] || new Path2D(); all.addPath(out[k]); }
  return { ...out, all };
}
