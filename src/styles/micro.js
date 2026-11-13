// Micro: pond life as seen through a microscope on a bright field (render/micro.js). Flat see-through pieces, soft
// greys and lilacs for cell bodies, golden browns and greens for what they hold. No outlines beyond each cell's own rim,
// nothing slid toward the light: nothing to re-light. Layers are [piece, colour, alpha] or [piece, colour, alpha, line width].
import { F, STROKE } from '../render/ops.js';

const icon = body => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'>${body}</svg>`)}") center / 82% no-repeat, #e6e3ec`;
const mat = (name, kind, accent, layers, swatch) => ({
  name, accent, glow: accent, glowA: 0, micro: kind, reach: 0.12, keys: layers.map(l => l[0]),
  make: () => layers.map(([k, c, a, lw]) => lw ? STROKE(k, lw, c) : F(k, c, 0, a)), swatch: icon(swatch),
});
const HALO = ['halo', '#ffffff', 0.55];
export const microMats = [
  mat('Amoeba', 'amoeba', '#6f6690', [HALO, ['rim', '#6a6189', 0.85], ['body', '#d8d1e6', 0.9], ['grain', '#5a5273', 0.5], ['food', '#b07f25', 0.9], ['foodHi', '#e3bb4b', 0.9], ['vac', '#8b84ad', 0.9], ['vacHi', '#f6f3fc', 1], ['nuc', '#8c7bb6', 0.85], ['nucHi', '#5d4f8a', 0.9]],
    "<path d='M6 5c4-3 9-1 9 3 4 0 6 4 4 7s-5 2-7 5c-3 3-9 1-9-4 0-3 2-3 1-6s0-4 2-5z' fill='#d8d1e6' stroke='#6a6189' stroke-width='1.4'/><circle cx='10' cy='13' r='2.6' fill='#8c7bb6'/><circle cx='15' cy='16' r='1.3' fill='#b07f25'/>"),
  mat('Ciliate', 'ciliate', '#5d6b57', [HALO, ['hair', '#6f7d68', 1, 0.05], ['rim', '#56644f', 0.85], ['body', '#e2e9d6', 0.9], ['groove', '#aab79a', 0.8], ['nuc', '#93a082', 0.9], ['vac', '#7f8c78', 0.9], ['vacHi', '#f7fbf0', 1], ['food', '#b9a528', 0.9], ['foodHi', '#7fae3a', 0.9]],
    "<ellipse cx='12' cy='12' rx='9' ry='5' fill='#e2e9d6' stroke='#56644f' stroke-width='1.3' transform='rotate(-25 12 12)'/><path d='M3 8l-1.5-2M7 4.500l-.5-2.200M12 3.500l.5-2.200M17 5l1.500-1.800M21 16l1.500 2M17 19.500l.5 2.200M12 20.500l-.5 2.200M7 19l-1.500 1.800' stroke='#6f7d68' stroke-width='1' fill='none'/><ellipse cx='11' cy='12.500' rx='3' ry='1.600' fill='#93a082' transform='rotate(-25 12 12)'/>"),
  mat('Algae', 'algae', '#2f6b1f', [['halo', '#ffffff', 0.45], ['hull', '#cfe6c4', 0.5], ['rim', '#2d6a1e', 0.9], ['body', '#5db532', 0.95], ['core', '#3f8f24', 0.9], ['hi', '#c2ee7c', 0.9]],
    "<circle cx='8' cy='9' r='5' fill='#5db532' stroke='#2d6a1e' stroke-width='1.2'/><circle cx='16.500' cy='15' r='5.500' fill='#5db532' stroke='#2d6a1e' stroke-width='1.2'/><circle cx='8.600' cy='9.500' r='2.300' fill='#3f8f24'/><circle cx='17' cy='15.600' r='2.600' fill='#3f8f24'/>"),
  mat('Diatom', 'diatom', '#3d5a66', [['halo', '#ffffff', 0.5], ['rim', '#3d5a66', 0.85], ['body', '#eef4f1', 0.72], ['chl', '#c09a22', 0.85], ['chlHi', '#ecd472', 0.9], ['rib', '#5d7f8c', 1, 0.035]],
    "<path d='M2 12Q12 2 22 12Q12 22 2 12z' fill='#eef4f1' stroke='#3d5a66' stroke-width='1.3'/><path d='M5 12h14M8 9v6M12 7.500v9M16 9v6' stroke='#5d7f8c' stroke-width='0.900' fill='none'/><ellipse cx='9' cy='12' rx='1.800' ry='1.200' fill='#c09a22'/><ellipse cx='15' cy='12' rx='1.800' ry='1.200' fill='#c09a22'/>"),
  mat('Bell animals', 'bell', '#5b6688', [['stalk', '#8a86a8', 0.9], HALO, ['hair', '#7b84a6', 1, 0.045], ['rim', '#566086', 0.85], ['body', '#dde4ef', 0.9], ['lip', '#f4f7fc', 0.9], ['nuc', '#9a8fc0', 0.85], ['vac', '#8088aa', 0.9], ['vacHi', '#f7f9ff', 1], ['food', '#bd9c2a', 0.9]],
    "<path d='M12 23c-2-3 2-5 0-9' stroke='#8a86a8' stroke-width='1.300' fill='none'/><path d='M12 14c-1-4-6-5-7-9h14c-1 4-6 5-7 9z' fill='#dde4ef' stroke='#566086' stroke-width='1.300'/><path d='M5 4l-1-2M9 4V1.500M15 4V1.500M19 4l1-2' stroke='#7b84a6' stroke-width='1' fill='none'/>"),
  mat('Filament', 'filament', '#1f6a66', [['rim', '#1f6a66', 0.9], ['body', '#3fb7a6', 0.95], ['het', '#d9d58a', 0.95], ['hi', '#b6f0e2', 0.8]],
    "<g fill='#3fb7a6' stroke='#1f6a66' stroke-width='1.1'><circle cx='4' cy='17' r='2.700'/><circle cx='8.500' cy='13.500' r='2.700'/><circle cx='15.500' cy='10.500' r='2.700'/><circle cx='20' cy='7' r='2.700'/></g><circle cx='12' cy='12' r='3.300' fill='#d9d58a' stroke='#1f6a66' stroke-width='1.100'/>"),
  mat('Debris', 'debris', '#8a6a1f', [['a', '#b9892b', 0.7], ['b', '#8a7a2a', 0.65], ['c', '#d8b548', 0.7], ['dark', '#3a3320', 0.75]],
    "<circle cx='8' cy='9' r='4' fill='#b9892b'/><circle cx='14' cy='13' r='5' fill='#d8b548'/><circle cx='9' cy='16' r='3.500' fill='#8a7a2a'/><circle cx='17' cy='7.500' r='2.500' fill='#8a7a2a'/><circle cx='13' cy='12' r='1.200' fill='#3a3320'/>"),
];
