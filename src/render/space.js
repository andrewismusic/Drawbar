// Space: nebulae, stars and galaxies made from soft pre-drawn sprites. Stars add light; gas is laid over like paint. A stroke is a seeded list of stamps, built once (spaceShape) and drawn
// with one image copy per stamp. Stars twinkle through a small per-frame overlay on a few stars per stroke.
import { TAU, mulberry32, hash32 } from '../core/math.js';
import { hexRgb } from '../core/color.js';
import { forCopies } from '../canvas/index.js';

const SZ = 128, sprites = new Map();
function make(key, paint) {
  let c = sprites.get(key);
  if (!c) { c = document.createElement('canvas'); c.width = c.height = SZ; paint(c.getContext('2d')); sprites.set(key, c); }
  return c;
}
const rg = (g, x, y, r, stops) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, SZ, SZ); };
const rgba = (hex, a) => { const [r, g, b] = hexRgb(hex); return `rgba(${r},${g},${b},${a})`; };
// A lumpy cloud of gas: several overlapping soft lobes, so stamps never look like plain discs (3 variants per colour)
const puff = (color, v) => make('puff' + color + v, g => {
  const r = mulberry32(hash32(v, 51));
  for (let i = 0; i < 6; i++) { const a = r() * TAU, d = r() * SZ * 0.2, rad = SZ * (0.2 + 0.18 * r()); rg(g, SZ / 2 + Math.cos(a) * d, SZ / 2 + Math.sin(a) * d, rad, [[0, rgba(color, 0.34)], [0.5, rgba(color, 0.14)], [1, rgba(color, 0)]]); }
});
// Dark dust: soaks up the light behind it
const dust = v => make('dust' + v, g => {
  const r = mulberry32(hash32(v, 52));
  for (let i = 0; i < 5; i++) { const a = r() * TAU, d = r() * SZ * 0.2; rg(g, SZ / 2 + Math.cos(a) * d, SZ / 2 + Math.sin(a) * d, SZ * (0.2 + 0.16 * r()), [[0, 'rgba(6,5,12,0.55)'], [0.6, 'rgba(6,5,12,0.2)'], [1, 'rgba(6,5,12,0)']]); }
});
// A small planet: a shaded disc, lit from the upper left
const planet = color => make('planet' + color, g => {
  g.beginPath(); g.arc(SZ / 2, SZ / 2, SZ * 0.42, 0, TAU); g.clip();
  rg(g, SZ * 0.36, SZ * 0.34, SZ * 0.6, [[0, '#ffffff'], [0.18, color], [0.75, rgba(color, 0.35)], [1, 'rgba(5,5,12,1)']]);
  g.globalAlpha = 0.25; g.fillStyle = '#000'; for (let i = 0; i < 3; i++) g.fillRect(0, SZ * (0.38 + i * 0.12), SZ, SZ * 0.035);
});
// A point of light
const dot = color => make('dot' + color, g => rg(g, SZ / 2, SZ / 2, SZ / 2, [[0, '#ffffff'], [0.12, rgba(color, 0.95)], [0.4, rgba(color, 0.25)], [1, rgba(color, 0)]]));
// A bright star with diffraction spikes (4 like Hubble, or 6 with two short ones like Webb)
const star = (color, spikes) => make('star' + color + spikes, g => {
  g.globalCompositeOperation = 'lighter';
  rg(g, SZ / 2, SZ / 2, SZ * 0.3, [[0, '#ffffff'], [0.1, '#ffffff'], [0.25, rgba(color, 0.7)], [1, rgba(color, 0)]]);
  for (let k = 0; k < spikes; k++) {
    const a = Math.PI * k / (spikes / 2) + (spikes === 4 ? 0 : Math.PI / 6), len = SZ * (spikes === 6 && k % 3 === 0 ? 0.3 : 0.5);
    const x1 = SZ / 2 + Math.cos(a) * len, y1 = SZ / 2 + Math.sin(a) * len, gr = g.createLinearGradient(SZ / 2, SZ / 2, x1, y1);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.3, rgba(color, 0.5)); gr.addColorStop(1, rgba(color, 0));
    g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(SZ / 2, SZ / 2); g.lineTo(x1, y1); g.stroke();
  }
});
// A spiral galaxy seen at a tilt: warm core, two dusty blue arms of small stars
const galaxy = (color, v) => make('gal' + color + v, g => {
  const r = mulberry32(hash32(v, 53)); g.globalCompositeOperation = 'lighter';
  g.translate(SZ / 2, SZ / 2); g.scale(1, 0.55 + 0.3 * r()); g.translate(-SZ / 2, -SZ / 2);
  rg(g, SZ / 2, SZ / 2, SZ * 0.46, [[0, rgba(color, 0.35)], [0.5, rgba(color, 0.1)], [1, rgba(color, 0)]]);
  for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 90; i++) {
    const t = i / 90, a = arm * Math.PI + t * 4.4, rad = SZ * (0.05 + 0.4 * t), j = (r() - 0.5) * SZ * 0.07;
    const x = SZ / 2 + Math.cos(a) * rad + j, y = SZ / 2 + Math.sin(a) * rad + (r() - 0.5) * SZ * 0.07, s = 1 + 3.5 * r() * (1 - t * 0.5);
    const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, rgba(color, 0.55)); gr.addColorStop(1, rgba(color, 0)); g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2);
  }
  rg(g, SZ / 2, SZ / 2, SZ * 0.16, [[0, '#fffaf0'], [0.3, 'rgba(255,224,170,0.7)'], [1, 'rgba(255,200,120,0)']]);
});

