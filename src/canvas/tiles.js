// Tiles mode: square or hex grid by turns (1, 2, 4 = square; 3, 6 = hex), tiles = size, mirror.
// Scrolls upward past a hidden reading line; left to right = low to high pitch.
import { TAU, mod, SQ3 } from '../core/math.js';
import { score } from '../core/state.js';
import { fs } from './free.js';

export const TURNS = [1, 2, 3, 4, 6];
// Tiles: one repeating grid with 1, 2, 3, 4 or 6 turns (squares for 1, 2 and 4, hexagons for 3 and 6), optionally mirrored.
// The grid drifts upward past a hidden reading line; left to right is low to high.
export function tileGeo() {
  const k = TURNS[score.turns], hex = k === 3 || k === 6, a = 2.4 / score.tiles, rowH = hex ? a * SQ3 / 2 : a;
  const mats = [];
  for (let j = 0; j < k; j++) {
    const c = Math.cos(TAU * j / k), sn = Math.sin(TAU * j / k);
    mats.push([c, sn, -sn, c]);
    if (score.mirror) mats.push([-c, -sn, -sn, c]);
  }
  return { k, hex, a, rowH, CW: a, CH: hex ? 2 * rowH : a, offX: j => hex ? mod(j, 2) * a / 2 : 0, mats };
}
// Every turn (and reflection) of the motif, placed at each grid point that touches the repeating cell
export function copies(c, fn, s) {
  const b = (s && s._bb) || [-1.1, -1.1, 1.1, 1.1], mg = 0.06, g = tileGeo(), k = fs();
  for (const M0 of g.mats) {
    const M = M0.map(v => v * k);   // Size scales the motif inside its tile; the grid stays put
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [px, py] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) {
      const x = M[0] * px + M[2] * py, y = M[1] * px + M[3] * py;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    for (let j = Math.ceil((-mg - y1) / g.rowH); j <= Math.floor((g.CH + mg - y0) / g.rowH); j++) {
      const ox = g.offX(j);
      for (let i = Math.ceil((-mg - x1 - ox) / g.a); i <= Math.floor((g.CW + mg - x0 - ox) / g.a); i++) {
        c.save(); c.translate(i * g.a + ox, j * g.rowH); c.transform(M[0], M[1], M[2], M[3], 0, 0); fn(); c.restore();
      }
    }
  }
}
// One eraser touch hits every tile: test a point against the eraser in every copy, through the grid's wrap
export function eraseTester(p, R) {
  const g = tileGeo(), k = fs();
  return pt => g.mats.some(M => {
    const dx0 = k * (M[0] * pt[0] + M[2] * pt[1]) - p.x, dy0 = k * (M[1] * pt[0] + M[3] * pt[1]) - p.y, jf = dy0 / g.rowH;
    for (const j of [Math.floor(jf), Math.ceil(jf)]) {
      const dy = dy0 - j * g.rowH, rx = dx0 - g.offX(j), i = Math.round(rx / g.a), dx = rx - i * g.a;
      if (dx * dx + dy * dy < R * R) return true;
    }
    return false;
  });
}
