// Glitch: bright signal marks (and code glyphs) torn apart by one of three effects, chosen with the Effect buttons:
// Smear (rows drag sideways with colour fringes), Blocks (datamosh) or HUD (nodes, wires, rings and read-outs).
// See render/glitchfx.js. The effects cost about the same every frame however much is drawn, and pulse a little with
// the notes. Free without turning and square tiles (1 or 2 turns), so the code grid stays square to the screen.
// Later genres: IDM, experimental, trap.
export default {
  id: 'glitch', name: 'Glitch',
  mats: ['Hot pink', 'Electric blue', 'Laser lime', 'Solar orange', 'White noise', 'Matrix', 'Amber', 'Cyan', 'Alert', 'Ghost'],
  tools: ['glow', 'beads', 'loop', 'ripple', 'erase'],
  modes: ['free', 'tiles'],
  limits: { copies: 0, tiles: 4, turns: 1, rotate: false },
  start: { mode: 'free', copies: 2, spiral: 0, tiles: 3, turns: 0, mirror: false, fscale: 50, frot: false, fmirror: false, fx: 'smear', tool: 'glow', color: 'Hot pink' },
  options: { fx: true },
  render: { grid: true },
};
