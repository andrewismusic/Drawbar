// Music vocab: scales, instrument pools per tool, effects, modulation targets
import { N } from './nodes.js';

export const SCALE_DEFS = [
  [0, 2, 4, 5, 7, 9, 11], [0, 2, 3, 5, 7, 8, 10], [0, 2, 3, 5, 7, 9, 10], [0, 1, 3, 5, 7, 8, 10], [0, 2, 4, 6, 7, 9, 11],
  [0, 2, 4, 5, 7, 9, 10], [0, 2, 3, 5, 7, 8, 11], [0, 2, 4, 7, 9], [0, 3, 5, 7, 10], [0, 2, 3, 7, 8], [0, 2, 4, 6, 8, 10],
];
export const LINE_POOLS = { glow: ['glass', 'wave', 'pad', 'bell'], beads: ['wood', 'pluck', 'glass', 'wave', 'piano'], loop: ['wave', 'pluck', 'piano', 'bell'] };
export const INST_OCT = { piano: 0, pluck: 0, wave: 0, bell: 1, glass: 1, wood: 1, pad: -1 };
export const FX = ['vibrato', 'tremolo', 'wow', 'delay', 'granular', 'shimmer', 'smear', 'thin'];
export const SPACE_FX = ['delay', 'granular', 'shimmer', 'smear'];
export const FAMS = ['piano', 'pluck', 'wave', 'bell', 'glass', 'wood', 'pad', 'drums', 'drones'];
export const BUDGET = { drums: 16, lines: 9 };
export const MODT = {
  'delay.send': { p: () => N.dlySend.gain, scale: 0.35 },
  'delay.fb': { p: () => N.dlyFb.gain, scale: 0.25 },
  'reverb.send': { p: () => N.melRev.gain, scale: 0.3 },
  'trem.depth': { p: () => N.tremDepth.gain, scale: 0.4, fx: 'tremolo' },
  'vib.depth': { p: () => N.vibDepth.gain, scale: 0.0001, fx: 'vibrato' },
  'wow.depth': { p: () => N.wowDepth.gain, scale: 0.0009, fx: 'wow' },
  'gran.send': { p: () => N.granSend.gain, scale: 0.6, fx: 'granular' },
  'shim.send': { p: () => N.shimSend.gain, scale: 0.45, fx: 'shimmer' },
  'smear.send': { p: () => N.smearSend.gain, scale: 0.6, fx: 'smear' },
  'thin.mix': { p: () => N.thinWet.gain, scale: 1.6, fx: 'thin' },
  'drum.cut': { p: () => N.drumFilt.detune, scale: 1500 },
};
