# Drawbar: hand-off

A generative music instrument where **the drawing is the score**. You draw with tools and materials on a canvas that repeats your marks (free, kaleidoscope, tiles). A hidden "map" (000–999) turns the drawing into music. Same drawing + same map = same music, always.

The app was called Visual Score until v18; it is now **Drawbar**. This folder continues a prototype built over ~18 versions in a claude.ai conversation. The last published version is v18 (artifact: https://claude.ai/artifact/Hx9TcTZnsncB5bP2baHAVF). The original concept doc is at https://claude.ai/artifact/D8bkZqvpYEzrZAhtXFKVdi. It describes the vision but is out of date on details (it predates v5); this file wins wherever they disagree.

## Files

| Path | What |
|---|---|
| `index.html` | Markup only. Loads `src/app.css` and `src/main.js` (an ES module). No build step, no dependencies. |
| `src/` | The app, as browser ES modules. See "Code map" below. |
| `reference/ensemble-engine-v3.html` | An older, shelved sound engine (bass / chords / lead / harmony roles with a chord progression). Kept for ideas when building genre engines. Not used by the app. |
| `tests/smoke.mjs` | Headless Playwright smoke test: in every style tab, draws in every mode with every tool (stamps too); checks for page errors, page scroll and overlap at three screen sizes. |
| `tests/perf.mjs` | Frame time, redraw time and re-lighting for every style tab at its heaviest allowed settings, plus the pairings the tabs avoid. `node tests/perf.mjs <url> <filter>` runs only matching cases. |
| `tests/equiv.mjs` | Equivalence check for refactors: same seeded strokes into two builds, compares `arrange()` output and canvas pixels (3 maps x 6 pattern settings). `--skip=14` leaves out materials whose look changed on purpose (14 = Flower vine since v20). |

## Running it

- Serve the folder: `npx serve .` (or `python3 -m http.server`) and open the page. **Opening `index.html` straight from disk no longer works**: browsers refuse to load ES modules from `file://`.
- Sound starts on the first touch or click anywhere (browser autoplay rules).
- Tests need Playwright (`npm i -D playwright` once, or link an existing install into `node_modules`). With the page served on port 3000: `node tests/smoke.mjs`.
- To prove a refactor changes nothing, serve the previous build on another port and run `node tests/equiv.mjs <oldUrl> <newUrl>`. The last single-file version (v18) is commit `73ca3f1` (`git show 73ca3f1:index.html`).

### Publishing to claude.ai

The app is published to the v18 artifact link (https://claude.ai/artifact/Hx9TcTZnsncB5bP2baHAVF) as a multi-file artifact: `node tools/artifact-page.mjs <out.html>` writes the page without its own `<html>`/`<head>` wrapper (the artifact host adds it), and every file under `src/` is published beside it at the same path. The artifact keeps its `db`, `user` and `downloads` capabilities, so clips and export work there.

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
| `render/stamps.js` | Geometric stamps: outline points per shape (`stampPts`) and the filled shape (`stampShape`) |
| `render/glyphs.js` | Glitch code: grid cells along a mark (`glyphCells`), glyph sheets per colour, `drawGlyphs` |
| `render/plants.js` | Garden: plant generators along a line or at bead points (`growPlant`) |
| `render/compose.js` | Canvases, compose canvas `fb`, cached static groups (`pool`), hidden-stroke test, glow, re-lighting with cross-fade, auto quality, `frame()` |
| `styles/realistic.js`, `comic.js`, `graffiti.js`, `flat.js`, `code.js`, `garden.js` | One file per material family: op lists and material entries. `styles/index.js` assembles `MATS` and derived fields (including `M.lit`). New materials are only appended (strokes store an index). `retired.js`: v19's pixel, facet and neon materials, offered by no tab, kept so their drawings still open |
| `worlds/*.js` | One file per style tab: materials, tools, modes, knob limits, start settings, render options. `worlds/index.js` lists them |
| `sound/vocab.js` | Scales, instrument pools per tool, effects list, `MODT` modulation targets |
| `sound/maps.js` | `makeMap(n)`: seeded per-map choices (effects, mixing matrix `W`, mod targets, drum kit and params, tone curves, instruments, free-rotation response `rot`) |
| `sound/arranger.js` | `arrange()`: strokes into lanes of note events, drums (Euclidean), loops, drones, modulation slots, note budget (`select`) |
| `sound/pitch.js` | `scaleMidi` (always snaps to octaves: this fixed clashing parts), `lineNote` |
| `sound/graph.js` | `buildAudio()` and the `apply*` functions: master bus, compressor, reverb, delay, granular, shimmer, smear, spectral thinning, wobble, tremolo, per-family tone chains, `N.wet` (Space), `N.toneVol`/`N.drumVol` (Level knobs) |
| `sound/instruments.js`, `sound/drones.js` | `voice()` (piano, pluck, wave = stroke wavetable, bell, glass, wood, pad), `drumHit()` (hand / acoustic / electro / lofi); drones from ripple strokes |
| `sound/scheduler.js` | `schedule()` every 25 ms with 120 ms lookahead; Density = Euclidean thinning, Probability = seeded hash; free-mode rotation reshapes pitch, pan, rhythm and two effect sends |


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

Materials (in `MATS` order): Liquid metal, Strawberry, Lemon, Mint, Blueberry (realistic, soft shading); Comic red/yellow/blue, Comic cloud, Ink hatch, Drip magenta, Drip violet (comic); Cloud, Slime (realistic); Flower vine (flat since v20); then retired v19 Pixel ×6, facets ×5, neon ×5; Graffiti ×5; Flat ×8 (Geometric); Code ×5 (Glitch); plants ×9 (Garden). `HDROP` is a hard drop shadow; `PAT('scan')` draws scan lines; a stroke's material colour enters the music through a fixed 15-step hue (`HUE_STEPS` in arranger.js), so adding materials never changes the music of an existing drawing.

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

**Drawing must never pause the animation** (v21). Finishing a stroke used to redraw every stroke in every copy and run the hidden-stroke test, all in one frame (47 ms in Classic, 54 ms in Comic, 316 ms in Garden with 12 strokes in the kaleidoscope: the rotation visibly stopped). Now:
- `strokeAdded(s)` (settings.js) calls `appendStroke(s)` (compose.js): only the new stroke is drawn, into the top cached layer. 2–5 ms whatever the size of the drawing.
- The hidden-stroke test runs a moment later, about 3 ms per frame (`checkHiddenSoon`, `stepHiddenCheck`); if its answer changes, the music is re-arranged (`hiddenChanged`) and the layers are redrawn in the background through the re-light path (slice per frame, cross-fade). Erasing uses the same lazy path (`rebuild(tc, true)`).
- Re-lighting stops each frame on a cost budget (500) or after 6 ms.
- Undo, clear, clip load and knob turns still redraw everything at once (`rebuild`).
- Garden: Beads blooms are thinned (`beadEvery`), since a line of bead sunflowers was 38 ms per redraw.
- Classic keeps v18's soft materials in the kaleidoscope, so it still has long frames from re-lighting (up to ~80 ms in the test); the other tabs had none over 34 ms.

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

**Done:** buildless ES modules, layout as above. Checked with `tests/smoke.mjs` (passes at all three sizes) and `tests/equiv.mjs` against v18: identical `arrange()` output and identical canvas pixels for 15 strokes (every v18 material, all four tools) across 3 maps x 6 pattern settings. Visible changes: the name (Drawbar, in the title and top bar), export file names (`drawbar-417.mp4`), and the page must now be served rather than opened from disk.

### 2. "Worlds": one app, art styles paired with genres (round 2 done)

The owner wants one app where drawing styles and canvas modes are paired with, and optimised for, music genres.

**Style tabs.** One tab per world, each with its own drawing, undo, sound knobs, tool and material (kept while you visit other tabs). All share the current sound engine for now. Aim: find brush × pattern × animation combinations that run without lag, and never pair the heaviest things. A clip remembers its tab (`score.world`); clips from before the tabs open in Classic. The last tab used is remembered (`prefs.world`). **Free mode is in every tab** (one or two draws per stroke: the cheapest pattern).

A tab you are not looking at costs nothing: leaving a tab drops its cached layers (canvases are set to 0 × 0 so phones get the memory back at once), stops any re-lighting, and resets auto quality so the next tab measures its own speed. Its drawing is kept as plain data; its sound stops (only the current arrangement plays).

| Tab | Materials | Tools | Patterns (limits) | Why |
|---|---|---|---|---|
| Classic | the 15 v18 materials | all | all, no limits | v18 unchanged (checked with `tests/equiv.mjs`; only the flower vine's look changed in v20); old clips |
| Materials | metal, creams, Cloud, Slime | Brush, Beads | free (turning), tiles up to 4 with 1–2 turns | soft shading is the costliest per copy; **no kaleidoscope**: it turns all the time, so every soft stroke in every copy is re-lit several times a second and the light visibly steps (the jitter seen on tablets) |
| Comic | comic red/yellow/blue, comic cloud, ink hatch | Brush, Beads | free (turning), kaleido up to 8, tiles up to 4 with up to 4 turns | light is fixed to the picture (no re-lighting); moving comic strokes rebuild halftone and ink every frame, so none |
| Garden | Flower vine and 9 plant brushes | Brush, Beads | free (turning), kaleido up to 8, tiles up to 4 | many small flat pieces, unlit: costs a redraw per stroke, never re-lights |
| Geometric | 8 flat colours | 5 stamps (circle, square, triangle, hexagon, star) | free (turning), kaleido up to 55, all tiles; Pixel option | one flat fill per shape per copy, unlit: the lightest style |
| Glitch | 5 code colours | all | free (no turning), tiles up to 4 with 1–2 turns | glyphs on a fixed grid; grid stays square to the screen |
| Graffiti | 5 sprays and Chrome, plus the two drips | Brush, Beads | free (no turning), tiles up to 3 with 1–2 turns | spray halo + marker outline + drips is the heaviest style: no kaleidoscope, no re-lighting, nothing moving |

**Lighting and CPU.** Materials are lit from one light, up-left on screen. When the picture turns (kaleidoscope always; free mode with Rotate), still strokes must be redrawn so the light stays put: `stepRelight` redraws them all in every copy, a slice per frame, whenever the picture has turned 0.1 radian (several times a second), then cross-fades. That is a constant background redraw, about 4× dearer per soft layer. So:
- `M.lit` (styles/index.js) marks materials whose look depends on the light (a layer slid toward it, or a drop shadow). Flat (Geometric), code (Glitch) and garden materials are not lit: if nothing on screen is lit, turning never re-lights; the cached layers just turn.
- `render.fixedLight` (Comic) lets a lit style's light turn with the picture instead of re-lighting.
- Materials avoids the kaleidoscope entirely; in free mode with Rotate it still re-lights, but only one or two copies.
- Tiles never turn, so they never re-light.

**Measured** (`tests/perf.mjs`, headless Chromium drawing on the CPU, 12 strokes, heaviest allowed settings; compare rows, not absolute numbers). Frame time is what you feel as smoothness; redraw is the pause after each new stroke and is noisy run to run (v18's default ranged 65–124 ms); re-lighting is the share of frames spent re-lighting.

| Case | Redraw ms | Frame ms (median / 90th pct) | Re-lighting |
|---|---|---|---|
| Classic: v18 default, kaleido 6 with loops and ripples | 65 | 50 / 117 | 78% |
| Materials free, turning / tiles 4 with 2 turns | 21 / 50 | 17 / 17 | 55% / 0% |
| Comic kaleido 8 / tiles 4 with 4 turns / 3 turns (hex) | 167 / 86 / 165 | 17 / 17 | 0% |
| Garden free turning / kaleido 8 / tiles 4 with 6 turns | 17 / 134 / 131 | 17 / 17 | 0% |
| Geometric kaleido 55 (also with Pixel) / tiles 6 with 6 turns | 15 / 4 | 17 / 17 | 0% |
| Glitch free / tiles 4 with 2 turns (with loops and ripples) | 3 / 7 | 17 / 17–33 | 0% |
| Graffiti free / tiles 3 | 20 / 46 | 17 / 17 | 0% |
| Avoided: Materials kaleido 6 | 134 | 17 / 83 | 60% |
| Avoided: Materials kaleido 21 | 387 | 50 / 150 | 90% |
| Avoided: Materials or Comic tiles 4 with 6 turns (hex) | ~300 | 17 / 17 | 0% |
| Avoided: Comic with loops, kaleido 16 | 174–183 | 117–133 / 167–283 | |
| Avoided: Graffiti kaleido 16 | 327 | 17 / 217 | 80% |

What drives cost: still strokes cost a one-off redraw that grows with copies × strokes (×4 per soft layer); hex tilings (3 and 6 turns) place many more copies than square ones; moving strokes (Loop, Ripple) cost every frame, growing with moving strokes × copies; re-lighting is a constant redraw while the picture turns. These are headless numbers; they still need checking on the owner's devices.

**Styles:**
- **Geometric**: stamps, not brushes. Tap to stamp at the size bar's size, or press and drag to set size and turn (the first corner points at the finger). A stamp is stored as a stroke whose points trace its outline once (`stampPts`), so clips, undo and the music need nothing new; the arranger hears a closed line with corners, played with the Beads instrument (`TOOL.voice`). The eraser removes a stamp whole. **Pixel** (`score.pixel`, a toggle after the colours, saved with clips) draws the canvas at a quarter resolution and scales it up with `image-rendering: pixelated`; edges are anti-aliased at that resolution, so blocks are slightly soft.
- **Glitch**: marks become cells on a fixed grid (`GCELL`, in the drawing's own space) showing seeded glyphs (katakana, digits, symbols) from a pre-drawn sheet per colour, over a faint panel tint; a moving stroke's newest cells are bright; a faint grid shows in free mode; `render.glitch` shifts a few slices of the frame in short bursts (visual only, off with reduced motion). Mirrored copies show mirrored glyphs.
- **Garden**: each plant brush grows keyed pieces along the line (daisies, tulips, lavender, fern, grass, berries, blossom, clover, sunflower, and the flower vine); Beads makes one bloom or clump per bead. "Up" is the side of the line facing the top of the drawing. Plants' pieces are joined in `paths.all` for the hidden-stroke test.
- **Graffiti**: an overspray halo (`S` at k 1.9), a fat wobbly marker outline (`inkW`), drips, a hard highlight.
- **Flower vine** lost its black outlines (and its comic ink) in v20 and moved from Comic to Garden.
- v19's Pixel tab and its materials are gone from the tabs (materials kept in `retired.js` so v19 clips still draw; clips from removed tabs open in Classic).

**Still to do for worlds:** genre sound engines (see below), confirm pairings with the owner, decide whether maps are per world. Draft genre pairings, as each world file notes:

| World | Genres |
|---|---|
| Geometric (and with Pixel) | IDM, acid, electro, EDM (Pixel: lofi, house, chiptune) |
| Glitch | IDM, experimental, trap |
| Graffiti | hip-hop, trap, funk, G-funk |
| Materials | classical romantic + impressionist, jazz, soundscape |
| Comic | funk, hip-hop, lofi |
| Garden | to be decided (soundscape, impressionist, lofi) |

The current sound engine (melodic lines, soft sparse drums, rich effects) is the basis for the ambient/classical/soundscape side. Genre engines will need real bass, chords and groove; see `reference/ensemble-engine-v3.html`. The map system should stay (1,000 maps per world, or maps spanning worlds; to be decided).

Planned later: a preference choosing between the realistic and comic material styles.

### 3. Open items

- **Export:** UI exists (real-time recording). The owner said they'd think about the approach; local download fallback needed.
- **Drum levels:** drive curves were just loudness-compensated (v18) and the kick is quieter. This hasn't been checked by ear yet, so confirm with the owner.
- **Phone layout:** the top bar takes two rows.
- **Sound knobs:** Density, Probability, Space and Tone sit in an outlined group with a speaker icon and a "Sound" label (v21), to show they change the music only.
- **Glitch:** the owner wants more dynamic visuals (references: scan-line smears with colour fringing, datamosh blocks, pixel sorting, sci-fi HUD). Directions proposed in chat, awaiting the owner's pick.
- **Material ideas the owner liked but cut for now:** a twisting ribbon (flat strip, silver reverse, flips driven by line curvature) and popcorn.
- **Concept-doc ideas not built:** fractal mode, harmonograph, flow field, growth, phyllotaxis, girih, drift mode, share codes.

## Known quirks

- **Drips:** they hang straight down only in Free mode. In kaleido and tiles they turn with each copy.
- **Hidden-stroke test:** it's conservative and uses a low-resolution mask, so a stroke that's only just covered may still draw.
- **Glow:** materials with `glowA` add a blurred glow layer composited with `lighter`.
- **Clip storage:** each clip is limited to about 250 KB (data plus thumbnail).
