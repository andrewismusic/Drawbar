// Garden plants: each plant brush grows keyed pieces (leaves, petals, berries, blades...) along the drawn line, or,
// with Beads, one bloom or clump at each bead. Built once per stroke in the stroke's own space, seeded by the stroke's
// id, so the same drawing always grows the same garden. Flat colour, no outlines, nothing lit: no re-lighting needed.
import { TAU, mulberry32, hash32 } from '../core/math.js';

// ----- Path helpers -----
const circ = (P, x, y, r) => { P.moveTo(x + r, y); P.arc(x, y, r, 0, TAU); };
const ell = (P, x, y, rx, ry, rot) => { P.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); P.ellipse(x, y, rx, ry, rot, 0, TAU); };
// A leaf from (x, y) pointing along ang: two curves meeting at the tip
function leaf(P, x, y, ang, len, wid) {
  const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux, ex = x + ux * len, ey = y + uy * len, mx = x + ux * len * 0.5, my = y + uy * len * 0.5;
  P.moveTo(x, y); P.quadraticCurveTo(mx + px * wid, my + py * wid, ex, ey); P.quadraticCurveTo(mx - px * wid, my - py * wid, x, y); P.closePath();
}
// A grass blade: wide at the base, bending to a point
function blade(P, x, y, ang, len, wid, bend) {
  const ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
  const tx = x + ux * len + px * bend * len, ty = y + uy * len + py * bend * len, cx = x + ux * len * 0.55 + px * bend * len * 0.3, cy = y + uy * len * 0.55 + py * bend * len * 0.3;
  P.moveTo(x - px * wid, y - py * wid); P.quadraticCurveTo(cx - px * wid * 0.5, cy - py * wid * 0.5, tx, ty);
  P.quadraticCurveTo(cx + px * wid * 0.5, cy + py * wid * 0.5, x + px * wid, y + py * wid); P.closePath();
}
// A thin stalk from a to b (a capsule)
function stalk(P, ax, ay, bx, by, r) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1e-6, px = -dy / d * r, py = dx / d * r;
  P.moveTo(ax + px, ay + py); P.lineTo(bx + px, by + py); P.arc(bx, by, r, Math.atan2(py, px), Math.atan2(py, px) + Math.PI);
  P.lineTo(ax - px, ay - py); P.arc(ax, ay, r, Math.atan2(-py, -px), Math.atan2(-py, -px) + Math.PI); P.closePath();
}
function petals(P, x, y, R, count, pr, rot) {
  for (let k = 0; k < count; k++) { const a = rot + k * TAU / count; ell(P, x + Math.cos(a) * R, y + Math.sin(a) * R, pr * 1.5, pr * 0.7, a); }
}

