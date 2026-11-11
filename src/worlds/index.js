// Worlds: one tab each. A world picks the materials, tools and patterns that run well together, caps the pattern
// knobs (limits), says how it starts (start) and how it renders (render). Sound is shared by all worlds for now.
// limits: copies = highest index into COPIES, tiles = most tiles across, turns = highest index into TURNS, rotate = free-mode turning.
import { score } from '../core/state.js';
import { matIndex } from '../styles/index.js';
import classic from './classic.js';
import materials from './materials.js';
import comic from './comic.js';
import pixel from './pixel.js';
import geometric from './geometric.js';
import glitch from './glitch.js';
import graffiti from './graffiti.js';

export const WORLDS = [classic, materials, comic, pixel, geometric, glitch, graffiti];
export const WORLD = Object.fromEntries(WORLDS.map(w => [w.id, w]));
for (const w of WORLDS) w.matIdx = w.mats.map(matIndex);
export const world = () => WORLD[score.world] || classic;
