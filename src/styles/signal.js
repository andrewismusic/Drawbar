// Wire: the Glitch tab's wireframe brushes. Each draws a chain of tumbling 3D solids along the line, in thin bright
// lines (render/glitchfx.js). live: redrawn every frame, never cached. (These five slots were v22's plain neon marks.)
import { F } from '../render/ops.js';

const ring = c => `radial-gradient(circle, transparent 0 30%, ${c} 34% 46%, transparent 50%), conic-gradient(from 45deg, ${c} 0 2%, transparent 0 25%, ${c} 0 27%, transparent 0 50%, ${c} 0 52%, transparent 0 75%, ${c} 0 77%, transparent 0), #0b0e18`;
export const signals = [
  ['Tetra', '#ff2e97', 'tetra'], ['Cube', '#4d8bff', 'cube'], ['Octa', '#b6ff1a', 'octa'], ['Icosa', '#ff8a2a', 'icosa'], ['Dodeca', '#eef2ff', 'dodeca'],
].map(([name, c, wire]) => ({ name, accent: c, glow: c, glowA: 0, wire, live: true, make: () => [F(1, c)], swatch: ring(c) }));
