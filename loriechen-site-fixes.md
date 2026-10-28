# loriechen.com — implementation plan from Golan Levin's portfolio feedback

For: a Claude Code session working in Lorie's site repo.
Audit date: 2026-10-27. Measurements were taken from the live site in a browser at 1440×900 unless noted.

## 0. Ground rules

- Find the repo first: the directory containing `index.html`, `style.css`, `main.js` and `desk-scene.js`. I audited the deployed site, not the repo, so every selector and line number below refers to the deployed files and may differ slightly from source.
- It is a hand-written static site (no framework). Clean URLs (`/synth-splat`) are served for `*.html` files, hosting is behind Cloudflare, and large assets live on `portfolioassets.loriechen.com`.
- `desk-scene.js` is loaded as `desk-scene.js?v=20260808-3`. Bump the `?v=` value whenever you edit it, or visitors keep the cached copy.
- Work on a branch, one commit per numbered task. Do not push or deploy. Lorie reviews first.
- Take before/after screenshots at 390, 768, 1024, 1440 and 1920 px wide for every page you touch.
- Do not invent technical claims, results or credits in copy. Where copy depends on facts only Lorie knows, write it as a marked `<!-- TODO(Lorie): confirm -->` draft.
- Do not add any new mention of the Carnegie Museum of Natural History or anyone from Carnegie in new copy.
- Not audited: `room.loriechen.com`, `about.html`, `playlab.html`, and mobile behavior.

### Blocked on Lorie (ask her; do not guess)

| # | Need | Used in |
|---|------|---------|
| a | Original (not web-resized) `all_masks_overlay`, ideally ≥2400 px wide | Task 2 |
| b | A real close-up photo of a cameo, plus the raw depth data (npy/tif/exr) behind `Z_vis_masked.png` | Task 5 |
| c | Confirm the Gem Stacking outcome wording and the confocal-stereo paragraph | Task 5 |
| d | The Synth Splat video file (from Nick or a fresh screen recording) | Task 4 |
| e | Approval of the headline statements for the three projects Golan did not write one for | Task 6 |
| f | Who owns the Catalogue Raisonné YouTube video (`I6ol_K3D7nk`) | Task 4 |
| g | How the site is deployed (look for `wrangler.toml`, `.github/workflows`, `_redirects`) | Task 7 |

## 1. What the audit found (root causes)

| Golan's point | What is actually happening |
|---|---|
| 4. Desktop margins too generous, illustrations too small | `--max-width: 720px` caps `header, main, footer` (work page, default pages). Project pages use `body.wide` at **960px**, then a `.project-layout` grid of a 220px sidebar plus a 64px gap, which leaves a **676px** content column. `.inline-img.right/.left` float at 44% of that column, so images render at **297px** wide. No media query targets screens wider than 900px (the breakpoints are ≤900, ≤600, ≤480, plus `pointer: coarse`), so there is no large-screen tier at all. |
| 5. Long Way Home image only 44 px tall | `images-web/plotting_art/dashcam/all_masks_overlay.jpg` is a **1600×237** strip (6.75:1) placed as `.inline-img.right`, so it renders **297×44**. It is also the lower-resolution `images-web` copy. |
| 3. Gem Stacking illustrations illegible | The first image, `images-web/graphics/getty/IMG_7515.jpg`, is the Getty Villa shot of hands holding a color checker beside a lens, and it shows at 297×223. The cameo is a tiny part of the frame. `images/graphics/getty/Z_vis_masked.png` (1332×1776, portrait) shows at 297×397 and is a masked visualization, not a recognizable depth map. The word "confocal" appears **nowhere** on the project page. |
| 2. Hidden cursor | Front page: `desk-scene.js` uses three.js `PointerLockControls` (line ~187). The canvas click handler calls `pointerControls.lock()` (~264). The primary CTA `#desk-intro-proceed` ("See the work →") also calls `pointerControls.lock()` (~273), so the main call to action captures the mouse. `setHoveredTarget` sets `renderer.domElement.style.cursor = 'none'` (~726). A fake center-screen reticle (`.desk-reticle`) replaces the pointer, and an `INVISIBLE_SELECTION_OFFSET_PX` hack exists. Synth Splat explorer (`synthsplat.loriechen.com`, repo `github.com/ylchen333/synth_splat_web`, file `splat_render.js`): "Click to enter" overlay calls `controls.lock()`, and any click on the canvas re-locks. |
| 1. Video owned by someone else, too slow to explain | `synth-splat.html` embeds `youtube.com/embed/E-ccZaLr0Ao`, and `work.html` uses `img.youtube.com/vi/E-ccZaLr0Ao/hqdefault.jpg` as its thumbnail. Both depend on Nick's channel. |
| 6. "Question" leads | Each project page has `<h2 class="project-section-label">Question</h2><p class="project-question">…`. Each work card has `<strong>Question:</strong> …` in `.work-desc`. |
| 7. Too much friction | The home page is a full-screen WebGL splat that loads three.js and Spark (`@sparkjsdev/spark` 2.1.0) before anything else, and the intro CTA enters pointer lock instead of navigating. Project data is duplicated by hand across `work.html` and the project pages. |

