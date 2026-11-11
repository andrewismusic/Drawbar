// Realistic materials: soft, blurred shading (costly: each S layer is a blurred shadow draw, about 4x a plain fill)
import { tint, shade } from '../core/color.js';
import { F, S, CLIP, END, SOFTDROP } from '../render/ops.js';

// For lines: soft bands that follow the line, so it reads as a rounded tube
export const metal = () => [SOFTDROP(0.5), F(1, '#949ca8'), CLIP, S(1, '#2c3138', 0.12, 0.35), S(0.86, '#727a86', 0.2, 0.5), S(0.62, '#bcc3cb', 0.3, 0.45), S(0.4, '#e2e5e9', 0.38, 0.4, 0.9), S(0.28, '#2a2f36', -0.2, 0.3, 0.45), S(0.2, '#f5f6f8', 0.46, 0.4, 0.75), END];
export const cream = c => () => [SOFTDROP(0.35), F(1, tint(c, 0.12)), CLIP, S(1, shade(c, 0.3), 0.1, 0.35), S(0.9, shade(c, 0.12), 0.18, 0.5), S(0.68, c, 0.27, 0.5), S(0.45, tint(c, 0.18), 0.36, 0.45), S(0.25, tint(c, 0.38), 0.45, 0.4, 0.65), END];
export const slime = () => [SOFTDROP(0.4), F(1, '#2f6b12'), CLIP, S(1, '#4f9a1a', 0.1, 0.4), S(0.85, '#79c832', 0.2, 0.5), S(0.6, '#a8e05a', 0.3, 0.45), F('bub', '#c8f28e', 0, 0.6), F('bubHi', '#ffffff', 0, 0.85), S(0.3, '#e9ffd0', 0.4, 0.35, 0.8), F(0.1, '#ffffff', 0.58, 0.9), END];
export const softPuffs = (dark, a, b, c2, hi) => () => [SOFTDROP(0.3), F(1, dark), CLIP, S(1, a, 0.12, 0.5), S(1, b, 0.32, 0.6), S(1, c2, 0.58, 0.6), S(1, hi, 0.85, 0.5, 0.8), END];

export const liquidMetal = { name: 'Liquid metal', accent: '#c9ced6', glow: '#b9c6da', glowA: 0.12, make: metal,
  swatch: 'radial-gradient(circle at 36% 32%, #f2f4f7 0 6%, #aab1ba 22%, #5c646f 48%, #1f2329 70%, #7d8692 100%)' };
export const creams = [['Strawberry', '#f39bbd'], ['Lemon', '#f7da7a'], ['Mint', '#94ddc6'], ['Blueberry', '#98bff0']].map(([name, c]) => ({
  name, accent: c, glow: c, glowA: 0.06, make: cream(c),
  swatch: `radial-gradient(circle at 36% 32%, ${tint(c, 0.38)} 0 8%, ${tint(c, 0.15)} 24%, ${c} 50%, ${shade(c, 0.3)} 100%)` }));
export const softCloud = { name: 'Cloud', accent: '#e8eef6', glow: '#dfe8f5', glowA: 0.08, make: softPuffs('#8ea3bf', '#b9c8dc', '#dbe4f0', '#f2f6fb', '#ffffff'), puffs: 'cloud',
  swatch: 'radial-gradient(circle at 30% 46%, #f2f6fb 0 18%, #b9c8dc 30%, transparent 32%), radial-gradient(circle at 60% 40%, #fff 0 18%, #dbe4f0 32%, transparent 34%), radial-gradient(circle at 50% 62%, #f2f6fb 0 20%, #8ea3bf 40%, transparent 42%)' };
export const slimeMat = { name: 'Slime', accent: '#79c832', glow: '#a8e05a', glowA: 0.25, make: slime, extra: 'slime',
  swatch: 'radial-gradient(circle at 62% 64%, #c8f28e 0 10%, transparent 12%), radial-gradient(circle at 34% 30%, #fff 0 8%, transparent 10%), radial-gradient(circle at 50% 50%, #a8e05a 0 30%, #79c832 50%, #2f6b12 90%)' };
