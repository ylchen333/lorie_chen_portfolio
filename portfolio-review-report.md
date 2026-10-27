# Portfolio review: findings and proposed fixes

Stage A of 2. Nothing in the site has been changed yet. Reviewed 8 Oct 2026 against `portfolio-framing-overview.md`, by loading home, work, about, playlab and synth-splat in a browser at desktop width, plus home and work at 390px.

Re-checked on the live site (loriechen.com) in a second pass, with the tab kept in focus. Two things from the first pass changed:

- **The desk works.** The first pass looked at a throttled background tab. With focus emulation on, WebGL2 is available and the desk renders fully. But at about 10 seconds after load the page was still almost entirely black (loader gone, a small figurine visible, the rest of the splat missing). It was complete by about 25 seconds. I didn't time it more finely, so the real load time on your connection is unknown. This strengthens D1.
- **The Spotify box is a real bug, not a blocked embed.** The worker endpoint `https://spotify-now-playing.loriechen333.workers.dev/playlist` returns HTTP 404 JSON, so the page shows "no recent tracks" to every visitor. The Instagram embed script loads and renders a 619px frame with one iframe, but the frame is visually empty in my browser. I can't tell whether that is Instagram refusing the embed, a cookie setting, or my browser, so treat the Instagram part as unconfirmed.

## Part 1. Content vs. the framing

| # | Framing item | Status | Evidence |
|---|---|---|---|
| 1 | State the through-line | Missing | Work intro says "Finished investigations into how emerging technologies can become creative tools..." No mention of partial views. About never says it either. |
| 2 | HCI/HRI entry | Missing | CoFRIDA is one sentence in About. Work has five projects, none on HCI/HRI. |
| 3 | ComfyUI and tools work | Missing | Playlab has a "comfyui" filter, but Work has no tools entry. |
| 4 | Outcome line per project | Mostly missing | Live links and partners exist on the project pages (`synthsplat.loriechen.com`, `room.loriechen.com`, Getty Villa, CPNH and Carnegie Museum, FRFF and BXA grants) but the Work list shows none of them. |
| 5 | Name the team type | Partial | "Looking for a creative R&D team" is generic. Contact is only reachable by scrolling to the bottom of About. The nav has no contact link and the home card has none. |
| 6 | Keep your voice | Mixed | The hero paragraph is the most polished copy on the site ("expressive, editable, and human creative medium"). About's second half is in your voice. |
| 7 | Hero load | Needs a fix | See design finding D1. |

Per your scope guardrail, I propose doing items 1, 4, 5 and 7 plus **one** new entry. I recommend the ComfyUI tools entry (your note says it is the nearest target). CoFRIDA can wait.

## Part 2. Proposed copy (humanizer pass)

All rewrites keep your facts and drop the patterns I found: triads, dashes used as connectors, "X, not Y" framing, stock "creative R&D" phrasing. These are drafts. The framing doc says to put the hero in your own words, so edit them freely.

### Home

| Where | Now | Proposed | Why |
|---|---|---|---|
| Hero paragraph | "I investigate emerging AI, graphics, robotics, and interactive technologies by building experimental tools and experiences. The prototypes ask how new technology can become a more expressive, editable, and human creative medium." | "I build small experimental tools with AI, graphics, robotics, and interactive tech. I want to know what artists do when they can reshape the technology itself." | Triad ("expressive, editable, and human"), abstract "creative medium", and "investigate...The prototypes ask" is staged. Says the same thing in two sentences. |
| Kicker | "Creative technologist · artist · engineer" | "Creative technologist · artist · engineer · open to creative-tools teams" | Names the team type (item 5). |
| Instruction | "This desk is a Gaussian splat · look around to explore the practice" | "This desk is a Gaussian splat. Look around." | "explore the practice" is filler. |
| Primary button | "Explore the investigations →" | "See the work →" and add a second link, "Email me" | Plain label, and contact is visible on load. |

### Work

New intro (replaces "Finished investigations into how emerging technologies can become creative tools, interfaces, and workflows."):

> A Gaussian splat builds a scene out of many partial views, and no single viewpoint holds the truth. Every project here asks a version of that question: what does a capture show, and what does it bend? A splat of a bedroom, a slit scan of a highway and a depth map of a gem each get something right and something wrong. I'm interested in both.

Outcome lines (one per project, only facts already on the site):

