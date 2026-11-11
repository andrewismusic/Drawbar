// Audio graph: master bus, compressor, reverb, delay, granular, shimmer, smear, spectral thinning, wobble, tremolo,
// per-family tone chains, N.wet (Space), N.toneVol / N.drumVol (Level knobs)
import { TAU, clamp, mtof, mulberry32 } from '../core/math.js';
import { mix, prefs, score } from '../core/state.js';
import { audioReady } from '../core/transport.js';
import { ARR } from './arranger.js';
import { syncDrones } from './drones.js';
import { MAP } from './maps.js';
import { N } from './nodes.js';
import { scaleMidi } from './pitch.js';
import { FAMS, MODT } from './vocab.js';

export let actx = null, noiseBuf = null;
export const gain = v => { const g = actx.createGain(); g.gain.value = v; return g; };
export const osc = (type, f) => { const o = actx.createOscillator(); o.type = type; o.frequency.value = f; return o; };
export const filt = (type, f, q) => { const b = actx.createBiquadFilter(); b.type = type; b.frequency.value = Math.min(f, 18000); b.Q.value = q ?? 0.7; return b; };
export const delay = (t, max) => { const d = actx.createDelay(max || 1); d.delayTime.value = t; return d; };
export const panner = p => { if (!actx.createStereoPanner) return gain(1); const n = actx.createStereoPanner(); n.pan.value = clamp(p, -1, 1); return n; };
export function noiseSrc() { const b = actx.createBufferSource(); b.buffer = noiseBuf; b.loop = true; return b; }
export const curves = new Map();
export function driveCurve(a) {
  const key = Math.round(a * 20);
  if (curves.has(key)) return curves.get(key);
  const k = key * 1.2, c = new Float32Array(1024);
  const f = x => k ? (1 + k) * x / (1 + k * Math.abs(x)) : x;
  // Saturation makes a sound louder without raising its peaks; scale the curve so a typical hit comes out at the same loudness either way
  let a2 = 0, b2 = 0;
  for (let i = 0; i < 256; i++) { const x = 0.45 * Math.sin(TAU * i / 256); a2 += x * x; b2 += f(x) * f(x); }
  const g = Math.sqrt(a2 / Math.max(b2, 1e-9));
  for (let i = 0; i < 1024; i++) c[i] = f(i / 511.5 - 1) * g;
  curves.set(key, c);
  return c;
}
export function env(t, a, peak, d) {
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  return g;
}
export function adsr(t, a, peak, sus, dur, rel) {
  const g = actx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), t + a);
  g.gain.setTargetAtTime(peak * sus, t + a, 0.3);
  g.gain.setTargetAtTime(0, t + Math.max(dur, a + 0.02), rel / 3);
  return g;
}
export function makeIR(sec, swell, seed) {
  const len = Math.floor(actx.sampleRate * sec), b = actx.createBuffer(2, len, actx.sampleRate), r = mulberry32(seed);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const x = i / len;
      const e = swell ? Math.pow(Math.sin(Math.PI / 2 * Math.min(x / 0.4, 1)), 2) * Math.pow(1 - x, 1.5) : Math.pow(1 - x, 3.2);
      d[i] = (r() * 2 - 1) * e;
    }
  }
  return b;
}
export function convolver(buf) { const c = actx.createConvolver(); c.buffer = buf; return c; }
export function pitchShifter(semi) {
  const inp = gain(1), out = gain(1);
  const ratio = Math.pow(2, semi / 12), f = 5, A = (1 - ratio) / (2 * f), base = Math.abs(A) + 0.006;
  const cosWave = actx.createPeriodicWave(new Float32Array([0, 1]), new Float32Array([0, 0]), { disableNormalization: true });
  const t0 = actx.currentTime + 0.05;
  for (let i = 0; i < 2; i++) {
    const d = delay(base, 1), saw = osc('sawtooth', f), sg = gain(A);
    saw.connect(sg).connect(d.delayTime);
    const win = gain(0.5), wo = actx.createOscillator();
    wo.setPeriodicWave(cosWave); wo.frequency.value = f;
    const wg = gain(0.5);
    wo.connect(wg).connect(win.gain);
    inp.connect(d).connect(win).connect(out);
    saw.start(t0 + i * 0.5 / f); wo.start(t0 + i * 0.5 / f);
  }
  return { inp, out };
}

