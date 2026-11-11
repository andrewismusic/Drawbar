// Settings, undo and randomize
// Re-read the drawing: hidden strokes, the arrangement, and the sound settings that follow from it
import { COPIES, MODES, TURNS } from '../canvas/index.js';
import { $ } from './dom.js';
import { clamp, ease } from './math.js';
import { SET_KEYS, checkpoint, prefs, score, seeId, snap } from './state.js';
import { prepare } from './stroke.js';
import { setBpm } from './transport.js';
import { mapInput, syncUI } from './ui.js';
import { ensureCanvases, fb, markGroupsDirty, refreshHidden } from '../render/compose.js';
import { ARR, rearrange } from '../sound/arranger.js';
import { applyAudio, applyTempoParams } from '../sound/graph.js';
import { MAP, applyKeyScale, useMap } from '../sound/maps.js';
import { SCALE_DEFS } from '../sound/vocab.js';

export function rebuild(tc) { if (fb.width > 8) { ensureCanvases(); refreshHidden(); } rearrange(); markGroupsDirty(); applyAudio(tc); }
export function applySettings(st, tc) {
  if (st.map !== score.map || MAP.n !== st.map) { score.map = st.map; useMap(st.map); }
  for (const k of SET_KEYS) if (k !== 'map' && k !== 'tempo' && st[k] !== undefined) score[k] = st[k];
  // Clips from before Lattice and Tessellation became Tiles
  if (score.mode === 'lattice') { score.mode = 'tiles'; score.turns = score.mirror ? 1 : 0; }
  else if (score.mode === 'tess') { score.mode = 'tiles'; score.turns = 4; }
  score.copies = clamp(score.copies | 0, 0, COPIES.length - 1); score.fscale = clamp(+score.fscale || 50, 0, 100);
  score.tiles = clamp(score.tiles | 0 || 3, 2, 6); score.turns = clamp(score.turns | 0, 0, TURNS.length - 1);
  applyKeyScale();
  setTempo(st.tempo, true);
  rebuild(tc);
  syncUI();
}
export function restore(o) {
  score.strokes = o.strokes.map(x => { const s = { ...x, pts: x.pts.map(p => p.slice()) }; prepare(s); return s; });
  for (const s of score.strokes) seeId(s.id);
  applySettings(o.set);
}
export let anim = null;
export function randomize() {
  if (anim) return;
  checkpoint();
  const r = Math.random;
  let map = Math.floor(r() * 1000);
  if (map === score.map) map = (map + 1 + Math.floor(r() * 998)) % 1000;
  const target = {
    map, timing: score.timing, inst: score.inst,
    tempo: prefs.rTempo ? 56 + Math.floor(r() * 76) : score.tempo,
    key: Math.floor(r() * 12), scale: Math.floor(r() * SCALE_DEFS.length),
    mode: prefs.rMode ? MODES[Math.floor(r() * MODES.length)].id : score.mode,
    copies: prefs.rFolds ? Math.floor(Math.pow(r(), 1.6) * COPIES.length) : score.copies,
    spiral: prefs.rFolds ? (r() < 0.5 ? 0 : Math.round(r() * 100) / 100) : score.spiral,
    tiles: prefs.rFolds ? 2 + Math.floor(r() * 5) : score.tiles,
    turns: prefs.rFolds ? Math.floor(r() * TURNS.length) : score.turns,
    mirror: prefs.rFolds ? r() < 0.6 : score.mirror,
    frot: prefs.rFolds ? r() < 0.4 : score.frot, fmirror: prefs.rFolds ? r() < 0.35 : score.fmirror,
  };
  const d = $('dice'); d.classList.remove('roll'); void d.offsetWidth; d.classList.add('roll');
  // The pattern itself changes straight away; the sound glides into the new map
  Object.assign(score, { mode: target.mode, copies: target.copies, spiral: target.spiral, tiles: target.tiles, turns: target.turns, mirror: target.mirror, frot: target.frot, fmirror: target.fmirror });
  if (prefs.glide <= 0) { applySettings(target); return; }
  rebuild(); syncUI();
  anim = { t0: performance.now(), dur: prefs.glide, fromMap: score.map, fromTempo: score.tempo, target, swapped: false };
  mapInput.classList.add('flip');
}
export function stepRandomize(now) {
  const a = anim, p = clamp((now - a.t0) / a.dur, 0, 1), e = ease(p);
  // Count through the numbers like a flip clock, and glide the tempo
  mapInput.value = String(Math.round(a.fromMap + (a.target.map - a.fromMap) * e)).padStart(3, '0');
  setTempo(a.fromTempo + (a.target.tempo - a.fromTempo) * e, true);
  if (!a.swapped && p >= 0.5) {
    a.swapped = true;
    score.map = a.target.map; useMap(a.target.map);
    score.key = a.target.key; score.scale = a.target.scale;
    applyKeyScale();
    rebuild(Math.max(0.05, a.dur / 4000));
    syncUI();
  }
  if (p >= 1) { anim = null; mapInput.classList.remove('flip'); mapInput.value = String(score.map).padStart(3, '0'); rebuild(); syncUI(); }
}
export function setMap(n) {
  n = clamp(n | 0, 0, 999);
  if (n === score.map) { mapInput.value = String(n).padStart(3, '0'); return; }
  checkpoint();
  applySettings({ ...snap().set, map: n });
}
export function setTempo(v, silent) {
  v = clamp(Math.round(v), 40, 180);
  $('bpmVal').textContent = v; $('bpm').setAttribute('aria-valuenow', v);
  if (v === score.tempo) return;
  score.tempo = v; setBpm(v);
  if (ARR) applyTempoParams(silent ? 0.1 : 0.25);
}
