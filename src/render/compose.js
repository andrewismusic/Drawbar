// Rendering: the canvases, cached still-stroke layers (pool), glow, re-lighting with cross-fade, auto quality, and frame()
import { COPIES, cellDims, effEraseR, forCopies, fs, tileGeo } from '../canvas/index.js';
import { page, preview } from '../core/clips.js';
import { $ } from '../core/dom.js';
import { cur, eraseAt, erasing, unrot } from '../core/input.js';
import { relayout } from '../core/layout.js';
import { SQ3, TAU, clamp, mod } from '../core/math.js';
import { anim, hiddenChanged, rebuild, stepRandomize } from '../core/settings.js';
import { score } from '../core/state.js';
import { BEAD_R, NEON_W, prepare } from '../core/stroke.js';
import { drawUpright } from './space.js';
import { TOOL } from '../core/tools.js';
import { beatAt, rotAt, scrollAt, visNow } from '../core/transport.js';
import { composeRot, drawShape, setComposeRot } from './ops.js';
import { buildShape, capsAlong, centerPath, geoChain } from './shapes.js';
import { ARR } from '../sound/arranger.js';
import { MATS, colorOf, opsOf } from '../styles/index.js';
import { pixelScale, world } from '../worlds/index.js';
import { GCELL, glyphCells, glyphShape, lineSamples } from './glyphs.js';
import { stampPts, stampShape } from './stamps.js';
import { drawLive, liveFrame } from './glitchfx.js';
import { pulseFrame } from '../sound/pulse.js';
import { drawFilm, drawSpaceBg, drawTwinkles } from './space.js';
import { drawMicroBg, drawPaperBg } from './micro.js';