export function buildAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  actx = new AC();
  noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  { const d = noiseBuf.getChannelData(0), r = mulberry32(99); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; }
  N.master = gain(0);
  N.comp = actx.createDynamicsCompressor();
  N.comp.threshold.value = -14; N.comp.ratio.value = 3; N.comp.attack.value = 0.01; N.comp.release.value = 0.25;
  N.out = gain(1);
  N.comp.connect(N.master).connect(N.out).connect(actx.destination);
  N.mix = gain(1); N.mix.connect(N.comp);
  // All wet returns meet here; the Space knob turns this one gain, so it answers instantly
  N.wet = gain(1); N.wet.connect(N.mix);
  N.revSend = gain(1);
  N.revSend.connect(convolver(makeIR(3.2, false, 4242))).connect(gain(0.9)).connect(N.wet);
  N.dlySend = gain(0); N.dly = delay(0.5, 4); N.dlyFilt = filt('lowpass', 3200); N.dlyFb = gain(0.3);
  N.dlySend.connect(N.dly).connect(N.dlyFilt).connect(N.dlyFb).connect(N.dly);
  N.dFbBase = 0.3;
  const dOut = gain(0.75); N.dlyFilt.connect(dOut); dOut.connect(N.wet); dOut.connect(gain(0.3)).connect(N.revSend);
  N.granSend = gain(0); N.granOut = gain(0.9);
  N.granOut.connect(N.wet); N.granOut.connect(gain(0.5)).connect(N.revSend);
  N.taps = [];
  for (let i = 0; i < 6; i++) { const d = delay(0.2, 2.5), g = gain(0), p = panner((i % 2 ? 1 : -1) * (0.2 + 0.12 * i)); N.granSend.connect(d).connect(g).connect(p).connect(N.granOut); N.taps.push({ d, g }); }
  N.shimSend = gain(0);
  const sv = convolver(makeIR(4.5, false, 5151)), ps = pitchShifter(12), shimLP = filt('lowpass', 6500), shimFb = N.shimFb = gain(0.38);
  N.shimSend.connect(sv); sv.connect(gain(0.8)).connect(N.wet);
  sv.connect(ps.inp); ps.out.connect(shimLP).connect(shimFb).connect(sv);
  N.smearSend = gain(0);
  N.smearLP = filt('lowpass', 4500);
  N.smearSend.connect(convolver(makeIR(6, true, 6161))).connect(N.smearLP).connect(gain(1.1)).connect(N.wet);
  // Melodic bus: wobble (vibrato, wow, flutter) -> tremolo -> spectral thinning
  N.melIn = gain(1); N.wob = delay(0.015, 0.1); N.trem = gain(1);
  N.melIn.connect(N.wob).connect(N.trem);
  N.vibDepth = gain(0); N.wowDepth = gain(0); N.flutDepth = gain(0);
  const vo = osc('sine', 5.6), wo = osc('sine', 0.55), fo = osc('sine', 9.5);
  vo.connect(N.vibDepth).connect(N.wob.delayTime); wo.connect(N.wowDepth).connect(N.wob.delayTime); fo.connect(N.flutDepth).connect(N.wob.delayTime);
  N.tremOsc = osc('sine', 4); N.tremDepth = gain(0); N.tremOsc.connect(N.tremDepth).connect(N.trem.gain);
  N.thinDry = gain(1); N.thinWet = gain(0); N.melOut = gain(1);
  N.trem.connect(N.thinDry).connect(N.melOut);
  N.bps = [];
  for (let i = 0; i < 6; i++) { const b = filt('bandpass', 300 + i * 200, 28); N.trem.connect(b).connect(N.thinWet); N.bps.push(b); }
  N.thinWet.connect(N.melOut);
  N.melOut.connect(N.mix);
  N.melRev = gain(0.25); N.melOut.connect(N.melRev).connect(N.revSend);
  N.melOut.connect(N.dlySend); N.melOut.connect(N.granSend); N.melOut.connect(N.shimSend); N.melOut.connect(N.smearSend);
  [vo, wo, fo, N.tremOsc].forEach(o => o.start());
  N.drumVol = gain(1); N.drumVol.connect(N.mix);
  N.drumIn = gain(0.9); N.drumShape = actx.createWaveShaper(); N.drumShape.oversample = '2x'; N.drumFilt = filt('lowpass', 6000);
  N.drumIn.connect(N.drumShape).connect(N.drumFilt).connect(delay(0.015, 0.1)).connect(N.drumVol);
  N.drumRev = gain(0.14); N.drumVol.connect(N.drumRev).connect(N.revSend);
  N.toneVol = gain(1); N.toneVol.connect(N.melIn);
  N.linesBus = gain(0.7); N.linesBus.connect(N.toneVol);
  N.droneBus = gain(1); N.droneBus.connect(N.toneVol);
  N.fam = {};
  for (const f of FAMS) {
    const inp = gain(1), lp = filt('lowpass', 18000), hs = actx.createBiquadFilter();
    hs.type = 'highshelf'; hs.frequency.value = 3000; hs.gain.value = 0;
    inp.connect(lp).connect(hs).connect(f === 'drums' ? N.drumIn : f === 'drones' ? N.droneBus : N.linesBus);
    N.fam[f] = { inp, lp, hs };
  }
  N.mods = {};
  for (const key of Object.keys(MODT)) {
    const o = osc('sine', 0.1), g = gain(0);
    o.connect(g).connect(MODT[key].p()); o.start();
    N.mods[key] = { o, g };
  }
}

