// Glitch: wireframe brushes (chains of tumbling 3D solids), Nodes (points and lines) and Code (glyphs that keep being
// replaced), in any colour from the colour picker, every stroke redrawn each frame with its own effect. The Effect
// buttons pick the effect for the next strokes you draw: Smear, Blocks or Jitter (things jump and change size). See render/glitchfx.js. Thin lines and small image
// copies only; each stroke pulses with its own notes. Free without turning and plain square tiles, so the code
// grid stays square to the screen.
// Later genres: IDM, experimental, trap.
export default {
  id: 'glitch', name: 'Glitch',
  mats: ['Solids', 'Nodes', 'Matrix', 'Scope', 'Scanlines', 'Point cloud', 'Terrain', 'Pixel sort', 'Datamosh', 'Glitch blocks'],   // Matrix is the Code brush
  colors: ['#ff2e97', '#4d8bff', '#b6ff1a', '#ff8a2a', '#eef2ff', '#3dff7a', '#ffb000', '#35e6ff', '#ff4258'],
  tools: ['glow', 'loop', 'trace', 'ripple', 'erase'],
  modes: ['free', 'tiles'],
  // Tiles: up to 3 across and no turns. Every stroke is redrawn every frame in every copy, so copies are kept few.
  limits: { copies: 0, tiles: 3, turns: 0, rotate: false },
  start: { mode: 'free', copies: 2, spiral: 0, tiles: 3, turns: 0, mirror: false, fscale: 50, frot: false, fmirror: false, fx: 'smear', tool: 'glow', color: 'Solids' },
  options: { fx: true },
  render: { grid: true },
};
