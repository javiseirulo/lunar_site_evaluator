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

## v1.1 (additive; docs/10 J10 and §10 "whole Moon")

Nothing from v1 is renamed. Every new field is optional, so the v1 mocks stay valid.

| File in `web/public/data/` | Type | Schema | Written by |
|---|---|---|---|
| `horizon/<site_id>.json` | `HorizonProfile` | `horizon.schema.json` | Pablo (terrain) |
| `ephem/index.json` + `ephem/<YYYY>.bin` | `EphemIndex` | `ephem-index.schema.json` | Javi (`python/ephem`) |
| `grid/index.json` + `grid/*.bin` | `GridIndex` | `grid-index.schema.json` | Javi (export) |
| (store `missionConfig`, Mission scenarios) | `MissionConfig` | `mission_config.schema.json` | Javi / Cristóbal |

New optional fields:
- `Site`: `region`, `kind`, `group`, `checks` (requirement results with margins), `pending_metrics`.
- `Site.metrics`: `sun_el_mean_deg`, `max_blackout_hours`, `sun_earth_pct`.
- `Timeseries`: `sun_frac`, `horizon_source`.

### Notes for consumers
- **Real data (`mock: false`) always includes `earth_visible`.** All Earth metrics depend on it.
- **`region`** follows lat/lon: `south_pole` if lat ≤ −80, `north_pole` if lat ≥ 80, otherwise `near_side` if |lon| ≤ 90, else `far_side` (checked by `web/src/core/contracts.test.ts`).
- **`antenna_margin_deg`** in a timeseries/grid is the margin baked into `earth_visible`. If the user changes the margin, `@/scoring` rebuilds the window with `@/ephem` instead of reusing the static file.
- **Mission scenarios** (Cristóbal) are partial overrides. Merge them onto `DEFAULT_MISSION_CONFIG` first, then validate the result against `mission_config.schema.json`.
- **Historic landings:**
  - in `sites.json` they are sites like any other (`kind: "historic_landing"`), so they can be evaluated and compared;
  - Marta's planned `historic_sites.json` (display layer with agency, date and outcome) can reuse the same `id`s so both link.
- **`grid/*.bin` replaces the `grid_metrics.bin` sketched in docs/10 (Marta's block).** It is Float32 instead of uint8, and the time dimension is optional (`n_times`, `time_step_s`; e.g. per day for an animated heat map).

### Binary formats
- `ephem/<YYYY>.bin`: Float32 little-endian, 6 values per hour starting at Jan 1 00:00 UTC.
  - Columns: `sun_ux, sun_uy, sun_uz` (unit vector Moon→Sun) and `earth_x_km, earth_y_km, earth_z_km` (Moon centre→Earth).
  - Frame `MOON_ME`, SPICE aberration `LT+S`. About 210 KB per year.
- `horizon/<id>.json`: `elev_deg.length × az_step_deg = 360` exactly (3600 values at 0.1°, 360 at 1°), and `site_id` matches the file name and a site in `sites.json`.
- `grid/*.bin`: Float32 little-endian, one plane of `width × height` per metric, in `metrics` order.
  - Row 0 is north. Equirectangular grids go lon −180→180 and lat 90→−90, values at cell centres.
  - `NaN` means no data.

### Topocentric sky and visibility (shared by `python/ephem` and `web/src/ephem`)
- **Site position:** sphere of R = 1737.4 km; position `(R + elev_m + observer_height) · (cos φ cos λ, cos φ sin λ, sin φ)`.
- **Axes:** ENU, with E = (−sin λ, cos λ, 0), N = (−sin φ cos λ, −sin φ sin λ, cos φ), U = radial.
- **Azimuth and elevation:**
  - azimuth = atan2(E·v, N·v), clockwise from local north, in [0, 360);
  - elevation = asin(U·v/|v|);
  - for the Earth, v = `earth_km − r_site` (exact parallax).
- **Flat horizon** (no terrain): −acos(R/(R+h)), which is −0.1375° for h = 5 m. `horizon_source: "flat (no terrain)"`.
- **Sun:**
  - `sun_frac` = visible fraction of the solar disc (radius 0.2666°) above the horizon h(az);
  - `lit` = 1 when `sun_frac` ≥ 0.5.
- **Earth:** `earth_visible` = 1 when `earth_el` > h(`earth_az`) + `antenna_margin_deg` (default 2°).

### Window metrics (same definitions in Python and TypeScript)
- `illum_pct` = mean(`sun_frac`). In v1 data without `sun_frac`, it is the mean of `lit`.
- `sun_el_mean_deg` = mean(`sun_frac` · max(0, `sun_el`)).
- `max_dark_hours` = longest run of `lit` = 0, in hours.
- `earth_vis_pct` = mean(`earth_visible`).
- `max_blackout_hours` = longest run of `earth_visible` = 0, in hours.
- `sun_earth_pct` = mean(`lit` ∧ `earth_visible`).

### Validity and score (docs/10 J6–J7; one implementation in `web/src/scoring/`, mirrored by the export)
- **Validity:** a site is valid for a mission window when every requirement in `MissionConfig.requirements` that is not in `pending_metrics` passes its threshold.
  - "Less is better" metrics fail above the threshold: `slope_deg`, `max_dark_hours`, `max_blackout_hours`, `psr_dist_km`.
  - All other metrics fail below it.
  - **At exactly the threshold the requirement passes** (`value ≥ threshold`, or `value ≤ threshold` for less-is-better), so `margin = 0` passes. Python and TypeScript compare unrounded values.
- **Utility per criterion:**
  - u = 0 at the threshold and 1 at the objective, linear in between, clamped to [0, 1];
  - inverted for "less is better" metrics;
  - without an objective, u = 1 when the requirement passes.
  - There is no min-max normalisation, so a site's score does not depend on the other sites.
- **Score:** `score = Σ wᵢ·uᵢ / Σ wᵢ` over the weighted, non-pending criteria. If Σ wᵢ = 0 (no weights, or every weighted criterion pending), `score = 0`, never NaN. The ranking only lets valid sites compete (J7): `rankSites` puts every valid site first and orders by score. Invalid sites keep their number so the UI can show how far they are, but they are always labelled "not valid".
- **Margins:** `checks[].margin` is relative and signed (> 0 passes). The UI turns it into text such as "longest night 142 h > 100 h".
