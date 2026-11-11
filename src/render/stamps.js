// Stamped shapes (the Geometric world). A stamp is stored like any stroke: its points trace the shape's outline, one
// lap, evenly timed. So clips, undo and the music need nothing new: the arranger hears a stamp as a closed line with
// corners. The shape is drawn as a plain filled outline (a true circle for circles).
import { TAU } from '../core/math.js';

const STEP = 0.012;   // seconds between outline points: a stamp "lasts" about half a second
// Outline corners for each shape, as [angle offset, radius share]
const CORNERS = {
  square: [0, 1, 2, 3].map(k => [TAU * k / 4 + Math.PI / 4, 1]),
  triangle: [0, 1, 2].map(k => [TAU * k / 3, 1]),
  hexagon: [0, 1, 2, 3, 4, 5].map(k => [TAU * k / 6, 1]),
  star: Array.from({ length: 10 }, (_, k) => [TAU * k / 10, k % 2 ? 0.45 : 1]),
};
// Points around the outline, starting and ending at the first corner. rot = the shape's turn (radians).
export function stampPts(kind, cx, cy, r, rot) {
  const out = [];
  if (kind === 'circle') {
    for (let i = 0; i <= 48; i++) { const a = rot + TAU * i / 48; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  } else {
    const cs = CORNERS[kind].map(([a, k]) => [cx + Math.cos(rot + a) * r * k, cy + Math.sin(rot + a) * r * k]), sub = kind === 'star' ? 4 : 8;
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i], b = cs[(i + 1) % cs.length];
      for (let k = 0; k < sub; k++) out.push([a[0] + (b[0] - a[0]) * k / sub, a[1] + (b[1] - a[1]) * k / sub]);
    }
    out.push(cs[0].slice());
  }
  return out.map((q, i) => [q[0], q[1], i * STEP, 0.5]);
}
// The filled shape from a stamp's points (works on any part of an outline too)
export function stampShape(kind, pts) {
  const n = pts.length, path = new Path2D();
  let cx = 0, cy = 0;
  for (let i = 0; i < n - 1; i++) { cx += pts[i][0]; cy += pts[i][1]; }
  cx /= Math.max(n - 1, 1); cy /= Math.max(n - 1, 1);
  let r = 0;
  for (const q of pts) r = Math.max(r, Math.hypot(q[0] - cx, q[1] - cy));
  if (kind === 'circle') { path.moveTo(cx + r, cy); path.arc(cx, cy, r, 0, TAU); }
  else { path.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) path.lineTo(pts[i][0], pts[i][1]); path.closePath(); }
  return { paths: { 1: path }, w0: r, wd: r, ink: null, center: [cx, cy] };
}
