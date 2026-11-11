// Graffiti: a soft overspray halo (a wide blurred layer: the costliest op), a wobbly marker outline, drips and a hard highlight.
// inkW gives a fatter marker outline than the comic one.
// The heaviest style: the Graffiti world keeps it to free mode without rotation and big tiles, with still tools only.
import { tint, shade } from '../core/color.js';
import { F, S, CLIP, END, INKL } from '../render/ops.js';

export const spray = (c, spr, light) => () => [S(1.9, spr, 0, 0.8, 0.5), INKL(-0.1), F(1, shade(c, 0.35)), CLIP, F(1, c, 0.25), F(0.5, light, 0.4), F(0.16, '#ffffff', 0.55, 0.9), END];
const sw = (c, spr) => `radial-gradient(circle at 40% 38%, #fff 0 8%, transparent 9%), radial-gradient(circle, ${c} 0 40%, #0c0c12 42% 52%, ${spr}88 54% 66%, transparent 70%)`;
export const sprays = [
  ['Spray pink', '#ff4fa3', '#ff4fa3'],
  ['Spray lime', '#9be22d', '#e8ff5a'],
  ['Spray orange', '#ff8a1f', '#ffd23f'],
  ['Spray sky', '#36b5ff', '#7a5cff'],
  ['Chrome', '#c9ced6', '#5aa0ff'],
].map(([name, c, spr]) => ({ name, accent: c, glow: c, glowA: 0, make: spray(c, spr, tint(c, 0.45)), comic: true, inkW: 1.9, drip: true, spray: true, swatch: sw(c, spr) }));
