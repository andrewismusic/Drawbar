// Shape building: capsules, circles, drips, comic puffs and per-material extra pieces (slime bubbles, vine leaves and flowers)
// Shapes are built from round pieces: a capsule between each pair of neighbouring points (a circle swept along the line)
// and plain circles (beads, puffs, drops). All are wound the same way, so together they fill as one clean outline:
// round tips, no spikes or tears however tight the bend or wide the brush.
import { TAU, hash32, mulberry32 } from '../core/math.js';

export function addCap(pth, ax, ay, ar, bx, by, br) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  if (d <= Math.abs(ar - br) + 1e-9) { const [x, y, rr] = ar >= br ? [ax, ay, ar] : [bx, by, br]; pth.moveTo(x + rr, y); pth.arc(x, y, rr, 0, TAU); return; }
  const ph = Math.atan2(dy, dx), al = Math.acos((ar - br) / d);
  pth.moveTo(ax + ar * Math.cos(ph + al), ay + ar * Math.sin(ph + al));
  pth.arc(ax, ay, ar, ph + al, ph + TAU - al);
  pth.arc(bx, by, br, ph - al, ph + al);
  pth.closePath();
}
export function capsAlong(xs, ys, w, i0, i1, step) {
  const caps = [];
  let a = i0;
  for (let b = Math.min(i0 + step, i1); ; b = Math.min(b + step, i1)) {
    caps.push([xs[a], ys[a], w[a], xs[b], ys[b], w[b]]);
    if (b >= i1) break;
    a = b;
  }
  if (i1 <= i0) caps.push([xs[i0], ys[i0], w[i0], xs[i0], ys[i0], w[i0]]);
  return caps;
}
// A regular polygon, wound the same way as the arcs so overlapping pieces fill as one shape (geometric materials)
export function addPoly(pth, x, y, r, sides, rot) {
  pth.moveTo(x + r * Math.cos(rot), y + r * Math.sin(rot));
  for (let i = 1; i < sides; i++) { const a = rot + TAU * i / sides; pth.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
  pth.closePath();
}
// Geometric brush: polygons placed along the line and turned to follow it. Returned as circle entries [x, y, r, sides, rot].
export function geoChain(xs, ys, w, i0, i1, g) {
  const out = [];
  let d = 0, next = 0, k = 0;
  for (let i = i0; i <= i1; i++) {
    if (i > i0) d += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    if (d < next && i < i1) continue;
    const a = Math.min(i + 1, i1), b = Math.max(i - 1, i0), ang = a === b ? 0 : Math.atan2(ys[a] - ys[b], xs[a] - xs[b]);
    const r = Math.max(w[i], 1e-4) * g.size;
    out.push([xs[i], ys[i], r, g.sides, ang + g.spin + (g.alt && k % 2 ? Math.PI / g.sides : 0)]);
    next = d + r * g.gap; k++;
  }
  return out;
}
// inkT: an outline of constant thickness around everything (so tips get the same ink as the body); inkCaps: a hand-varied outline instead
export function buildShape(caps, circles, ks, w0, inkT = 0, inkCaps = null) {
  const paths = {};
  for (const k of ks) {
    const pth = new Path2D();
    for (const c of caps) addCap(pth, c[0], c[1], c[2] * k, c[3], c[4], c[5] * k);
    for (const [x, y, rr, sides, rot] of circles) { if (sides) addPoly(pth, x, y, rr * k, sides, rot); else { pth.moveTo(x + rr * k, y); pth.arc(x, y, rr * k, 0, TAU); } }
    paths[k] = pth;
  }
  let ink = null;
  if (inkT || inkCaps) {
    ink = new Path2D();
    for (const c of inkCaps || caps) inkCaps ? addCap(ink, ...c) : addCap(ink, c[0], c[1], c[2] + inkT, c[3], c[4], c[5] + inkT);
    for (const [x, y, rr, sides, rot] of circles) { if (sides) addPoly(ink, x, y, rr + inkT / Math.cos(Math.PI / sides), sides, rot); else { ink.moveTo(x + rr + inkT, y); ink.arc(x, y, rr + inkT, 0, TAU); } }
  }
  return { paths, w0, wd: w0, ink };
}
// Drips: runs hang straight down from the underside, ending in a bulb, sometimes with a drop below
export function dripsFor(pts, rnd) {
  // Short, round drips: a bead hanging just under the line, now and then a separate drop below it
  const caps = [], circ = [];
  let gap = 0;
  for (const [x, y, w] of pts) {
    gap -= 1;
    if (gap > 0) continue;
    gap = 2 + Math.floor(rnd() * 5);
    if (rnd() < 0.3) continue;
    const r0 = w * (0.38 + 0.22 * rnd()), r1 = r0 * (1.1 + 0.3 * rnd()), len = w * (0.25 + 0.75 * rnd() * rnd()), xo = (rnd() - 0.5) * w * 0.5;
    const y0 = y + w * 0.6, y1 = y0 + len;
    caps.push([x + xo * 0.3, y, w * 0.8, x + xo, y0, r0]);
    caps.push([x + xo, y0, r0, x + xo, y1, r1]);
    if (rnd() < 0.28) { const rr = r1 * (0.45 + 0.3 * rnd()); circ.push([x + xo, y1 + r1 + rr + w * (0.7 + 0.6 * rnd()), rr]); }
  }
  return { caps, circ };
}
// Extra pieces for some materials, built once per stroke in the stroke's own space
export function extraPieces(s, kind, xs, ys, nx, ny, w, L, n, w0) {
  const rnd = mulberry32(hash32(s.id, 404)), out = {};
  if (kind === 'slime') {
    out.bub = new Path2D(); out.bubHi = new Path2D();
    for (let i = 0; i < n; i += 3) {
      if (rnd() > 0.22) continue;
      const u = (rnd() * 2 - 1) * 0.5 * w[i], rr = w0 * (0.1 + 0.16 * rnd()), cx = xs[i] + nx[i] * u, cy = ys[i] + ny[i] * u;
      out.bub.moveTo(cx + rr, cy); out.bub.arc(cx, cy, rr, 0, TAU);
      const hx = cx - rr * 0.35, hy = cy - rr * 0.4, hr = rr * 0.3;
      out.bubHi.moveTo(hx + hr, hy); out.bubHi.arc(hx, hy, hr, 0, TAU);
    }
  }
  if (kind === 'vine') {
    // Leaves on alternating sides, leaning forward; flowers clustered along the stem
    const leaf = out.leaf = new Path2D(), leafHi = out.leafHi = new Path2D();
    const P = { A: new Path2D(), AHi: new Path2D(), B: new Path2D(), BHi: new Path2D() }, ctr = out.ctr = new Path2D(), ctrHi = out.ctrHi = new Path2D();
    let d = w0 * rnd(), side = 1, j = 0, nextF = w0 * (1 + 2 * rnd());
    while (d < L[n - 1]) {
      while (j < n - 1 && L[j] < d) j++;
      const tx = ny[j], ty = -nx[j], bx = xs[j], by = ys[j], len = w0 * (1.6 + 0.8 * rnd()), wid = len * 0.32;
      const dx = nx[j] * side * 0.8 + tx * 0.6, dy = ny[j] * side * 0.8 + ty * 0.6, m = Math.hypot(dx, dy);
      const ux = dx / m, uy = dy / m, px = -uy, py = ux, ex = bx + ux * len, ey = by + uy * len, mx = bx + ux * len * 0.5, my = by + uy * len * 0.5;
      leaf.moveTo(bx, by); leaf.quadraticCurveTo(mx + px * wid * 2, my + py * wid * 2, ex, ey); leaf.quadraticCurveTo(mx - px * wid * 2, my - py * wid * 2, bx, by);
      leafHi.moveTo(bx, by); leafHi.quadraticCurveTo(mx + px * wid * 1.8, my + py * wid * 1.8, ex, ey); leafHi.closePath();
      side = -side;
      d += w0 * (0.9 + 0.8 * rnd());
      if (d > nextF) {
        // A flower: five petals round a golden centre, sometimes a pair
        const count = rnd() < 0.3 ? 2 : 1;
        for (let c = 0; c < count; c++) {
          const off = (rnd() * 2 - 1) * w0 * 0.9, cx = bx + nx[j] * off + (c ? tx * w0 * 1.3 : 0), cy = by + ny[j] * off + (c ? ty * w0 * 1.3 : 0);
          const R = w0 * (0.75 + 0.45 * rnd()), rot = rnd() * TAU, col = rnd() < 0.7 ? 'A' : 'B';
          for (let k = 0; k < 5; k++) {
            const a = rot + k * TAU / 5, qx = cx + Math.cos(a) * R * 0.62, qy = cy + Math.sin(a) * R * 0.62, pr = R * 0.5;
            P[col].moveTo(qx + pr, qy); P[col].arc(qx, qy, pr, 0, TAU);
            const hx = cx + Math.cos(a) * R * 0.45, hy = cy + Math.sin(a) * R * 0.45, hr = pr * 0.45;
            P[col + 'Hi'].moveTo(hx + hr, hy); P[col + 'Hi'].arc(hx, hy, hr, 0, TAU);
          }
          ctr.moveTo(cx + R * 0.3, cy); ctr.arc(cx, cy, R * 0.3, 0, TAU);
          ctrHi.moveTo(cx - R * 0.08 + R * 0.12, cy - R * 0.1); ctrHi.arc(cx - R * 0.08, cy - R * 0.1, R * 0.12, 0, TAU);
        }
        nextF = d + w0 * (1.6 + 2.2 * rnd());
      }
    }
    out.petA = P.A; out.petAHi = P.AHi; out.petB = P.B; out.petBHi = P.BHi;
    // Petals and leaves share a drop shadow
    const pet = out.pet = new Path2D(); pet.addPath(P.A); pet.addPath(P.B); pet.addPath(leaf);
    const petals = out.petals = new Path2D(); petals.addPath(P.A); petals.addPath(P.B);
  }
  return out;
}
// Comic cloud: puffs along the line, so every edge (and the ink around it) is scalloped
export function cloudPuffs(s, kind = 'comic') {
  const rnd = mulberry32(hash32(s.id, 515)), puffs = [], L = s._L, n = s.pts.length;
  let d = 0, j = 1, side = 1;
  while (d <= s._len) {
    while (j < n - 1 && L[j] < d) j++;
    const w = s._w[j], x = s._xs[j], y = s._ys[j], nx = s._nx[j], ny = s._ny[j];
    if (kind === 'cloud') {
      // Billows: big puffs, bigger on top, with a flatter underside
      puffs.push([x, y + w * 0.15, w * (0.95 + 0.2 * rnd())]);
      puffs.push([x + rnd() * w * 0.3, y - w * (0.35 + 0.35 * rnd()), w * (0.7 + 0.45 * rnd())]);
      d += Math.max(w * (0.9 + 0.5 * rnd()), 0.004);
    } else {
      puffs.push([x, y, w * 0.9]);
      puffs.push([x + nx * w * 0.5 * side, y + ny * w * 0.5 * side, w * (0.62 + 0.26 * rnd())]);
      side = -side;
      d += Math.max(w * 0.8, 0.003);
    }
  }
  return puffs;
}
export function centerPath(xs, ys, i0, i1, step) {
  const path = new Path2D();
  path.moveTo(xs[i0], ys[i0]);
  for (let i = i0 + step; i < i1; i += step) path.lineTo(xs[i], ys[i]);
  path.lineTo(xs[i1], ys[i1]);
  return path;
}
