from __future__ import annotations

import numpy as np
import pytest

from ephem.timeseries import longest_run, window_metrics
from ephem.topo import (
    R_MOON_KM,
    azel,
    enu_basis,
    horizon_at,
    horizon_flat,
    site_position_km,
    sun_frac,
)

LATLON = [(0, 0), (0, 90), (0, -180), (45, 30), (-45, -120), (-89.9, 0), (89.9, 270), (-90, 37)]


@pytest.mark.parametrize(("lat", "lon"), LATLON)
def test_enu_is_orthonormal_and_right_handed(lat, lon):
    e, n, u = enu_basis(lat, lon)
    m = np.stack([e, n, u])
    np.testing.assert_allclose(m @ m.T, np.eye(3), atol=1e-15)
    np.testing.assert_allclose(np.cross(e, n), u, atol=1e-15)  # E x N = U


@pytest.mark.parametrize(("lat", "lon"), LATLON)
def test_zenith_is_elevation_90(lat, lon):
    _, _, u = enu_basis(lat, lon)
    _, el_sun = azel(lat, lon, 0.0, u, parallax=False)
    assert el_sun == pytest.approx(90.0, abs=1e-6)
    # Earth straight overhead, 380 000 km above the observer (parallax applied).
    earth = site_position_km(lat, lon, 1234.0, 5.0) + 380_000.0 * u
    _, el_earth = azel(lat, lon, 1234.0, earth, h_obs_m=5.0, parallax=True)
    assert el_earth == pytest.approx(90.0, abs=1e-6)


@pytest.mark.parametrize(
    ("vec", "az", "el"),
    [
        ((0, 0, 1), 0.0, 0.0),  # north
        ((0, 1, 0), 90.0, 0.0),  # east
        ((0, 0, -1), 180.0, 0.0),  # south
        ((0, -1, 0), 270.0, 0.0),  # west
        ((1, 0, 0), None, 90.0),  # zenith
        ((1, 0, 1), 0.0, 45.0),
        ((-1, 1, 0), 90.0, -45.0),
    ],
)
def test_known_azimuths_at_equator_prime_meridian(vec, az, el):
    a, e = azel(0.0, 0.0, 0.0, np.array(vec, float), parallax=False)
    if az is not None:
        assert a == pytest.approx(az, abs=1e-12)
    assert e == pytest.approx(el, abs=1e-12)


def test_known_azimuths_at_south_pole():
    # At lat -90, lon 0: N = (1, 0, 0) (along the 0 deg meridian), E = (0, 1, 0), U = (0, 0, -1).
    for vec, az in (((1, 0, 0), 0.0), ((0, 1, 0), 90.0), ((-1, 0, 0), 180.0), ((0, -1, 0), 270.0)):
        a, e = azel(-90.0, 0.0, 0.0, np.array(vec, float), parallax=False)
        assert a == pytest.approx(az, abs=1e-12)
        assert e == pytest.approx(0.0, abs=1e-12)
    _, e = azel(-90.0, 0.0, 0.0, np.array([0.0, 0.0, -1.0]), parallax=False)
    assert e == pytest.approx(90.0)


def test_azimuth_range_never_reaches_360():
    # A vector a hair west of north gives -tiny -> must map into [0, 360), never 360.0.
    _, n, _ = enu_basis(0.0, 0.0)
    vecs = np.array([n + np.array([0, -1e-17, 0]), n + np.array([0, -1e-300, 0]), n])
    a, _ = azel(0.0, 0.0, 0.0, vecs, parallax=False)
    assert np.all((a >= 0) & (a < 360))


def test_vectorised_matches_scalar():
    rng = np.random.default_rng(1)
    vecs = rng.normal(size=(50, 3)) * 1e5
    a, e = azel(-85.0, 40.0, 1500.0, vecs)
    for i in range(0, 50, 7):
        ai, ei = azel(-85.0, 40.0, 1500.0, vecs[i])
        assert a[i] == pytest.approx(float(ai), abs=1e-12)
        assert e[i] == pytest.approx(float(ei), abs=1e-12)


def test_parallax_changes_earth_but_not_sun_direction():
    earth = np.array([384_400.0, 0.0, 0.0])
    _, el_center = azel(0.0, 90.0, 0.0, earth, parallax=False)
    _, el_topo = azel(0.0, 90.0, 0.0, earth, h_obs_m=0.0, parallax=True)
    # Earth on the horizon of the east limb as seen from the centre, below it from the surface.
    assert el_center == pytest.approx(0.0, abs=1e-12)
    assert el_topo == pytest.approx(-np.degrees(np.arctan(R_MOON_KM / 384_400.0)), abs=1e-9)


