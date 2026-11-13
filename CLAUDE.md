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
| `tests/equiv.mjs` | Equivalence check for refactors: same seeded strokes into two builds, compares `arrange()` output and canvas pixels (3 maps x 6 pattern settings). `--skip=14,5,6,7,8,9` leaves out materials whose look changed on purpose (14 = Flower vine since v20; 5–9 = the comic materials, whose halftone and hatch tiles are sharper since v25); the test turns on `setSyncDraw(true)` (compose.js) so the new build draws everything at once and holds its quality still; `--tools=glow,beads,ripple` leaves Loop out (loops are independent since v24, so they no longer match v18). |

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
| `core/knobs.js`, `core/sizebar.js` | SVG knob component (ring grows thicker with value); the size control: a button-sized circle whose filled disc is the brush at real size (drag up or right for bigger) |
| `core/clips.js` | Pack/unpack drawings (base64 Int16), `db` store with `localStorage` fallback, clips page |
| `core/export.js` | Real-time `MediaRecorder` capture; "one full cycle" length when the piece truly repeats |
| `core/ui.js` | Wiring for all buttons, preferences, full screen; `syncUI` |
| `canvas/index.js` | `MODES`, shared readers (`rawH` pitch, `strokePhase`, `patternAmount`, `cycleBars`), and dispatch: `forCopies`, `eraseTester`, `effEraseR` |
| `canvas/free.js`, `kaleido.js`, `tiles.js` | Per mode: geometry (`fs`, `kCopies`, `tileGeo`), drawing copies, eraser through copies / tile wrap |
| `render/ops.js` | The drawing op language (see below), `localLight`, `drawShape` |
| `render/shapes.js` | Capsules, `buildShape`, drips, comic puffs, `extraPieces` (slime bubbles, vine leaves and flowers) |
| `render/stamps.js` | Geometric stamps: outline points per shape (`stampPts`) and the filled shape (`stampShape`) |
| `render/glitchfx.js`, `sound/pulse.js` | Glitch live strokes (wireframes, cycling glyphs, per-stroke effects) and the note pulses they react to |
| `render/space.js` | Space: sprites, stamp lists per stroke, twinkle overlay, backdrop |
| `render/glyphs.js` | Glitch code: grid cells along a mark (`glyphCells`), glyph sheets per colour, `drawGlyphs` |
| `render/plants.js` | Garden: plant generators along a line or at bead points (`growPlant`) |
| `render/micro.js` | Micro: organism generators along a line (`growMicro`), the bright-field backdrop (`drawMicroBg`) |
| `render/compose.js` | Canvases, compose canvas `fb`, cached static groups (`pool`), hidden-stroke test, glow, re-lighting with cross-fade, auto quality, `frame()` |
| `styles/realistic.js`, `comic.js`, `graffiti.js`, `flat.js`, `code.js`, `garden.js`, `signal.js`, `space.js` | One file per material family: op lists and material entries. `styles/index.js` assembles `MATS` and derived fields (including `M.lit`). New materials are only appended (strokes store an index). `retired.js`: v19's pixel, facet and neon materials, offered by no tab, kept so their drawings still open |
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

