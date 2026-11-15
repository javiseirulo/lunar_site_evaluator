# NASA Space Apps 2026 submission form: ready-to-paste draft

- Drafted 2026-11-15 by javiseirulo with Claude Code (Sonnet 5.5); declared in `docs/si-usage-log.md`.
- Based on `origin/dev` at `0275fad`. Every claim below comes from the repo docs, data files or code. Anything unknown is a `TODO(<who>)`.
- Deadline: 15 Nov 2026, 23:59 (local event time). You can re-submit; only the last version counts.
- Paste the text inside each "PASTE" block. Notes outside the blocks are for the team.

---

## 1. Project Name

Which name is used where (checked in the repo):

| Place | Name |
|---|---|
| Browser tab title (`web/index.html`), header logo, About page, `DESIGN.md`, repo, Vercel project | **Lunar Site Evaluator** |
| Intro page `/` (`web/src/intro/IntroPage.tsx`, constant `BRAND`): hero wordmark and quote caption "The Dark Side Landing team" | **Dark Side Landing** |
| Demo video package (`docs/team/javiseirulo/demo-video/`) | **Moonfall** (the README says "the web has not been renamed yet; decide as a team") |
| Challenge title (not our name) | Lunar Landing Site Navigator |

`docs/decisions/log.md` has no entry that fixes a public name.

Recommendation (TODO(team) decide before submitting): use **Lunar Site Evaluator**. It is the name on the tab, the header, the URL and the repo, so a judge who opens the link sees the same name as the form. If the team prefers Dark Side Landing or Moonfall, the intro `BRAND` constant and the video's two mentions (closing card and last voice line) must change to match. Three names in one submission is the main thing to avoid.

PASTE:

```
Lunar Site Evaluator
```

---

## 2. High-Level Project Summary

PASTE (about 130 words):

```
Lunar Site Evaluator is a web app that answers one question for the lunar south pole: if we land here, on this date, will we have sunlight for power and a line of sight to Earth? It answers the Lunar Landing Site Navigator challenge. We calculated the Sun and Earth positions seen from 59 landing sites with NASA SPICE (DE440), checked them against JPL Horizons, and built local horizons from NASA LOLA terrain for 41 polar sites. In the browser you pick a site or any coordinates, choose a landing date, and press Simulate to see a verdict and a score out of 100. A Normal mode explains results in plain words; an Expert mode shows the numbers. It matters because when a launch slips, planners must find a backup site or date quickly.
```

---

## 3. Link to Project Demo

Required: video of at most 30 s, or at most 7 slides (cover included). Going over the limit makes the project ineligible. Public link, no login, tested in a private window.

What exists in the repo (`docs/team/javiseirulo/demo-video/`):

- `README.md`, `script.md`, `capture-list.md`, `production-principles.md`: direction and script for a 30 s video called "Moonfall" (target 29.5 s, hard limit 29.9 s, English, 16:9).
- `higgsfield-prompts.md`: prompts for three short classroom clips to generate with Higgsfield.
- `vo/Charon_fast.wav`, `vo/vo_lines.json`, `vo/voices.py`: synthetic narration (Gemini TTS, voice Charon), 27.0 s.
- `skills/`: copies of the skills used to plan the video.
- Not in the repo: the finished video file, any YouTube/Drive link, any slide deck (no `demo-deck` folder exists).

PASTE:

```
TODO(javiseirulo / whoever edits the video): <public YouTube or Drive link to the 30 s demo>
```

Do not submit until the link works in a private window. The README states the app capture step and the three Higgsfield clips were still pending when written.

---

## 4. Link to Final Project

- Web app: https://lunar-site-evaluator.vercel.app
- Repository: https://github.com/javiseirulo/lunar_site_evaluator

The repository visibility was queried with `gh repo view` and returned **PUBLIC** (verify again at the end). The repo has no `LICENSE` file; see gaps.

PASTE:

```
Live web app: https://lunar-site-evaluator.vercel.app
Source code: https://github.com/javiseirulo/lunar_site_evaluator
```

