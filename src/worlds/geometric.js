// Geometric: marks built from polygons, flat facets. Light, so it gets every tile pattern (hexagons included)
// and a high-copy kaleidoscope. Loops, but no ripple drones: this world is about crisp, rhythmic shapes.
// Later genres: IDM, acid, electro, EDM.
export default {
  id: 'geometric', name: 'Geometric',
  mats: ['Triangles', 'Squares', 'Hexagons', 'Diamonds', 'Shards'],
  tools: ['glow', 'beads', 'loop', 'erase'],
  modes: ['tiles', 'kaleido'],
  limits: { copies: 10, tiles: 6, turns: 4, rotate: false },
  start: { mode: 'tiles', copies: 7, spiral: 0, tiles: 3, turns: 4, mirror: false, fscale: 50, frot: false, fmirror: false, tool: 'beads', color: 'Hexagons' },
  render: {},
};
