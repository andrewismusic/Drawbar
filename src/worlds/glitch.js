// Glitch: neon with a colour split, plus a steady screen effect every frame (a few image slices shifted sideways).
// The effect costs a little per frame whatever is drawn, so this world skips the kaleidoscope and its re-lighting:
// free (turning allowed) and mid-size tiles.
// Later genres: IDM, experimental, trap.
export default {
  id: 'glitch', name: 'Glitch',
  mats: ['Neon blue', 'Neon pink', 'Acid', 'Static', 'Error red'],
  tools: ['glow', 'beads', 'loop', 'ripple', 'erase'],
  modes: ['free', 'tiles'],
  limits: { copies: 0, tiles: 4, turns: 3, rotate: true },
  start: { mode: 'free', copies: 2, spiral: 0, tiles: 3, turns: 0, mirror: false, fscale: 50, frot: false, fmirror: true, tool: 'glow', color: 'Neon blue' },
  render: { glitch: true },
};
