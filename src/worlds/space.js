// Space: nebulae, star fields, galaxies and dust on a deep-field backdrop, with twinkling stars. Everything is
// additive sprite stamps: unlit (turning never re-lights) and cheap per copy, so it gets free with turning,
// the kaleidoscope up to 8 copies and tiles up to 4. Still tools only; the twinkle is a small per-frame overlay.
// Later genres: soundscape, ambient.
export default {
  id: 'space', name: 'Space',
  mats: ['Orion', 'Carina', 'Veil', 'Eagle', 'Stars', 'Gold stars'],
  tools: ['glow', 'erase'],
  modes: ['free', 'kaleido', 'tiles'],
  limits: { strokes: 24, copies: 6, tiles: 4, turns: 3, rotate: true },
  start: { mode: 'free', copies: 2, spiral: 0, tiles: 3, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Orion' },
  // No sprites here: a stroke is already a list of small pastes, and one big pasted picture per copy was slower in the test.
  render: { space: true, twinkle: true, preview: true, film: true },
};
