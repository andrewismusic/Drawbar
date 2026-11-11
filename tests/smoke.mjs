// Smoke test: draws in every mode and material at three screen sizes; fails on page errors, page scroll or overlap.
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
  const box = await page.locator('#cv').boundingBox();
  const draw = async (pts) => {
    await page.mouse.move(box.x + box.width * pts[0][0], box.y + box.height * pts[0][1]); await page.mouse.down();
    for (const q of pts.slice(1)) await page.mouse.move(box.x + box.width * q[0], box.y + box.height * q[1], { steps: 8 });
    await page.mouse.up();
  };
  const nMats = await page.locator('#swatches .sw').count();
  for (const mode of ['free', 'kaleido', 'tiles']) {
    await page.click('#mode-' + mode);
    for (const [i, tool] of ['glow', 'beads', 'loop', 'ripple'].entries()) {
      await page.click('#sw-' + ((i * 4 + mode.length) % nMats)); await page.click('#tool-' + tool);
      await draw([[0.3 + i * 0.05, 0.3], [0.5, 0.45], [0.62, 0.36 + i * 0.04]]);
    }
    await page.waitForTimeout(300);
    await page.screenshot({ path: `tests/out-${name}-${mode}.png` });
  }
  const check = await page.evaluate(() => {
    const r = id => document.getElementById(id).getBoundingClientRect();
    const st = r('stage'), kn = r('knobRow');
    return { scroll: document.documentElement.scrollHeight - innerHeight, knobsOverlap: kn.top < st.bottom - 1 && kn.bottom > st.top };
  });
  const ok = !errors.length && check.scroll <= 0 && !check.knobsOverlap;
  if (!ok) failed = true;
  console.log(ok ? 'PASS' : 'FAIL', name, JSON.stringify(check), errors);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
