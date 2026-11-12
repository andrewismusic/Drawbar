// Free mode: no copies. Size (fscale), Rotate (frot) and Mirror (fmirror). Rotation affects the music per map (MAP.rot).
import { score } from '../core/state.js';

// Size (every pattern since v24): 50 is as drawn, 0 shrinks the drawing to a tenth, 100 doubles it
export const fs = () => score.fscale < 50 ? Math.pow(0.1, (50 - score.fscale) / 50) : Math.pow(2, (score.fscale - 50) / 50);
export function copies(c, fn) {
  const k = fs();
  c.save(); c.scale(k, k); fn();
  if (score.fmirror) { c.scale(-1, 1); fn(); }
  c.restore();
}
// Eraser circles in the stroke's own space, one per copy
export function eraseTargets(p, R) {
  const k = fs(), T = [{ x: p.x, y: p.y, r2: (R / k) ** 2 }];
  if (score.fmirror) T.push({ x: -p.x, y: p.y, r2: (R / k) ** 2 });
  return T;
}
