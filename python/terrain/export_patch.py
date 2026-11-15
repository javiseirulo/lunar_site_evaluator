"""Export a bounded DEM patch for Lunar Street View. AI-assisted: OpenAI Codex.

This is Pablo's terrain producer, not the shared catalog/scoring contract.
The manifest is published last; consumers must require it before reading files.
"""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.windows import Window


def export_patch(source, output, *, column, row, width, height,
                 height_unit, frame, allow_partial=False):
    source, output = Path(source), Path(output)
    if source.suffix == ".part" and not allow_partial:
        raise ValueError("Incomplete source: use --allow-partial only for an explicitly labeled preview")
    if height_unit not in ("m", "km"):
        raise ValueError("Source height unit must be explicit: m or km")
    if min(column, row) < 0 or not (2 <= width <= 4096 and 2 <= height <= 4096):
        raise ValueError("Use nonnegative offsets and dimensions between 2 and 4096 pixels")
    if not frame.strip():
        raise ValueError("A lunar reference frame is required")
    with rasterio.open(source) as dataset:
        if dataset.count != 1 or dataset.crs is None:
            raise ValueError("Expected a single-band georeferenced height raster")
        if column + width > dataset.width or row + height > dataset.height:
            raise ValueError("Requested patch falls outside the source raster")
        window = Window(column, row, width, height)
        raw = dataset.read(1, window=window, masked=True).astype("float64")
        # Rasterio read does not apply band scale/offset; apply them exactly once.
        heights = (raw.filled(np.nan) * dataset.scales[0] + dataset.offsets[0])
        heights *= 1000 if height_unit == "km" else 1
        valid = np.isfinite(heights)
        if not valid.any():
            raise ValueError("Patch has no valid elevation samples")
        heights[~valid] = np.nan
        low, high = float(heights[valid].min()), float(heights[valid].max())
        scale = (high - low) / 65535 if high > low else 1.0
        encoded = np.zeros(heights.shape, dtype="uint16")
        encoded[valid] = np.rint((heights[valid] - low) / scale).astype("uint16")
        transform = dataset.window_transform(window)
        metadata = {
            "schema": "pablo-terrain-patch/0.1", "source": str(source.resolve()),
            "source_partial": source.suffix == ".part", "frame": frame,
            "height_reference": "same as source; vertical datum requires independent verification",
            "source_window_pixels": {"column": column, "row": row, "width": width, "height": height},
            "crs_wkt": dataset.crs.to_wkt(), "width": width, "height": height,
            "transform_pixel_edges": list(transform), "bounds_pixel_edges": list(dataset.window_bounds(window)),
            "sample_0_0_center_projected": list(transform * (0.5, 0.5)),
            "sample_step_column_projected": [transform.a, transform.d],
            "sample_step_row_projected": [transform.b, transform.e],
            "row_order": "same as source; consult transform for north/south",
            "source_height_unit": height_unit, "height_unit": "m",
            "source_band_scale": dataset.scales[0], "source_band_offset": dataset.offsets[0],
            "height_min_m": low, "height_max_m": high, "valid_pixels": int(valid.sum()),
            "mask": {"file": "valid.png", "valid": 255, "nodata": 0},
            "heightmap": {"file": "heightmap.png", "encoding": "uint16 grayscale",
                          "decode": "height_m = offset_m + encoded * scale_m; apply valid.png mask",
                          "offset_m": low, "scale_m": scale, "maximum_quantization_error_m": scale / 2},
            "float_heights": {"file": "heights.f32", "encoding": "float32 little-endian, row-major",
                              "nodata": "NaN", "height_unit": "m"},
            "validation": "data export only; not a horizon, shadow or illumination calculation",
        }
    # Refuse to overwrite another export. A missing manifest means incomplete output.
    output.mkdir(parents=True, exist_ok=False)
    with rasterio.open(output / "patch.tif", "w", driver="GTiff", width=width,
                       height=height, count=1, dtype="float32", nodata=np.nan,
                       crs=metadata["crs_wkt"], transform=transform, compress="deflate") as target:
        target.write(heights.astype("float32"), 1)
        target.set_band_unit(1, "m")
    for filename, pixels, dtype in (("heightmap.png", encoded, "uint16"),
                                    ("valid.png", valid.astype("uint8") * 255, "uint8")):
        with rasterio.open(output / filename, "w", driver="PNG", width=width,
                           height=height, count=1, dtype=dtype) as target:
            target.write(pixels, 1)
    heights.astype("<f4").tofile(output / "heights.f32")
    metadata["sha256"] = {name: hashlib.sha256((output / name).read_bytes()).hexdigest()
                          for name in ("patch.tif", "heightmap.png", "valid.png", "heights.f32")}
    (output / "manifest.json").write_text(json.dumps(metadata, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    return metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    for name in ("column", "row", "width", "height"):
        parser.add_argument("--" + name, type=int, required=True)
    parser.add_argument("--height-unit", choices=("m", "km"), required=True)
    parser.add_argument("--frame", required=True)
    parser.add_argument("--allow-partial", action="store_true")
    args = parser.parse_args()
    result = export_patch(args.source, args.output, column=args.column, row=args.row,
                          width=args.width, height=args.height, height_unit=args.height_unit,
                          frame=args.frame, allow_partial=args.allow_partial)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
