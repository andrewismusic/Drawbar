// Layout: sizes the stage exactly to the drawing
import { page } from './clips.js';
import { $ } from './dom.js';
import { drawSizeBar } from './sizebar.js';
import { prefs } from './state.js';
import { resizeCanvas } from '../render/compose.js';

let lastDims = '';
export const isVisual = () => $('app').classList.contains('visual');
// Size the stage to exactly the drawing: as big as the space allows, with the knobs and controls kept clear of it
export function layout() {
  if (page === 'clips') return;
  const visual = isVisual(), wide = prefs.shape === 'wide';
  let aw, ah;
  if (visual) { aw = innerWidth; ah = innerHeight; }
  else {
    const main = $('main'), land = getComputedStyle(main).flexDirection === 'row', kh = $('knobRow').offsetHeight;
    if (land) { aw = $('left').clientWidth; ah = main.clientHeight - kh - 10; }
    else { aw = main.clientWidth; ah = main.clientHeight - kh - 10 - $('panel').offsetHeight - 14; }
  }
  let w, h;
  if (wide) { w = aw; h = ah; }
  else w = h = Math.min(aw, ah);
  w = Math.max(120, Math.floor(w)); h = Math.max(68, Math.floor(h));
  const st = $('stage'); st.style.width = w + 'px'; st.style.height = h + 'px';
  const key = [w, h, wide, visual, window.devicePixelRatio].join();
  if (key !== lastDims) { lastDims = key; resizeCanvas(w, h, wide); }
  drawSizeBar();
}
// Force a resize of the canvases (after the drawing quality changes)
export function relayout() { lastDims = ''; layout(); }
