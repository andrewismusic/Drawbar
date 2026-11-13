// Comic: flat colour, ink, halftone and hatching. Still strokes are fairly cheap: up to 8 copies, or tiles up to 4 across
// with up to 4 turns (6 turns, a hex tiling with many more copies, took about 300 ms to redraw after each stroke). Comic shading is lit (cel shadows slide away
// from the light), but its light turns with the picture instead of being re-lit (render.fixedLight): re-lighting took
// about a third of all frames in the kaleidoscope and made it stutter; a turning cel-shaded picture looks fine.
// Moving strokes are not cheap: the halftone and ink are rebuilt every frame for every copy, so Comic keeps to still tools.
// Later genres: funk, hip-hop, lofi.
export default {
  id: 'comic', name: 'Comic',
  mats: ['Comic red', 'Pop', 'Screentone', 'Comic cloud', 'Ink hatch', 'Brush ink'],   // shown as Cel, Pop, Tone, Cloud, Hatch, Ink; the colour picker tints them
  colors: ['#ee3b3f', '#ff8a1f', '#ffcb2b', '#3ccf6e', '#3ea4ea', '#9b6bff', '#ff6fb5', '#f4efe2', '#15151c'],
  tools: ['glow', 'erase'],
  modes: ['free', 'kaleido', 'tiles'],
  limits: { copies: 6, tiles: 4, turns: 3, rotate: true },
  start: { mode: 'kaleido', copies: 6, spiral: 0, tiles: 4, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Comic red' },
  render: { fixedLight: true },
};