def test_site_position_radius():
    r = site_position_km(-89.9, 10.0, elev_m=1900.0, h_obs_m=5.0)
    assert np.linalg.norm(r) == pytest.approx(R_MOON_KM + 1.905)


def test_horizon_flat_value():
    assert horizon_flat(5.0) == pytest.approx(-0.1375, abs=1e-4)
    assert horizon_flat(5.0) == pytest.approx(-np.degrees(np.arccos(1737.4 / 1737.405)))
    assert horizon_flat(0.0) == 0.0
    assert horizon_flat(20.0) < horizon_flat(5.0)


def test_horizon_at_interpolates_and_wraps():
    p = [0.0, 10.0, 20.0, 30.0]  # az 0, 90, 180, 270
    assert horizon_at(p, 90.0, 0.0) == 0.0
    assert horizon_at(p, 90.0, 45.0) == pytest.approx(5.0)
    assert horizon_at(p, 90.0, 270.0) == pytest.approx(30.0)
    assert horizon_at(p, 90.0, 315.0) == pytest.approx(15.0)  # between 270 and 360 (= az 0)
    assert horizon_at(p, 90.0, 360.0) == pytest.approx(0.0)
    assert horizon_at(p, 90.0, -45.0) == pytest.approx(15.0)
    np.testing.assert_allclose(horizon_at(p, 90.0, np.array([45.0, 135.0])), [5.0, 15.0])
    fine = np.arange(3600) * 0.1  # value == azimuth: interpolation must return the azimuth
    assert horizon_at(fine, 0.1, 123.45) == pytest.approx(123.45, abs=1e-9)
    with pytest.raises(ValueError):
        horizon_at([0.0, 1.0, 2.0], 90.0, 10.0)


def test_sun_frac_edges():
    r = 0.2666
    assert sun_frac(10.0, 0.0) == 1.0
    assert sun_frac(-10.0, 0.0) == 0.0
    assert sun_frac(r, 0.0) == pytest.approx(1.0)
    assert sun_frac(-r, 0.0) == pytest.approx(0.0)
    assert sun_frac(0.0, 0.0) == pytest.approx(0.5)
    assert sun_frac(1.0, 1.0) == pytest.approx(0.5)  # relative to the horizon
    x = np.linspace(-0.4, 0.4, 81)
    f = sun_frac(x, 0.0)
    assert np.all(np.diff(f) >= 0)  # monotonic
    np.testing.assert_allclose(f + sun_frac(-x, 0.0), 1.0, atol=1e-15)  # symmetric
    # Half radius above the horizon: 1 - (acos(0.5) - 0.5 sqrt(0.75)) / pi
    expected = 1 - (np.arccos(0.5) - 0.5 * np.sqrt(0.75)) / np.pi
    assert sun_frac(r / 2, 0.0) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("mask", "n"),
    [([], 0), ([0, 0], 0), ([1], 1), ([1, 1, 0, 1, 1, 1, 0], 3), ([0, 1, 1], 2), ([1, 1, 1], 3)],
)
def test_longest_run(mask, n):
    assert longest_run(np.array(mask, bool)) == n


def test_window_metrics_definitions():
    ts = {
        "step_s": 3600,
        "lit": [1, 1, 0, 0, 0, 1, 0, 1],
        "sun_frac": [1.0, 0.6, 0.2, 0.0, 0.0, 0.5, 0.4, 1.0],
        "sun_el": [2.0, 0.1, -0.1, -5.0, -5.0, 0.0, -0.05, 1.0],
        "earth_visible": [1, 0, 0, 1, 1, 1, 0, 0],
    }
    m = window_metrics(ts)
    assert m["illum_pct"] == pytest.approx(np.mean(ts["sun_frac"]))
    assert m["sun_el_mean_deg"] == pytest.approx((1.0 * 2.0 + 0.6 * 0.1 + 1.0 * 1.0) / 8)
    assert m["max_dark_hours"] == 3.0
    assert m["earth_vis_pct"] == pytest.approx(4 / 8)
    assert m["max_blackout_hours"] == 2.0
    assert m["sun_earth_pct"] == pytest.approx((1.0 + 0.0 + 0.0 + 0.5) / 8)  # mean(frac*vis)
    # step_h scales the run lengths
    m2 = window_metrics({**ts, "step_s": 1800})
    assert m2["max_dark_hours"] == 1.5 and m2["max_blackout_hours"] == 1.0
    # without sun_frac, illum_pct falls back to lit
    no_frac = {k: v for k, v in ts.items() if k != "sun_frac"}
    assert window_metrics(no_frac)["illum_pct"] == pytest.approx(4 / 8)
