// Space: nebulae in the colour pairs of telescope composites, star fields, galaxies and dark dust lanes.
// Drawn as additive sprite stamps (render/space.js): unlit, nothing to re-light, a still stroke costs one image copy
// per stamp. space: { kind, a, b } picks the generator and its two colours.
const cloud = (a, b) => `radial-gradient(circle at 40% 42%, #fff 0 5%, ${a} 18%, ${b}cc 44%, #03040a 70%)`;
const mat = (name, kind, a, b, swatch) => ({ name, accent: a, glow: a, glowA: 0, space: { kind, a, b }, reach: 0.11, make: () => [{ t: 'stamps' }], swatch });
export const spaceMats = [
  mat('Orion', 'nebula', '#ff5fa8', '#7a3cff', cloud('#ff5fa8', '#7a3cff')),
  mat('Carina', 'nebula', '#ffb347', '#1fb8c9', cloud('#ffb347', '#1fb8c9')),
  mat('Veil', 'nebula', '#39e0d0', '#2a5cff', cloud('#39e0d0', '#2a5cff')),
  mat('Eagle', 'nebula', '#ff8a4a', '#b0341e', cloud('#ff8a4a', '#b0341e')),
  mat('Stars', 'stars', '#dfe9ff', '#9db8ff', 'radial-gradient(circle at 30% 34%, #fff 0 6%, transparent 9%), radial-gradient(circle at 66% 58%, #cfe0ff 0 9%, transparent 13%), radial-gradient(circle at 44% 76%, #fff 0 4%, transparent 7%), #03040a'),
  mat('Gold stars', 'stars', '#ffe2a8', '#ffb86b', 'radial-gradient(circle at 34% 40%, #fff3d6 0 8%, transparent 12%), radial-gradient(circle at 68% 62%, #ffc880 0 7%, transparent 11%), #03040a'),
  mat('Galaxy', 'galaxy', '#a9c4ff', '#ffe2a8', 'radial-gradient(ellipse 46% 24% at 50% 50%, #fff6e0 0 20%, #a9c4ff 50%, transparent 100%), #03040a'),
  mat('Dust', 'dust', '#3a3148', '#3a3148', 'radial-gradient(circle, #05040a 0 40%, #2a2338 75%)'),
];
