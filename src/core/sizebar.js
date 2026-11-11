// Size bar: the whole bar is as thick as the brush, and fills from the left
import { effEraseR } from '../canvas/index.js';
import { $ } from './dom.js';
import { clamp } from './math.js';
import { score, ui } from './state.js';
import { NEON_W } from './stroke.js';
import { TOOL, brushSize, eraseRadius, stampRadius } from './tools.js';
import { geo } from '../render/compose.js';
import { PALETTE } from '../styles/index.js';

export const sizeCv = $('sizeCv'), SB_PAD = 4;
export function pill(g, xa, xb, cy, d) {
  const r = d / 2;
  xb = Math.max(xb, xa + d);
  g.beginPath(); g.moveTo(xa + r, cy - r); g.lineTo(xb - r, cy - r); g.arc(xb - r, cy, r, -Math.PI / 2, Math.PI / 2);
  g.lineTo(xa + r, cy + r); g.arc(xa + r, cy, r, Math.PI / 2, Math.PI * 1.5); g.closePath();
}
// Real size on screen, scaled down only if the largest setting would not fit the bar, so the whole throw stays even
export function sizeDia() {
  const maxD = $('sizeBar').clientHeight - 6, er = ui.tool === 'erase';
  const dOf = v => er ? eraseRadius(v) * (effEraseR() / eraseRadius(ui.eraseV)) * 2 * geo.Rcss : TOOL[ui.tool].stamp ? 2 * stampRadius(v) * geo.Rcss : 2 * NEON_W * 1.1 * brushSize(v) * geo.Rcss / (score.mode === 'free' ? 1 : 1);
  const k = Math.min(1, maxD / dOf(100));
  return Math.max(6, dOf(er ? ui.eraseV : ui.brushV) * k);
}
export function drawSizeBar() {
  const el = $('sizeBar'), Wd = el.clientWidth, Hd = el.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (!Wd) return;
  if (sizeCv.width !== Math.round(Wd * dpr) || sizeCv.height !== Math.round(Hd * dpr)) { sizeCv.width = Math.round(Wd * dpr); sizeCv.height = Math.round(Hd * dpr); }
  const g = sizeCv.getContext('2d'), er = ui.tool === 'erase', v = er ? ui.eraseV : ui.brushV, d = sizeDia(), cy = Hd / 2;
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, Wd, Hd);
  const x0 = SB_PAD, x1 = Wd - SB_PAD, xe = x0 + d + (x1 - x0 - d) * v / 100;
  pill(g, x0, x1, cy, d); g.fillStyle = '#161a28'; g.fill(); g.strokeStyle = '#272c3f'; g.lineWidth = 1; g.stroke();
  pill(g, x0, xe, cy, d);
  if (er) {
    g.fillStyle = '#000'; g.fill();
    g.save(); g.shadowColor = 'rgba(236,232,220,0.75)'; g.shadowBlur = 8; g.strokeStyle = 'rgba(236,232,220,0.9)'; g.lineWidth = 1.5; g.stroke(); g.restore();
  } else { g.fillStyle = PALETTE[ui.color]; g.fill(); }
  el.setAttribute('aria-valuenow', Math.round(v));
  el.setAttribute('aria-label', er ? 'Eraser size' : 'Brush size');
}
// Size bar dragging, double tap to reset, arrow keys
export function initSizeBar() {
  {
    const el = $('sizeBar');
    let drag = null, lastTap = 0;
    const setV = v => { v = clamp(v, 0, 100); if (ui.tool === 'erase') ui.eraseV = v; else ui.brushV = v; drawSizeBar(); };
    const setFrom = x => { const r = el.getBoundingClientRect(), d = sizeDia(); setV((x - r.left - SB_PAD - d / 2) / Math.max(r.width - 2 * SB_PAD - d, 1) * 100); };
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      const now = performance.now();
      if (now - lastTap < 320) { setV(ui.tool === 'erase' ? 45 : 35); lastTap = 0; drag = null; return; }
      lastTap = now; drag = e.pointerId; setFrom(e.clientX);
    });
    el.addEventListener('pointermove', e => { if (drag === e.pointerId) setFrom(e.clientX); });
    const end = e => { if (drag === e.pointerId) drag = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', e => {
      const d = { ArrowRight: 3, ArrowUp: 3, ArrowLeft: -3, ArrowDown: -3 }[e.key];
      if (d) { setV((ui.tool === 'erase' ? ui.eraseV : ui.brushV) + d); e.preventDefault(); }
    });
  }
}
