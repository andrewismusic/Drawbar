// Code glyphs (the Glitch world): marks become cells on a fixed grid in the drawing's own space, each with a glyph.
// Which glyph and how bright are seeded per stroke and cell, so a drawing always looks the same.
// Glyphs are drawn once per colour into a sheet (8 x 8 cells of 32 px); each cell on screen is one image copy from it.
import { hash32 } from '../core/math.js';

export const GCELL = 0.045;   // grid size, in drawing units (the disc's radius is 1)
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:=+*<>|';
const SZ = 32, COLS = 8;
const LEVELS = [0.5, 0.78, 1];
const sheets = new Map();
function sheet(color) {
  let c = sheets.get(color);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = SZ * COLS;
  const g = c.getContext('2d');
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 5;
  g.font = `bold ${SZ * 0.9}px ui-monospace, Menlo, Consolas, "Noto Sans Mono CJK JP", monospace`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < Math.min(GLYPHS.length, COLS * COLS); i++) g.fillText(GLYPHS[i], (i % COLS + 0.5) * SZ, (Math.floor(i / COLS) + 0.5) * SZ);
  sheets.set(color, c);
  return c;
}
// Cells touched by a list of round samples [x, y, r]. The last few samples are the "head" (bright, for moving strokes).
export function glyphCells(samples, id, headFrom = Infinity) {
  const cells = new Map(), g = GCELL, n = Math.min(GLYPHS.length, COLS * COLS);
  samples.forEach(([x, y, r], k) => {
    const rr = Math.max(r, g * 0.5);
    for (let i = Math.floor((x - rr) / g); i <= Math.floor((x + rr) / g); i++) for (let j = Math.floor((y - rr) / g); j <= Math.floor((y + rr) / g); j++) {
      if (Math.hypot((i + 0.5) * g - x, (j + 0.5) * g - y) > rr + g * 0.3) continue;
      const key = i + ',' + j, head = k >= headFrom;
      const prev = cells.get(key);
      if (prev) { if (head) prev[4] = 1; continue; }
      const h = hash32(id, i, j);
      cells.set(key, [i * g, j * g, h % n, (h >>> 8) % 10 < 5 ? 0 : (h >>> 8) % 10 < 8 ? 1 : 2, head ? 1 : 0]);
    }
  });
  return [...cells.values()];
}
// A shape for the drawing code: the cells as one outline (for the panel tint, the hidden-stroke test and clipping)
export function glyphShape(cells, w0) {
  const p = new Path2D();
  for (const [x, y] of cells) p.rect(x, y, GCELL, GCELL);
  return { paths: { 1: p }, w0, wd: w0, ink: null, cells };
}
// Samples along a line [x, y, r] every half cell
export function lineSamples(xs, ys, w, i1, L) {
  const out = [];
  let next = 0;
  for (let i = 0; i <= i1; i++) {
    if (L[i] + 1e-9 < next && i < i1) continue;
    out.push([xs[i], ys[i], w[i] * 1.1]);
    next = L[i] + GCELL * 0.5;
  }
  return out;
}
export function drawGlyphs(c, cells, color) {
  const sh = sheet(color), head = sheet('#f2fff6'), g = GCELL;
  for (const [x, y, gi, lv, hd] of cells) {
    c.globalAlpha = hd ? 1 : LEVELS[lv];
    c.drawImage(hd ? head : sh, (gi % COLS) * SZ, Math.floor(gi / COLS) * SZ, SZ, SZ, x, y, g, g);
  }
  c.globalAlpha = 1;
}
