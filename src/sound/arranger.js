// Hidden layer: the arranger turns strokes into lanes of note events, drums (Euclidean), loops, drones and modulation slots
import { COPIES, cycleBars, cycleBeats, fs, kCopies, mirrored, patternAmount, rawH, sPhase, strokePhase, tileGeo } from '../canvas/index.js';
import { TAU, clamp, hashFrac, mod, th } from '../core/math.js';
import { score } from '../core/state.js';
import { animEventIdx, sampleArc } from '../core/stroke.js';
import { TOOL } from '../core/tools.js';
import { HIDDEN } from '../render/compose.js';
import { MAP } from './maps.js';
import { BUDGET, FX } from './vocab.js';

// Material colour as an angle. Fixed at the 15 materials of v18, so adding materials never changes the music of a drawing.
const HUE_STEPS = 15;
export let ARR = null, LANES = [];
export function rearrange() { ARR = arrange(); LANES = ARR.lanes; }
export const metric = st => st % 16 === 0 ? 1 : st % 8 === 0 ? 0.85 : st % 4 === 0 ? 0.7 : st % 2 === 0 ? 0.45 : 0.25;
export const nearestOf = (list, b) => list.reduce((best, o) => Math.abs(Math.log(o / Math.max(b, 0.1))) < Math.abs(Math.log(best / Math.max(b, 0.1))) ? o : best, 4);
export const phraseBeats = b => nearestOf([2, 4, 8, 16], b);
export const loopBeats = b => nearestOf([1, 2, 3, 4, 6, 8, 12, 16], b);
export const euclid = (k, n, i, rot) => ((mod(i - rot, n) * k) % n) < k;

export function select(cands, budget, steps, poly, clocked, swing) {
  const best = new Map();
  for (const c of cands) {
    let step;
    if (clocked) { step = Math.round(c.ph * steps) % steps; c.ph = step / steps; } else step = Math.floor(c.ph * steps * 2);
    c.step = step;
    const ms = metric(clocked ? step : step >> 1);
    c.score = c.w * (0.55 + 0.45 * ms) * (1 + 0.8 * c.rec) * (0.8 + 0.4 * hashFrac(c.s.id, step, c.m ? 7 : 3));
    const key = poly ? step + '|' + c.s.id : step;
    const prev = best.get(key);
    if (!prev || c.score > prev.score) best.set(key, c);
  }
  const all = [...best.values()].sort((a, b) => b.score - a.score);
  const keep = all.slice(0, Math.max(0, Math.round(budget)));
  let kw = 0, dw = 0;
  keep.forEach(c => kw += c.score); all.slice(keep.length).forEach(c => dw += c.score);
  keep.sort((a, b) => a.ph - b.ph);
  for (let i = 0; i < keep.length; i++) {
    const c = keep[i], nx = keep[(i + 1) % keep.length];
    let gap = mod(nx.ph - c.ph, 1);
    if (keep.length === 1 || gap === 0) gap = 1;
    c.len = gap;
  }
  if (clocked && swing) for (const c of keep) if (c.step % 2 === 1) c.ph += swing * 0.5 / steps;
  return { keep, kw, dw };
}

