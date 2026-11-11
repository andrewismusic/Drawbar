// Graffiti: spray halo, marker outline and drips. The heaviest style, so it never meets the other heavy things:
// no kaleidoscope, no turning (no re-lighting), only big square tiles, and still tools only (no per-frame redraws).
// Later genres: hip-hop, trap, funk, G-funk.
export default {
  id: 'graffiti', name: 'Graffiti',
  mats: ['Spray pink', 'Spray lime', 'Spray orange', 'Spray sky', 'Chrome', 'Drip magenta', 'Drip violet'],
  tools: ['glow', 'beads', 'erase'],
  modes: ['free', 'tiles'],
  limits: { copies: 0, tiles: 3, turns: 1, rotate: false },
  start: { mode: 'free', copies: 2, spiral: 0, tiles: 2, turns: 0, mirror: false, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Spray pink' },
  render: {},
};
