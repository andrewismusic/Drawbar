// Rendering: the canvases, cached still-stroke layers (pool), glow, re-lighting with cross-fade, auto quality, and frame()
import { COPIES, cellDims, effEraseR, forCopies, fs, tileGeo } from '../canvas/index.js';
import { page, preview } from '../core/clips.js';
import { $ } from '../core/dom.js';
import { cur, eraseAt, erasing, unrot } from '../core/input.js';
import { relayout } from '../core/layout.js';
import { SQ3, TAU, clamp, hash32, mod } from '../core/math.js';
import { anim, rebuild, stepRandomize } from '../core/settings.js';
import { score } from '../core/state.js';
import { BEAD_R, NEON_W } from '../core/stroke.js';
import { TOOL } from '../core/tools.js';
import { beatAt, rotAt, scrollAt, visNow } from '../core/transport.js';
import { composeRot, drawShape, setComposeRot } from './ops.js';
import { buildShape, capsAlong, centerPath, geoChain } from './shapes.js';
import { ARR } from '../sound/arranger.js';
import { MATS } from '../styles/index.js';
import { pixelScale, world } from '../worlds/index.js';
import { GCELL, glyphCells, glyphShape, lineSamples } from './glyphs.js';
import { stampPts, stampShape } from './stamps.js';

