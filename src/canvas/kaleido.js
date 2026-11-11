// Kaleidoscope mode: copies (index into COPIES), spiral 0-1 morphs even folds into a golden-angle sunflower, mirror.
// Turns once per 6 bars; notes sound as copies pass the top.
import { TAU, mod, lerp, GOLD } from '../core/math.js';
import { score } from '../core/state.js';

export const COPIES = [2, 3, 4, 5, 6, 7, 8, 10, 13, 16, 21, 27, 34, 44, 55];
// Kaleidoscope copies morph from evenly spaced folds (spiral 0) to a golden-angle sunflower (spiral 1)
export function kCopies() {
  const C = COPIES[score.copies], m = score.spiral, out = [];
  for (let k = 0; k < C; k++) out.push({ a: lerp(TAU * k / C, k * GOLD, m), s: lerp(1, Math.sqrt((k + 1) / C), m) });
  return out;
}
// Phase of an angle as the pattern turns clockwise past the top
export const sPhase = a => mod(-Math.PI / 2 - a, TAU) / TAU;
export function copies(c, fn) {
  for (const cp of kCopies()) {
    c.save(); c.rotate(cp.a); c.scale(cp.s, cp.s); fn(); c.restore();
    if (score.mirror) { c.save(); c.rotate(cp.a); c.scale(cp.s, -cp.s); fn(); c.restore(); }
  }
}
// Eraser circles in the stroke's own space, one per copy (tiny copies are skipped)
export function eraseTargets(p, R) {
  const T = [];
  for (const cp of kCopies()) {
    if (cp.s < 0.3) continue;
    const c = Math.cos(-cp.a), sn = Math.sin(-cp.a), x = (p.x * c - p.y * sn) / cp.s, y = (p.x * sn + p.y * c) / cp.s, r2 = (R / cp.s) ** 2;
    T.push({ x, y, r2 });
    if (score.mirror) T.push({ x, y: -y, r2 });
  }
  return T;
}
