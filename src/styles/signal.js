// Signal: plain, bright, saturated marks with a white-hot core, for the Glitch effects to tear apart. Flat and unlit.
import { F } from '../render/ops.js';

export const signals = [
  ['Hot pink', '#ff2e97'], ['Electric blue', '#2d6bff'], ['Laser lime', '#b6ff1a'], ['Solar orange', '#ff7a1a'], ['White noise', '#eef2ff'],
].map(([name, c]) => ({ name, accent: c, glow: c, glowA: 0.2, make: () => [F(1, c), F(0.3, '#ffffff', 0, 0.85)], swatch: `radial-gradient(circle, #fff 0 18%, ${c} 34%)` }));
