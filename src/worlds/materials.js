// Materials: the soft, realistic set. Heaviest per copy: every soft layer is a blurred draw, about 4x a plain fill.
// No kaleidoscope: it turns all the time, so every soft stroke in every copy is re-lit several times a second, and the
// light visibly steps (the jitter seen on tablets). Free (turning re-lights only one or two copies) and tiles (never
// turns, never re-lights) instead, square tiles with 1 or 2 turns (hex tilings took ~300 ms to redraw per stroke),
// with still tools only.
// Later genres: classical (romantic, impressionist), jazz, soundscape.
export default {
  id: 'materials', name: 'Materials',
  mats: ['Liquid metal', 'Strawberry', 'Clay', 'Glass', 'Cloud', 'Slime'],   // shown as Metal, Cream, Clay, Glass, Cloud, Slime; the colour picker tints them (v28)
  colors: ['#aab1ba', '#e2b24a', '#f39bbd', '#f08a5c', '#f7da7a', '#79c832', '#94ddc6', '#98bff0', '#b79cf0', '#eef1f6'],
  tools: ['glow', 'beads', 'erase'],
  modes: ['free', 'tiles'],
  limits: { strokes: 24, copies: 0, tiles: 4, turns: 1, rotate: true },
  start: { mode: 'free', copies: 2, spiral: 0, tiles: 3, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, tool: 'glow', color: 'Liquid metal' },
  render: {},
};