| Project | Outcome line |
|---|---|
| synth splat | Live: synthsplat.loriechen.com |
| catalogue raisonné | Live: room.loriechen.com |
| Gem Stacking | Tested at the Getty Villa Imaging Studios on 10+ real artifacts |
| The Long Way Home | Plotted drawings, with a Substack writeup |
| dead things in jars | With the Center for PostNatural History and the Carnegie Museum of Natural History. Funded by an FRFF Microgrant and a BXA Small Grant |

Tightening the "Question" blurbs:

- Synth Splat: "A 48-hour prototype maps audio features onto Gaussian splats, testing a performance workflow in which sound continuously reshapes space." becomes "In 48 hours I mapped audio features onto Gaussian splats, so that sound reshapes the space as it plays."
- Gem Stacking: "Tests at the Getty Villa revealed where confocal stereo fails on translucent gems—and a more viable workflow for diffuse relief objects." becomes "At the Getty Villa, confocal stereo failed on translucent gems. It worked on diffuse relief objects, which is where the method belongs."
- Catalogue Raisonné: "...to test alternatives to the virtual gallery." becomes "...as an alternative to the virtual gallery."

New entry, **06, Creative tools** (needs your confirmation on every claim; it comes from the resume as summarized in the framing doc):

> **Question:** What does a creative tool need so that artists can change what the model does? Custom ComfyUI nodes connect 5+ models, and real-time Gemini and ComfyUI interfaces ran in workshops at CMU and RISD. I also taught 3D Gaussian splatting to 20+ students.

Tags: ComfyUI · Gemini · custom nodes · workshops. I need a link and an image from you for it.

### About

| Where | Now | Proposed |
|---|---|---|
| Para 1 | "I'm Lorie Chen—a creative technologist, artist, engineer, and occasional snowboarder. I investigate how computational technologies become creative media: not simply tools to use, but materials whose behavior, interfaces, and possibilities can be shaped." | "I'm a creative technologist, artist, engineer, and occasional snowboarder. I treat computational techniques as materials, and I want to know what their behavior and interfaces let creative people shape." (The name repeats the H1. The "not simply X, but Y" and the dash go.) |
| Para 2 | "...techniques that fail interestingly — confocal stereo on..." | "...techniques that fail interestingly: confocal stereo on translucent gemstones, photogrammetry on reflective surfaces, segmentation models pointed at snow." Keep the rest. It is the research-loop paragraph the framing says to keep. |
| Para 3 | "...With CoFRIDA at CMU's Robotics Institute, I investigated how artists might collaborate with robotic painting systems." | Keep. Add "I also helped build the camera component and showed it at IEEE RO-MAN 2024" only if you confirm (the framing doc mentions both). |
| Para 4 | "I care about the product implications hiding inside experiments..." | Keep. It is specific and reads like you. |
| Open-to-work heading | "Looking for a creative R&D team." | "Looking for a creative tools or spatial computing team." |
| Open-to-work body | "I'm interested in roles where prototyping connects research, engineering, interaction design, computer graphics, and artistic practice." (a five-item list) | "I want to be the person who prototypes an idea, tries it with artists, and works with engineers to ship it." |
| Section labels | "work experience" | Fine. |

## Part 3. Design findings (ui-ux-pro-max)

Ranked by the skill's priority order (accessibility, touch, feedback, layout, type).

