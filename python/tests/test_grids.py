from __future__ import annotations

import numpy as np
import pytest

from ephem.timeseries import build_timeseries, window_metrics
from ephem.vectors import load_window
from export.grids import METRICS, _longest_run_rows, grid_metrics, polar_cells

CELLS = [(0.5, 0.5), (0.5, 179.5), (-89.5, 45.0), (-85.2, -120.3), (40.0, -60.0)]


@pytest.fixture(scope="module")
def window():
    return load_window("2027-01-01T00:00:00Z", "2027-04-01T00:00:00Z")


def test_grid_metrics_match_window_metrics(window):
    t, sun, earth = window
    lat = np.array([c[0] for c in CELLS])
    lon = np.array([c[1] for c in CELLS])
    grid = grid_metrics(lat, lon, sun, earth, chunk=2)
    for i, (la, lo) in enumerate(CELLS):
        ts = build_timeseries({"id": "x", "lat": la, "lon": lo, "elev_m": 0.0}, t, sun, earth)
        wm = window_metrics(ts)
        for k, name in enumerate(METRICS):
            assert grid[k, i] == pytest.approx(wm[name], abs=0.01), (la, lo, name)


def test_longest_run_rows():
    m = np.array([[1, 1, 0, 1, 1, 1], [0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1]], dtype=bool)
    assert _longest_run_rows(m).tolist() == [3, 0, 6]


def test_polar_cells_keep_bounds():
    lat, lon, n = polar_cells([-304006, -304006, 304006, 304006], 1737400, 5000)
    assert n == 122 and lat.shape == (122, 122)
    assert lat.min() > -90 and lat[0, 0] > -80  # corners are outside lat_limit -80
    assert abs(lon[0, n // 2]) < 3  # top centre (x~0, y>0) is lon ~0
