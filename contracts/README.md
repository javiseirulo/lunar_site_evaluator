# contracts — data shared between the pipeline and the web app

- [`types.ts`](types.ts): TypeScript types, the source of truth (imported by the web app as `@lunar/contracts`).
- `*.schema.json`: JSON Schemas for the same files, for the Python side to validate against.
- [`scripts/gen-mocks.mjs`](scripts/gen-mocks.mjs): writes **mock** files into `web/public/data/` (`pnpm mocks`).

| File in `web/public/data/` | Type | Written by |
|---|---|---|
| `manifest.json` | `DataManifest` | pipeline export |
| `sites.json` | `SitesFile` | Javi (scoring) |
| `timeseries/<site_id>.json` | `Timeseries` | Javi (ephemerides) |
| `layers.json` + `layers/*.png` | `LayersManifest` | Pablo / Javi (terrain, illumination) |

Rules:

1. Changes go through a PR to `contracts/` and the whole team is told.
2. The real pipeline writes the same files with `"mock": false`. The app shows a "Mock data" badge while any file is mock.
3. `pnpm test` (in `web/`) checks whatever is in `public/data` against the contract: equal-length arrays, ids, existing PNGs, and that each site's `illum_pct` / `earth_vis_pct` / `max_dark_hours` agree with its own timeseries.
4. Site metrics are measured over the manifest's time window, the same window as the timeseries files, so the detail card, the time bar and the game always agree.

Mock data is invented (synthetic terrain, approximate feature coordinates, toy Sun/Earth geometry) and must not be presented as results.
