# Lunar Street View — Pablo (#46)

The renderer uses Cesium Moon, not the globe module's R3F canvas. The React
component consumes the existing selected site, time and timeseries from `@/core`.
It never writes the shared clock or changes the catalog/data contract.

## Configure access locally

Open `/streetview/shackleton_rim_01` through `pnpm dev`. In development, enter a
public application token in the access panel. It is retained only while this view
is mounted, never written to storage or logged. Alternatively set
`VITE_CESIUM_ION_TOKEN` in the ignored `web/.env.local` and restart Vite.

For the token: enable only `assets:read`, select Cesium Moon (`2684829`), restrict
URLs to the development origin(s), and keep all private scopes disabled.
For deployment use a separate read token restricted to the production origin.
Client tokens are visible to the browser; `.env` does not make a bundled token
secret. Production visitors are never asked to supply an ion account or token.
Do not give the browser private token-management or asset-write privileges.

## Engine behavior

- Cesium and its CSS are loaded on demand; assets/workers are copied by the Vite
  plugin under `cesium/`. Base URLs support Vite's configured URL prefix.
- The viewer uses `Ellipsoid.MOON` explicitly, without changing the global
  ellipsoid. Earth globe, base imagery, geocoder, atmosphere, default Sun/Moon
  and independent animation/timeline are disabled.
- The camera is placed at the sampled mesh height + 5 m (shared production default). It does not use
  mock `site.elev_m` for ground placement. If the mesh cannot be sampled,
  it reports an error instead of substituting a sphere as if it were terrain.
- Drag, touch, arrows and four buttons rotate in place. Observer height is a
  local visual setting (0.5–20 m); it does not recompute pipeline visibility.
- Sun/Earth are labeled direction markers, not photometric disks. Positions use
  local north-clockwise azimuth and geometric elevation from the site's series.
- The actual sample timestamp is shown. Out-of-range time, missing data, a
  mismatched site id and unknown Earth visibility are kept explicit.
- Mesh textures can have baked-in shadows; rendered imagery is not evidence of
  lighting at the selected time. Visibility flags are from the pipeline/fixtures.
- Loading errors are generic to avoid displaying token-bearing URLs. Retry
  recreates the scene. Loading has a 60-second timeout; unmount/site change
  cancels setup, disposes GPU resources, listeners and ResizeObserver.

All current sky/site fixtures are synthetic and labeled MOCK. A real ion token
and independent frame/height validation are still required before claiming the
first real terrain scene or scientific agreement with the DEM. Stellar catalogs,
constellation geometry, physically sized/phased bodies and arbitrary-coordinate
ephemerides are later work, not implemented here.

## Dependency compatibility

Cesium 1.145.0 declares `@cesium/engine ^26.3.0` and `@cesium/widgets ^16.2.0`.
The newer resolved engine 26.5.0 removed exports still requested by that aggregator
and failed the production build. These internal packages are pinned to 26.3.0 /
16.2.0 in the lockfile. Identical override settings exist in root package.json
(team pnpm 9) and pnpm-workspace.yaml (host pnpm 11).

No common framework versions were changed. Local install-only release-age
exceptions for three pre-existing versions were explicitly authorized by Pablo;
they are not included in the publishable configuration. Dependency lifecycle
scripts were not enabled; installation completed with `--ignore-scripts`.

## Verification

`pnpm --filter web typecheck`, `test`, `lint`, `build`. Geometry tests cover lunar
ENU directions including the pole, unit vectors/elevation, observer identity,
sampling boundaries and camera angle limits. Browser verification without a token
covers local access setup, mock labels, shared time updates and mobile layout.
It does not establish real Cesium Moon rendering, touch camera motion, surface
height calibration or terrain/DEM agreement; those require the real-asset run.

Sources: [Cesium Moon](https://cesium.com/platform/cesium-ion/content/cesium-moon/),
[Vite integration](https://cesium.com/blog/2024/02/13/configuring-vite-or-webpack-for-cesiumjs/),
[token scopes/restrictions](https://cesium.com/learn/ion/cesium-ion-access-tokens/).

Implementation assisted by OpenAI Codex from Pablo's human-authored module plan.

Javi J0/J10 alignment: the default and retry observer height come from
`config/terrain-processing.json`. The private legacy adapter is named
`sampleSiteSky`; `skyAt(lat, lon, t)` is reserved for Javi's future `@/ephem`.
Until that module/data exists, same-site temporal bounds still apply. No annual
vectors or terrain horizons are fabricated. The 360-degree camera validation
and DE421/DE440/mesh alignment remain pending.
