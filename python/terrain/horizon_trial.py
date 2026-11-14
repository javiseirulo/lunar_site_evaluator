"""Experimental spherical lunar horizons, independent of Cesium. AI-assisted: Codex.

No refraction, no production accuracy claim. Azimuth is clockwise from local
north. Raw DEMs only; never use the decimated visual heightmap.
"""
import argparse
import json
import time
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import Window

from .export_polar import same_projection
from rasterio.crs import CRS

ROOT = Path(__file__).resolve().parents[2]
RADIUS = 1737400.0
POLAR_CRS = CRS.from_string(f"+proj=stere +lat_0=-90 +lat_ts=-90 +lon_0=0 +R={RADIUS} +units=m")


def destination(lat, lon, bearings, distances, radius=RADIUS):
    """Great-circle destinations using vectors; defined at both poles/dateline."""
    lat, lon = np.deg2rad([lat, lon])
    bearing = np.deg2rad(np.asarray(bearings))[:, None]
    theta = np.asarray(distances)[None, :] / radius
    p = np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])
    north = np.array([-np.sin(lat) * np.cos(lon), -np.sin(lat) * np.sin(lon), np.cos(lat)])
    east = np.array([-np.sin(lon), np.cos(lon), 0])
    direction = np.cos(bearing)[..., None] * north + np.sin(bearing)[..., None] * east
    points = np.cos(theta)[..., None] * p + np.sin(theta)[..., None] * direction
    return (np.rad2deg(np.arctan2(points[..., 2], np.hypot(points[..., 0], points[..., 1]))),
            np.rad2deg(np.arctan2(points[..., 1], points[..., 0])))


def elevation_angle(distance, target_height, ground_height, observer_height=5.0, radius=RADIUS):
    theta = np.asarray(distance) / radius
    target_radius = radius + np.asarray(target_height)
    return np.rad2deg(np.arctan2(target_radius * np.cos(theta) -
                                (radius + ground_height + observer_height),
                                target_radius * np.sin(theta)))


def polar_xy(lat, lon):
    rho = 2 * RADIUS * np.tan(np.deg2rad((90 + np.asarray(lat)) / 2))
    lon = np.deg2rad(lon)
    return rho * np.sin(lon), rho * np.cos(lon)


def bilinear(values, row, col, wrap=False):
    """Require all four contributors; holes are unknown, never zero-filled."""
    r0, c0 = np.floor(row).astype(int), np.floor(col).astype(int)
    valid = (r0 >= 0) & (r0 + 1 < values.shape[0])
    if not wrap:
        valid &= (c0 >= 0) & (c0 + 1 < values.shape[1])
    rr = np.clip(r0, 0, values.shape[0] - 2)
    cc = c0 % values.shape[1] if wrap else np.clip(c0, 0, values.shape[1] - 2)
    c1 = (cc + 1) % values.shape[1]
    a, b, c, d = values[rr, cc], values[rr, c1], values[rr + 1, cc], values[rr + 1, c1]
    fy, fx = row - r0, col - c0
    result = a * (1 - fy) * (1 - fx) + b * (1 - fy) * fx + c * fy * (1 - fx) + d * fy * fx
    return np.where(valid & np.isfinite(a + b + c + d), result, np.nan)


class PolarDem:
    def __init__(self, path, lat, lon, reach):
        self.path = Path(path)
        with rasterio.open(path) as ds:
            if not same_projection(ds.crs, POLAR_CRS) or ds.count != 1:
                raise ValueError("Unexpected lunar DEM projection")
            edge_lat, edge_lon = destination(lat, lon, np.arange(0, 360, 2), [reach])
            x, y = polar_xy(edge_lat, edge_lon)
            ox, oy = polar_xy(lat, lon)
            inv = ~ds.transform
            cols, rows = inv * (np.append(x, ox), np.append(y, oy))
            c0, r0 = max(0, int(np.floor(cols.min())) - 2), max(0, int(np.floor(rows.min())) - 2)
            c1, r1 = min(ds.width, int(np.ceil(cols.max())) + 2), min(ds.height, int(np.ceil(rows.max())) + 2)
            self.values = None
            if c1 <= c0 or r1 <= r0:
                return
            window = Window(c0, r0, c1 - c0, r1 - r0)
            self.values = ds.read(1, window=window, masked=True).filled(np.nan)
            self.values = self.values * ds.scales[0] + ds.offsets[0]
            self.transform = ~ds.window_transform(window)

    def sample(self, lat, lon):
        if self.values is None:
            return np.full(np.broadcast_arrays(lat, lon)[0].shape, np.nan)
        x, y = polar_xy(lat, lon)
        col, row = self.transform * (x, y)
        return bilinear(self.values, row - .5, col - .5)


class GlobalDem:
    def __init__(self, path):
        if Path(path).stat().st_size != 530841600:
            raise ValueError("Expected complete LDEM_64 IMG and verified PDS label")
        self.values = np.memmap(path, dtype="<i2", mode="r", shape=(11520, 23040))

    def sample(self, lat, lon):
        row = (90 - np.asarray(lat)) * 64 - .5
        col = (np.asarray(lon) % 360) * 64 - .5
        # At the polar half-cell, nearest valid row; no invented outside-Moon data.
        row = np.clip(row, 0, self.values.shape[0] - 1.000001)
        result = bilinear(self.values, row, col, wrap=True) * .5
        return np.where((result >= -9125.5) & (result <= 10773), result, np.nan)


