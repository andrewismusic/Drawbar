// Drawbar: a generative music instrument where the drawing is the score.
// Entry point. Set-up runs in the same order as the original single-file version.
import { $ } from './core/dom.js';
import { initInput } from './core/input.js';
import { initKnobs } from './core/knobs.js';
import { initSizeBar } from './core/sizebar.js';
import { initClips } from './core/clips.js';
import { initExport } from './core/export.js';
import { initControls, applyView, syncUI } from './core/ui.js';
import { layout } from './core/layout.js';
import { playing, lastEnd, setLastEnd, sessionNow } from './core/transport.js';
import { rearrange } from './sound/arranger.js';
import { applySettings, switchWorld } from './core/settings.js';
import { prefs, snap } from './core/state.js';
import { TABS } from './worlds/index.js';
import { schedule } from './sound/scheduler.js';
import { frame } from './render/compose.js';

initInput();
initKnobs();
initSizeBar();
initClips();
initExport();
initControls();

rearrange();
{
  let pend = 0;
  const ro = new ResizeObserver(() => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; layout(); }); });
  for (const id of ['main', 'panel', 'knobRow', 'sizeBar']) ro.observe($(id));
}
// Reopen the style tab used last time
switchWorld(TABS.some(w => w.id === prefs.world) ? prefs.world : 'comic');
// A different map every visit (the dice's kind of randomness: it only picks which map)
applySettings({ ...snap().set, map: Math.floor(Math.random() * 1000) });
applyView();
layout();
syncUI();
requestAnimationFrame(frame);
setInterval(schedule, 25);
document.addEventListener('visibilitychange', () => { if (!document.hidden && playing) setLastEnd(Math.max(lastEnd, sessionNow())); });
