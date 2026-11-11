// Garden: one brush per plant, flat colour and no outlines. Plants are many small pieces, so each new stroke costs a
// redraw that grows with copies; nothing is lit, so the turning kaleidoscope never re-lights them. Still tools only.
// Later genres: to be decided (soundscape, impressionist, lofi).
export default {
  id: 'garden', name: 'Garden',
  mats: ['Flower vine', 'Daisies', 'Tulips', 'Lavender', 'Fern', 'Grass', 'Berries', 'Blossom', 'Clover', 'Sunflower'],
  tools: ['glow', 'beads', 'erase'],
  modes: ['free', 'kaleido', 'tiles'],
  limits: { copies: 6, tiles: 4, turns: 4, rotate: true },
  start: { mode: 'free', copies: 4, spiral: 0, tiles: 3, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Daisies' },
  render: {},
};
