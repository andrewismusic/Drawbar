// Glitch strokes. Every stroke in the Glitch tab is drawn afresh each frame (they all move), in one of three looks:
//   wire brushes:  a chain of slowly tumbling 3D wireframe solids along the line (tetrahedra to dodecahedra)
//   nodes brush:   white points joined by thin lines, with a ring at the start
//   code brush:    glyph cells on a grid whose characters keep being replaced, each cell at its own pace
// The colour comes from the colour picker (s.tint). Each stroke carries its own effect (s.fx, the Effect button
// chosen when it was drawn) with its own seeded settings (direction, reach, pace...), so two strokes with the same
// effect still behave differently:
//   smear:  fading copies trail off to one side, with red / cyan fringes
//   blocks: datamosh. Pieces of the stroke slip sideways, some in flipped colour
//   jitter: each solid, node or cell jumps out of place and changes size, holding for a moment, now and then by a lot
// All of it is thin lines or small image copies, in the drawing's own space (so copies and tiles just work). Each
// stroke pulses with its own notes (pulseFrame), and drum hits nudge them all. Visual only.
import { TAU, hash32, mulberry32, mod, clamp } from '../core/math.js';
import { score } from '../core/state.js';
import { NEON_W, speedN } from '../core/stroke.js';
import { buildShape, capsAlong } from './shapes.js';
import { forCopies } from '../canvas/index.js';
import { MATS, colorOf } from '../styles/index.js';
import { toRgb } from '../core/color.js';
import { GCELL, glyphCells, lineSamples, sheet, SZ, COLS, NGLYPH, LEVELS } from './glyphs.js';

const frac = r => (r % 10000) / 10000;
// ----- The solids: unit-radius corners, and edges found as the closest pairs -----
const PHI = (1 + Math.sqrt(5)) / 2;
function solid(seeds, cyclic) {
  const V = [];
  for (const [a, b, c] of seeds) for (const p of cyclic ? [[a, b, c], [c, a, b], [b, c, a]] : [[a, b, c]])
    for (let m = 0; m < 8; m++) { const v = p.map((x, i) => (m >> i & 1) ? -x : x); if (!V.some(q => q.every((x, i) => Math.abs(x - v[i]) < 1e-9))) V.push(v); }
  const R = Math.hypot(...V[0]); V.forEach(v => v.forEach((x, i) => v[i] = x / R));
  let dmin = 9; const D = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) dmin = Math.min(dmin, D(V[i], V[j]));
  const E = [];
  for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) if (D(V[i], V[j]) < dmin * 1.01) E.push([i, j]);
  return { V, E };
}
const SOLIDS = {
  tetra: { V: [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => v.map(x => x / Math.sqrt(3))), E: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]] },
  cube: solid([[1, 1, 1]]),
  octa: solid([[1, 0, 0]], true),
  icosa: solid([[0, 1, PHI]], true),
  dodeca: solid([[1, 1, 1], [0, 1 / PHI, PHI]], true),
};

