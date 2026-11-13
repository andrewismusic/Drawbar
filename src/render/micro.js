// Micro: pond life under a microscope. Each brush grows one kind of organism along the line you draw: amoebae,
// ciliates, algae colonies, diatoms, bell animals on stalks, bead-chain filaments and golden debris. Built once per
// stroke in the stroke's own space, seeded by the stroke's id, as flat see-through pieces keyed by name (colours in
// styles/micro.js). A cell's skin is three copies of its outline: a bright halo, a dark rim and the body on top.
// Also the bright-field backdrop (drawMicroBg).
import { TAU, mulberry32, hash32 } from '../core/math.js';

const circ = (P, x, y, r) => { P.moveTo(x + r, y); P.arc(x, y, r, 0, TAU); };
const ell = (P, x, y, rx, ry, rot) => { P.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot)); P.ellipse(x, y, rx, ry, rot, 0, TAU); };
const frame = (x, y, ang) => { const ux = Math.cos(ang), uy = Math.sin(ang); return (u, v) => [x + ux * u - uy * v, y + uy * u + ux * v]; };
// A closed wobbly loop through points at the given radii (stretched sx along rot, scaled k about the centre)
function loop(P, cx, cy, rad, rot = 0, sx = 1, k = 1) {
  const n = rad.length, c = Math.cos(rot), s = Math.sin(rot);
  const pt = i => { const a = (i % n) * TAU / n, u = Math.cos(a) * rad[i % n] * sx * k, v = Math.sin(a) * rad[i % n] * k; return [cx + u * c - v * s, cy + u * s + v * c]; };
  const p0 = pt(0), p1 = pt(1);
  P.moveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2);
  for (let i = 1; i <= n; i++) { const a = pt(i), b = pt(i + 1); P.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  P.closePath();
}
const radii = (rnd, r, k, n = 9) => Array.from({ length: n }, () => r * (1 + k * (rnd() * 2 - 1)));
// Skin: halo, rim and body from one outline. t: the rim's thickness as a share of the size.
function skin(g, cx, cy, rad, rot, sx, t = 0.09) {
  loop(g.P.halo, cx, cy, rad, rot, sx, 1 + t * 2.6); loop(g.P.rim, cx, cy, rad, rot, sx, 1 + t); loop(g.P.body, cx, cy, rad, rot, sx, 1);
}
// A closed shape from a list of [u, v, cu, cv] (a point and the control point leading to it), scaled k about (mu, 0)
function shape(P, f, pts, mu, k) {
  const q = (u, v) => f(mu + (u - mu) * k, v * k);
  const s = q(pts[0][0], pts[0][1]); P.moveTo(s[0], s[1]);
  for (let i = 1; i <= pts.length; i++) { const [u, v, cu, cv] = pts[i % pts.length], e = q(u, v), c = q(cu, cv); P.quadraticCurveTo(c[0], c[1], e[0], e[1]); }
  P.closePath();
}
function stalk(P, a, b, bend, w) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1e-6, px = -dy / d, py = dx / d;
  const c = [a[0] + dx * 0.5 + px * bend * d, a[1] + dy * 0.5 + py * bend * d];
  P.moveTo(a[0] + px * w, a[1] + py * w); P.quadraticCurveTo(c[0] + px * w, c[1] + py * w, b[0] + px * w, b[1] + py * w);
  P.lineTo(b[0] - px * w, b[1] - py * w); P.quadraticCurveTo(c[0] - px * w, c[1] - py * w, a[0] - px * w, a[1] - py * w); P.closePath();
  return Math.atan2(b[1] - c[1], b[0] - c[0]);
}
const inside = (rnd, x, y, r) => { const a = rnd() * TAU, d = r * Math.sqrt(rnd()); return [x + Math.cos(a) * d, y + Math.sin(a) * d]; };

