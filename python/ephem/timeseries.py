"""Build a ``Timeseries`` (``contracts/types.ts``) for one site and compute its window metrics.

The definitions here are shared, one-to-one, with the TypeScript implementation (``@/ephem``
``buildTimeseries`` and ``@/scoring`` metrics). Change both or neither.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import numpy as np

from .topo import DEFAULT_H_OBS_M, azel, horizon_at, horizon_flat, sun_frac
from .vectors import STEP_S, iso_utc

FLAT_HORIZON_SOURCE = "flat (no terrain)"


def _round_az(az: np.ndarray) -> list[float]:
    """Round to 2 decimals and wrap, so 359.996 -> 360.00 -> 0.0 (schema: ``az < 360``)."""
    return (np.round(az, 2) % 360.0).tolist()


def build_timeseries(
    site: Mapping[str, Any],
    t: np.ndarray,
    sun_unit: np.ndarray,
    earth_km: np.ndarray,
    horizon: Mapping[str, Any] | None = None,
    antenna_margin_deg: float = 2.0,
    h_obs_m: float = DEFAULT_H_OBS_M,
    step_s: int = STEP_S,
) -> dict[str, Any]:
    """Sun/Earth sky positions and visibility flags for ``site`` at the instants ``t``.

    Parameters
    ----------
    site : ``{id, lat, lon, elev_m}`` (degrees, east-positive lon, metres).
    t : ``datetime64`` (n,), UTC; ``sun_unit`` / ``earth_km`` (n, 3) in MOON_ME from the Moon centre
        (as returned by :func:`ephem.vectors.load_vectors`).
    horizon : ``None`` for a smooth sphere, or ``{elev_deg, az_step_deg, source}`` (terrain profile,
        azimuth from local north clockwise, elevation in degrees with curvature included).
    antenna_margin_deg : minimum Earth elevation above the terrain horizon for a usable link.
    h_obs_m : observer height above the terrain.

    Definitions (computed on full-precision values, before rounding):

    * ``sun_az, sun_el, earth_az, earth_el``: :func:`ephem.topo.azel` (Earth with exact parallax),
      rounded to 2 decimals; azimuths wrapped to ``[0, 360)`` after rounding.
    * ``h(az)``: ``horizon_at(profile, step, az)``, or ``horizon_flat(h_obs_m)`` without a profile.
    * ``sun_frac = sun_frac(sun_el, h(sun_az))`` (visible fraction of the solar disc), 3 decimals.
    * ``lit = 1`` if ``sun_frac >= 0.5`` (centre of the disc above the local horizon), else 0.
    * ``earth_visible = 1`` if ``earth_el > h(earth_az) + antenna_margin_deg``, else 0 (always
      written: real data must carry it); the margin used is echoed as ``antenna_margin_deg``.
    """
    lat, lon = float(site["lat"]), float(site["lon"])
    elev_m = float(site.get("elev_m", 0.0))
    sun_az, sun_el = azel(lat, lon, elev_m, sun_unit, h_obs_m, parallax=False)
    earth_az, earth_el = azel(lat, lon, elev_m, earth_km, h_obs_m, parallax=True)

    if horizon is None:
        flat = horizon_flat(h_obs_m)
        h_sun = np.full_like(sun_el, flat)
        h_earth = np.full_like(earth_el, flat)
        source = FLAT_HORIZON_SOURCE
    else:
        profile = np.asarray(horizon["elev_deg"], dtype=np.float64)
        step = float(horizon["az_step_deg"])
        h_sun = horizon_at(profile, step, sun_az)
        h_earth = horizon_at(profile, step, earth_az)
        source = str(horizon.get("source", "terrain profile"))

    frac = sun_frac(sun_el, h_sun)
    lit = (frac >= 0.5).astype(np.int8)
    earth_visible = (earth_el > h_earth + antenna_margin_deg).astype(np.int8)

    return {
        "version": 1,
        "mock": False,
        "site_id": str(site["id"]),
        "step_s": int(step_s),
        "t_utc": [str(s) for s in iso_utc(t)],
        "sun_az": _round_az(sun_az),
        "sun_el": (np.round(sun_el, 2) + 0.0).tolist(),  # + 0.0 turns -0.0 into 0.0
        "earth_az": _round_az(earth_az),
        "earth_el": (np.round(earth_el, 2) + 0.0).tolist(),
        "lit": lit.tolist(),
        "earth_visible": earth_visible.tolist(),
        "sun_frac": np.round(frac, 3).tolist(),
        "horizon_source": source,
        "antenna_margin_deg": float(antenna_margin_deg),
    }


def longest_run(mask: Sequence[bool] | np.ndarray) -> int:
    """Length of the longest run of consecutive ``True`` values (0 if none)."""
    m = np.asarray(mask, dtype=bool)
    if not m.any():
        return 0
    padded = np.concatenate([[False], m, [False]]).astype(np.int8)
    edges = np.flatnonzero(np.diff(padded))
    return int((edges[1::2] - edges[0::2]).max())


def window_metrics(ts: Mapping[str, Any]) -> dict[str, float]:
    """Metrics of a ``Timeseries`` over its whole window (shared definitions with TypeScript).

    With ``step_h = step_s / 3600`` and the arrays of ``ts``:

    * ``illum_pct = mean(sun_frac)`` (falls back to ``lit`` if ``sun_frac`` is absent), 0-1.
    * ``sun_el_mean_deg = mean(sun_frac * max(0, sun_el))``: mean solar elevation above the
      mathematical horizon, weighted by the visible disc fraction (0 while hidden), degrees.
    * ``max_dark_hours = longest run of lit == 0`` x ``step_h``.
    * ``earth_vis_pct = mean(earth_visible)``, 0-1.
    * ``max_blackout_hours = longest run of earth_visible == 0`` x ``step_h``.
    * ``sun_earth_pct = mean(sun_frac * earth_visible)``, 0-1.

    Values are returned unrounded; exporters round them for display.
    """
    lit = np.asarray(ts["lit"], dtype=np.int8)
    if lit.size == 0:
        raise ValueError("empty timeseries")
    frac = np.asarray(ts.get("sun_frac", lit), dtype=np.float64)
    sun_el = np.asarray(ts["sun_el"], dtype=np.float64)
    earth = np.asarray(ts["earth_visible"], dtype=np.int8)
    step_h = float(ts.get("step_s", STEP_S)) / 3600.0
    return {
        "illum_pct": float(frac.mean()),
        "sun_el_mean_deg": float((frac * np.maximum(0.0, sun_el)).mean()),
        "max_dark_hours": longest_run(lit == 0) * step_h,
        "earth_vis_pct": float(earth.mean()),
        "max_blackout_hours": longest_run(earth == 0) * step_h,
        "sun_earth_pct": float((frac * earth).mean()),
    }
