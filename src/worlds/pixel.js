// Pixel: the whole canvas is drawn at low resolution and scaled up crisp, so each frame costs a fraction of the others.
// That headroom goes on the costliest patterns: small tiles, more kaleidoscope copies than anywhere else, and moving loops.
// Measured: 16 copies with loops and ripples runs faster than v18's default; 55 copies with them is twice as slow, so 16 is the cap.
// Later genres: lofi, house, electro, EDM.
export default {
  id: 'pixel', name: 'Pixel',
  mats: ['Pixel red', 'Pixel orange', 'Pixel yellow', 'Pixel green', 'Pixel blue', 'Pixel pink'],
  tools: ['glow', 'beads', 'loop', 'ripple', 'erase'],
  modes: ['kaleido', 'tiles', 'free'],
  limits: { copies: 9, tiles: 6, turns: 4, rotate: true },
  start: { mode: 'kaleido', copies: 8, spiral: 0, tiles: 4, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Pixel red' },
  render: { pixel: 4 },
};
