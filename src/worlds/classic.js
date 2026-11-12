// Classic: retired as a tab in v22. Kept only so clips saved before the style tabs (or in Classic) still open:
// its tab shows only while such a clip is open. Every original material, tool and pattern, no limits.
export default {
  id: 'classic', name: 'Classic', legacy: true,
  mats: ['Liquid metal', 'Strawberry', 'Lemon', 'Mint', 'Blueberry', 'Comic red', 'Comic yellow', 'Comic blue', 'Comic cloud', 'Ink hatch',
    'Drip magenta', 'Drip violet', 'Cloud', 'Slime', 'Flower vine'],
  tools: ['glow', 'beads', 'loop', 'ripple', 'erase'],
  modes: ['free', 'kaleido', 'tiles'],
  limits: { copies: 14, tiles: 6, turns: 4, rotate: true },
  start: { mode: 'kaleido', copies: 4, spiral: 0, tiles: 3, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Strawberry' },
  render: {},
};
