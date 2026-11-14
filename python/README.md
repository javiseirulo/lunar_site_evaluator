# lunar-pipeline

(work in progress)

## Export of the real data (`export.all`)

```bash
uv run python -m export.all
```

Replaces the mock `manifest.json`, `sites.json` and `timeseries/*.json` in `web/public/data`
(`mock: false`); `layers.json`, `layers/` and `terrain/` are not touched. Needs only the
`ephem/<YYYY>.bin` files (no SPICE).

- Sites: every entry of `export/catalog.yaml` (region, kind, group, source = `source_ref`, `elev_m` 0).
- Timeseries: hourly over the manifest window `[2027-01-01T00:00:00Z, 2028-01-01T00:00:00Z)`
  (8760 samples), flat horizon for a 5 m observer (`"flat (no terrain)"`), antenna margin 2°,
  2 decimals (`lit` re-derived from the published `sun_frac`), compact JSON (~29 MB for 59 files).
- Metrics: README "Window metrics" on the published timeseries. `slope_deg` / `psr_dist_km` are
  placeholders `0` listed in `pending_metrics` until the terrain exists.
- `checks` / `valid` / `score`: `export/scoring.py`, a port of `web/src/scoring/evaluate.ts`
  (tested against `contracts/fixtures/golden-score.json`) with `DEFAULT_MISSION_CONFIG`, evaluated
  over the **manifest window** (types.ts `Site.valid`, README rule 4). The default thresholds are
  sized for a 7-day stay, so over a full year the night/blackout requirements fail almost
  everywhere; the web re-evaluates per mission window with `@/scoring`.
- Every output is validated against `contracts/*.schema.json`. `pnpm mocks` still regenerates mocks.
