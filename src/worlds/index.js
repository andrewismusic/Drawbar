// Worlds: one tab each. A world picks the materials, tools and patterns that run well together, caps the pattern
// knobs (limits), says how it starts (start) and how it renders (render). Sound is shared by all worlds for now.
// limits: copies = highest index into COPIES, tiles = most tiles across, turns = highest index into TURNS, rotate = free-mode turning.
// colors: a palette, for tabs that pick brush and colour separately (the stroke stores it as s.tint).
// options: pixel = offers the Pixel toggle, fx = offers the Effect buttons. render: grid = code grid guide, glitch = slice effect.
// Free mode is in every world: it draws each stroke once (twice with mirror), the cheapest pattern.
import { score, ui } from '../core/state.js';
import { PALETTE, matIndex } from '../styles/index.js';
import classic from './classic.js';
import materials from './materials.js';
import comic from './comic.js';
import garden from './garden.js';
import geometric from './geometric.js';
import glitch from './glitch.js';
import space from './space.js';
import paint from './paint.js';

// Micro and Graffiti were removed as styles in v27 (their materials stay in MATS, so old drawings still open, in Classic)
export const WORLDS = [paint, materials, comic, garden, geometric, glitch, space, classic];
// The tabs on offer (Classic is legacy: see worlds/classic.js)
export const TABS = WORLDS.filter(w => !w.legacy);
export const WORLD = Object.fromEntries(WORLDS.map(w => [w.id, w]));
for (const w of WORLDS) w.matIdx = w.mats.map(matIndex);
export const world = () => WORLD[score.world] || classic;
// The Pixel option (Geometric): draw the canvas at a quarter resolution and scale it up crisp. 0 = off.
export const pixelScale = () => world().options && world().options.pixel && score.pixel ? 4 : 0;
// The colour in hand: the colour picker's where the tab has one (colors), else the material's own
export const ink = () => world().colors ? ui.tint : PALETTE[ui.color];