Materials (in `MATS` order): Liquid metal, Strawberry, Lemon, Mint, Blueberry (realistic, soft shading); Comic red/yellow/blue, Comic cloud, Ink hatch, Drip magenta, Drip violet (comic); Cloud, Slime (realistic); Flower vine (flat since v20); then retired v19 Pixel ×6, facets ×5, neon ×5; Graffiti ×5; Flat ×8 (Geometric); Code ×5 (Glitch); plants ×9 (Garden); Wire ×5 (Glitch); Space ×8; Pop (Comic); Nodes (Glitch); Screentone, Brush ink (Comic); Solids, Scope, Bars, Scanlines, Point cloud, Terrain, Pixel sort, Datamosh, Glitch blocks (Glitch); Micro ×7 (style removed in v27). `HDROP` is a hard drop shadow; `PAT('scan')` draws scan lines; a stroke's material colour enters the music through a fixed 15-step hue (`HUE_STEPS` in arranger.js), so adding materials never changes the music of an existing drawing.

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
- No tab had a frame over 34 ms in the test (the retired Classic world still re-lights soft materials in the kaleidoscope).

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
| Paint (the app opens here) | one ink brush × 10 colours, on paper | Brush | free (turning), kaleido up to 8, tiles up to 4 with up to 4 turns | one flat fill of brush hairs per stroke per copy, unlit |
| Materials | metal, creams, Cloud, Slime | Brush, Beads | free (turning), tiles up to 4 with 1–2 turns | soft shading is the costliest per copy; **no kaleidoscope**: it turns all the time, so every soft stroke in every copy is re-lit several times a second and the light visibly steps (the jitter seen on tablets) |
| Comic | brushes Cel, Pop, Tone (screentone), Cloud, Hatch × 9 colours | Brush | free (turning), kaleido up to 8, tiles up to 4 with up to 4 turns | light is fixed to the picture (no re-lighting); moving comic strokes rebuild halftone and ink every frame, so none |
| Garden | 8 magical plant, fungus and fruit brushes (Coral retired from the tab in v25) | Brush | free (turning), kaleido up to 8, tiles up to 4 with up to 4 turns | many small flat pieces, unlit: costs a redraw per stroke, never re-lights |
| Geometric | 8 flat colours | 5 stamps (circle, square, triangle, hexagon, star) | free (turning), kaleido up to 55, all tiles | one flat fill per shape per copy, unlit: the lightest style |
| Glitch | brushes: Solids, Nodes, Code, Scope, Scan, Points, Terrain; effect brushes Sort, Mosh, Blocks (square swatches) × 9 colours | Brush, Loop, Trace, Ripple | free (no turning), tiles up to 3, no turns; Effect per stroke: Smear / Jitter | every stroke is redrawn every frame (thin lines, small image copies), so copies are kept few |
| Space | 4 nebulae, 2 star fields | Brush | free (turning), kaleido up to 8, tiles up to 4 with up to 4 turns | additive sprite stamps, unlit; twinkle is a small per-frame overlay |

