// Size control: a circle the size of a button. The filled disc is the brush at its real size on screen: a dot at the
// smallest, the whole circle at the largest. Drag up or right for bigger, down or left for smaller.
import { effEraseR } from '../canvas/index.js';
import { $ } from './dom.js';
import { clamp } from './math.js';
import { ui } from './state.js';
import { LINE, TOOL, brushSize, eraseRadius, stampRadius } from './tools.js';
import { geo } from '../render/compose.js';
import { ink } from '../worlds/index.js';

export const sizeCv = $('sizeCv');
export const DEF_BRUSH = 50, DEF_ERASE = 50;
// Real size on screen. The eraser can be bigger than the control, so its whole range is scaled to fit instead.
export function sizeDia() {
  const maxD = $('sizeBar').clientHeight - 4, er = ui.tool === 'erase';
  if (!er) return Math.max(3, Math.min(maxD, 2 * (TOOL[ui.tool].stamp ? stampRadius(ui.brushV) : LINE * brushSize(ui.brushV)) * geo.Rcss));
  const dOf = v => eraseRadius(v) * (effEraseR() / eraseRadius(ui.eraseV)) * 2 * geo.Rcss;
  return Math.max(5, dOf(ui.eraseV) * Math.min(1, maxD / dOf(100)));
}
export function drawSizeBar() {
  const el = $('sizeBar'), D = el.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (!D) return;
  if (sizeCv.width !== Math.round(D * dpr)) sizeCv.width = sizeCv.height = Math.round(D * dpr);
  const g = sizeCv.getContext('2d'), er = ui.tool === 'erase', v = er ? ui.eraseV : ui.brushV, d = sizeDia(), c = D / 2;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, D, D);
  g.beginPath(); g.arc(c, c, c - 1, 0, 2 * Math.PI); g.fillStyle = '#161a28'; g.fill(); g.strokeStyle = '#2f3550'; g.lineWidth = 1; g.stroke();
  g.beginPath(); g.arc(c, c, d / 2, 0, 2 * Math.PI);
  if (er) {
    g.fillStyle = '#000'; g.fill();
    g.save(); g.shadowColor = 'rgba(236,232,220,0.75)'; g.shadowBlur = 6; g.strokeStyle = 'rgba(236,232,220,0.9)'; g.lineWidth = 1.5; g.stroke(); g.restore();
  } else { g.fillStyle = ink(); g.fill(); g.strokeStyle = 'rgba(236,232,220,0.4)'; g.lineWidth = 1; g.stroke(); }
  el.setAttribute('aria-valuenow', Math.round(v));
  el.setAttribute('aria-label', er ? 'Eraser size' : TOOL[ui.tool].stamp ? 'Stamp size' : 'Brush size');
}
// Dragging, double tap to reset, arrow keys
export function initSizeBar() {
  const el = $('sizeBar');
  let drag = null, lastTap = 0;
  const get = () => ui.tool === 'erase' ? ui.eraseV : ui.brushV;
  const setV = v => { v = clamp(v, 0, 100); if (ui.tool === 'erase') ui.eraseV = v; else ui.brushV = v; drawSizeBar(); };
  el.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
    const now = performance.now();
    if (now - lastTap < 320) { setV(ui.tool === 'erase' ? DEF_ERASE : DEF_BRUSH); lastTap = 0; drag = null; return; }
    lastTap = now; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, v: get() }; el.classList.add('dragging');
  });
  // The whole range in about 150 px of travel
  el.addEventListener('pointermove', e => { if (drag && drag.id === e.pointerId) setV(drag.v + ((e.clientX - drag.x) - (e.clientY - drag.y)) / 1.5); });
  const end = e => { if (drag && drag.id === e.pointerId) { drag = null; el.classList.remove('dragging'); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', e => {
    const d = { ArrowRight: 3, ArrowUp: 3, ArrowLeft: -3, ArrowDown: -3 }[e.key];
    if (d) { setV(get() + d); e.preventDefault(); }
  });
}
