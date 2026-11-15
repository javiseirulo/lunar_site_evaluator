# web — Lunar Site Evaluator front end

Vite 6 · React 19 · TypeScript · Tailwind 4 · zustand 5 · React Router 7 · three.js / R3F (for the 3D modes).

## Run it

```bash
pnpm install          # from the repo root; pnpm fetches Node 22 itself (see /.npmrc)
pnpm dev              # http://localhost:5173
pnpm test             # unit tests + contract check of public/data
pnpm lint && pnpm typecheck && pnpm build
pnpm mocks            # regenerate mock data in public/data (repo root)
```

## Who owns what

| Folder | Owner | What |
|---|---|---|
| `src/core/` | Javi2 | Store, data loading, router, shell (top bar, time bar), helpers |
| `src/layers/` | Javi2 | Layer panel, legends, 2D polar map |
| `src/pages/` | Javi2 | Route pages that compose the modules |
| `src/globe/` | Marta | 3D globe, filters, site list/detail (`SiteList` is a starter to replace) |
| `src/streetview/` | Pablo | Cesium Moon viewer, real SPICE sky, shared UTC clock and reproducible view links/QR |
| `src/game/` | Cristóbal | Playable Mission module |
| `src/scoring/` | Javi | Mission config defaults, arrival model (`computeArrival`), window evaluation, validity and score. Import from `@/scoring` |
| `public/data/` | Javi / Pablo (pipeline) | Generated ephemerides, catalogue, series and terrain products; inspect each file's `mock` flag |

Only touch another person's folder through a PR they review.

## How modules talk: only through the store

```ts
import { useAppStore, useData, useTimeseries, sampleAt } from '@/core';

const siteId = useAppStore((s) => s.selectedSiteId);   // read
const selectSite = useAppStore((s) => s.selectSite);   // write
const setMode = useAppStore((s) => s.setMode);         // 'explore' | 'streetview' | 'game' → navigates
const time = useAppStore((s) => s.currentTimeUTC);     // ISO UTC, driven by <TimeBar />
const layers = useAppStore((s) => s.activeLayers);     // bottom → top draw order

const sites = useData((s) => s.sites);                 // sites.json (null while loading)
const ts = useTimeseries(siteId);                      // timeseries/<id>.json, cached
const sky = ts && sampleAt(ts, time);                  // { sun_az, sun_el, earth_az, earth_el, lit, ... }
```

Useful helpers in `@/core`: `loadLayerTexture(layerDef)` (colorized canvas → `THREE.CanvasTexture`),
`latLonToUv` / `projectSouthPolar` (pins), `hoursUntilChange` (time to sunset/Earthset), `formatUtc`, `pct`.

Data types live in [`../contracts/types.ts`](../contracts/types.ts). Change them only via a PR to `contracts/`.

## Look and feel (design system)

"2000s science portal": fixed ~1000 px centred column, navy starfield, glossy blue panel title bars, uppercase tabs,
square corners, 1px bevelled borders, system Verdana/Trebuchet. Build panels with the classes in `src/index.css`:

```tsx
<section className="box">
  <div className="box-head">Panel Title</div>
  <div className="box-body">… <button className="btn">Go</button> <a className="lnk more">Read more</a></div>
</section>
```

Also `.box-head-dark`, `.btn-go` (orange call to action), `.field` (inputs/selects), `.chip`, `.label`, `.rows` (dotted
separators), `.range`. Colours: `text-sun`, `text-earth`, `text-psr`, `bg-navy-*`, `border-edge`, `text-ink(-muted|-faint)`.
Avoid rounded corners, blur and soft shadows. No agency logos or insignia.

## Deploy

**Live:** https://lunar-site-evaluator.vercel.app (public, no login). Vercel project `lunar-site-evaluator`
on @javocruz's account. The static build in `web/dist` is uploaded as-is (the app imports `contracts/`, so
Vercel can't build `web/` on its own); `vercel.json` rewrites client routes to `index.html`.

Redeploy (needs Node 22 and `vercel login`; from the repo root, on the commit you want live):

```bash
cd web && pnpm build && cp vercel.json dist/ && cd dist
npx vercel@latest link --yes --project lunar-site-evaluator
rm -f .env.local .gitignore   # link writes a token here: never publish it
npx vercel@latest deploy --prod --yes
```

If `vercel login` or deploy hangs with "couldn't reach api.vercel.com", a VPN (e.g. Cloudflare WARP) is
blocking Vercel's API: switch it off while deploying. Check after deploying: `/`, `/explore`, `/data/manifest.json`
must return 200 without login.

## Lunar Street View

Open `/streetview/shackleton_rim_01`; choose any of the 59 sourced sites, or use
View options → Go anywhere on the Moon. Drag with the left button/one finger,
scroll/pinch to zoom, click/tap nearby ground to walk at most 200 m. The options
include eye height, artificial relief light, names and an expanded mobile view.

The UTC clock uses the same core time and real `@/ephem` vectors from 2026 through
2055-12-31 23:00 UTC. A late manifest load preserves deliberate clock choices.
Only a matching 5 m terrain profile is used; free points and changed heights
show a labelled geometric horizon. Share view / QR freezes location, time and
camera; Capture current view updates it. Links never include Cesium credentials.

The public development read key is included in `src/streetview/cesiumAccess.ts`
at Pablo's explicit request: teammates need no individual ion account or manual
key entry. It is restricted to Moon 2684829 and localhost/127.0.0.1:5173.
`VITE_CESIUM_ION_TOKEN` overrides it for another allowed deployment origin.
Private credentials must remain outside Git. A localhost QR is not reachable
from another phone; classroom sharing needs a reachable, permitted origin.

In `/explore?view=3d`, drag the astronaut onto the Moon (or activate it and select
a point). Street View reuses Marta's globe flight and the existing route. Right-click/double tap saves
named locations in the globe's existing local pin format; Face Sun/Earth and
Back to 3D map are available inside the viewport. Cesium/data credits remain.

Data paths, numerical limits and outstanding consumer integrations:
[Pablo's handoff](../docs/team/pabloizgui/team-handoff.md) and
[current tasks](../docs/team/pabloizgui/tasks.md).
