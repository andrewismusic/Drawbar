// Glitch: marks become glyphs on a fixed grid, like a sci-fi panel or a hacker film's screen. Each cell is one image
// copy from a pre-drawn glyph sheet. A steady per-frame effect shifts a few slices of the screen in short bursts.
// Free without turning (the grid stays square to the screen) and square tiles (1 or 2 turns keep cells on the grid).
// Later genres: IDM, experimental, trap.
export default {
  id: 'glitch', name: 'Glitch',
  mats: ['Matrix', 'Amber', 'Cyan', 'Alert', 'Ghost'],
  tools: ['glow', 'beads', 'loop', 'ripple', 'erase'],
  modes: ['free', 'tiles'],
  limits: { copies: 0, tiles: 4, turns: 1, rotate: false },
  start: { mode: 'free', copies: 2, spiral: 0, tiles: 3, turns: 0, mirror: false, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Matrix' },
  render: { glitch: true, grid: true },
};
