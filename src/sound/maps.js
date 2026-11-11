// Maps 000-999: seeded per-map choices (effects, mixing matrix W, mod targets, drum kit and params, tone curves, instruments, rotation response)
import { TAU, hash32, mulberry32 } from '../core/math.js';
import { score } from '../core/state.js';
import { FAMS, FX, LINE_POOLS, MODT, SCALE_DEFS, SPACE_FX } from './vocab.js';

export function makeMap(n) {
  const r = mulberry32(hash32(n, 0x9e37)), R = (a, b) => a + r() * (b - a);
  const pick = a => a[Math.floor(r() * a.length)];
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const fx = shuffle(FX).slice(0, 2 + Math.floor(r() * 3));
  if (!fx.some(e => SPACE_FX.includes(e))) fx[0] = pick(SPACE_FX);
  const W = Array.from({ length: 5 + FX.length }, () => Array.from({ length: 9 }, () => (r() * 2 - 1) * 1.5));
  const targets = shuffle(Object.keys(MODT).filter(k => { const t = MODT[k]; return !t.fx || fx.includes(t.fx); }));
  const density = 0.35 + 0.65 * r();
  const kit = pick(['hand', 'acoustic', 'electro', 'lofi', 'lofi']), lofi = kit === 'lofi';
  const tone = {};
  // Tone knob: each family darkens its own way and at its own rate
  for (const f of FAMS) tone[f] = { m: f === 'drums' || f === 'drones' ? pick(['lp', 'shelf']) : pick(['env', 'lp', 'shelf']), e: R(0.5, 2.3), floor: R(0.06, 0.3), hz: R(1500, 5000), q: R(0.5, 1.3), tc: R(0.04, 0.35) };
  return {
    n, fx, W, targets, density, kit, tone,
    lineInst: { glow: pick(LINE_POOLS.glow), beads: pick(LINE_POOLS.beads), loop: pick(LINE_POOLS.loop) },
    canonInt: pick([2, 4, -3, 5]),
    low: 38 + Math.floor(r() * 10), span: 8 + Math.floor(r() * 9),
    invert: r() < 0.35, hy: r(),
    colorMod: Array.from({ length: 7 }, () => ({ oct: pick([-1, 0, 0, 0, 1]), deg: Math.floor(r() * 3), bright: 0.6 + r() * 0.7 })),
    modStart: density < 0.55 ? 1 : 2 + Math.floor(r() * 3), modMul: 0.6 + r() * 0.9,
    delayBeats: pick([0.75, 0.5, 1, 1.5]), tremBeats: pick([0.25, 0.5, 1]), grainPitch: pick([0, 12, -12]),
    drumPerm: r() < 0.7 ? [0, 1, 2, 3] : shuffle([0, 1, 2, 3]),
    drumK: [1.2, 0.8, 2.5, 1.5].map(v => v * (0.6 + r() * 0.8)),
    maxLoops: pick([2, 3, 3]), swing: r() * 0.5, fmRatio: pick([1, 2, 3, 4]),
    dr: {
      kick: { mul: R(1.8, 5), sweep: R(0.02, 0.12), dec: R(0.18, 0.8), click: R(0, 0.4), drive: lofi ? R(0.2, 1) : R(0, 0.5), tri: r() < 0.3 },
      snare: { tone: R(0, 1), toneDec: R(0.04, 0.2), nDec: R(0.05, 0.32), nFreq: R(900, 5200), nQ: R(0.5, 2.2), snap: R(0, 1), claps: pick([1, 1, 2, 3, 4]), rim: R(0, 1), dust: R(0, 1), beef: R(0, 1), lp: R(1600, 6000) },
      hat: { metal: R(0, 1), freq: R(5000, 11000), q: R(0.5, 3), dec: R(0.02, 0.1), open: R(0.12, 0.45), openProb: R(0, 0.35) },
      perc: pick(['rim', 'shaker', 'tom']),
      busLP: lofi ? R(1800, 4500) : R(4500, 10000), drive: lofi ? R(0.35, 1) : R(0, 0.3),
    },
    root: 0, scale: SCALE_DEFS[0],
    rot: (() => {
      const q = mulberry32(hash32(n, 0x707)), Q = (a, b) => a + q() * (b - a), fxKeys = ['delay', 'reverb', 'gran', 'shim'];
      const a = Math.floor(q() * 4); let b = Math.floor(q() * 3); if (b >= a) b++;
      return { pitch: Q(0.3, 1.3), pan: Q(0.15, 0.45), gate: q() < 0.35 ? -2 : Q(-0.8, -0.2), gateA: Q(0, TAU), swing: Q(0, 0.6), fx: [[fxKeys[a], Q(0, TAU), Q(0.3, 0.7)], [fxKeys[b], Q(0, TAU), Q(0.2, 0.5)]] };
    })(),
  };
}
export function applyKeyScale() { MAP.root = score.key; MAP.scale = SCALE_DEFS[score.scale]; }
export let MAP = makeMap(score.map);
export function useMap(n) { MAP = makeMap(n); }
applyKeyScale();
