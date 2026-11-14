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
| `src/streetview/` | Pablo | Street View (placeholder) |
| `src/game/` | Cristóbal | Missions and game (placeholder) |
| `public/data/` | Javi / Pablo (pipeline) | Generated data. Mock until the pipeline writes it |

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

## Deploy

Static build in `web/dist`. `vercel.json` rewrites client routes to `index.html` (set the Vercel project root to `web/`).
