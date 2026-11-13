// Layout: sizes the stage exactly to the drawing
import { page } from './clips.js';
import { $ } from './dom.js';
import { drawSizeBar } from './sizebar.js';
import { prefs } from './state.js';
import { geo, resizeCanvas } from '../render/compose.js';
import { LINE, setBrushMax } from './tools.js';
import { pixelScale } from '../worlds/index.js';

let lastDims = '', forced = null;
// Tests: hold the stage at a given size (to compare pixels with a build whose layout differs)
export function forceStage(w, h) { forced = [w, h]; lastDims = ''; layout(); }
export const isVisual = () => $('app').classList.contains('visual');
// Size the stage to exactly the drawing: as big as the space allows, with the knobs and controls kept clear of it
export function layout() {
  if (page === 'clips') return;
  const visual = isVisual(), wide = prefs.shape === 'wide';
  let aw, ah;
  if (visual) { aw = innerWidth; ah = innerHeight; }
  else {
    const main = $('main'), land = getComputedStyle(main).flexDirection === 'row';
    if (land) { aw = $('left').clientWidth; ah = main.clientHeight; }
    else { aw = main.clientWidth; ah = main.clientHeight - $('panel').offsetHeight - 14; }
  }
  let w, h;
  if (wide) { w = aw; h = ah; }
  else w = h = Math.min(aw, ah);
  w = Math.max(120, Math.floor(w)); h = Math.max(68, Math.floor(h));
  if (forced) [w, h] = forced;
  const st = $('stage'); st.style.width = w + 'px'; st.style.height = h + 'px';
  const key = [w, h, wide, visual, window.devicePixelRatio, pixelScale()].join();
  if (key !== lastDims) { lastDims = key; resizeCanvas(w, h, wide); }
  // The largest brush is as big on screen as the size control (a button), whatever the size of the drawing
  setBrushMax((($('sizeBar').clientHeight || 54) - 4) / (2 * LINE * geo.Rcss));
  drawSizeBar();
}
// Force a resize of the canvases (after the drawing quality changes)
export function relayout() { lastDims = ''; layout(); }