## 2. Task order

1. Layout tokens and desktop widths (Task 1)
2. Long Way Home hero (Task 2)
3. Statement headlines (Task 6)
4. New landing page and `desk` tab (Task 7)
5. Cursor and pointer lock, both repos (Task 3)
6. Gem Stacking (Task 5, needs assets b and c)
7. Synth Splat video (Task 4, needs asset d)
8. Optional cleanup (Task 8)

## Task 1 — Desktop layout (Golan 4)

Goal: on a 1440px screen the content is about 1200px wide and the first figure is at least 800px wide. Nothing stretches past about 1360px on large monitors.

1. Add tokens to `:root`: `--page-max: 1360px;`.
2. Replace **both** existing `body.wide header, body.wide main, body.wide footer` rules. One sets `max-width: 960px`. The other sets `max-width: 100%` inside the `@media (max-width: 600px)` block. Use a single rule: `max-width: var(--page-max);`.
3. Change `--max-width` (currently 720px) to 1200px for the default pages, or apply a `max-width: 1200px` variant to `work.html`. Check `about.html` (already 1100px) and `playlab.html` (`max-width: none`) for conflicts.
4. Widen the project grid and keep prose readable:
   ```css
   .project-layout { grid-template-columns: 200px minmax(0, 1fr); gap: var(--spacing-5); }
   .project-content .project-writeup p { max-width: 68ch; }  /* was 56ch from `section p` */
   ```
5. Stop floating images at 44%. Delete the float rules for `.inline-img.right` and `.inline-img.left` at all widths, and use:
   ```css
   .inline-img { float: none; display: block; width: auto; max-width: 100%;
                 max-height: 80vh; height: auto; margin: var(--spacing-5) auto; }
   ```
   With `width: auto` plus a max-height, landscape images fill the column and portrait images stay centered at screen height. Remove the now redundant `.inline-img` override in the ≤600px block.
6. Add a pair layout for side-by-side figures (used by Task 5):
   ```css
   .figure-pair { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-3); align-items: start; }
   .figure-pair img { width: 100%; max-height: none; margin: 0; }
   @media (max-width: 700px) { .figure-pair { grid-template-columns: 1fr; } }
   ```
7. Enlarge the lightbox: `.lb-main { max-width: 880px }` becomes `min(1600px, 92vw)`, and `.lb-main-img { max-height: 64vh }` becomes `88vh`. The carousel thumbnails (currently 316×237) will grow with the wider column.
8. `work.html`: widen the container so `.work-media` is about 560px or more instead of 328px. Keep the alternating rows. Where a thumbnail is a panorama or portrait, set `object-position` per image instead of relying on the center crop.

Acceptance: at 1440px, `main` is ≥1200px wide, the sidebar stays at 200px, and no page scrolls horizontally at 390, 768, 1024, 1440 or 1920px.

## Task 2 — Long Way Home hero image (Golan 5)

