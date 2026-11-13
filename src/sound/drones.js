// Drones from ripple strokes
import { toneIdx } from '../styles/index.js';
import { mtof } from '../core/math.js';
import { audioReady } from '../core/transport.js';
import { ARR } from './arranger.js';
import { actx, filt, gain, osc } from './graph.js';
import { strokeWave } from './instruments.js';
import { MAP } from './maps.js';
import { N } from './nodes.js';
import { scaleMidi } from './pitch.js';

export const drones = new Map();
export function droneFreq(s) { const L = MAP.scale.length, cm = MAP.colorMod[toneIdx(s) % 7]; let f = mtof(scaleMidi(Math.round((MAP.invert ? 1 - s._hm : s._hm) * MAP.span) + cm.deg - L, MAP.low)); while (f > 400) f /= 2; while (f < 50) f *= 2; return f; }
export function syncDrones(tc = 0.4) {
  if (!audioReady) return;
  const t = actx.currentTime, want = ARR.drones, ids = new Set(want.map(s => s.id));
  for (const [id, d] of drones) if (!ids.has(id)) {
    d.fader.gain.cancelScheduledValues(t); d.fader.gain.setTargetAtTime(0, t, 0.5);
    [d.o1, d.o2, d.lfo].forEach(o => o.stop(t + 3));
    setTimeout(() => { try { d.fader.disconnect(); } catch (e) {} }, 3500);
    drones.delete(id);
  }
  for (const s of want) {
    const f = droneFreq(s), cut = Math.min(f * 5 * ARR.P.bright * MAP.colorMod[toneIdx(s) % 7].bright, 8000);
    if (drones.has(s.id)) { const d = drones.get(s.id); d.lp.frequency.setTargetAtTime(cut, t, tc); d.o1.frequency.setTargetAtTime(f, t, tc); d.o2.frequency.setTargetAtTime(f, t, tc); continue; }
    const w = strokeWave(s), o1 = actx.createOscillator(), o2 = actx.createOscillator();
    o1.setPeriodicWave(w); o2.setPeriodicWave(w); o1.frequency.value = f; o2.frequency.value = f; o2.detune.value = 7;
    const lp = filt('lowpass', cut, 0.6), amp = gain(0.5), lfo = osc('sine', s._rate), lg = gain(0.45), fader = gain(0);
    lfo.connect(lg).connect(amp.gain);
    fader.gain.setValueAtTime(0, t); fader.gain.linearRampToValueAtTime(0.05, t + 2.5);
    o1.connect(lp); o2.connect(lp); lp.connect(amp).connect(fader).connect(N.fam.drones.inp);
    [o1, o2, lfo].forEach(o => o.start(t));
    drones.set(s.id, { o1, o2, lp, lfo, fader });
  }
}
