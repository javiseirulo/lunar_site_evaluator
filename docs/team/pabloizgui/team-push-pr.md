# Lunar Street View and real LOLA terrain handoff

Base: `dev`. Head: `pabloizgui/46-lunar-streetview`.
Closes #37. Refs #46, #38, #48.

## Qué cambia

The team can review and run Pablo's surface viewer and consume the real polar
terrain from one branch. It includes current `dev` (`e6825cd`, including Javi's
Design/Mission selector) and the preserved terrain branch. The public data is
small derived output; the multi-GB NASA source rasters are not committed.

| Consumer | Repository paths | Ready now |
|---|---|---|
| Marta | `web/public/data/terrain/heightmap.json`, `heights.f32`, `valid.u8` | 1025² Float32 LE heights in metres + validity mask, aligned with the existing −80° polar window |
| Marta / Javi2 | `web/public/data/terrain/layers.json`, `elevation.png`, `slope.png` | Two real display layers; integrate through contract review without replacing the other mock layers |
| Javi | `web/public/data/terrain/site-terrain.json`, `site-terrain.csv` | Real native-pixel terrain at 20 fixture coordinates; not validated landing-site scores |
| Javi / Pablo | `config/terrain-processing.json`, `web/public/data/terrain/processing.json`, `delivery.json` | 5 m observer, 0.1° curated / 1° heatmap azimuth, 300 km initial range and convergence checks to 310 km; **zero computed horizon profiles** |
| Everyone | `docs/team/pabloizgui/team-handoff.md` and `tasks.md` | Setup, exact file locations, owners, dependencies and next work |

The lazy Cesium viewer in `web/src/streetview/` uses the shared selected site and
clock. Camera default is 5 m. The same-site series adapter rejects missing or
out-of-range data; real annual ephemerides remain Javi's responsibility.

For shared-account use, teammates copy `web/.env.example` to an ignored
`web/.env.local` and receive Pablo's read-only Moon application token through a
private team channel. They do not need individual Cesium accounts. Vite strictly
uses local port 5173. Production uses a build variable and an origin-restricted
application token. No token value, private permissions or account login is committed.

## Cómo se ha verificado

Native Python/web tests, TypeScript, lint, build, formatting and the full JS
height/mask/hash reader are run on the final candidate. Exact results are recorded
in `docs/team/pabloizgui/push-validation.md`: 24 Python tests, 37 web tests and
native typecheck/lint/build pass. CI is pending until publication. Live Cesium endpoint checks:
local origin HTTP 200, unrelated origin HTTP 403. Token restrictions are confirmed
by the owner; token metadata introspection returned 404.

The gstack publication gate is reported separately from native checks. A known
Windows launcher problem returns exit 127; no green ship receipt is claimed.
An attempted persistent scanner exception was rejected; the safer environment
configuration is used and the secret scanner remains unchanged.

## Review and remaining work

- Marta/Javi2: review `PolarHeightmap`, vertex registration, masks and layer loader.
- Javi: deliver `@/ephem`/annual vectors, confirm MOON_ME realization and DE421/DE440
  alignment, and review the final horizon contract. Product owns catalogue #48.
- Known viewer issue: a prior 90° turn produced a grey view. The full 360° camera
  acceptance and visual usability are next work; do not treat this v0 as finished.
- Horizons, PSR, real visibility/suitability and free coordinate selection are
  not fabricated. Keep #38 open. Main mock catalogue stays clearly marked.

## Checklist

- [x] Branch includes current integration context; base is `dev`.
- [x] NASA/library references and AI usage recorded; no NASA branding generated.
- [x] Raw datasets and local token excluded; handoff paths are in the repository.
- [ ] Final publication gate, remote CI and teammate contract review before merge.

Prepared PR description only. No merge or publication is implied by this file.
