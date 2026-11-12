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
import { NEON_W } from '../core/stroke.js';
import { forCopies } from '../canvas/index.js';
import { MATS, colorOf } from '../styles/index.js';
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
  if (M.wire || M.nodes) {
    const base = NEON_W * s._sz * (s.tool === 'beads' ? 1.6 : 2.8) * (M.nodes ? 0.5 : 1), gap = Math.max(base * 2.3, s._len / (M.nodes ? 16 : 9));   // at most about 9 solids (16 nodes) a stroke
    g.els = []; g.lw = clamp(base * 0.085, 0.0022, 0.006);
    let next = 0;
    for (let i = 0; i < n; i++) {
      if (L[i] < next && !(i === n - 1 && !g.els.length)) continue;
      g.els.push({ i, x: s._xs[i], y: s._ys[i], R: base * (0.7 + 0.6 * r()), a: [r() * TAU, r() * TAU], w: [(r() - 0.5) * 2.6, (r() - 0.5) * 2.6], t: s.pts[i][2] });
      next = L[i] + gap;
    }
  }
  const b = s._bb, pad = 0.12;
  g.bb = [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad];
  return s._gl = g;
}
// Loop strokes are revealed along their length in time with the music; Ripple strokes sway
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
  const P = new Path2D(), { V, E } = SOLIDS[MATS[s.color].wire], pts = new Array(V.length);
  for (const el of g.els) {
    if (el.t > T) continue;
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
    if (el.t > T) continue;
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
    const smp = lineSamples(s._xs, s._ys, s._w, iT, s._L);
    return glyphCells(smp, s.id, smp.length - 3);
  }
  for (let i = 0; i < n; i++) { const off = sway(s, i, S); s._rx[i] = s._xs[i] + s._nx[i] * off; s._ry[i] = s._ys[i] + s._ny[i] * off; }
  return glyphCells(lineSamples(s._rx, s._ry, s._w, n - 1, s._L), s.id);
}
function drawCells(X, cells, g, color, S, slot, e, dx, dy, alpha) {
  const sh = sheet(color), head = sheet('#f2fff6'), G = GCELL;
  for (const [x0, y0, gi, lv, hd] of cells) {
    // Characters are replaced over time: some cells never change, some tick slowly, some flicker
    const h = hash32(Math.round(x0 * 1000), Math.round(y0 * 1000), g.seed), pace = h % 10, rate = pace < 3 ? 0 : pace < 8 ? 0.6 + frac(h >>> 5) * 2.4 : 6 + frac(h >>> 5) * 9;
    const ch = (gi + Math.floor(S * rate * g.rate + (h >>> 12) % 7)) % NGLYPH;
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
const FLIP = ['#00e5ff', '#ff2bd6', '#fff35c', '#ffffff'];
// Draw one live stroke. X: the frame buffer's context, in drawing space. P: { drum, by } from pulseFrame.
export function drawLive(X, s, S, B, now, P) {
  const M = MATS[s.color], g = s._gl || setup(s), e = Math.min((P.by.get(s.id) || 0) + 0.5 * P.drum, 1.5);
  const slot = Math.floor(now / 170), T = reveal(s, S, B), c = colorOf(s), tiles = score.mode === 'tiles';
  let pass;
  if (M.wire) {
    const path = wirePath(s, g, S, T, slot, e);
    X.lineWidth = g.lw; X.lineJoin = 'bevel'; X.lineCap = 'butt';   // plain line ends: the cheapest to draw
    pass = (dx, dy, a, col, op) => { X.globalAlpha = a; X.globalCompositeOperation = op || 'source-over'; X.strokeStyle = col || c; X.translate(dx, dy); X.stroke(path); X.translate(-dx, -dy); };
  } else if (M.nodes) {
    const { P: path, N } = nodesPath(s, g, S, T, slot, e), nr = g.els[0].R * 0.55 * (1 + 0.8 * Math.min(e, 1.2));
    X.lineWidth = g.lw; X.lineJoin = 'bevel'; X.lineCap = 'butt';
    // The main pass (full strength, in the stroke's own colour) gets white points; copies get theirs in the copy's colour
    pass = (dx, dy, a, col) => {
      X.globalAlpha = a; X.strokeStyle = col || c; X.translate(dx, dy); X.stroke(path);
      X.fillStyle = a === 1 && (!col || col === c) ? '#ffffff' : col || c;
      for (const q of N) X.fillRect(q[0] - nr, q[1] - nr, nr * 2, nr * 2);
      X.translate(-dx, -dy);
    };
  } else {
    const cells = liveCells(s, S, T);
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
