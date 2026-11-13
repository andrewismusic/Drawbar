// Input: drawing, erasing (works through copies and tile wrap), pointer handling
import { eraseTester, fs, tiled } from '../canvas/index.js';
import { isVisual } from './layout.js';
import { rebuild, strokeAdded } from './settings.js';
import { checkpoint, redoStack, score, takeId, ui, undoStack } from './state.js';
import { prepare, smoothStroke } from './stroke.js';
import { TOOL, brushSize, stampRadius } from './tools.js';
import { clamp } from './math.js';
import { stampPts } from '../render/stamps.js';
import { audioReady, beatAt, playing, rotAt, scrollAt, sessionNow, startAudio, visNow } from './transport.js';
import { syncUI } from './ui.js';
import { cv, geo, redrawSoon } from '../render/compose.js';
import { MATS } from '../styles/index.js';
import { world } from '../worlds/index.js';

export let cur = null, erasing = null;
export function toScreen(e) {
  const r = cv.getBoundingClientRect(), k = cv.width / r.width;
  let x = (e.clientX - r.left - r.width / 2) * k / geo.R, y = (e.clientY - r.top - r.height / 2) * k / geo.R;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  return { x, y };
}
export function unrot(v) {
  const B = beatAt(visNow());
  const k = fs();
  if (tiled()) return { x: v.x / k, y: (v.y + scrollAt(B)) / k };
  const a = -rotAt(B), c = Math.cos(a), s = Math.sin(a);
  return { x: (v.x * c - v.y * s) / k, y: (v.x * s + v.y * c) / k };
}
export const pressureOf = e => e.pointerType === 'pen' ? (e.pressure || 0.5) : 0.5;
export function addPoint(e) {
  const p = unrot(toScreen(e)), t = Math.max(e.timeStamp / 1000 - cur.t0, cur.pts[cur.pts.length - 1][2]);
  cur.sx += (p.x - cur.sx) * 0.25; cur.sy += (p.y - cur.sy) * 0.25;
  const last = cur.pts[cur.pts.length - 1];
  if (Math.hypot(cur.sx - last[0], cur.sy - last[1]) > 0.003) cur.pts.push([cur.sx, cur.sy, t, pressureOf(e)]);
}
export function eraseAt(p) {
  const hit = eraseTester(p), next = [];
  let changed = false;
  for (const s of score.strokes) {
    // A stamp goes all at once, touched anywhere on its outline or in its middle
    if (TOOL[s.tool] && TOOL[s.tool].stamp) {
      const c = s._shape && s._shape.center;
      if (s.pts.some(hit) || (c && hit(c))) changed = true; else next.push(s);
      continue;
    }
    const keep = s.pts.map(pt => !hit(pt));
    if (keep.every(Boolean)) { next.push(s); continue; }
    changed = true;
    let run = [];
    const flush = () => {
      let rl = 0;
      for (let i = 1; i < run.length; i++) rl += Math.hypot(run[i][0] - run[i - 1][0], run[i][1] - run[i - 1][1]);
      if (run.length >= 3 && rl > 0.025) {
        const t0 = run[0][2];
        const piece = { id: next.some(x => x.id === s.id) ? takeId() : s.id, tool: s.tool, color: s.color, size: s.size, fx: s.fx, tint: s.tint, pts: run.map(q => [q[0], q[1], q[2] - t0, q[3]]), start: s.start, startBeat: s.startBeat };
        prepare(piece); next.push(piece);
      }
      run = [];
    };
    s.pts.forEach((pt, i) => { if (keep[i]) run.push(pt); else flush(); });
    flush();
  }
  if (changed) { score.strokes = next; erasing.touched = true; redrawSoon(); }
}
export function finishStroke(e) {
  if (erasing && e.pointerId === erasing.id) {
    if (!erasing.touched) { undoStack.pop(); redoStack.push(...erasing.redo); }
    erasing = null; rebuild(undefined, true); syncUI(); return;
  }
  if (!cur || e.pointerId !== cur.id) return;
  if (cur.stamp) { finishStamp(); return; }
  const p = unrot(toScreen(e)), last = cur.pts[cur.pts.length - 1];
  const t = Math.max(e.timeStamp / 1000 - cur.t0, last[2]);
  if (Math.hypot(p.x - last[0], p.y - last[1]) > 0.002) cur.pts.push([p.x, p.y, t, pressureOf(e)]);
  const pts = cur.pts.length > 2 ? smoothStroke(cur.pts, cur.size) : cur.pts;
  const S = sessionNow();
  const s = { id: cur.sid, tool: TOOL[cur.tool].as || cur.tool, head: cur.tool === 'trace' || undefined, pt: cur.pt, color: cur.color, size: cur.size, fx: MATS[cur.color].live ? score.fx : undefined, tint: cur.tint, pts, start: S, startBeat: Math.round(beatAt(S) * 4) / 4 };
  cur = null;
  prepare(s);
  checkpoint();
  score.strokes.push(s);
  strokeAdded(s); syncUI();
}
function finishStamp() {
  const S = sessionNow();
  const s = { id: takeId(), tool: cur.tool, color: cur.color, size: clamp(cur.r * 40, 1.5, 24), pts: stampPts(cur.stamp, cur.cx, cur.cy, cur.r, cur.rot), start: S, startBeat: Math.round(beatAt(S) * 4) / 4 };
  cur = null;
  prepare(s);
  checkpoint();
  score.strokes.push(s);
  strokeAdded(s); syncUI();
}
// Drawing and erasing on the canvas; sound starts with the first touch anywhere
export function initInput() {
  cv.addEventListener('pointerdown', e => {
    if (cur || erasing || isVisual()) return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    const sc = toScreen(e), p = unrot(sc);
    if (ui.tool === 'erase') {
      erasing = { id: e.pointerId, p, screen: sc, touched: false, redo: redoStack.slice() };
      checkpoint();
      eraseAt(p);
    } else if (TOOL[ui.tool].stamp) {
      // Stamp: a tap places it at the size bar's size; dragging sets its size and turns it to point at the finger
      cur = { id: e.pointerId, stamp: TOOL[ui.tool].stamp, tool: ui.tool, color: ui.color, cx: p.x, cy: p.y, r: stampRadius(ui.brushV) / fs(), rot: -Math.PI / 2, moved: false, pts: [] };
    } else cur = { id: e.pointerId, sid: takeId(), pt: MATS[ui.color].gl === 'cloud' ? { ...ui.pt } : undefined, tool: ui.tool, color: ui.color, tint: world().colors ? ui.tint : undefined, size: brushSize(ui.brushV) / fs(), pts: [[p.x, p.y, 0, pressureOf(e)]], t0: e.timeStamp / 1000, sx: p.x, sy: p.y };
    e.preventDefault();
  });
  cv.addEventListener('pointermove', e => {
    if (cur && cur.stamp && e.pointerId === cur.id) {
      const p = unrot(toScreen(e)), d = Math.hypot(p.x - cur.cx, p.y - cur.cy);
      if (d > 0.012) cur.moved = true;
      if (cur.moved) { cur.r = Math.max(d, 0.012); cur.rot = Math.atan2(p.y - cur.cy, p.x - cur.cx); }
    } else if (cur && e.pointerId === cur.id) {
      const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (list.length ? list : [e])) addPoint(ev);
    } else if (erasing && e.pointerId === erasing.id) {
      erasing.screen = toScreen(e); erasing.p = unrot(erasing.screen); eraseAt(erasing.p);
    }
    e.preventDefault();
  });
  cv.addEventListener('pointerup', finishStroke);
  cv.addEventListener('pointercancel', finishStroke);
  // Sound starts with the first touch anywhere, except on the sound button itself
  document.addEventListener('pointerdown', e => { if (!audioReady && !playing && !e.target.closest('#playBtn')) startAudio(); }, true);
}