Checklist (all TODO(team)):
- [ ] Repo is public, and the branch judges see (`main`) contains the final code. `dev` is the integration branch; the last `dev` -> `main` PR must be merged before the deadline.
- [ ] The Vercel URL opens in a private window with no login, and Street View works there (Street View needs the Cesium ion token in the deploy; `docs/10-plan-tecnico.md` §0 noted it was missing at one point).
- [ ] FortiGuard rating requested for the web URL: https://www.fortiguard.com/faq/wfratingsubmit

---

## 5. Detailed Project Description

PASTE:

```
WHAT IT DOES
Lunar Site Evaluator lets mission planners, teachers and curious people compare lunar landing sites and dates by the two things that decide a south-pole mission: sunlight (power and heat) and a direct line of sight to Earth. Near the pole the Sun and Earth stay close to the horizon, so a ridge a few kilometres away can hide them for days. There is no atmosphere, so the horizon is just terrain plus the curve of the Moon.

The app has one switch, Normal | Expert.
- Explore: a 3D Moon with the 59 catalogue sites (38 south pole, 3 north pole, 16 near side, 2 far side). You set what the mission needs and the matching sites update. You can also pin any latitude/longitude, switch on 32 past landings, and choose a landing date from 2026 to 2055 or a date of a past mission (years 1966-1973, 1976, 2013, 2019, 2020, 2023, 2024, 2025). Press Simulate to run the Mission Clock hour by hour and see a live sunlight chart.
- Site check: for the selected site or point, a verdict (VALID / NOT VALID) and a score out of 100, with the requirements in plain language and an "i" button that explains why. Normal shows a neutral site list and results only after you pick one; Expert adds scores in the list, a requirements form, map layers, UTC times and Compare / All sites / Method pages.
- Layers on the globe and polar terrain patch: elevation, slope, permanently shadowed regions, average illumination, Earth visibility, day/night.
- Street View: stand on a site and look around, with the Sun and Earth where they really are at the chosen time.
- Compare: three sites side by side with sunlight and Earth-visibility timelines.
- Mission: a game. Your landing site falls through and you pick another from a short list, then the simulated days show whether you chose well and why. Play the south pole or real historic landings. A "Try with class" mode lets a teacher run it for a class on their phones (QR code join).
- Learn: a plain-language explainer and glossary.

HOW IT WORKS
1. Ephemerides: Python (SpiceyPy) computes Sun and Earth vectors seen from each site with NASA NAIF SPICE kernels (DE440s, lunar PA/ME frames), including libration, for every hour of each year 2026-2055 and the past-mission years. They are stored as compact binary files.
2. Validation: we compared our azimuth/elevation with JPL Horizons at seven places (including Apollo 11 and Chang'e 4). The largest difference was 0.00068 degrees (target: below 0.01). Details: docs/validation/horizons-check.md.
3. Terrain: NASA LOLA topography (south and north pole DEMs, 80 m, plus a 240 m DEM for distant relief) gives slopes, permanently shadowed regions and, for 41 polar sites, a local horizon profile in every direction (observer 5 m above ground, 310 km range). The other 18 sites use a flat horizon, so their Sun and Earth figures are a best case; the app says so.
4. Scoring: for a landing window we measure the fraction of time with sunlight and Earth in view, the longest dark stretch, slope and distance to shadowed craters, then combine them into a score. The same scoring code exists in Python (for the data export) and TypeScript (in the browser, tested for parity), so filters answer instantly. There is no backend for the calculations.
5. Site catalogue: 59 sites with coordinates taken from published studies and mission pages, each with a cited source.

BENEFITS AND GOAL
When a mission slips, a planner can check other sites or dates in minutes instead of days. Teachers and students get the same numbers in plain language and a game that shows why a few kilometres of ground matter. Anyone can open the 3D Moon and watch the light move.

LIMITS (stated in the app)
Terrain horizons cover 41 polar sites; 18 sites use a flat horizon. Some sites show "pending" for distance to shadowed craters. The score is a first look, not flight-grade mission analysis. Street View's visual terrain is Cesium Moon; the scientific values come from NASA LOLA.

TOOLS AND LANGUAGES
Web: TypeScript, React 19, Vite, Tailwind CSS 4, React Router, zustand, three.js with react-three-fiber/drei, CesiumJS (Street View), motion, Firebase Realtime Database (class mode only), Vitest tests, hosted on Vercel.
Data pipeline: Python with SpiceyPy (NASA SPICE), rasterio/GDAL/NumPy for LOLA GeoTIFFs, pytest; JSON Schemas and TypeScript types in a shared contracts package; GitHub Actions CI.
```