1. In `the-long-way-home.html`, move the `all_masks_overlay` image out of `.project-writeup` and into the page header, directly below the `<h1>` and tagline, as a full-bleed figure:
   ```html
   <figure class="hero-figure">
     <img src="images/plotting_art/dashcam/all_masks_overlay.jpg" alt="…" loading="eager" data-lightbox>
   </figure>
   ```
   ```css
   .hero-figure { margin: var(--spacing-5) calc(50% - 50vw); width: 100vw; }
   .hero-figure img { width: 100%; height: auto; max-height: none; margin: 0; }
   body { overflow-x: clip; }   /* 100vw includes the scrollbar width */
   ```
2. The image is a true 6.75:1 strip, so full-width it is about 213px tall at 1440 and about 284px at 1920. That is the honest shape of the work. Make it clickable to the existing lightbox so it opens at native resolution.
3. If Lorie supplies a larger master (blocked item a), put it in `images/` and use `srcset` for the web copy.
4. Fill in `alt` text. Suggested: "Segmentation masks overlaid on a panoramic dashcam landscape".
5. Leave the `clean_slitscan.jpg` image where it is, as a normal figure.

Acceptance: at 1440px the image is ≥1400px wide and ≥200px tall, with no horizontal scrollbar.

## Task 6 — Statements instead of questions (Golan 6)

Golan's three, verbatim, are the defaults. Lorie approves the other three.

| Project | Statement |
|---|---|
| synth splat | A realistic 3D environment that responds to music |
| gem stacking | A new 3D scanning method for historic cameo-glass gems *(see Task 5: confirm this matches what the project showed)* |
| the long way home | Landscapes, observed and drawn by machines *(alt from Golan: "Robot drawings of the machine-readable landscape")* |
| catalogue raisonné | *Draft:* A walkable 3D room that works like a searchable archive |
| dead things in jars | *Draft:* Capturing reflective, transparent specimens in 3D, where photogrammetry fails |
| comfyui nodes & workshops | *Draft:* Custom ComfyUI tools that let artists change what the model does |

Implementation:
1. Project pages: delete the `Question` section label and `.project-question` paragraph. Put the statement directly under the `<h1>`, using the existing `.project-question` typography (Fraunces, `clamp(1.6rem, 3vw, 2.4rem)`) under a new class `.project-statement`. Raise `max-width` from `26ch` to about `32ch`.
2. If Lorie wants to keep the question, move it into the first line of the Context section as a plain lead-in. Default is to drop it.
3. Work cards: replace `<strong>Question:</strong> …` with the statement as the bold lead sentence, followed by the existing one-line description with the question removed.
4. Do not touch factual claims in the descriptions.

## Task 7 — Simplify: new landing page, current experience under a `desk` tab (Golan 7)

1. `cp index.html desk.html`, then edit `desk.html`: keep `body.home-page`, the importmap, and `desk-scene.js` exactly as they are. Add `<link rel="canonical">` for `/desk`.
2. Rewrite `index.html` with no WebGL, no importmap and no `desk-scene.js`:
   - Nav: wordmark · work · **desk** · about · playlab · contact. Add `desk` to the nav on **every** page. Make "work" point to `/` and keep `work.html` as a redirect (use the Cloudflare `_redirects` file or a `<meta http-equiv="refresh">` plus canonical if there is no `_redirects`).
   - Hero: reuse the existing copy ("Prototyping how we'll create next." plus the intro paragraph and the "Open to creative-tools and spatial-computing teams" line). Keep the "Email me" link.
   - Project grid: all six projects as cards. Each card has a large image (≥560px wide on desktop, `aspect-ratio: 3/2`, `object-position` set per image), title, the statement from Task 6, tags, a "read" link to the project page, and a visible **"live build →"** link where one exists (synth splat → `synthsplat.loriechen.com`, catalogue raisonné → `room.loriechen.com`). Interactive things should be an explicit choice, never the entry point.
3. On `desk.html`, the intro button `#desk-intro-proceed` ("See the work →") should become a normal link to `/`. See Task 3 for removing its pointer-lock side effect.
4. Reduce friction for adding new work. Add `projects.json` (fields: `slug`, `title`, `statement`, `tags`, `thumb`, `thumbPosition`, `page`, optional `live`) and a dependency-free script (`build.mjs`, ~40 lines) that regenerates the card grid on `index.html` between `<!-- projects:start -->` and `<!-- projects:end -->` markers. Adding a project then means adding a JSON entry and a page. Confirm with Lorie before wiring this into any deploy step (blocked item g).
5. Remove from `index.html` any CSS-only leftovers you find unused after the rewrite (`.featured-work-grid`, `.open-to-work`, `.home-gallery`, `.home-scroll-cue` look like remnants of an older home page). Grep for usage first.

