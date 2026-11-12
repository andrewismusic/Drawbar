// Wire: the Glitch tab's wireframe brushes. Each draws a chain of tumbling 3D solids along the line, in thin bright
// lines (render/glitchfx.js). live: redrawn every frame, never cached. (These five slots were v22's plain neon marks.)
import { F } from '../render/ops.js';

// Brush swatches: the solid's outline (3, 4, 4-diamond, 6, 5 sides), in the colour picked
const poly = (n, turn) => c => `conic-gradient(from ${turn}deg, ${Array.from({ length: n }, (_, k) => `${c} ${k * 360 / n}deg ${k * 360 / n + 9}deg, transparent ${k * 360 / n + 9}deg ${(k + 1) * 360 / n}deg`).join(', ')}), radial-gradient(circle, transparent 0 34%, ${c} 36% 44%, transparent 46%), #0b0e18`;
const SW = [poly(3, 0), poly(4, 45), poly(4, 0), poly(6, 0), poly(5, 0)];
export const signals = [
  ['Tetra', '#ff2e97', 'tetra'], ['Cube', '#4d8bff', 'cube'], ['Octa', '#b6ff1a', 'octa'], ['Icosa', '#ff8a2a', 'icosa'], ['Dodeca', '#eef2ff', 'dodeca'],
].map(([name, c, wire], i) => ({ name, accent: c, glow: c, glowA: 0, wire, live: true, make: () => [F(1, c)], swatch: SW[i](c), swatchFor: SW[i] }));
// Nodes: points joined by thin lines, a ring at the start (the look of v22's HUD effect, now a brush)
export const nodes = { name: 'Nodes', accent: '#35e6ff', glow: '#35e6ff', glowA: 0, nodes: true, live: true, make: () => [F(1, '#35e6ff')],
  swatch: '#35e6ff', swatchFor: c => `radial-gradient(circle at 28% 66%, #fff 0 9%, transparent 11%), radial-gradient(circle at 54% 34%, #fff 0 9%, transparent 11%), radial-gradient(circle at 76% 60%, #fff 0 9%, transparent 11%), linear-gradient(140deg, transparent 47%, ${c} 48% 52%, transparent 53%), #0b0e18` };
