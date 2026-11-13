// Code: strokes become cells on a fixed grid, each showing a glyph (katakana, digits, symbols), like a sci-fi panel.
// The glyphs come from a small pre-drawn sheet per colour (render/glyphs.js), so each cell costs one image copy.
// A faint panel tint fills the cells; the newest cells of a moving stroke show in a bright head colour.
import { F } from '../render/ops.js';
import { pic } from './signal.js';

export const code = (c, tint) => () => [F(1, tint, 0, 0.16), { t: 'glyphs', c }];
const sw = (c) => `repeating-linear-gradient(0deg, transparent 0 3px, ${c}55 3px 4px), radial-gradient(circle, ${c} 0 22%, #07120c 24%)`;
export const glyphMats = [
  ['Matrix', '#3dff7a', '#0f6b33'],
  ['Amber', '#ffb000', '#6b4a00'],
  ['Cyan', '#35e6ff', '#0b5866'],
  ['Alert', '#ff4258', '#6b111d'],
  ['Ghost', '#d8e2ff', '#3a4466'],
].map(([name, c, tint]) => ({ name, accent: c, glow: c, glowA: 0.14, make: code(c, tint), glyph: true, live: true, swatch: sw(c), swatchFor: sw }));
glyphMats[0].label = 'Code';
// The Code brush's icon: one of the busier characters
glyphMats[0].swatchFor = pic("<text x='12' y='19' font-size='19' text-anchor='middle' fill='FILL' stroke='none' font-family='ui-monospace, Menlo, Consolas, monospace' font-weight='700'>ﾈ</text>");
