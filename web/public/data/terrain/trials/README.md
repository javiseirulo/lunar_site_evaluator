# Experimental lunar horizons — Pablo

Independent NASA LOLA calculations, assisted by OpenAI Codex, 2026-11-14.
**Not production visibility, illumination, mission metrics or certified accuracy.**
These six historical trial profiles remain separate from the **41 current polar
catalogue profiles** in `data/horizon/`, reported by `terrain/delivery.json` and
`terrain/catalog-delivery.json`. Trial coordinates and results are preserved;
they must not replace a current catalogue profile. See the
[current handoff](../../../../../docs/team/pabloizgui/team-handoff.md).

| File | Purpose |
| --- | --- |
| `shackleton_fixture_01deg_refined4.json` | Densest pilot: 3600 azimuths, 5 m observer, 310 km range. Coordinate −89.9°, 0° is still a team fixture, not an approved catalogue position. |
| `shackleton_fixture_01deg.csv` | Same densest pilot, columns azimuth / elevation / peak range, for inspection by Javi. |
| `shackleton_fixture_01deg.json`, `…_refined.json` | Radial convergence comparison, original and 2× density. |
| `shackleton_fixture_1deg.json` | First speed pilot, 360 azimuths. |
| `global_equator_1deg.json`, `global_north_1deg.json` | Coverage trials at (0°, 0°) and (89.9°, 0°), using coarse global LOLA only. No fine polar-north claim. |
| `benchmark.json` | Measured runtime, missing rays and convergence comparisons. |

`elev_deg[i]` is the maximum elevation angle along azimuth `i * az_step_deg`,
clockwise from **local north**, relative to the observer's local horizontal.
Negative horizons are valid. No atmosphere or refraction. The geometry is:

```
theta = arc_distance_m / 1737400
angle = atan2((1737400 + target_height_m) * cos(theta)
              - (1737400 + ground_height_m + 5),
              (1737400 + target_height_m) * sin(theta))
```

Great-circle rays use Moon-fixed vectors, including at the poles/dateline.
Bilinear interpolation requires all four contributing DEM cells. If any ray
sample remains unknown after available fallback sources, that ray is `null` and
`complete[i]` is false. Such a profile must **not** pass the proposed production
schema, which accepts only numeric elevations. Never replace `null` with zero.

Southern source rings: 0–5 km at 5 m spacing, 5–80 km at 80 m, 80–310 km at
240 m; refinement divides these steps by 2 or 4. Native DEM resolutions remain
5/80/240 m. Global fallback is **LDEM_64 V3.1, 64 pixels/degree**, approximately
474 m in latitude; denser ray sampling does not create finer terrain data.
The southern pilot did not use the global fallback. Full source URLs and local
SHA-256 fingerprints are embedded in each profile's `source_integrity`.

At the southern pilot, 1× vs 2× radial sampling differs by up to 0.06314°
(one azimuth exceeds 0.05°); 2× vs 4× differs by up to 0.03768° (none exceeds
0.05°). Extending 150 km to 310 km changes the horizon by up to 0.35741°.
For this point, 200/300/310 km agree. Do not generalize the range conclusion to
other points. Angular convergence below 0.1°, DEM errors, source boundaries and
independent comparison remain pending. Thus **all profiles stay experimental**.

Reproduce from the repo root, after downloading the sources:

```bash
python scripts/fetch_global_lola.py
python -m python.terrain.horizon_trial --lat -89.9 --lon 0 \
  --site-id shackleton_rim_01 --az-step 0.1 --refinement 4 \
  --output data/exports/shackleton-trial.json
python scripts/summarize_horizon_trials.py
```

The profile command refuses overwrites. The summary command updates only the
experimental summaries/CSV and provenance of existing pilots.
Use `requirements-terrain.txt`. Large source DEMs stay in ignored `data/terrain/`;
teammates can read these small JSON/CSV files without downloading them.

Javi: these pilots predate the current catalogue and its validated sampled
profiles; do not copy fixture-coordinate profiles into `horizon/`. Consume the
current catalogue delivery when regenerating evaluation outputs.
Marta: these trials are separate from your existing Float32 heightmap and mask.
