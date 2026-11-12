// Comic materials: flat colour, ink outlines, halftone and hatching (cheap: no blurred layers except the drips' highlights)
import { tint, shade } from '../core/color.js';
import { F, S, CLIP, END, INKL, HALF, PAT } from '../render/ops.js';

export const comic = (c, sh, dk, rim) => () => [INKL(-0.1), F(1, rim), CLIP, F(1, dk, 0.12), HALF(shade(dk, 0.45), 0.55, 0.12), F(1, sh, 0.34), F(1, c, 0.6), F(0.26, '#ffffff', 0.64), END];
export const cloud = () => [INKL(-0.1), F(1, '#a6d6f3'), CLIP, HALF('#6f9fc0', 0.6), F(1, '#ffffff', 0.36), END];
export const hatch = paper => () => [INKL(-0.1), F(1, paper), CLIP, PAT('cross', '#0c0c12'), F(1, paper, 0.42), PAT('hatch', '#0c0c12', 0.42), F(1, paper, 0.85), END];
export const drip = (c, sh) => () => [F(1, sh), CLIP, F(1, c, 0.22), S(0.5, tint(c, 0.35), 0.4, 0.45), S(0.24, '#ffffff', 0.5, 0.45, 0.75), END];
// Flower vine: stem, leaves and petals in flat colour, no outlines (lost its comic ink in v20; now in the Garden tab).
// Nothing is slid toward the light, so it never needs re-lighting.
export const vine = () => [F(1, '#127a6b'), F(0.6, '#1fd1b2'), F(0.22, '#b6fff0'),
  F('leaf', '#19b89a'), F('leafHi', '#7dffe0'),
  F('petA', '#ff3fb4'), F('petAHi', '#ffb3e3'), F('petB', '#ffe14d'), F('petBHi', '#fff6b8'),
  F('ctr', '#7a5cff'), F('ctrHi', '#c9b8ff')];

export const comics = [['Comic red', '#ee3b3f', '#c4202f', '#7e0f22', '#f2717a'], ['Comic yellow', '#ffcb2b', '#f39a1c', '#b45a0c', '#ffe08a'], ['Comic blue', '#3ea4ea', '#2470c4', '#123c7c', '#7cc4f2']].map(([name, c, sh, dk, rim]) => ({
  name, accent: c, glow: c, glowA: 0, make: comic(c, sh, dk, rim), comic: true,
  swatch: `radial-gradient(circle at 34% 30%, #fff 0 11%, transparent 12%), radial-gradient(circle at 40% 36%, ${c} 0 36%, ${sh} 37% 50%, ${dk} 51% 62%, #0c0c12 64%)` }));
export const comicCloud = { name: 'Comic cloud', accent: '#ffffff', glow: '#fff', glowA: 0, make: cloud, comic: true, puffs: 'comic',
  swatch: 'radial-gradient(circle at 30% 40%, #fff 0 22%, transparent 23%), radial-gradient(circle at 62% 38%, #fff 0 24%, transparent 25%), radial-gradient(circle at 48% 62%, #fff 0 26%, #a6d6f3 27% 34%, #0c0c12 36%)' };
export const inkHatch = { name: 'Ink hatch', accent: '#f4efe2', glow: '#fff', glowA: 0, make: hatch('#f4efe2'), comic: true,
  swatch: 'repeating-linear-gradient(45deg, #0c0c12 0 1.5px, transparent 1.5px 5px), radial-gradient(circle at 36% 32%, #f4efe2 0 40%, #cfc9b8 41% 62%, #0c0c12 64%)' };
export const drips = [['Drip magenta', '#d83c9e', '#8c1c68'], ['Drip violet', '#7d5ce0', '#43309a']].map(([name, c, sh]) => ({
  name, accent: c, glow: c, glowA: 0, make: drip(c, sh), drip: true,
  swatch: `radial-gradient(circle at 36% 30%, #fff 0 9%, transparent 10%), radial-gradient(ellipse 30% 60% at 62% 82%, ${c} 0 60%, transparent 62%), radial-gradient(circle at 46% 40%, ${c} 0 42%, ${sh} 43% 55%, #0c0c12 57%)` }));
export const flowerVine = { name: 'Flower vine', accent: '#ff3fb4', glow: '#1fd1b2', glowA: 0.22, make: vine, extra: 'vine', reach: 0.03,
  swatch: 'radial-gradient(circle at 50% 50%, #f2b01e 0 12%, transparent 13%), radial-gradient(circle at 50% 28%, #f27aa8 0 16%, transparent 17%), radial-gradient(circle at 71% 46%, #f27aa8 0 16%, transparent 17%), radial-gradient(circle at 63% 72%, #f27aa8 0 16%, transparent 17%), radial-gradient(circle at 37% 72%, #f27aa8 0 16%, transparent 17%), radial-gradient(circle at 29% 46%, #f27aa8 0 16%, transparent 17%), radial-gradient(circle, #3a8028 0 60%, #2e5a1e 70%)' };
