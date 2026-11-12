// Glitch effects: three ways of corrupting the finished picture, chosen with the Effect buttons (score.fx).
//   smear:  rows of the picture drag sideways and leave decaying trails with red / cyan fringes
//   blocks: datamosh. Blocks slip, repeat, stretch into streaks and flip colour
//   hud:    marks become nodes joined by thin lines, under rings, ticks, a sweep and read-outs
// All three cost about the same every frame however much is drawn (a fixed number of image copies or lines), and all
// react a little to the music through pulseEnergy (notes widen smears, drum hits add blocks). Visual only.
import { TAU, hash32 } from '../core/math.js';
import { animEventIdx } from '../core/stroke.js';
import { forCopies } from '../canvas/index.js';
import { MATS } from '../styles/index.js';

const mk = document.createElement('canvas'), mkx = mk.getContext('2d');       // this frame's marks only, half size
const acc = document.createElement('canvas'), ax = acc.getContext('2d');      // the smear: marks plus their trails
const tr = document.createElement('canvas'), trx = tr.getContext('2d');       // trails tinted red / cyan for the fringe
const frac = r => (r % 10000) / 10000;
function fit(W, H) {
  const w = Math.max(8, W >> 1), h = Math.max(8, H >> 1);
  if (mk.width === w && mk.height === h) return;
  for (const c of [mk, acc, tr]) { c.width = w; c.height = h; }
  ax.fillStyle = '#000'; ax.fillRect(0, 0, w, h);
}
// Leaving the Glitch tab: give the buffers' memory back
export function releaseFx() { for (const c of [mk, acc, tr]) c.width = c.height = 0; }
// Where compose.js draws this frame's marks (no background) for the smear to feed on
export function marksTarget(W, H) {
  fit(W, H);
  mkx.setTransform(1, 0, 0, 1, 0, 0); mkx.clearRect(0, 0, mk.width, mk.height);
  mkx.setTransform(mk.width / W, 0, 0, mk.height / H, 0, 0);
  return mkx;
}
// ctx is already clipped to the drawing. e: { tone, drum } energy.
export function smearPass(ctx, W, H, now, e) {
  const w = acc.width, h = acc.height;
  // 1. Fade the old trails, then drag bands of rows sideways (the band layout changes every second or so)
  ax.globalCompositeOperation = 'source-over'; ax.globalAlpha = 1;
  ax.fillStyle = 'rgba(0,0,0,0.09)'; ax.fillRect(0, 0, w, h);
  const slot = Math.floor(now / 1100), push = 1 + 1.6 * e.tone + 1.2 * e.drum;
  for (let y = 0, i = 0; y < h; i++) {
    const r = hash32(slot, i, 41), bh = 3 + Math.floor(frac(r) * h * 0.07), kind = (r >>> 14) % 10;
    if (kind >= 4) { const dx = ((r >>> 20) & 1 ? 1 : -1) * (2 + frac(r >>> 7) * 9) * push; ax.drawImage(acc, 0, y, w, bh, dx, y, w, bh); }
    y += bh;
  }
  // 2. Trails only (this frame's marks cut out), tinted red and cyan and laid back a little apart: the colour fringe
  const split = (1.5 + 5 * e.tone + 3 * e.drum) * W / 700;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
  for (const [tint, dx] of [['#ff2040', -split], ['#00e0ff', split]]) {
    trx.setTransform(1, 0, 0, 1, 0, 0); trx.globalCompositeOperation = 'source-over'; trx.globalAlpha = 1;
    trx.drawImage(acc, 0, 0);
    trx.globalCompositeOperation = 'destination-out'; trx.drawImage(mk, 0, 0);
    trx.globalCompositeOperation = 'destination-over'; trx.fillStyle = '#000'; trx.fillRect(0, 0, w, h);
    trx.globalCompositeOperation = 'multiply'; trx.fillStyle = tint; trx.fillRect(0, 0, w, h);
    ctx.drawImage(tr, dx, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
  // 3. Scan lines over everything, then feed this frame's marks into the smear for next time
  ctx.fillStyle = scanPattern(ctx); ctx.globalAlpha = 0.5; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  ax.drawImage(mk, 0, 0);
}
let scanTile = null;
function scanPattern(ctx) {
  if (!scanTile) { scanTile = document.createElement('canvas'); scanTile.width = 4; scanTile.height = 4; const g = scanTile.getContext('2d'); g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 4, 1.5); }
  return ctx.createPattern(scanTile, 'repeat');
}
// Datamosh: pieces of the marks (never the empty background) slip sideways, stretch into streaks, repeat and ghost in
// flipped colours. Each piece lives for a few ticks, so the picture holds its broken shape, then re-breaks. Drum hits
// add short-lived pieces and tear whole rows. Pieces are taken from the half-size marks buffer, so they come out chunky.
export function blocksPass(ctx, cv, W, H, now, e) {
  const w = mk.width, h = mk.height, g = Math.max(6, Math.round(w / 20)), cols = Math.ceil(w / g), rows = Math.ceil(h / g), slot = Math.floor(now / 170);
  const base = 34, n = base + Math.round(26 * e.drum + 12 * e.tone), k = W / w;
  ctx.setTransform(k, 0, 0, H / h, 0, 0); ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < n; i++) {
    const life = i < base ? 3 + (i % 5) * 2 : 1, r = hash32(Math.floor(slot / life), i, 67), r2 = hash32(r, 5);
    const bw = (1 + r % 5) * g, bh = Math.max(3, (1 + (r >>> 4) % 2) * (r2 % 3 === 0 ? g / 2 : g)), x = ((r >>> 8) % cols) * g, y = ((r >>> 14) % rows) * g, kind = (r >>> 20) % 8;
    const to = x + (((r2 >>> 3) % 9) - 4) * g;
    if (kind < 3) ctx.drawImage(mk, x, y, bw, bh, to, y, bw, bh);                                  // slip
    else if (kind < 5) ctx.drawImage(mk, x + bw / 2, y, 1, bh, x - bw, y, bw * 3, bh);             // streak: one column pulled wide
    else if (kind === 5) { const pw = Math.max(2, bw / 4); for (let j = 1; j < 5; j++) ctx.drawImage(mk, x, y, pw, bh, x + j * pw, y, pw, bh); }   // repeat
    else {                                                                                          // ghost in flipped colours
      ctx.globalCompositeOperation = kind === 6 ? 'difference' : 'lighter'; ctx.globalAlpha = 0.9;
      ctx.drawImage(mk, x, y, bw, bh, to, y + (r2 % 3 - 1) * g, bw, bh);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
  }
  // Whole bands of rows break too, so every mark gets hit somewhere: ghosts slipped sideways, colour-flipped ghosts,
  // mosaic (the band shrunk and blown back up into big pixels) and streaks pulled from one column
  for (let y = 0, i = 0; y < h; i++) {
    const life = 4 + (i % 4) * 3, r = hash32(Math.floor(slot / life), i, 83), bh = Math.max(3, Math.round(g * (0.4 + 1.4 * frac(r)))), kind = (r >>> 14) % 10;
    const dx = (frac(r >>> 6) - 0.5) * w * 0.3 * (1 + 0.6 * e.tone);
    if (kind === 4 || kind === 5) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85; ctx.drawImage(mk, 0, y, w, bh, dx, y, w, bh); }
    else if (kind === 6) { ctx.globalCompositeOperation = 'difference'; ctx.drawImage(mk, 0, y, w, bh, dx, y, w, bh); }
    else if (kind === 7 || kind === 8) {
      const cw = Math.max(4, Math.round(w / (g * 0.8))), ch = Math.max(1, Math.round(bh / (g * 0.8)));
      trx.setTransform(1, 0, 0, 1, 0, 0); trx.globalCompositeOperation = 'copy'; trx.imageSmoothingEnabled = true;
      trx.drawImage(mk, 0, y, w, bh, 0, 0, cw, ch);
      ctx.drawImage(tr, 0, 0, cw, ch, dx * 0.3, y, w, bh);
    } else if (kind === 9) { const x0 = Math.floor(frac(r >>> 3) * w * 0.8); ctx.drawImage(mk, x0, y, 1, bh, x0, y, w - x0, bh); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    y += bh;
  }
  // Row tears on drum hits: thin full-width bands of the screen knocked sideways
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const tears = Math.round(3 * e.drum);
  for (let i = 0; i < tears; i++) { const r = hash32(slot, i, 9), y = Math.floor(frac(r) * H), bh = Math.max(2, Math.floor(frac(r >>> 9) * H * 0.05)); ctx.drawImage(cv, 0, y, W, bh, (frac(r >>> 5) - 0.5) * W * 0.12, y, W, bh); }
  ctx.imageSmoothingEnabled = true;
}
// HUD, part 1 (in the drawing's own space, before copies are composed): every mark's key points become nodes joined
// by a thin line, with a ring at its start; neighbouring marks are linked. X is the frame buffer's context.
let linkKey = '', links = [];
export function hudWires(X, strokes, hidden, e) {
  const S = strokes.filter(s => !hidden.has(s));
  for (const s of S) if (!s._hud) s._hud = animEventIdx(s).map(i => [s.pts[i][0], s.pts[i][1]]);
  const key = S.length + ':' + (S.length ? S[S.length - 1].id : 0);
  if (key !== linkKey) {
    linkKey = key; links = [];
    for (let i = 1; i < S.length; i++) for (const back of [1, 3]) {
      const a = S[i]._hud[back === 1 ? 0 : S[i]._hud.length - 1], T = S[i - back];
      if (!T) continue;
      let best = T._hud[0], bd = 1e9;
      for (const q of T._hud) { const d = Math.hypot(q[0] - a[0], q[1] - a[1]); if (d < bd) { bd = d; best = q; } }
      links.push([a, best]);
    }
  }
  X.lineJoin = 'round'; X.lineCap = 'round';
  X.strokeStyle = 'rgba(220,240,255,0.32)'; X.lineWidth = 0.0025; X.beginPath();
  for (const [a, b] of links) { X.moveTo(a[0], a[1]); X.lineTo(b[0], b[1]); }
  forCopies(X, () => X.stroke(), null);
  const nr = 0.007 * (1 + 0.9 * Math.min(e.tone + e.drum, 1.2));
  for (const s of S) {
    const c = MATS[s.color].accent, N = s._hud;
    forCopies(X, () => {
      X.strokeStyle = c; X.lineWidth = 0.004; X.globalAlpha = 0.95;
      X.beginPath(); X.moveTo(N[0][0], N[0][1]); for (let i = 1; i < N.length; i++) X.lineTo(N[i][0], N[i][1]); X.stroke();
      X.lineWidth = 0.003; X.globalAlpha = 0.7; X.beginPath(); X.arc(N[0][0], N[0][1], 0.03, 0, TAU); X.stroke();
      X.globalAlpha = 1; X.fillStyle = '#ffffff';
      for (const q of N) X.fillRect(q[0] - nr, q[1] - nr, nr * 2, nr * 2);
    }, s);
  }
  X.globalAlpha = 1;
}
// HUD, part 2 (on screen): rings with turning arcs, rim ticks, a sweep, a scan line and read-outs
export function hudOverlay(ctx, W, H, R, now, e) {
  const cx = W / 2, cy = H / 2, t = now / 1000, glow = 0.3 + 0.35 * Math.min(e.tone + e.drum, 1), u = R / 300;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.strokeStyle = '#35e6ff'; ctx.fillStyle = '#35e6ff'; ctx.lineWidth = Math.max(1, u);
  ctx.globalAlpha = 0.16;
  for (const k of [0.34, 0.62, 0.9]) { ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = glow; ctx.lineWidth = Math.max(1.5, 2.2 * u);
  [[0.34, 0.5, 1.1], [0.62, -0.31, 0.7], [0.62, -0.31 + 2.4, 0.4], [0.9, 0.17, 0.5], [0.9, 0.17 + 3.3, 0.9]].forEach(([k, sp, len]) => { ctx.beginPath(); ctx.arc(cx, cy, R * k, t * sp, t * sp + len); ctx.stroke(); });
  ctx.globalAlpha = 0.3; ctx.lineWidth = Math.max(1, u); ctx.beginPath();
  for (let i = 0; i < 72; i++) { const a = TAU * i / 72, r0 = R * (i % 6 ? 0.965 : 0.94); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * R * 0.985, cy + Math.sin(a) * R * 0.985); }
  ctx.stroke();
  // Sweep: a faint wedge and its leading line
  const sa = t * 0.9;
  ctx.globalAlpha = 0.07; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.9, sa - 0.5, sa); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sa) * R * 0.9, cy + Math.sin(sa) * R * 0.9); ctx.stroke();
  // Scan line drifting down
  const sy = cy - R + ((t * 0.11) % 1) * 2 * R;
  ctx.globalAlpha = 0.14; ctx.fillRect(cx - R, sy, 2 * R, Math.max(1, 1.5 * u));
  // Read-outs: numbers that tick over a few times a second
  ctx.globalAlpha = 0.55; ctx.font = `${Math.round(9 * u + 3)}px ui-monospace, Menlo, Consolas, monospace`; ctx.textBaseline = 'middle';
  const tick = Math.floor(now / 380);
  [[-0.66, -0.6], [0.42, -0.66], [-0.7, 0.58], [0.4, 0.64]].forEach(([px, py], i) => {
    const r = hash32(tick + i * 3, i, 23);
    ctx.fillText(String(r % 100000).padStart(5, '0') + ' ' + (r >>> 20).toString(16).toUpperCase(), cx + px * R, cy + py * R);
    ctx.fillRect(cx + px * R, cy + py * R + 8 * u, 26 * u * (0.3 + 0.7 * frac(r >>> 3)), Math.max(1, 1.5 * u));
  });
  ctx.globalAlpha = 1;
}
