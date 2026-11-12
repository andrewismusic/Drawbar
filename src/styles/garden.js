// Garden: magical plants, fungi and fruit, one brush each. A thin stem follows the line and the plant sprouts along it
// (render/plants.js); with Beads, each bead becomes one head. Saturated flat colours on the dark canvas, each head
// sitting in a soft two-step halo of its own colour. No outlines, nothing slid toward the light: nothing to re-light.
// stemW: stem width as a share of the line width. reach: how far pieces reach past the line. beadEvery: Beads thinning.
import { F } from '../render/ops.js';

const EVERY = { glowcap: 2, bellcap: 2, trumpet: 2, coral: 3, puffball: 2, starbloom: 2 };   // Beads: one head per this many beads
const plant = (name, kind, stem, glow, layers, swatch, reach = 0.05) => ({
  name, accent: layers[layers.length > 2 ? 1 : 0][1], glow, glowA: 0.22, plant: kind, stemW: 0.3, reach, beadEvery: EVERY[kind] || 1,
  keys: ['halo', 'halo2', 'stalk', ...layers.map(l => l[0])],
  make: () => [F('halo', glow, 0, 0.09), F('halo2', glow, 0, 0.12), F(1, stem), F('stalk', stem), ...layers.map(([k, c]) => F(k, c))], swatch,
});
const orb = (a, b, bg = '#160b33') => `radial-gradient(circle at 42% 38%, ${b} 0 14%, ${a} 30% 52%, ${bg} 56%)`;
export const plants = [
  plant('Glowcaps', 'glowcap', '#9b8cff', '#ffc94d', [['gill', '#fff3c4'], ['capA', '#ffb300'], ['capAHi', '#ffe066'], ['capB', '#ff4f9a'], ['capBHi', '#ffa6cf'], ['spot', '#fffbe6']],
    'radial-gradient(ellipse 60% 34% at 50% 44%, #ffb300 0 96%, transparent 100%), radial-gradient(ellipse 12% 34% at 50% 74%, #9b8cff 0 96%, transparent 100%), #160b33'),
  plant('Bellcaps', 'bellcap', '#7fd4ff', '#ff4d6d', [['cap', '#e3173e'], ['capHi', '#ff6b6b'], ['frill', '#ffd166']],
    'radial-gradient(ellipse 26% 52% at 50% 40%, #e3173e 0 96%, transparent 100%), radial-gradient(ellipse 10% 30% at 50% 80%, #7fd4ff 0 96%, transparent 100%), #160b33'),
  plant('Trumpets', 'trumpet', '#e0661a', '#ff9d2e', [['horn', '#ff8c1a'], ['rim', '#ffc24d'], ['inner', '#c2410c'], ['stamen', '#ffd98a'], ['dot', '#fff1a8']], orb('#ff8c1a', '#ffc24d')),
  plant('Spirals', 'spiral', '#7b2cbf', '#c77dff', [['leaf', '#35e0c4'], ['curl', '#b14dff'], ['dot', '#ff7ae0']],
    'repeating-radial-gradient(circle, #b14dff 0 3px, #160b33 3px 6px)'),
  plant('Coral', 'coral', '#d1157a', '#ff5cb0', [['branch', '#ff2e93'], ['pad', '#a6f01e'], ['padHi', '#e2ff7a']],
    'radial-gradient(ellipse 60% 18% at 50% 30%, #a6f01e 0 96%, transparent 100%), linear-gradient(90deg, transparent 42%, #ff2e93 42% 58%, transparent 58%), #160b33', 0.07),
  plant('Moonberries', 'moonberry', '#1a8f84', '#6f9bff', [['leaf', '#22c7a9'], ['berry', '#4d7cff'], ['berryHi', '#a9c4ff'], ['shine', '#ffffff']], orb('#4d7cff', '#ffffff')),
  plant('Lanterns', 'lantern', '#2bd9a0', '#ffb347', [['lamp', '#ff7a00'], ['band', '#c2410c'], ['lampHi', '#ffe08a'], ['shine', '#ffffff']], orb('#ff7a00', '#ffe08a')),
  plant('Puffballs', 'puffball', '#ff9ecf', '#5fd8ff', [['ball', '#3fd0ff'], ['ballHi', '#b8f1ff'], ['spot', '#ff3fb4'], ['spore', '#d9faff']],
    'radial-gradient(circle at 36% 40%, #ff3fb4 0 9%, transparent 10%), radial-gradient(circle at 62% 56%, #ff3fb4 0 8%, transparent 9%), radial-gradient(circle, #3fd0ff 0 52%, #160b33 56%)'),
  plant('Starbloom', 'starbloom', '#18c29c', '#ff6fcf', [['petal', '#ff3fb4'], ['petalHi', '#ffc2e8'], ['ctr', '#ffe14d'], ['dot', '#ff8a00']],
    'conic-gradient(#ff3fb4 0 10%, #160b33 0 17%, #ff3fb4 0 27%, #160b33 0 34%, #ff3fb4 0 44%, #160b33 0 51%, #ff3fb4 0 61%, #160b33 0 68%, #ff3fb4 0 78%, #160b33 0 85%, #ff3fb4 0 95%, #160b33 0)'),
];