// Per-stroke set-up, once: the effect's seeded settings, and where the solids sit along the line
function setup(s) {
  const M = MATS[s.color], r = mulberry32(hash32(s.id, 911)), n = s.pts.length, L = s._L;
  const g = { fx: s.fx === 'blocks' || s.fx === 'jitter' ? s.fx : 'smear', dir: r() < 0.5 ? -1 : 1, reach: 0.5 + r(), split: 0.5 + r(), rate: 0.5 + 1.5 * r(), hold: 2 + Math.floor(r() * 5), amt: 0.5 + r(), seed: hash32(s.id, 77) };
  g.base = NEON_W * s._sz * 2.8;
  if (M.gl === 'cloud') {
    // Point cloud: points that circle the line at their own radius and pace (so they read as depth)
    const N = Math.round(clamp(s._len / (g.base * 0.1), 14, 150));
    g.pc = [];
    for (let k = 0; k < N; k++) g.pc.push({ i: Math.floor(r() * n), rad: (0.25 + 1.9 * r() * r()), th: r() * TAU, sp: (r() < 0.5 ? -1 : 1) * (0.4 + 1.8 * r()), sz: 0.6 + 0.9 * r() });
  }
  if (M.wire || M.nodes) {
    const base = NEON_W * s._sz * (s.tool === 'beads' ? 1.6 : 2.8) * (M.nodes ? 0.5 : 1), gap = M.nodes ? Math.max(0.3, base * 5) : Math.max(base * 2.3, s._len / 9);   // at most about 9 solids a stroke; nodes sit far apart, so the line between them only roughly follows the hand
    g.els = []; g.lw = clamp(base * 0.085, 0.0022, 0.006);
    let next = 0;
    for (let i = 0; i < n; i++) {
      if (L[i] < next && !(i === n - 1 && (!g.els.length || (M.nodes && L[i] - L[g.els[g.els.length - 1].i] > gap * 0.4)))) continue;
      // Solids: the faster the hand was moving here, the more faces (4, 6, 8, 12, 20)
      const v = speedN(s._sp[i]), kind = M.wire === 'auto' ? (v < 0.12 ? 'tetra' : v < 0.26 ? 'cube' : v < 0.45 ? 'octa' : v < 0.7 ? 'dodeca' : 'icosa') : M.wire;
      g.els.push({ i, kind, x: s._xs[i], y: s._ys[i], R: base * (0.7 + 0.6 * r()), a: [r() * TAU, r() * TAU], w: [(r() - 0.5) * 2.6, (r() - 0.5) * 2.6], t: s.pts[i][2] });
      next = L[i] + gap;
    }
  }
  const b = s._bb, pad = 0.12;
  g.bb = [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
  return s._gl = g;
}
// Loop strokes are revealed along their length in time with the music; Ripple strokes sway
// Trace strokes show only this much of the gesture, in seconds, behind the moving tip
const headSpan = s => Math.max(0.25, s._dur * 0.14);
function reveal(s, S, B) {
  if (s.tool !== 'loop') return Infinity;
  const ph = score.timing === 'clocked' ? mod((B - s.startBeat) / (s._Pb || 4), 1) : mod((S - s.start) / s._dur, 1);
  return ph * s._dur;
}
function sway(s, i, S) {
  if (s.tool !== 'ripple') return 0;
  const u = s._L[i] / Math.max(s._len, 1e-4);
  return 0.006 * s._sz * s._amp[i] * Math.sin(Math.PI * u) * Math.sin(TAU * (u * s._waves - s._rate * S));
}
// This frame's wireframes as one path
function wirePath(s, g, S, T, slot, e) {
  const P = new Path2D(), pts = [];
  for (const el of g.els) {
    if (el.t > T || el.t < g.T0) continue;
    const { V, E } = SOLIDS[el.kind];
    const off = sway(s, el.i, S);
    let x = el.x + s._nx[el.i] * off, y = el.y + s._ny[el.i] * off, R = el.R * (1 + 0.25 * e);
    if (g.fx === 'jitter') {
      const h = hash32(g.seed, el.i, Math.floor(slot / (1 + (el.i + g.hold) % 4))), big = h % 6 === 0, k = g.amt * (1 + e);
      x += (frac(h) - 0.5) * R * (big ? 5 : 1.4) * k; y += (frac(h >>> 8) - 0.5) * R * (big ? 3.5 : 1.2) * k;
      R *= big ? 0.35 + 2.4 * frac(h >>> 16) : 0.7 + 0.7 * frac(h >>> 16);
    }
    const ay = el.a[0] + el.w[0] * S, ax = el.a[1] + el.w[1] * S, cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    for (let k = 0; k < V.length; k++) {
      const v = V[k], x1 = v[0] * cy + v[2] * sy, z1 = -v[0] * sy + v[2] * cy, y2 = v[1] * cx - z1 * sx, z2 = v[1] * sx + z1 * cx, p = 1 / (1 - z2 * 0.28);
      pts[k] = [x + x1 * R * p, y + y2 * R * p];
    }
    for (const [a, b] of E) { P.moveTo(pts[a][0], pts[a][1]); P.lineTo(pts[b][0], pts[b][1]); }
  }
  return P;
}
// This frame's nodes: where they sit (after sway and jitter), the line through them with a few cross-links and a ring
function nodesPath(s, g, S, T, slot, e) {
  const P = new Path2D(), N = [];
  for (const el of g.els) {
    if (el.t > T || el.t < g.T0) continue;
    const off = sway(s, el.i, S);
    let x = el.x + s._nx[el.i] * off, y = el.y + s._ny[el.i] * off;
    if (g.fx === 'jitter') {
      const h = hash32(g.seed, el.i, Math.floor(slot / (1 + (el.i + g.hold) % 4))), big = h % 6 === 0, k = g.amt * (1 + e) * el.R;
      x += (frac(h) - 0.5) * (big ? 9 : 2.4) * k; y += (frac(h >>> 8) - 0.5) * (big ? 7 : 2) * k;
    }
    N.push([x, y]);
  }
  if (!N.length) return { P, N };
  P.moveTo(N[0][0], N[0][1]); for (let i = 1; i < N.length; i++) P.lineTo(N[i][0], N[i][1]);
  for (let i = 0; i + 2 < N.length; i += 3) { P.moveTo(N[i][0], N[i][1]); P.lineTo(N[i + 2][0], N[i + 2][1]); }
  const R = g.els[0].R * 2.2; P.moveTo(N[0][0] + R, N[0][1]); P.arc(N[0][0], N[0][1], R, 0, TAU);
  return { P, N };
}
// This frame's glyph cells (static strokes keep theirs; loops and ripples re-read the grid as they move)
function liveCells(s, S, T) {
  if (s.tool === 'glow' || s.tool === 'beads') return s._shape.cells;
  const n = s.pts.length;
  if (s.tool === 'loop') {
    let iT = 0;
    while (iT < n - 1 && s.pts[iT + 1][2] <= T) iT++;
    if (iT < 1) return [];
    let i0 = 0;
    if (s.head) { const t0 = T - headSpan(s); while (i0 < iT && s.pts[i0][2] < t0) i0++; }
    return glyphCells(lineSamples(s._xs, s._ys, s._w, iT, s._L, i0), s.id);   // (no bright head on loops since v27)
  }
  for (let i = 0; i < n; i++) { const off = sway(s, i, S); s._rx[i] = s._xs[i] + s._nx[i] * off; s._ry[i] = s._ys[i] + s._ny[i] * off; }
  return glyphCells(lineSamples(s._rx, s._ry, s._w, n - 1, s._L), s.id);
}
function drawCells(X, cells, g, color, S, slot, e, dx, dy, alpha) {
  const sh = sheet(color), head = sheet('#f2fff6'), G = GCELL;
  for (const [x0, y0, gi, lv, hd] of cells) {
    // Characters are replaced over time: some cells never change, some tick slowly, some flicker
    const h = hash32(Math.round(x0 * 1000), Math.round(y0 * 1000), 5150), pace = h % 10, rate = pace < 3 ? 0 : pace < 8 ? 0.6 + frac(h >>> 5) * 2.4 : 6 + frac(h >>> 5) * 9;
    const ch = (gi + Math.floor(S * rate + (h >>> 12) % 7)) % NGLYPH;
    let x = x0 + dx, y = y0 + dy, k = G;
    if (g.fx === 'jitter') {
      const j = hash32(h, Math.floor(slot / (1 + pace % 4))), big = j % 7 === 0, a = g.amt * (1 + e);
      x += Math.round((frac(j) - 0.5) * (big ? 6 : 1.6) * a) * G; y += Math.round((frac(j >>> 8) - 0.5) * (big ? 3 : 0.8) * a) * G;
      k = G * (big ? 1 + Math.floor(frac(j >>> 16) * 3) : 1);
    }
    X.globalAlpha = alpha * (hd ? 1 : LEVELS[lv]);
    X.drawImage(hd ? head : sh, (ch % COLS) * SZ, Math.floor(ch / COLS) * SZ, SZ, SZ, x, y, k, k);
  }
}
// ----- Line brushes (v25): Scope, Bars, Scanlines, Point cloud, Terrain. Each builds this frame's paths from the
// stroke's points after sway (Ripple), reveal (Loop) and jitter; smear and blocks then work on them like any other.
// This frame's points; returns how many are showing
function livePts(s, g, S, T, slot, e) {
  const n = s.pts.length, px = g.px || (g.px = new Float32Array(n)), py = g.py || (g.py = new Float32Array(n));
  let m = n;
  if (T !== Infinity) { m = 0; while (m < n && s.pts[m][2] <= T) m++; }
  let m0 = 0;
  if (s.head) while (m0 < m && s.pts[m0][2] < g.T0) m0++;
  g.m0 = m0;
  const chunk = Math.max(4, Math.ceil(n / 7));
  for (let i = m0; i < m; i++) {
    const off = sway(s, i, S);
    px[i] = s._xs[i] + s._nx[i] * off; py[i] = s._ys[i] + s._ny[i] * off;
    if (g.fx === 'jitter') {
      const q = Math.floor(i / chunk), h = hash32(g.seed, q, Math.floor(slot / (1 + (q + g.hold) % 4))), big = h % 6 === 0, k = g.amt * (1 + e) * g.base;
      px[i] += (frac(h) - 0.5) * (big ? 4 : 0.9) * k; py[i] += (frac(h >>> 8) - 0.5) * (big ? 3 : 0.7) * k;
    }
  }
  return m;
}
const LIVE = {
  // Oscilloscope: the line carries a travelling wave, taller on its notes
  scope(s, g, S, m, e) {
    const P = new Path2D(), px = g.px, py = g.py, L = s._L, w = s._w, lam = g.base * 1.1, k = 0.7 + 1.3 * Math.min(e, 1.2);
    for (let i = g.m0; i < m; i++) {
      const u = L[i], a = w[i] * 2.2 * k * (Math.sin(u / lam - S * 5 * g.rate + g.seed % 9) * 0.6 + Math.sin(u / (lam * 0.37) + S * 3.1) * 0.28 + Math.sin(u / (lam * 0.13) - S * 11) * 0.12 * (0.3 + e));
      const x = px[i] + s._nx[i] * a, y = py[i] + s._ny[i] * a;
      if (i > g.m0) P.lineTo(x, y); else P.moveTo(x, y);
    }
    return { line: P };
  },
  // Level bars standing across the line, each bouncing at its own pace and jumping on the stroke's notes
  bars(s, g, S, m, e) {
    const P = new Path2D(), px = g.px, py = g.py, L = s._L, w = s._w, gap = Math.max(g.base * 0.55, s._len / 60);
    let next = 0, k = 0;
    for (let i = g.m0; i < m; i++) {
      if (L[i] < next) continue;
      next = L[i] + gap; k++;
      const h = hash32(g.seed, k), lv = 0.25 + 0.75 * Math.abs(Math.sin(S * (1.5 + 3 * frac(h)) * g.rate + frac(h >>> 9) * TAU)), hgt = w[i] * 2.4 * Math.min(1.5, lv * (0.55 + 0.9 * e)) + g.base * 0.08;
      const tx = -s._ny[i] * gap * 0.33, ty = s._nx[i] * gap * 0.33, nx = s._nx[i] * hgt, ny = s._ny[i] * hgt;
      P.moveTo(px[i] - tx - nx, py[i] - ty - ny); P.lineTo(px[i] + tx - nx, py[i] + ty - ny); P.lineTo(px[i] + tx + nx, py[i] + ty + ny); P.lineTo(px[i] - tx + nx, py[i] - ty + ny); P.closePath();
    }
    return { fill: P };
  },
  // The mark as level screen lines; now and then a line tears sideways, and a thicker band rolls down through it
  scan(s, g, S, m, e, slot) {
    const P = new Path2D(), px = g.px, py = g.py, w = s._w, rs = clamp(g.base * 0.17, 0.008, 0.022), rows = new Map();
    for (let i = g.m0; i < m; i += 2) {
      const r = w[i] * 1.25, y = py[i];
      for (let k = Math.ceil((y - r) / rs); k * rs <= y + r; k++) {
        const dy = k * rs - y, hw = Math.sqrt(Math.max(0, r * r - dy * dy));
        if (hw < rs * 0.2) continue;
        let row = rows.get(k); if (!row) rows.set(k, row = []);
        row.push(px[i] - hw, px[i] + hw);
      }
    }
    const b = s._bb, band = b[1] + mod(S * 0.12 * g.rate + frac(g.seed), 1) * (b[3] - b[1]);
    for (const [k, row] of rows) {
      const h = hash32(g.seed, k, Math.floor(slot / (g.hold + 1))), tear = h % 9 === 0 ? (frac(h >>> 4) - 0.5) * g.base * 3 * g.reach * (1 + e) : 0;
      const y = k * rs, th = rs * (Math.abs(y - band) < rs * 2.2 ? 0.85 : 0.42);
      // Join the spans on this line, left to right
      const iv = []; for (let q = 0; q < row.length; q += 2) iv.push([row[q], row[q + 1]]);
      iv.sort((a, c) => a[0] - c[0]);
      let [x0, x1] = iv[0];
      for (let q = 1; q <= iv.length; q++) {
        if (q < iv.length && iv[q][0] <= x1) { x1 = Math.max(x1, iv[q][1]); continue; }
        // ends run a little long or short, each line its own way (v27: the edge no longer copies the drawing exactly)
        { const ja = (frac(hash32(g.seed, k, 71)) - 0.35) * g.base * 1.1, jb = (frac(hash32(g.seed, k, 72)) - 0.35) * g.base * 1.1; if (x1 - x0 + ja + jb > rs * 0.5) P.rect(x0 - ja + tear, y - th / 2, x1 - x0 + ja + jb, th); }
        if (q < iv.length) [x0, x1] = iv[q];
      }
    }
    return { fill: P };
  },
  // Points circling the line: near ones big and bright, far ones small and dim
  cloud(s, g, S, m, e) {
    const near = new Path2D(), far = new Path2D(), px = g.px, py = g.py, w = s._w, d0 = g.base * 0.1;
    // The stroke's own options (set beside the brushes): the points' shape, and how much their sizes vary
    const shape = (s.pt && s.pt.shape) || 'square', vary = (s.pt ? s.pt.vary : 50) / 100;
    for (const q of g.pc) {
      if (q.i >= m || q.i < g.m0) continue;
      const a = q.th + q.sp * S * g.rate, lat = q.rad * w[q.i] * Math.cos(a) * (1 + 0.6 * e), dep = Math.sin(a);
      const d = d0 * Math.max(0.25, 1.05 + (q.sz - 1.05) * vary * 2.6) * (1 + 0.45 * dep * (0.3 + vary)) * (1 + 0.5 * e), h = d / 2;
      const x = px[q.i] + s._nx[q.i] * lat, y = py[q.i] + s._ny[q.i] * lat, P = dep > -0.2 ? near : far;
      if (shape === 'circle') { P.moveTo(x + h * 1.1, y); P.arc(x, y, h * 1.1, 0, TAU); }
      else if (shape === 'triangle') { P.moveTo(x, y - h * 1.3); P.lineTo(x + h * 1.2, y + h * 0.8); P.lineTo(x - h * 1.2, y + h * 0.8); P.closePath(); }
      else if (shape === 'plus') { P.rect(x - h * 1.3, y - h * 0.38, d * 1.3, d * 0.38); P.rect(x - h * 0.38, y - h * 1.3, d * 0.38, d * 1.3); }
      else P.rect(x - h, y - h, d, d);
    }
    return { fill: near, far };
  },
  // A strip of wireframe ground along the line, its hills rolling past
  terrain(s, g, S, m, e) {
    const P = new Path2D(), px = g.px, py = g.py, L = s._L, w = s._w, lam = g.base * 1.6, K = 5, step = 3, amp = 0.9 + 0.9 * Math.min(e, 1.2);
    const at = (i, v) => {
      const u = L[i], h = 0.55 * Math.sin(u / lam - S * 1.3 * g.rate + v * 1.7 + g.seed % 5) + 0.45 * Math.sin(u / (lam * 0.41) + S * 0.8 - v * 2.9);
      return [px[i] + s._nx[i] * v * w[i] * 1.5, py[i] + s._ny[i] * v * w[i] * 1.5 - h * w[i] * 0.75 * amp];
    };
    const last = m - 1;
    for (let k = 0; k < K; k++) {
      const v = k / (K - 1) * 2 - 1;
      for (let i = g.m0; ; i += step) { const j = Math.min(i, last), q = at(j, v); if (i > g.m0) P.lineTo(q[0], q[1]); else P.moveTo(q[0], q[1]); if (j === last) break; }
    }
    for (let i = g.m0; ; i += step * 2) { const j = Math.min(i, last); for (let k = 0; k < K; k++) { const q = at(j, k / (K - 1) * 2 - 1); if (k) P.lineTo(q[0], q[1]); else P.moveTo(q[0], q[1]); } if (j === last) break; }
    return { line: P };
  },
};
// ----- Sort, Mosh and Blocks: brushes that work on whatever is already painted beneath them. A live stroke is drawn
// in its turn, so the picture so far is there to read. Inside the stroke's outline the picture is replaced:
//   sort:   a real pixel sort. A small copy of the patch is read back a few times a second, each column's pixels are
//           sorted by brightness from a point on down, and it is drawn back in big square pixels
//   mosh:   datamosh. A snapshot of the patch is kept for a second or two; blocks of that stale picture replace the
//           live one and slide further off until the next snapshot
//   blocks: wide strips of the live picture slip sideways, some recoloured
// With nothing beneath, only the stroke's own faint trace shows. (v25's versions only dragged single rows and blocks
// about, which showed almost nothing over thin lines.)
const spare = document.createElement('canvas'), spx = spare.getContext('2d');
const FLIPC = ['#00e5ff', '#ff2bd6', '#fff35c', '#ffffff'];
function sortPatch(u, g, slot, inside, tint) {
  const W = u.c.width, H = u.c.height, im = u.x.getImageData(0, 0, W, H), d = im.data, [tr, tg, tb] = toRgb(tint);
  for (let x = 0; x < W; x++) {
    // this column's touched pixels, top to bottom; sorted by brightness from a point part-way down
    const rows = [];
    for (let y = 0; y < H; y++) { const p = (y * W + x) * 4; if (inside[y * W + x]) rows.push(y); else d[p + 3] = 0; }
    if (!rows.length) continue;
    const q = hash32(g.seed, x, Math.floor(slot / 8)), r0 = Math.floor(frac(q) * rows.length * 0.55);
    const part = rows.slice(r0).map(y => { const p = (y * W + x) * 4; return [d[p], d[p + 1], d[p + 2], d[p + 3], (d[p] * 0.3 + d[p + 1] * 0.59 + d[p + 2] * 0.11) * d[p + 3]]; }).sort((a, b) => (a[4] - b[4]) * g.dir);
    for (let i = r0; i < rows.length; i++) { const p = (rows[i] * W + x) * 4, v = part[i - r0]; d[p] = v[0]; d[p + 1] = v[1]; d[p + 2] = v[2]; d[p + 3] = v[3]; }
    // empty pixels carry a faint tint, so the stroke is never invisible
    for (const y of rows) { const p = (y * W + x) * 4; if (d[p + 3] < 14) { d[p] = tr; d[p + 1] = tg; d[p + 2] = tb; d[p + 3] = 14; } }
  }
  u.x.putImageData(im, 0, 0);
}
function drawUnder(X, s, g, S, T, slot, e, c) {
  const M = MATS[s.color], n = s.pts.length;
  // The patch worked on is three times the brush's width (a brush-wide strip showed too little of the picture)
  const wide = g.wide || (g.wide = s._w.map(v => v * 3));
  let body = s.tool === 'glow' ? g.body || (g.body = buildShape(capsAlong(s._xs, s._ys, wide, 0, n - 1, 3), [], [1], g.base, 0).paths[1]) : null;
  if (!body) {
    let m = n - 1, m0 = 0;
    if (T !== Infinity) { m = 0; while (m < n - 1 && s.pts[m + 1][2] <= T) m++; if (m < 1) return; }
    if (s.head) { while (m0 < m - 1 && s.pts[m0][2] < g.T0) m0++; }
    let xs = s._xs, ys = s._ys;
    if (s.tool === 'ripple') { for (let i = 0; i < n; i++) { const off = sway(s, i, S); s._rx[i] = s._xs[i] + s._nx[i] * off; s._ry[i] = s._ys[i] + s._ny[i] * off; } xs = s._rx; ys = s._ry; }
    body = buildShape(capsAlong(xs, ys, wide, m0, m, 3), [], [1], g.base, 0).paths[1];
  }
  const cvs = X.canvas, b = g.bb, un = g.un || (g.un = []);
  let copy = 0;
  forCopies(X, () => {
    const k = copy++;
    // Where this copy lands on the canvas, in pixels
    const t = X.getTransform(), cx = [b[0], b[2], b[0], b[2]], cy = [b[1], b[1], b[3], b[3]];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let q = 0; q < 4; q++) { const x = t.a * cx[q] + t.c * cy[q] + t.e, y = t.b * cx[q] + t.d * cy[q] + t.f; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(cvs.width, Math.ceil(x1)); y1 = Math.min(cvs.height, Math.ceil(y1));
    const w = x1 - x0, h = y1 - y0, unit = Math.max(3, g.base * Math.sqrt(Math.abs(t.a * t.d - t.b * t.c)));
    const trace = () => {   // the stroke's own trace, so it is never invisible
      X.globalAlpha = 0.03 + 0.04 * Math.min(e, 1); X.fillStyle = c; X.fill(body);
      X.globalAlpha = 1;
    };
    if (w < 6 || h < 6 || k > 5) { trace(); return; }
    if (M.under === 'sort') {
      // Whole big pixels: every pixel the stroke touches is sorted, so the patch has staircase edges (not the brush's
      // smooth outline cutting through pixels, as in v26)
      let px = Math.max(3, Math.round(unit * 0.3)); if (w / px > 80 || h / px > 80) px = Math.ceil(Math.max(w, h) / 80);
      const W = Math.ceil(w / px), H = Math.ceil(h / px);
      let u = un[k];
      if (!u || u.c.width !== W || u.c.height !== H) { const cc = document.createElement('canvas'); cc.width = W; cc.height = H; u = un[k] = { c: cc, x: cc.getContext('2d', { willReadFrequently: true }), at: -9, runs: [] }; }
      if (slot - u.at >= 2) {
        u.at = slot;
        // which big pixels the stroke touches: its outline drawn at this size
        u.x.setTransform(1 / px, 0, 0, 1 / px, -x0 / px, -y0 / px); u.x.transform(t.a, t.b, t.c, t.d, t.e, t.f);
        u.x.clearRect(-9, -9, 18, 18); u.x.fillStyle = '#000'; u.x.fill(body);
        u.x.setTransform(1, 0, 0, 1, 0, 0);
        const mk = u.x.getImageData(0, 0, W, H).data, inside = new Uint8Array(W * H);
        u.runs = [];
        for (let y = 0; y < H; y++) for (let x = 0, a = -1; x <= W; x++) { const on = x < W && mk[(y * W + x) * 4 + 3] > 90; if (on) { inside[y * W + x] = 1; if (a < 0) a = x; } else if (a >= 0) { u.runs.push(a, y, x - a); a = -1; } }
        u.x.clearRect(0, 0, W, H); u.x.drawImage(cvs, x0, y0, W * px, H * px, 0, 0, W, H);
        sortPatch(u, g, slot, inside, c);
      }
      X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
      for (let q = 0; q < u.runs.length; q += 3) X.clearRect(x0 + u.runs[q] * px, y0 + u.runs[q + 1] * px, u.runs[q + 2] * px, px);
      X.imageSmoothingEnabled = false; X.drawImage(u.c, 0, 0, W, H, x0, y0, W * px, H * px); X.imageSmoothingEnabled = true;
      X.restore();
      return;
    }
    X.save(); X.clip(body); X.setTransform(1, 0, 0, 1, 0, 0);
    if (false) {
    } else if (M.under === 'mosh') {
      const sc = Math.min(1, 520 / Math.max(w, h)), W = Math.max(4, Math.round(w * sc)), H = Math.max(4, Math.round(h * sc)), every = 7 + g.hold;
      let u = un[k];
      if (!u || u.c.width !== W || u.c.height !== H) { const cc = document.createElement('canvas'); cc.width = W; cc.height = H; u = un[k] = { c: cc, x: cc.getContext('2d'), at: -99, n: 0 }; }
      if (slot - u.at >= every) { u.at = slot; u.n++; u.x.clearRect(0, 0, W, H); u.x.drawImage(cvs, x0, y0, w, h, 0, 0, W, H); }
      const age = Math.min(1, (slot - u.at + 1) / every), bs = Math.max(8, Math.round(Math.max(unit * 0.7, Math.sqrt(w * h / 160))));
      for (let by = 0, j = 0; by < h; by += bs) for (let bx = 0; bx < w; bx += bs, j++) {
        const q = hash32(g.seed, j, u.n), kind = q % 10;
        if (kind < 3) continue;   // the live picture shows through
        const dx = kind < 8 ? g.dir * age * bs * 2.4 * g.reach * (0.4 + frac(q >>> 3)) * (1 + e) : 0, dy = kind < 8 ? (frac(q >>> 9) - 0.5) * bs * 1.4 * age : 0;
        X.clearRect(x0 + bx + dx, y0 + by + dy, bs, bs);
        // most stale blocks slide; some smear one column of themselves across the block
        if (kind < 8) X.drawImage(u.c, bx * sc, by * sc, bs * sc, bs * sc, x0 + bx + dx, y0 + by + dy, bs, bs);
        else X.drawImage(u.c, (bx + bs * frac(q >>> 5)) * sc, by * sc, Math.max(1, sc), bs * sc, x0 + bx, y0 + by, bs, bs);
      }
    } else {
      if (spare.width < w || spare.height < h) { spare.width = Math.max(spare.width, w); spare.height = Math.max(spare.height, h); }
      spx.clearRect(0, 0, w, h); spx.drawImage(cvs, x0, y0, w, h, 0, 0, w, h);
      for (let i = 0, nb = 8 + Math.round(4 * e); i < nb; i++) {
        const q = hash32(g.seed, i, Math.floor(slot / (g.hold + i))), rh = Math.max(4, Math.round(h * (0.04 + 0.1 * frac(q >>> 6)))), ry = Math.round((h - rh) * frac(q >>> 16)), dx = Math.round((frac(q >>> 3) - 0.5) * unit * 3.2 * g.reach * (1 + 0.6 * e)) || Math.round(unit);
        X.clearRect(x0, y0 + ry, w, rh);
        X.drawImage(spare, 0, ry, w, rh, x0 + dx, y0 + ry, w, rh);
        if (q % 3 === 0) { X.globalCompositeOperation = 'source-atop'; X.globalAlpha = 0.85; X.fillStyle = FLIPC[q % FLIPC.length]; X.fillRect(x0, y0 + ry, w, rh); X.globalCompositeOperation = 'source-over'; X.globalAlpha = 1; }
      }
    }
    X.restore();
    trace();
  }, s);
}
// ----- Code: one character per grid cell. Before the first code stroke of a frame is drawn, every code stroke's cells
// are worked out and each cell is given to the newest stroke that has it; older strokes skip it. So code painted over
// code changes the colour and nothing overlaps (and nothing else in the cell is touched).
let owners = null;
export const liveFrame = () => { owners = null; };
const cellKey = q => Math.round(q[0] / GCELL) + ',' + Math.round(q[1] / GCELL);
function claimCells(S, B) {
  owners = new Map();
  for (const s of score.strokes) {
    if (!MATS[s.color].glyph || !s._L) continue;
    s._cellsNow = liveCells(s, S, reveal(s, S, B));
    for (const q of s._cellsNow) owners.set(cellKey(q), s.id);
  }
}
const FLIP = ['#00e5ff', '#ff2bd6', '#fff35c', '#ffffff'];
// Draw one live stroke. X: the frame buffer's context, in drawing space. P: { drum, by } from pulseFrame.
export function drawLive(X, s, S, B, now, P) {
  const M = MATS[s.color], g = s._gl || setup(s), e = Math.min((P.by.get(s.id) || 0) + 0.5 * P.drum, 1.5);
  const slot = Math.floor(now / 170), T = reveal(s, S, B), c = colorOf(s), tiles = score.mode === 'tiles';
  g.T0 = s.head ? T - headSpan(s) : -Infinity;
  let pass;
  if (M.under) { drawUnder(X, s, g, S, T, slot, e, c); return; }
  if (M.gl) {
    const m = livePts(s, g, S, T, slot, e), geo = m - g.m0 > 1 ? LIVE[M.gl](s, g, S, m, e, slot) : {};
    X.lineWidth = g.lw2 || (g.lw2 = clamp(g.base * 0.07, 0.0022, 0.006)); X.lineJoin = 'bevel'; X.lineCap = 'butt';
    pass = (dx, dy, a, col) => {
      X.strokeStyle = X.fillStyle = col || c; X.translate(dx, dy);
      if (geo.far) { X.globalAlpha = a * 0.45; X.fill(geo.far); }
      X.globalAlpha = a;
      if (geo.line) X.stroke(geo.line);
      if (geo.fill) X.fill(geo.fill);
      X.translate(-dx, -dy);
    };
  } else if (M.wire) {
    const path = wirePath(s, g, S, T, slot, e);
    X.lineWidth = g.lw; X.lineJoin = 'bevel'; X.lineCap = 'butt';   // plain line ends: the cheapest to draw
    pass = (dx, dy, a, col, op) => { X.globalAlpha = a; X.globalCompositeOperation = op || 'source-over'; X.strokeStyle = col || c; X.translate(dx, dy); X.stroke(path); X.translate(-dx, -dy); };
  } else if (M.nodes) {
    const { P: path, N } = nodesPath(s, g, S, T, slot, e), nr = Math.min(g.els[0].R * 0.55, 0.011) * (1 + 0.8 * Math.min(e, 1.2));   // points stay points under big brushes
    X.lineWidth = g.lw; X.lineJoin = 'bevel'; X.lineCap = 'butt';
    // The main pass (full strength, in the stroke's own colour) gets white points; copies get theirs in the copy's colour
    pass = (dx, dy, a, col) => {
      X.globalAlpha = a; X.strokeStyle = col || c; X.translate(dx, dy); X.stroke(path);
      X.fillStyle = a === 1 && (!col || col === c) ? '#ffffff' : col || c;
      for (const q of N) X.fillRect(q[0] - nr, q[1] - nr, nr * 2, nr * 2);
      X.translate(-dx, -dy);
    };
  } else {
    if (!owners) claimCells(S, B);
    const cells = (s._cellsNow || liveCells(s, S, T)).filter(q => owners.get(cellKey(q)) === s.id);
    pass = (dx, dy, a, col, op) => { X.globalCompositeOperation = op || 'source-over'; drawCells(X, cells, g, col || c, S, slot, e, dx, dy, a); };
  }
  forCopies(X, () => {
    if (g.fx === 'smear') {
      // Fewer trail copies where each one costs more: glyphs (an image copy per cell) and tiles (many copies of everything)
      const n = tiles ? (M.wire ? 1 : 0) : 2, osc = 0.5 + 0.5 * Math.sin(now / 1000 * g.rate + g.seed % 7), step = 0.011 * g.reach * (0.35 + osc + 1.6 * e) * g.dir;
      for (let k = n; k >= 1; k--) pass(step * k * (5 / (n + 2)), 0, (1 - k / (n + 1)) * 0.5, c);
      const sp = 0.004 * g.split * (1 + 2.5 * e);
      // Fringes are plain copies under the main one (additive blending cost a dropped frame in the test)
      pass(-sp, 0, 0.85, '#ff2040'); pass(sp, 0, 0.85, '#00e0ff'); pass(0, 0, 1, c);
    } else if (g.fx === 'blocks') {
      pass(0, 0, 1, c);
      const b = g.bb, bw = b[2] - b[0], bh = b[3] - b[1];
      for (let i = 0, nb = (tiles ? 2 : 4) + Math.round(3 * e); i < nb; i++) {
        const h = hash32(g.seed, i, Math.floor(slot / (g.hold + i))), rw = bw * (0.15 + 0.3 * frac(h)), rh = Math.max(0.02, bh * (0.08 + 0.25 * frac(h >>> 6)));
        const rx = b[0] + (bw - rw) * frac(h >>> 11), ry = b[1] + (bh - rh) * frac(h >>> 16), dx = (frac(h >>> 3) - 0.5) * 0.3 * g.reach;
        X.save(); X.beginPath(); X.rect(rx + dx, ry, rw, rh); X.clip();
        pass(dx, 0, 1, h % 3 === 0 ? FLIP[h % FLIP.length] : c);
        X.restore();
        if (h % 5 === 0) { X.globalAlpha = 0.2; X.fillStyle = c; X.fillRect(rx + dx, ry, rw, rh * 0.35); }
      }
    } else {
      pass(0.004 * g.dir, 0.002, 0.45, '#00e0ff'); pass(0, 0, 1, c);
    }
    X.globalAlpha = 1; X.globalCompositeOperation = 'source-over';
  }, { _bb: g.bb });
}
