// Classic: v18 exactly as it was. Every original material, tool and pattern, no limits. Old clips open here.
export default {
  id: 'classic', name: 'Classic',
  mats: ['Liquid metal', 'Strawberry', 'Lemon', 'Mint', 'Blueberry', 'Comic red', 'Comic yellow', 'Comic blue', 'Comic cloud', 'Ink hatch',
    'Drip magenta', 'Drip violet', 'Cloud', 'Slime', 'Flower vine'],
  tools: ['glow', 'beads', 'loop', 'ripple', 'erase'],
  modes: ['free', 'kaleido', 'tiles'],
  limits: { copies: 14, tiles: 6, turns: 4, rotate: true },
  start: { mode: 'kaleido', copies: 4, spiral: 0, tiles: 3, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Strawberry' },
  render: {},
};