export function arrange() {
  // Strokes hidden under newer ones are out of the music too
  const zoom = fs();   // Size: what you hear is read from the drawing as it appears
  const S = score.strokes.filter(s => !HIDDEN.has(s)), n = S.length, kale = score.mode === 'kaleido', clocked = score.timing === 'clocked';
  let hmin = 1, hmax = 0;
  for (const s of S) for (let i = 0; i < s.pts.length; i += 3) { const h = rawH(s.pts[i][0], s.pts[i][1]); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h); }
  const hspan = Math.max(hmax - hmin, 0.2);
  const relH = h => clamp(0.55 * h + 0.45 * (h - hmin) / hspan, 0, 1);
  let maxLen = 0.01;
  for (const s of S) maxLen = Math.max(maxLen, s._len);
  for (const s of S) {
    let hs = 0, c = 0;
    for (let i = 0; i < s.pts.length; i += 3) { hs += relH(rawH(s.pts[i][0], s.pts[i][1])); c++; }
    s._hm = hs / Math.max(c, 1);
    const hue = TAU * s.color / HUE_STEPS;
    s._f = [s._hm, s._len / maxLen, Math.min(s._avgSp / 3, 1), Math.min(s._curv / 25, 1), Math.cos(hue), Math.sin(hue), Math.min(s._sz / 12, 1), s.tool === 'glow' ? 1 : 0, s.tool === 'beads' ? 1 : 0];
  }
  let len = 0, hsum = 0, h2 = 0, anim = 0, cc = 0, cs = 0, spd = 0;
  for (const s of S) { len += s._len; hsum += s._hm; h2 += s._hm * s._hm; spd += s._f[2]; if (TOOL[s.tool].kind !== 'static') anim++; cc += s._f[4]; cs += s._f[5]; }
  const m = n ? hsum / n : 0.5, sd = n ? Math.sqrt(Math.max(h2 / n - m * m, 0)) : 0;
  const f = [Math.min(n / 14, 1), Math.min(len / 18, 1), m, Math.min(sd * 3, 1), patternAmount(), mirrored() ? 1 : 0, n ? anim / n : 0, n ? Math.hypot(cc, cs) / n : 0, n ? spd / n : 0];
  const g = MAP.W.map(row => row.reduce((a, w, i) => a + w * (f[i] - 0.4), 0));
  const P = { wet: 0.24 + 0.34 * th(g[1]), bright: Math.pow(2, 1.1 * Math.tanh(g[2])), dens: (0.6 + 0.6 * th(g[0])) * MAP.density, swing: clocked ? MAP.swing * th(g[4]) : 0 };
  const amt = {};
  FX.forEach((e, i) => amt[e] = MAP.fx.includes(e) ? 0.2 + 0.7 * th(g[5 + i]) : 0);

  const statics = S.filter(s => TOOL[s.tool].kind === 'static');
  const recOf = s => n > 1 ? S.indexOf(s) / (n - 1) : 1;
  const lanes = [];
  let kept = 0, dropped = 0;
  const tonal = score.inst !== 'drums';
  if (statics.length && tonal) {
    let cands = [], period, base, origin, steps;
    if (score.mode !== 'free') {
      const KC = kale ? kCopies() : null, kStep = kale ? Math.max(1, Math.round(KC.length / 24)) : 1;
      const TG = kale ? null : tileGeo();
      for (const s of statics) {
        const rec = recOf(s);
        for (const q of sampleArc(s, 0.05)) {
          const a = Math.atan2(q.y, q.x), r0 = Math.hypot(q.x, q.y) * zoom, w = 0.45 + 0.55 * (1 - q.sn);
          if (kale) {
            // The pattern turns clockwise; every copy sounds as it passes the top. Smaller copies sit lower and quieter
            for (let k = 0; k < KC.length; k += kStep) {
              const cp = KC[k], h = relH(r0 * cp.s), wk = w * (0.35 + 0.65 * cp.s), ak = a + cp.a;
              cands.push({ ph: sPhase(ak), h, w: wk, s, rec, m: k > 0, pan: clamp(Math.cos(ak) * r0 * cp.s, -1, 1) * 0.6 });
              if (score.mirror) cands.push({ ph: sPhase(-a + cp.a), h: clamp(2 * s._hm - h, 0, 1), w: wk * 0.9, s, rec, m: true, pan: -clamp(Math.cos(ak) * r0 * cp.s, -1, 1) * 0.6 });
            }
          } else {
            // Tiles: each turned (and mirrored) copy sounds as it rises past the reading line; on hexagons the in-between row answers half a cycle later
            const { a: A, CH, rowH, hex } = TG;
            TG.mats.forEach((M, i) => {
              const x = (M[0] * q.x + M[2] * q.y) * zoom, y = (M[1] * q.x + M[3] * q.y) * zoom, hr = mod(x, A) / A, h = relH(hr);
              cands.push({ ph: mod(y, CH) / CH, h, w: w * (i ? 0.75 : 0.9), s, rec, m: i > 0, pan: (hr * 2 - 1) * 0.6 });
              if (hex) { const h2 = mod(x + A / 2, A) / A; cands.push({ ph: mod(y + rowH, CH) / CH, h: relH(h2), w: w * 0.65, s, rec, m: true, pan: (h2 * 2 - 1) * 0.6 }); }
            });
          }
        }
      }
      period = cycleBeats(); base = 'beat'; origin = 0; steps = cycleBars() * 16;
    } else {
      // Free mode: each mark is a phrase; marks take turns along a path from the newest
      const order = [], rest = statics.slice();
      let cur = rest.pop();
      while (cur) {
        order.push(cur);
        let bi = -1, bd = 1e9;
        rest.forEach((s, i) => { const d = Math.hypot(s._mx - cur._mx, s._my - cur._my); if (d < bd) { bd = d; bi = i; } });
        cur = bi >= 0 ? rest.splice(bi, 1)[0] : null;
      }
      let off = 0;
      for (const s of order) {
        const plen = clocked ? phraseBeats(s._dur * score.tempo / 60) : Math.max(s._dur, 0.5), rec = recOf(s);
        for (const i of animEventIdx(s)) {
          const pt = s.pts[i], sn = Math.min(s._sp[i] / 2.2, 1);
          const pos = pt[2] / s._dur * plen * 0.98, h = relH(rawH(pt[0], pt[1])), w = 0.45 + 0.55 * (1 - sn), pan = clamp(pt[0] * fs(), -1, 1) * 0.6;
          cands.push({ pos: off + pos, h, w, s, rec, m: false, pan, x: pt[0], y: pt[1] });
          // Mirrored: the reflection answers half a phrase later, a step away and from the other side
          if (score.fmirror) cands.push({ pos: off + mod(pos + plen / 2, plen), h, w: w * 0.6, s, rec, m: true, pan: -pan, shift: MAP.canonInt, x: -pt[0], y: pt[1] });
        }
        off += plen;
      }
      for (const c of cands) c.ph = c.pos / off;
      period = off; base = clocked ? 'beat' : 'sec';
      origin = clocked ? order[0].startBeat : order[0].start;
      steps = clocked ? Math.round(off * 4) : Math.max(8, Math.round(off * 8));
    }
    const bars = base === 'beat' ? period / 4 : period * score.tempo / 240;
    const r = select(cands, BUDGET.lines * P.dens * bars, steps, true, clocked, P.swing);
    kept += r.kw; dropped += r.dw;
    lanes.push({ role: 'lines', base, period, origin, events: r.keep, free: score.mode === 'free' });
  }
  if (score.inst !== 'tones' && n >= (tonal ? 2 : 1)) lanes.push(buildDrums(S, P, !tonal));
  const loops = S.filter(s => TOOL[s.tool].kind === 'anim');
  const others = loops.slice(0, -1), slots = Math.max(1, MAP.maxLoops - 1), G = Math.max(1, Math.ceil(others.length / slots));
  const C = COPIES[score.copies];
  if (tonal) loops.forEach((s, j) => {
    // Each loop keeps its own length and its own start, so loops drift against each other instead of restarting
    // together. Clocked: both are rounded to the nearest 16th note (a quarter of a beat).
    s._Pb = Math.max(0.5, Math.round(s._dur * score.tempo / 60 * 4) / 4);
    const period = clocked ? s._Pb : s._dur, base = clocked ? 'beat' : 'sec', origin = clocked ? s.startBeat : s.start;
    const steps = clocked ? s._Pb * 4 : Math.max(8, Math.round(s._dur * 8)), rec = recOf(s);
    const cands = animEventIdx(s).map(i => {
      const pt = s.pts[i], sn = Math.min(s._sp[i] / 2.2, 1);
      return { ph: pt[2] / s._dur, h: relH(rawH(pt[0], pt[1])), w: 0.4 + 0.5 * (1 - sn), s, rec, m: false, pan: clamp(pt[0] * zoom, -1, 1) * 0.6 };
    });
    const r = select(cands, Math.max(3, 8 * P.dens), steps, true, clocked, P.swing);
    kept += r.kw; dropped += r.dw;
    if (kale && C > 1 && C <= 7 && score.spiral < 0.3) {
      // Canon: fainter echoes a fold later, transposed or mirrored
      const echoes = [];
      for (let k = 1; k <= Math.min(C - 1, 2); k++) for (const ev of r.keep)
        echoes.push({ ...ev, ph: mod(ev.ph + k / C, 1), h: score.mirror && k % 2 ? clamp(2 * s._hm - ev.h, 0, 1) : ev.h, shift: score.mirror && k % 2 ? 0 : MAP.canonInt * k, w: ev.w * Math.pow(0.45, k), pan: -ev.pan });
      r.keep.push(...echoes);
    }
    const isNewest = j === loops.length - 1;
    lanes.push({ role: 'loop', base, period, origin, events: r.keep, gate: isNewest || G === 1 ? null : bar => mod(Math.floor(bar / 2), G) === j % G, gateBeats: isNewest || G === 1 ? 0 : 8 * G });
  });
  // Index events so density can thin them in a repeatable pattern
  for (const lane of lanes) { lane.events.sort((a, b) => a.ph - b.ph); lane.events.forEach((e, i) => e.idx = i); }
  const drones = tonal ? S.filter(s => s.tool === 'ripple').slice(-3) : [];
  const overflow = dropped / Math.max(kept + dropped, 1e-6);
  const nSlots = clamp(n - MAP.modStart, 0, MAP.targets.length);
  const mods = [];
  for (let k = 0; k < nSlots; k++) {
    const s = S[n - 1 - k];
    mods.push({ target: MAP.targets[k], rateBars: [8, 4, 2, 1, 0.5][Math.min(4, Math.floor(s._f[2] * 5))], depth: clamp((0.3 + 0.7 * s._f[1]) * MAP.modMul * (1 + overflow), 0, 1.4) });
  }
  return { P, amt, lanes, drones, mods, overflow };
}

