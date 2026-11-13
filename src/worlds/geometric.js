// Geometric: stamp and size common shapes (tap, or press and drag to size and turn). One flat fill per shape per copy,
// no outline, no shading, nothing lit: the lightest style, so it gets the most kaleidoscope copies and every tile pattern.
// (The Pixel option was removed in v27.)
// Later genres: IDM, acid, electro, EDM; with Pixel: lofi, house, chiptune.
export default {
  id: 'geometric', name: 'Geometric',
  mats: ['Red', 'Yellow', 'Blue', 'Teal', 'Orange', 'Pink', 'Lilac', 'Cream'],
  tools: ['circle', 'square', 'triangle', 'hexagon', 'star', 'erase'],
  modes: ['free', 'kaleido', 'tiles'],
  limits: { copies: 14, tiles: 6, turns: 4, rotate: true },
  start: { mode: 'kaleido', copies: 6, spiral: 0, tiles: 3, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'circle', color: 'Yellow' },
  render: {},
};
