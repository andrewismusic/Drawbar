// Scheduling: schedule() every 25 ms with 120 ms lookahead. Density = Euclidean thinning, Probability = seeded hash.
import { fs } from '../canvas/index.js';
import { clamp, fold, hash32, hashFrac, lerp, mod, mtof, mulberry32 } from '../core/math.js';
import { mix, score } from '../core/state.js';
import { audioOffset, audioReady, beatAt, lastEnd, paused, pausedTotal, playing, rotAt, secAt, sessionNow, setLastEnd } from '../core/transport.js';
import { ARR, LANES, euclid } from './arranger.js';
import { actx, spaceAmt, toneEnv } from './graph.js';
import { drumHit, voice } from './instruments.js';
import { MAP } from './maps.js';
import { N } from './nodes.js';
import { lineNote } from './pitch.js';
import { TOOL } from '../core/tools.js';
import { notePulse } from './pulse.js';

export function playEvent(lane, ev, S) {
  const at = S + pausedTotal - audioOffset;
  if (at < actx.currentTime - 0.02) return;
  const t = Math.max(at, actx.currentTime);
  notePulse(S, ev.w, lane.role === 'drums', ev.s && ev.s.id);   // for visuals that react to the music
  if (lane.role === 'drums') { drumHit(ev.piece, t, ev.w, ev.open); return; }
  const pSec = lane.base === 'beat' ? lane.period * 60 / score.tempo : lane.period;
  const dur = clamp((ev.len || 0.1) * pSec, 0.08, 3);
  const inst = MAP.lineInst[(TOOL[ev.s.tool] && TOOL[ev.s.tool].voice) || ev.s.tool] || 'piano';
  if (ev._rs != null) {
    // Free mode turning: each note is read from where its point has turned to. Higher on screen bends it up, and it drifts across the stereo field
    ev = { ...ev, shift: (ev.shift || 0) + Math.round(Math.max(MAP.hy, 0.35) * (ev.y - ev._ry) / 2 * fs() * MAP.span * MAP.rot.pitch), pan: lerp(ev.pan, clamp(ev._rx * fs(), -1, 1) * 0.6, MAP.rot.pan) };
  }
  const bright = ARR.P.bright * MAP.colorMod[(ev.s.color) % 7].bright * toneEnv(inst);
  voice(inst, fold(mtof(lineNote(ev, inst))), t, ev.w * (inst === 'pad' ? 0.9 : 0.85), inst === 'pad' ? Math.max(dur, 1.2) : dur, ev.pan, bright, ev.s);
}
export function scheduleGrains(S0, S1) {
  const amt = ARR.amt.granular * spaceAmt();
  if (amt <= 0.01) return;
  const rate = 6 + 14 * amt;
  for (let i = Math.ceil(S0 * rate); i / rate < S1; i++) {
    const r = mulberry32(hash32(MAP.n, i, 31)), tap = N.taps[mod(i, 6)];
    const t = i / rate + pausedTotal - audioOffset + r() * 0.02;
    if (t < actx.currentTime) continue;
    const g = 0.06 + 0.12 * r(), semi = r() < 0.5 ? 0 : MAP.grainPitch, slope = 1 - Math.pow(2, semi / 12);
    let d0 = 0.08 + r() * 1.0;
    if (slope < 0) d0 = Math.max(d0, -slope * g + 0.02);
    tap.d.delayTime.setValueAtTime(d0, t); tap.d.delayTime.linearRampToValueAtTime(d0 + slope * g, t + g);
    tap.g.gain.setValueAtTime(0, t); tap.g.gain.linearRampToValueAtTime(0.35, t + g / 2); tap.g.gain.linearRampToValueAtTime(0, t + g);
  }
}
export const LOOKAHEAD = 0.12;
export function schedule() {
  if (!playing || paused || !audioReady || actx.state !== 'running' || !ARR) return;
  const S0 = lastEnd, S1 = sessionNow() + LOOKAHEAD;
  if (S1 <= S0) return;
  const B0 = beatAt(S0), B1 = beatAt(S1);
  scheduleGrains(S0, S1);
  LANES.forEach((lane, li) => {
    const P = lane.period, n = lane.events.length;
    if (!(P > 0) || !n) return;
    const keepK = Math.round(mix.density * n);
    const beat = lane.base === 'beat', lo = (beat ? B0 : S0) - lane.origin, hi = (beat ? B1 : S1) - lane.origin;
    for (let c = Math.floor(lo / P) - 1; c <= Math.floor(hi / P); c++) for (const ev of lane.events) {
      const tt = (c + ev.ph) * P;
      if (tt < lo || tt >= hi) continue;
      // Density skips notes in a fixed, evenly spread pattern; probability rolls a repeatable die per note per cycle
      if (keepK < n && !euclid(keepK, n, ev.idx, 0)) continue;
      if (mix.prob < 1 && hashFrac(ev.s.id, ev.idx, c, li, 913) >= mix.prob) continue;
      let Sev = beat ? secAt(tt + lane.origin) : tt + lane.origin;
      if (lane.gate && !lane.gate(Math.floor(beatAt(Sev) / 4))) continue;
      if (lane.free && score.frot && ev.x != null) {
        // Turning also reshapes the rhythm: points passing through this map's quiet side drop out, and the rest lean late as they swing round
        const th = rotAt(beatAt(Sev)), c = Math.cos(th), sn = Math.sin(th), rx = ev.x * c - ev.y * sn, ry = ev.x * sn + ev.y * c, ang = Math.atan2(ry, rx);
        if (Math.cos(ang - MAP.rot.gateA) < MAP.rot.gate) continue;
        Sev += MAP.rot.swing * (0.5 + 0.5 * Math.sin(ang)) * 15 / score.tempo;
        playEvent(lane, { ...ev, _rs: 1, _rx: rx, _ry: ry }, Sev);
        continue;
      }
      playEvent(lane, ev, Sev);
    }
  });
  // Effects swell and ebb with the turn, on two of this map's sends
  if (score.mode === 'free' && score.frot && N._base) {
    const th = rotAt(beatAt(S1)), t = actx.currentTime, prm = { delay: N.dlySend.gain, reverb: N.melRev.gain, gran: N.granSend.gain, shim: N.shimSend.gain };
    for (const [k, ph, d] of MAP.rot.fx) prm[k].setTargetAtTime(Math.max(0, N._base[k] * (1 + d * Math.sin(th + ph)) + (k === 'shim' || k === 'gran' ? 0.08 * d * (1 + Math.sin(th + ph)) : 0)), t, 0.15);
  }
  setLastEnd(S1);
}