Acceptance: `/` loads with no three.js or Spark requests (check the Network panel), shows all six projects above the second fold on 1440px, and `/desk` behaves as the site did before.

## Task 3 — Visible cursor, no forced pointer lock (Golan 2)

Principle: the cursor is never hidden unless the visitor explicitly opts into an "Immersive mode".

### 3a. `desk-scene.js` (now served at `/desk`)

1. Default look control: click-and-drag on the canvas (`pointerdown`/`pointermove`/`pointerup` with `setPointerCapture`). There is already touch-drag look code (`touchLookEuler`, `TOUCH_LOOK_SENSITIVITY`, touch gesture state around line ~280). Reuse it for mouse by removing the `HAS_TOUCH_INPUT` gating rather than writing new look code.
2. Cursor styles: `cursor: grab` at rest, `grabbing` while dragging, `pointer` when hovering a selectable object. Delete `renderer.domElement.style.cursor = 'none'` in `setHoveredTarget` (~726). The CSS `.desk-viewport { cursor: crosshair }` should become `grab`.
3. Picking: pick from the **actual pointer position** (convert `clientX/Y` to NDC) instead of the screen center. Remove `INVISIBLE_SELECTION_OFFSET_PX`, `SELECTION_ANCHOR_NDC` center logic and the `.desk-reticle`/`.desk-fake-reticle` elements. A click that moved less than ~5px selects, and a drag does not.
4. Movement keys: the handler near line ~1013 returns early when `!controls.isLocked`. Change that condition to "the desk viewport has focus" (it already has `tabindex="0"`). Keep W/A/S/D/Q/E, and do not bind Space (it scrolls the page).
5. Pointer lock becomes optional. Remove every `pointerControls.lock()` call from the canvas click handler (~264) and from `introProceedButton` (~274). Add a small "Immersive mode" toggle in the controls strip that calls `lock()`, with `Esc` to leave. Keep the existing `unlock()` calls (~645, ~767, ~794) so focus/selection transitions still release a lock.
6. Update the hint text. Currently: "explore · look around to highlight · click to capture the mouse". Suggested: "drag to look · WASD to move · click an object to open it".
7. Touch path stays as is.

### 3b. Synth Splat explorer (`ylchen333/synth_splat_web`, `splat_render.js`)

1. Same change. In the `// ---------- controls (pointer-lock fly) ----------` section, `enterBtn` click and `renderer.domElement` click both call `controls.lock()`. Replace with drag-to-look and a visible `grab` cursor.
2. Movement currently runs only `if (controls.isLocked) updateMove(dt)` in the animation loop. Change to run whenever the page has focus and no input or slider is focused.
3. Turn the `#enter` overlay ("Click to enter") into a non-blocking hint, or keep it only as an "Immersive mode" button. Keep `P` (panorama capture, which currently unlocks first) working in both modes.
4. After changing, push as a branch in that repo, and bump any cache-busting query strings on the JS imports (`audio-analysis.js?v=2`).

Acceptance: load `/desk` and the Synth Splat app, click everywhere, drag, and scroll. The cursor never disappears unless Immersive mode is switched on, `Esc` always restores it, and `grep -n "\.lock()"` in both files finds only the Immersive-mode handler.

## Task 5 — Gem Stacking (Golan 3)

1. Replace the two small floated images with a `.figure-pair` at the top of "Experiment & technical approach": **left** a large photo of a cameo, **right** an intelligible depth map.
   - Photo: blocked item b. Do not reuse `IMG_7515.jpg` (it is the color-checker shot). Candidates in the carousel are `IMG_7469.jpg`, `IMG_7590.jpg`, `IMG_7609.jpg`, `IMG_7616.jpg` (all portrait, 1200×1600). View them and propose one; Lorie decides.
   - Depth map: if raw data exists, generate a grayscale PNG with a percentile stretch (2nd–98th), background masked to black, and a small near/far legend. Do not try to un-colorize `Z_vis_masked.png`. If only that PNG exists, say so to Lorie and stop on this item.