Facts checked: 59 sites by region in `web/public/data/sites.json`; 32 historic sites in `historic_sites.json`; 41 files in `web/public/data/horizon/`; ephemeris files for 2026-2055 plus 1966-73, 1976, 2013, 2019, 2020, 2023-2025 in `web/public/data/ephem/` (hourly, `step_s` 3600); layers in `layers.json`: elevation, slope, psr, illumination, earth_vis (`mock:false`); Horizons max difference 6.8e-04 deg from `docs/validation/horizons-check.md`; 5 m observer and 2 degree antenna margin from `manifest.json`.

Team notes:
- Full-year, per-site, scored series (`timeseries`) exist for 2027 only; other years are computed in the browser from the ephemeris files. The intro page (`web/src/intro/content.ts`, "8,760 hourly ... covering all of 2027") still describes 2027 only. Consider a one-line update (TODO(javocruz)).
- The date selector validates years against the ephemeris index; 1985 is rejected (si-usage-log row for #154).
- Past-mission years in `ephem/` end at 2025 (2025.bin present), not 2024, even though the video/rules list says 2024; the text above includes 2025.

---

## 6. Use of Super Intelligence (SI)

Judges do not see this answer, but they see the indicators inside the project. The rule: the idea must be human, images/video need a visible watermark, audio/code/data are acknowledged in text and metadata, no NASA branding in generated content.

PASTE:

```
We used AI tools to speed up building and documenting the project. The idea and the choices were ours: the concept (one calculation pipeline used two ways: Explore, from requirements to sites; and Mission, a game from site to result) came from a spoken brainstorm by the team on 14 Nov 2026 (docs/ideas/javiseirulo-explore-mission.md). The scoring model, parameters, game mechanics, design direction and task split were decided by team members; AI did not invent how to solve the challenge.

Code (largest use). Claude Code (Anthropic; models named in our log: Opus 5.5, Sonnet 5.5 and Haiku 5.5, plus the log's generic "Claude") wrote or helped write much of the TypeScript/React web app, the Python data export (SPICE ephemerides, scoring port, grids, layers, historic landings), the data contracts and CI, the globe and Explore features, the Site check panel, the date selector, the class mode and tests. OpenAI Codex wrote the Street View engine, the terrain and horizon tools (LOLA processing, horizon profiles, PSR masks) and their tests. Cursor (Grok 4.7) did visual and layout changes (night-plate redesign, headers, Compare, Explore panels). Each person reviewed and tested the output; the full per-change log (who, which tool, what, where it appears) is docs/si-usage-log.md in the repository.

Data. The NASA numbers are computed from NASA kernels and DEMs by our code, not generated by AI. The site catalogue (59 sites) and historic landings (32 missions) were researched with AI search help; coordinates were then checked by team members against the cited sources (random spot checks for the catalogue; NSSDCA and LROC for historic sites). Context notes on historic sites were drafted by AI.

Documentation and text. Claude Code helped research the rules and resources, structure the design and technical docs, and draft and fact-check the intro and Learn text against our data.

Images and 3D. 48 Mission illustrations (characters, sites, lander, emergencies, verdicts, UI) were generated with Codex image generation from a prompt document written by a teammate; the files are in web/public/game/. One astronaut image (the draggable Street View astronaut) was generated with ChatGPT/OpenAI image generation and carries a visible AI mark. The past-landings lander 3D model (past_landing_lander.glb) was generated with Claude and is labelled "Lander icon: AI-assisted 3D model" in the app. The landing-page mist is a script-made texture, not AI. Photos in the app (Moon, south pole) are NASA public-domain images, not AI. No generated image shows NASA logos, flags or mission patches.

Audio and video. The demo narration is synthetic speech (Gemini text-to-speech). Three short classroom clips for the demo were planned with Higgsfield; any clip generated carries a visible "Generated with AI" label and shows no people under 18. [TODO(javiseirulo): confirm whether any Higgsfield clip and the Gemini voice are in the final video; delete this paragraph's unused parts.]
```

Where AI use is indicated inside the project (verified in `web/src`, `web/public`, repo):

- About / Method page, section "Use of AI" (`web/src/pages/AboutPage.tsx`): says the idea comes from the team and that AI coding assistants helped write code and documentation; points to `docs/si-usage-log.md`. It does not mention generated images, the 3D model, voice or Codex/Grok.
- Past landings legend: "Lander icon: AI-assisted 3D model" (`web/src/globe/HistoricControls.tsx`).
- Code comments "AI-assisted: OpenAI Codex" in `web/src/streetview/` (navigation.ts, geometry.ts, lunarScene.ts).
- `web/public/streetview/assets.json`: astronaut `ai_generated: true`, `visible_ai_mark: true`, `agency_branding: false`.
- `docs/si-usage-log.md` (public in the repo) with one row per AI-assisted change.
- Intro page footer states "independent project ... not affiliated with or endorsed by NASA" (`web/src/intro/content.ts`).

Gaps to flag (TODO):
- TODO(Pablo / javocruz): no visible AI notice was found in `web/src` for the 48 Mission images (`web/public/game/`); the si-usage-log says "declaracion visible pendiente al integrarlas" and the `game/README.md` does not mark them as AI. Add a visible mark or a caption in the Mission UI and update the About "Use of AI" section.
- TODO(team): extend the About "Use of AI" text to cover images, the 3D model, Codex/Cursor, and the synthetic voice, so the in-project indicator matches this form.
- TODO(Pablo): the 48 images' tool is recorded as "Codex" in one log row and "pending confirmation" in another; confirm the exact tool for the form text above.
- TODO(javiseirulo): the demo video's AI items (Gemini voice, Higgsfield clips, "Generated with AI" label) depend on the final edit; the demo README says the voice also must be declared in `si-usage-log.md` "by the team in person" and no such row exists yet.

---

## 7. NASA Data

PASTE:

```
All of these are used by the app or by the pipeline that produced its data.

1. NASA/NAIF SPICE generic kernels (JPL): naif0012.tls (leap seconds), pck00011.tpc, de440s.bsp (planetary ephemeris DE440), moon_pa_de440_200625.bpc and moon_de440_250416.tf (lunar orientation and Mean-Earth frame). https://naif.jpl.nasa.gov/pub/naif/generic_kernels/ . Used with SpiceyPy to compute Sun and Earth vectors from each site (light-time and stellar aberration corrected, libration included), hourly, for 2026-2055 and past-mission years; frame MOON_ME_DE440_ME421.
2. JPL Horizons API: https://ssd-api.jpl.nasa.gov/doc/horizons.html . Independent check of our Sun/Earth azimuth and elevation at 7 sites and 6 epochs (max difference 0.00068 deg). Reference responses stored in python/ephem/horizons_reference.json.
3. LRO LOLA south pole products, NASA PGDA product 90 (Barker et al. 2023, Planetary Science Journal, https://doi.org/10.3847/PSJ/acf3e1; data DOI https://doi.org/10.60903/gsfcpgda-lola-spole): LDEM_80S_80MPP_ADJ (height, 80 m/pixel), LDSM_80S_80MPP_ADJ (slope, 80 m/pixel), LDEM_60S_240MPP_ADJ (240 m, distant relief), LPSR_80S_20MPP_ADJ (permanently shadowed region mask, 20 m). https://pgda.gsfc.nasa.gov/products/90 . Used for terrain, slopes, PSR, horizon profiles of 41 polar sites, the 3D polar terrain patch and the elevation/slope/PSR layers.
4. LRO LOLA north pole products, NASA PGDA product 98: LDEM_80N_80MPP_ADJ, LDEM_60N_240MPP_ADJ, LDSM_80N_80MPP_ADJ, LPSR_80N_20MPP_ADJ. https://pgda.gsfc.nasa.gov/products/98 . Used for the 3 north-pole sites.
5. LRO LOLA global DEM LDEM_64 V3.1 (PDS Geosciences, 64 pixels/degree, about 474 m): https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/ldem_64.lbl . Used for terrain away from the poles in Street View.
6. LOLA 5 m South Pole sites (Barker et al. 2021, Planetary and Space Science 203, 105119, https://doi.org/10.1016/j.pss.2020.105119; PGDA products 78 and 81): cited as the source and method reference for the polar DEM approach. [TODO(Pablo): the 5 m GeoTIFF download was "in progress, not validated" in docs/04; confirm whether any 5 m data is in the final data, otherwise move this to references only.]
7. NASA SVS CGI Moon Kit (LROC WAC color with LOLA-filled poles, lroc_color_poles_4k): https://svs.gsfc.nasa.gov/4720 . Moon surface texture on the globe, Compare page and the intro page (reduced to 2K/1K copies).
8. NASA NSSDCA, "Anthropogenic Impacts and Spacecraft on the Moon" and Lunar Sites: https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html and https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html . Dates and coordinates of the 32 past landings and some catalogue sites.
9. LROC (Arizona State University / NASA) featured images, e.g. https://lroc.im-ldi.com/images/938 (Wagner et al. 2017): coordinates of Apollo and other landers; LROC images also used as public-domain figures.
10. NASA public-domain figures (NASA/GSFC/Arizona State University/SVS) in web/public/figures/ (south pole illumination, LOLA height maps, Shackleton, Earth from Shackleton).
11. NASA NTRS documents for Mission thresholds: NTRS 20220008301 (VIPER planning), NTRS 20250009323 (Artemis overview), NTRS 20240009596 (HLS update 2024); Williams et al. 2017, Icarus 283 (Diviner temperatures). [TODO(Manuel): docs/04 marks these as "taken from summaries, verify at the source".]
12. NASA Apollo site sources: "50 Years Ago: Lunar Landing Sites Selected" (nasa.gov) and NASA SP-4214 chapter 12 for candidate Apollo sites.
Also consulted as references (not downloaded as data): Quickmap (LROC/ASU) https://quickmap.lroc.asu.edu/ , Moon Trek https://trek.nasa.gov/moon/ (WMTS API checked), LPI Lunar South Pole Atlas, PGDA 69 (average Sun/Earth visibility maps) as a sanity check.
```

Notes:
- Items 1-5, 7 and 8 are confirmed in `docs/04` and in `python/export/` or `web/public`. The exact Moon Trek/Quickmap/PGDA 69 role should be checked: docs/04 lists them as candidates; `AboutPage.tsx` says PGDA 69 is used only as a sanity check. TODO(javiseirulo) confirm that check was actually run, or drop PGDA 69 from the form.
- Item 3 file names and hashes: `config/terrain-sources.json`, `terrain/catalog.json`.

---

## 8. Space Agency Partner Data and Other References

No partner-agency datasets (CSA, ESA, JAXA, ISRO, etc.) were used as data. The CSA, JAXA, ISRO pages appear in docs/04 only as ideas to search. The catalogue includes missions from other agencies (Chang'e 4, Chandrayaan-2/3, Luna 25, SLIM, Beresheet, HAKUTO-R), with coordinates from NASA NSSDCA/LROC and the papers below. TODO(team): do not claim partner data unless someone confirms it.

PASTE (full list):

```
SCIENTIFIC LITERATURE AND CATALOGUE SOURCES (coordinates, methods)
- Barker et al. 2021, Planetary and Space Science 203, 105119: https://doi.org/10.1016/j.pss.2020.105119
- Barker et al. 2023, Planetary Science Journal (LOLA polar products): https://doi.org/10.3847/PSJ/acf3e1
- Wueller et al. 2026, JGR Planets 131(3) e2025JE009434: https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2025JE009434
- De Rosa et al. 2012, Planetary and Space Science 74:224-246: https://arxiv.org/abs/1208.5587
- Flahaut et al. 2020, Planetary and Space Science 180:104750: https://hal.science/hal-02345336
- Glaeser et al. 2018, Planetary and Space Science 162:170-178: https://ntrs.nasa.gov/citations/20170007365
- Wagner et al. 2017, Icarus 283:92-103 and LROC table: https://lroc.im-ldi.com/images/938
- LROC featured images 1087, 1101, 1131, 1172, 1302, 1311, 1314, 1358, 1360, 1374, 1407, 1408: https://lroc.im-ldi.com/images/<n>
- Meeus, J. 1998, Astronomical Algorithms, 2nd ed., ch. 47 (Earth-Moon distance series; used in web/src/scoring/arrival.ts)
- Park et al. 2021 (lunar ME/PA frame alignment used in the NAIF frame kernel; see docs/validation/horizons-check.md)
- Williams et al. 2017, Icarus 283, 300-325, https://doi.org/10.1016/j.icarus.2016.08.012 (Mission thresholds)
- Landing-site coordinates also from NSSDC lunar_sites, Global Security (Luna 25), Space.com (Chandrayaan-2 reserve site), Siddiqi 2002/2018 and Ulivi & Harland 2004 (Luna 13, via NSSDCA)
- IAU/USGS Gazetteer of Planetary Nomenclature (Moon feature names, 2023 approved features, public data): https://planetarynames.wr.usgs.gov/GIS_Downloads

TERRAIN AND MAP VISUALS
- Cesium Moon (Cesium ion asset 2684829, 3D Tiles of LRO imagery and terrain), CesiumJS 1.145.0: https://cesium.com/platform/cesium-ion/content/cesium-moon/ . Cesium ion logo and data credit are kept visible in Street View, as required by https://cesium.com/learn/ion/content-usage-and-attribution-guide/ .

OPEN-SOURCE LIBRARIES (web, npm)
- MIT: react, react-dom, react-router, zustand, three, @react-three/fiber, @react-three/drei, motion, clsx, tailwind-merge, tailwindcss, vite, typescript, vitest, eslint, firebase (Apache-2.0)
- ISC: lucide-react, qrcode.react
- Apache-2.0: CesiumJS (cesium 1.145.0), firebase
- SIL OFL 1.1: Inter (@fontsource-variable/inter) and DM Mono (@fontsource/dm-mono), used on the intro page
- MIT: Nayuki QR Code generator library (web/public/vendor/qrcodegen.js), https://www.nayuki.io/page/qr-code-generator-library
OPEN-SOURCE LIBRARIES (Python data pipeline)
- SpiceyPy (MIT, NASA SPICE wrapper): https://github.com/AndrewAnnex/SpiceyPy
- rasterio 1.4.4 (BSD), GDAL (MIT/X), NumPy (BSD), pytest, PyYAML (MIT)
Exact versions: pnpm-lock.yaml and python/uv.lock in the repository.

SERVICES
- Vercel (hosting); Firebase Realtime Database (class mode only: nickname and answers, no accounts)
- Cesium ion (public read-only token restricted to the Moon asset)

IMAGES, MODELS, AUDIO
- Moon texture: NASA SVS CGI Moon Kit, https://svs.gsfc.nasa.gov/4720 (NASA media, no logos)
- NASA/LROC/SVS public-domain figures in web/public/figures/ (credits in the app)
- Lander icon 3D model (past_landing_lander.glb): generated with Claude (Anthropic) and supplied by a teammate; no third-party textures
- 48 Mission illustrations (web/public/game/): AI-generated by Pablo with OpenAI Codex image generation from a team prompt document
- Astronaut illustration (web/public/streetview/astronaut-ai.png): AI-generated with ChatGPT/OpenAI image generation, visible AI mark
- Favicon / header astronaut: image supplied by a teammate (not generated in the logged session)
- Landing mist: generated by our own script (web/scripts/gen-landing-mist.mjs)
- Synthetic narration (demo video): Gemini TTS, voice Charon
- Design reference: NASA Graphics Standards Manual (1976, NHB 1430.2), colours only, no marks: https://www.nasa.gov/wp-content/uploads/2015/01/nasa_graphics_manual_nhb_1430-2_jan_1976.pdf
```

### Gaps to fix before submitting

Source or licence missing or doubtful in `docs/04-resources-data.md` or the code:

- [ ] TODO(javiseirulo): the repo has no `LICENSE` file. Add one (or state "all rights reserved / hackathon submission") so reuse of our code is clear.
- [ ] TODO(javocruz): `docs/04` says Inter/DM Mono were added for the intro; also check that `@fontsource-variable/inter` is the only Inter package (the register mentions `@fontsource`). `package.json` confirms both are dependencies; versions are in the lock file only.
- [ ] TODO(javocruz): the library licences above (MIT, ISC, Apache-2.0, BSD) come from the docs/04 register or common knowledge of the packages, not from running a licence check. Run `pnpm licenses list` and `uv pip show` to confirm Firebase, CesiumJS and the Python packages before pasting.
- [ ] TODO(Pablo): source, tool and licence of the 48 Mission images ("licence not inferred", "credit pending confirmation" in docs/04). Also no visible AI mark in the game UI.
- [ ] TODO(Pablo): `streetview/astronaut.png` vs `astronaut-ai.png`: confirm which file is shipped, its origin and the visible ChatGPT mark.
- [ ] TODO(Marta): the lander `.glb` has no stated licence ("no third-party licence cited") and the tool is "Claude (Anthropic)" with no model name; confirm.
- [ ] TODO(team): origin of the favicon/header astronaut image (supplied by javocruz; "not generated in this session"); state author and licence.
- [ ] TODO(javocruz): figures in `web/public/figures/` are listed as NASA/LROC/SVS public domain in the SI log, but docs/04 has no row naming each image's source URL. Add one row per figure with its NASA page.
- [ ] TODO(Pablo): Cesium ion token is committed in the repo (authorised for a public assets:read token limited to the Moon asset and local origins). Confirm it is also allowed on the Vercel origin, and mention the Cesium Community plan terms (non-commercial / educational) if asked. Do not include the token in the form.
- [ ] TODO(Manuel): thresholds for Mission (Williams 2017, VIPER, Artemis NTRS docs) are marked "verify at the source" in docs/04.
- [ ] TODO(javiseirulo): confirm PGDA 69 and Moon Trek/Quickmap actually used; otherwise remove from NASA Data.
- [ ] TODO(Pablo): 5 m LOLA (PGDA 78/81) download status; the 80 m and 20 m products are the ones confirmed in the data.
- [ ] TODO(team): Global Offers (Copilot, Azure, Google Cloud) are listed in docs/04; none is confirmed as used. If Firebase counts as a Google Cloud offer, say so; otherwise skip.

---

## Pre-submission checklist

Rules source: `docs/01-hackathon-rules.md`.

- [ ] Both checkboxes ticked: terms and conditions; "original work, all external resources listed in References".
- [ ] All required fields filled in English (fields 1-8).
- [ ] Demo: video of 30 s or less, or 7 slides or fewer (cover included). Over the limit = not eligible. Target 29.5 s, check with `ffprobe`.
- [ ] Demo and project links are public (no login, no request-access) and opened successfully in a private window.
- [ ] Video not in English has English subtitles (our video is in English with English subtitles; subtitles are mandatory when there is voice).
- [ ] No image, video, audio or likeness of anyone under 18 in the demo or submission. Check every Higgsfield clip (prompts say "university students, early 20s").
- [ ] Generated images/video carry a visible watermark; generated audio, code and data are acknowledged in the text (field 6) and metadata.
- [ ] No NASA logos, flags, mission patches or identifiers in generated content.
- [ ] At least one NASA data source used and listed (field 7): yes, SPICE, LOLA, Horizons.
- [ ] Images uploaded to the form are JPG/PNG/GIF and each at most 10 MB. Videos and documents are linked, not uploaded.
- [ ] FortiGuard rating requested for https://lunar-site-evaluator.vercel.app (https://www.fortiguard.com/faq/wfratingsubmit).
- [ ] Repo public, final code on `main`, deploy matches `main`.
- [ ] Every team member is listed in the Members tab; all registered at the same local event (Madrid, per the intro page).
- [ ] Submit with margin before 23:59 local time on 15 Nov; re-submitting is allowed.

Language risk: the intro hero quote. The task brief says the quote is in Spanish (PR #149). At `origin/dev` `0275fad` the quote in `web/src/intro/IntroPage.tsx` reads in English ("Near the pole the Sun skims the horizon..."), so it may already be fixed. TODO(javocruz): confirm on the live Vercel page that the deployed build has no Spanish text. Judging is English only; also check the Mission game text and `docs/` pages linked from the app. Separately, the intro stats (`content.ts`) still say 2027 only, while the date selector now allows 2026-2055.

Naming risk: three names (Lunar Site Evaluator, Dark Side Landing, Moonfall) appear in public materials; pick one (section 1).
