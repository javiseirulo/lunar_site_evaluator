from __future__ import annotations

import calendar
import json

import numpy as np
import pytest

from ephem import vectors as v
from ephem.kernels import ME_FRAME


def test_hours_of_year():
    t = v.hours_of_year(2028)
    assert t.size == 8784
    assert str(t[0]) == "2028-01-01T00:00:00"
    assert str(t[-1]) == "2028-12-31T23:00:00"
    assert v.hours_of_year(2027).size == 8760


def test_iso_utc_has_no_milliseconds():
    t = np.array(["2027-01-01T00:00:00", "2027-06-30T12:34:56"], dtype="datetime64[s]")
    assert list(v.iso_utc(t)) == ["2027-01-01T00:00:00Z", "2027-06-30T12:34:56Z"]
    assert v.iso_utc(t[0]) == "2027-01-01T00:00:00Z"
    assert v.to_datetime64("2027-01-01T05:00:00Z") == np.datetime64("2027-01-01T05:00:00")


def test_committed_index_matches_files():
    index = v.read_index()
    assert index["version"] == 1
    assert index["frame"] == ME_FRAME == "MOON_ME"
    assert index["spice_frame"] == v.SPICE_FRAME
    assert index["observer"] == "MOON" and index["abcorr"] == "LT+S"
    assert index["dtype"] == "float32-le" and index["step_s"] == 3600
    assert index["layout"] == list(v.LAYOUT)
    assert index["start_utc"] == "2026-01-01T00:00:00Z"
    assert index["end_utc"] == "2055-12-31T23:00:00Z"
    assert not index["generated_utc"].endswith(".000Z") and index["generated_utc"].endswith("Z")
    years = [y["year"] for y in index["years"]]
    assert years == list(range(2026, 2056))
    for y in index["years"]:
        n = 8784 if calendar.isleap(y["year"]) else 8760
        assert y["n"] == n
        assert y["start_utc"] == f"{y['year']}-01-01T00:00:00Z"
        assert (v.EPHEM_DIR / y["file"]).stat().st_size == n * 6 * 4
    assert (v.EPHEM_DIR / "2026.bin").stat().st_size == 210240


def test_committed_vectors_are_physical():
    t, sun, earth = v.load_vectors("2026-01-01T00:00:00Z", "2055-12-31T23:00:00Z")
    assert t.size == sum(8784 if calendar.isleap(y) else 8760 for y in range(2026, 2056))
    np.testing.assert_allclose(np.linalg.norm(sun, axis=1), 1.0, atol=1e-6)
    d = np.linalg.norm(earth, axis=1)
    assert 355_000 < d.min() and d.max() < 407_500  # perigee / apogee range
    # Mean-Earth frame: the Earth stays near +X (libration of a few degrees).
    lon = np.degrees(np.arctan2(earth[:, 1], earth[:, 0]))
    lat = np.degrees(np.arcsin(earth[:, 2] / d))
    assert np.abs(lon).max() < 9 and np.abs(lat).max() < 8
    # The Sun goes round the Moon once per synodic month (~29.53 d) in MOON_ME.
    sun_lon = np.unwrap(np.arctan2(sun[:, 1], sun[:, 0]))
    turns = abs(sun_lon[-1] - sun_lon[0]) / (2 * np.pi)
    assert turns == pytest.approx(t.size / 24 / 29.530589, rel=1e-3)


def _write_synthetic(tmp_path, years):
    entries = []
    for y in years:
        n = v.hours_of_year(y).size
        k = np.arange(n, dtype=np.float64)
        data = np.stack([np.cos(k / 100), np.sin(k / 100), 0 * k, 1e5 + k, -k, y + 0 * k], axis=1)
        data.astype("<f4").tofile(tmp_path / f"{y}.bin")
        entries.append({"year": y, "file": f"{y}.bin", "start_utc": f"{y}-01-01T00:00:00Z", "n": n})
    v.write_index(entries, tmp_path)
    return entries


def test_loader_round_trip_across_years(tmp_path):
    _write_synthetic(tmp_path, [2030, 2031])
    index = json.loads((tmp_path / "index.json").read_text())
    assert index["end_utc"] == "2031-12-31T23:00:00Z"
    t, sun, earth = v.load_vectors("2030-12-31T22:00:00Z", "2031-01-01T01:00:00Z", tmp_path)
    assert list(v.iso_utc(t)) == [
        "2030-12-31T22:00:00Z",
        "2030-12-31T23:00:00Z",
        "2031-01-01T00:00:00Z",
        "2031-01-01T01:00:00Z",
    ]
    np.testing.assert_array_equal(earth[:, 2], [2030, 2030, 2031, 2031])
    np.testing.assert_array_equal(earth[:, 0], np.float32([1e5 + 8758, 1e5 + 8759, 1e5, 1e5 + 1]))
    assert sun.dtype == np.float64
    # inclusive single sample
    t1, _, e1 = v.load_vectors("2031-01-01T01:00:00Z", "2031-01-01T01:00:00Z", tmp_path)
    assert t1.size == 1 and e1[0, 0] == pytest.approx(1e5 + 1)
    with pytest.raises(ValueError):
        v.load_vectors("2040-01-01T00:00:00Z", "2040-01-02T00:00:00Z", tmp_path)


def test_interp_vectors(tmp_path):
    _write_synthetic(tmp_path, [2030, 2031])
    t = np.array(
        ["2030-06-01T10:00:00", "2030-06-01T10:30:00", "2030-12-31T23:15:00"], "datetime64[s]"
    )
    sun, earth = v.interp_vectors(t, tmp_path)
    k = (np.datetime64("2030-06-01T10:00:00") - np.datetime64("2030-01-01T00:00:00")).astype(int)
    k //= 3600
    assert earth[0, 0] == pytest.approx(np.float32(1e5 + k))
    assert earth[1, 0] == pytest.approx(1e5 + k + 0.5, abs=1e-2)  # midpoint
    assert earth[2, 2] == pytest.approx(2030.25)  # across the year boundary
    np.testing.assert_allclose(np.linalg.norm(sun, axis=1), 1.0, atol=1e-12)


def test_bin_matches_spice(kernels):
    """The committed 2026.bin equals a fresh SPICE computation to float32 precision."""
    data = v.compute_year(2026)
    stored = v.read_year(2026).astype(np.float64)
    np.testing.assert_allclose(stored[:, :3], data[:, :3], atol=1e-7)
    np.testing.assert_allclose(stored[:, 3:], data[:, 3:], atol=0.05)  # km, float32 at 4e5


def test_moon_me_alias_is_identity(kernels):
    ets = v.utc_to_et(v.hours_of_year(2040)[::97])
    a = v.spice_vectors(ets, frame="MOON_ME")
    b = v.spice_vectors(ets, frame=v.SPICE_FRAME)
    np.testing.assert_array_equal(a[0], b[0])
    np.testing.assert_array_equal(a[1], b[1])
    from ephem.kernels import frame_info

    assert frame_info("MOON_ME")["resolved_name"] == "MOON_ME_DE440_ME421"


def test_load_window_half_open():
    t, _, _ = v.load_window("2027-01-01T00:30:00Z", "2027-01-01T05:00:00Z")
    assert str(t[0]) == "2027-01-01T01:00:00" and t.size == 4  # 01,02,03,04; 05 excluded
    assert t.size * v.STEP_S == 4 * 3600
    t2, _, _ = v.load_window("2027-01-01T00:00:00Z", "2027-01-01T05:00:01Z")
    assert t2.size == 6
