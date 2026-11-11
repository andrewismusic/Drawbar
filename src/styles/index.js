// All materials, in swatch order. One light for the whole picture (up and to the left on screen); every copy is shaded
// for where it sits, so a turned or mirrored copy is lit from the same side as the original.
// Keyed layers (string k) are extra pieces made for a material: bubbles, leaves, flowers (see extraPieces in render/shapes.js).
import { tint } from '../core/color.js';
import { liquidMetal, creams, softCloud, slimeMat } from './realistic.js';
import { comics, comicCloud, inkHatch, drips, flowerVine } from './comic.js';
import { pixels } from './pixel.js';
import { shapes } from './geometric.js';
import { neons } from './glitch.js';
import { sprays } from './graffiti.js';

// New materials are only ever appended: a stroke stores its material as an index into this list (clips depend on it)
export const MATS = [liquidMetal, ...creams, ...comics, comicCloud, inkHatch, ...drips, softCloud, slimeMat, flowerVine,
  ...pixels, ...shapes, ...neons, ...sprays];
export const matIndex = name => { const i = MATS.findIndex(m => m.name === name); if (i < 0) throw new Error('No material ' + name); return i; };
for (const M of MATS) { M.ops = M.make();
  // Moving strokes are redrawn every frame, so they use crisp layers instead of the costly blurred ones
  M.animOps = M.ops.filter(o => typeof o.k !== 'string').map(o => o.t === 'drop' ? { ...o, hard: true, a: o.a * 0.6 } : o.blur ? { ...o, blur: 0 } : o); M.ks = [...new Set(M.ops.filter(o => typeof o.k === 'number').map(o => o.k).concat(1))]; M.cost = M.ops.reduce((a, o) => a + (o.blur || o.t === 'drop' ? 4 : 1), 0); M.light = tint(M.accent, 0.6); }
export const PALETTE = MATS.map(m => m.accent);
