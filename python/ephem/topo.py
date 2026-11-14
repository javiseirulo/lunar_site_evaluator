"""Topocentric geometry on a spherical Moon (pure numpy, no SPICE).

Conventions (identical in the TypeScript port, ``web/src/ephem``; checked by
``contracts/fixtures/golden-azel.json``):

* Sphere of radius ``R_MOON_KM = 1737.4`` km (IAU / pck00011 mean radius, also the LOLA reference).
* ``lat`` planetocentric, ``lon`` east-positive, degrees. Vectors are in ``MOON_ME`` (x towards
  lon 0 on the equator, z towards the north pole).
* Site position ``r_site = (R + elev_m/1000 + h_obs_m/1000) * U`` with
  ``U = (cos lat cos lon, cos lat sin lon, sin lat)``.
* Local basis (ENU): ``E = (-sin lon, cos lon, 0)``,
  ``N = (-sin lat cos lon, -sin lat sin lon, cos lat)``, ``U`` as above.
* ``az = atan2(E.v, N.v)`` in degrees, ``[0, 360)``, clockwise from local north (N=0, E=90).
  ``el = asin(U.v / |v|)`` in degrees, above the *mathematical* horizon (plane normal to U).
* Earth: exact parallax, ``v = earth_km - r_site``. Sun: the unit vector itself (the solar parallax
  from the lunar surface is R/1 au ~ 0.0007 deg).
"""

from __future__ import annotations

import numpy as np

R_MOON_KM = 1737.4
"""Reference sphere radius (km)."""

DEFAULT_H_OBS_M = 5.0
"""Observer height above the terrain (m), decision J0 #4."""

SUN_RADIUS_DEG = 0.2666
"""Apparent angular radius of the Sun seen from the Earth-Moon system (deg), ~0.533 deg disc."""

ArrayLike = float | np.ndarray


def _unit_up(lat_rad: np.ndarray, lon_rad: np.ndarray) -> np.ndarray:
    cl = np.cos(lat_rad)
    return np.stack([cl * np.cos(lon_rad), cl * np.sin(lon_rad), np.sin(lat_rad)], axis=-1)


def enu_basis(lat: ArrayLike, lon: ArrayLike) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Local East, North, Up unit vectors (each ``(..., 3)``) at ``lat``/``lon`` degrees."""
    la, lo = np.radians(lat), np.radians(lon)
    sla, cla, slo, clo = np.sin(la), np.cos(la), np.sin(lo), np.cos(lo)
    e = np.stack([-slo, clo, np.zeros_like(slo)], axis=-1)
    n = np.stack([-sla * clo, -sla * slo, cla], axis=-1)
    u = np.stack([cla * clo, cla * slo, sla], axis=-1)
    return e, n, u


def site_position_km(
    lat: float, lon: float, elev_m: float = 0.0, h_obs_m: float = DEFAULT_H_OBS_M
) -> np.ndarray:
    """Observer position in ``MOON_ME`` (km): ``(R + elev_m/1000 + h_obs_m/1000) * U``."""
    radius = R_MOON_KM + elev_m / 1000.0 + h_obs_m / 1000.0
    return radius * _unit_up(np.radians(lat), np.radians(lon))


def azel(
    lat: float,
    lon: float,
    elev_m: float,
    vec: np.ndarray,
    h_obs_m: float = DEFAULT_H_OBS_M,
    parallax: bool = True,
) -> tuple[np.ndarray, np.ndarray]:
    """Azimuth and elevation (degrees) of ``vec`` (``(3,)`` or ``(n, 3)``, Moon-centred, MOON_ME).

    ``parallax=True`` (Earth): ``v = vec - r_site`` with ``vec`` in km.
    ``parallax=False`` (Sun): ``v = vec`` (any length; only the direction matters).

    ``az`` in ``[0, 360)`` clockwise from local north; ``el`` in ``[-90, 90]``.
    Returns numpy arrays (0-d for a single vector).
    """
    v = np.asarray(vec, dtype=np.float64)
    if parallax:
        v = v - site_position_km(lat, lon, elev_m, h_obs_m)
    e, n, u = enu_basis(lat, lon)
    ve, vn, vu = v @ e, v @ n, v @ u
    az = np.degrees(np.arctan2(ve, vn)) % 360.0
    az = np.where(az >= 360.0, 0.0, az)  # -0.0 % 360 can round up to 360.0
    el = np.degrees(np.arcsin(np.clip(vu / np.linalg.norm(v, axis=-1), -1.0, 1.0)))
    return az, el


def sun_azel(
    lat: float, lon: float, elev_m: float, sun_unit: np.ndarray, h_obs_m: float = DEFAULT_H_OBS_M
) -> tuple[np.ndarray, np.ndarray]:
    """Sun az/el: :func:`azel` without parallax."""
    return azel(lat, lon, elev_m, sun_unit, h_obs_m, parallax=False)


def earth_azel(
    lat: float, lon: float, elev_m: float, earth_km: np.ndarray, h_obs_m: float = DEFAULT_H_OBS_M
) -> tuple[np.ndarray, np.ndarray]:
    """Earth az/el: :func:`azel` with exact parallax."""
    return azel(lat, lon, elev_m, earth_km, h_obs_m, parallax=True)


def horizon_flat(h_obs_m: float = DEFAULT_H_OBS_M, radius_km: float = R_MOON_KM) -> float:
    """Elevation (deg) of the horizon of a smooth sphere seen from ``h_obs_m`` above it.

    ``-degrees(acos(R / (R + h)))``: about -0.1375 deg for 5 m. Used without a terrain profile.
    """
    return float(-np.degrees(np.arccos(radius_km / (radius_km + h_obs_m / 1000.0))))


def horizon_at(profile_elev_deg: np.ndarray, az_step_deg: float, az: ArrayLike) -> np.ndarray:
    """Terrain-horizon elevation (deg) at azimuth ``az``, linear interpolation with wrap-around.

    ``profile_elev_deg[i]`` is the horizon elevation at azimuth ``i * az_step_deg`` (from local
    north, clockwise); the profile must cover exactly 360 deg (``len * az_step_deg == 360``).
    """
    p = np.asarray(profile_elev_deg, dtype=np.float64)
    n = p.size
    if n == 0 or not np.isclose(n * az_step_deg, 360.0):
        raise ValueError(f"profile of {n} values x {az_step_deg} deg does not cover 360 deg")
    x = (np.asarray(az, dtype=np.float64) % 360.0) / az_step_deg
    i0 = np.floor(x)
    f = x - i0
    i0 = i0.astype(np.int64) % n
    i1 = (i0 + 1) % n
    return p[i0] * (1.0 - f) + p[i1] * f


def sun_frac(sun_el: ArrayLike, horizon_el: ArrayLike, radius_deg: float = SUN_RADIUS_DEG):
    """Visible fraction of the solar disc above a straight horizon (0 hidden ... 1 fully visible).

    ``x = clip((sun_el - horizon_el) / radius, -1, 1)``;
    ``frac = 1 - (arccos(x) - x * sqrt(1 - x^2)) / pi``  (circular-segment area).
    ``frac = 0.5`` when the centre of the disc is on the horizon.
    """
    x = np.clip((np.asarray(sun_el, dtype=np.float64) - horizon_el) / radius_deg, -1.0, 1.0)
    return 1.0 - (np.arccos(x) - x * np.sqrt(1.0 - x * x)) / np.pi
