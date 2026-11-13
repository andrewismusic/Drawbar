// Controls: wiring for all buttons, preferences, full screen, and syncUI()
import { MODES, mirrored } from '../canvas/index.js';
import { endPreview, keepClip, page, preview, showPage } from './clips.js';
import { $ } from './dom.js';
import { toRgb } from './color.js';
import { openExport } from './export.js';
import { P1, P2, mixKnobs, pk1, pk2, pk3, pm } from './knobs.js';
import { isVisual, layout } from './layout.js';
import { anim, randomize, rebuild, restore, setMap, setTempo } from './settings.js';
import { drawSizeBar } from './sizebar.js';
import { checkpoint, prefs, redoStack, savePrefs, score, snap, ui, undoStack } from './state.js';
import { TOOL, TOOLS } from './tools.js';
import { paused, playing, setPaused, startAudio } from './transport.js';
import { MATS, PALETTE } from '../styles/index.js';
import { ink } from '../worlds/index.js';
import { switchWorld } from './settings.js';
import { TABS, WORLDS, world } from '../worlds/index.js';

export const mapInput = $('mapInput');
export const change = fn => { checkpoint(); fn(); rebuild(); syncUI(); };
// Preferences
export const settings = $('settings');
export const openSettings = open => { settings.hidden = !open; for (const b of document.querySelectorAll('.cogbtn')) b.setAttribute('aria-expanded', String(open)); };
export const showGlide = () => { $('prGlide').value = prefs.glide; $('prGlideOut').textContent = (prefs.glide / 1000).toFixed(1) + ' s'; };
export function applyView() {
  for (const b of $('shapeSeg').children) b.setAttribute('aria-pressed', String(b.dataset.v === prefs.shape));
  requestAnimationFrame(layout);
}
// Visual only: full screen, nothing else. Any tap comes back
export function setVisual(on) {
  if (on === isVisual()) return;
  if (on && page === 'clips') showPage('canvas');
  openSettings(false);
  $('app').classList.toggle('visual', on);
  if (on) { const el = document.documentElement; if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); }
  else if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  requestAnimationFrame(layout);
}
export function openStyles(open) { $('worldTabs').hidden = !open; $('styleBtn').setAttribute('aria-expanded', String(open)); }
export function openSound(open) {
  $('knobRow').hidden = !open; $('soundBtn').setAttribute('aria-pressed', String(open)); $('soundBtn').setAttribute('aria-expanded', String(open));
  if (open) for (const key in mixKnobs) mixKnobs[key].draw();
}
export function syncSound() {
  const on = playing && !paused;
  $('playBtn').classList.toggle('paused', !on);
  $('playBtn').setAttribute('aria-label', on ? 'Stop' : 'Play');
}
export function syncUI() {
  const m = score.mode, free = m === 'free', w = world(), L = w.limits;
  // Only what this world offers is shown
  if (!w.tools.includes(ui.tool)) ui.tool = w.tools[0];
  if (!w.matIdx.includes(ui.color)) ui.color = w.matIdx[0];
  for (const x of WORLDS) { const b = $('world-' + x.id); b.setAttribute('aria-selected', String(x === w)); b.tabIndex = x === w ? 0 : -1; b.hidden = !!x.legacy && x !== w; }
  $('fxGroup').hidden = !(w.options && w.options.fx);
  for (const b of $('fxSeg').children) b.setAttribute('aria-pressed', String(b.dataset.v === score.fx));
  $('styleName').textContent = w.name;
  for (const md of MODES) $('mode-' + md.id).hidden = !w.modes.includes(md.id);
  for (const t of TOOLS) $('tool-' + t.id).hidden = !w.tools.includes(t.id);
  $('tools').classList.toggle('many', w.tools.length > 5); $('drawRow').classList.toggle('many', w.tools.length > 3);
  $('swatches').parentElement.hidden = w.matIdx.length < 2;   // one brush: nothing to pick
  // Effect brushes (they work on what is beneath them) are square, after a divider
  { const first = w.matIdx.find(i => MATS[i].under); MATS.forEach((M, i) => { const b = $('sw-' + i); b.hidden = !w.matIdx.includes(i); b.style.order = w.matIdx.indexOf(i); b.classList.toggle('fxfirst', i === first); }); }
  $('pixBtn').hidden = !(w.options && w.options.pixel); $('pixBtn').setAttribute('aria-pressed', String(!!score.pixel));
  $('pk2w').hidden = free && !L.rotate;
  for (const md of MODES) $('mode-' + md.id).setAttribute('aria-pressed', String(m === md.id));
  $('modeName').textContent = MODES.find(md => md.id === m).name;
  for (const v of ['tones', 'both', 'drums']) $('inst-' + v).setAttribute('aria-pressed', String(score.inst === v));
  $('timeC').setAttribute('aria-pressed', String(score.timing === 'clocked'));
  $('timeH').setAttribute('aria-pressed', String(score.timing === 'hand'));
  $('pk2').hidden = free; $('rotBtn').hidden = !free;
  $('pk1l').textContent = P1[pm()][3]; $('pk1').setAttribute('aria-label', P1[pm()][3]);
  $('pk2l').textContent = free ? 'Rotate' : P2[pm()][3]; $('pk2').setAttribute('aria-label', P2[pm()][3]);
  $('mirrorBtn').setAttribute('aria-pressed', String(mirrored()));
  $('rotBtn').setAttribute('aria-pressed', String(score.frot));
  for (const t of TOOLS) $('tool-' + t.id).setAttribute('aria-pressed', String(ui.tool === t.id));
  // Colour picker (tabs with a palette): rebuilt when the tab changes; brush swatches are shown in the colour picked
  const cg = $('colors');
  $('colorGroup').hidden = !w.colors; $('matLabel').textContent = w.colors ? 'Brush' : 'Material';
  if (w.colors) {
    if (!w.colors.includes(ui.tint)) ui.tint = w.colors[0];
    if (cg.dataset.world !== w.id) {
      cg.dataset.world = w.id; cg.innerHTML = '';
      w.colors.forEach(c => { const b = document.createElement('button'); b.className = 'sw'; b.dataset.c = c; b.style.setProperty('--c', c); b.setAttribute('aria-label', 'Color ' + c); b.addEventListener('click', () => { ui.tint = c; if (ui.tool === 'erase') ui.tool = w.tools[0]; syncUI(); }); cg.appendChild(b); });
    }
    for (const b of cg.children) b.setAttribute('aria-pressed', String(b.dataset.c === ui.tint));
  }
  // Brushes show in the tab's own order (w.mats), whatever their place in MATS
  MATS.forEach((M, i) => { const b = $('sw-' + i); b.setAttribute('aria-pressed', String(ui.color === i)); if (!b.hidden) { b.style.order = w.matIdx.indexOf(i); b.style.setProperty('--c', w.colors && M.swatchFor ? M.swatchFor(ui.tint) : M.swatch); b.title = M.label && w.colors ? M.label : M.name; b.setAttribute('aria-label', b.title); } });
  // The accent follows the colour in hand, unless that is too dark to see on the dark panel
  { const [r, g, b] = toRgb(ink()); document.documentElement.style.setProperty('--ink', r * 0.3 + g * 0.59 + b * 0.11 < 60 ? '#ece8dc' : ink()); }
  if (!anim) mapInput.value = String(score.map).padStart(3, '0');
  $('bpmVal').textContent = score.tempo;
  $('undoBtn').disabled = !undoStack.length;
  $('redoBtn').disabled = !redoStack.length;
  $('clearBtn').disabled = !score.strokes.length;
  $('pk3w').hidden = free; pk1.draw(); pk2.draw(); pk3.draw(); for (const key in mixKnobs) mixKnobs[key].draw();
  drawSizeBar(); syncSound();
}
// All the buttons, the tempo box, the map number and preferences
export function initControls() {
  // Style tabs: one per world
  WORLDS.forEach(w => {
    const b = document.createElement('button');
    b.id = 'world-' + w.id; b.setAttribute('role', 'tab'); b.textContent = w.name;
    b.addEventListener('click', () => { openStyles(false); switchWorld(w.id); });
    $('worldTabs').appendChild(b);
  });
  // The style picker: one button showing the current style; tap for the list
  $('styleBtn').addEventListener('click', () => openStyles($('worldTabs').hidden));
  // Sound controls: put away until asked for; they open as a sheet and stay while you draw
  $('soundBtn').addEventListener('click', () => openSound($('knobRow').hidden));
  $('soundClose').addEventListener('click', () => openSound(false));
  document.addEventListener('pointerdown', e => {
    if (!$('worldTabs').hidden && !e.target.closest('.stylewrap')) openStyles(false);
    if (!$('knobRow').hidden && !e.target.closest('#knobRow, #soundBtn, #stage, .top')) openSound(false);
  });
  $('worldTabs').addEventListener('keydown', e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    const i = TABS.findIndex(w => w.id === score.world), next = TABS[(i + d + TABS.length) % TABS.length];
    switchWorld(next.id); $('world-' + next.id).focus(); e.preventDefault();
  });
  TOOLS.forEach(t => {
    const b = document.createElement('button');
    b.className = 'tool'; b.id = 'tool-' + t.id;
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${t.icon}</svg><span>${t.name}</span>`;
    b.addEventListener('click', () => { ui.tool = t.id; syncUI(); });
    $('tools').appendChild(b);
  });
  PALETTE.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = MATS[i].under ? 'sw fxsw' : 'sw'; b.id = 'sw-' + i; b.style.setProperty('--c', MATS[i].swatch); b.setAttribute('aria-label', MATS[i].name); b.title = MATS[i].name;
    b.addEventListener('click', () => { ui.color = i; if (ui.tool === 'erase') ui.tool = 'glow'; syncUI(); });
    $('swatches').appendChild(b);
  });
  // Pixel toggle (Geometric): sits after the colours
  const pix = document.createElement('button');
  pix.id = 'pixBtn'; pix.className = 'sw pixtoggle'; pix.hidden = true; pix.title = 'Pixel'; pix.setAttribute('aria-label', 'Pixel');
  pix.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="5" height="5"/><rect x="9.5" y="9.5" width="5" height="5"/><rect x="15" y="4" width="5" height="5"/><rect x="4" y="15" width="5" height="5"/><rect x="15" y="15" width="5" height="5"/></svg>';
  pix.addEventListener('click', () => { change(() => score.pixel = !score.pixel); layout(); });
  $('swatches').appendChild(pix);
  MODES.forEach(md => {
    const b = document.createElement('button');
    b.id = 'mode-' + md.id; b.dataset.v = md.id; b.title = md.name; b.setAttribute('aria-label', md.name);
    b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${md.icon}</svg>`;
    $('modeSeg').appendChild(b);
  });
  $('modeSeg').addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (v && v !== score.mode) change(() => score.mode = v); });
  $('fxSeg').addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (v && v !== score.fx) { score.fx = v; syncUI(); } });   // applies to the strokes drawn next
  $('timeSeg').addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (v && v !== score.timing) change(() => score.timing = v); });
  $('instSeg').addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (v && v !== score.inst) change(() => score.inst = v); });
  $('mirrorBtn').addEventListener('click', () => change(() => { if (score.mode === 'free') score.fmirror = !score.fmirror; else score.mirror = !score.mirror; }));
  $('rotBtn').addEventListener('click', () => change(() => score.frot = !score.frot));
  $('undoBtn').addEventListener('click', () => { if (undoStack.length && !anim) { if (preview) endPreview(); redoStack.push(snap()); restore(undoStack.pop()); } });
  $('redoBtn').addEventListener('click', () => { if (redoStack.length && !anim) { if (preview) endPreview(); undoStack.push(snap()); restore(redoStack.pop()); } });
  $('clearBtn').addEventListener('click', () => { if (score.strokes.length) change(() => score.strokes = []); });
  $('playBtn').addEventListener('click', () => { if (!playing) { startAudio(); setPaused(false); } else setPaused(!paused); });
  $('dice').addEventListener('click', randomize);
  $('clipBtn').addEventListener('click', keepClip);
  $('clipsNav').addEventListener('click', () => showPage(page === 'clips' ? 'canvas' : 'clips'));
  $('clipsBack').addEventListener('click', () => showPage('canvas'));
  $('nowStop').addEventListener('click', endPreview);
  $('nowExport').addEventListener('click', openExport);
  $('exportBtn').addEventListener('click', openExport);

  // BPM box: drag up or down
  {
    const el = $('bpm');
    let drag = null, lastTap = 0;
    el.addEventListener('pointerdown', e => {
      // double tap: back to 92
      const now = performance.now();
      if (now - lastTap < 330) { lastTap = 0; drag = null; if (score.tempo !== 92) { checkpoint(); setTempo(92); rebuild(); syncUI(); } e.preventDefault(); return; }
      lastTap = now;
      drag = { y: e.clientY, x: e.clientX, v: score.tempo, started: false }; try { el.setPointerCapture(e.pointerId); } catch (err) {} el.classList.add('dragging'); e.preventDefault(); });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      const nv = drag.v + ((e.clientX - drag.x) - (e.clientY - drag.y)) / 3;
      if (!drag.started && Math.round(nv) !== drag.v) { drag.started = true; checkpoint(); }
      if (drag.started) setTempo(nv);
    });
    const end = () => { if (drag) { if (drag.started) { rebuild(); syncUI(); } drag = null; el.classList.remove('dragging'); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', e => {
      const step = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
      if (step) { checkpoint(); setTempo(score.tempo + step); rebuild(); syncUI(); e.preventDefault(); }
    });
  }
  mapInput.addEventListener('focus', () => mapInput.select());
  mapInput.addEventListener('input', () => {
    const v = mapInput.value.replace(/\D/g, '').slice(0, 3);
    mapInput.value = v;
    if (v.length === 3) { setMap(+v); mapInput.blur(); }
  });
  mapInput.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = mapInput.value.replace(/\D/g, ''); if (v) setMap(+v); mapInput.blur(); } });
  mapInput.addEventListener('blur', () => { if (!anim) mapInput.value = String(score.map).padStart(3, '0'); });

  for (const b of document.querySelectorAll('.cogbtn')) b.addEventListener('click', () => openSettings(settings.hidden));
  $('closeSettings').addEventListener('click', () => openSettings(false));
  document.addEventListener('pointerdown', e => { if (!settings.hidden && !settings.contains(e.target) && !e.target.closest('.cogbtn')) openSettings(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { openSettings(false); openStyles(false); openSound(false); $('exportDlg').hidden = true; setVisual(false); } });
  for (const [id, k] of [['prTempo', 'rTempo'], ['prMode', 'rMode'], ['prFolds', 'rFolds']]) {
    $(id).checked = !!prefs[k];
    $(id).addEventListener('change', e => { prefs[k] = e.target.checked; savePrefs(); });
  }
  $('prGlide').addEventListener('input', e => { prefs.glide = +e.target.value; showGlide(); savePrefs(); });
  showGlide();
  $('shapeSeg').addEventListener('click', e => { const v = e.target.closest('button')?.dataset.v; if (v) { prefs.shape = v; savePrefs(); applyView(); } });
  $('visualBtn').addEventListener('click', () => setVisual(true));
  $('main').addEventListener('click', () => { if (isVisual()) setVisual(false); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && isVisual()) setVisual(false); });

}
