# Drawbar: hand-off

A generative music instrument where **the drawing is the score**. You draw with tools and materials on a canvas that repeats your marks (free, kaleidoscope, tiles). A hidden "map" (000–999) turns the drawing into music. Same drawing + same map = same music, always.

The app was called Visual Score until v18; it is now **Drawbar**. This folder continues a prototype built over ~18 versions in a claude.ai conversation. The last published version is v18 (artifact: https://claude.ai/artifact/Hx9TcTZnsncB5bP2baHAVF). The original concept doc is at https://claude.ai/artifact/D8bkZqvpYEzrZAhtXFKVdi. It describes the vision but is out of date on details (it predates v5); this file wins wherever they disagree.

## Files

| Path | What |
|---|---|
| `index.html` | Markup only. Loads `src/app.css` and `src/main.js` (an ES module). No build step, no dependencies. |
| `src/` | The app, as browser ES modules. See "Code map" below. |
| `reference/ensemble-engine-v3.html` | An older, shelved sound engine (bass / chords / lead / harmony roles with a chord progression). Kept for ideas when building genre engines. Not used by the app. |
| `tests/smoke.mjs` | Headless Playwright smoke test: draws in every mode and material, checks for page errors and page scroll at three screen sizes. |
| `tests/equiv.mjs` | Equivalence check for refactors: same seeded strokes into two builds, compares `arrange()` output and canvas pixels (3 maps x 6 pattern settings). |

## Running it

- Serve the folder: `npx serve .` (or `python3 -m http.server`) and open the page. **Opening `index.html` straight from disk no longer works**: browsers refuse to load ES modules from `file://`.
- Sound starts on the first touch or click anywhere (browser autoplay rules).
- Tests need Playwright (`npm i -D playwright` once, or link an existing install into `node_modules`). With the page served on port 3000: `node tests/smoke.mjs`.
- To prove a refactor changes nothing, serve the previous build on another port and run `node tests/equiv.mjs <oldUrl> <newUrl>`. The last single-file version (v18) is commit `73ca3f1` (`git show 73ca3f1:index.html`).

### claude.ai-only features

The page was hosted as a claude.ai artifact, which provides `window.claude.use('db' | 'user' | 'downloads')`. Outside claude.ai `window.claude` is undefined and the code already falls back:

- **Clips** (saved drawings) fall back to `localStorage` (`visual-score-clips`). That fallback works locally as-is. The storage keys keep the old name on purpose, so existing clips and preferences survive the rename.
- **Export** (`saveFile`) needs `downloads`; locally it just shows a toast. **To-do:** add a local fallback (`URL.createObjectURL` + `<a download>`).
- Preferences are always in `localStorage` (`visual-score-prefs`).

## Principles (from the owner; keep these)

1. The visual is the score. Nothing that affects the music is invisible. Hidden strokes (fully covered) are also silent.
2. The mapping stays hidden. Never expose which drawing feature drives which musical parameter.
3. Opaque, not random. Everything musical is seeded (`mulberry32`, `hash32`). `Math.random` is only used by the dice (Randomize) to pick a new map/settings. Probability below 100 uses a seeded per-note, per-cycle hash, so even "random" playback is repeatable.
4. High visual control, always beautiful: tools and materials make any scribble look finished.
5. A vast space: 1,000 maps × drawings × modes.
6. Uses: meditative listening and idea-finding. Not live performance.
7. The view (circle / fill, full screen) never changes the sound.

## Owner's working preferences

- The owner tests mainly on touch (phone, tablet, some pen), also desktop.
- The owner wants to hear about trade-offs plainly (e.g. "this costs CPU because…").
- UI copy: short, plain words, sentence case.
- After visual changes: screenshot-check at tablet landscape (1180×820), tablet portrait (820×1180) and phone (390×844). There must be no page scroll and nothing overlapping the drawing.
- Performance matters: the owner notices lag. See "Performance" below.

## Code map (`src/`)

Entry: `src/main.js` runs the set-up in the same order as the old single file (input, knobs, size bar, clips, export, controls, then first arrange, layout and the frame/schedule loops). Styles: `src/app.css`.

State that more than one module changes lives with one owner and is changed through a small setter (ES module imports are read-only): `useMap` (maps.js), `rearrange` (arranger.js), `setLastEnd` (transport.js), `takeId`/`seeId` (state.js), `setComposeRot` (ops.js), `markGroupsDirty`/`redrawSoon`/`refreshHidden` (compose.js), `relayout` (layout.js). The audio node table `N` is one shared object (sound/nodes.js).

| File | Contents |
|---|---|
| `core/math.js` | `mod`, `clamp`, `lerp`, `mulberry32`, `hash32`, `hashFrac`, `GOLD`, `SQ3` |
| `core/dom.js`, `core/color.js` | `$`, `toast`; colour helpers (`tint`, `shade`, `rgba`) |
| `core/state.js` | `score` (everything saved with a piece), `mix` (4 macro knobs), `ui`, `prefs`, undo/redo (`snap`, `checkpoint`, `SET_KEYS`), stroke ids |
| `core/tools.js` | `TOOLS` (Brush, Beads, Loop, Ripple, Erase), `brushSize`, `eraseRadius` |
| `core/stroke.js` | `smoothStroke`, `prepare(s)` (all per-stroke derived data, `_` prefixed), `sampleArc`, `animEventIdx` |
| `core/transport.js` | Tempo-anchored clock `beatAt`/`secAt`, play/stop as a virtual clock (`paused`, `pausedTotal`), `startAudio`, `rotAt`, `scrollAt` |
| `core/settings.js` | `rebuild`, `applySettings` (converts old `lattice`/`tess` clips), `restore`, `randomize`/`stepRandomize` (flip-clock map count, eased tempo glide), `setMap`, `setTempo` |
| `core/layout.js` | `layout()` (sizes the stage exactly to the drawing) |
| `core/input.js` | Drawing, erasing, pointer handling |
| `core/knobs.js`, `core/sizebar.js` | SVG knob component (ring grows thicker with value); Touchy-style size bar (bar thickness = real brush size) |
| `core/clips.js` | Pack/unpack drawings (base64 Int16), `db` store with `localStorage` fallback, clips page |
| `core/export.js` | Real-time `MediaRecorder` capture; "one full cycle" length when the piece truly repeats |
| `core/ui.js` | Wiring for all buttons, preferences, full screen; `syncUI` |
| `canvas/index.js` | `MODES`, shared readers (`rawH` pitch, `strokePhase`, `patternAmount`, `cycleBars`), and dispatch: `forCopies`, `eraseTester`, `effEraseR` |
| `canvas/free.js`, `kaleido.js`, `tiles.js` | Per mode: geometry (`fs`, `kCopies`, `tileGeo`), drawing copies, eraser through copies / tile wrap |
| `render/ops.js` | The drawing op language (see below), `localLight`, `drawShape` |
| `render/shapes.js` | Capsules, `buildShape`, drips, comic puffs, `extraPieces` (slime bubbles, vine leaves and flowers) |
| `render/compose.js` | Canvases, compose canvas `fb`, cached static groups (`pool`), hidden-stroke test, glow, re-lighting with cross-fade, auto quality, `frame()` |
| `styles/realistic.js`, `styles/comic.js` | One file per material family: op lists and material entries. `styles/index.js` assembles `MATS` (swatch order) and derived fields |
| `sound/vocab.js` | Scales, instrument pools per tool, effects list, `MODT` modulation targets |
| `sound/maps.js` | `makeMap(n)`: seeded per-map choices (effects, mixing matrix `W`, mod targets, drum kit and params, tone curves, instruments, free-rotation response `rot`) |
| `sound/arranger.js` | `arrange()`: strokes into lanes of note events, drums (Euclidean), loops, drones, modulation slots, note budget (`select`) |
| `sound/pitch.js` | `scaleMidi` (always snaps to octaves: this fixed clashing parts), `lineNote` |
| `sound/graph.js` | `buildAudio()` and the `apply*` functions: master bus, compressor, reverb, delay, granular, shimmer, smear, spectral thinning, wobble, tremolo, per-family tone chains, `N.wet` (Space), `N.toneVol`/`N.drumVol` (Level knobs) |
| `sound/instruments.js`, `sound/drones.js` | `voice()` (piano, pluck, wave = stroke wavetable, bell, glass, wood, pad), `drumHit()` (hand / acoustic / electro / lofi); drones from ripple strokes |
| `sound/scheduler.js` | `schedule()` every 25 ms with 120 ms lookahead; Density = Euclidean thinning, Probability = seeded hash; free-mode rotation reshapes pitch, pan, rhythm and two effect sends |

There is no `src/worlds/` yet; it arrives with roadmap step 2.

### Materials: the drawing op language

Every material is a list of ops run by `drawShape(ctx, shape, ops)`. A shape holds `paths` keyed by width factor `k` (1 = the stroke's own outline, 0.4 = a band 40% as wide down its middle), plus keyed extra pieces (`'leaf'`, `'bub'`, …) and an optional `ink` outline.

| Op | Meaning |
|---|---|
| `F(k, colour, off)` | Hard fill of band `k`, slid `off × w0` toward the light |
| `S(k, colour, off, blur, alpha)` | Soft (blurred) fill, drawn off-canvas with only its shadow landing; gives smooth gradients |
| `SOFTDROP(a)` / `{t:'drop', k}` | Soft drop shadow away from the light |
| `CLIP` … `END` | Clip to the outline (`paths[1]`) |
| `INKL(off)` | Comic ink outline (constant thickness, wobbles a little) |
| `HALF(colour, a, off)` | Halftone dots; `PAT('hatch'/'cross', colour, off)` hatching |
| `STROKE(key, lw)` | Ink line around a keyed piece (vine leaves and petals) |

**Lighting:** one light, up-left on screen. `localLight(ctx)` converts it into the current copy's space, so mirrored and turned copies are all lit from the same side. While the picture rotates, still strokes are re-lit a slice per frame and cross-faded (`stepRelight`).

Current materials: Liquid metal, Strawberry, Lemon, Mint, Blueberry (realistic, soft shading); Comic red/yellow/blue, Comic cloud, Ink hatch, Drip magenta, Drip violet (comic); Cloud, Slime (realistic); Flower vine (comic).

### Shapes

Strokes are built as **capsules** (a circle swept between neighbouring points) plus circles, all wound the same way so they fill as one clean outline with round tips. This replaced offset-edge ribbons, which made spikes on tight bends. Don't go back to offset edges.

## Canvas modes (`score.mode`)

- **free:** no copies. Params: Size (`fscale`, 50 = as drawn, 0 = 0.1×, 100 = 2×), Rotate (`frot`), Mirror (`fmirror`). Rotation affects the music per map (`MAP.rot`).
- **kaleido:** `copies` (index into `COPIES`, max 55), `spiral` 0–1 morphs even folds into a golden-angle sunflower, `mirror`. Turns once per 6 bars; notes sound as copies pass the top.
- **tiles:** square or hex grid by `turns` (1, 2, 4 = square; 3, 6 = hex), `tiles` = size, `mirror`. Scrolls upward past a hidden reading line; left to right = low to high pitch.

Old clips with `lattice` / `tess` modes are converted in `applySettings`.

## Performance (the owner notices lag)

Heaviest first:

1. **Soft-shaded materials × copies.** Each `S` layer is a blurred shadow draw, roughly 4× a plain fill.
2. **Kaleidoscope with many copies** (×2 with mirror). Every copy is fully drawn on each change.
3. **Re-lighting while rotating.**
4. **Loop/Ripple strokes:** rebuilt every frame and drawn per copy. These already use crisp, non-blurred ops (`M.animOps`).
5. **Full-screen compositing** at device pixel ratio. Auto quality (`watchFrameRate`) lowers resolution when frames run slow.

Tiles is cheaper than kaleidoscope: it draws one repeating cell and fills the view with it as a pattern, and it never re-lights. Fully covered strokes are skipped (`computeHidden`, on a 200 px mask).

**Biggest remaining win (not built):** render each still stroke once into a sprite at 8–16 pre-lit angles, then stamp copies with `drawImage`. Copies become nearly free; lighting is very slightly approximate; costs memory.

## Dead code

Removed during the split: ribbon (`RIB_FRONT`, `RIB_BACK`, `ribbonFace`, the `M.ribbon` branch, `multi` shapes, `backOps`), popcorn puffs, blob shading and stroke merging (`metalBlob`, `creamBlob`, `GLOSS`, `blobOps`, `_blob`, the `if (false)` merge, `_mkey`/`_mshape`, `_prims`), the `paste`/`swirl`/`twist`/`sprinkles` pieces and their op lists, `SHADE_SIDE`, `ramp` and `sampleStops`.

Still unused, left for now: `DISC` (color.js), `DROP`, `INK` (ops.js), `bbHit`, `litAt`, `renderMs` (compose.js), `stopAudio` (transport.js), `downloadsCap` (export.js).

## Roadmap agreed with the owner

### 1. Split into modules (done)

Keep it buildless if possible (ES modules in the browser), or use Vite. Suggested layout:

```
index.html
src/core/      math+seeds, state+undo, clock+transport, layout+UI, input, clips, export
src/canvas/    modes: free.js, kaleido.js, tiles.js (geometry, copies, erase tester, phase readers)
src/render/    shapes.js (capsules etc.), ops.js (drawShape, lighting), compose.js (groups, relight, glow, quality)
src/styles/    one file per art style / material family
src/sound/     audio graph + effects, instruments, scheduler, arranger
src/worlds/    one file per world (art style + canvas defaults + genre engine)
```

Behaviour must be identical after the split. Use the smoke test plus side-by-side screenshots, and a seeded audio check (same drawing + map produces the same event list from `arrange()`).

**Done:** buildless ES modules, layout as above. Checked with `tests/smoke.mjs` (passes at all three sizes) and `tests/equiv.mjs` against v18: identical `arrange()` output and identical canvas pixels for 16 strokes (every material, all four tools) across 3 maps x 6 pattern settings. Visible changes: the name (Drawbar, in the title and top bar), export file names (`drawbar-417.mp4`), and the page must now be served rather than opened from disk.

### 2. "Worlds": one app, art styles paired with genres

The owner wants one app where drawing styles and canvas modes are paired with, and optimised for, music genres.

**Genres wanted:** trap, hip-hop, IDM, EDM, acid, house, lofi, funk, G-funk, electro, experimental soundscape, classical (romantic), classical (impressionist), jazz.

**New art styles wanted** (CPU, lightest first): pixel art (very light: draw small, upscale crisp), geometric (light), glitch (steady per-frame screen effects; cheap if done with image slices), graffiti (heaviest: spray, drips, outlines; keep to low-copy canvases).

**Draft pairings** (not final; confirm with the owner):

| World | Genres | Canvas |
|---|---|---|
| Pixel | lofi, house, electro, EDM | high-copy kaleido / tiles |
| Geometric | IDM, acid, electro, EDM | tiles / kaleido |
| Glitch | IDM, experimental, trap | free / tiles |
| Graffiti | hip-hop, trap, funk, G-funk | free / low tiles |
| Materials (current) | classical romantic + impressionist, jazz, soundscape, lofi | free / moderate kaleido |

The current sound engine (melodic lines, soft sparse drums, rich effects) is the basis for the ambient/classical/soundscape side. Genre engines will need real bass, chords and groove; see `reference/ensemble-engine-v3.html`. The map system should stay (1,000 maps per world, or maps spanning worlds; to be decided).

Planned later: a preference choosing between the realistic and comic material styles. For now all materials stay available for testing.

### 3. Open items

- **Export:** UI exists (real-time recording). The owner said they'd think about the approach; local download fallback needed.
- **Drum levels:** drive curves were just loudness-compensated (v18) and the kick is quieter. This hasn't been checked by ear yet, so confirm with the owner.
- **Phone layout:** the top bar takes two rows.
- **Material ideas the owner liked but cut for now:** a twisting ribbon (flat strip, silver reverse, flips driven by line curvature) and popcorn.
- **Concept-doc ideas not built:** fractal mode, harmonograph, flow field, growth, phyllotaxis, girih, drift mode, share codes.

## Known quirks

- **Drips:** they hang straight down only in Free mode. In kaleido and tiles they turn with each copy.
- **Hidden-stroke test:** it's conservative and uses a low-resolution mask, so a stroke that's only just covered may still draw.
- **Glow:** materials with `glowA` add a blurred glow layer composited with `lighter`.
- **Clip storage:** each clip is limited to about 250 KB (data plus thumbnail).
