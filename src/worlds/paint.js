// Paint: one ink brush on paper, in any colour from the picker. The mark is all brush hairs (extraPieces 'bristle'
// in render/shapes.js): slow strokes come out full and a little thicker, fast ones dry and streaky. Unlit, one flat
// fill per stroke per copy, so it runs in every pattern. The app opens here.
// Later genres: to be decided.
export default {
  id: 'paint', name: 'Paint',
  mats: ['Brush ink'],
  colors: ['#15151c', '#1f3a8a', '#c8281e', '#e2681c', '#d9a514', '#2f8f4e', '#2f7fd6', '#7a48c8', '#d6468f', '#7a4a2a'],
  tools: ['glow', 'erase'],
  modes: ['free', 'kaleido', 'tiles'],
  limits: { strokes: 40, copies: 6, tiles: 4, turns: 3, rotate: true },
  start: { mode: 'kaleido', copies: 6, spiral: 0, tiles: 4, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Brush ink' },
  render: { bg: 'paper', sprites: true },
};