def radial_samples(max_range, refinement=1):
    rings = [(0, 5000, 5), (5000, 80000, 80), (80000, max_range, 240)]
    result = [np.arange(start + step / refinement, min(end, max_range), step / refinement)
              for start, end, step in rings if start < max_range]
    boundaries = [d for d in (5000, 80000, 150000, 200000, 300000, max_range) if d <= max_range]
    return np.unique(np.concatenate([*result, boundaries]))


def compute(lat, lon, root, az_step=1.0, max_range=310000, refinement=1):
    if not (-90 <= lat <= 90 and np.isfinite(lon) and az_step in (.1, .5, 1, 5)
            and 1000 <= max_range <= 310000 and refinement in (1, 2, 4)):
        raise ValueError("Invalid trial coordinates or resolution")
    started = time.monotonic()
    global_path = root / "lola-global-64ppd/ldem_64.img"
    global_dem = GlobalDem(global_path) if global_path.is_file() else None
    layers = []
    if lat <= -70:
        for name, filename, reach in [
            ("lola-south-pole-5m", "ldem_87s_5mpp.tif", 5000),
            ("lola-south-pole-80m", "LDEM_80S_80MPP_ADJ.TIF", 80000),
            ("lola-south-pole-far-240m", "LDEM_60S_240MPP_ADJ.TIF", max_range),
        ]:
            path = root / name / filename
            if path.is_file():
                layers.append((name, reach, PolarDem(path, lat, lon, reach)))
    distances = radial_samples(max_range, refinement)
    ground = np.nan
    for _, _, dem in layers:
        ground = float(dem.sample(np.array([lat]), np.array([lon]))[0])
        if np.isfinite(ground):
            break
    if not np.isfinite(ground) and global_dem:
        ground = float(global_dem.sample(np.array([lat]), np.array([lon]))[0])
    if not np.isfinite(ground):
        raise ValueError("Observer ground is outside available DEM coverage")
    azimuths = np.arange(0, 360, az_step)
    horizons, peaks, complete, by_range = [], [], [], {str(k): [] for k in (150000, 200000, 300000, 310000) if k <= max_range}
    source_counts = {name: 0 for name, _, _ in layers}
    source_counts["lola-global-64ppd"] = 0
    for start in range(0, len(azimuths), 64):
        bearings = azimuths[start:start + 64]
        ll, ln = destination(lat, lon, bearings, distances)
        heights = np.full(ll.shape, np.nan)
        for name, reach, dem in layers:
            columns = distances <= reach
            values = dem.sample(ll[:, columns], ln[:, columns])
            replace = ~np.isfinite(heights[:, columns]) & np.isfinite(values)
            heights[:, columns] = np.where(replace, values, heights[:, columns])
            source_counts[name] += int(replace.sum())
        if global_dem:
            missing = ~np.isfinite(heights)
            heights[missing] = global_dem.sample(ll[missing], ln[missing])
            source_counts["lola-global-64ppd"] += int(np.count_nonzero(missing & np.isfinite(heights)))
        angles = elevation_angle(distances, heights, ground)
        ok = np.isfinite(angles).all(axis=1)
        indices = np.argmax(np.where(np.isfinite(angles), angles, -np.inf), axis=1)
        maxima = angles[np.arange(len(bearings)), indices]
        horizons.extend(float(v) if good else None for v, good in zip(maxima, ok))
        peaks.extend(float(distances[i]) if good else None for i, good in zip(indices, ok))
        complete.extend(bool(good) for good in ok)
        for radius, values in by_range.items():
            subset = angles[:, distances <= int(radius)]
            valid = np.isfinite(subset).all(axis=1)
            maxima = np.max(np.where(np.isfinite(subset), subset, -np.inf), axis=1)
            values.extend(float(v) if good else None for v, good in zip(maxima, valid))
    return {"version": 1, "status": "experimental_not_for_mission_scoring", "mock": False,
            "lat": lat, "lon": lon, "reference_frame": "MOON_ME_DE421", "radius_m": RADIUS,
            "observer_height_m": 5, "observer_ground_m": ground, "az_step_deg": az_step,
            "site_id": "unassigned_trial", "source": "; ".join(k for k, v in source_counts.items() if v),
            "max_range_m": max_range, "max_range_km": max_range / 1000,
            "azimuth_deg": azimuths.tolist(), "elev_deg": horizons,
            "peak_distance_m": peaks, "complete": complete, "source_sample_counts": source_counts,
            "range_comparison_deg": by_range, "radial_refinement": refinement,
            "elapsed_s": round(time.monotonic() - started, 3),
            "limitations": ["Spatially sampled surface; narrow peaks can be missed.",
                            "Global fallback is 64 pixels/degree, not metre-scale terrain.",
                            "No refraction; no Sun/Earth ephemerides; not a visibility result.",
                            "Convergence criterion is numerical, not DEM accuracy certification."],
            "attribution": "NASA LRO LOLA / PGDA / PDS; implementation assisted by OpenAI Codex"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lon", type=float, required=True)
    parser.add_argument("--az-step", type=float, default=1)
    parser.add_argument("--max-range", type=float, default=310000)
    parser.add_argument("--refinement", type=int, default=1)
    parser.add_argument("--terrain-root", type=Path, default=ROOT / "data/terrain")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--site-id", default="unassigned_trial")
    args = parser.parse_args()
    if args.output.exists():
        raise FileExistsError("Refuse to overwrite a computed trial")
    profile = compute(args.lat, args.lon, args.terrain_root, args.az_step, args.max_range, args.refinement)
    profile["site_id"] = args.site_id
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(profile, separators=(",", ":"), allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    print(f"{args.output}: {len(profile['elev_deg'])} azimuths, {profile['elapsed_s']} s")


if __name__ == "__main__":
    main()
