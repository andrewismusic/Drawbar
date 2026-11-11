// Materials: the soft, realistic set. Heaviest per copy (every soft layer is a blurred draw, about 4x a plain fill),
// and the kaleidoscope's turning re-lights it all the time. So: few copies (up to 6) and still tools only. With Ripple
// strokes on top it measured level with v18's default (about 50 ms a frame); without them, about 17 ms.
// Later genres: classical (romantic, impressionist), jazz, soundscape.
export default {
  id: 'materials', name: 'Materials',
  mats: ['Liquid metal', 'Strawberry', 'Lemon', 'Mint', 'Blueberry', 'Cloud', 'Slime'],
  tools: ['glow', 'beads', 'erase'],
  modes: ['free', 'kaleido'],
  limits: { copies: 4, tiles: 3, turns: 1, rotate: true },
  start: { mode: 'kaleido', copies: 2, spiral: 0, tiles: 3, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Liquid metal' },
  render: {},
};