| # | Sev. | Finding | Evidence | Proposed fix |
|---|---|---|---|---|
| D1 | High | **Hero loader and first seconds.** The "assembling the desk" chip sits in the middle of the screen over the headline on mobile. On desktop the loader disappeared while the scene was still mostly black (about 10s in), so the visitor sees a near-empty page with a card on it. The fallback message is just "The interactive desk could not load." | Screenshots at 1x and 390px, plus the live-site re-check (black at ~10s, complete by ~25s). | Pin the loader to a corner, not center. Hide it at 100% or on error. Make the fallback show the same tagline, work link, and contact link. Framing item 7. |
| D2 | High | **Mobile gets desktop instructions.** On a phone the footer says "Look around to highlight · click to select · Esc releases mouse", and WASD/Q/E hints. None apply to touch. The hint box also butts against the card. | `m_index` screenshot. | Hide `.desk-controls` under `(pointer: coarse)`, replace with "drag to look". |
| D3 | High | **No contact path above the fold.** Email exists only at the bottom of About. | about.html lines 76, 119. | Add "contact" to the nav on every page and a second link on the home card. |
| D4 | Med | **Nav and metadata text is 12px mono, uppercase, tracked, in low-contrast olive/gray** on a translucent gray bar. Nav links are about 12px high targets. | Computed 12px, `rgb(167,158,133)` on `rgba(88,86,80,.82)`. | Raise nav to 13-14px, increase padding so each link is at least 24px high (44px on mobile), and darken the bar or lighten the text to reach 4.5:1. |
| D5 | Med | **Work tags and eyebrows are 12px gray-on-dark.** They carry the tech stack that employers scan for. | `.work-tags` computed 12px, `#a79e85`. | 13px minimum, brighter text color. Keep uppercase for the eyebrow only. |
| D6 | Med | **Broken-looking embeds on About.** The Spotify worker `/playlist` route returns 404, so every visitor sees a white box reading "no recent tracks" on a dark page. The Instagram embed is a tall frame that looks empty (cause unconfirmed). | `about.png`, `live_about.png`, fetch of the worker URL. | Fix or redeploy the worker route (that one is yours to check in Cloudflare). On the page, give both embeds a dark empty state with a link ("open on Spotify", "@lovvipop.zip"), cap the Instagram height, and hide the Spotify block when the worker fails. |
| D7 | Med | **Work page zig-zag leaves large dead zones.** Alternating image sides plus the 5 images lazy-loading with no reserved space leaves empty columns until each image arrives. | `work.png` (rows 1, 2, 5 show blank halves). | Give `.work-media` a fixed aspect ratio so space is reserved (the skill's CLS rule), and add a dark placeholder color. |
| D8 | Med | **Work images have empty `alt=""`** although they are the only content of a link. | work.html lines 65-122. | Use the project name as alt text, or add `aria-label` to the link. |
| D9 | Low | **Page title and H1 on About repeat the name** ("about" tagline, then "Lorie Chen" as H1). | `about.png`. | Keep H1 "Lorie Chen" but fold the "about" label into the nav only, or leave as is. Optional. |
| D10 | Low | **Reduced motion** is handled in CSS at line 1176 but I did not confirm the desk camera animation respects it. | style.css; desk-scene.js unchecked. | Check `matchMedia('(prefers-reduced-motion)')` in `desk-scene.js` and skip the intro fly-in. |
| D11 | Low | `<html>` title uses an em dash ("Lorie Chen — Creative Technologist"). | index.html line 6. | Replace with "|" or ":". Cosmetic. |

## Proposed order for Stage B

1. Copy: Home hero, Work intro, outcome lines, About rewrites, open-to-work block (items 1, 4, 5 in the framing).
2. Contact link in nav and on the home card (D3).
3. Loader and fallback (D1), mobile control hints (D2).
4. Type size and contrast for nav, tags, eyebrows (D4, D5).
5. Reserved image space and alt text on Work (D7, D8), embed empty states (D6).
6. The new ComfyUI entry, once you give me a link and an image.

## Questions before I start

1. OK to add the ComfyUI entry as "06 — Creative tools" with the draft above? I need an image or link, and a yes on each claim (5+ models, CMU and RISD workshops, 20+ students).
2. Should the nav say "contact" (mailto) or "resume"? I'd add contact.
3. Do the live links on the project pages work? I didn't open them.

## Stage B status

Done: contact link in every nav; home hero copy, "See the work" and "Email me"; Work intro with the partial-views through-line; outcome lines and alt text on all projects; new entry 06 (ComfyUI nodes and workshops, linked to the four repos and three p5 sketches); About rewrites and the new open-to-work block; larger, higher-contrast nav and tag text; reserved image space on Work; loader moved to the top-right corner; richer desk fallback; mouse/keyboard hints hidden on small screens; dark empty states for Spotify and an Instagram link.

Not done / yours to check:
- Spotify: the worker code returns 404 `no_recent_tracks` when Spotify's recently-played list is empty or the token fails, so the route is not missing. I added the dark empty state rather than touching the worker. Check the worker's Spotify refresh token and play something.
- Instagram embed still renders empty in my browser, so I added a text link under it.
- Desk load time (D1 root cause) is unchanged: the desk still streams in after the loader hides.
- The "06" image tile is a text placeholder. Swap in a screenshot when you have one.
- Claims in entry 06 (5+ models, CMU and RISD workshops, 20+ students) came from the framing doc. Please confirm.
