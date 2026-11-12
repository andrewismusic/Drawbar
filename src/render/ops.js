// The drawing op language: every material is a list of these ops, run by drawShape(ctx, shape, ops).
// A shape holds paths keyed by width factor k (1 = the stroke's own outline), keyed extra pieces and an optional ink outline.
import { TAU } from '../core/math.js';
import { rgba } from '../core/color.js';
import { drawGlyphs } from './glyphs.js';
import { drawStamps } from './space.js';

export const F = (k, c, off = 0, a = 1) => ({ t: 'fill', k, c, off, a });
export const DROP = a => ({ t: 'drop', a }), CLIP = { t: 'clip' }, END = { t: 'end' };
export const INK = (k, off) => ({ t: 'ink', k, c: '#0c0c12', off, a: 1 }), HALF = (c, a, off = 0) => ({ t: 'half', c, a, off });
// Soft layer: a band blurred to a smooth gradient (no visible steps), slid toward the light
export const S = (k, c, off, blur, a = 1) => ({ t: 'fill', k, c, off, blur, a });
export const PAT = (pat, c, off = 0) => ({ t: 'fill', k: 1, pat, c, off, a: 1 });
export const SOFTDROP = a => ({ t: 'drop', a });
// Hard drop shadow: a plain offset fill, no blur (pixel art)
export const HDROP = a => ({ t: 'drop', a, hard: true, c: '#000' });
export const INKL = off => ({ t: 'ink', c: '#0c0c12', off, a: 1 });
// Film grain over a shape's keyed pieces (paths.all): dark and light specks, a few scratches (Garden)
export const GRAIN = a => ({ t: 'grain', a });
let grainTile = null;
function grainPattern(c) {
  if (!grainTile) {
    grainTile = document.createElement('canvas'); grainTile.width = grainTile.height = 96;
    const g = grainTile.getContext('2d'); let s = 12345;
    const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let i = 0; i < 2300; i++) { const v = r(); g.fillStyle = v < 0.6 ? `rgba(20,12,6,${0.25 + 0.5 * r()})` : `rgba(255,244,220,${0.2 + 0.5 * r()})`; g.fillRect(Math.floor(r() * 96), Math.floor(r() * 96), 1 + (r() < 0.12 ? 1 : 0), 1 + (r() < 0.12 ? 1 : 0)); }
    for (let i = 0; i < 5; i++) { g.fillStyle = `rgba(255,244,220,${0.25 + 0.3 * r()})`; g.fillRect(Math.floor(r() * 96), Math.floor(r() * 96), 1, 8 + Math.floor(r() * 30)); }
    for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(20,12,6,0.5)'; g.beginPath(); g.arc(r() * 96, r() * 96, 1 + r() * 1.6, 0, TAU); g.fill(); }
  }
  const pat = c.createPattern(grainTile, 'repeat');
  pat.setTransform(new DOMMatrix([0.0026, 0, 0, 0.0026, 0, 0]));
  return pat;
}
export const STROKE = (k, lw, c = '#0c0c12') => ({ t: 'stroke', k, lw, c });
export const halfTiles = new Map();
export function patTile(kind, color) {
  const key = kind + color;
  let tile = halfTiles.get(key);
  if (!tile) {
    tile = document.createElement('canvas'); tile.width = tile.height = 12;
    const g = tile.getContext('2d'); g.fillStyle = g.strokeStyle = color;
    if (kind === 'scan') { g.fillRect(0, 0, 12, 2); g.fillRect(0, 6, 12, 2); }
    else if (kind === 'dots') { g.beginPath(); g.arc(3, 3, 2.1, 0, TAU); g.arc(9, 9, 2.1, 0, TAU); g.fill(); }
    else { g.lineWidth = 1.9; g.beginPath(); g.moveTo(-3, 15); g.lineTo(15, -3); g.moveTo(-9, 9); g.lineTo(9, -9); g.moveTo(3, 21); g.lineTo(21, 3); if (kind === 'cross') { g.moveTo(-3, -3); g.lineTo(15, 15); g.moveTo(-9, 3); g.lineTo(9, 21); g.moveTo(3, -9); g.lineTo(21, 9); } g.stroke(); }
    halfTiles.set(key, tile);
  }
  return tile;
}
export function halftone(c, color, w0, kind = 'dots') {
  const pat = c.createPattern(patTile(kind, color), 'repeat'), k = w0 * (kind === 'dots' ? 0.6 : 0.7) / 12;
  pat.setTransform(new DOMMatrix([k, 0, 0, k, 0, 0]));
  return pat;
}
export const LSX = -0.552, LSY = -0.834;
// How far the composed picture is turned right now; lighting is worked out against it
export let composeRot = 0;
export const setComposeRot = r => { composeRot = r; };
// The screen light, expressed in whatever space we are drawing in right now (copies may be turned, mirrored or scaled)
export function localLight(c) {
  const m = c.getTransform(), cr = Math.cos(-composeRot), sr = Math.sin(-composeRot);
  const lx = LSX * cr - LSY * sr, ly = LSX * sr + LSY * cr, det = m.a * m.d - m.b * m.c || 1;
  const vx = (m.d * lx - m.c * ly) / det, vy = (-m.b * lx + m.a * ly) / det, h = Math.hypot(vx, vy) || 1;
  return [vx / h, vy / h];
}
export const BIG = 9000;
export function drawShape(c, sh, ops) {
  const [lx, ly] = localLight(c), w0 = sh.w0;
  let far = null, scale = 1;
  for (const o of ops) {
    if (o.t === 'clip') { c.save(); c.clip(sh.paths[1]); continue; }
    if (o.t === 'end') { c.restore(); continue; }
    if (o.t === 'ink' && !sh.ink) continue;
    if (o.t === 'grain') { if (sh.paths.all) { c.globalAlpha = o.a; c.fillStyle = grainPattern(c); c.fill(sh.paths.all); c.globalAlpha = 1; } continue; }
    if (o.t === 'stamps') { if (sh.stamps) drawStamps(c, sh.stamps); continue; }
    if (o.t === 'glyphs') { if (sh.cells) drawGlyphs(c, sh.cells, o.c); continue; }
    if (o.t === 'stroke') { const pth = sh.paths[o.k]; if (!pth) continue; c.globalAlpha = 1; c.strokeStyle = o.c; c.lineWidth = o.lw * w0; c.lineJoin = 'round'; c.stroke(pth); continue; }
    const drop = o.t === 'drop', off = drop ? -0.4 : o.off, dx = lx * off * w0, dy = ly * off * w0;
    if (o.t === 'half') { c.globalAlpha = o.a; c.fillStyle = halftone(c, o.c, sh.wd || w0); c.translate(dx, dy); c.fill(sh.paths[1]); c.translate(-dx, -dy); continue; }
    const path = drop ? sh.paths[o.k || 1] : o.t === 'ink' ? sh.ink : sh.paths[o.k];
    if (!path) continue;
    const blur = drop ? (o.hard ? 0 : 0.5) : o.blur;
    if (blur) {
      // Soft: draw the band far off to one side and let only its blurred shadow land here
      if (!far) { const m = c.getTransform(), det = m.a * m.d - m.b * m.c || 1; scale = Math.sqrt(Math.abs(det)); far = [m.d * BIG / det, -m.b * BIG / det]; }
      c.shadowColor = drop ? `rgba(0,0,0,${o.a})` : rgba(o.c, o.a); c.shadowBlur = blur * w0 * scale; c.shadowOffsetX = -BIG; c.shadowOffsetY = 0;
      c.fillStyle = '#000'; c.globalAlpha = 1;
      c.translate(dx + far[0], dy + far[1]); c.fill(path); c.translate(-dx - far[0], -dy - far[1]);
      c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetX = 0;
      continue;
    }
    c.globalAlpha = o.a;
    c.fillStyle = o.pat ? halftone(c, o.c, sh.wd || w0, o.pat) : o.c;
    c.translate(dx, dy); c.fill(path); c.translate(-dx, -dy);
  }
  c.globalAlpha = 1;
}
