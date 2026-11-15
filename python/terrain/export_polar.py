"""Produce the team's polar mesh and terrain layers. AI-assisted: OpenAI Codex.

Only documented LOLA height (metres) and slope (degrees) products are accepted.
No illumination, horizon, score or landing-safety result is inferred here.
"""

import argparse
import csv
import hashlib
import json
import platform
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio
from affine import Affine
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject

ROOT = Path(__file__).resolve().parents[2]
FRAME = "MOON_ME_DE421"


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")


def fingerprint(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def project(lat, lon, radius):
    rho = 2 * radius * np.tan(np.deg2rad((90 + lat) / 2))
    return float(rho * np.sin(np.deg2rad(lon))), float(rho * np.cos(np.deg2rad(lon)))


def grid(manifest, size, registration):
    left, bottom, right, top = manifest["bounds_m"]
    if not (2 <= size <= 4097 and left < right and bottom < top):
        raise ValueError("Invalid grid dimensions or bounds")
    if registration == "vertices":
        dx, dy = (right - left) / (size - 1), (top - bottom) / (size - 1)
        # GDAL addresses pixel centres; move the pixel edge half a sample out.
        transform = Affine(dx, 0, left - dx / 2, 0, -dy, top + dy / 2)
    elif registration == "pixel_centres":
        transform = from_bounds(left, bottom, right, top, size, size)
    else:
        raise ValueError("Unknown sample registration")
    x = transform.c + (np.arange(size) + 0.5) * transform.a
    y = transform.f + (np.arange(size) + 0.5) * transform.e
    cap_radius = 2 * manifest["radius_m"] * np.tan(np.deg2rad((90 + manifest["lat_limit"]) / 2))
    cap = y[:, None] ** 2 + x[None, :] ** 2 <= cap_radius ** 2
    return transform, cap


def resample(source, manifest, size, registration, method):
    transform, cap = grid(manifest, size, registration)
    values = np.full((size, size), np.nan, dtype="float32")
    with rasterio.open(source) as dataset:
        if dataset.count != 1 or not same_projection(dataset.crs, CRS.from_string(manifest["projection"])):
            raise ValueError("Expected a single-band DEM on the shared lunar projection")
        reproject(rasterio.band(dataset, 1), values, dst_transform=transform,
                  dst_crs=dataset.crs, dst_nodata=np.nan, resampling=method,
                  init_dest_nodata=True, num_threads=2)
        values = (values.astype("float64") * dataset.scales[0] + dataset.offsets[0]).astype("float32")
    values[~cap | ~np.isfinite(values)] = np.nan
    return values, transform


def same_projection(left, right):
    """GeoTIFF rewrites polar k=1 as lat_ts=-90; GDAL's equality misses that."""
    def canonical(crs):
        if crs is None:
            return None
        params = crs.to_dict()
        params.pop("no_defs", None)
        if params.get("proj") == "stere" and params.get("lat_0") in (-90, 90):
            if params.get("lat_ts") == params.get("lat_0") and params.get("k", 1) == 1:
                params.pop("lat_ts")
                params["k"] = 1
        return params
    return canonical(left) == canonical(right)


def source_info(path, catalog):
    path = Path(path)
    if path.suffix.lower() != ".tif" or not path.is_file():
        raise ValueError("A complete .tif source is required")
    item = next((item for item in catalog["sources"] if item["filename"] == path.name), None)
    if item is None or path.stat().st_size != item["expected_bytes"]:
        raise ValueError("Source is absent from the catalog or has the wrong length")
    with rasterio.open(path) as dataset:
        metadata = {"crs_wkt": dataset.crs.to_wkt(), "bounds_m": list(dataset.bounds),
                    "width_px": dataset.width, "height_px": dataset.height,
                    "pixel_spacing_m": list(dataset.res), "band_scale": dataset.scales[0],
                    "band_offset": dataset.offsets[0], "nodata": str(dataset.nodata)}
    return {**item, "sha256_local": fingerprint(path), "raster": metadata}


def write_tiff(path, values, transform, projection, units):
    with rasterio.open(path, "w", driver="GTiff", width=values.shape[1],
                       height=values.shape[0], count=1, dtype="float32", nodata=np.nan,
                       transform=transform, crs=projection, compress="deflate") as target:
        target.write(values, 1)
        target.set_band_unit(1, units)


def write_layer(path, values):
    valid = np.isfinite(values)
    if not valid.any():
        raise ValueError("No valid layer samples")
    low, high = float(values[valid].min()), float(values[valid].max())
    encoded = np.zeros(values.shape, dtype="uint8")
    if high > low:
        encoded[valid] = np.rint((values[valid] - low) * 255 / (high - low)).astype("uint8")
    with rasterio.open(path, "w", driver="PNG", width=values.shape[1], height=values.shape[0],
                       count=2, dtype="uint8") as target:
        target.write(encoded, 1)
        target.write(valid.astype("uint8") * 255, 2)
        target.colorinterp = (rasterio.enums.ColorInterp.gray, rasterio.enums.ColorInterp.alpha)
    return [low, high]


def sample_sites(height_source, slope_source, sites, radius, lat_limit):
    result = []
    with rasterio.open(height_source) as heights, rasterio.open(slope_source) as slopes:
        for site in sites["sites"]:
            lat, lon = site["lat"], site["lon"]
            x, y = project(lat, lon, radius)
            values = {}
            for name, dataset in (("elevation_m", heights), ("slope_deg", slopes)):
                raw = next(dataset.sample([(x, y)], masked=True))[0]
                value = None if np.ma.is_masked(raw) else float(raw * dataset.scales[0] + dataset.offsets[0])
                if value is not None and (not np.isfinite(value) or not -90 <= lat <= lat_limit):
                    value = None
                values[name] = value
            result.append({"id": site["id"], "lat": lat, "lon": lon, "x_m": x, "y_m": y,
                           **values, "terrain_valid": all(v is not None for v in values.values())})
    return result


def export_polar(height_source, slope_source, layers_file, sites_file, output, *, catalog_file,
                 size=1025, verification_output=None):
    layers = json.loads(Path(layers_file).read_text(encoding="utf-8"))
    sites = json.loads(Path(sites_file).read_text(encoding="utf-8"))
    catalog = json.loads(Path(catalog_file).read_text(encoding="utf-8"))
    if layers["width_px"] != layers["height_px"] or layers["radius_m"] != 1737400:
        raise ValueError("Expected the team's square lunar polar window")
    height_info, slope_info = source_info(height_source, catalog), source_info(slope_source, catalog)
    if height_info["quantity"] != "surface height, meters" or slope_info["quantity"] != "publisher digital slope map, degrees":
        raise ValueError("Height and slope source quantities must be explicit")
    for item in (height_info, slope_info):
        if item["reference_frame"] != "MOON_ME, JPL DE421":
            raise ValueError("Unsupported lunar frame")
    mesh, transform = resample(height_source, layers, size, "vertices", Resampling.bilinear)
    valid = np.isfinite(mesh)
    if not valid.any():
        raise ValueError("No valid mesh samples")
    # Produce display layers at the existing texture dimensions, using area means.
    texture_size = layers["width_px"]
    elevation, texture_transform = resample(height_source, layers, texture_size, "pixel_centres", Resampling.average)
    slope, _ = resample(slope_source, layers, texture_size, "pixel_centres", Resampling.average)
    if np.any(np.isfinite(slope) & ((slope < 0) | (slope > 90))):
        raise ValueError("Slope is outside the expected degree range")
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    mesh.astype("<f4").tofile(output / "heights.f32")
    valid.astype("uint8").tofile(output / "valid.u8")
    if verification_output is not None:
        verification_output = Path(verification_output)
        verification_output.mkdir(parents=True, exist_ok=False)
        write_tiff(verification_output / "heightmap.tif", mesh, transform, layers["projection"], "m")
        write_tiff(verification_output / "elevation.tif", elevation, texture_transform, layers["projection"], "m")
        write_tiff(verification_output / "slope.tif", slope, texture_transform, layers["projection"], "degree")
    layer_defs = []
    for ident, values, units, info in (("elevation", elevation, "m", height_info), ("slope", slope, "°", slope_info)):
        low, high = write_layer(output / f"{ident}.png", values)
        template = next(item for item in layers["layers"] if item["id"] == ident)
        layer_defs.append({**template, "file": f"terrain/{ident}.png", "value_range": [low, high],
                           "source": f"NASA PGDA 90 / {info['filename']} / Barker et al. (2023)",
                           "description": f"Real LOLA {ident}; area-mean display layer from the 80 m product. Not a landing-safety metric."})
    shared = {key: layers[key] for key in ("projection", "radius_m", "bounds_m", "lat_limit")}
    write_json(output / "layers.json", {"version": 1, "mock": False, **shared,
               "width_px": texture_size, "height_px": texture_size, "layers": layer_defs})
    site_rows = sample_sites(height_source, slope_source, sites, layers["radius_m"], layers["lat_limit"])
    write_json(output / "site-terrain.json", {
        "version": 1, "terrain_mock": False, "input_sites_mock": sites["mock"], "frame": FRAME,
        "source_pixel_spacing_m": 80, "sampling": "nearest native source pixel, not mesh or texture",
        "warning": "Real terrain at fixture coordinates; not validated landing-site metrics. No score, validity or ephemeris changes.",
        "sites": site_rows})
    with (output / "site-terrain.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(site_rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(site_rows)
    write_json(output / "provenance.json", {"generated_utc": datetime.now(timezone.utc).isoformat(),
        "ai_assistance": "OpenAI Codex; implementation of the human team's DEM delivery plan",
        "software": {"python": platform.python_version(), "rasterio": rasterio.__version__,
                     "gdal": rasterio.__gdal_version__, "numpy": np.__version__},
        "sources": [height_info, slope_info], "layers_grid_sha256": fingerprint(layers_file),
        "sites_input_sha256": fingerprint(sites_file),
        "limitations": ["80 m is source pixel spacing, not guaranteed effective spatial resolution or accuracy",
                        "No Cesium vertical registration, horizon, PSR, illumination or suitability calculation",
                        "Bilinear mesh samples and area-average display layers have different spatial support",
                        "Circular coverage is clipped at -80 degrees; square corners and source gaps remain NoData"]})
    manifest = {"version": 1, "mock": False, **shared, "frame": FRAME,
        "width_px": size, "height_px": size, "registration": "vertices",
        "sample_0_0_m": list(transform * (0.5, 0.5)),
        "sample_step_col_m": [transform.a, 0], "sample_step_row_m": [0, transform.e],
        "row_order": "max_y_to_min_y", "resampling": "bilinear",
        "source_pixel_spacing_m": 80, "height_unit": "m", "height_reference_radius_m": 1737400,
        "height_reference_note": "LOLA reference-sphere elevation convention; no Cesium offset applied",
        "heights": {"file": "terrain/heights.f32", "encoding": "float32-le", "order": "row-major",
                    "scale": 1, "offset": 0, "nodata": "NaN"},
        "mask": {"file": "terrain/valid.u8", "encoding": "uint8", "valid": 1, "nodata": 0},
        "height_range_m": [float(mesh[valid].min()), float(mesh[valid].max())],
        "valid_samples": int(valid.sum()), "total_samples": size * size,
        "source": height_info["url"], "provenance_file": "terrain/provenance.json",
        # GeoTIFFs are optional GIS checks, excluded from the small web payload.
        "sha256": {path.name: fingerprint(path) for path in sorted(output.iterdir())
                   if path.is_file() and path.suffix != ".tif"}}
    # Publication marker is last: no manifest means an incomplete product.
    write_json(output / "heightmap.json", manifest)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("height_source", type=Path)
    parser.add_argument("slope_source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--layers", type=Path, default=ROOT / "web/public/data/layers.json")
    parser.add_argument("--sites", type=Path, default=ROOT / "web/public/data/sites.json")
    parser.add_argument("--catalog", type=Path, default=ROOT / "config/terrain-sources.json")
    parser.add_argument("--size", type=int, default=1025)
    parser.add_argument("--verification-output", type=Path,
                        help="Optional GIS rasters outside the web's public directory")
    args = parser.parse_args()
    result = export_polar(args.height_source, args.slope_source, args.layers, args.sites,
                          args.output, catalog_file=args.catalog, size=args.size,
                          verification_output=args.verification_output)
    print(json.dumps({key: result[key] for key in ("width_px", "height_range_m", "valid_samples", "total_samples")}, indent=2))


if __name__ == "__main__":
    main()
