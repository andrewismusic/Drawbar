// Settings, undo and randomize
// Re-read the drawing: hidden strokes, the arrangement, and the sound settings that follow from it
import { COPIES, TURNS } from '../canvas/index.js';
import { endPreview, preview } from './clips.js';
import { $ } from './dom.js';
import { clamp, ease } from './math.js';
import { SET_KEYS, checkpoint, mix, prefs, redoStack, savePrefs, score, seeId, snap, ui, undoStack } from './state.js';
import { prepare } from './stroke.js';
import { setBpm } from './transport.js';
import { mapInput, syncUI } from './ui.js';
import { appendStroke, checkHiddenSoon, ensureCanvases, fb, markGroupsDirty, refreshHidden, releaseCanvases } from '../render/compose.js';
import { ARR, rearrange } from '../sound/arranger.js';
import { applyAudio, applyTempoParams } from '../sound/graph.js';
import { MAP, applyKeyScale, useMap } from '../sound/maps.js';
import { SCALE_DEFS } from '../sound/vocab.js';
import { matIndex } from '../styles/index.js';
import { WORLD, world } from '../worlds/index.js';
import { layout } from './layout.js';

// lazy: leave the hidden-stroke test for a moment later (it runs a few ms per frame), used while erasing
export function rebuild(tc, lazy) { if (fb.width > 8) { ensureCanvases(); if (lazy) checkHiddenSoon(); else refreshHidden(); } rearrange(); markGroupsDirty(); applyAudio(tc); }
// A stroke was just added on top: draw only that stroke, re-arrange the music, and test for hidden strokes a moment later
export function strokeAdded(s) { ensureCanvases(); appendStroke(s); checkHiddenSoon(); rearrange(); applyAudio(); }
// The hidden-stroke test found a change: hidden strokes are silent, so re-arrange
export function hiddenChanged() { rearrange(); applyAudio(); }
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
  const r = Math.random, w = world(), L = w.limits;
  let map = Math.floor(r() * 1000);
  if (map === score.map) map = (map + 1 + Math.floor(r() * 998)) % 1000;
  const target = {
    map, timing: score.timing, inst: score.inst,
    tempo: prefs.rTempo ? 56 + Math.floor(r() * 76) : score.tempo,
    key: Math.floor(r() * 12), scale: Math.floor(r() * SCALE_DEFS.length),
    mode: prefs.rMode ? w.modes[Math.floor(r() * w.modes.length)] : score.mode,
    copies: prefs.rFolds ? Math.floor(Math.pow(r(), 1.6) * (L.copies + 1)) : score.copies,
    spiral: prefs.rFolds ? (r() < 0.5 ? 0 : Math.round(r() * 100) / 100) : score.spiral,
    tiles: prefs.rFolds ? 2 + Math.floor(r() * (L.tiles - 1)) : score.tiles,
    turns: prefs.rFolds ? Math.floor(r() * (L.turns + 1)) : score.turns,
    mirror: prefs.rFolds ? r() < 0.6 : score.mirror,
    frot: prefs.rFolds ? r() < 0.4 && L.rotate : score.frot, fmirror: prefs.rFolds ? r() < 0.35 : score.fmirror,
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
// Tabs: each world keeps its own drawing, sound knobs, undo history, tool and material while you are away from it.
// A world you have not visited yet starts empty, from its own pattern settings, keeping the current map, key, tempo and timing.
const worldStash = {};
export function switchWorld(id) {
  if (id === score.world || !WORLD[id] || anim) return;
  if (preview) endPreview();
  releaseCanvases();   // a tab you are not looking at keeps only its drawing as plain data: no layers, no sound
  worldStash[score.world] = { snap: snap(), mix: { ...mix }, undo: undoStack.splice(0), redo: redoStack.splice(0), tool: ui.tool, color: ui.color };
  const w = WORLD[id], st = worldStash[id];
  if (st) {
    undoStack.push(...st.undo); redoStack.push(...st.redo);
    ui.tool = st.tool; ui.color = st.color; Object.assign(mix, st.mix);
    restore(st.snap);
  } else {
    const { tool, color, ...set } = w.start;
    ui.tool = tool; ui.color = matIndex(color);
    restore({ set: { ...snap().set, ...set, world: id }, strokes: [] });
  }
  prefs.world = id; savePrefs();
  layout();   // the Pixel world draws at its own resolution
}
