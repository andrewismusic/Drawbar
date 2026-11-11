// Geometric: every mark is built from polygons (triangles, squares, hexagons) instead of round capsules.
// Flat facets: a dark base, the body slid toward the light, and a smaller lit facet. Cheap: plain fills only.
// geo: sides, size (polygon radius as a multiple of the line's half-width), gap (spacing as a multiple of that radius),
//      spin (extra turn), alt (flip every other one: triangles make a sawtooth), bead (bead size), turn (bead-to-bead turn)
import { F, CLIP, END, INKL } from '../render/ops.js';

export const facets = (dark, mid, light) => () => [INKL(-0.06), F(1, dark), CLIP, F(1, mid, 0.28), F(0.5, light, 0.42), END];
const sw = (dark, mid, light) => `conic-gradient(from 30deg, ${light} 0 33%, ${mid} 0 66%, ${dark} 0)`;
export const shapes = [
  ['Triangles', '#0f5f5a', '#2ec4b6', '#a6f4ea', { sides: 3, size: 1.35, gap: 0.95, spin: 0, alt: true, bead: 1.3, turn: 0.5 }],
  ['Squares', '#94600c', '#f2b134', '#ffe39a', { sides: 4, size: 1.25, gap: 1.05, spin: 0, alt: false, bead: 1.15, turn: 0.3 }],
  ['Hexagons', '#1c3f8c', '#3f7cf0', '#a9c6ff', { sides: 6, size: 1.2, gap: 1.3, spin: 0, alt: false, bead: 1.1, turn: 0 }],
  ['Diamonds', '#99291d', '#ff6b5a', '#ffc2b8', { sides: 4, size: 1.35, gap: 1.25, spin: Math.PI / 4, alt: false, bead: 1.25, turn: 0 }],
  ['Shards', '#3d2287', '#8c5cf0', '#d2bdff', { sides: 3, size: 1.5, gap: 0.7, spin: 0.4, alt: false, bead: 1.4, turn: 2.1 }],
].map(([name, dark, mid, light, geo]) => ({ name, accent: mid, glow: mid, glowA: 0, make: facets(dark, mid, light), geo, ink: 0.14, swatch: sw(dark, mid, light) }));
