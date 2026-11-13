// State: score (everything saved with a piece), mix (the four macro knobs), ui, prefs, undo/redo
export const score = { mode: 'kaleido', copies: 4, spiral: 0, tiles: 3, turns: 1, mirror: true, fscale: 50, frot: false, fmirror: false, timing: 'clocked', inst: 'both', world: 'classic', pixel: false, fx: 'smear', map: 417, tempo: 92, key: 2, scale: 2, strokes: [] };
export const MIX_DEF = { density: 1, prob: 1, space: 0.5, tone: 0.7 };
export const mix = { ...MIX_DEF };
export const ui = { tool: 'glow', color: 1, brushV: 60, eraseV: 45, tint: '#ee3b3f' };
export const prefs = { rTempo: true, rMode: false, rFolds: true, glide: 1200, shape: 'circle', volTones: 80, volDrums: 80, world: 'comic' };
try { Object.assign(prefs, JSON.parse(localStorage.getItem('visual-score-prefs') || '{}')); } catch (e) {}
export const savePrefs = () => { try { localStorage.setItem('visual-score-prefs', JSON.stringify(prefs)); } catch (e) {} };
let nextId = 1;
export const takeId = () => nextId++;
export const seeId = id => { nextId = Math.max(nextId, id + 1); };
export const undoStack = [], redoStack = [];
export const SET_KEYS = ['map', 'key', 'scale', 'tempo', 'mode', 'copies', 'spiral', 'tiles', 'turns', 'mirror', 'fscale', 'frot', 'fmirror', 'timing', 'inst', 'world', 'pixel', 'fx'];
export const snap = () => ({
  set: Object.fromEntries(SET_KEYS.map(k => [k, score[k]])),
  strokes: score.strokes.map(s => ({ id: s.id, tool: s.tool, color: s.color, size: s.size, fx: s.fx, tint: s.tint, pts: s.pts.map(p => p.slice()), start: s.start, startBeat: s.startBeat })),
});
export function checkpoint() { undoStack.push(snap()); redoStack.length = 0; if (undoStack.length > 120) undoStack.shift(); }