export const cv = $('cv'), ctx = cv.getContext('2d');
export const fb = document.createElement('canvas'), fctx = fb.getContext('2d');
export const glowC = document.createElement('canvas'), gctx = glowC.getContext('2d');
export const glowS = document.createElement('canvas'), gsctx = glowS.getContext('2d');
export const geo = { W: 600, H: 600, R: 282, Rcss: 282, wide: false };
export let groupsDirty = true, discGrad = null, ITEMS = [], pool = [], poolB = [], canKey = '';
// Ask for the still strokes to be redrawn on the next frame
export const markGroupsDirty = () => { groupsDirty = true; };
// Redraw now, and rebuild the music soon (throttled): used while erasing or turning a pattern knob
export const redrawSoon = () => { groupsDirty = true; needsRebuild = true; };
export function resizeCanvas(w, h, wide) {
  const Rcss = wide ? Math.hypot(w, h) / 2 : w * 0.49;
  let dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
  if (2.12 * Rcss * dpr > 2300) dpr = 2300 / (2.12 * Rcss);
  // Pixel world: one canvas pixel per few screen pixels, scaled up crisp by CSS
  const px = pixelScale();
  if (px) dpr = 1 / px;
  cv.classList.toggle('pixel', !!px);
  cv.classList.toggle('wide', wide);
  geo.W = cv.width = Math.round(w * dpr); geo.H = cv.height = Math.round(h * dpr);
  geo.R = Rcss * dpr; geo.Rcss = Rcss; geo.wide = wide;
  discGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  discGrad.addColorStop(0, '#1c2134'); discGrad.addColorStop(0.7, '#161a29'); discGrad.addColorStop(1, '#131623');
  canKey = ''; ensureCanvases();
}
export function ensureCanvases() {
  // Lattice and tessellation compose one repeating cell, then fill the view with it as a pattern
  const cd = cellDims();
  let fw, fh;
  if (cd) { fw = Math.max(16, Math.round(cd[0] * geo.R)); fh = Math.max(16, Math.round(cd[1] * geo.R)); }
  else fw = fh = Math.ceil(geo.R * 2.12);
  const key = fw + 'x' + fh;
  if (key === canKey) return;
  canKey = key;
  fb.width = fw; fb.height = fh;
  glowC.width = glowS.width = Math.max(8, Math.round(fw / 6)); glowC.height = glowS.height = Math.max(8, Math.round(fh / 6));
  pool = []; poolB = []; groupsDirty = true;
}
export function frameNorm(c, can) {
  const cd = cellDims();
  if (cd) c.setTransform(can.width / cd[0], 0, 0, can.height / cd[1], 0, 0);
  else { const k = can.width / 2.12; c.setTransform(k, 0, 0, k, can.width / 2, can.height / 2); }
}
export const setNorm = c => c.setTransform(geo.R, 0, 0, geo.R, geo.W / 2, geo.H / 2);
export const bloomW = s => 0.016 + 0.022 * Math.sqrt(s._sz);
export function drawUnit(c, u) {
  drawShape(c, u.shape, MATS[u.color].ops);
}
export const bbHit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
// Find still strokes that newer still strokes cover completely (checked on a small mask of the drawing, copies included).
// They are skipped when drawing; undo or erasing the stroke on top brings them straight back.
export let HIDDEN = new Set();
export function refreshHidden() { HIDDEN = computeHidden(); }
export const maskC = document.createElement('canvas'), maskX = maskC.getContext('2d', { willReadFrequently: true });
export function computeHidden() {
  const hid = new Set(), S = score.strokes;
  if (S.length < 2) return hid;
  const sc = Math.min(1, 200 / Math.max(fb.width, fb.height)), W = Math.max(8, Math.round(fb.width * sc)), H = Math.max(8, Math.round(fb.height * sc));
  if (maskC.width !== W || maskC.height !== H) { maskC.width = W; maskC.height = H; }
  const cov = new Uint8Array(W * H);
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i];
    if (TOOL[s.tool].kind !== 'static' || !s._shape) continue;
    const sh = s._shape, sil = sh.ink || sh.paths[1];
    if (!sil) continue;
    maskX.setTransform(1, 0, 0, 1, 0, 0); maskX.clearRect(0, 0, W, H);
    frameNorm(maskX, maskC); maskX.fillStyle = '#000';
    // Test a slightly fattened outline (shadows and outlines reach a little further than the body)
    forCopies(maskX, () => { maskX.fill(sil); maskX.lineWidth = sh.w0 * 0.6; maskX.strokeStyle = '#000'; maskX.stroke(sil); if (sh.paths.all) { maskX.fill(sh.paths.all); maskX.stroke(sh.paths.all); } else if (s.color != null && MATS[s.color].extra === 'vine') { for (const k of ['leaf', 'pet']) sh.paths[k] && (maskX.fill(sh.paths[k]), maskX.stroke(sh.paths[k])); } }, s);
    const d = maskX.getImageData(0, 0, W, H).data;
    let covered = true, any = false;
    for (let p = 0, q = 3; p < W * H; p++, q += 4) if (d[q] > 6) { any = true; if (!cov[p]) { covered = false; break; } }
    if (any && covered) { hid.add(s); continue; }
    // Only the solid middle of this stroke counts as covering what lies beneath
    maskX.setTransform(1, 0, 0, 1, 0, 0); maskX.clearRect(0, 0, W, H); frameNorm(maskX, maskC);
    forCopies(maskX, () => maskX.fill(sh.paths[1]), s);
    const e = maskX.getImageData(0, 0, W, H).data;
    for (let p = 0, q = 3; p < W * H; p++, q += 4) if (e[q] > 250) cov[p] = 1;
  }
  return hid;
}
// Still strokes become units, drawn into the cached layers; moving strokes are passed through and drawn every frame
export function unitsOf(strokes) {
  const out = [];
  for (const s of strokes) {
    if (HIDDEN.has(s)) continue;
    if (TOOL[s.tool].kind !== 'static') { out.push({ s }); continue; }
    const bb = s._bb.slice();
    out.push({ list: [s], color: s.color, tool: s.tool, bb, _bb: bb, shape: s._shape });
  }
  return out;
}
export let litRot = 0, litAt = 0, renderMs = 0, relight = null, fade = null;
// Whether any still stroke on screen is lit (see M.lit). If none is, turning the picture never triggers re-lighting:
// the cached layers simply turn with it. Flat, code and garden styles are never lit.
let lightNeeded = false;
// Re-lighting while the picture turns: redraw the still strokes a slice per frame into a spare set of layers,
// then cross-fade to them, so the light keeps up without ever stalling a frame
export function stepRelight(now) {
  const R = relight, S = R.list || (R.list = unitsOf(score.strokes)), budget = 1200;
  let cost = 0;
  const saved = composeRot;
  setComposeRot(R.rot);
  while (R.i < S.length && cost < budget) {
    const it = S[R.i++];
    if (it.list) {
      if (!R.cur) {
        if (!poolB[R.gi]) { const c = document.createElement('canvas'); c.width = fb.width; c.height = fb.height; poolB[R.gi] = c; }
        const c = poolB[R.gi++], x = c.getContext('2d');
        x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); frameNorm(x, c);
        R.cur = { canvas: c, x }; R.items.push(R.cur);
      }
      const ops = MATS[it.color].cost;
      forCopies(R.cur.x, () => { drawUnit(R.cur.x, it); cost += ops; }, it);
    } else { R.cur = null; R.items.push({ s: it.s }); }
  }
  setComposeRot(saved);
  if (R.i >= S.length) {
    fade = { old: ITEMS, t0: now };
    ITEMS = R.items; [pool, poolB] = [poolB, pool]; litRot = R.rot; relight = null;
  }
}
// Layers no longer used give their memory back at once (setting a canvas to 0 x 0 frees it; phones have little canvas memory)
function trimPool(list, used) {
  for (let i = used; i < list.length; i++) list[i].width = list[i].height = 0;
  list.length = Math.min(list.length, used);
}
// Leaving a tab: drop its cached layers and any re-lighting in progress, and let the next tab measure its own speed
export function releaseCanvases() {
  trimPool(pool, 0); trimPool(poolB, 0);
  ITEMS = []; relight = null; fade = null; groupsDirty = true;
  if (quality !== 1) { quality = 1; relayout(); }
  slowFor = fastFor = 0; frameEma = 16;
}
export function renderGroups(rot = 0) {
  relight = null; fade = null;
  const t0 = performance.now();
  setComposeRot(litRot = rot); litAt = t0;
  ITEMS = [];
  let gi = 0, cur = null;
  lightNeeded = false;
  for (const it of unitsOf(score.strokes)) {
    if (it.list) {
      if (MATS[it.color].lit) lightNeeded = true;
      if (!cur) {
        if (!pool[gi]) { const c = document.createElement('canvas'); c.width = fb.width; c.height = fb.height; pool[gi] = c; }
        const c = pool[gi++], x = c.getContext('2d');
        x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
        frameNorm(x, c);
        cur = { canvas: c, x };
        ITEMS.push(cur);
      }
      forCopies(cur.x, () => drawUnit(cur.x, it), it);
    } else { cur = null; ITEMS.push({ s: it.s }); }
  }
  gsctx.setTransform(1, 0, 0, 1, 0, 0); gsctx.clearRect(0, 0, glowS.width, glowS.height);
  frameNorm(gsctx, glowS); gsctx.lineCap = 'round'; gsctx.lineJoin = 'round';
  gsctx.shadowBlur = 4;
  for (const s of score.strokes) {
    if (TOOL[s.tool].kind !== 'static' || HIDDEN.has(s)) continue;
    const M = MATS[s.color];
    if (!M.glowA) continue;
    gsctx.globalAlpha = M.glowA; gsctx.strokeStyle = gsctx.shadowColor = M.glow; gsctx.lineWidth = bloomW(s);
    forCopies(gsctx, () => gsctx.stroke(s._path), s);
    gsctx.globalAlpha = 1;
  }
  gsctx.shadowBlur = 0;
  trimPool(pool, gi);
  groupsDirty = false;
  renderMs = performance.now() - t0;
}
// The shape of a moving stroke for this frame (round capsules, or polygons for geometric materials)
function animBody(M, xs, ys, w, i1, sz, s, head) {
  const w0 = NEON_W * sz;
  if (M.glyph) { const smp = lineSamples(xs, ys, w, i1, s._L); return glyphShape(glyphCells(smp, s.id, head ? smp.length - 3 : Infinity), w0); }
  if (M.geo) return buildShape([], geoChain(xs, ys, w, 0, i1, M.geo), M.ks, w0 * 0.9, (M.ink || 0) * w0);
  return buildShape(capsAlong(xs, ys, w, 0, i1, 3), [], M.ks, NEON_W * sz * 0.9, M.comic ? 0.26 * NEON_W * sz : 0);
}
export function drawAnim(X, s, S, B) {
  const M = MATS[s.color], n = s.pts.length;
  if (s.tool === 'loop') {
    const ph = score.timing === 'clocked' ? mod((B - s.startBeat) / (s._Pb || 4), 1) : mod((S - s.start) / s._dur, 1), T = ph * s._dur;
    let iT = 0;
    while (iT < n - 1 && s.pts[iT + 1][2] <= T) iT++;
    if (iT < 1) return null;
    const body = animBody(M, s._xs, s._ys, s._w, iT, s._sz, s, true);
    forCopies(X, () => drawShape(X, body, M.animOps), s);
    return centerPath(s._xs, s._ys, 0, iT, 4);
  }
  // Ripple: slower parts of the gesture ripple wider
  const rx = s._rx, ry = s._ry, L = s._L, amp = 0.006 * s._sz;
  for (let i = 0; i < n; i++) {
    const u = L[i] / Math.max(s._len, 1e-4), off = amp * s._amp[i] * Math.sin(Math.PI * u) * Math.sin(TAU * (u * s._waves - s._rate * S));
    rx[i] = s._xs[i] + s._nx[i] * off; ry[i] = s._ys[i] + s._ny[i] * off;
  }
  const body = animBody(M, rx, ry, s._w, n - 1, s._sz, s, false);
  forCopies(X, () => drawShape(X, body, M.animOps), s);
  return centerPath(rx, ry, 0, n - 1, 4);
}
export function drawPreview(X) {
  if (cur && cur.stamp) {
    // A stamp being placed: the real shape, a little see-through, in every copy
    const sh = stampShape(cur.stamp, stampPts(cur.stamp, cur.cx, cur.cy, cur.r, cur.rot)), r = cur.r + 0.03;
    X.fillStyle = MATS[cur.color].accent; X.globalAlpha = 0.8;
    forCopies(X, () => X.fill(sh.paths[1]), { _bb: [cur.cx - r, cur.cy - r, cur.cx + r, cur.cy + r] });
    X.globalAlpha = 1;
    return;
  }
  if (!cur || cur.pts.length < 2) return;
  const path = new Path2D(), M = MATS[cur.color], sz = cur.size, bb = [1e9, 1e9, -1e9, -1e9];
  path.moveTo(cur.pts[0][0], cur.pts[0][1]);
  for (const q of cur.pts) { path.lineTo(q[0], q[1]); bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); }
  const bm = 0.015 * sz + 0.03; bb[0] -= bm; bb[1] -= bm; bb[2] += bm; bb[3] += bm;
  X.lineCap = 'round'; X.lineJoin = 'round';
  forCopies(X, () => {
    if (cur.tool === 'beads') { X.lineWidth = BEAD_R * 4 * sz; X.strokeStyle = M.accent; X.stroke(path); }
    else { X.lineWidth = NEON_W * 2 * sz; X.strokeStyle = M.accent; X.stroke(path); X.lineWidth = NEON_W * 0.72 * sz; X.strokeStyle = M.light; X.stroke(path); }
  }, { _bb: bb });
}
export function drawGuides(B, rot) {
  const m = score.mode, ext = Math.hypot(geo.W, geo.H) / 2 / geo.R + 0.05;
  ctx.strokeStyle = '#1c2132'; ctx.lineWidth = 0.003; ctx.beginPath();
  if (m === 'kaleido' && score.spiral < 0.04) {
    ctx.save(); ctx.rotate(rot);
    const n = COPIES[score.copies] * (score.mirror ? 2 : 1);
    if (n <= 24) for (let k = 0; k < n; k++) { const a = TAU * k / n; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * ext, Math.sin(a) * ext); }
    ctx.stroke(); ctx.restore(); return;
  }
  if (m === 'free' && world().render.grid) {
    // Code grid (Glitch): the cells marks snap to, faintly
    const g = GCELL * fs(), e = Math.ceil(ext / g) * g;
    for (let x = -e; x <= ext; x += g) { ctx.moveTo(x, -ext); ctx.lineTo(x, ext); }
    for (let y = -e; y <= ext; y += g) { ctx.moveTo(-ext, y); ctx.lineTo(ext, y); }
    ctx.strokeStyle = '#162019';
  }
  if (m === 'tiles') {
    const g = tileGeo(), sc = scrollAt(B), A = g.a;
    if (!g.hex) {
      for (let x = -Math.ceil(ext / A) * A; x <= ext; x += A) { ctx.moveTo(x, -ext); ctx.lineTo(x, ext); }
      for (let y = mod(-sc, A) - Math.ceil(ext / A) * A; y <= ext; y += A) { ctx.moveTo(-ext, y); ctx.lineTo(ext, y); }
    } else {
      const H = g.rowH, r = A / SQ3;
      for (let j = -Math.ceil(ext / H) - 1; j <= Math.ceil((ext + sc) / H) + 1; j++) {
        const cy = j * H - sc, ox = g.offX(j);
        if (cy < -ext - H || cy > ext + H) continue;
        for (let i = -Math.ceil(ext / A) - 1; i <= Math.ceil(ext / A) + 1; i++) {
          const cx = i * A + ox;
          for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
          ctx.closePath();
        }
      }
    }
  }
  ctx.stroke();
}

