// Performance check for the style tabs (worlds): each world filled with strokes at its heaviest allowed settings,
// plus a few pairings the worlds deliberately avoid, for comparison.
// Measures: redraw = time to redraw every still stroke in every copy (happens after each new stroke or knob turn),
//           frame = median and 90th-percentile time between frames while everything moves (16.7 ms = smooth 60 fps).
// Headless Chromium draws on the CPU, so absolute numbers run high; compare rows with each other.
// Run: serve the app on port 3000, then: node tests/perf.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:3000/';

const CASES = [
  // world, label, settings (the heaviest each world allows), avoided?, tools (default: all the world's tools)
  ['classic', 'v18 default: kaleido 6, all tools', { mode: 'kaleido', copies: 4, mirror: true }],
  ['materials', 'kaleido 6, mirror', { mode: 'kaleido', copies: 4, mirror: true }],
  ['materials', 'free, turning, mirror', { mode: 'free', frot: true, fmirror: true }],
  ['comic', 'kaleido 8, mirror', { mode: 'kaleido', copies: 6, mirror: true }],
  ['comic', 'tiles 4, 6 turns, mirror', { mode: 'tiles', tiles: 4, turns: 4, mirror: true }],
  ['pixel', 'kaleido 16, mirror', { mode: 'kaleido', copies: 9, mirror: true }],
  ['pixel', 'tiles 6, 6 turns, mirror', { mode: 'tiles', tiles: 6, turns: 4, mirror: true }],
  ['geometric', 'kaleido 21, mirror', { mode: 'kaleido', copies: 10, mirror: true }],
  ['geometric', 'tiles 6, 6 turns, mirror', { mode: 'tiles', tiles: 6, turns: 4, mirror: true }],
  ['glitch', 'free, turning, mirror', { mode: 'free', frot: true, fmirror: true }],
  ['glitch', 'tiles 4, 4 turns, mirror', { mode: 'tiles', tiles: 4, turns: 3, mirror: true }],
  ['graffiti', 'free, mirror', { mode: 'free', fmirror: true }],
  ['graffiti', 'tiles 3, 2 turns, mirror', { mode: 'tiles', tiles: 3, turns: 1, mirror: true }],
  // Pairings the worlds avoid
  ['materials', 'AVOIDED: kaleido 21, mirror', { mode: 'kaleido', copies: 10, mirror: true }, true],
  ['materials', 'AVOIDED: ripples, kaleido 6', { mode: 'kaleido', copies: 4, mirror: true }, true, ['glow', 'beads', 'ripple']],
  ['comic', 'AVOIDED: loops, kaleido 16', { mode: 'kaleido', copies: 9, mirror: true }, true, ['glow', 'beads', 'loop', 'ripple']],
  ['pixel', 'AVOIDED: loops, kaleido 55', { mode: 'kaleido', copies: 14, mirror: true }, true],
  ['graffiti', 'AVOIDED: kaleido 16, mirror', { mode: 'kaleido', copies: 9, mirror: true }, true],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
await page.goto(url); await page.waitForTimeout(500);
console.log('world       case                              strokes  redraw ms   frame ms p50 / p90');
for (const [wid, label, set, avoided, toolsOverride] of CASES) {
  await page.click('#world-' + wid); await page.waitForTimeout(150);
  const r = await page.evaluate(async ({ set, toolsOverride }) => {
    const [st, stroke, settings, compose, worlds, styles] = await Promise.all(['core/state.js', 'core/stroke.js', 'core/settings.js', 'render/compose.js', 'worlds/index.js', 'styles/index.js'].map(p => import('/src/' + p)));
    const w = worlds.world(), tools = (toolsOverride || w.tools).filter(t => t !== 'erase');
    // 12 strokes spread over the drawing, cycling through this world's tools and materials
    const strokes = [];
    for (let c = 0; c < 12; c++) {
      const pts = [], cx = Math.cos(c * 1.3) * 0.45, cy = Math.sin(c * 1.7) * 0.45;
      for (let i = 0; i < 40; i++) { const u = i / 39; pts.push([cx + 0.35 * (u - 0.5), cy + 0.12 * Math.sin(u * 7 + c), u * (0.4 + 0.05 * c), 0.5]); }
      const s = { id: 1000 + c, tool: tools[c % tools.length], color: w.matIdx[c % w.matIdx.length], size: 3.1, pts, start: 0, startBeat: 0 };
      stroke.prepare(s); strokes.push(s);
    }
    st.score.strokes = strokes;
    settings.applySettings({ ...st.score, ...set });
    await new Promise(r => setTimeout(r, 300));
    const t = [];
    // Reading a pixel back forces the browser to finish drawing, so the time includes the drawing itself
    for (let i = 0; i < 3; i++) { const t0 = performance.now(); compose.renderGroups(0); for (const c of compose.pool) c.getContext('2d').getImageData(0, 0, 1, 1); t.push(performance.now() - t0); }
    const gaps = [];
    let last = performance.now();
    await new Promise(done => { const tick = now => { gaps.push(now - last); last = now; if (gaps.length < 60) requestAnimationFrame(tick); else done(); }; requestAnimationFrame(tick); });
    gaps.sort((a, b) => a - b);
    return { n: strokes.length, redraw: t.sort((a, b) => a - b)[1], p50: gaps[30], p90: gaps[54] };
  }, { set, toolsOverride });
  console.log(`${wid.padEnd(11)} ${label.padEnd(34)} ${String(r.n).padStart(4)} ${r.redraw.toFixed(0).padStart(10)} ${r.p50.toFixed(0).padStart(10)} / ${r.p90.toFixed(0)}`);
}
console.log(errors.length ? 'ERRORS ' + errors.join('; ') : 'no page errors');
await browser.close();