// ----- Blooms and clumps (used along the line, and on their own for Beads) -----
// g: { P: keyed paths, rnd }, (x, y): centre, R: size, ang: the "up" direction
const HEADS = {
  daisy(g, x, y, R) { petals(g.P.petal, x, y, R * 0.62, 11, R * 0.3, g.rnd() * TAU); circ(g.P.ctr, x, y, R * 0.34); circ(g.P.dot, x - R * 0.08, y - R * 0.08, R * 0.12); },
  tulip(g, x, y, R, ang) {
    const k = g.rnd() < 0.34 ? 'cupA' : g.rnd() < 0.5 ? 'cupB' : 'cupC', ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
    ell(g.P[k], x - px * R * 0.32, y - py * R * 0.32, R * 0.62, R * 0.36, ang + 0.25);
    ell(g.P[k], x + px * R * 0.32, y + py * R * 0.32, R * 0.62, R * 0.36, ang - 0.25);
    ell(g.P[k + 'Hi'], x + ux * R * 0.1, y + uy * R * 0.1, R * 0.6, R * 0.3, ang);
  },
  lavender(g, x, y, R, ang) {
    const ux = Math.cos(ang), uy = Math.sin(ang);
    stalk(g.P.stalk, x, y, x + ux * R * 2.2, y + uy * R * 2.2, R * 0.08);
    for (let k = 0; k < 7; k++) { const t = 0.7 + k * 0.24, s = R * (0.34 - k * 0.025), side = k % 2 ? 1 : -1; ell(k % 3 ? g.P.bud : g.P.budHi, x + ux * R * t - uy * s * 0.5 * side, y + uy * R * t + ux * s * 0.5 * side, s, s * 0.6, ang); }
  },
  fern(g, x, y, R, ang) {
    for (let k = 0; k < 5; k++) { const t = k / 5, a = ang + (k % 2 ? 0.9 : -0.9); leaf(k % 2 ? g.P.leaf : g.P.leafHi, x + Math.cos(ang) * R * t * 1.6, y + Math.sin(ang) * R * t * 1.6, a, R * (1 - t * 0.6), R * 0.22); }
    leaf(g.P.leaf, x, y, ang, R * 2, R * 0.16);
  },
  grass(g, x, y, R, ang) {
    for (let k = 0; k < 6; k++) { const key = ['g1', 'g2', 'g3'][k % 3]; blade(g.P[key], x + (g.rnd() - 0.5) * R * 0.8 * Math.sin(ang), y - (g.rnd() - 0.5) * R * 0.8 * Math.cos(ang), ang + (g.rnd() - 0.5) * 0.6, R * (1.3 + g.rnd() * 1.2), R * 0.1, (g.rnd() - 0.5) * 0.4); }
  },
  berries(g, x, y, R) {
    const n = 3 + Math.floor(g.rnd() * 3);
    for (let k = 0; k < n; k++) { const a = g.rnd() * TAU, d = R * 0.45 * Math.sqrt(g.rnd()), r = R * (0.28 + 0.08 * g.rnd()), bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d; circ(g.P.berry, bx, by, r); circ(g.P.berryHi, bx - r * 0.35, by - r * 0.35, r * 0.28); }
  },
  blossom(g, x, y, R) { petals(g.P.petal, x, y, R * 0.45, 5, R * 0.36, g.rnd() * TAU); circ(g.P.ctr, x, y, R * 0.18); for (let k = 0; k < 5; k++) { const a = g.rnd() * TAU; circ(g.P.dot, x + Math.cos(a) * R * 0.3, y + Math.sin(a) * R * 0.3, R * 0.05); } },
  clover(g, x, y, R) {
    const rot = g.rnd() * TAU;
    for (let k = 0; k < 3; k++) { const a = rot + k * TAU / 3; circ(g.P.leaf, x + Math.cos(a) * R * 0.32, y + Math.sin(a) * R * 0.32, R * 0.34); circ(g.P.leafHi, x + Math.cos(a) * R * 0.36, y + Math.sin(a) * R * 0.36, R * 0.14); }
    if (g.rnd() < 0.3) for (let k = 0; k < 6; k++) { const a = g.rnd() * TAU, d = R * 0.25 * g.rnd(); circ(g.P.flower, x + R * 0.6 + Math.cos(a) * d, y - R * 0.5 + Math.sin(a) * d, R * 0.14); }
  },
  sunflower(g, x, y, R) { petals(g.P.petal, x, y, R * 0.78, 16, R * 0.3, g.rnd() * TAU); petals(g.P.petalHi, x, y, R * 0.7, 16, R * 0.18, g.rnd() * TAU); circ(g.P.ctr, x, y, R * 0.5); circ(g.P.dot, x, y, R * 0.3); },
};