export const cv = $('cv'), ctx = cv.getContext('2d');
export const fb = document.createElement('canvas'), fctx = fb.getContext('2d');
export const glowC = document.createElement('canvas'), gctx = glowC.getContext('2d');
export let glowS = document.createElement('canvas'), gsctx = glowS.getContext('2d');
let glowT = document.createElement('canvas'), gtctx = glowT.getContext('2d');   // spare, for a redraw in the background
// Tests set this to draw everything at once, as before v25, so results are ready straight away
export let syncDraw = false;
export const setSyncDraw = v => { syncDraw = v; };
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
  glowC.width = glowS.width = glowT.width = Math.max(8, Math.round(fw / 6)); glowC.height = glowS.height = glowT.height = Math.max(8, Math.round(fh / 6));
  trimPool(pool, 0); trimPool(poolB, 0);
  ITEMS = []; relight = null; fade = null; groupsDirty = true; pending.length = 0;
}
export function frameNorm(c, can) {
  const cd = cellDims();
  if (cd) c.setTransform(can.width / cd[0], 0, 0, can.height / cd[1], 0, 0);
  else { const k = can.width / 2.12; c.setTransform(k, 0, 0, k, can.width / 2, can.height / 2); }
}
export const setNorm = c => c.setTransform(geo.R, 0, 0, geo.R, geo.W / 2, geo.H / 2);
export const bloomW = s => 0.016 + 0.022 * Math.sqrt(s._sz);
export function drawUnit(c, u) {
  drawShape(c, u.shape, opsOf(u.list[0]));
}
// ----- Sprites (v28). In styles marked render.sprites (unlit, or lit with the light fixed to the stroke), a still
// stroke is drawn once into a spare canvas and that picture is pasted for every copy, instead of running the whole
// recipe per copy. Nothing is kept: the spare is reused for the next stroke, so it costs no memory to speak of, and a
// full redraw is one recipe per stroke plus pastes. Pasted pictures are turned and resampled, so they are very
// slightly softer than fresh drawing. Tests (syncDraw) and other styles draw every copy fresh, as before.
const SPR = { c: document.createElement('canvas'), owner: null }, PRE = { c: document.createElement('canvas'), owner: null };
SPR.x = SPR.c.getContext('2d'); PRE.x = PRE.c.getContext('2d');
const useSprite = s => !syncDraw && world().render.sprites && s._shape && s._bb && !MATS[s.color].live;
function renderSprite(S, s, k) {
  const b = s._bb, w = Math.ceil((b[2] - b[0]) * k) + 2, h = Math.ceil((b[3] - b[1]) * k) + 2;
  if (w * h > 6e6 || w > 4096 || h > 4096) return null;
  const key = s.id + ':' + s.pts.length + ':' + k.toFixed(3) + ':' + (s.tint || '') + s.color;
  if (S.owner !== key || S.w !== w || S.h !== h) {
    if (S.c.width < w) S.c.width = w;
    if (S.c.height < h) S.c.height = h;
    S.x.setTransform(1, 0, 0, 1, 0, 0); S.x.globalAlpha = 1; S.x.globalCompositeOperation = 'source-over'; S.x.clearRect(0, 0, S.c.width, S.c.height);
    S.x.setTransform(k, 0, 0, k, 1 - b[0] * k, 1 - b[1] * k);
    const saved = composeRot;
    setComposeRot(0);   // the light sits in the stroke's own space, so every copy carries its own (as in a real kaleidoscope)
    S.x.sprite = true;
    drawShape(S.x, s._shape, opsOf(s));
    setComposeRot(saved);
    S.owner = key; S.w = w; S.h = h;
  }
  return S;
}
// Draw copies from..to-1 of a still stroke into a layer (c is already in the layer's drawing space). Returns the number of copies.
function drawCopies(c, s, from, to, S = SPR) {
  if (useSprite(s)) {
    const m = c.getTransform(), k = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) * fs(), sp = renderSprite(S, s, k);
    if (sp) {
      const b = s._bb;
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      const total = forCopies(c, () => c.drawImage(sp.c, 0, 0, sp.w, sp.h, b[0] - 1 / k, b[1] - 1 / k, sp.w / k, sp.h / k), s, from, to);
      // pieces that must stay upright whatever the copy's turn (Space: star spikes), drawn straight into the layer
      if (s._shape.up && s._shape.up.length) forCopies(c, () => drawUpright(c, s._shape.up), s, from, to);
      return total;
    }
  }
  return forCopies(c, () => { drawShape(c, s._shape, opsOf(s)); if (s._shape.up) drawUpright(c, s._shape.up); }, s, from, to);
}
// Still: drawn once into a cached layer. Moving tools (Loop, Ripple) and live materials (Glitch) are drawn every frame.
const isStill = s => TOOL[s.tool].kind === 'static' && !MATS[s.color].live;
export const bbHit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
// Find still strokes that newer still strokes cover completely (checked on a small mask of the drawing, copies included).
// They are skipped when drawing; undo or erasing the stroke on top brings them straight back.
export let HIDDEN = new Set();
export function refreshHidden() { HIDDEN = computeHidden(); hiddenAt = 0; hiddenJob = null; }
export const maskC = document.createElement('canvas'), maskX = maskC.getContext('2d', { willReadFrequently: true });
// The work is cut into steps (one stroke each) so it can also run a little per frame: see checkHiddenSoon.
function hiddenStart() {
  const S = score.strokes.slice(), sc = Math.min(1, 200 / Math.max(fb.width, fb.height)), W = Math.max(8, Math.round(fb.width * sc)), H = Math.max(8, Math.round(fb.height * sc));
  if (maskC.width !== W || maskC.height !== H) { maskC.width = W; maskC.height = H; }
  return { S, i: S.length < 2 ? -1 : S.length - 1, hid: new Set(), cov: new Uint8Array(W * H), any: false, W, H };
}
// Runs for about ms milliseconds; true when finished
function hiddenStep(J, ms) {
  const { S, hid, cov, W, H } = J, t0 = performance.now();
  while (J.i >= 0) {
    const s = S[J.i];
    if (!isStill(s) || !s._shape) { J.i--; continue; }
    const sh = s._shape, sil = sh.ink || sh.paths[1];
    if (!sil || sh.noHide) { J.i--; continue; }   // noHide: soft light (Space) neither hides nor is hidden
    // Two phases per stroke (test it, then add its cover), so a step can pause between them
    // Nothing above it yet covers anything: it cannot be hidden, so skip the test
    if (J.any && !J.tested) {
      J.tested = true;
      maskX.setTransform(1, 0, 0, 1, 0, 0); maskX.clearRect(0, 0, W, H);
      frameNorm(maskX, maskC); maskX.fillStyle = '#000';
      // Test a slightly fattened outline (shadows and outlines reach a little further than the body)
      forCopies(maskX, () => { maskX.fill(sil); maskX.lineWidth = sh.w0 * 0.6; maskX.strokeStyle = '#000'; maskX.stroke(sil); if (sh.paths.all) maskX.fill(sh.paths.all); else if (s.color != null && MATS[s.color].extra === 'vine') { for (const k of ['leaf', 'pet']) sh.paths[k] && (maskX.fill(sh.paths[k]), maskX.stroke(sh.paths[k])); } }, s);
      const d = maskX.getImageData(0, 0, W, H).data;
      let covered = true, any = false;
      for (let p = 0, q = 3; p < W * H; p++, q += 4) if (d[q] > 6) { any = true; if (!cov[p]) { covered = false; break; } }
      if (any && covered) { hid.add(s); J.i--; J.tested = false; continue; }
      if (performance.now() - t0 > ms) break;
    }
    J.i--; J.tested = false;
    // Only the solid middle of this stroke counts as covering what lies beneath
    maskX.setTransform(1, 0, 0, 1, 0, 0); maskX.clearRect(0, 0, W, H); frameNorm(maskX, maskC);
    forCopies(maskX, () => maskX.fill(sh.paths[1]), s);
    const e = maskX.getImageData(0, 0, W, H).data;
    for (let p = 0, q = 3; p < W * H; p++, q += 4) if (e[q] > 250) { cov[p] = 1; J.any = true; }
    if (performance.now() - t0 > ms) break;
  }
  return J.i < 0;
}
export function computeHidden() { const J = hiddenStart(); hiddenStep(J, Infinity); return J.hid; }
// After a new stroke or an erase, the hidden-stroke test runs a moment later, a few milliseconds per frame, so drawing
// never waits for it. If the answer changed, the music is re-arranged and the layers are redrawn in the background.
let hiddenAt = 0, hiddenJob = null, softWanted = false;
export function checkHiddenSoon(wait = 250) { hiddenAt = performance.now() + wait; hiddenJob = null; }
function stepHiddenCheck(now) {
  if (!hiddenAt || now < hiddenAt || cur || erasing || pending.length) return;
  if (!hiddenJob) hiddenJob = hiddenStart();
  if (!hiddenStep(hiddenJob, 3)) return;
  const hid = hiddenJob.hid, live = new Set(score.strokes);
  hiddenAt = 0; hiddenJob = null;
  let same = true;
  for (const s of hid) if (!HIDDEN.has(s)) same = false;
  for (const s of HIDDEN) if (live.has(s) && !hid.has(s)) same = false;
  HIDDEN = hid;
  if (!same) { hiddenChanged(); softWanted = true; }
}
// Still strokes become units, drawn into the cached layers; moving strokes are passed through and drawn every frame
export function unitsOf(strokes) {
  const out = [];
  for (const s of strokes) {
    if (HIDDEN.has(s)) continue;
    if (!isStill(s)) { out.push({ s }); continue; }
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
  const R = relight, S = R.list || (R.list = unitsOf(score.strokes)), ms = R.build ? 8 : 6;
  // A full redraw tunes its own budget: the browser paints after this returns, so only the frame gap shows the real cost
  if (R.build && R.frames) buildBudget = frameDt > 30 ? Math.max(30, buildBudget * 0.6) : frameDt < 20 ? Math.min(4000, buildBudget * 1.25) : buildBudget;
  const budget = R.build ? buildBudget : 500;
  let cost = 0;
  const saved = composeRot, P = R.direct ? pool : poolB;
  setComposeRot(R.rot);
  const t0 = performance.now();
  R.frames = (R.frames || 0) + 1;
  // Stop on the cost budget or after a few ms, whichever comes first, so a redraw never holds a frame for long
  while (R.i < S.length && cost < budget && performance.now() - t0 < ms) {
    const it = S[R.i++];
    if (it.list) {
      if (!R.cur) {
        if (!P[R.gi]) { const c = document.createElement('canvas'); c.width = fb.width; c.height = fb.height; P[R.gi] = c; }
        const c = P[R.gi++], x = c.getContext('2d');
        x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height); frameNorm(x, c);
        R.cur = { canvas: c, x }; R.items.push(R.cur);
      }
      const ops = MATS[it.color].cost + (it.shape.stamps ? it.shape.stamps.length / 6 : 0);
      cost += drawCopies(R.cur.x, it.list[0]) * (useSprite(it.list[0]) ? 2 : ops);
      if (R.build) for (const s of it.list) glowOf(R.g, s);
    } else { R.cur = null; R.items.push({ s: it.s }); }
  }
  setComposeRot(saved);
  if (R.i >= S.length) {
    relight = null; pending.length = 0;
    if (R.direct) { trimPool(pool, R.gi); return; }
    // A redraw that took a single frame just appears; a longer one fades in
    if (!(R.build && R.frames === 1)) fade = { old: ITEMS, t0: now, both: R.build };
    ITEMS = R.items; [pool, poolB] = [poolB, pool]; litRot = R.rot;
    if (R.build) { [glowS, glowT] = [glowT, glowS]; [gsctx, gtctx] = [gtctx, gsctx]; trimPool(pool, R.gi); }
  }
}
// The soft glow of one still stroke, into a glow layer
function glowOf(g, s) {
  const M = MATS[s.color];
  if (!M.glowA) return;
  frameNorm(g, g.canvas); g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowBlur = 4;
  g.globalAlpha = M.glowA; g.strokeStyle = g.shadowColor = M.glow; g.lineWidth = bloomW(s);
  forCopies(g, () => g.stroke(s._path), s);
  g.globalAlpha = 1; g.shadowBlur = 0;
}
// A full redraw (pattern or knob change, undo, clip load) is spread over frames, about 8 ms each, so the animation never
// stops for it (v25; it used to be one long pause, growing with strokes x copies). With something on screen, the new
// picture is drawn out of sight and faded in; with nothing on screen yet, strokes appear as they are drawn.
let buildBudget = 150, frameDt = 16;
function startBuild(rot) {
  groupsDirty = false; fade = null; pending.length = 0;
  buildBudget = Math.min(buildBudget, 200);   // start gently: the last build's budget says nothing about this picture
  lightNeeded = score.strokes.some(s => isStill(s) && MATS[s.color].lit);
  const direct = !ITEMS.length, g = direct ? gsctx : gtctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, g.canvas.width, g.canvas.height);
  relight = { rot, i: 0, gi: 0, items: direct ? ITEMS : [], cur: null, build: true, direct, g };
  if (direct) litRot = rot;
}
// Layers no longer used give their memory back at once (setting a canvas to 0 x 0 frees it; phones have little canvas memory)
function trimPool(list, used) {
  for (let i = used; i < list.length; i++) list[i].width = list[i].height = 0;
  list.length = Math.min(list.length, used);
}
// Leaving a tab: drop its cached layers and any re-lighting in progress, and let the next tab measure its own speed
export function releaseCanvases() {
  trimPool(pool, 0); trimPool(poolB, 0);
  ITEMS = []; relight = null; fade = null; groupsDirty = true; pending.length = 0;
  if (quality !== 1) { quality = 1; relayout(); }
  slowFor = fastFor = 0; frameEma = 16; buildBudget = 150;
}
// A new stroke on top: draw just that stroke into the top cached layer (one stroke x copies), instead of redrawing
// every stroke. This is what keeps drawing fluid: the pause after a stroke no longer grows with the drawing.
export function appendStroke(s) {
  if (groupsDirty) return;
  const M = MATS[s.color];
  // A re-light in progress would miss the new stroke (it starts again by itself); a full redraw in progress takes it along
  if (relight && relight.build && !relight.direct) { if (relight.list) relight.list.push(...unitsOf([s])); }
  else if (relight && !relight.build) relight = null;
  else if (relight && relight.direct) { if (relight.list) relight.list.push(...unitsOf([s])); return; }
  if (!isStill(s)) { ITEMS.push({ s }); return; }
  let top = ITEMS[ITEMS.length - 1];
  if (!top || !top.canvas) {
    const gi = ITEMS.filter(it => it.canvas).length;
    if (!pool[gi]) { const c = document.createElement('canvas'); c.width = fb.width; c.height = fb.height; pool[gi] = c; }
    const c = pool[gi], x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    top = { canvas: c, x }; ITEMS.push(top);
  }
  if (M.lit) lightNeeded = true;
  glowOf(gsctx, s);
  // The copies are drawn a few per frame (v27): all of them at once was the freeze after a stroke at heavy settings
  // (the browser paints after we return, so 16 copies of a costly stroke held one frame for 70-150 ms)
  pending.push({ s, top, next: 0, n: 1 });
  if (pending.length === 1) stepAppend(true);
}
// New strokes whose copies are still being drawn, oldest first (one at a time, so strokes keep their order)
const pending = [];
function stepAppend(first) {
  const p = pending[0], s = p.s;
  // How many copies this frame: one in the frame the stroke ends in (the copy under the finger; that frame is already
  // busy), then doubling while frames stay quick and halving when one runs long. Counting copies and watching the
  // real frame gap needs no guess at what a copy costs (the browser paints after we return).
  if (first) p.n = 1; else p.n = frameDt > 30 ? Math.max(1, p.n >> 1) : frameDt < 21 ? p.n * 2 : p.n;
  const saved = composeRot;
  setComposeRot(litRot);
  frameNorm(p.top.x, p.top.canvas);
  const n = syncDraw ? 1e9 : p.n, total = drawCopies(p.top.x, s, p.next, p.next + n);
  p.next += n;
  setComposeRot(saved);
  if (p.next >= total) { pending.shift(); if (pending.length) pending[0].n = 1; }
}
export function renderGroups(rot = 0) {
  relight = null; fade = null; pending.length = 0;
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
      drawCopies(cur.x, it.list[0]);
    } else { cur = null; ITEMS.push({ s: it.s }); }
  }
  gsctx.setTransform(1, 0, 0, 1, 0, 0); gsctx.clearRect(0, 0, glowS.width, glowS.height);
  frameNorm(gsctx, glowS); gsctx.lineCap = 'round'; gsctx.lineJoin = 'round';
  gsctx.shadowBlur = 4;
  for (const s of score.strokes) {
    if (!isStill(s) || HIDDEN.has(s)) continue;
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
export function drawPreview(X, S, B, now) {
  if (cur && cur.stamp) {
    // A stamp being placed: the real shape, a little see-through, in every copy
    const sh = stampShape(cur.stamp, stampPts(cur.stamp, cur.cx, cur.cy, cur.r, cur.rot)), r = cur.r + 0.03;
    X.fillStyle = colorOf(cur); X.globalAlpha = 0.8;
    forCopies(X, () => X.fill(sh.paths[1]), { _bb: [cur.cx - r, cur.cy - r, cur.cx + r, cur.cy + r] });
    X.globalAlpha = 1;
    return;
  }
  if (!cur || cur.pts.length < 2) return;
  const M = MATS[cur.color], sz = cur.size;
  // Where it is cheap, the mark shows in its finished style as you draw: the stroke so far is prepared afresh whenever
  // a point is added, then drawn once (Glitch) or pasted from a sprite (sprite styles). Its id is already the one the
  // finished stroke will have, so seeded details do not jump when you lift.
  if (M.live || world().render.sprites || world().render.preview) {
    if (cur._pvN !== cur.pts.length) {
      const t = { id: cur.sid, tool: 'glow', color: cur.color, tint: cur.tint, size: sz, fx: score.fx, pt: cur.pt, pts: cur.pts };
      prepare(t); cur._pv = t; cur._pvN = cur.pts.length;
    }
    const t = cur._pv;
    if (M.live) { drawLive(X, t, S, B, now, NOPULSE); return; }
    if (t._shape) { drawCopies(X, t, 0, Infinity, PRE); return; }
  }
  // Otherwise a plain line in the colour in hand
  const path = new Path2D(), bb = [1e9, 1e9, -1e9, -1e9];
  path.moveTo(cur.pts[0][0], cur.pts[0][1]);
  for (const q of cur.pts) { path.lineTo(q[0], q[1]); bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]); }
  const bm = 0.015 * sz + 0.03; bb[0] -= bm; bb[1] -= bm; bb[2] += bm; bb[3] += bm;
  X.lineCap = 'round'; X.lineJoin = 'round'; X.strokeStyle = colorOf(cur);
  X.lineWidth = (cur.tool === 'beads' ? BEAD_R * 4 : NEON_W * 2) * sz;
  forCopies(X, () => X.stroke(path), { _bb: bb });
}
const NOPULSE = { drum: 0, by: new Map() };
export function drawGuides(B, rot) {
  if (world().render.bg === 'paper') return;   // plain paper: no fold or tile lines (they read as seams)
  const m = score.mode, ext = Math.hypot(geo.W, geo.H) / 2 / geo.R + 0.05;
  ctx.strokeStyle = world().render.bg ? 'rgba(70,60,100,0.14)' : '#1c2132'; ctx.lineWidth = 0.003; ctx.beginPath();
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
  lastFrameT = now; frameDt = dt;
  if (document.hidden || erasing || cur || syncDraw) return;   // (tests hold the quality still)
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
  if (needsRebuild && now - lastRebuildT > 120) { needsRebuild = false; lastRebuildT = now; rebuild(undefined, true); }
  ensureCanvases();
  const S = visNow(), B = beatAt(S), rot = rotAt(B), W = geo.W, H = geo.H, cd = cellDims();
  // While the picture turns, re-light the still strokes now and then so the light stays put (only when that is cheap)
  stepHiddenCheck(now);
  if (groupsDirty && syncDraw) { renderGroups(rot); softWanted = false; }
  else if ((groupsDirty || (softWanted && !fade)) && !(relight && relight.build)) { softWanted = false; startBuild(rot); }
  if (pending.length && !groupsDirty) stepAppend();
  else if (relight) stepRelight(now);
  else if (!fade && lightNeeded && !world().render.fixedLight && rot !== litRot && Math.abs(mod(rot - litRot + Math.PI, TAU) - Math.PI) > 0.1) relight = { rot: rot + 0.03, i: 0, gi: 0, items: [], cur: null };
  if (fade && now - fade.t0 > (fade.both ? 120 : 160)) fade = null;
  setComposeRot(rot);
  fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.clearRect(0, 0, fb.width, fb.height);
  gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.clearRect(0, 0, glowC.width, glowC.height); gctx.drawImage(glowS, 0, 0);
  const fa = fade ? clamp((now - fade.t0) / (fade.both ? 120 : 160), 0, 1) : 1;
  let pulses = null;
  liveFrame();
  const still = reduceMotion.matches;   // reduced motion: live strokes hold still
  for (let j = 0; j < ITEMS.length; j++) {
    const it = ITEMS[j];
    if (it.canvas) {
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      // Re-light: new over old. Redraw: the new picture comes in first, then the old one leaves (parts in both never dip)
      if (fade && fade.old[j] && fade.old[j].canvas) { fctx.globalAlpha = fade.both ? Math.min(1, 2 - 2 * fa) : 1; fctx.drawImage(fade.old[j].canvas, 0, 0); fctx.globalAlpha = fade.both ? Math.min(1, 2 * fa) : fa; }
      fctx.drawImage(it.canvas, 0, 0); fctx.globalAlpha = 1;
      continue;
    }
    frameNorm(fctx, fb);
    if (MATS[it.s.color].live) { pulses = pulses || pulseFrame(S); drawLive(fctx, it.s, still ? 0 : S, still ? 0 : B, still ? 0 : now, pulses); continue; }
    const path = drawAnim(fctx, it.s, S, B);
    if (!path) continue;
    frameNorm(gctx, glowC); gctx.lineCap = 'round';
    const M = MATS[it.s.color];
    if (!M.glowA) continue;
    gctx.globalAlpha = M.glowA; gctx.strokeStyle = M.glow; gctx.lineWidth = bloomW(it.s);
    forCopies(gctx, () => gctx.stroke(path), it.s);
    gctx.globalAlpha = 1;
  }
  if (world().render.twinkle && !reduceMotion.matches) { frameNorm(fctx, fb); drawTwinkles(fctx, score.strokes, HIDDEN, S, score.mode === 'free' ? 7 : 0); }
  frameNorm(fctx, fb);
  drawPreview(fctx, S, B, now);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  setNorm(ctx);
  ctx.save();
  ctx.beginPath();
  if (geo.wide) ctx.rect(-W / 2 / geo.R, -H / 2 / geo.R, W / geo.R, H / geo.R); else ctx.arc(0, 0, 1, 0, TAU);
  ctx.fillStyle = discGrad; ctx.fill(); ctx.clip();
  if (world().render.space) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); drawSpaceBg(ctx, W, H); ctx.restore(); }
  if (world().render.bg === 'paper') { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); drawPaperBg(ctx, W, H); ctx.restore(); }
  if (world().render.bg === 'micro') { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); drawMicroBg(ctx, W, H); ctx.restore(); }
  drawGuides(B, rot);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  blitPicture(ctx, W, H, B, rot, cd, true);
  if (world().render.film) drawFilm(ctx, W, H, now, reduceMotion.matches);
  ctx.restore();
  setNorm(ctx);
  if (!geo.wide) { ctx.strokeStyle = '#262b3e'; ctx.lineWidth = 0.004; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.stroke(); }
  if (erasing) {
    ctx.save(); ctx.beginPath(); ctx.arc(erasing.screen.x, erasing.screen.y, effEraseR(), 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
    ctx.shadowColor = 'rgba(236,232,220,0.8)'; ctx.shadowBlur = 10; ctx.strokeStyle = 'rgba(236,232,220,0.85)'; ctx.lineWidth = 0.005; ctx.stroke(); ctx.restore();
  }
  if (preview && page === 'clips') { const nc = $('nowCv'), nx = nc.getContext('2d'); nx.clearRect(0, 0, 128, 128); const s = Math.min(W, H); nx.drawImage(cv, (W - s) / 2, (H - s) / 2, s, s, 0, 0, 128, 128); }
}
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
// Put the composed picture (and its glow) on a screen-sized context: turned for free and kaleidoscope, tiled and
// scrolled for tiles. c's transform is kept as the base (identity for the screen, a scale for smaller targets).
function blitPicture(c, W, H, B, rot, cd, glow) {
  if (cd) {
    const sc = scrollAt(B);
    const fillPat = (img, alpha, op) => {
      const pat = c.createPattern(img, 'repeat');
      pat.setTransform(new DOMMatrix([geo.R * cd[0] / img.width, 0, 0, geo.R * cd[1] / img.height, W / 2, H / 2 - sc * geo.R]));
      c.globalAlpha = alpha; c.globalCompositeOperation = op; c.fillStyle = pat; c.fillRect(0, 0, W, H);
    };
    if (glow) fillPat(glowC, 0.32, 'lighter');
    fillPat(fb, 1, 'source-over');
    c.globalAlpha = 1;
  } else {
    c.save();
    c.translate(W / 2, H / 2); c.rotate(rot);
    const F = fb.width;
    if (glow) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.32; c.drawImage(glowC, -F / 2, -F / 2, F, F); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(fb, -F / 2, -F / 2);
    c.restore();
  }
}
