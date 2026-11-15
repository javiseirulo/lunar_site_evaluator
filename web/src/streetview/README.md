# Lunar Street View — Pablo (#46)

The renderer uses Cesium Moon alongside the globe module's R3F canvas. It reads
the selected site, optional free point and UTC from `@/core`, and real Sun/Earth
vectors from `@/ephem`. Its clock controls and shared links update the common
UTC; movement publishes the additive `selectedPoint` store field.

## Shared application access

The team development key is included in `cesiumAccess.ts` at Pablo's explicit
request. Teammates can run `pnpm dev` without an ion account or manual token input.
It is a public `assets:read` application key restricted to Cesium Moon (2684829)
and localhost/127.0.0.1:5173, as confirmed by the account owner. Vite keeps port
5173 strictly. A local read request returned HTTP 200; an unrelated origin 403.

`VITE_CESIUM_ION_TOKEN` in ignored `web/.env.local` or the build environment
still overrides the shared key. Restart Vite after changing the environment.
The development-only access panel can also override the key in memory. Private
account, token-management and write credentials must never be bundled or committed.
For another domain/LAN deployment, use an appropriately restricted read key.
Links and QR codes never include credentials. See
[team handoff](../../../docs/team/pabloizgui/team-handoff.md) and the
[official token guide](https://cesium.com/learn/ion/cesium-ion-access-tokens/).

Open `/explore` (3D by default, with a WebGL fallback) and drag the astronaut onto the visible Moon, or open
`/streetview/shackleton_rim_01` directly. Tapping/keyboard-activating the astronaut
arms placement; the next Moon click reuses Marta's globe flight and the existing
Street View route. The URL takes the current UTC when that flight finishes.

## Engine behavior

- Cesium and its CSS are loaded on demand; assets/workers are copied by the Vite
  plugin under `cesium/`. Base URLs support Vite's configured URL prefix.
- The viewer uses `Ellipsoid.MOON` explicitly, without changing the global
  ellipsoid. Earth globe, base imagery, geocoder, atmosphere, default Sun/Moon
  and independent animation/timeline are disabled.
- The camera is placed at the sampled mesh height + the selected eye height (5 m by default). It does not use
  mock `site.elev_m` for ground placement. If the mesh cannot be sampled,
  it reports an error instead of substituting a sphere as if it were terrain.
- Left drag / one finger looks around; wheel / pinch zooms. Keyboard arrows
  remain, with no on-screen arrow buttons. Click/tap nearby ground to move
  1–200 m; explicit coordinates allow global relocation. Observer height is a
  local visual setting (0.5–20 m); it does not recompute pipeline visibility.
- Right-click ground / double tap (within 400 ms) saves a named coordinate in
  Marta's existing per-browser pin store. A single touch tap waits 400 ms before
  walking so the second tap can open the save form without moving the observer.
- Face Sun / Face Earth rotates toward the live ephemeris direction. Back to
  3D map returns to Explore centered on the current point, including expanded view.
- Place names use more candidates and alternative leader positions so precise
  aiming is less necessary. The depth filter tolerates a feature's own near slope within its radius
  (capped at 20 km); labels describe approximate feature areas, not precise peaks.
- Terrain requests use screen-space error 1, 4x MSAA and up to 2 device pixels
  per CSS pixel. Smooth mesh normals are used when supplied. No tint changes;
  missing source geometry cannot be recovered by rendering settings or textures.
- Sun/Earth are labeled direction markers. Positions use real hourly SPICE
  vectors from `@/ephem`, interpolated for any location from 2026-01-01 00:00 to
  2055-12-31 23:00 UTC, with local north-clockwise azimuth and Earth parallax.
- The chosen UTC is shown. Missing ephemeris/horizon loading and errors are
  explicit; a late core manifest load preserves a deliberately chosen time.
- Mesh textures can have baked-in shadows; rendered imagery is not evidence of
  lighting at the selected time. Visibility uses a matching 5 m catalogue horizon;
  changed location/height uses the labelled geometric horizon instead.
  “Terrain visibility not calculated” means no matching occlusion profile, even
  though the visual 3D terrain is loaded. Cesium ion/data credits stay visible.
- Loading errors are generic to avoid displaying token-bearing URLs. Retry
  recreates the scene. Setup has a 90-second timeout, surface queries 45 seconds; unmount/site change
  cancels setup, disposes GPU resources, listeners and ResizeObserver.

The sourced catalogue has 59 terrain records and 41 polar horizons at 5 m,
0.1 degrees and 310 km. Catalogue DEM elevations feed Earth parallax; at a free
point the scientific elevation is unknown, so parallax explicitly uses the
reference sphere plus eye height. Cesium mesh height remains a visual quantity,
shown separately where a catalogue DEM elevation exists. Cesium/LOLA calibration,
stellar catalogues, constellations and physically sized/phased bodies remain
pending. Numerical sampling checks do not certify landing safety.

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
sampling boundaries and camera angle limits, mouse/touch gestures, movement bounds,
lighting states, label placement, profile matching and shared-link state. Current
globe integration is described in the
[astronaut notes](../../../docs/team/pabloizgui/globe-surface-integration.md);
earlier sky, navigation and QR evidence remains in the
[ephemeris integration notes](../../../docs/team/pabloizgui/ephemeris-integration.md).
Chrome mobile emulation verifies drag/pinch/tap; ZXing decodes the rendered QR
SVG back to the captured link. Browser QA also checks returning to Shackleton
after Explore/Peary. These checks use the authorized native fallback; they do not
claim a complete automatic gstack run, physical-phone support, photometric
accuracy, surface calibration or terrain/DEM agreement.

Sources: [Cesium Moon](https://cesium.com/platform/cesium-ion/content/cesium-moon/),
[Vite integration](https://cesium.com/blog/2024/02/13/configuring-vite-or-webpack-for-cesiumjs/),
[token scopes/restrictions](https://cesium.com/learn/ion/cesium-ion-access-tokens/).

Implementation assisted by OpenAI Codex from Pablo's human-authored module plan.

Javi J0/J10 alignment: the default observer height is 5 m. `observerSky` consumes
Javi's available `skyAt` and checks location/height before using a terrain
profile. The ephemeris frame is `MOON_ME_DE440_ME421`, aligned with the DEM's
ME/DE421 frame; see the shared Horizons report. Visual mesh/DEM height calibration
and physical-device QA remain pending. Javi's integrated #101 export now consumes
all 41 polar profiles and catalogue terrain, and publishes real map layers.
Per-cell grids still use geometric horizons; PSR remains pending in 18 sites
without coverage. These current facts supersede earlier consumer-pending notes.

## Navegación v1 (2026-11-14)

Left drag / one-finger drag looks around; wheel / pinch changes field of view
(25–90 degrees). On-screen arrows are removed; keyboard arrows remain.
Click or tap visible ground 1–200 m away to walk. The route samples the actual
visual mesh every ≤5 m, then eases for one second (instant with reduced motion).
Far mountains and sky are rejected. Global relocation is explicit under
**View options → Go anywhere on the Moon**. **Expand view** works on mobile too.

Relief reading light is enabled by default. It is artificial, camera-relative
fill derived from geometric normals, with a subtle solar-state tint. It is not
physical lighting, a new shadow calculation or a remedy for missing ephemerides.
The lunar sky stays black. Toggle it off to inspect the source imagery.
After moving, the sky is recalculated for the new coordinates with `@/ephem`.
The old terrain profile is invalidated; the UI labels the geometric fallback
and unknown free-point DEM elevation. Published terrain profiles use 5 m.

Official IAU/USGS names use thin elbow leaders, at most six visible labels,
with overlap/depth checks. Anchors refer to feature centres, not measured peaks.
The catalogue and its original KMZ hash are in `terrain/lunar-names.json`.

See [navigation and dependencies](../../../docs/team/pabloizgui/streetview-navigation-v1.md)
and [trial horizons](../../public/data/terrain/trials/README.md). That navigation
document preserves the earlier v1 evidence; the current integration notes above
supersede its pending catalogue/ephemeris statements. Physical-phone QA and
Cesium/LOLA calibration remain pending.
