// Garden: one brush per plant. A thin stem follows the line and the plant grows its pieces along it (render/plants.js);
// with Beads, each bead becomes a bloom or clump. Flat colours, no outlines, no offsets toward the light: nothing to re-light.
// stemW: stem width as a share of the line width (0 = no stem drawn). reach: how far pieces reach past the line.
import { F } from '../render/ops.js';

const EVERY = { sunflower: 3, daisy: 2, lavender: 2, grass: 2, blossom: 2 };   // Beads: one bloom per this many beads
const plant = (name, accent, kind, stem, stemW, layers, swatch, reach = 0.035) => ({
  name, accent, glow: accent, glowA: 0, plant: kind, stemW, reach, beadEvery: EVERY[kind] || 1, keys: layers.map(l => l[0]),
  make: () => [F(1, stem), ...layers.map(([k, c]) => F(k, c))], swatch,
});
const bloom = (petal, ctr, bg) => `radial-gradient(circle, ${ctr} 0 22%, ${petal} 24% 58%, ${bg} 60%)`;
export const plants = [
  plant('Daisies', '#f4f1e8', 'daisy', '#3f8a3a', 0.3, [['stalk', '#3f8a3a'], ['leaf', '#56a845'], ['petal', '#f7f4ea'], ['ctr', '#ffc93c'], ['dot', '#f39c12']], bloom('#f7f4ea', '#ffc93c', '#2d5e2a')),
  plant('Tulips', '#ff5d73', 'tulip', '#3c8d40', 0.3, [['stalk', '#3c8d40'], ['leaf', '#4fa64a'], ['leafHi', '#6cc35a'], ['cupA', '#e63946'], ['cupAHi', '#ff7b86'], ['cupB', '#ffb703'], ['cupBHi', '#ffd668'], ['cupC', '#f15bb5'], ['cupCHi', '#ff9fd8']],
    'radial-gradient(ellipse 34% 40% at 38% 42%, #e63946 0 90%, transparent 92%), radial-gradient(ellipse 34% 40% at 62% 42%, #ff7b86 0 90%, transparent 92%), linear-gradient(#2d5e2a, #3c8d40)'),
  plant('Lavender', '#9b7fd4', 'lavender', '#6b8f71', 0.25, [['stalk', '#6b8f71'], ['bud', '#8e6cc4'], ['budHi', '#b9a0e8']],
    'repeating-linear-gradient(90deg, #8e6cc4 0 3px, #b9a0e8 3px 5px, #2f3d31 5px 8px)'),
  plant('Fern', '#4c9a4c', 'fern', '#2f6b2f', 0.3, [['leaf', '#3f8f3f'], ['leafHi', '#6cbf5a']],
    'repeating-linear-gradient(60deg, #3f8f3f 0 3px, #6cbf5a 3px 5px, #1f3d1f 5px 7px)'),
  plant('Grass', '#6cbf4a', 'grass', '#2f6b2f', 0.2, [['g1', '#3f8f3f'], ['g2', '#6cbf4a'], ['g3', '#9ad85f']],
    'repeating-linear-gradient(80deg, #3f8f3f 0 2px, #9ad85f 2px 4px, #6cbf4a 4px 6px)'),
  plant('Berries', '#d62839', 'berries', '#6b4226', 0.3, [['leaf', '#2f7d3a'], ['leafHi', '#4fa64a'], ['berry', '#d62839'], ['berryHi', '#ffb3b8']],
    'radial-gradient(circle at 40% 40%, #ffb3b8 0 8%, #d62839 10% 34%, transparent 36%), radial-gradient(circle at 66% 62%, #d62839 0 26%, transparent 28%), #2f7d3a'),
  plant('Blossom', '#f7b8cf', 'blossom', '#5a3b2e', 0.55, [['twig', '#5a3b2e'], ['bud', '#e8789f'], ['petal', '#f7c6d8'], ['ctr', '#d6336c'], ['dot', '#8f1d45']], bloom('#f7c6d8', '#d6336c', '#5a3b2e')),
  plant('Clover', '#4caf50', 'clover', '#2f6b2f', 0.2, [['leaf', '#3d9a45'], ['leafHi', '#7ccf72'], ['flower', '#f5f0ff']],
    'radial-gradient(circle at 34% 36%, #3d9a45 0 22%, transparent 24%), radial-gradient(circle at 66% 36%, #3d9a45 0 22%, transparent 24%), radial-gradient(circle at 50% 66%, #3d9a45 0 22%, transparent 24%), #1f3d1f'),
  plant('Sunflower', '#ffc93c', 'sunflower', '#3c8d40', 0.45, [['leaf', '#3c8d40'], ['leafHi', '#5bb04f'], ['petal', '#ffb703'], ['petalHi', '#ffd668'], ['ctr', '#6b3e1f'], ['dot', '#3d2312']], bloom('#ffb703', '#6b3e1f', '#2d5e2a'), 0.06),
];
