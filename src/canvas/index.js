// Canvas modes (score.mode): free, kaleido, tiles. Shared readers, and dispatch to the mode's own copies and eraser.
import { mod, clamp } from '../core/math.js';
import { score, ui } from '../core/state.js';
import { eraseRadius } from '../core/tools.js';
import { MAP } from '../sound/maps.js';
import * as free from './free.js';
import * as kaleido from './kaleido.js';
import * as tiles from './tiles.js';
import { fs } from './free.js';
import { COPIES, kCopies, sPhase } from './kaleido.js';
import { TURNS, tileGeo } from './tiles.js';

export { fs, COPIES, kCopies, sPhase, TURNS, tileGeo };

export const MODES = [
  { id: 'free', name: 'Free', icon: '<path d="M3.5 15c3-7 6 3 9-3s4 3 8-2"/>' },
  { id: 'kaleido', name: 'Kaleidoscope', icon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M4.6 7.8l14.8 8.4M4.6 16.2l14.8-8.4"/>' },
  { id: 'tiles', name: 'Tiles', icon: '<path d="M7 3.5l3.5 2v4l-3.5 2-3.5-2v-4zM17 3.5l3.5 2v4l-3.5 2-3.5-2v-4zM12 12.5l3.5 2v4l-3.5 2-3.5-2v-4z"/>' },
];
export const tiled = () => score.mode === 'tiles';
export function cellDims() { if (!tiled()) return null; const g = tileGeo(); return [g.CW, g.CH]; }
export const cycleBars = () => score.mode === 'kaleido' ? 6 : tiled() ? 2 : 1;
export const cycleBeats = () => 4 * cycleBars();
export const mirrored = () => score.mode === 'free' ? score.fmirror : score.mirror;
// Pitch reader: how high a point sits, 0-1
export function rawH(x, y) {
  if (score.mode === 'free') { const k = fs(); x *= k; y *= k; }
  const m = score.mode, r = Math.min(Math.hypot(x, y), 1);
  if (m === 'tiles') { const a = tileGeo().a; return mod(x, a) / a; }
  return m === 'free' ? MAP.hy * clamp((1 - y) / 2, 0, 1) + (1 - MAP.hy) * r : r;
}
// Phase reader: where in the cycle a stroke sits, 0-1
export function strokePhase(s) {
  const m = score.mode;
  if (m === 'kaleido') return sPhase(s._ma);
  if (m === 'tiles') { const g = tileGeo(); return mod(s._my, g.CH) / g.CH; }
  return (s._mx + 1) / 2;
}
export function patternAmount() {
  const m = score.mode;
  return m === 'kaleido' ? Math.min(COPIES[score.copies] / 12, 1) : m === 'tiles' ? Math.min(score.tiles / 6 * (0.5 + 0.1 * TURNS[score.turns]), 1) : clamp(0.3 + 0.2 * (score.frot ? 1 : 0) + 0.25 * Math.log2(fs()), 0, 1);
}
// Run fn once per copy, with the context transformed into that copy's space (s: the stroke, for tile culling)
export function forCopies(c, fn, s) {
  const m = score.mode;
  if (m === 'free') return free.copies(c, fn, s);
  if (m === 'kaleido') return kaleido.copies(c, fn, s);
  tiles.copies(c, fn, s);
}
// On repeating grids one eraser touch hits every tile, so it shrinks with the tile
export function effEraseR() {
  const R = eraseRadius(ui.eraseV);
  return tiled() ? R * clamp(tileGeo().a * 0.5, 0.15, 0.6) : R;
}
// A test for whether a stroke point (in stroke space) is under the eraser at p (in screen space), through every copy
export function eraseTester(p) {
  const R = effEraseR(), m = score.mode;
  if (m === 'tiles') return tiles.eraseTester(p, R);
  const T = m === 'kaleido' ? kaleido.eraseTargets(p, R) : free.eraseTargets(p, R);
  return pt => T.some(o => (pt[0] - o.x) ** 2 + (pt[1] - o.y) ** 2 < o.r2);
}
