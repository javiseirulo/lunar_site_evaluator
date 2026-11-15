"""Heat-map grids of the window metrics (``contracts/types.ts`` GridIndex, README "Binary formats").

    uv run python -m export.grids

Flat 5 m horizon, all of 2027 hourly (same window/sampling as :mod:`export.all`), antenna margin
2 deg. Writes ``web/public/data/grid/{global_1deg,south_5km}.bin`` (Float32 LE, one plane of
``width x height`` per metric in ``METRICS`` order, row 0 = north / max_y, NaN = no data) and
``grid/index.json`` (validated against ``contracts/grid-index.schema.json``).

The metrics are a vectorised equivalent of :func:`ephem.timeseries.window_metrics` applied to
:func:`ephem.timeseries.build_timeseries` (full precision, no 2-decimal rounding of sun_el), on a
sphere with ``elev_m = 0``. ``tests/test_grids.py`` checks a few cells against the scalar path.
"""

from __future__ import annotations

import json
import time
from datetime import UTC, datetime

import jsonschema
import numpy as np

from ephem.timeseries import FLAT_HORIZON_SOURCE
from ephem.topo import DEFAULT_H_OBS_M, R_MOON_KM, horizon_flat, sun_frac
from ephem.vectors import STEP_S, load_window

from .all import ANTENNA_MARGIN_DEG, CONTRACTS, DATA, END_UTC, START_UTC

METRICS = ["illum_pct", "max_dark_hours", "earth_vis_pct", "max_blackout_hours", "sun_el_mean_deg"]
GRID_DIR = DATA / "grid"
CHUNK = 512
POLAR_CELL_M = 5000.0


def _longest_run_rows(mask: np.ndarray) -> np.ndarray:
    """Longest run of True per row of a (c, n) boolean array."""
    n = mask.shape[1]
    idx = np.broadcast_to(np.arange(n), mask.shape)
    last_false = np.maximum.accumulate(np.where(mask, -1, idx), axis=1)
    return (idx - last_false).max(axis=1)


def grid_metrics(
    lat: np.ndarray,
    lon: np.ndarray,
    sun_unit: np.ndarray,
    earth_km: np.ndarray,
    antenna_margin_deg: float = ANTENNA_MARGIN_DEG,
    h_obs_m: float = DEFAULT_H_OBS_M,
    step_s: int = STEP_S,
    chunk: int = CHUNK,
) -> np.ndarray:
    """(len(METRICS), c) metrics for cells ``lat``/``lon`` (deg, elev 0) on the flat horizon."""
    lat = np.asarray(lat, dtype=np.float64).ravel()
    lon = np.asarray(lon, dtype=np.float64).ravel()
    out = np.empty((len(METRICS), lat.size), dtype=np.float64)
    h = horizon_flat(h_obs_m)
    step_h = step_s / 3600.0
    sun_t = np.asarray(sun_unit, dtype=np.float64).T  # (3, n)
    earth_t = np.asarray(earth_km, dtype=np.float64).T
    e2 = (earth_t * earth_t).sum(axis=0)
    r = R_MOON_KM + h_obs_m / 1000.0
    for a in range(0, lat.size, chunk):
        s = slice(a, a + chunk)
        la, lo = np.radians(lat[s]), np.radians(lon[s])
        u = np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], axis=1)
        # Sun: direction only (no parallax).
        sun_el = np.degrees(np.arcsin(np.clip(u @ sun_t, -1.0, 1.0)))
        frac = sun_frac(sun_el, h)
        lit = frac >= 0.5
        # Earth, exact parallax: v = e - r u, so U.v = U.e - r and |v|^2 = |e|^2 - 2 r U.e + r^2.
        ue = u @ earth_t
        sin_el = (ue - r) / np.sqrt(e2 - 2.0 * r * ue + r * r)
        earth_el = np.degrees(np.arcsin(np.clip(sin_el, -1.0, 1.0)))
        vis = earth_el > h + antenna_margin_deg
        out[0, s] = frac.mean(axis=1)
        out[1, s] = _longest_run_rows(~lit) * step_h
        out[2, s] = vis.mean(axis=1)
        out[3, s] = _longest_run_rows(~vis) * step_h
        out[4, s] = (frac * np.maximum(0.0, sun_el)).mean(axis=1)
    return out


