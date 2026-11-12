// Glitch: wireframe brushes (chains of tumbling 3D solids) and code brushes (glyphs that keep being replaced), every
// stroke redrawn each frame with its own effect. The Effect buttons pick the effect for the next strokes you draw:
// Smear, Blocks, Jitter (things jump and change size) or HUD. See render/glitchfx.js. Thin lines and small image
// copies only; each stroke pulses with its own notes. Free without turning and plain square tiles, so the code
// grid stays square to the screen.
// Later genres: IDM, experimental, trap.
export default {
  id: 'glitch', name: 'Glitch',
  mats: ['Tetra', 'Cube', 'Octa', 'Icosa', 'Dodeca', 'Matrix', 'Amber', 'Cyan', 'Alert', 'Ghost'],
  tools: ['glow', 'beads', 'loop', 'ripple', 'erase'],
  modes: ['free', 'tiles'],
  // Tiles: up to 3 across and no turns. Every stroke is redrawn every frame in every copy, so copies are kept few.
  limits: { copies: 0, tiles: 3, turns: 0, rotate: false },
  start: { mode: 'free', copies: 2, spiral: 0, tiles: 3, turns: 0, mirror: false, fscale: 50, frot: false, fmirror: false, fx: 'smear', tool: 'glow', color: 'Cube' },
  options: { fx: true },
  render: { grid: true },
};
