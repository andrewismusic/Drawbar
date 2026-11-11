// Comic: flat colour, ink, halftone and hatching. Still strokes are fairly cheap: up to 8 copies, or tiles up to 4 across
// (5 across with 6 turns took twice v18's redraw time after each stroke).
// Moving strokes are not: the halftone and ink are rebuilt every frame for every copy (measured ~70 ms a frame at
// 8 copies with loops, against ~50 ms for v18's default), so Comic keeps to still tools.
// Later genres: funk, hip-hop, lofi.
export default {
  id: 'comic', name: 'Comic',
  mats: ['Comic red', 'Comic yellow', 'Comic blue', 'Comic cloud', 'Ink hatch', 'Flower vine'],
  tools: ['glow', 'beads', 'erase'],
  modes: ['kaleido', 'tiles'],
  limits: { copies: 6, tiles: 4, turns: 4, rotate: false },
  start: { mode: 'kaleido', copies: 6, spiral: 0, tiles: 4, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Comic red' },
  render: {},
};