def global_cells(step_deg: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
    """Equirectangular cell centres (height, width): row 0 = north, lon -180 -> 180."""
    lats = 90.0 - step_deg * (np.arange(round(180 / step_deg)) + 0.5)
    lons = -180.0 + step_deg * (np.arange(round(360 / step_deg)) + 0.5)
    return np.meshgrid(lats, lons, indexing="ij")


def polar_cells(bounds_m, radius_m: float, cell_m: float) -> tuple[np.ndarray, np.ndarray, int]:
    """South polar stereographic (k=1) cell centres, row 0 = max_y. Returns lat, lon, n.

    ``n = round(width / cell_m)`` so the bounds are kept exactly (cell = width / n).
    """
    x0, y0, x1, y1 = bounds_m
    n = max(1, round((x1 - x0) / cell_m))
    dx, dy = (x1 - x0) / n, (y1 - y0) / n
    xs = x0 + dx * (np.arange(n) + 0.5)
    ys = y1 - dy * (np.arange(n) + 0.5)
    x, y = np.meshgrid(xs, ys)
    rho = np.hypot(x, y)
    lat = -90.0 + np.degrees(2.0 * np.arctan(rho / (2.0 * radius_m)))
    lon = np.degrees(np.arctan2(x, y))  # south pole: x = rho sin lon, y = rho cos lon
    return lat, lon, n


def main() -> int:
    t0 = time.perf_counter()
    layers = json.loads((DATA / "layers.json").read_text())
    t, sun, earth = load_window(START_UTC, END_UTC)
    GRID_DIR.mkdir(parents=True, exist_ok=True)
    common = {
        "metrics": METRICS,
        "horizon_source": FLAT_HORIZON_SOURCE,
        "antenna_margin_deg": ANTENNA_MARGIN_DEG,
    }
    grids = []

    lat, lon = global_cells(1.0)
    planes = grid_metrics(lat, lon, sun, earth).reshape(len(METRICS), *lat.shape)
    planes.astype("<f4").tofile(GRID_DIR / "global_1deg.bin")
    grids.append(
        {
            "id": "global_1deg",
            "file": "grid/global_1deg.bin",
            "projection": "equirectangular",
            "width": int(lat.shape[1]),
            "height": int(lat.shape[0]),
            **common,
        }
    )

    bounds = [float(b) for b in layers["bounds_m"]]
    radius, lat_limit = float(layers["radius_m"]), float(layers["lat_limit"])
    lat, lon, n = polar_cells(bounds, radius, POLAR_CELL_M)
    inside = lat <= lat_limit
    planes = np.full((len(METRICS), n, n), np.nan)
    planes[:, inside] = grid_metrics(lat[inside], lon[inside], sun, earth)
    planes.astype("<f4").tofile(GRID_DIR / "south_5km.bin")
    grids.append(
        {
            "id": "south_5km",
            "file": "grid/south_5km.bin",
            "projection": "south_polar_stereographic",
            "width": n,
            "height": n,
            "bounds_m": bounds,
            "radius_m": radius,
            "lat_limit": lat_limit,
            **common,
        }
    )

    index = {
        "version": 1,
        "mock": False,
        "generated_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window": {"start_utc": START_UTC, "end_utc": END_UTC, "step_s": STEP_S},
        "dtype": "float32-le",
        "grids": grids,
    }
    schema = json.loads((CONTRACTS / "grid-index.schema.json").read_text())
    jsonschema.Draft202012Validator(schema).validate(index)
    (GRID_DIR / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    for g in grids:
        size = (DATA / g["file"]).stat().st_size
        assert size == 4 * len(METRICS) * g["width"] * g["height"] and size < 10_000_000
        print(f"{g['id']}: {g['width']}x{g['height']}, {size / 1e6:.2f} MB")
    print(f"{np.asarray(t).size} h; {time.perf_counter() - t0:.0f} s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
