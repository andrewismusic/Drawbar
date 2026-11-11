// Knobs: drawn like a stroke, thin at zero and thick at full (the ring grows thicker with value)
import { COPIES, TURNS } from '../canvas/index.js';
import { $ } from './dom.js';
import { clamp } from './math.js';
import { rebuild } from './settings.js';
import { MIX_DEF, checkpoint, mix, prefs, savePrefs, score, ui } from './state.js';
import { syncUI } from './ui.js';
import { redrawSoon } from '../render/compose.js';
import { applySpace, applyTone, applyVolumes } from '../sound/graph.js';
import { PALETTE } from '../styles/index.js';
import { world } from '../worlds/index.js';

export function ringPath(f0, f1) {
  const n = Math.max(2, Math.ceil((f1 - f0) * 60)), r = 17, out = [], inn = [];
  const wAt = f => 0.6 + 5.4 * f, pt = (a, rr) => [22 + rr * Math.sin(a), 22 - rr * Math.cos(a)];
  for (let i = 0; i <= n; i++) {
    const f = f0 + (f1 - f0) * i / n, a = (-135 + 270 * f) * Math.PI / 180, w = wAt(f);
    out.push(pt(a, r + w / 2)); inn.push(pt(a, r - w / 2));
  }
  const fmt = q => q[0].toFixed(2) + ' ' + q[1].toFixed(2);
  const [cx, cy] = pt((-135 + 270 * f1) * Math.PI / 180, r);
  return { d: 'M' + out.map(fmt).join('L') + 'L' + inn.reverse().map(fmt).join('L') + 'Z', cx, cy, cr: wAt(f1) / 2 };
}
export const TRACK_D = ringPath(0, 1);
export function knob(el, o) {
  el.innerHTML = `<svg viewBox="0 0 44 44" aria-hidden="true"><g fill="#232839"><path d="${TRACK_D.d}"/><circle cx="${TRACK_D.cx}" cy="${TRACK_D.cy}" r="${TRACK_D.cr}"/></g><g class="ka"><path/><circle/></g></svg><span class="kv"></span>`;
  const ka = el.querySelector('.ka'), kp = ka.querySelector('path'), kc = ka.querySelector('circle'), kv = el.querySelector('.kv');
  const off = () => el.getAttribute('aria-disabled') === 'true';
  const isInt = () => typeof o.int === 'function' ? o.int() : !!o.int, pxOf = () => typeof o.px === 'function' ? o.px() : o.px;
  const k = {
    draw() {
      const [lo, hi] = o.range(), v = o.get(), f = clamp((v - lo) / (hi - lo), 0, 1);
      const rp = ringPath(0, Math.max(f, 0.001));
      kp.setAttribute('d', rp.d); kc.setAttribute('cx', rp.cx); kc.setAttribute('cy', rp.cy); kc.setAttribute('r', rp.cr);
      ka.setAttribute('fill', o.color ? o.color(v) : '#ece8dc');
      kv.textContent = o.fmt(v);
      el.setAttribute('aria-valuenow', o.fmt(v));
    },
  };
  const put = v => {
    const [lo, hi] = o.range();
    v = clamp(v, lo, hi);
    if (isInt()) v = Math.round(v);
    if (v === o.get()) return;
    o.set(v); k.draw();
  };
  let drag = null;
  el.addEventListener('pointerdown', e => { if (off()) return; drag = { y: e.clientY, x: e.clientX, v: o.get(), started: false }; try { el.setPointerCapture(e.pointerId); } catch (err) {} e.preventDefault(); });
  el.addEventListener('pointermove', e => {
    if (!drag) return;
    const [lo, hi] = o.range(), nv = drag.v + ((e.clientX - drag.x) - (e.clientY - drag.y)) * (hi - lo) / pxOf();
    if (!drag.started && (isInt() ? Math.round(nv) !== drag.v : Math.abs(nv - drag.v) > 0.004)) { drag.started = true; o.onStart && o.onStart(); }
    if (drag.started) put(nv);
  });
  const end = () => { if (drag) { if (drag.started) o.onEnd && o.onEnd(); drag = null; } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('dblclick', () => { const d = o.def ? o.def() : null; if (off() || d == null) return; o.onStart && o.onStart(); put(d); o.onEnd && o.onEnd(); });
  el.addEventListener('keydown', e => {
    if (off()) return;
    const [lo, hi] = o.range(), u = isInt() ? 1 : (hi - lo) / 50;
    const step = { ArrowUp: u, ArrowRight: u, ArrowDown: -u, ArrowLeft: -u, PageUp: u * 5, PageDown: -u * 5 }[e.key];
    if (step != null) { o.onStart && o.onStart(); put(o.get() + step); o.onEnd && o.onEnd(); e.preventDefault(); }
  });
  k.draw();
  return k;
}
export const mixKnobs = {};
export const P1 = { free: ['fscale', 0, 100, 'Size', v => Math.round(v)], kaleido: ['copies', 0, COPIES.length - 1, 'Copies', v => COPIES[v]], tiles: ['tiles', 2, 6, 'Tiles', v => v] };
export const P2 = { kaleido: ['spiral', 0, 1, 'Spiral', v => Math.round(v * 100), false], tiles: ['turns', 0, TURNS.length - 1, 'Turns', v => TURNS[v], true] };
P2.free = P2.kaleido;
// Each world caps how far the pattern knobs go (see worlds/index.js)
const capped = (mode, key, r) => {
  const L = world().limits;
  return key === 'copies' ? [r[0], Math.min(r[1], L.copies)] : key === 'tiles' ? [r[0], Math.min(r[1], L.tiles)] : key === 'turns' ? [r[0], Math.min(r[1], L.turns)] : r;
};
export const pm = () => score.mode;
export let pk1, pk2;
// The four sound knobs, the two level knobs, and the two pattern knobs
export function initKnobs() {
  for (const [id, key, onChange, col] of [['knDensity', 'density', () => {}, '#62c6ff'], ['knProb', 'prob', () => {}, '#f58bc0'], ['knSpace', 'space', () => applySpace(), '#5fe6c0'], ['knTone', 'tone', () => applyTone(), '#ffd76b']]) {
    mixKnobs[key] = knob($(id), {
      range: () => [0, 1], px: 170, def: () => MIX_DEF[key],
      get: () => mix[key], set: v => { mix[key] = v; onChange(); },
      fmt: v => Math.round(v * 100),
      color: () => col,
    });
  }
  for (const [id, key] of [['volTones', 'volTones'], ['volDrums', 'volDrums']]) knob($(id), {
    range: () => [0, 100], px: 160, def: () => 80, get: () => prefs[key], set: v => { prefs[key] = Math.round(v); applyVolumes(); savePrefs(); },
    fmt: v => Math.round(v), color: () => '#ece8dc',
  });
  pk1 = knob($('pk1'), {
    range: () => capped(pm(), P1[pm()][0], P1[pm()].slice(1, 3)), int: true, px: () => pm() === 'kaleido' ? 140 : pm() === 'free' ? 220 : 90, def: () => pm() === 'free' ? 50 : null,
    get: () => score[P1[pm()][0]],
    set: v => { score[P1[pm()][0]] = v; redrawSoon(); },
    fmt: v => P1[pm()][4](v),
    color: () => PALETTE[ui.color], onStart: checkpoint, onEnd: () => { rebuild(); syncUI(); },
  });
  pk2 = knob($('pk2'), {
    range: () => capped(pm(), P2[pm()][0], P2[pm()].slice(1, 3)), int: () => P2[pm()][5], px: () => pm() === 'kaleido' ? 160 : 90, def: () => pm() === 'kaleido' ? 0 : null,
    get: () => score[P2[pm()][0]],
    set: v => { score[P2[pm()][0]] = P2[pm()][5] ? v : Math.round(v * 100) / 100; redrawSoon(); },
    fmt: v => P2[pm()][4](v),
    color: () => PALETTE[ui.color], onStart: checkpoint, onEnd: () => { rebuild(); syncUI(); },
  });
}