export let lastRebuildT = 0, needsRebuild = false;
// Automatic quality: if frames run slow for a while, draw at a lower resolution; step back up when there's headroom
export let quality = 1, frameEma = 16, lastFrameT = 0, slowFor = 0, fastFor = 0;
export function watchFrameRate(now) {
  const dt = lastFrameT ? Math.min(now - lastFrameT, 100) : 16;
  lastFrameT = now;
  if (document.hidden || erasing || cur) return;
  frameEma += (dt - frameEma) * 0.05;
  if (frameEma > 26) { slowFor++; fastFor = 0; } else if (frameEma < 15) { fastFor++; slowFor = 0; } else { slowFor = 0; fastFor = 0; }
  const next = slowFor > 90 && quality > 0.55 ? Math.max(0.55, quality - 0.15) : fastFor > 400 && quality < 1 ? Math.min(1, quality + 0.15) : quality;
  if (next !== quality) { quality = next; slowFor = fastFor = 0; frameEma = 16; relayout(); }
}
export function frame(now) {
  requestAnimationFrame(frame);
  if (!ARR) return;
  watchFrameRate(now);
  if (anim) stepRandomize(now);
  if (erasing) { erasing.p = unrot(erasing.screen); eraseAt(erasing.p); }
  if (needsRebuild && now - lastRebuildT > 120) { needsRebuild = false; lastRebuildT = now; rebuild(); }
  ensureCanvases();
  const S = visNow(), B = beatAt(S), rot = rotAt(B), W = geo.W, H = geo.H, cd = cellDims();
  // While the picture turns, re-light the still strokes now and then so the light stays put (only when that is cheap)
  if (groupsDirty) renderGroups(rot);
  else if (relight) stepRelight(now);
  else if (!fade && lightNeeded && !world().render.fixedLight && rot !== litRot && Math.abs(mod(rot - litRot + Math.PI, TAU) - Math.PI) > 0.1) relight = { rot: rot + 0.03, i: 0, gi: 0, items: [], cur: null };
  if (fade && now - fade.t0 > 160) fade = null;
  setComposeRot(rot);
  fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fb.width, fb.height);
  gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.clearRect(0, 0, glowC.width, glowC.height); gctx.drawImage(glowS, 0, 0);
  const fa = fade ? clamp((now - fade.t0) / 160, 0, 1) : 1;
  for (let j = 0; j < ITEMS.length; j++) {
    const it = ITEMS[j];
    if (it.canvas) {
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      if (fade && fade.old[j] && fade.old[j].canvas) { fctx.drawImage(fade.old[j].canvas, 0, 0); fctx.globalAlpha = fa; }
      fctx.drawImage(it.canvas, 0, 0); fctx.globalAlpha = 1;
      continue;
    }
    frameNorm(fctx, fb);
    const path = drawAnim(fctx, it.s, S, B);
    if (!path) continue;
    frameNorm(gctx, glowC); gctx.lineCap = 'round';
    const M = MATS[it.s.color];
    if (!M.glowA) continue;
    gctx.globalAlpha = M.glowA; gctx.strokeStyle = M.glow; gctx.lineWidth = bloomW(it.s);
    forCopies(gctx, () => gctx.stroke(path), it.s);
    gctx.globalAlpha = 1;
  }
  frameNorm(fctx, fb);
  drawPreview(fctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  setNorm(ctx);
  ctx.save();
  ctx.beginPath();
  if (geo.wide) ctx.rect(-W / 2 / geo.R, -H / 2 / geo.R, W / geo.R, H / geo.R); else ctx.arc(0, 0, 1, 0, TAU);
  ctx.fillStyle = discGrad; ctx.fill(); ctx.clip();
  drawGuides(B, rot);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (cd) {
    const sc = scrollAt(B);
    const fillPat = (img, alpha, op) => {
      const pat = ctx.createPattern(img, 'repeat');
      pat.setTransform(new DOMMatrix([geo.R * cd[0] / img.width, 0, 0, geo.R * cd[1] / img.height, W / 2, H / 2 - sc * geo.R]));
      ctx.globalAlpha = alpha; ctx.globalCompositeOperation = op; ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    };
    fillPat(glowC, 0.32, 'lighter'); fillPat(fb, 1, 'source-over');
    ctx.globalAlpha = 1;
  } else {
    ctx.translate(W / 2, H / 2); ctx.rotate(rot);
    const F = fb.width;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.32;
    ctx.drawImage(glowC, -F / 2, -F / 2, F, F);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(fb, -F / 2, -F / 2);
  }
  ctx.restore();
  if (world().render.glitch && !reduceMotion.matches) glitchPass(now);
  setNorm(ctx);
  if (!geo.wide) { ctx.strokeStyle = '#262b3e'; ctx.lineWidth = 0.004; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.stroke(); }
  if (erasing) {
    ctx.save(); ctx.beginPath(); ctx.arc(erasing.screen.x, erasing.screen.y, effEraseR(), 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
    ctx.shadowColor = 'rgba(236,232,220,0.8)'; ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(236,232,220,0.85)'; ctx.lineWidth = 0.005; ctx.stroke(); ctx.restore();
  }
  if (preview && page === 'clips') { const nc = $('nowCv'), nx = nc.getContext('2d'); nx.clearRect(0, 0, 128, 128); const s = Math.min(W, H); nx.drawImage(cv, (W - s) / 2, (H - s) / 2, s, s, 0, 0, 128, 128); }
}
// Glitch world: a few horizontal slices of the finished frame shifted sideways. Mostly quiet, with short bursts.
// Visual only, driven by the frame clock (not seeded): it never touches the music. A handful of image copies per frame.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function glitchPass(now) {
  const W = geo.W, H = geo.H, tick = Math.floor(now / 90), h = hash32(tick, 77), burst = hash32(Math.floor(now / 1600), 5) % 5 === 0;
  const n = burst ? 2 + (h & 3) : (h & 15) === 0 ? 1 : 0;
  if (!n) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const r = hash32(tick, i, 9), y = Math.floor((r % 1000) / 1000 * H), bh = Math.max(2, Math.floor(((r >>> 10) % 100) / 100 * H * 0.07)), dx = Math.round((((r >>> 17) % 200) / 100 - 1) * W * 0.05);
    ctx.drawImage(cv, 0, y, W, bh, dx, y, W, bh);
  }
}
