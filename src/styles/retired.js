// Retired materials from v19 (the first Pixel, Geometric and Glitch tabs). No tab offers them any more; they stay in MATS,
// at the same positions, only so drawings and clips made with them still open and draw.
import { F, CLIP, END, HDROP, INKL, PAT } from '../render/ops.js';
// Pixel art: three hard bands and a hard drop shadow
export const pixelOps = (dark, mid, light) => () => [HDROP(0.5), F(1, dark), CLIP, F(1, mid, 0.3), F(0.45, light, 0.45), END];
const swPix = (dark, mid, light) => `linear-gradient(135deg, ${light} 0 30%, ${mid} 30% 70%, ${dark} 70%)`;
export const pixels = [
  ['Pixel red', '#9e2835', '#e43b44', '#ff8a8a'],
  ['Pixel orange', '#a3471b', '#f77622', '#ffb366'],
  ['Pixel yellow', '#b8760f', '#feae34', '#fee761'],
  ['Pixel green', '#2c7a2c', '#63c74d', '#b6f08a'],
  ['Pixel blue', '#124e89', '#0099db', '#7fd8ff'],
  ['Pixel pink', '#68386c', '#b55088', '#f6a2c8'],
].map(([name, dark, mid, light]) => ({ name, accent: mid, glow: mid, glowA: 0, make: pixelOps(dark, mid, light), swatch: swPix(dark, mid, light) }));
// Faceted polygons along the line (render/shapes.js geoChain)
export const facets = (dark, mid, light) => () => [INKL(-0.06), F(1, dark), CLIP, F(1, mid, 0.28), F(0.5, light, 0.42), END];
const swFacet = (dark, mid, light) => `conic-gradient(from 30deg, ${light} 0 33%, ${mid} 0 66%, ${dark} 0)`;
export const shapes = [
  ['Triangles', '#0f5f5a', '#2ec4b6', '#a6f4ea', { sides: 3, size: 1.35, gap: 0.95, spin: 0, alt: true, bead: 1.3, turn: 0.5 }],
  ['Squares', '#94600c', '#f2b134', '#ffe39a', { sides: 4, size: 1.25, gap: 1.05, spin: 0, alt: false, bead: 1.15, turn: 0.3 }],
  ['Hexagons', '#1c3f8c', '#3f7cf0', '#a9c6ff', { sides: 6, size: 1.2, gap: 1.3, spin: 0, alt: false, bead: 1.1, turn: 0 }],
  ['Diamonds', '#99291d', '#ff6b5a', '#ffc2b8', { sides: 4, size: 1.35, gap: 1.25, spin: Math.PI / 4, alt: false, bead: 1.25, turn: 0 }],
  ['Shards', '#3d2287', '#8c5cf0', '#d2bdff', { sides: 3, size: 1.5, gap: 0.7, spin: 0.4, alt: false, bead: 1.4, turn: 2.1 }],
].map(([name, dark, mid, light, geo]) => ({ name, accent: mid, glow: mid, glowA: 0, make: facets(dark, mid, light), geo, ink: 0.14, swatch: swFacet(dark, mid, light) }));
// Neon with a colour split and scan lines
export const neon = core => () => [F(1, '#00e5ff', -0.5, 0.7), F(1, '#ff2bd6', 0.5, 0.7), F(1, core), CLIP, PAT('scan', 'rgba(0,0,0,0.45)'), END, F(0.3, '#ffffff', 0, 0.9)];
const swNeon = core => `repeating-linear-gradient(0deg, rgba(0,0,0,.4) 0 2px, transparent 2px 4px), linear-gradient(90deg, #00e5ff 0 18%, ${core} 18% 82%, #ff2bd6 82%)`;
export const neons = [
  ['Neon blue', '#2d6bff'],
  ['Neon pink', '#ff2e97'],
  ['Acid', '#b6ff1a'],
  ['Static', '#e8e8f0'],
  ['Error red', '#ff3b30'],
].map(([name, core]) => ({ name, accent: core, glow: core, glowA: 0.18, make: neon(core), swatch: swNeon(core) }));
