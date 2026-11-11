// Pixel art: flat colour in three hard bands and a hard drop shadow, no blur at all.
// The Pixel world also draws the whole canvas at low resolution and scales it up crisp (render.pixel), which is what makes it so light.
import { F, CLIP, END, HDROP } from '../render/ops.js';

export const pixelOps = (dark, mid, light) => () => [HDROP(0.5), F(1, dark), CLIP, F(1, mid, 0.3), F(0.45, light, 0.45), END];
const sw = (dark, mid, light) => `linear-gradient(135deg, ${light} 0 30%, ${mid} 30% 70%, ${dark} 70%)`;
export const pixels = [
  ['Pixel red', '#9e2835', '#e43b44', '#ff8a8a'],
  ['Pixel orange', '#a3471b', '#f77622', '#ffb366'],
  ['Pixel yellow', '#b8760f', '#feae34', '#fee761'],
  ['Pixel green', '#2c7a2c', '#63c74d', '#b6f08a'],
  ['Pixel blue', '#124e89', '#0099db', '#7fd8ff'],
  ['Pixel pink', '#68386c', '#b55088', '#f6a2c8'],
].map(([name, dark, mid, light]) => ({ name, accent: mid, glow: mid, glowA: 0, make: pixelOps(dark, mid, light), swatch: sw(dark, mid, light) }));