2. Optional, if time: a small rotating 3D height-field viewer. Three.js displaced plane from the depth map, auto-rotate, drag to rotate, lazy-loaded, respecting `prefers-reduced-motion`. Wrap it in an explicit "view in 3D" button so it is opt-in (see Task 3 principle).
3. Add a short **How it works** section that names confocal stereo. Draft (mark with `TODO(Lorie)`; this is the general technique, not necessarily her exact pipeline):
   > Confocal stereo recovers depth from a single viewpoint by photographing the same scene at many focus and aperture settings and measuring, per pixel, how the image changes. It needs no matching between viewpoints, which is why it is a candidate for reflective and translucent surfaces where photogrammetry fails.
   Cite Hasinoff & Kutulakos, *Confocal Stereo* (ECCV 2006; extended in IJCV 2009), after Lorie confirms it.
4. **Reconcile the story.** The project page says depth maps from "single-view depth extraction on top of Capture One Pro and a Phase One camera" were validated on 10+ artifacts. The work page says confocal stereo "failed on translucent gems" and "worked on diffuse relief objects". The resume says "confocal-stereo pipeline". The page should say one consistent, true thing (blocked item c). Also check that Golan's statement "A new 3D scanning method for historic cameo-glass gems" is still accurate against that.
5. Fill in `alt` text on all images on this page.

## Task 4 — Synth Splat video (Golan 1)

Code changes you can make now:
1. On `synth-splat.html`, put the existing `ezgif-54c8a933d80eb2ef.gif` (720×366, already on the page) at the top, directly under the statement from Task 6, so the tool is visible in the first seconds.
2. Once Lorie provides a file she owns: re-cut it so the first 10 seconds show the tool reacting to music, with no title card. Example:
   `ffmpeg -ss <start> -i source.mp4 -t 60 -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p -movflags +faststart out.mp4`
   Also make a muted 10–15 s loop (`-an`, mp4 plus webm) and a poster frame.
3. Host the files at `portfolioassets.loriechen.com` (her own storage). Replace the YouTube iframe with `<video controls playsinline preload="metadata" poster="…">`. If she re-uploads to her own YouTube channel, use that URL and keep it only as a secondary link.
4. On `work.html` and the new `index.html`, replace `img.youtube.com/vi/E-ccZaLr0Ao/hqdefault.jpg` with a local poster still or the loop.
5. Update the sidebar link "video documentation →" (currently `youtu.be/E-ccZaLr0Ao`) to her copy.
6. Catalogue Raisonné embeds `youtube.com/embed/I6ol_K3D7nk`. Find out who owns it (blocked item f) and treat it the same way if it is not Lorie's.

Acceptance: `grep -rn "E-ccZaLr0Ao"` returns nothing, and the first viewport of the project page explains the tool without pressing play.

## Task 8 — Optional cleanup found during the audit

- Add descriptive `alt` text to project-page images (every content image on the Long Way Home, Gem Stacking, Catalogue Raisonné and Dead Things pages has `alt=""`).
- Remove debug code shipped to production: `DEBUG_*` constants in `desk-scene.js`, `.desk-debug-marker` and `.desk-isolation-test*` CSS, and the commented-out isolation-test markup in `index.html`.
- `style.css` has two conflicting `body.wide` rules (Task 1) and several media blocks using only `max-width`. Consolidate while you are in there.
- Note for Lorie: the Dead Things in Jars page lists the Carnegie Museum of Natural History under "Partners" in the sidebar, and `work.html` says "With the Center for PostNatural History and the Carnegie Museum of Natural History." Leave as is unless Lorie asks for a change.

## Final checks

- All pages at 390, 768, 1024, 1440 and 1920px: no horizontal scroll, images at least 800px wide on desktop where Golan flagged them.
- Keyboard: tab through nav and cards, and confirm the `desk` link works from every page.
- `/work` and `/work.html` still resolve (redirect), and no links point to a missing page.
- No request for `three` or `spark` on `/`.
- Cursor never hidden by default on `/desk` or the Synth Splat app.
- Summarize changes per task, list anything left blocked on Lorie, and leave everything on a branch.
