// Smoke test: in every style tab, draws in every pattern mode with every tool at three screen sizes.
// Fails on page errors, page scroll (either direction) or the controls overlapping the drawing.
// Run: npx serve . (port 3000) in one terminal, then: node tests/smoke.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:3000/';
const sizes = [['tablet-landscape', 1180, 820], ['tablet-portrait', 820, 1180], ['phone', 390, 844]];
let failed = false;
const browser = await chromium.launch();
for (const [name, width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url); await page.waitForTimeout(600);
  const tabs = await page.evaluate(async () => (await import('/src/worlds/index.js')).TABS.map(w => w.id));
  const results = [];
  for (const tab of tabs) {
    // pick the style from the style picker, as a person would
    await page.click('#styleBtn'); await page.click('#world-' + tab); await page.waitForTimeout(150);
    const box = await page.locator('#cv').boundingBox();
    const draw = async (pts) => {
      await page.mouse.move(box.x + box.width * pts[0][0], box.y + box.height * pts[0][1]); await page.mouse.down();
      for (const q of pts.slice(1)) await page.mouse.move(box.x + box.width * q[0], box.y + box.height * q[1], { steps: 6 });
      await page.mouse.up();
    };
    const modes = await page.locator('#modeSeg button:visible').evaluateAll(bs => bs.map(b => b.dataset.v));
    for (const mode of modes) {
      await page.click('#mode-' + mode);
      const swatches = await page.locator('#swatches .sw:visible:not(.pixtoggle)').all();
      const tools = (await page.locator('#tools .tool:visible').evaluateAll(bs => bs.map(b => b.id.slice(5)))).filter(t => t !== 'erase');
      for (const [i, tool] of tools.entries()) {
        await swatches[(i * 2 + mode.length) % swatches.length].click(); await page.click('#tool-' + tool);
        await draw([[0.3 + i * 0.05, 0.3], [0.5, 0.45], [0.62, 0.36 + i * 0.04]]);
      }
    }
    await page.waitForTimeout(250);
    await page.screenshot({ path: `tests/out-${name}-${tab}.png` });
    const check = await page.evaluate(() => {
      const r = id => document.getElementById(id).getBoundingClientRect();
      const st = r('stage'), kn = r('panel'), d = document.documentElement;
      return { scroll: d.scrollHeight - innerHeight, sideScroll: d.scrollWidth - innerWidth, knobsOverlap: kn.top < st.bottom - 1 && kn.bottom > st.top && kn.left < st.right - 1 && kn.right > st.left + 1 };
    });
    const ok = check.scroll <= 0 && check.sideScroll <= 0 && !check.knobsOverlap;
    results.push(ok ? tab : `${tab} FAIL ${JSON.stringify(check)}`);
    if (!ok) failed = true;
  }
  if (errors.length) failed = true;
  console.log(errors.length || results.some(r => r.includes('FAIL')) ? 'FAIL' : 'PASS', name, results.join(', '), errors);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
