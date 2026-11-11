// Clips: saved drawings, kept per person and private. Packed as base64 Int16.
import { MODES } from '../canvas/index.js';
import { $, toast } from './dom.js';
import { openExport } from './export.js';
import { layout } from './layout.js';
import { clamp } from './math.js';
import { restore } from './settings.js';
import { MIX_DEF, checkpoint, mix, score, snap, ui } from './state.js';
import { beatAt, playing, sessionNow, startAudio } from './transport.js';
import { cv } from '../render/compose.js';
import { applyAudio } from '../sound/graph.js';
import { switchWorld } from './settings.js';
import { WORLD } from '../worlds/index.js';

export function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s); }
export function unb64(str) { const s = atob(str), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
export function packState() {
  const st = snap();
  const strokes = st.strokes.map(s => {
    const a = new Int16Array(s.pts.length * 4);
    s.pts.forEach((p, i) => { a[i * 4] = clamp(Math.round(p[0] * 8000), -32767, 32767); a[i * 4 + 1] = clamp(Math.round(p[1] * 8000), -32767, 32767); a[i * 4 + 2] = clamp(Math.round(p[2] * 100), 0, 32767); a[i * 4 + 3] = Math.round((p[3] ?? 0.5) * 1000); });
    return { i: s.id, t: s.tool, c: s.color, z: Math.round(s.size * 1000) / 1000, p: b64(new Uint8Array(a.buffer)) };
  });
  return JSON.stringify({ v: 1, set: st.set, mix: { ...mix }, strokes });
}
export function unpackState(json) {
  const o = JSON.parse(json), S = sessionNow(), sb = Math.ceil(beatAt(S));
  const strokes = o.strokes.map(s => {
    const by = unb64(s.p), a = new Int16Array(by.buffer, by.byteOffset, by.length / 2), pts = [];
    for (let i = 0; i < a.length; i += 4) pts.push([a[i] / 8000, a[i + 1] / 8000, a[i + 2] / 100, a[i + 3] / 1000]);
    return { id: s.i, tool: s.t, color: s.c, size: s.z, pts, start: S, startBeat: sb };
  });
  // Clips from before the style tabs belong to Classic
  if (!WORLD[o.set.world]) o.set.world = 'classic';
  return { snap: { set: o.set, strokes }, mix: o.mix || { ...MIX_DEF } };
}
export const localStore = {
  kind: 'local',
  read() { try { return JSON.parse(localStorage.getItem('visual-score-clips') || '[]'); } catch (e) { return []; } },
  write(list) { try { localStorage.setItem('visual-score-clips', JSON.stringify(list)); return true; } catch (e) { return false; } },
  async list() { return this.read(); },
  async put(c) { const l = this.read().filter(x => x.id !== c.id); l.unshift(c); if (!this.write(l)) throw new Error('full'); },
  async del(id) { this.write(this.read().filter(x => x.id !== id)); },
};
export const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
export let storeReady;
export let clips = [], clipsLoaded = false, clipsError = '', preview = null, page = 'canvas';
export async function loadClips() {
  try { const st = await storeReady; clips = (await st.list()).sort((a, b) => b.at - a.at); clipsError = ''; }
  catch (e) { clipsError = 'Your clips could not be loaded just now. Try again in a moment.'; }
  clipsLoaded = true;
  if (page === 'clips') renderClips();
}
export function thumbOf() {
  const t = document.createElement('canvas'); t.width = t.height = 240;
  const s = Math.min(cv.width, cv.height), tx = t.getContext('2d');
  tx.fillStyle = '#121521'; tx.fillRect(0, 0, 240, 240);
  tx.drawImage(cv, (cv.width - s) / 2, (cv.height - s) / 2, s, s, 0, 0, 240, 240);
  return t.toDataURL('image/jpeg', 0.82);
}
export async function keepClip() {
  if (preview) endPreview();
  if (!score.strokes.length) { toast('Draw something first'); return; }
  const num = clips.reduce((m, c) => Math.max(m, +((c.name || '').match(/\d+$/) || [0])[0]), 0) + 1;
  const c = { id: 'clip_' + Date.now(), name: 'Clip ' + num, at: Date.now(), data: packState(), thumb: thumbOf() };
  if (c.data.length + c.thumb.length > 250000) { toast('This drawing is too detailed to keep as a clip'); return; }
  const b = $('clipBtn'); b.classList.add('saved'); setTimeout(() => b.classList.remove('saved'), 500);
  try {
    const st = await storeReady;
    await st.put(c);
    clips.unshift(c);
    toast('Kept as ' + c.name);
  } catch (e) { toast('That clip could not be kept. Try again.'); }
  if (page === 'clips') renderClips();
}
export function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'just now'; if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
export function startPreview(c) {
  if (preview && preview.id === c.id) return;
  const saved = preview ? preview.saved : { snap: snap(), mix: { ...mix }, tool: ui.tool, color: ui.color };
  let st;
  try { st = unpackState(c.data); } catch (e) { toast('That clip could not be opened'); return; }
  preview = { id: c.id, name: c.name, saved };
  Object.assign(mix, st.mix); restore(st.snap); applyAudio(0.05);
  if (!playing) startAudio();
  renderClips();
}
export function endPreview() {
  if (!preview) return;
  const s = preview.saved;
  preview = null;
  ui.tool = s.tool; ui.color = s.color;
  Object.assign(mix, s.mix); restore(s.snap); applyAudio(0.05);
  if (page === 'clips') renderClips();
}
export function loadClip(c) {
  let st;
  try { st = unpackState(c.data); } catch (e) { toast('That clip could not be opened'); return; }
  if (preview) endPreview();
  // A clip opens in its own style tab
  if (st.snap.set.world !== score.world) switchWorld(st.snap.set.world);
  checkpoint();
  Object.assign(mix, st.mix); restore(st.snap); applyAudio(0.05);
  showPage('canvas');
  toast('Loaded ' + c.name + '. Undo brings your work back.');
}
export async function deleteClip(c) {
  if (preview && preview.id === c.id) endPreview();
  try { const st = await storeReady; await st.del(c.id); clips = clips.filter(x => x.id !== c.id); toast('Deleted ' + c.name); }
  catch (e) { toast('That clip could not be deleted. Try again.'); }
  renderClips();
}
export const ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M7 5v14l12-7z" fill="currentColor"/></svg>', ICON_STOP = '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor"/></svg>';
export const ICON_EXPORT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11"/><path d="M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19h14"/></svg>';
export const ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>';
export function renderClips() {
  const grid = $('clipGrid');
  grid.innerHTML = '';
  $('clipCount').textContent = clips.length ? clips.length + (clips.length === 1 ? ' clip' : ' clips') : '';
  $('nowBar').hidden = !preview;
  if (preview) $('nowText').innerHTML = `Playing <b></b>. Your work is untouched.`, $('nowText').querySelector('b').textContent = preview.name;
  if (!clipsLoaded) { grid.innerHTML = '<div class="empty">Loading your clips…</div>'; return; }
  if (clipsError) { grid.innerHTML = '<div class="empty"></div>'; grid.firstChild.textContent = clipsError; return; }
  if (!clips.length) { grid.innerHTML = '<div class="empty">No clips yet. Tap the clip button at the top whenever you like what you hear.</div>'; return; }
  for (const c of clips) {
    let set = {};
    try { set = JSON.parse(c.data).set || {}; } catch (e) {}
    const on = preview && preview.id === c.id;
    const card = document.createElement('div');
    card.className = 'clipcard' + (on ? ' playing' : '');
    card.innerHTML = `<img alt=""><div class="cmeta"><b></b><span></span></div>
      <div class="cbtns"><button class="icon" aria-label="${on ? 'Stop' : 'Play'}">${on ? ICON_STOP : ICON_PLAY}</button><button class="grow">Load</button><button class="icon" aria-label="Export">${ICON_EXPORT}</button><button class="icon del" aria-label="Delete">${ICON_TRASH}</button></div>`;
    card.querySelector('img').src = c.thumb || '';
    card.querySelector('b').textContent = c.name;
    const modeName = (MODES.find(m => m.id === set.mode) || { name: '' }).name;
    card.querySelector('.cmeta span').textContent = `Map ${String(set.map ?? 0).padStart(3, '0')} · ${set.tempo ?? ''} BPM · ${modeName} · ${ago(c.at)}`;
    const [pb, lb, eb, db] = card.querySelectorAll('.cbtns button');
    pb.addEventListener('click', () => on ? endPreview() : startPreview(c));
    lb.addEventListener('click', () => loadClip(c));
    eb.addEventListener('click', () => { startPreview(c); openExport(); });
    db.addEventListener('click', () => {
      if (db.classList.contains('armed')) { deleteClip(c); return; }
      db.classList.add('armed'); db.textContent = 'Delete?';
      setTimeout(() => { if (db.isConnected) { db.classList.remove('armed'); db.innerHTML = ICON_TRASH; } }, 2500);
    });
    grid.appendChild(card);
  }
}
export function showPage(p) {
  if (p === page) return;
  page = p;
  const clipsOn = p === 'clips';
  $('clipsPage').hidden = !clipsOn;
  $('main').hidden = clipsOn;
  if (!clipsOn) requestAnimationFrame(layout);
  $('clipsNav').setAttribute('aria-pressed', String(clipsOn));
  if (clipsOn) renderClips(); else if (preview) endPreview();
}
// Clip storage: the claude.ai db when available, else localStorage
export function initClips() {
  storeReady = (async () => {
    try {
      if (!window.claude || !window.claude.use) return localStore;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return localStore;
      const uid = await user.id();
      if (!uid) return localStore;
      const col = db.collection('data/users/' + uid);
      return {
        kind: 'db',
        async list() { const snapq = await withTimeout(col.get(), 10000); return snapq.docs.filter(d => d.id.startsWith('clip_')).map(d => ({ id: d.id, ...d.data() })); },
        put: c => col.doc(c.id).set({ name: c.name, at: c.at, data: c.data, thumb: c.thumb }),
        del: id => col.doc(id).delete(),
      };
    } catch (e) { return localStore; }
  })();
  loadClips();
}
