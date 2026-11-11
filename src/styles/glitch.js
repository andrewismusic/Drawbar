// Glitch: neon cores with a cyan and magenta colour split either side, and scan lines. Flat fills only.
// The Glitch world adds a steady per-frame screen effect (render.glitch in render/compose.js): a few image slices shifted sideways.
import { F, CLIP, END, PAT } from '../render/ops.js';

export const neon = core => () => [F(1, '#00e5ff', -0.5, 0.7), F(1, '#ff2bd6', 0.5, 0.7), F(1, core), CLIP, PAT('scan', 'rgba(0,0,0,0.45)'), END, F(0.3, '#ffffff', 0, 0.9)];
const sw = core => `repeating-linear-gradient(0deg, rgba(0,0,0,.4) 0 2px, transparent 2px 4px), linear-gradient(90deg, #00e5ff 0 18%, ${core} 18% 82%, #ff2bd6 82%)`;
export const neons = [
  ['Neon blue', '#2d6bff'],
  ['Neon pink', '#ff2e97'],
  ['Acid', '#b6ff1a'],
  ['Static', '#e8e8f0'],
  ['Error red', '#ff3b30'],
].map(([name, core]) => ({ name, accent: core, glow: core, glowA: 0.18, make: neon(core), swatch: sw(core) }));
