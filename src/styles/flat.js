// Flat colours for the Geometric world's stamped shapes: one plain fill, no outline, no shading.
// Nothing here depends on the light, so these never need re-lighting while the picture turns (cheap in the kaleidoscope).
import { F } from '../render/ops.js';

export const flats = [
  ['Red', '#e63946'], ['Yellow', '#ffc300'], ['Blue', '#2f5fe8'], ['Teal', '#2ec4b6'],
  ['Orange', '#ff7f11'], ['Pink', '#ff8fab'], ['Lilac', '#a78bfa'], ['Cream', '#f1e9da'],
].map(([name, c]) => ({ name, accent: c, glow: c, glowA: 0, make: () => [F(1, c)], flat: true, swatch: c }));