**v27 changes:**
- **Paint** is a style of its own (`worlds/paint.js`), first in the picker and where the app opens (once, on the first v27 run, everyone is moved there: `prefs.paint27`). One brush, the ink brush that was Comic's Ink, on a paper backdrop (`render.bg: 'paper'`, `drawPaperBg`), in 10 colours. The hairs were reworked (`extraPieces` 'bristle'): how much ink a hair lays down falls as its load is used up, falls where the hand moved fast, and wanders with a value noise that never repeats; the hair's width follows that amount, so hairs taper out instead of stopping in blocks (at small sizes v26's on/off dashes all came out the same length). Slow strokes are full and (through the usual width rule) a little thicker; fast ones dry and streaky.
- **Micro and Graffiti are removed as styles** (owner's request). Their world files are gone; their materials stay in `MATS` and `render/micro.js` stays, so old drawings still open (in Classic). **Geometric's Pixel option is removed.**
- **A new stroke's copies are drawn a few per frame** (`pending`, `stepAppend` in compose.js; `forCopies` takes a copy range). This was the freeze after drawing at heavy settings: all copies of the new stroke were painted in one frame (70–180 ms in the test with 16 copies of a Space or Comic stroke). Now the copy under the finger is drawn at once, then 1, 2, 4, 8… copies per frame while frames stay quick (halving when one runs long). Worst frame after a stroke in the test: 50–67 ms, was 117–183. Counting copies and watching the real frame gap needs no cost model. A full redraw also starts with a small budget each time (`buildBudget` capped at 200 at the start) instead of inheriting the last one's.
- **Layout:** the draw row comes first under the drawing: tools, the **style picker in the middle** (its list opens upward), the size circle; with more than three tools (Glitch, Geometric) the tools take their own row above. The loop-timing buttons are back in the top bar. The top bar is sound and housekeeping; drawing controls are all below the drawing. A style with one brush hides the brush row. The accent colour falls back to off-white when the colour in hand is too dark to see.
- **Double tap resets**: size circle to 50, every knob with a default (sound knobs, Size 50, Spiral 0, Copies / Tiles / Turns to the style's starting value, levels 80), tempo to 92. Knobs detect the double tap themselves (`dblclick` was unreliable on touch).
- **Glitch:** **Trace** tool (`TOOL.as: 'loop'`; stored as a loop stroke with `head: true`, saved in clips as `h`): a loop that leaves nothing behind, only the last moment of the gesture (`headSpan`) going round. Loop no longer has a bright head. Nodes are at least 0.3 of the radius apart. Scan lines end a little long or short, each its own way. Sort covers whole big pixels (the stroke's outline is drawn at the big-pixel size to find which it touches), so its patch has staircase edges; no centre line on effect strokes. Effect brushes have square swatches after a divider. Solids' icon is a cube.
- **Space:** star brushes keep every star within the brush's own width (`near`, `Rs`). The thin filaments are gone (they did not read as nebula); drifting pieces are puffs only. A twinkle's flare is turned to lie on its star's own spikes, with the same spike count (they used to cross at odd angles). At most 2 twinklers per stroke outside free mode.

**v26 changes:**
- **Layout reorganised** (agreed with the owner). The four sound knobs and the loop-timing buttons are put away in a **Sound sheet** (`#knobRow.sheet`, opened by the speaker button `#soundBtn` in the top bar; it lies over the bottom of the controls, or the bottom of the side panel in landscape, never the drawing, and stays open while you draw). The style tabs are a **style picker** (`#styleBtn` shows the current style; `#worldTabs` is its drop-down list). **Export** is only on the clips page ("Export this drawing"). The size bar is a **circle** beside the tools (`#sizeBar.sizedot`). On a 390 px phone the drawing went from about 245 px to 350 px across. The sound button sits by the tempo, not by the pattern buttons as first proposed: that row has no room on a phone.
- **Brush size is capped at the size control's size on screen** (owner's request, to try): `setBrushMax` (tools.js) is set by `layout()` so the largest brush is as wide on screen as the 54 px control; `brushSize(v)` runs from 1.5× to that. So the largest brush in drawing units depends on the screen (about 12× on a tablet, 24× before). Stamps tapped without dragging follow the same size (`stampRadius`), so they are small now; drag for bigger. The eraser keeps its old range, scaled to fit the circle. Default `ui.brushV` is 60.
- **Tests:** `tests/equiv.mjs` holds the new build's stage at the old build's size (`forceStage` in layout.js), since the layouts no longer match. `tests/smoke.mjs` picks styles through the picker and checks the panel against the drawing.
- **Micro tab** (new, `render/micro.js`, `styles/micro.js`, `worlds/micro.js`): pond life under a microscope on a bright field (`render.bg: 'micro'`, a pale backdrop with out-of-focus specks, darker toward the rim). Seven brushes, each growing one kind of organism along the line: Amoeba (one lumpy body with pseudopods, grains, food, vacuoles, nuclei), Ciliate (separate cells fringed with hairs), Algae (green cells in a pale colony), Diatom (glass boats and discs with ribs), Bell animals (a branch along the line with stalked bells either side), Filament (a chain of bead cells with the odd larger one), Debris (golden-brown flecks). A cell's skin is its outline three times: bright halo, dark rim, body. Shapes are `noHide`. Nothing moves yet.
- **Glitch:** Sort, Mosh and Blocks rebuilt (v25's showed almost nothing over thin lines): they now **replace** the picture inside a patch three brush-widths wide. Sort is a real pixel sort (a small copy of the patch is read back every 2 slots, about 3 times a second, columns sorted by brightness, drawn back in big pixels; the read-back is the dear part). Mosh keeps a stale snapshot for a second or two and slides blocks of it. **Blocks** is now one of these brushes (strips of the live picture slip sideways, some recoloured) and no longer an Effect button; old strokes with the Blocks effect still draw. Bars is no longer offered. Nodes sit far apart (at least 0.13 of the radius), so their straight lines only roughly follow the hand. Code no longer wipes its cells: each frame every cell is given to the newest code stroke that has it (`claimCells`), older ones skip it. Scope lost its tick marks. Icons: Solids a polyhedron, Nodes a square on a line, Code a busy character, Terrain a mesh.
- **Comic Ink** is all brush hairs now (24 across, no solid body): each hair has its own ink load, fast parts run drier, some hairs are split from the start, ends are ragged.

**v25 changes:**
- **Full redraws are spread over frames** (`startBuild`, `stepRelight` with `build: true` in compose.js). Switching pattern, turning a pattern knob, undo, clear and clip load used to redraw every stroke in every copy in one frame (170–200 ms in the kaleidoscope with 12 strokes: the lag the owner saw when just switching to the kaleidoscope). Now the new picture is drawn out of sight, a budgeted slice per frame, and faded in (120 ms); with nothing on screen yet (tab switch, canvas resized) strokes appear as they are drawn. The budget tunes itself from the real frame gap (`buildBudget`), because the browser paints after our code returns, so timing our own code says nothing. Worst frame in the test: 50 ms; the picture settles in 0.2–0.4 s. The hidden-stroke test is always the per-frame one now (`rebuild` starts it at once; `lazy` waits 250 ms). `renderGroups` (all at once) remains for tests: `setSyncDraw(true)`.
- **Beads only in Materials.** Default brush size is larger (`ui.brushV` 42, was 26).
- **Narrow phones** (under 372 px wide, which is what the claude.ai app gives the page on a phone): the top bar stays on two rows, tools shrink instead of leaving the screen, Geometric's six buttons drop their labels. `tests`-style check used: every control inside the viewport and no two overlapping, at 15 screen sizes. Still failing: phone landscape (844×390) and very short screens (375×600); these wait for the layout reorganisation.
- **Picked colour is heard** (Comic, Glitch): `toneIdx(s)` (styles/index.js) = material index + a step from the tint's hue (12 hues, pale grey, dark grey), used wherever the music read `s.color`. Drawings without a tint are unchanged; v24 drawings with tints sound different.
- **Comic:** pattern tiles are 96 px (were 12: hatching and dots went soft under big brushes). New brushes: **Tone** (screentone: three dot sizes across the mark, one dot grid) and **Ink** (`extra: 'bristle'`: a solid wet start, then 13 bristle streaks that run dry; unlit, `noHide`). Black added to the palette.
- **Garden:** Spirals, Starbloom, Moonberries and Lanterns have a thin vine along the line again, with heads on short stalks either side (`vine` in `SPROUT`). Coral is no longer offered.
- **Glitch:** one **Solids** brush (`wire: 'auto'`): each solid is picked by the hand's speed at that point (tetra, cube, octa, dodeca, icosa as it gets faster). New line brushes (`M.gl`, `LIVE` in glitchfx.js), all built per frame from the stroke's points after sway, reveal and jitter: **Scope** (travelling wave), **Bars** (level bars), **Scan** (level screen lines with tears and a rolling band), **Points** (points circling the line, near and far), **Terrain** (wireframe ground). **Sort** and **Mosh** (`M.under`, `drawUnder`) work on whatever is painted beneath them: the patch under the stroke is copied to a spare canvas and drawn back as streaks (pixel sort) or sliding and repeated blocks (datamosh), clipped to the stroke; with nothing beneath, only a faint trace shows. **Code**: one character per grid cell: the cell alone picks the character, and a code stroke wipes its cells before drawing, so painting code over code just changes the colour.
- **Space:** star brushes keep to the drawn line (no wander, no thin patches, short scatter). Nebulae get thin filaments (a strand sprite, laid along the cloud) and a slow drift (up to 7 puffs or filaments per stroke circling their place, drawn each frame with the twinkles; 1 per stroke outside free mode, since each is an image copy per copy per frame).

**v24 changes that cut across tabs:**
- **Size in every pattern.** `score.fscale` (`fs()` in canvas/free.js) now scales the drawing in the kaleidoscope (each copy) and in tiles (the motif inside its tile; the grid stays put) as well as in free mode, with a third pattern knob (`pk3`). Input, eraser, pitch and phase readers and the arranger all read the scaled drawing, so what you hear matches what you see. Clips older than clip version 2 reset Size to 50 outside free mode.
- **Brush and colour picked separately** (tabs with `colors` in their world file: Comic, Glitch). The stroke stores the colour as `s.tint` (saved in clips and undo); `colorOf(s)` and `opsOf(s)` in styles/index.js give its colour and op list (tintable materials have `tintOps(colour)`, cached per colour, and `swatchFor(colour)`; `label` is the brush's name in these tabs). `ink()` in worlds/index.js is the colour in hand. The tint does not enter the music; the brush (material index) still does.
- **Loops are independent.** A loop keeps its own length and start instead of snapping to 1, 2, 3, 4, 6, 8, 12 or 16 beats from a whole beat: clocked, both are rounded to the nearest 16th note (`s._Pb`, `startBeat`). Clips save each stroke's start relative to the first (`b`).
- **A random map on every load** (main.js).
- **Brush size** goes up to 24× the base line (was 12×); the default is unchanged.

**Classic is retired as a tab** (v22): every v18 material and pattern now lives in another tab (Loop and Ripple are only in Glitch for now). `worlds/classic.js` stays as a legacy world (`legacy: true`): its tab appears only while an old clip saved in it is open, and `tests/equiv.mjs` switches to it to compare the sound engine with v18. The app starts in Comic (or the last tab used).

**Lighting and CPU.** Materials are lit from one light, up-left on screen. When the picture turns (kaleidoscope always; free mode with Rotate), still strokes must be redrawn so the light stays put: `stepRelight` redraws them all in every copy, a slice per frame, whenever the picture has turned 0.1 radian (several times a second), then cross-fades. That is a constant background redraw, about 4× dearer per soft layer. So:
- `M.lit` (styles/index.js) marks materials whose look depends on the light (a layer slid toward it, or a drop shadow). Flat (Geometric), code (Glitch) and garden materials are not lit: if nothing on screen is lit, turning never re-lights; the cached layers just turn.
- `render.fixedLight` (Comic) lets a lit style's light turn with the picture instead of re-lighting.
- Materials avoids the kaleidoscope entirely; in free mode with Rotate it still re-lights, but only one or two copies.
- Tiles never turn, so they never re-light.

**Measured** (`tests/perf.mjs`, headless Chromium drawing on the CPU, 12 strokes, heaviest allowed settings; compare rows, not absolute numbers). Frame time is what you feel as smoothness; redraw is the pause after each new stroke and is noisy run to run (v18's default ranged 65–124 ms); re-lighting is the share of frames spent re-lighting.

| Case | Redraw ms | Frame ms (median / 90th pct) | Re-lighting |
|---|---|---|---|
| (retired) Classic: v18 default, kaleido 6 with loops and ripples | 65 | 50 / 117 | 78% |
| Materials free, turning / tiles 4 with 2 turns | 21 / 50 | 17 / 17 | 55% / 0% |
| Comic kaleido 8 / tiles 4 with 4 turns / 3 turns (hex) | 167 / 86 / 165 | 17 / 17 | 0% |
| Garden free turning / kaleido 8 | 19 / 151 | 17 / 17 | 0% |
| Geometric kaleido 55 (also with Pixel) / tiles 6 with 6 turns | 15 / 4 | 17 / 17 | 0% |
| Glitch free, each effect | 0 | 33 / 33 (Smear), 17 / 17–33 (Blocks, Jitter) | 0% |
| Glitch tiles 3 (Smear, Jitter) | 0 | 17 / 33 | 0% |
| Space free turning / kaleido 8 / tiles 4 with 4 turns | 23 / 185 / 130 | 17 / 17 | 0% |
| Avoided: Glitch tiles 4 with 2 turns, Smear | 0 | 33–50 / 50–83 | 0% |
| Graffiti free / tiles 3 | 20 / 46 | 17 / 17 | 0% |
| Avoided: Materials kaleido 6 | 134 | 17 / 83 | 60% |
| Avoided: Materials kaleido 21 | 387 | 50 / 150 | 90% |
| Avoided: Materials or Comic tiles 4 with 6 turns (hex) | ~300 | 17 / 17 | 0% |
| Avoided: Comic with loops, kaleido 16 | 174–183 | 117–133 / 167–283 | |
| Avoided: Graffiti kaleido 16 | 327 | 17 / 217 | 80% |

What drives cost: still strokes cost a one-off redraw that grows with copies × strokes (×4 per soft layer); hex tilings (3 and 6 turns) place many more copies than square ones; moving strokes (Loop, Ripple) cost every frame, growing with moving strokes × copies; re-lighting is a constant redraw while the picture turns. These are headless numbers; they still need checking on the owner's devices.

**Styles:**
- **Geometric**: stamps, not brushes. Tap to stamp at the size bar's size, or press and drag to set size and turn (the first corner points at the finger). A stamp is stored as a stroke whose points trace its outline once (`stampPts`), so clips, undo and the music need nothing new; the arranger hears a closed line with corners, played with the Beads instrument (`TOOL.voice`). The eraser removes a stamp whole. **Pixel** (`score.pixel`, a toggle after the colours, saved with clips) draws the canvas at a quarter resolution and scales it up with `image-rendering: pixelated`; edges are anti-aliased at that resolution, so blocks are slightly soft.
- **Glitch** (`render/glitchfx.js`). Every Glitch stroke is "live" (`M.live`): never cached, redrawn each frame by `drawLive`, in the colour picked (`s.tint`).
  - **Wire brushes** (`styles/signal.js`: Tetra, Cube, Octa, Icosa, Dodeca): up to about 9 tumbling 3D wireframe solids along the line. **Nodes** (v24): up to 16 white points joined by a thin line with cross-links and a ring at the start (the look of v22's HUD effect). **Code** (the Matrix material): glyph cells, twice the v23 size, whose characters keep being replaced, each cell at its own pace. All 64 characters are real: 46 half-width katakana, the digits 0–9 and 8 ASCII symbols. Loop strokes reveal in time; Ripple strokes sway.
  - **Effects belong to the stroke**: `s.fx` is set from the Effect buttons (`score.fx`) when the stroke is drawn, and saved. Each stroke seeds its own direction, reach, pace and hold. Smear: fading copies trail to one side with red and cyan fringes. Blocks: pieces slip sideways, some in flipped colour. Jitter: solids, nodes or cells jump out of place and change size. (HUD was removed as an effect in v24; old HUD strokes show as Smear.)
  - **Audio**: each stroke pulses with its own notes plus the drums (`sound/pulse.js`). One-way. With reduced motion the strokes hold still.
- Code cells sit on a fixed grid (`GCELL`, in the drawing's own space), drawn from a pre-drawn sheet per colour; a Loop stroke's newest cells are bright; a faint grid shows in free mode. Mirrored copies show mirrored glyphs.
- **Garden** (v24): no line along the stroke, no glow, no Beads, no vine: fungi stand on their own stalks; flowers and fruit (Spirals, Starbloom, Moonberries, Lanterns) are just heads on the invisible line. A film grain (`GRAIN` op: dark and light specks and a few scratches, a pattern fill over `paths.all`) sits on every plant. Built as in v23: each brush sprouts curved stalks from the line with a head at the tip (`SPROUT` and `HEADS` in `render/plants.js`): Glowcaps, Bellcaps, Trumpets, Puffballs (fungi), Coral, Spirals, Starbloom, Moonberries and Lanterns (fruit), plus the recoloured flower vine. Saturated flat colours. "Up" is the side of the line facing the top of the drawing. Pieces are joined in `paths.all` for the hidden-stroke test. These reuse the v20 plant slots in `MATS`, so v20–22 Garden clips now grow the new plants.
- **Space** (v23, `render/space.js`, `styles/space.js`): a stroke is a seeded list of stamps of soft pre-drawn sprites (lumpy gas puffs, points, stars with 4 or 6 diffraction spikes, tilted spiral galaxies, dark dust), one image copy each. Since v24 gas is laid over like see-through paint (not added), so stacked clouds mix colours without getting brighter; only stars add light. To hide the stroke's line, the cloud's centre wanders either side of it, thins out in patches, and stars, wisps, the odd planet and far galaxy scatter up to 3–4 cloud radii out, fainter and smaller with distance. Galaxy and Dust brushes are no longer offered. A few bright stars per stroke twinkle through a per-frame overlay (`drawTwinkles`); the backdrop is a pre-drawn deep field (`drawSpaceBg`). Space shapes are `noHide`: soft light neither hides strokes nor is hidden.
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
| Space | soundscape, ambient |

The current sound engine (melodic lines, soft sparse drums, rich effects) is the basis for the ambient/classical/soundscape side. Genre engines will need real bass, chords and groove; see `reference/ensemble-engine-v3.html`. The map system should stay (1,000 maps per world, or maps spanning worlds; to be decided).

Planned later: a preference choosing between the realistic and comic material styles.

### 3. Open items

- **Export:** UI exists (real-time recording). The owner said they'd think about the approach; local download fallback needed.
- **Drum levels:** drive curves were just loudness-compensated (v18) and the kick is quieter. This hasn't been checked by ear yet, so confirm with the owner.
- **Layout reorganisation: built in v26, adjusted in v27** (see above).
- **Under discussion with the owner (not built):** a new way to draw in Geometric (shapes of varied size, kind and colour per stroke); modulation of the picture (LFOs on Copies, Spiral, Size); reading any image as music.
- **Phone layout:** the top bar takes two rows.
- **Material ideas the owner liked but cut for now:** a twisting ribbon (flat strip, silver reverse, flips driven by line curvature) and popcorn.
- **Concept-doc ideas not built:** fractal mode, harmonograph, flow field, growth, phyllotaxis, girih, drift mode, share codes.

## Known quirks

- **Drips:** they hang straight down only in Free mode. In kaleido and tiles they turn with each copy.
- **Hidden-stroke test:** it's conservative and uses a low-resolution mask, so a stroke that's only just covered may still draw.
- **Glow:** materials with `glowA` add a blurred glow layer composited with `lighter`.
- **Clip storage:** each clip is limited to about 250 KB (data plus thumbnail).
