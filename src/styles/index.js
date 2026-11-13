// All materials, in swatch order. One light for the whole picture (up and to the left on screen); every copy is shaded
// for where it sits, so a turned or mirrored copy is lit from the same side as the original.
// Keyed layers (string k) are extra pieces made for a material: bubbles, leaves, flowers (see extraPieces in render/shapes.js).
import { tint, toRgb } from '../core/color.js';
import { liquidMetal, creams, softCloud, slimeMat } from './realistic.js';
import { comics, comicCloud, inkHatch, drips, flowerVine } from './comic.js';
import { pixels, shapes, neons } from './retired.js';
import { sprays } from './graffiti.js';
import { flats } from './flat.js';
import { glyphMats } from './code.js';
import { plants } from './garden.js';
import { signals } from './signal.js';
import { spaceMats } from './space.js';
import { pop } from './comic.js';
import { nodes } from './signal.js';
import { screentone, brushInk } from './comic.js';
import { solids, lineMats, underMats } from './signal.js';
import { microMats } from './micro.js';
import { clay, glass } from './realistic.js';

// New materials are only ever appended: a stroke stores its material as an index into this list (clips depend on it)
export const MATS = [liquidMetal, ...creams, ...comics, comicCloud, inkHatch, ...drips, softCloud, slimeMat, flowerVine,
  ...pixels, ...shapes, ...neons, ...sprays, ...flats, ...glyphMats, ...plants, ...signals, ...spaceMats, pop, nodes, screentone, brushInk, solids, ...lineMats, ...underMats, ...microMats, clay, glass];
export const matIndex = name => { const i = MATS.findIndex(m => m.name === name); if (i < 0) throw new Error('No material ' + name); return i; };
for (const M of MATS) { M.ops = M.make();
  // Moving strokes are redrawn every frame, so they use crisp layers instead of the costly blurred ones
  M.animOps = M.ops.filter(o => typeof o.k !== 'string').map(o => o.t === 'drop' ? { ...o, hard: true, a: o.a * 0.6 } : o.blur ? { ...o, blur: 0 } : o); M.ks = [...new Set(M.ops.filter(o => typeof o.k === 'number').map(o => o.k).concat(1))]; M.cost = M.ops.reduce((a, o) => a + (o.blur || o.t === 'drop' ? 4 : 1), 0); M.light = tint(M.accent, 0.6);
  // Lit: the look depends on where the light is (layers slid toward it, drop shadows). Only lit strokes need re-lighting
  // while the picture turns; flat, glyph and garden materials just turn with the picture.
  M.lit = M.ops.some(o => o.t === 'drop' || !!o.off); }
export const PALETTE = MATS.map(m => m.accent);
// Tabs with separate brush and colour pickers (Comic, Glitch) store the colour on the stroke (s.tint).
// The colour a stroke shows in, and its op list (tintable materials build one per colour, cached)
export const colorOf = s => s.tint || MATS[s.color].accent;
export function opsOf(s) {
  const M = MATS[s.color];
  if (!s.tint || !M.tintOps) return M.ops;
  const cache = M._tints || (M._tints = new Map());
  if (!cache.has(s.tint)) cache.set(s.tint, M.tintOps(s.tint));
  return cache.get(s.tint);
}
// The stroke's colour as the music hears it: the material's place in MATS, moved on by the picked colour's hue where
// the tab has a colour picker (v25: in v24 a picked colour changed nothing in the music). 12 hue steps, then pale and
// dark greys. Drawings without a picked colour sound exactly as before.
const tintSteps = new Map();
function tintStep(c) {
  let k = tintSteps.get(c);
  if (k === undefined) {
    const [r, g, b] = toRgb(c).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (d < 0.12) k = mx > 0.5 ? 12 : 13;
    else { const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; k = Math.floor(h * 2) % 12; }
    tintSteps.set(c, k);
  }
  return k;
}
export const toneIdx = s => s.tint ? s.color + tintStep(s.tint) : s.color;