// Each kind: (g, at) where at(gapFn, fn) walks the line calling fn(x, y, W, ang, nx, ny, i) every gap
const KINDS = {
  amoeba(g, at) {
    const { P, rnd } = g;
    at(W => W * 1.05, (x, y, W, ang, nx, ny, i) => {
      const R = W * 1.5 * (0.8 + 0.5 * rnd());
      skin(g, x, y, radii(rnd, R, 0.2), rnd() * TAU, 1);
      if (rnd() < 0.5) { const side = rnd() < 0.5 ? -1 : 1, d = R * (0.8 + 0.7 * rnd()); skin(g, x + nx * side * d, y + ny * side * d, radii(rnd, R * (0.4 + 0.25 * rnd()), 0.22, 7), rnd() * TAU, 1); }
      for (let k = 0; k < 5; k++) { const q = inside(rnd, x, y, R * 0.75); circ(P.grain, q[0], q[1], R * (0.03 + 0.035 * rnd())); }
      if (rnd() < 0.35) { const q = inside(rnd, x, y, R * 0.5), r = R * (0.14 + 0.12 * rnd()); loop(P.food, q[0], q[1], radii(rnd, r, 0.3, 6), rnd() * TAU); circ(P.foodHi, q[0] - r * 0.2, q[1] - r * 0.2, r * 0.4); }
      if (rnd() < 0.3) { const q = inside(rnd, x, y, R * 0.55), r = R * (0.12 + 0.12 * rnd()); circ(P.vac, q[0], q[1], r); circ(P.vacHi, q[0], q[1], r * 0.76); }
      if (i % 5 === 2) { loop(P.nuc, x, y, radii(rnd, R * 0.3, 0.12, 7), rnd() * TAU); circ(P.nucHi, x - R * 0.06, y - R * 0.06, R * 0.11); }
    });
  },
  ciliate(g, at) {
    const { P, rnd } = g;
    at(W => W * (3.6 + 1.2 * rnd()), (x0, y0, W, ang, nx, ny) => {
      const R = W * 1.05 * (0.85 + 0.35 * rnd()), lat = (rnd() - 0.5) * W * 0.9, x = x0 + nx * lat, y = y0 + ny * lat, rot = ang + (rnd() - 0.5) * 1.1, sx = 1.75 + 0.5 * rnd();
      const rad = Array.from({ length: 14 }, (_, k) => R * (0.8 + 0.05 * rnd()) * (1 + 0.12 * Math.cos(k * TAU / 14)));   // a little egg-shaped
      skin(g, x, y, rad, rot, sx, 0.08);
      const f = frame(x, y, rot);
      for (let k = 0; k < 30; k++) { const a = k * TAU / 30, eu = Math.cos(a) * rad[0] * sx, ev = Math.sin(a) * rad[0], s = f(eu * 1.03, ev * 1.03), e = f(eu * 1.03 + Math.cos(a + 0.6) * R * 0.3, ev * 1.03 + Math.sin(a + 0.6) * R * 0.3); P.hair.moveTo(s[0], s[1]); P.hair.lineTo(e[0], e[1]); }
      const gr = f(R * 0.25, R * 0.12); ell(P.groove, gr[0], gr[1], R * 0.75, R * 0.1, rot + 0.45);
      const nu = f(-R * 0.25, -R * 0.08); ell(P.nuc, nu[0], nu[1], R * 0.5, R * 0.26, rot - 0.3);
      for (const u of [-1, 1]) { const v = f(u * R * sx * 0.55, R * 0.1 * u); circ(P.vac, v[0], v[1], R * 0.17); circ(P.vacHi, v[0], v[1], R * 0.12); }
      for (let k = 0; k < 6; k++) { const q = f((rnd() - 0.5) * R * sx * 1.2, (rnd() - 0.5) * R * 0.9); circ(k % 2 ? P.food : P.foodHi, q[0], q[1], R * (0.05 + 0.05 * rnd())); }
    });
  },
  algae(g, at) {
    const { P, rnd } = g;
    at(W => W * 1.3, (x, y, W) => { const rad = radii(rnd, W * 2.1, 0.14, 8), rot = rnd() * TAU; loop(P.halo, x, y, rad, rot, 1, 1.07); loop(P.hull, x, y, rad, rot); });
    at(W => W * 0.95, (x0, y0, W, ang, nx, ny) => {
      for (let k = 0, m = 1 + (rnd() < 0.5 ? 1 : 0); k < m; k++) {
        const lat = (rnd() * 2 - 1) * W * 1.25, r = W * (0.3 + 0.34 * rnd()), x = x0 + nx * lat + (rnd() - 0.5) * W * 0.5, y = y0 + ny * lat + (rnd() - 0.5) * W * 0.5;
        circ(P.rim, x, y, r); circ(P.body, x, y, r * 0.86); circ(P.core, x + r * 0.12, y + r * 0.1, r * 0.5); circ(P.hi, x - r * 0.28, y - r * 0.28, r * 0.2);
      }
    });
  },
  diatom(g, at) {
    const { P, rnd } = g;
    at(W => W * (3.0 + rnd()), (x0, y0, W, ang, nx, ny) => {
      const R = W * 1.3 * (0.8 + 0.4 * rnd()), lat = (rnd() - 0.5) * W, x = x0 + nx * lat, y = y0 + ny * lat;
      if (rnd() < 0.6) {
        // Pennate: a slim glass boat with fine ribs
        const a = R * (1.6 + 0.6 * rnd()), b = R * (0.4 + 0.15 * rnd()), f = frame(x, y, ang + (rnd() - 0.5) * 1.6), pts = [[-a, 0, 0, 2 * b], [a, 0, 0, -2 * b]];
        shape(P.halo, f, pts, 0, 1.14); shape(P.rim, f, pts, 0, 1); shape(P.body, f, pts, 0, 0.86);
        let s = f(-a * 0.78, 0), e = f(a * 0.78, 0); P.rib.moveTo(s[0], s[1]); P.rib.lineTo(e[0], e[1]);
        for (let t = -0.72; t <= 0.73; t += 0.12) { const h = b * (1 - t * t) * 0.74; s = f(a * t, -h); e = f(a * t, h); P.rib.moveTo(s[0], s[1]); P.rib.lineTo(e[0], e[1]); }
        for (const u of [-0.42, 0.42]) { const c = f(a * u, 0); ell(P.chl, c[0], c[1], a * 0.24, b * 0.42, ang); const h = f(a * u - a * 0.05, -b * 0.1); ell(P.chlHi, h[0], h[1], a * 0.1, b * 0.16, ang); }
      } else {
        // Centric: a glass disc with spokes
        const r = R * 0.95;
        circ(P.halo, x, y, r * 1.12); circ(P.rim, x, y, r); circ(P.body, x, y, r * 0.88);
        for (let k = 0; k < 14; k++) { const a = k * TAU / 14; P.rib.moveTo(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3); P.rib.lineTo(x + Math.cos(a) * r * 0.84, y + Math.sin(a) * r * 0.84); }
        P.rib.moveTo(x + r * 0.55, y); P.rib.arc(x, y, r * 0.55, 0, TAU);
        for (let k = 0; k < 5; k++) { const q = inside(rnd, x, y, r * 0.6); circ(P.chl, q[0], q[1], r * 0.14); circ(P.chlHi, q[0] - r * 0.04, q[1] - r * 0.04, r * 0.06); }
      }
    });
  },
  bell(g, at, line) {
    const { P, rnd } = g, { xs, ys, n, w } = line;
    // The colony's branch runs along the line you draw
    for (let a = 0, step = Math.max(1, Math.floor(n / 90)); a < n - 1;) {
      const b = Math.min(a + step, n - 1), hw = w[a] * 0.08, dx = xs[b] - xs[a], dy = ys[b] - ys[a], dl = Math.hypot(dx, dy) || 1e-6, px = -dy / dl * hw, py = dx / dl * hw;
      P.stalk.moveTo(xs[a] - px, ys[a] - py); P.stalk.lineTo(xs[b] - px, ys[b] - py); P.stalk.lineTo(xs[b] + px, ys[b] + py); P.stalk.lineTo(xs[a] + px, ys[a] + py); P.stalk.closePath();
      circ(P.stalk, xs[b], ys[b], hw); a = b;
    }
    let alt = 1;
    at(W => W * (2.3 + 1.2 * rnd()), (x, y, W, ang, nx, ny) => {
      alt = -alt;
      const dir = Math.atan2(ny * alt, nx * alt) + (rnd() - 0.5) * 0.9, len = W * (1.4 + 2.2 * rnd()), tip = [x + Math.cos(dir) * len, y + Math.sin(dir) * len];
      const arrive = n > 1 ? stalk(P.stalk, [x, y], tip, (rnd() - 0.5) * 0.7, W * 0.06) : dir, R = W * (0.8 + 0.4 * rnd()), f = frame(tip[0], tip[1], arrive);
      const pts = [[0, -R * 0.14, 0, 0], [R * 1.5, -R * 0.95, R * 0.95, -R * 0.2], [R * 1.5, R * 0.95, R * 1.75, 0], [0, R * 0.14, R * 0.95, R * 0.2]];
      shape(P.halo, f, pts, R * 0.8, 1.16); shape(P.rim, f, pts, R * 0.8, 1); shape(P.body, f, pts, R * 0.8, 0.86);
      const lip = f(R * 1.52, 0); ell(P.lip, lip[0], lip[1], R * 0.2, R * 0.92, arrive);
      for (let k = 0; k < 13; k++) { const v = (k / 12 * 2 - 1) * R * 0.95, s = f(R * 1.6, v), e = f(R * (1.95 + 0.15 * rnd()), v * 1.35); P.hair.moveTo(s[0], s[1]); P.hair.lineTo(e[0], e[1]); }
      const nu = f(R * 0.75, R * 0.1); ell(P.nuc, nu[0], nu[1], R * 0.42, R * 0.13, arrive + 1.1);
      const va = f(R * 1.05, -R * 0.3); circ(P.vac, va[0], va[1], R * 0.16); circ(P.vacHi, va[0], va[1], R * 0.11);
      for (let k = 0; k < 4; k++) { const q = f(R * (0.5 + 0.7 * rnd()), (rnd() - 0.5) * R * 0.7); circ(P.food, q[0], q[1], R * (0.05 + 0.05 * rnd())); }
    });
  },
  filament(g, at) {
    const { P, rnd } = g;
    let k = 0;
    at(W => W * 0.82, (x, y, W, ang) => {
      const het = k++ % 9 === 5, r = W * 0.52 * (het ? 1.4 : 0.9 + 0.2 * rnd());
      ell(P.rim, x, y, r * 0.86, r, ang); ell(het ? P.het : P.body, x, y, r * 0.66, r * 0.8, ang); circ(P.hi, x - r * 0.2, y - r * 0.25, r * 0.2);
    });
  },
  debris(g, at) {
    const { P, rnd } = g;
    at(W => W * 0.5, (x0, y0, W) => {
      for (let k = 0; k < 2; k++) {
        const q = inside(rnd, x0, y0, W * 1.5), r = W * (0.15 + 0.38 * rnd() * rnd() + 0.08);
        loop(P[['a', 'b', 'c'][Math.floor(rnd() * 3)]], q[0], q[1], radii(rnd, r, 0.35, 6), rnd() * TAU, 1 + 0.6 * rnd());
        if (rnd() < 0.4) circ(P.dark, q[0] + (rnd() - 0.5) * r, q[1] + (rnd() - 0.5) * r, r * (0.1 + 0.12 * rnd()));
      }
    });
  },
};
// Grow one stroke's organisms. line: { xs, ys, nx, ny, w, L, n } or beads: [{ x, y, r }] (a single dab).
export function growMicro(kind, keys, id, line, beads) {
  const made = {}, P = new Proxy(made, { get: (t, k) => t[k] || (t[k] = new Path2D()) });
  const g = { P, rnd: mulberry32(hash32(id, 4242)) };
  if (beads) { const b = beads[0]; line = { xs: [b.x], ys: [b.y], nx: [0], ny: [1], w: [b.r], L: [0], n: 1 }; }
  const { xs, ys, nx, ny, w, L, n } = line;
  const at = (gap, fn) => {
    let d = 0, j = 0, i = 0;
    while (d <= L[n - 1] + 1e-9 && i < 400) {
      while (j < n - 1 && L[j] < d) j++;
      fn(xs[j], ys[j], w[j], Math.atan2(-nx[j], ny[j]), nx[j], ny[j], i++);
      d += Math.max(gap(w[j]), 1e-4);
    }
  };
  KINDS[kind](g, at, line);
  const out = {}, all = new Path2D();
  for (const k of keys) { out[k] = made[k] || new Path2D(); all.addPath(out[k]); }
  return { ...out, all };
}
// Bright-field backdrop: a pale lit field, darker toward the edge of the view, with out-of-focus specks. Drawn once.
let bg = null;
export function drawMicroBg(ctx, W, H) {
  if (!bg) {
    bg = document.createElement('canvas'); bg.width = bg.height = 768;
    const g = bg.getContext('2d'), r = mulberry32(1838);
    let gr = g.createRadialGradient(384, 384, 0, 384, 384, 400);
    gr.addColorStop(0, '#edeaf1'); gr.addColorStop(0.6, '#e2dfe9'); gr.addColorStop(0.88, '#c9c5d6'); gr.addColorStop(1, '#9d98b3');
    g.fillStyle = gr; g.fillRect(0, 0, 768, 768);
    for (const [x, y, rad, col] of [[240, 280, 330, 'rgba(255,236,214,0.35)'], [560, 500, 300, 'rgba(210,222,255,0.35)']]) { gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 768, 768); }
    for (let i = 0; i < 46; i++) {
      const x = r() * 768, y = r() * 768, rad = 6 + 34 * r() * r(), a = 0.05 + 0.09 * r(), c = r() < 0.5 ? '110,100,70' : '90,86,120';
      gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(0.7, `rgba(${c},${a * 0.6})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(70,64,90,${0.1 + 0.25 * r()})`; g.beginPath(); g.arc(r() * 768, r() * 768, 0.4 + 1.1 * r(), 0, TAU); g.fill(); }
  }
  const k = Math.max(W, H);
  ctx.drawImage(bg, (W - k) / 2, (H - k) / 2, k, k);
}
