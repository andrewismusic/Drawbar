// Instruments: voice() (piano, pluck, wave = stroke wavetable, bell, glass, wood, pad) and drumHit() (hand / acoustic / electro / lofi kits)
import { TAU, clamp, mod, mtof } from '../core/math.js';
import { actx, adsr, driveCurve, env, filt, gain, noiseSrc, osc, panner } from './graph.js';
import { MAP } from './maps.js';
import { N } from './nodes.js';

export let voiceEnds = [];
export function strokeWave(s) {
  if (!s) return null;
  if (s._wave) return s._wave;
  const NP = 64, pts = [], p = s.pts, L = s._L, n = p.length;
  let j = 1;
  for (let k = 0; k < NP; k++) {
    const target = s._len * k / NP;
    while (j < n - 1 && L[j] < target) j++;
    const a = p[j - 1], b = p[j], seg = (L[j] - L[j - 1]) || 1e-6, u = clamp((target - L[j - 1]) / seg, 0, 1);
    pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  let cx = 0, cy = 0;
  for (const q of pts) { cx += q[0]; cy += q[1]; }
  cx /= NP; cy /= NP;
  const d = pts.map(q => Math.hypot(q[0] - cx, q[1] - cy)), mean = d.reduce((a, b) => a + b, 0) / NP;
  const H = 32, re = new Float32Array(H + 1), im = new Float32Array(H + 1);
  for (let h = 1; h <= H; h++) {
    let a = 0, b = 0;
    for (let k = 0; k < NP; k++) { const x = d[k] - mean, ph = TAU * h * k / NP; a += x * Math.cos(ph); b += x * Math.sin(ph); }
    const tilt = 1 / (1 + h * 0.08);
    re[h] = a * tilt; im[h] = b * tilt;
  }
  im[1] += 0.02 * (Math.abs(re[1]) + Math.abs(im[1]) + 0.01);
  s._wave = actx.createPeriodicWave(re, im);
  return s._wave;
}
export function voice(type, f, t, vel, dur, pan, bright, s) {
  const now = actx.currentTime;
  voiceEnds = voiceEnds.filter(e => e > now);
  if (voiceEnds.length > 48) return;
  const out = gain(1), pn = panner(pan || 0);
  out.connect(pn).connect(N.fam[type].inp);
  const src = [];
  let end = t + 2;
  dur = Math.max(dur, 0.08);
  switch (type) {
    case 'piano': {
      end = t + Math.min(dur + 0.7, 4);
      const damp = gain(1);
      damp.gain.setValueAtTime(1, t); damp.gain.setTargetAtTime(0, t + Math.max(dur, 0.3), 0.15);
      damp.connect(out);
      for (let k = 1; k <= 6; k++) {
        const fk = f * k * Math.sqrt(1 + 0.00035 * k * k);
        if (fk > 11000) break;
        const amp = vel * 0.24 * Math.pow(k, -1.25) * (k > 2 ? Math.min(bright, 1.4) : 1);
        const o = osc('sine', fk); o.connect(env(t, 0.003, amp, 2.8 / (1 + 0.55 * k))).connect(damp); src.push(o);
        if (k === 1) { const o2 = osc('sine', fk * 1.0011); o2.connect(env(t, 0.003, amp * 0.45, 2.6)).connect(damp); src.push(o2); }
      }
      const nz = noiseSrc(); nz.connect(filt('bandpass', Math.min(f * 3, 9000), 1.5)).connect(env(t, 0.001, vel * 0.05 * bright, 0.025)).connect(damp); src.push(nz);
      break;
    }
    case 'pluck': {
      end = t + 1.6;
      const o = osc('sawtooth', f), lp = filt('lowpass', Math.min(f * 10 * bright, 12000), 2);
      lp.frequency.setValueAtTime(Math.max(Math.min(f * 10 * bright, 12000), f * 1.3), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.2, 80), t + 0.5);
      o.connect(lp).connect(env(t, 0.004, vel * 0.2, 1.4)).connect(out); src.push(o);
      break;
    }
    case 'wave': {
      end = t + Math.min(dur + 1.2, 3);
      const o = actx.createOscillator(), w = strokeWave(s);
      if (w) o.setPeriodicWave(w); else o.type = 'triangle';
      o.frequency.value = f;
      o.connect(filt('lowpass', f * 6 * bright + 200, 0.8)).connect(env(t, 0.012, vel * 0.28, Math.min(dur + 1, 2.6))).connect(out); src.push(o);
      break;
    }
    case 'bell': {
      end = t + 3.3;
      const c = osc('sine', f), m = osc('sine', f * MAP.fmRatio), mg = gain(0);
      mg.gain.setValueAtTime(f * MAP.fmRatio * 1.1 * bright, t); mg.gain.exponentialRampToValueAtTime(f * 0.05 + 1, t + 1.4);
      m.connect(mg).connect(c.frequency);
      c.connect(env(t, 0.003, vel * 0.18, 3)).connect(out); src.push(c, m);
      break;
    }
    case 'glass': {
      end = t + 3.5;
      const a = osc('sine', f), b = osc('sine', f * 3);
      a.connect(env(t, 0.004, vel * 0.22, 3.2)).connect(out); b.connect(env(t, 0.002, vel * 0.07 * bright, 1.2)).connect(out); src.push(a, b);
      break;
    }
    case 'wood': {
      end = t + 0.5;
      const o = osc('triangle', f); o.frequency.setValueAtTime(f * 1.5, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      const k = osc('sine', f * 2.01);
      o.connect(env(t, 0.002, vel * 0.3, 0.3)).connect(out); k.connect(env(t, 0.001, vel * 0.1 * Math.min(bright, 1.3), 0.08)).connect(out); src.push(o, k);
      break;
    }
    case 'pad': {
      end = t + dur + 1.6;
      const a = osc('sawtooth', f), b = osc('sawtooth', f); a.detune.value = -9; b.detune.value = 9;
      const lp = filt('lowpass', f * 1.2, 2.5);
      lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(Math.max(Math.min(f * (2.5 + 3 * bright), 8000), f * 1.3), t + 0.9);
      a.connect(lp); b.connect(lp); lp.connect(adsr(t, 0.45, vel * 0.075, 0.85, dur, 1.2)).connect(out); src.push(a, b);
      break;
    }
  }
  src.forEach(o => { o.start(t); o.stop(end); });
  voiceEnds.push(end);
  setTimeout(() => { try { out.disconnect(); pn.disconnect(); } catch (e) {} }, (end - now + 0.5) * 1000);
}

export function drumHit(piece, t, v, open) {
  const now = actx.currentTime;
  voiceEnds = voiceEnds.filter(e => e > now);
  if (voiceEnds.length > 56) return;
  const D = MAP.dr, kit = MAP.kit, out = gain(1); out.connect(N.fam.drums.inp);
  const src = [];
  let end = t + 0.3;
  const tone = (f0, f1, sw, dec, amp, type, dest) => {
    const o = osc(type || 'sine', f0);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + sw);
    o.connect(env(t, 0.001, amp, dec)).connect(dest || out); src.push(o); end = Math.max(end, t + dec + 0.05);
  };
  const nz = (dec, amp, type, freq, q, att, at, dest) => {
    at = at ?? t; const b = noiseSrc();
    b.connect(filt(type, freq, q ?? 0.8)).connect(env(at, att ?? 0.001, amp, dec)).connect(dest || out);
    src.push(b); end = Math.max(end, at + (att ?? 0.001) + dec + 0.05);
  };
  const metal = (dec, amp, freq, dest) => {
    const hp = filt('highpass', freq * 0.7), bp = filt('bandpass', freq, 0.8);
    hp.connect(bp).connect(env(t, 0.001, amp, dec)).connect(dest || out);
    for (const fr of [205.3, 304.4, 369.6, 522.7, 540, 800]) { const o = osc('square', fr); o.connect(hp); src.push(o); }
    end = Math.max(end, t + dec + 0.05);
  };
  const sc = MAP.scale, L = sc.length, rt = MAP.root;
  const pcHz = (pc, lo) => { let f = mtof(12 + mod(pc, 12)); while (f < lo) f *= 2; return f; };
  const kick = pcHz(rt, 40), fifth = pcHz(rt + sc[Math.min(4, L - 1)], 100), third = pcHz(rt + sc[2 % L], 380);
  const K = D.kick, Sn = D.snare, H = D.hat;
  if (kit === 'hand') {
    if (piece === 0) { const cg = pcHz(rt + sc[Math.min(4, L - 1)], 150); tone(cg * 1.15, cg, 0.04, 0.22 + 0.35 * K.dec, v * 0.65); nz(0.02, v * 0.12, 'bandpass', 1600, 1.5); }
    else if (piece === 1) { const sl = pcHz(rt, 260); tone(sl * 1.12, sl, 0.02, 0.06 + 0.12 * Sn.beef, v * 0.35); nz(0.03 + 0.06 * Sn.nDec * 3, v * 0.42, 'bandpass', 1800 + Sn.nFreq * 0.3, 1.3); }
    else if (piece === 2) nz(H.dec * 1.3 + 0.02, v * 0.2, 'bandpass', 5500 + H.freq * 0.3, 1.6, 0.012);
    else tone(third * 1.1, third, 0.02, 0.15, v * 0.45);
  } else if (piece === 0) {
    let dest = out;
    if (K.drive > 0.12) { const ws = actx.createWaveShaper(); ws.curve = driveCurve(K.drive); ws.connect(out); dest = ws; }
    const f1 = kit === 'electro' ? kick : kick * 1.1;
    // Longer, deeper kicks carry more energy, so they're turned down to sit at the same level as short ones
    const kd = K.dec * (kit === 'electro' ? 1.25 : 0.75);
    tone(f1 * K.mul, f1, K.sweep, kd, v * 0.78 * clamp(Math.sqrt(0.3 / kd), 0.6, 1.1), K.tri ? 'triangle' : 'sine', dest);
    if (K.click > 0.03) nz(0.006 + 0.01 * K.click, v * 0.4 * K.click, 'highpass', 2200, 0.7, 0.0005, t, out);
  } else if (piece === 1) {
    // Snare world: tonal or noisy, snappy or beefy, rim-like or clap-like, clean or dusty
    let dest = out;
    if (kit === 'lofi') {
      const lp = filt('lowpass', Sn.lp, 0.8); lp.connect(out); dest = lp;
      if (Sn.dust > 0.2) { const ws = actx.createWaveShaper(); ws.curve = driveCurve(Sn.dust); ws.connect(lp); dest = ws; }
    }
    const body = pcHz(rt + sc[Math.min(4, L - 1)], 150) * (1 - 0.22 * Sn.beef);
    const nAmt = v * 0.44 * (1 - 0.55 * Sn.tone) * (1 - 0.5 * Sn.rim);
    tone(body * 1.5, body, 0.03, Sn.toneDec * (1 + Sn.beef), v * 0.4 * (0.25 + Sn.tone) * (0.6 + 0.5 * Sn.beef), 'triangle', dest);
    const nClaps = kit === 'acoustic' ? 1 : Sn.claps, gapT = 0.0105;
    for (let i = 0; i < nClaps - 1; i++) nz(0.01, nAmt * 0.9, 'bandpass', Sn.nFreq * 0.8, 1.2, 0.001, t + i * gapT, dest);
    nz(Sn.nDec * (1 + 0.5 * Sn.beef), nAmt, 'bandpass', Sn.nFreq, Sn.nQ, 0.001, t + (nClaps - 1) * gapT, dest);
    if (Sn.snap > 0.1) nz(0.005 + 0.008 * Sn.snap, v * 0.3 * Sn.snap, 'highpass', 4000, 0.7, 0.0005, t, dest);
    if (Sn.rim > 0.25) { const bp = filt('bandpass', 1900, 6); bp.connect(dest); tone(pcHz(rt + 7, 700), pcHz(rt + 7, 700), 0.001, 0.02 + 0.03 * Sn.rim, v * 0.5 * Sn.rim, 'square', bp); }
    if (kit === 'lofi' && Sn.dust > 0.15) nz(0.12 + 0.1 * Sn.dust, v * 0.05 * Sn.dust, 'highpass', 5000, 0.7, 0.001, t, dest);
  } else if (piece === 2) {
    let dest = out;
    if (kit === 'lofi') { const lp = filt('lowpass', Math.min(H.freq * 0.75, 7000), 0.7); lp.connect(out); dest = lp; }
    const dec = open ? H.open : H.dec;
    if (H.metal > 0.2 || kit === 'electro') metal(dec, v * 0.2 * Math.max(H.metal, 0.4), H.freq, dest);
    if (H.metal < 0.8) nz(dec, v * 0.2 * (1 - H.metal * 0.6), 'bandpass', H.freq, H.q, 0.001, t, dest);
  } else {
    if (kit === 'acoustic') tone(fifth * 1.35, fifth, 0.1, 0.35, v * 0.6);
    else if (kit === 'electro') { const cb = pcHz(rt + 7, 500), bp = filt('bandpass', cb * 1.25, 1.5); bp.connect(env(t, 0.001, v * 0.3, 0.14)).connect(out); for (const fr of [cb, cb * 1.5]) { const o = osc('square', fr); o.connect(bp); src.push(o); } end = t + 0.25; }
    else if (D.perc === 'shaker') nz(0.07, v * 0.2, 'bandpass', 6500, 1.6, 0.015);
    else if (D.perc === 'rim') { const bp = filt('bandpass', 1800, 5); bp.connect(out); tone(pcHz(rt + 7, 700), pcHz(rt + 7, 700), 0.001, 0.035, v * 0.45, 'square', bp); }
    else tone(fifth * 1.3, fifth, 0.08, 0.3, v * 0.55);
  }
  src.forEach(o => { o.start(t); o.stop(end); });
  voiceEnds.push(end);
  setTimeout(() => { try { out.disconnect(); } catch (e) {} }, (end - now + 0.5) * 1000);
}
