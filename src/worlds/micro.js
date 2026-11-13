// Micro: pond life under a microscope, on a bright field. Each brush grows one kind of organism along the line.
// Many small flat pieces, unlit (turning never re-lights), about as dear per stroke as Garden: free with turning,
// the kaleidoscope up to 8 copies and tiles up to 4. Still tools only.
// Later genres: to be decided (soundscape, ambient, minimal).
export default {
  id: 'micro', name: 'Micro',
  mats: ['Amoeba', 'Ciliate', 'Algae', 'Diatom', 'Bell animals', 'Filament', 'Debris'],
  tools: ['glow', 'erase'],
  modes: ['free', 'kaleido', 'tiles'],
  limits: { copies: 6, tiles: 4, turns: 3, rotate: true },
  start: { mode: 'free', copies: 4, spiral: 0, tiles: 3, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Amoeba' },
  render: { bg: 'micro' },
};