// ----- Along a line -----
// L: arc length per point; nx, ny: normals; w: half-width per point; w0: base half-width; up: which side is "up" (+1 / -1)
function walk(L, n, start, stepFn, fn) {
  let d = start, j = 0;
  while (d < L[n - 1]) { while (j < n - 1 && L[j] < d) j++; fn(j); d += stepFn(); }
}
const ALONG = {
  daisy(g, a) {
    walk(a.L, a.n, a.w0 * g.rnd(), () => a.w0 * (2 + g.rnd() * 1.4), j => {
      const side = g.rnd() < 0.5 ? 1 : -1, len = a.w0 * (0.8 + g.rnd() * 0.8), ang = Math.atan2(a.ny[j], a.nx[j]) + (side < 0 ? Math.PI : 0);
      const hx = a.xs[j] + Math.cos(ang) * len, hy = a.ys[j] + Math.sin(ang) * len;
      stalk(g.P.stalk, a.xs[j], a.ys[j], hx, hy, a.w0 * 0.07);
      leaf(g.P.leaf, a.xs[j], a.ys[j], ang + side * 0.9, a.w0 * 0.9, a.w0 * 0.22);
      HEADS.daisy(g, hx, hy, a.w0 * (0.8 + g.rnd() * 0.5));
    });
  },
  tulip(g, a) {
    walk(a.L, a.n, a.w0 * g.rnd(), () => a.w0 * (2.4 + g.rnd() * 1.6), j => {
      const ang = Math.atan2(a.ny[j] * a.up, a.nx[j] * a.up) + (g.rnd() - 0.5) * 0.4, len = a.w0 * (1.6 + g.rnd() * 1.2);
      const hx = a.xs[j] + Math.cos(ang) * len, hy = a.ys[j] + Math.sin(ang) * len;
      stalk(g.P.stalk, a.xs[j], a.ys[j], hx, hy, a.w0 * 0.09);
      leaf(g.P.leaf, a.xs[j], a.ys[j], ang + 0.5, len * 0.8, a.w0 * 0.28); leaf(g.P.leafHi, a.xs[j], a.ys[j], ang - 0.45, len * 0.7, a.w0 * 0.24);
      HEADS.tulip(g, hx, hy, a.w0 * (0.9 + g.rnd() * 0.3), ang);
    });
  },
  lavender(g, a) {
    walk(a.L, a.n, a.w0 * g.rnd() * 0.5, () => a.w0 * (0.9 + g.rnd() * 0.7), j => {
      const ang = Math.atan2(a.ny[j] * a.up, a.nx[j] * a.up) + (g.rnd() - 0.5) * 0.5;
      HEADS.lavender(g, a.xs[j], a.ys[j], a.w0 * (0.6 + g.rnd() * 0.4), ang);
    });
  },
  fern(g, a) {
    let side = 1;
    walk(a.L, a.n, a.w0 * 0.3, () => a.w0 * 0.42, j => {
      const t = a.L[j] / a.L[a.n - 1], tang = Math.atan2(-a.nx[j], a.ny[j]), ang = Math.atan2(a.ny[j] * side, a.nx[j] * side) * 0.55 + tang * 0.45;
      const fwd = Math.atan2(Math.sin(ang), Math.cos(ang));
      leaf(side > 0 ? g.P.leaf : g.P.leafHi, a.xs[j], a.ys[j], fwd, a.w0 * (2 - 1.6 * t), a.w0 * (0.3 - 0.18 * t));
      side = -side;
    });
  },
  grass(g, a) {
    walk(a.L, a.n, 0, () => a.w0 * (0.22 + g.rnd() * 0.25), j => {
      const key = ['g1', 'g2', 'g3'][Math.floor(g.rnd() * 3)], ang = Math.atan2(a.ny[j] * a.up, a.nx[j] * a.up) + (g.rnd() - 0.5) * 0.7;
      blade(g.P[key], a.xs[j], a.ys[j], ang, a.w0 * (1 + g.rnd() * 2.2), a.w0 * 0.16, (g.rnd() - 0.5) * 0.5);
    });
  },
  berries(g, a) {
    let side = 1;
    walk(a.L, a.n, a.w0 * g.rnd(), () => a.w0 * (0.9 + g.rnd() * 0.6), j => {
      const ang = Math.atan2(a.ny[j] * side, a.nx[j] * side);
      leaf(g.rnd() < 0.5 ? g.P.leaf : g.P.leafHi, a.xs[j], a.ys[j], ang + 0.3 * side, a.w0 * (1.2 + g.rnd() * 0.6), a.w0 * 0.4);
      if (g.rnd() < 0.45) HEADS.berries(g, a.xs[j] - Math.cos(ang) * a.w0 * 0.8, a.ys[j] - Math.sin(ang) * a.w0 * 0.8, a.w0 * (0.8 + g.rnd() * 0.4));
      side = -side;
    });
  },
  blossom(g, a) {
    walk(a.L, a.n, a.w0 * g.rnd(), () => a.w0 * (1.1 + g.rnd() * 1.2), j => {
      const side = g.rnd() < 0.5 ? 1 : -1, ang = Math.atan2(a.ny[j] * side, a.nx[j] * side) + (g.rnd() - 0.5) * 0.8, len = a.w0 * (0.6 + g.rnd() * 1.4);
      const tx = a.xs[j] + Math.cos(ang) * len, ty = a.ys[j] + Math.sin(ang) * len;
      if (len > a.w0) stalk(g.P.twig, a.xs[j], a.ys[j], tx, ty, a.w0 * 0.1);
      if (g.rnd() < 0.75) HEADS.blossom(g, tx, ty, a.w0 * (0.8 + g.rnd() * 0.5)); else circ(g.P.bud, tx, ty, a.w0 * 0.22);
    });
  },
  clover(g, a) {
    walk(a.L, a.n, 0, () => a.w0 * (0.7 + g.rnd() * 0.6), j => {
      const off = (g.rnd() - 0.5) * a.w0 * 1.4;
      HEADS.clover(g, a.xs[j] + a.nx[j] * off, a.ys[j] + a.ny[j] * off, a.w0 * (0.6 + g.rnd() * 0.5));
    });
  },
  sunflower(g, a) {
    walk(a.L, a.n, a.w0 * 0.8, () => a.w0 * (1.4 + g.rnd() * 0.8), j => {
      const side = g.rnd() < 0.5 ? 1 : -1;
      leaf(side > 0 ? g.P.leaf : g.P.leafHi, a.xs[j], a.ys[j], Math.atan2(a.ny[j] * side, a.nx[j] * side) + 0.4 * side, a.w0 * (1.6 + g.rnd() * 0.6), a.w0 * 0.55);
    });
    const e = a.n - 1, ang = Math.atan2(a.ys[e] - a.ys[Math.max(e - 3, 0)], a.xs[e] - a.xs[Math.max(e - 3, 0)]);
    HEADS.sunflower(g, a.xs[e] + Math.cos(ang) * a.w0 * 1.5, a.ys[e] + Math.sin(ang) * a.w0 * 1.5, a.w0 * 2.2);
  },
};

// Grow a plant. keys: the piece names this plant uses. Returns { key: Path2D, ..., all: every piece together }.
// line: { xs, ys, nx, ny, w, L, n, w0 } along a drawn line, or beads: [{ x, y, r }] for one bloom per bead.
export function growPlant(kind, keys, id, line, beads) {
  const P = {};
  for (const k of keys) P[k] = new Path2D();
  const g = { P, rnd: mulberry32(hash32(id, 777)) };
  if (beads) {
    for (const b of beads) HEADS[kind](g, b.x, b.y, b.r * 2.2, -Math.PI / 2);
  } else {
    // "Up" is the side of the line facing the top of the drawing, so grass and tulips grow upward in free mode
    let sy = 0;
    for (let i = 0; i < line.n; i++) sy += line.ny[i];
    ALONG[kind](g, { ...line, up: sy > 0 ? -1 : 1 });
  }
  const all = new Path2D();
  for (const k of keys) all.addPath(P[k]);
  return { ...P, all };
}
