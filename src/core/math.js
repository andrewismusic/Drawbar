// Basics: maths and seeded randomness. Everything musical is seeded; Math.random is only used by the dice.
export const TAU = Math.PI * 2;
export const mod = (a, b) => ((a % b) + b) % b;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const th = x => (Math.tanh(x) + 1) / 2;
export const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
export const fold = f => { while (f > 3200) f /= 2; while (f < 45) f *= 2; return f; };
export const ease = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash32(...nums) {
  let h = 2166136261 >>> 0;
  for (const n of nums) { h ^= n | 0; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; }
  return h >>> 0;
}
export const hashFrac = (...a) => hash32(...a) / 4294967296;
export const GOLD = Math.PI * (3 - Math.sqrt(5)), SQ3 = Math.sqrt(3);
