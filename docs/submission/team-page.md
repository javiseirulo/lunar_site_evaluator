# Team page — Space Apps submission (draft, English)

> Borrador para pegar en la página de equipo de Space Apps. Todo lo que dice sale del repo (docs, código,
> `docs/validation/horizons-check.md`, `docs/04-resources-data.md`, `docs/si-usage-log.md`).
> Primera versión: **domingo 16:00**. Versión definitiva: **domingo 23:59** (hora local del evento).
> Revisad las casillas ☐ antes de publicar.

## ☐ Pendiente del equipo antes de publicar

- ☐ **Team name** (no está decidido en el repo) y **team photo** (todos mayores de 18 en la foto).
- ☐ Confirmar nombres reales y roles de la tabla de miembros.
- ☐ **Demo link**: vídeo ≤ 30 s **o** ≤ 7 diapositivas con portada (#88, Manuel). Enlace público, sin login.
- ☐ **Final project link**: https://lunar-site-evaluator.vercel.app (público). Si se enlaza el repositorio,
  hacerlo público antes (ahora es privado).
- ☐ Las capas del mapa polar 2D (`layers.json`) siguen siendo **mock**: sustituirlas por LOLA u ocultarlas antes
  de capturas y entrega, o mantener la nota de limitaciones de abajo.
- ☐ Las 48 ilustraciones de Mission son **generadas por IA**: necesitan **marca de agua visible** (regla de la SI).
- ☐ Redesplegar la web con el último `dev` justo antes de entregar (`web/README.md` § Deploy).

---

## Project name

**Lunar Site Evaluator**

## Challenge

Lunar Landing Site Navigator

## Short description (≤ 300 characters)

Lunar Site Evaluator helps mission planners, teachers and students choose where to land near the Moon's south
pole. Pick a site and a date to see when it has sunlight for power and a view of Earth to call home, and compare
sites side by side.

## Detailed description

### What does it do?

Near the lunar south pole the Sun skims the horizon, so a few kilometres or a few days can decide whether a lander
has power and can talk to Earth. Lunar Site Evaluator turns that into something anyone can explore:

- **Explore**: a 3D Moon and a polar map with 59 candidate landing sites from published studies. Set mission
  requirements (for example minimum sunlight or Earth visibility for a landing window) and the matching sites
  update live. Each site shows its sunlight, Earth visibility, longest dark period, slope and distance to
  permanently shadowed craters. *Site Check* evaluates any latitude and longitude on the Moon.
- **Mission clock**: press Play to move through 2027 hour by hour and watch when each site gets sunlight and
  when Earth rises and sets, with countdowns to the next sunset and Earthset.
- **Compare**: put two or three sites side by side, with the best value in each row marked and their sunlight and
  Earth-visibility windows lined up on one timeline. Built for the "mission slips" scenario in the challenge.
- **Street View**: stand on a site and see the terrain, the Sun and Earth in the sky at the chosen time.
- **Mission**: a game where a landing site falls through and players choose a new one; the result is explained
  (for example "no view of Earth" or "ran out of sunlight").
- **Past landings**: 25 historic landings on the globe, for context.
- **Pro mode**: plain language by default for students and the public; Pro mode adds technical names,
  UTC times, coordinates and fine map controls for planners.

### How does it work?

Everything heavy is computed offline in Python and published as static files that the website reads:

1. **Ephemerides**: Sun and Earth directions for every hour of 2027 in the Moon's mean-Earth frame, computed with
   NASA/NAIF SPICE (DE440 planetary ephemeris and the lunar orientation kernels), including libration.
2. **Validation**: azimuth and elevation were checked against **JPL Horizons** for seven sites (polar sites,
   Apollo 11, Chang'e 4). Maximum difference: **0.0007°**, well inside our 0.01° target
   (`docs/validation/horizons-check.md`).
3. **Terrain**: NASA LOLA digital elevation models (south and north polar products from NASA PGDA, and the
   global LDEM_64) give relief, slopes, permanently shadowed regions and local horizons for the 3D views.
4. **Scoring**: each site gets sunlight %, Earth-visibility %, longest night and other metrics over the chosen
   window, and a weighted score. The same scoring runs in the browser, so requirements filter the sites live.
5. **Web app**: React and TypeScript, with three.js for the 3D globe and CesiumJS for Street View.

**Current limitations** (stated plainly): site sunlight and Earth-visibility figures currently use a smooth
horizon with a small antenna margin; terrain-aware horizons are computed for polar sites in the 3D views but are
not yet folded into every score. Some map overlays are placeholders while the LOLA-derived layers are finished.

### What benefits does it have?

- **Fast re-planning**: when a launch slips, planners can check alternative sites and dates in minutes instead of
  setting up specialist tools.
- **One place for the two questions that decide south-pole missions**: power (sunlight) and communications
  (Earth in view), over time, not just as yearly averages.
- **Accessible**: plain language and a game for students and teachers; full detail for experts in Pro mode.
- **Transparent**: every site lists its source, every calculation is reproducible from open NASA data, and our
  ephemerides are validated against JPL Horizons.

### What do we hope to achieve?

A tool that makes the trade-offs of landing at the lunar south pole understandable to anyone, from a mission
planner checking a backup site to a 15-year-old learning why a few kilometres matter. Next steps: terrain-aware
horizons in every score, more years and sites, and real LOLA overlays on every map layer.

### What tools, languages, hardware or software did we use?

- **Languages**: TypeScript, Python, HTML/CSS.
- **Web**: React 19, Vite, Tailwind CSS, Zustand, React Router, three.js with React Three Fiber and drei,
  CesiumJS, Motion, Lucide icons.
- **Science and data**: SpiceyPy (NASA/NAIF SPICE), NumPy, the JPL Horizons API, PyYAML, jsonschema.
- **Quality**: Vitest, pytest, ESLint, Prettier, Ruff, GitHub Actions.
- **Hosting and tooling**: Vercel, GitHub, pnpm, uv.
- **Hardware**: personal laptops only.

---

## Team members

| Member | Role |
|---|---|
| Javi (@javiseirulo) | Ephemerides and scoring pipeline, site catalogue, Horizons validation |
| Marta (@martaplatero2002-star) | 3D globe, Explore and mission requirements, past landings |
| Pablo (@pabloizgui) | LOLA terrain, Street View, Mission artwork |
| Manuel (@Manuelcgg165) | Mission game, presentation |
| Javier (@javocruz) | Web platform, design, deployment |

## Links

- **Demo**: ☐ (video ≤ 30 s or ≤ 7 slides, public link)
- **Final project**: https://lunar-site-evaluator.vercel.app

---

## Use of data and resources

### NASA data and resources (required for Global Award eligibility)

- **NASA/NAIF SPICE** generic kernels: DE440 ephemeris, lunar PA/ME orientation and frame kernels, leap seconds.
- **JPL Horizons API**: independent validation of Sun and Earth azimuth and elevation.
- **NASA PGDA product 90** (lunar south pole topography and illumination, LOLA): polar DEM, slopes and
  permanently shadowed region mask.
- **NASA PGDA product 98** (lunar north pole topography and illumination, LOLA).
- **LRO LOLA GDR LDEM_64** (PDS Geosciences Node): global elevation for Street View.
- **NASA Scientific Visualization Studio, CGI Moon Kit** (LROC WAC colour with LOLA-filled poles): globe texture.
- **NASA NSSDCA**, "Anthropogenic Impacts and Spacecraft on the Moon": coordinates and dates of past landings.

### Other data, code and references

- Site catalogue: Wueller et al. 2026, *JGR Planets* 131(3), e2025JE009434; De Rosa et al. 2012,
  *Planetary and Space Science* 74, 224–246 (and the sources listed in `python/export/catalog.yaml`).
- IAU/USGS Gazetteer of Planetary Nomenclature (feature names in Street View).
- Meeus, J. (1998), *Astronomical Algorithms*, 2nd ed. (Earth–Moon distance for transfer times).
- Colour palette inspired by the NASA Graphics Standards Manual (1976); colours only, no NASA insignia or logotype.
- Open-source libraries listed above under their licences, including Nayuki's QR Code generator (MIT).

No copyrighted material is used without permission. The app is an independent project, not affiliated with or
endorsed by NASA.

## Use of Super Intelligence (AI)

The project idea, scope and product decisions came from the team. AI tools assisted with building it:

- **Claude Code (Anthropic: Opus 5.5, Sonnet 5.5, Fable 5.2)**: code in `web/`, `contracts/` and `python/`
  (ephemeris export, scoring, 3D globe, Explore, web platform and design), research and drafting of
  documentation, and help researching the site catalogue and historic-landing coordinates (checked against the
  cited sources).
- **OpenAI Codex**: terrain processing and Street View code, and the 48 Mission illustrations
  (AI-generated images; ☐ add a visible watermark before submitting, as the rules require).
- **Cursor (Grok 4.7)**: part of the website's visual redesign.
- **Google Gemini**: design mock-ups used only as internal references (not included in the app or the submission).
- **Firecrawl**: web research for the challenge rules and resources.

All scientific values come from NASA data and the cited publications, computed by our own code; AI was not used to
invent data. The full log is in `docs/si-usage-log.md`.