export function applyTempoParams(tc = 0.25) {
  if (!audioReady) return;
  const t = actx.currentTime, beat = 60 / score.tempo, barSec = 4 * beat;
  N.dly.delayTime.setTargetAtTime(MAP.delayBeats * beat, t, tc);
  N.tremOsc.frequency.setTargetAtTime(1 / (MAP.tremBeats * beat), t, tc);
  for (const m of ARR.mods) N.mods[m.target].o.frequency.setTargetAtTime(1 / (m.rateBars * barSec), t, tc);
}
export function applyTone(tc) {
  if (!audioReady) return;
  const t = actx.currentTime;
  for (const f of FAMS) {
    const pr = MAP.tone[f], tt = Math.pow(mix.tone, pr.e), ch = N.fam[f], k = tc ?? pr.tc;
    ch.lp.frequency.setTargetAtTime(pr.m === 'lp' ? 450 * Math.pow(40, tt) : 18000, t, k);
    ch.lp.Q.setTargetAtTime(pr.m === 'lp' ? pr.q : 0.7, t, k);
    ch.hs.frequency.setTargetAtTime(pr.hz, t, k);
    ch.hs.gain.setTargetAtTime(pr.m === 'shelf' ? -30 * (1 - tt) : 0, t, k);
  }
}
export const toneEnv = f => { const pr = MAP.tone[f]; return pr && pr.m === 'env' ? pr.floor + (1 - pr.floor) * Math.pow(mix.tone, pr.e) : 1; };
// Space sets how loud the effects are and, a little, how deep they go: longer echoes, a fuller shimmer, a brighter smear
export const spaceAmt = () => 0.55 + 0.9 * mix.space;
export const volGain = v => Math.pow(v / 80, 2);
export function applyVolumes() { if (!audioReady) return; const t = actx.currentTime; N.toneVol.gain.setTargetAtTime(volGain(prefs.volTones), t, 0.03); N.drumVol.gain.setTargetAtTime(volGain(prefs.volDrums), t, 0.03); }
export function applySpace() {
  if (!audioReady) return;
  const t = actx.currentTime, f = spaceAmt();
  N.wet.gain.setTargetAtTime(Math.pow(mix.space * 2, 1.2), t, 0.015);
  N.dlyFb.gain.setTargetAtTime(Math.min(N.dFbBase * f, 0.8), t, 0.05);
  N.shimFb.gain.setTargetAtTime(0.16 + 0.42 * mix.space, t, 0.05);
  N.smearLP.frequency.setTargetAtTime(2400 + 4200 * mix.space, t, 0.05);
}
export function applyAudio(tc = 0.25) {
  if (!audioReady || !ARR) return;
  const t = actx.currentTime, A = ARR.amt, P = ARR.P, set = (prm, v) => prm.setTargetAtTime(v, t, tc);
  const dFb = 0.2 + A.delay * 0.35;
  N._base = { delay: 0.1 + A.delay * 0.45, reverb: P.wet, gran: A.granular * 0.6, shim: A.shimmer * 0.45 };
  set(N.melRev.gain, P.wet);
  set(N.dlySend.gain, 0.1 + A.delay * 0.45); N.dFbBase = dFb;
  set(N.tremDepth.gain, A.tremolo * 0.6); set(N.trem.gain, 1 - A.tremolo * 0.3);
  set(N.vibDepth.gain, A.vibrato * 0.00016); set(N.wowDepth.gain, A.wow * 0.0011); set(N.flutDepth.gain, A.wow * 0.00004);
  set(N.granSend.gain, A.granular * 0.6); set(N.shimSend.gain, A.shimmer * 0.45); set(N.smearSend.gain, A.smear * 0.55);
  set(N.thinWet.gain, A.thin * 2.2); set(N.thinDry.gain, 1 - A.thin * 0.65);
  set(N.drumFilt.frequency, MAP.dr.busLP);
  N.drumShape.curve = driveCurve(MAP.dr.drive);
  for (const key in N.mods) {
    const m = ARR.mods.find(x => x.target === key);
    let depth = m ? m.depth * MODT[key].scale : 0;
    if (key === 'delay.fb') depth = Math.max(0, Math.min(depth, 0.86 - Math.min(dFb * 1.45, 0.8)));
    set(N.mods[key].g.gain, depth);
  }
  applyTempoParams(tc); applyTone(tc === 0.25 ? undefined : tc); applySpace(); applyVolumes();
  syncDrones(tc); retuneThin(t);
}
export function retuneThin(t) {
  const ms = [0, 2, 4].map(d => scaleMidi(d, 60));
  N.bps.forEach((b, i) => b.frequency.setTargetAtTime(mtof(ms[i % 3] + (i >= 3 ? 12 : 0)), t, 0.05));
}
