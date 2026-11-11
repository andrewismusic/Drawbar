// Stroke geometry: smoothing, and all per-stroke derived data (the _ prefixed fields) made by prepare(s)
import { TAU, clamp, hash32, mod, mulberry32 } from './math.js';
import { buildShape, capsAlong, cloudPuffs, dripsFor, extraPieces, geoChain } from '../render/shapes.js';
import { MATS } from '../styles/index.js';
import { TOOL } from './tools.js';
import { glyphCells, glyphShape, lineSamples } from '../render/glyphs.js';
import { growPlant } from '../render/plants.js';
import { stampShape } from '../render/stamps.js';

export function resample(pts, sp) {
  const out = [pts[0].slice()];
  let need = sp;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let used = 0;
    while (d - used >= need) {
      used += need; const u = used / d;
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u]);
      need = sp;
    }
    need -= d - used;
  }
  const last = pts[pts.length - 1], tail = out[out.length - 1];
  if (Math.hypot(last[0] - tail[0], last[1] - tail[1]) > sp * 0.35) out.push(last.slice());
  else out[out.length - 1] = [tail[0], tail[1], last[2], last[3]];
  return out;
}
export function smoothStroke(pts, sz) {
  // Heavier smoothing for bigger brushes, but never enough to melt a short mark
  const r = resample(pts, 0.006), len = 0.006 * (r.length - 1);
  const passes = Math.round(clamp(Math.min(10 + 4 * sz, 2 * Math.pow(len / 7 / 0.006, 2)), 2, 40));
  return smoothPts(r, passes);
}
export function smoothPts(p, passes) {
  for (let k = 0; k < passes; k++) {
    const q = p.map(v => v.slice());
    for (let i = 1; i < p.length - 1; i++) { q[i][0] = (p[i - 1][0] + 2 * p[i][0] + p[i + 1][0]) / 4; q[i][1] = (p[i - 1][1] + 2 * p[i][1] + p[i + 1][1]) / 4; }
    p = q;
  }
  return p;
}
export const speedN = v => clamp(v / 2.5, 0, 1);
export const NEON_W = 0.0068, BEAD_R = 0.0042;
export function prepare(s) {
  if (s.pts.length < 2) { const q = s.pts[0]; s.pts.push([q[0] + 0.004, q[1], q[2] + 0.12, q[3]]); }
  s.color = clamp(s.color | 0, 0, MATS.length - 1);
  const p = s.pts, n = p.length, sz = s.size, M = MATS[s.color];
  const L = new Float32Array(n), sp = new Float32Array(n), nx = new Float32Array(n), ny = new Float32Array(n), xs = new Float32Array(n), ys = new Float32Array(n);
  for (let i = 0; i < n; i++) { xs[i] = p[i][0]; ys[i] = p[i][1]; }
  for (let i = 1; i < n; i++) {
    const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    L[i] = L[i - 1] + d;
    sp[i] = d / Math.max(p[i][2] - p[i - 1][2], 0.008);
  }
  sp[0] = sp[1];
  for (let pass = 0; pass < 4; pass++) for (let i = 1; i < n - 1; i++) sp[i] = (sp[i - 1] + sp[i] * 2 + sp[i + 1]) / 4;
  let mx = 0, my = 0, mr = 0, curv = 0;
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(i - 1, 0)], b = p[Math.min(i + 1, n - 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    nx[i] = -dy / m; ny[i] = dx / m;
    mx += p[i][0]; my += p[i][1]; mr += Math.hypot(p[i][0], p[i][1]);
    if (i >= 3 && i % 3 === 0 && i + 3 < n) {
      const a1 = Math.atan2(p[i][1] - p[i - 3][1], p[i][0] - p[i - 3][0]), a2 = Math.atan2(p[i + 3][1] - p[i][1], p[i + 3][0] - p[i][0]);
      curv += Math.abs(mod(a2 - a1 + Math.PI, TAU) - Math.PI);
    }
  }
  let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
  for (let i = 0; i < n; i++) { bx0 = Math.min(bx0, xs[i]); bx1 = Math.max(bx1, xs[i]); by0 = Math.min(by0, ys[i]); by1 = Math.max(by1, ys[i]); }
  const bm = (M.reach || (M.spray ? 0.03 : 0.015)) * sz + 0.03;
  s._bb = [bx0 - bm, by0 - bm, bx1 + bm, by1 + bm];
  Object.assign(s, { _L: L, _len: L[n - 1], _sp: sp, _nx: nx, _ny: ny, _xs: xs, _ys: ys, _sz: sz, _wave: null });
  s._dur = Math.max(p[n - 1][2], 0.35);
  s._mx = mx / n; s._my = my / n; s._mr = Math.min(mr / n, 1); s._ma = Math.atan2(s._my, s._mx);
  s._curv = curv / Math.max(s._len, 0.05);
  s._avgSp = s._len / s._dur;
  s._rate = 0.08 + 0.35 * Math.min(s._avgSp / 2.5, 1);
  s._waves = Math.max(1.5, s._len * 7);
  const path = new Path2D();
  path.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < n - 1; i++) path.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
  path.lineTo(p[n - 1][0], p[n - 1][1]);
  s._path = path;
  s._dot = s._len < 0.02;
  // Stamps (Geometric): the points are the outline; draw it filled
  const stamp = TOOL[s.tool] && TOOL[s.tool].stamp;
  if (stamp) { s._shape = stampShape(stamp, p); return; }
  const tl = Math.max(Math.min(0.03 * Math.sqrt(sz), s._len / 2.2), 1e-4);
  const taper = i => 0.3 + 0.7 * Math.sqrt(clamp(Math.min(L[i] / tl, (s._len - L[i]) / tl), 0, 1));
  if (s.tool !== 'beads') {
    // Faster strokes come out thinner
    const w = new Float32Array(n), w0 = NEON_W * sz;
    for (let i = 0; i < n; i++) w[i] = w0 * taper(i) * (1.35 - 0.95 * speedN(sp[i]));
    s._w = w;
    if (s.tool === 'ripple') { const amp = new Float32Array(n); for (let i = 0; i < n; i++) amp[i] = 1.3 - 1.0 * speedN(sp[i]); s._amp = amp; s._rx = new Float32Array(n); s._ry = new Float32Array(n); }
    if (s.tool === 'glow' && M.glyph) {
      // Code: the cells the line passes through
      s._shape = glyphShape(glyphCells(lineSamples(xs, ys, w, n - 1, L), s.id), w0);
    } else if (s.tool === 'glow' && M.plant) {
      // Garden: a thin stem with the plant grown along it
      s._shape = buildShape(capsAlong(xs, ys, w.map(v => v * M.stemW), 0, n - 1, 2), [], M.ks, w0 * 0.9);
      Object.assign(s._shape.paths, growPlant(M.plant, M.keys, s.id, { xs, ys, nx, ny, w, L, n, w0 }));
    } else if (s.tool === 'glow') {
      let caps = capsAlong(xs, ys, w, 0, n - 1, 2), circ = [], inkCaps = null;
      if (M.extra === 'slime') {
        // Slime: lumpy, swelling and thinning along its length
        const rr = mulberry32(hash32(s.id, 17)), p1 = rr() * TAU, p2 = rr() * TAU, ws = new Float32Array(n);
        for (let i = 0; i < n; i++) ws[i] = w[i] * (1.1 + 0.22 * Math.sin(L[i] / (w0 * 1.6) + p1) + 0.12 * Math.sin(L[i] / (w0 * 0.7) + p2));
        caps = capsAlong(xs, ys, ws, 0, n - 1, 2);
      }
      if (M.extra === 'vine') caps = capsAlong(xs, ys, w.map(v => v * 0.34), 0, n - 1, 2);
      const inkT = M.comic ? 0.26 * (M.inkW || 1) * w0 : (M.ink || 0) * w0;
      if (M.puffs) { caps = []; circ = cloudPuffs(s, M.puffs); }
      else if (M.geo) { caps = []; circ = geoChain(xs, ys, w, 0, n - 1, M.geo); }
      else if (M.comic) {
        // Comic ink swells and thins a little along the line, like a brush pen, but never vanishes at the tips
        const rr = mulberry32(hash32(s.id, 33)), p1 = rr() * TAU, p2 = rr() * TAU;
        const iw = M.extra === 'vine' ? 0.4 : M.inkW || 1;
        inkCaps = caps.map(([ax, ay, ar, bx, by, br], i) => { const t = L[Math.min(i * 2, n - 1)] / w0; return [ax, ay, ar + iw * w0 * (0.26 + 0.08 * Math.sin(t / 2.4 + p1) + 0.04 * Math.sin(t / 0.9 + p2)), bx, by, br + iw * w0 * (0.26 + 0.08 * Math.sin(t / 2.4 + p1) + 0.04 * Math.sin(t / 0.9 + p2))]; });
      }
      if (M.drip) {
        const pts = []; for (let i = 0; i < n; i += 2) pts.push([xs[i], ys[i], w[i]]);
        const d = dripsFor(pts, mulberry32(hash32(s.id, 91)));
        caps = caps.concat(d.caps); circ = circ.concat(d.circ);
        if (inkCaps) inkCaps = inkCaps.concat(d.caps.map(c => [c[0], c[1], c[2] + inkT, c[3], c[4], c[5] + inkT]));
      }
      s._shape = buildShape(caps, circ, M.ks, w0 * 0.9, inkT, inkCaps);
      if (M.extra) Object.assign(s._shape.paths, extraPieces(s, M.extra, xs, ys, nx, ny, w, L, n, w0));
      if (M.puffs) s._shape.w0 = w0 * 0.75;
    }
  } else {
    // Space beads along the line, then stretch the spacing so the last bead lands on the end
    const pos = [];
    let next = 0, j = 1;
    while (next <= s._len + 1e-6 && pos.length < 260) {
      while (j < n - 1 && L[j] < next) j++;
      const r = BEAD_R * (1 + 1.6 * (1 - speedN(sp[j]))) * sz * (0.5 + 0.5 * (taper(j) - 0.3) / 0.7);
      pos.push([next, r]);
      next += Math.max(r * 2.5, 0.006);
    }
    const last = pos[pos.length - 1][0], k = last > 0 ? s._len / last : 1, beads = [];
    j = 1;
    for (const [d0, r] of pos) {
      const d = d0 * k;
      while (j < n - 1 && L[j] < d) j++;
      const a = p[j - 1], b = p[j], seg = (L[j] - L[j - 1]) || 1e-6, u = clamp((d - L[j - 1]) / seg, 0, 1);
      beads.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, r });
    }
    if (M.glyph || M.plant) { shapeFromBeads(s, M, beads); return; }
    let caps = [], circ = M.geo ? beads.map((b, i) => [b.x, b.y, b.r * M.geo.bead, M.geo.sides, M.geo.spin + i * M.geo.turn]) : beads.map(b => [b.x, b.y, b.r]);
    if (M.drip) { const d = dripsFor(beads.map(b => [b.x, b.y, b.r]), mulberry32(hash32(s.id, 91))); caps = d.caps; circ = circ.concat(d.circ); }
    const bw0 = beads.reduce((a, b) => a + b.r, 0) / beads.length, inkT = M.comic ? 0.26 * (M.inkW || 1) * bw0 : (M.ink || 0) * bw0;
    s._shape = buildShape(caps, circ, M.ks, bw0, inkT);
  }
  if (s._dot && (M.glyph || M.plant)) { shapeFromBeads(s, M, [{ x: p[0][0], y: p[0][1], r: (s.tool === 'beads' ? BEAD_R * 2.2 : NEON_W * 1.4) * sz }]); return; }
  if (s._dot) { const rr = (s.tool === 'beads' ? BEAD_R * 2.2 : NEON_W * 1.4) * sz; s._shape = buildShape([], [M.geo ? [p[0][0], p[0][1], rr * M.geo.bead, M.geo.sides, M.geo.spin] : [p[0][0], p[0][1], rr]], M.ks, rr, M.comic ? 0.26 * rr : (M.ink || 0) * rr); }
}
// Code cells or garden blooms at points (Beads, and single dots)
function shapeFromBeads(s, M, beads) {
  const bw0 = beads.reduce((a, b) => a + b.r, 0) / beads.length;
  if (M.glyph) { s._shape = glyphShape(glyphCells(beads.map(b => [b.x, b.y, b.r]), s.id), bw0); return; }
  const pieces = growPlant(M.plant, M.keys, s.id, null, beads);
  s._shape = { paths: { ...pieces, 1: pieces.all }, w0: bw0, wd: bw0, ink: null };
}
export function sampleArc(s, spacing) {
  const p = s.pts, L = s._L, n = p.length, out = [];
  if (s._len < spacing * 0.5) return [{ x: p[0][0], y: p[0][1], sn: 0.3 }];
  let next = spacing * 0.5, j = 1;
  while (next <= s._len) {
    while (j < n - 1 && L[j] < next) j++;
    const a = p[j - 1], b = p[j], seg = (L[j] - L[j - 1]) || 1e-6, u = clamp((next - L[j - 1]) / seg, 0, 1);
    out.push({ x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, sn: Math.min(s._sp[j] / 2.2, 1) });
    next += spacing;
  }
  return out;
}
export function animEventIdx(s) {
  const p = s.pts, L = s._L, n = p.length, out = [];
  let lt = -1, ll = -1;
  for (let i = 0; i < n; i++) {
    const t = p[i][2];
    let corner = false;
    if (i > 4 && i < n - 5) {
      const ax = p[i][0] - p[i - 5][0], ay = p[i][1] - p[i - 5][1], bx = p[i + 5][0] - p[i][0], by = p[i + 5][1] - p[i][1];
      corner = (ax * bx + ay * by) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1) < 0.55;
    }
    if (i === 0 || (t - lt >= 0.14 && L[i] - ll >= 0.05) || (corner && t - lt > 0.09)) {
      out.push(i); lt = t; ll = L[i];
      if (out.length >= 16) break;
    }
  }
  return out;
}
