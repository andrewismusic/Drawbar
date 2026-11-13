// Pitch: always snaps to octaves (this fixed clashing parts)
import { toneIdx } from '../styles/index.js';
import { MAP } from './maps.js';
import { INST_OCT } from './vocab.js';

export function scaleMidi(deg, base) { const sc = MAP.scale, L = sc.length, o = Math.floor(deg / L); return 12 * Math.round(base / 12) + MAP.root + 12 * o + sc[deg - o * L]; }
export function lineNote(ev, inst) {
  const L = MAP.scale.length, cm = MAP.colorMod[toneIdx(ev.s) % 7];
  const d = Math.round((MAP.invert ? 1 - ev.h : ev.h) * MAP.span) + cm.deg + cm.oct * L + (ev.shift || 0);
  return scaleMidi(d, MAP.low + 12 * (INST_OCT[inst] || 0));
}
