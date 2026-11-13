// Equivalence check: injects the same seeded strokes into two builds and compares arrange() output and canvas pixels,
// across 3 maps x 6 pattern settings. Use it to prove a refactor changes nothing.
// Run: serve the reference build and this build on two ports, then: node tests/equiv.mjs <refUrl> <newUrl>
// A build with globals (the old single-file index.html, v18) is detected; otherwise the src/ modules are imported.
import { chromium } from 'playwright';
// --skip=14,3 leaves those material indices out (for materials whose look changed on purpose, e.g. 14 Flower vine in v20)
const SKIP = (process.argv.find(a => a.startsWith('--skip=')) || '--skip=').slice(7).split(',').filter(Boolean).map(Number);
// --tools=glow,beads,ripple leaves Loop out (loops keep their own length and start since v24, unlike v18)
const TOOLS = (process.argv.find(a => a.startsWith('--tools=')) || '--tools=glow,beads,loop,ripple').slice(8).split(',');
const browser = await chromium.launch();
// Build a deterministic set of strokes for every v18 material (15) and every tool
function makeStrokes(nMats) {
  const out = []; let id = 1;
  const tools = TOOLS;
  for (let c = 0; c < nMats; c++) {
    const tool = tools[c % tools.length], pts = [];
    const cx = Math.cos(c * 1.3) * 0.45, cy = Math.sin(c * 1.7) * 0.45;
    for (let i = 0; i < 40; i++) { const u = i / 39; pts.push([cx + 0.35 * (u - 0.5), cy + 0.12 * Math.sin(u * 7 + c), u * (0.4 + 0.05 * c), 0.5]); }
    out.push({ id: id++, tool, color: c, size: 1.5 + (c % 5) * 1.6, pts, start: 0, startBeat: 0 });
  }
  return out;
}
const settings = [
  { mode: 'kaleido', copies: 4, spiral: 0, mirror: true },
  { mode: 'kaleido', copies: 9, spiral: 0.6, mirror: false },
  { mode: 'free', fscale: 50, frot: false, fmirror: true },
  { mode: 'free', fscale: 70, frot: true, fmirror: false },
  { mode: 'tiles', tiles: 3, turns: 1, mirror: true },
  { mode: 'tiles', tiles: 4, turns: 4, mirror: false },
];
async function run(url) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { performance.now = () => 1000; });
  await page.goto(url); await page.waitForTimeout(500);
  const isNew = await page.evaluate(() => typeof window.arrange !== 'function');
  // The style tabs and the Sound panel's frame take some height; hide them so both builds get the same canvas size and the pixels can be compared
  if (isNew) { await page.addStyleTag({ content: '#worldTabs{display:none!important} .knobs.sound{padding:0!important;border:0!important} .knobs .slab{display:none!important}' }); await page.waitForTimeout(300); }
  const results = [];
  for (const map of [417, 73, 908]) {
    for (const st of settings) {
      const r = await page.evaluate(async ({ st, map, isNew, strokes }) => {
        let G;
        if (isNew) {
          const m = await Promise.all(['core/state.js', 'core/stroke.js', 'core/settings.js', 'sound/arranger.js', 'sound/maps.js'].map(p => import('/src/' + p)));
          G = { score: m[0].score, prepare: m[1].prepare, applySettings: m[2].applySettings, arrange: m[3].arrange, get MAP() { return m[4].MAP; } };
        } else G = { score, prepare, applySettings, arrange, get MAP() { return MAP; } };
        if (isNew) (await import('/src/render/compose.js')).setSyncDraw(true);   // draw everything at once, as v18 did
        if (isNew) (await import('/src/core/settings.js')).switchWorld('classic');   // the legacy world: every v18 material, re-lit as in v18
        G.score.strokes = strokes.map(s => { s = { ...s, pts: s.pts.map(p => p.slice()) }; G.prepare(s); return s; });
        G.applySettings({ ...G.score, fscale: 50, ...st, map, key: 2, scale: 2, tempo: 92, timing: 'clocked', inst: 'both' });
        const A = G.arrange();
        const ser = JSON.stringify(A, (k, v) => k === 's' ? (v && v.id) : typeof v === 'function' ? 'fn' : v);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        await new Promise(r => setTimeout(r, 150));
        const cv = document.getElementById('cv');
        const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) >>> 0;
        return { ser, w: cv.width, h: cv.height, px: h, data: Array.from(d.filter((_, i) => i % 97 === 0)), mapN: G.MAP.n, hidden: null };
      }, { st, map, isNew, strokes: makeStrokes(15).filter(s => !SKIP.includes(s.color)) });
      results.push({ key: map + ' ' + JSON.stringify(st), ...r });
    }
  }
  await page.close();
  return { results, errors };
}
const urls = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [refUrl, newUrl] = [urls[0] || 'http://localhost:3001/', urls[1] || 'http://localhost:3000/'];
const a = await run(refUrl), b = await run(newUrl);
let fail = 0;
for (let i = 0; i < a.results.length; i++) {
  const x = a.results[i], y = b.results[i];
  const arrSame = x.ser === y.ser;
  let diff = 0; for (let j = 0; j < x.data.length; j++) if (Math.abs(x.data[j] - y.data[j]) > 2) diff++;
  const ok = arrSame && x.w === y.w && x.h === y.h && diff === 0;
  if (!ok) fail++;
  console.log(ok ? 'SAME' : 'DIFF', x.key, 'arrange', arrSame ? 'same' : 'DIFFERENT', `(${x.ser.length} chars)`, 'canvas', `${x.w}x${x.h}` + (x.w === y.w && x.h === y.h ? '' : ` vs ${y.w}x${y.h}`), 'pixels differing', diff, '/', x.data.length, 'distinct values', new Set(x.data).size, 'map', x.mapN, y.mapN, x.px === y.px ? 'hash-equal' : 'hash-differs');
}
console.log('errors old', a.errors, 'new', b.errors);
console.log(fail ? `FAIL ${fail}` : 'ALL SAME');
await browser.close();
process.exit(fail ? 1 : 0);