// Build a stroke's stamps. M.space: { kind: 'nebula' | 'stars' | 'galaxy' | 'dust', a, b: colours }.
// line: { xs, ys, w, L, n, w0 } or beads: [{ x, y, r }]. Stamps are [sprite, x, y, r, turn, alpha, over?].
// Gas is laid "over" (ordinary see-through paint), so stacked clouds mix their colours but never get brighter than
// the colours themselves; only stars add light. To keep the stroke's line from showing, the cloud wanders off the
// line, thins and thickens along it, and its stars, wisps and the odd planet scatter far out, fainter with distance.
const PLANETS = ['#d9a066', '#8fb7e8', '#c9785a', '#b7a6d9', '#9ad0b0'];
export function spaceShape(M, id, line, beads) {
  const r = mulberry32(hash32(id, 808)), st = [], tw = [], K = M.space, path = new Path2D();
  const around = (x, y, d) => { const a = r() * TAU, k = d * Math.sqrt(r()); return [x + Math.cos(a) * k, y + Math.sin(a) * k]; };
  // Far scatter: most land near, a few very far (reach = how many R out the farthest go); returns [x, y, 0..1 distance]
  const far = (x, y, R, reach) => { const a = r() * TAU, u = Math.pow(r(), 1.7), d = R * (0.2 + reach * u); return [x + Math.cos(a) * d, y + Math.sin(a) * d, u]; };
  const tiny = (x, y, R, col, reach = 3.4) => { const [px, py, u] = far(x, y, R, reach), s = R * (0.02 + 0.09 * r() * r()) * (1 - 0.4 * u); st.push([dot(col), px, py, s, 0, (0.2 + 0.8 * r() * r()) * (1 - 0.55 * u) + 0.1]); };
  const bright = (x, y, s, col) => { st.push([star(col, r() < 0.5 ? 4 : 6), x, y, s, r() * TAU, 0.6 + 0.35 * r()]); tw.push([x, y, s, r() * TAU, 0.6 + 2.2 * r()]); };
  const extras = (x, y, R) => {
    if (r() < 0.035) { const [px, py] = far(x, y, R, 3); st.push([planet(PLANETS[Math.floor(r() * PLANETS.length)]), px, py, R * (0.05 + 0.1 * r()), r() * TAU, 0.95, true]); }
    if (r() < 0.03) { const [px, py] = far(x, y, R, 3.5); st.push([galaxy('#a9c4ff', Math.floor(r() * 3)), px, py, R * (0.2 + 0.25 * r()), r() * TAU, 0.5 + 0.4 * r()]); }
  };
  const knot = (x, y, R) => {
    if (K.kind === 'nebula') {
      const [ox, oy] = around(x, y, R * 0.7); st.push([puff(K.b, st.length % 3), ox, oy, R * (0.9 + 0.9 * r()), r() * TAU, 0.35 + 0.3 * r(), true]);
      const [mx, my] = around(x, y, R * 0.4); st.push([puff(K.a, (st.length + 1) % 3), mx, my, R * (0.45 + 0.6 * r()), r() * TAU, 0.4 + 0.4 * r(), true]);
      if (r() < 0.3) { const [wx, wy, u] = far(x, y, R, 2.6); st.push([puff(r() < 0.5 ? K.a : K.b, st.length % 3), wx, wy, R * (0.3 + 0.5 * r()), r() * TAU, 0.3 * (1 - 0.6 * u), true]); }   // outlying wisp
      for (let k = 0, n = Math.floor(r() * r() * 7); k < n; k++) tiny(x, y, R, r() < 0.75 ? '#ffffff' : K.a);
      if (r() < 0.1) { const [sx, sy] = far(x, y, R, 2.5); bright(sx, sy, R * (0.18 + 0.4 * r() * r()), '#dfe9ff'); }
      extras(x, y, R);
    } else if (K.kind === 'dust') {
      st.push([dust(st.length % 3), ...around(x, y, R * 0.4), R * (0.7 + 0.6 * r()), r() * TAU, 0.9, true]);
    } else if (K.kind === 'stars') {
      for (let k = 0, n = 1 + Math.floor(r() * r() * 11); k < n; k++) tiny(x, y, R, r() < 0.7 ? K.a : K.b, 4);
      if (r() < 0.25) { const [sx, sy] = far(x, y, R, 3); bright(sx, sy, R * (0.15 + 0.7 * r() * r() * r()), r() < 0.6 ? K.a : K.b); }
      extras(x, y, R);
    }
  };
  if (beads) {
    for (const [bi, b] of beads.entries()) {
      const R = b.r * 4;
      path.moveTo(b.x + b.r, b.y); path.arc(b.x, b.y, b.r, 0, TAU);
      if (bi % 2 && beads.length > 2) continue;   // every other bead: big stamps overlap otherwise
      if (K.kind === 'stars') { bright(b.x, b.y, R * (0.4 + 0.8 * r() * r()), r() < 0.6 ? K.a : K.b); for (let k = 0; k < 3; k++) tiny(b.x, b.y, R, K.a, 2.5); }
      else if (K.kind === 'galaxy') st.push([galaxy(K.a, st.length % 3), b.x, b.y, R * (0.8 + 0.4 * r()), r() * TAU, 1]);
      else knot(b.x, b.y, R * 0.8);
    }
  } else {
    const { xs, ys, w, L, n, w0 } = line, R0 = w0 * 4.5;
    // The cloud's centre line wanders either side of the drawn line, and its density swells and thins
    const p1 = r() * TAU, p2 = r() * TAU, p3 = r() * TAU, f1 = 1 / (R0 * (2.5 + 2 * r())), f2 = 1 / (R0 * (0.9 + 0.8 * r())), f3 = 1 / (R0 * (3 + 3 * r()));
    let gap = 0, next = 0;
    for (let i = 0; i < n; i++) {
      path.moveTo(xs[i] + w[i], ys[i]); path.arc(xs[i], ys[i], Math.max(w[i], 1e-4), 0, TAU);
      // One knot of stamps every third of a cloud's radius, so the cloud stays even whatever the drawing speed
      if (L[i] < next && i < n - 1) continue;
      const R = R0 * (0.5 + 0.5 * w[i] / (w0 * 1.35) + 0.2) * (0.7 + 0.6 * r());
      next = L[i] + R * 0.34;
      const a = Math.max(i - 1, 0), b = Math.min(i + 1, n - 1), dx = xs[b] - xs[a], dy = ys[b] - ys[a], d = Math.hypot(dx, dy) || 1;
      const off = R0 * (0.75 * Math.sin(L[i] * f1 + p1) + 0.4 * Math.sin(L[i] * f2 + p2)), x = xs[i] - dy / d * off, y = ys[i] + dx / d * off;
      if (K.kind !== 'galaxy' && Math.sin(L[i] * f3 + p3) < -0.55 && r() < 0.75) { if (r() < 0.5) tiny(x, y, R, '#ffffff'); continue; }   // a thin patch
      if (K.kind === 'galaxy') {
        if (gap <= 0) { st.push([galaxy(K.a, st.length % 3), ...around(x, y, R * 0.5), R * (0.6 + 0.6 * r()), r() * TAU, 1]); gap = 4 + Math.floor(r() * 4); }
        gap--; if (r() < 0.5) tiny(x, y, R * 1.5, '#ffffff');
      } else knot(x, y, R);
    }
  }
  return { paths: { 1: path }, w0: line ? line.w0 : beads[0].r, ink: null, stamps: st, tw: tw.slice(0, 8), noHide: true };
}
export function drawStamps(c, stamps) {
  for (const [img, x, y, r, turn, a, over] of stamps) {
    c.globalCompositeOperation = over ? 'source-over' : 'lighter'; c.globalAlpha = a;
    if (turn) { c.save(); c.translate(x, y); c.rotate(turn); c.drawImage(img, -r, -r, 2 * r, 2 * r); c.restore(); }
    else c.drawImage(img, x - r, y - r, 2 * r, 2 * r);
  }
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
}
// Twinkle: a few stars per stroke swell and fade, each at its own pace. X is the frame buffer, in drawing space.
export function drawTwinkles(X, strokes, hidden, S) {
  const flare = star('#ffffff', 4);
  X.globalCompositeOperation = 'lighter';
  for (const s of strokes) {
    const tw = s._shape && s._shape.tw;
    if (!tw || !tw.length || hidden.has(s)) continue;
    forCopies(X, () => {
      for (const [x, y, r, ph, rate] of tw) { const a = 0.5 + 0.5 * Math.sin(S * rate + ph), k = r * (0.7 + 0.7 * a); X.globalAlpha = 0.15 + 0.75 * a * a; X.drawImage(flare, x - k, y - k, 2 * k, 2 * k); }
    }, s);
  }
  X.globalCompositeOperation = 'source-over'; X.globalAlpha = 1;
}
// Deep-field backdrop: black with a faint colour haze and hundreds of faint stars, drawn once and reused
let bg = null;
export function drawSpaceBg(ctx, W, H) {
  if (!bg) {
    bg = document.createElement('canvas'); bg.width = bg.height = 768;
    const g = bg.getContext('2d'), r = mulberry32(2024);
    g.fillStyle = '#03040a'; g.fillRect(0, 0, 768, 768);
    g.globalCompositeOperation = 'lighter';
    for (const [x, y, rad, col] of [[200, 240, 420, 'rgba(40,24,90,0.35)'], [560, 520, 380, 'rgba(12,50,84,0.3)'], [420, 120, 260, 'rgba(84,24,50,0.2)']]) { const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 768, 768); }
    for (let i = 0; i < 700; i++) { const x = r() * 768, y = r() * 768, s = 0.3 + 1.1 * r() * r(), a = 0.25 + 0.75 * r() * r(); g.fillStyle = `rgba(${200 + 55 * r() | 0},${205 + 50 * r() | 0},255,${a})`; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
  }
  const k = Math.max(W, H);
  ctx.drawImage(bg, (W - k) / 2, (H - k) / 2, k, k);
}
