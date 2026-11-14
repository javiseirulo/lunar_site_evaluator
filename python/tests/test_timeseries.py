from __future__ import annotations

import json
import re

import jsonschema
import numpy as np
import pytest

from ephem.kernels import REPO_ROOT
from ephem.timeseries import FLAT_HORIZON_SOURCE, _round_az, build_timeseries, window_metrics
from ephem.vectors import load_window

SCHEMA_PATH = REPO_ROOT / "contracts" / "timeseries.schema.json"
SHACKLETON = {"id": "shackleton_rim_01", "lat": -89.9, "lon": 0.0, "elev_m": 1900}
APOLLO = {"id": "apollo_11", "lat": 0.67408, "lon": 23.47297, "elev_m": -1900}
CHANGE4 = {"id": "change_4", "lat": -45.4446, "lon": 177.5991, "elev_m": -5900}


@pytest.fixture(scope="module")
def window():
    return load_window("2027-01-01T00:00:00Z", "2027-01-31T00:00:00Z")


@pytest.fixture(scope="module")
def validator():
    schema = json.loads(SCHEMA_PATH.read_text())
    cls = jsonschema.validators.validator_for(schema)
    cls.check_schema(schema)
    return cls(schema, format_checker=cls.FORMAT_CHECKER)


@pytest.mark.parametrize("site", [SHACKLETON, APOLLO, CHANGE4], ids=lambda s: s["id"])
def test_timeseries_matches_schema(site, window, validator):
    ts = build_timeseries(site, *window)
    validator.validate(ts)
    # sun_frac / horizon_source / antenna_margin_deg (contract v1.1) must not be rejected either:
    # the v1 schema has no "additionalProperties": false.
    assert {"sun_frac", "horizon_source", "antenna_margin_deg"} <= ts.keys()
    n = len(ts["t_utc"])
    assert n == 30 * 24
    for key in ("sun_az", "sun_el", "earth_az", "earth_el", "lit", "earth_visible", "sun_frac"):
        assert len(ts[key]) == n, key
    assert ts["mock"] is False and ts["version"] == 1 and ts["step_s"] == 3600
    assert ts["horizon_source"] == FLAT_HORIZON_SOURCE
    assert ts["antenna_margin_deg"] == 2.0
    assert all(re.fullmatch(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ", t) for t in ts["t_utc"])
    assert ts["t_utc"][0] == "2027-01-01T00:00:00Z"
    assert all(0 <= a < 360 for a in ts["sun_az"] + ts["earth_az"])
    assert all(round(x, 2) == x for x in ts["sun_el"][:50] + ts["earth_az"][:50])
    assert all(round(x, 3) == x for x in ts["sun_frac"])
    assert set(ts["lit"]) <= {0, 1} and set(ts["earth_visible"]) <= {0, 1}
    # lit is defined on the unrounded sun_frac >= 0.5
    for lit, frac in zip(ts["lit"], ts["sun_frac"], strict=True):
        assert (frac >= 0.5005) <= lit and lit <= (frac >= 0.4995)
    json.dumps(ts, allow_nan=False)


def test_physics_sanity(window):
    ap = window_metrics(build_timeseries(APOLLO, *window))
    ce = window_metrics(build_timeseries(CHANGE4, *window))
    sh = window_metrics(build_timeseries(SHACKLETON, *window))
    assert (
        ap["earth_vis_pct"] == 1.0 and ap["max_blackout_hours"] == 0
    )  # near side: Earth always up
    assert ce["earth_vis_pct"] == 0.0 and ce["sun_earth_pct"] == 0.0  # far side: never
    assert 0.4 < ap["illum_pct"] < 0.6  # ~14.8 d day / 14.8 d night
    assert 250 < ap["max_dark_hours"] <= 360  # lunar night ~354 h, may be cut by window
    for m in (ap, ce, sh):
        assert 0 <= m["illum_pct"] <= 1 and 0 <= m["sun_el_mean_deg"] <= 90
    assert sh["sun_el_mean_deg"] < 2  # polar Sun skims the horizon


def test_horizon_profile_is_used(window):
    up = {"elev_deg": [89.0] * 360, "az_step_deg": 1.0, "source": "wall"}
    down = {"elev_deg": [-89.0] * 3600, "az_step_deg": 0.1, "source": "pit"}
    ts_up = build_timeseries(SHACKLETON, *window, horizon=up)
    ts_down = build_timeseries(SHACKLETON, *window, horizon=down)
    assert set(ts_up["lit"]) == {0} and set(ts_up["earth_visible"]) == {0}
    assert set(ts_down["lit"]) == {1} and set(ts_down["earth_visible"]) == {1}
    assert ts_up["horizon_source"] == "wall" and ts_down["horizon_source"] == "pit"


def test_antenna_margin(window):
    lo = build_timeseries(SHACKLETON, *window, antenna_margin_deg=0.0)
    hi = build_timeseries(SHACKLETON, *window, antenna_margin_deg=5.0)
    assert hi["antenna_margin_deg"] == 5.0
    assert sum(hi["earth_visible"]) < sum(lo["earth_visible"])
    assert all(h <= lo_ for h, lo_ in zip(hi["earth_visible"], lo["earth_visible"], strict=True))


def test_azimuth_rounding_wraps_to_zero():
    out = _round_az(np.array([359.996, 359.994, 0.004, 180.0]))
    assert out == [0.0, 359.99, 0.0, 180.0]
    assert all(0 <= a < 360 for a in out)
