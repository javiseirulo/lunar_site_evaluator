"""Golden fixture for the TypeScript port: ``contracts/fixtures/golden-azel.json``.

CLI (no kernels needed; reads the committed ``.bin`` files and Horizons answers)::

    uv run python -m ephem.golden

* ``cases``: topocentric transform cases (poles, equator, limbs, far side, both hemispheres) at
  whole UTC hours. ``sun_unit`` / ``earth_km`` are exactly the float32 values stored in
  ``web/public/data/ephem/<year>.bin`` at ``t_utc`` (widened to float64), so the TS side can check
  both its ``.bin`` reader and its transform. Outputs are full float64 (``R_km``,
  ``observer_height_m``, ``sun_radius_deg`` given at the top). ``horizon_flat_deg`` is
  ``horizon_flat(observer_height_m)`` and ``sun_frac_flat = sun_frac(sun_el, horizon_flat_deg)``.
* ``horizons``: JPL Horizons apparent az/el at sites with ``elev_m = 0``, ``h_obs_m = 0`` (see
  ``docs/validation/horizons-check.md``). Reproduce them with the ``.bin`` + linear
  interpolation path; expected agreement < 1e-3 deg (target 0.01 deg).
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from . import jsonfmt
from .horizons_check import REFERENCE_PATH, load_reference
from .kernels import REPO_ROOT
from .topo import (
    DEFAULT_H_OBS_M,
    R_MOON_KM,
    SUN_RADIUS_DEG,
    azel,
    horizon_flat,
    sun_frac,
)
from .vectors import load_vectors

GOLDEN_PATH = REPO_ROOT / "contracts" / "fixtures" / "golden-azel.json"

# (label, lat, lon east, elev_m, t_utc). Elevations are illustrative, not survey values.
CASES: list[tuple[str, float, float, float, str]] = [
    ("north pole", 90.0, 0.0, 0.0, "2026-01-01T00:00:00Z"),
    ("south pole", -90.0, 0.0, 0.0, "2027-03-15T12:00:00Z"),
    ("south pole, lon 90E basis", -90.0, 90.0, 0.0, "2027-03-15T12:00:00Z"),
    ("equator, prime meridian (sub-Earth region)", 0.0, 0.0, 0.0, "2028-02-29T12:00:00Z"),
    ("equator, 90E (east limb)", 0.0, 90.0, 0.0, "2029-07-04T03:00:00Z"),
    ("equator, 180 (far-side centre)", 0.0, 180.0, 0.0, "2030-10-10T18:00:00Z"),
    ("equator, 90W (west limb)", 0.0, -90.0, 0.0, "2031-12-24T21:00:00Z"),
    ("Shackleton rim", -89.9, 0.0, 1900.0, "2033-05-05T05:00:00Z"),
    ("Connecting ridge", -89.45, -137.0, 1500.0, "2034-08-20T14:00:00Z"),
    ("Malapert massif", -85.99, -0.1, 5000.0, "2036-01-31T09:00:00Z"),
    ("Mons Mouton", -84.3, 31.0, 6000.0, "2037-09-09T23:00:00Z"),
    ("Plain at 81S", -81.5, 120.0, -500.0, "2039-04-01T00:00:00Z"),
    ("Apollo 11", 0.67408, 23.47297, -1900.0, "2040-02-29T07:00:00Z"),
    ("Chang'e 4 (far side)", -45.4446, 177.5991, -5900.0, "2042-11-11T11:00:00Z"),
    ("Tycho (near side, south)", -43.3, -11.2, 0.0, "2044-06-30T16:00:00Z"),
    ("far side, 60N 150E", 60.0, 150.0, 2000.0, "2046-03-03T02:00:00Z"),
    ("near side, 45N 30W", 45.0, -30.0, -2500.0, "2048-12-31T20:00:00Z"),
    ("north polar, 85N 60W", 85.0, -60.0, 0.0, "2050-05-17T13:00:00Z"),
    ("Peary rim (north pole region)", 88.6, 33.0, 0.0, "2052-08-08T08:00:00Z"),
    ("south-west limb, 10S 95W", -10.0, -95.0, 0.0, "2054-01-15T04:00:00Z"),
    ("last sample of the range", -89.9, 0.0, 1900.0, "2055-12-31T23:00:00Z"),
]


def build_cases(h_obs_m: float = DEFAULT_H_OBS_M) -> list[dict[str, Any]]:
    flat = horizon_flat(h_obs_m)
    out = []
    for label, lat, lon, elev_m, t_utc in CASES:
        t, sun, earth = load_vectors(t_utc, t_utc)
        if t.size != 1:
            raise ValueError(f"{t_utc} is not an hourly sample")
        s, e = sun[0], earth[0]
        s_az, s_el = azel(lat, lon, elev_m, s, h_obs_m, parallax=False)
        e_az, e_el = azel(lat, lon, elev_m, e, h_obs_m, parallax=True)
        out.append(
            {
                "label": label,
                "lat": lat,
                "lon": lon,
                "elev_m": elev_m,
                "t_utc": t_utc,
                "sun_unit": [float(x) for x in s],
                "earth_km": [float(x) for x in e],
                "sun_az": float(s_az),
                "sun_el": float(s_el),
                "earth_az": float(e_az),
                "earth_el": float(e_el),
                "horizon_flat_deg": flat,
                "sun_frac_flat": float(sun_frac(s_el, flat)),
            }
        )
    return out


def build_horizons_rows(path: Path = REFERENCE_PATH) -> list[dict[str, Any]]:
    keys = ("site", "lat", "lon", "elev_m", "h_obs_m", "t_utc")
    keys += ("sun_az", "sun_el", "earth_az", "earth_el")
    return [{k: row[k] for k in keys} for row in load_reference(path)["rows"]]


def build_golden() -> dict[str, Any]:
    return {
        "version": 1,
        "R_km": R_MOON_KM,
        "observer_height_m": DEFAULT_H_OBS_M,
        "sun_radius_deg": SUN_RADIUS_DEG,
        "cases": build_cases(),
        "horizons": build_horizons_rows(),
    }


def main(argv: list[str] | None = None) -> int:
    del argv
    path = jsonfmt.write(GOLDEN_PATH, build_golden())
    print(f"golden -> {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
