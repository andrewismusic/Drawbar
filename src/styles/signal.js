// Wire: the Glitch tab's wireframe brushes. Each draws a chain of tumbling 3D solids along the line, in thin bright
// lines (render/glitchfx.js). live: redrawn every frame, never cached. (These five slots were v22's plain neon marks.)
import { F } from '../render/ops.js';

// Brush swatches: the solid's outline (3, 4, 4-diamond, 6, 5 sides), in the colour picked
const poly = (n, turn) => c => `conic-gradient(from ${turn}deg, ${Array.from({ length: n }, (_, k) => `${c} ${k * 360 / n}deg ${k * 360 / n + 9}deg, transparent ${k * 360 / n + 9}deg ${(k + 1) * 360 / n}deg`).join(', ')}), radial-gradient(circle, transparent 0 34%, ${c} 36% 44%, transparent 46%), #0b0e18`;
const SW = [poly(3, 0), poly(4, 45), poly(4, 0), poly(6, 0), poly(5, 0)];
export const signals = [
  ['Tetra', '#ff2e97', 'tetra'], ['Cube', '#4d8bff', 'cube'], ['Octa', '#b6ff1a', 'octa'], ['Icosa', '#ff8a2a', 'icosa'], ['Dodeca', '#eef2ff', 'dodeca'],
].map(([name, c, wire], i) => ({ name, accent: c, glow: c, glowA: 0, wire, live: true, make: () => [F(1, c)], swatch: SW[i](c), swatchFor: SW[i] }));
const SOLID = c => pic("<path d='M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5zM12 12v9.5M12 12L3.8 7.25M12 12l8.2-4.75' stroke-width='1.7'/>")(c);   // a cube
const NODEPIC = c => pic("<path d='M4 20L15.5 8.5'/><rect x='13.5' y='3.5' width='7' height='7' fill='FILL' stroke='none'/>")(c);
// Solids (v25): one brush for all five; each solid along the line is picked by how fast the hand was moving there
export const solids = { name: 'Solids', label: 'Solids', accent: '#4d8bff', glow: '#4d8bff', glowA: 0, wire: 'auto', live: true, make: () => [F(1, '#4d8bff')], swatch: '#4d8bff', swatchFor: c => SOLID(c) };
// Line brushes (v25): a small drawing of each as its swatch, in the colour picked
export const pic = body => c => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${c}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${body.replace(/FILL/g, c)}</svg>`)}") center / 78% no-repeat, #0b0e18`;
const LINES = [
  ['Scope', 'scope', 'Scope', "<path d='M2 12c2-9 4-9 6 0s4 9 6 0 4-9 6 0 2 4 2 4'/>"],
  ['Bars', 'bars', 'Bars', "<path d='M4 9v6M8 5v14M12 8v8M16 3v18M20 10v4' stroke-width='2.6'/>"],
  ['Scanlines', 'scan', 'Scan', "<path d='M6 5h12M3 9.5h18M5 14h17M3 18.5h14'/>"],
  ['Point cloud', 'cloud', 'Points', "<g fill='FILL' stroke='none'><circle cx='5' cy='14' r='2'/><circle cx='11' cy='7' r='1.4'/><circle cx='13' cy='15' r='2.4'/><circle cx='19' cy='10' r='1.7'/><circle cx='8' cy='20' r='1.1'/><circle cx='19' cy='19' r='1.2'/><circle cx='4' cy='5' r='1'/></g>"],
  ['Terrain', 'terrain', 'Terrain', "<path d='M2 8c3-4 5 3 8 0s5-4 8 0 3 1 4 0M2 13c3-4 5 3 8 0s5-4 8 0 3 1 4 0M2 18c3-4 5 3 8 0s5-4 8 0 3 1 4 0M5 6.4v10M10 8v10M15 5.6v10M20 8v10' stroke-width='1.3'/>"],
];
export const lineMats = LINES.map(([name, gl, label, body]) => ({ name, label, accent: '#35e6ff', glow: '#35e6ff', glowA: 0, gl, live: true, make: () => [F(1, '#35e6ff')], swatch: pic(body)('#35e6ff'), swatchFor: pic(body) }));
// Sort and Mosh (v25): they work on whatever is painted beneath them (render/glitchfx.js, drawUnder)
export const underMats = [
  ['Pixel sort', 'sort', 'Sort', "<path d='M5 3v18M9.5 8v13M14 3v9M18.5 6v15' stroke-width='2.8' stroke-linecap='butt'/>"],
  ['Datamosh', 'mosh', 'Mosh', "<g fill='FILL' stroke='none'><rect x='3' y='4' width='8' height='7'/><rect x='14' y='6' width='8' height='7' opacity='.6'/><rect x='6' y='14' width='8' height='7' opacity='.8'/><rect x='16' y='15' width='5' height='5' opacity='.4'/></g>"],
  ['Glitch blocks', 'blocks', 'Blocks', "<g fill='FILL' stroke='none'><rect x='2' y='4' width='13' height='4'/><rect x='9' y='10' width='13' height='4'/><rect x='4' y='16' width='13' height='4'/></g>"],
].map(([name, under, label, body]) => ({ name, label, accent: '#eef2ff', glow: '#eef2ff', glowA: 0, under, live: true, make: () => [F(1, '#eef2ff')], swatch: pic(body)('#eef2ff'), swatchFor: pic(body) }));
// Nodes: points far apart joined by straight lines (a crude copy of the line you draw), a ring at the start
export const nodes = { name: 'Nodes', accent: '#35e6ff', glow: '#35e6ff', glowA: 0, nodes: true, live: true, make: () => [F(1, '#35e6ff')],
  swatch: '#35e6ff', swatchFor: c => NODEPIC(c) };