export function buildDrums(list, P, solo) {
  // Alongside tones: soft and sparse. On their own: fuller, but still shaped by the whole drawing
  const pcs = solo ? [{ k: 2, rot: 0, v: 0.6 }, { k: 1, rot: 4, v: 0.5 }, { k: 4, rot: 2, v: 0.42 }, { k: 0, rot: 0, v: 0.45 }]
    : [{ k: 1, rot: 0, v: 0.42 }, { k: 0, rot: 4, v: 0.36 }, { k: 2, rot: 2, v: 0.3 }, { k: 0, rot: 0, v: 0.34 }];
  const best = [0, 0, 0, 0];
  for (const s of list) {
    const band = Math.min(3, Math.floor(s._hm * 4)), pi = MAP.drumPerm[band], pc = pcs[pi];
    pc.k += Math.round(Math.min(s._len, 2) * MAP.drumK[pi] * (solo ? 1 : 0.5));
    const ph = strokePhase(s);
    if (s._len > best[pi]) { best[pi] = s._len; pc.rot = (Math.round(ph * 16) + (pi === 1 ? 4 : 0)) % 16; }
    pc.v = Math.max(pc.v, (solo ? 0.45 : 0.3) + 0.2 * (1 - s._f[2]));
  }
  (solo ? [5, 4, 10, 6] : [3, 2, 5, 3]).forEach((c, i) => pcs[i].k = Math.min(pcs[i].k, c));
  const budget = solo ? Math.max(6, 16 * P.dens) : Math.max(3, 8 * P.dens);
  let tot = pcs.reduce((a, p) => a + p.k, 0);
  while (tot > budget) { const i = pcs[2].k > 2 ? 2 : pcs[3].k > 0 ? 3 : pcs[2].k > 0 ? 2 : 1; if (pcs[i].k <= 0) break; pcs[i].k--; tot--; }
  const ev = [];
  for (let bar = 0; bar < 2; bar++) pcs.forEach((p, i) => {
    const k = p.k + (bar === 1 && i === 3 && p.k > 0 ? 1 : 0);
    if (!k) return;
    for (let st = 0; st < 16; st++) if (euclid(k, 16, st, p.rot)) {
      let ph = (bar * 16 + st) / 32;
      if (P.swing && st % 2) ph += P.swing * 0.5 / 32;
      ev.push({ ph, piece: i, w: p.v * (st % 4 === 0 ? 1 : 0.78), s: list[0], open: i === 2 && hashFrac(MAP.n, bar, st) < MAP.dr.hat.openProb });
    }
  });
  return { role: 'drums', base: 'beat', period: 8, origin: 0, events: ev };
}
