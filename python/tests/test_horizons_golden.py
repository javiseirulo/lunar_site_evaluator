"""Offline checks against the committed Horizons answers and the golden fixture."""

from __future__ import annotations

import json

import numpy as np
import pytest

from ephem import golden, jsonfmt
from ephem import horizons_check as hc
from ephem.topo import azel, horizon_flat, sun_frac

SAMPLE = """\
*******************************************************************************
Target body name: Sun (10)                        {source: DE441}
Center body name: Moon (301)                      {source: DE441}
Center geodetic : 23.47297, .67408, 0.0           {E-lon(deg),Lat(deg),Alt(km)}
Center pole/equ : MEAN_ME (high precision)        {East-longitude positive}
Center radii    : 1737.4, 1737.4, 1737.4 km       {Equator_a, b, pole_c}
Atmos refraction: NO (AIRLESS)
 Date__(UT)__HR:MN:SC.fff, , ,Azimuth_(a-app), Elevation_(a-app),
$$SOE
 2031-Aug-11 17:45:00.000, ,i,  268.570018863,     -37.422890515,
 2042-Jun-21 12:00:00.000,*,i,   88.084608366,      26.061651645,
$$EOE
"""


def test_parse_result():
    rows, header = hc.parse_result(SAMPLE)
    assert rows == [
        ("2031-08-11T17:45:00Z", 268.570018863, -37.422890515),
        ("2042-06-21T12:00:00Z", 88.084608366, 26.061651645),
    ]
    assert header["ephemeris"] == "DE441"
    assert header["center_pole_equ"].startswith("MEAN_ME")
    assert header["center_radii"].startswith("1737.4, 1737.4, 1737.4")
    with pytest.raises(ValueError):
        hc.parse_result("no table here")


def test_build_query_encoding():
    q = hc.build_query("399", -89.45, -137.0, ["2031-08-11T17:45:00Z", "2042-06-21T12:00:00Z"])
    assert "CENTER=%27coord%40301%27" in q
    assert "SITE_COORD=%27223.000000%2C-89.450000%2C0.000000%27" in q  # east longitude in [0, 360)
    assert "TLIST=%272031-08-11%2017%3A45%3A00%27%20%272042-06-21%2012%3A00%3A00%27" in q
    assert "COMMAND=%27399%27" in q and "format=json" in q and " " not in q


def test_reference_is_complete():
    ref = hc.load_reference()
    assert hc.reference_is_complete(ref)
    assert ref["header"]["center_pole_equ"].startswith("MEAN_ME")
    assert ref["header"]["center_radii"].startswith("1737.4, 1737.4, 1737.4")


def test_bin_path_agrees_with_horizons():
    """The web path (.bin float32 + linear interpolation + azel) vs Horizons: < 1e-3 deg."""
    ref = hc.load_reference()
    d = hc.differences(ref["rows"], hc.ours_bin(ref["rows"]))
    worst = {k: float(np.abs(x).max()) for k, x in d.items()}
    assert max(worst.values()) < hc.TARGET_DEG
    assert max(worst.values()) < 1e-3, worst


def test_spice_path_agrees_with_horizons(kernels):
    ref = hc.load_reference()
    d = hc.differences(ref["rows"], hc.ours_spice(ref["rows"]))
    assert max(float(np.abs(x).max()) for x in d.values()) < 1e-3
    d = hc.differences(ref["rows"], hc.ours_azlcpo(ref["rows"]))
    assert max(float(np.abs(x).max()) for x in d.values()) < 1e-5


def _close(a, b) -> bool:
    if isinstance(a, dict):
        return isinstance(b, dict) and a.keys() == b.keys() and all(_close(a[k], b[k]) for k in a)
    if isinstance(a, list):
        return isinstance(b, list) and len(a) == len(b) and all(map(_close, a, b))
    if isinstance(a, float) or isinstance(b, float):
        return abs(a - b) <= 1e-9 * max(1.0, abs(a))
    return a == b


def test_golden_fixture_is_up_to_date():
    stored = json.loads(golden.GOLDEN_PATH.read_text())
    # Values may differ in the last ulp across platforms (macOS vs Linux libm).
    assert _close(stored, golden.build_golden()), "run: uv run python -m ephem.golden"
    assert golden.GOLDEN_PATH.read_text() == jsonfmt.dumps(stored)  # Prettier-style layout


def test_golden_cases_are_self_consistent():
    g = json.loads(golden.GOLDEN_PATH.read_text())
    assert g["R_km"] == 1737.4 and g["observer_height_m"] == 5 and g["sun_radius_deg"] == 0.2666
    assert len(g["cases"]) >= 20 and len(g["horizons"]) == len(hc.SITES) * len(hc.EPOCHS)
    lats = [c["lat"] for c in g["cases"]]
    assert min(lats) == -90 and max(lats) == 90
    for c in g["cases"]:
        s_az, s_el = azel(c["lat"], c["lon"], c["elev_m"], np.array(c["sun_unit"]), 5, False)
        e_az, e_el = azel(c["lat"], c["lon"], c["elev_m"], np.array(c["earth_km"]), 5, True)
        assert float(s_az) == c["sun_az"] and float(s_el) == c["sun_el"]
        assert float(e_az) == c["earth_az"] and float(e_el) == c["earth_el"]
        assert c["horizon_flat_deg"] == horizon_flat(5)
        assert c["sun_frac_flat"] == float(sun_frac(c["sun_el"], c["horizon_flat_deg"]))


def test_jsonfmt_layout():
    text = jsonfmt.dumps({"a": [1.0, 2.5, -0.0], "b": {"c": "x"}, "d": [], "e": [{"f": 1}]})
    assert text == (
        '{\n  "a": [1.0, 2.5, -0.0],\n  "b": {\n    "c": "x"\n  },\n  "d": [],\n'
        '  "e": [\n    {\n      "f": 1\n    }\n  ]\n}\n'
    )
    long = jsonfmt.dumps({"k": ["x" * 30] * 4})
    assert long.count("\n") == 8  # broken one per line once it exceeds 100 columns
    assert jsonfmt.dumps({"nan": float("nan")}) == '{\n  "nan": null\n}\n'
