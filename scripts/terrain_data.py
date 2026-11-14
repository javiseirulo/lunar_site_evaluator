"""Acquire and inspect the team's independent lunar DEM. AI-assisted: OpenAI Codex.

Raw NASA values are preserved. This tool does not calibrate Cesium or compute
illumination. Run with Python 3.10+; only `inspect` needs rasterio.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import time
from datetime import datetime, timezone
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "config" / "terrain-sources.json"


def write_json(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as source:
        for block in iter(lambda: source.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_tiff_header(path):
    with Path(path).open("rb") as source:
        header = source.read(4)
    if header not in (b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+"):
        raise ValueError("The payload is not a TIFF/BigTIFF file")


def download(source, folder):
    """Resume a single file; publish the final name only after length/header/hash checks."""
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / source["filename"]
    partial = folder / (source["filename"] + ".part")
    status_file = folder / "download-status.json"
    expected = source["expected_bytes"]
    state = {"source_id": source["id"], "url": source["url"],
             "expected_bytes": expected, "pid": os.getpid()}

    def report(status, received, **extra):
        state.update(status=status, received_bytes=received, updated_utc=utc_now(), **extra)
        write_json(status_file, state)

    try:
        # Prevent two writers corrupting a resumed file; a stale lock is explicit.
        lock = folder / "download.lock"
        with lock.open("x", encoding="utf-8") as handle:
            handle.write(str(os.getpid()))
    except FileExistsError:
        raise RuntimeError(f"Download lock already exists: {lock}; check its PID before removing")

    try:
        if target.exists():
            if target.stat().st_size != expected:
                raise ValueError("Existing final file has an unexpected length; refusing overwrite")
            validate_tiff_header(target)
            report("complete", expected, sha256=sha256(target))
            return
        for attempt in range(4):
            received = partial.stat().st_size if partial.exists() else 0
            if received > expected:
                raise ValueError("Partial file is larger than the source")
            if received == expected:
                break
            headers = {"User-Agent": "LunarSiteEvaluator-terrain/1.0", "Accept-Encoding": "identity"}
            if received:
                headers["Range"] = f"bytes={received}-"
            report("downloading", received, attempt=attempt + 1)
            try:
                with urlopen(Request(source["url"], headers=headers), timeout=60) as response:
                    if received:
                        wanted = f"bytes {received}-{expected - 1}/{expected}"
                        if response.status != 206 or response.headers.get("Content-Range") != wanted:
                            raise ValueError("Server did not honor the exact resume range; partial preserved")
                    elif response.status != 200:
                        raise ValueError(f"Unexpected HTTP status: {response.status}")
                    if int(response.headers.get("Content-Length", -1)) != expected - received:
                        raise ValueError("Source length changed; update the catalog after review")
                    report("downloading", received, etag=response.headers.get("ETag"),
                           last_modified=response.headers.get("Last-Modified"))
                    previous_report = time.monotonic()
                    with partial.open("ab") as output:
                        while block := response.read(256 * 1024):
                            if received + len(block) > expected:
                                raise ValueError("Response exceeds the declared source length")
                            output.write(block)
                            received += len(block)
                            if time.monotonic() - previous_report >= 5:
                                output.flush()
                                report("downloading", received)
                                previous_report = time.monotonic()
                if received != expected:
                    raise OSError("Incomplete response")
                break
            except (OSError, URLError) as error:
                report("retrying", partial.stat().st_size if partial.exists() else 0, error=str(error))
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
        report("verifying", expected)
        validate_tiff_header(partial)
        digest = sha256(partial)
        # This is a local integrity fingerprint, not a publisher-supplied checksum.
        partial.replace(target)
        write_json(folder / "provenance.json", {
            **source, "downloaded_utc": utc_now(), "actual_bytes": expected,
            "sha256_local": digest, "checksum_authority": "local; no publisher checksum provided",
            "raster_validation": "pending: run inspect after download",
        })
        report("complete", expected, sha256=digest, error=None)
        print(f"Complete: {target}", flush=True)
    except BaseException as error:
        report("interrupted" if isinstance(error, KeyboardInterrupt) else "failed",
               partial.stat().st_size if partial.exists() else 0, error=str(error))
        raise
    finally:
        lock.unlink()


def inspect_raster(path, report_path, metadata_only=False):
    import rasterio
    from rasterio.windows import Window

    with rasterio.open(path) as dataset:
        samples = []
        # Small reads verify decoding without allocating the full 3.3 GB raster.
        for fx, fy in (() if metadata_only else ((0.25, 0.25), (0.5, 0.5), (0.75, 0.75))):
            row = min(dataset.height - 16, int(dataset.height * fy))
            col = min(dataset.width - 16, int(dataset.width * fx))
            window = Window(max(0, col), max(0, row), min(16, dataset.width), min(16, dataset.height))
            values = dataset.read(1, window=window, masked=True)
            samples.append({"row": row, "column": col, "valid_pixels": int(values.count()),
                            "minimum_raw": float(values.min()) if values.count() else None,
                            "maximum_raw": float(values.max()) if values.count() else None})
        result = {"path": str(Path(path).resolve()), "inspected_utc": utc_now(),
                  "driver": dataset.driver, "width": dataset.width, "height": dataset.height,
                  "count": dataset.count, "dtype": dataset.dtypes, "nodata": str(dataset.nodata),
                  "crs_wkt": dataset.crs.to_wkt() if dataset.crs else None,
                  "transform": list(dataset.transform), "bounds": list(dataset.bounds),
                  "resolution": list(dataset.res), "scales": dataset.scales,
                  "offsets": dataset.offsets, "units": dataset.units,
                  "tags": dataset.tags(), "sample_windows": samples,
                  "validation_scope": "metadata only; file may be partial" if metadata_only else
                  "metadata and three decoded windows; not a complete pixel scan"}
    write_json(report_path, result)
    print(json.dumps(result, indent=2))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("download", "status", "inspect"))
    parser.add_argument("--catalog", type=Path, default=CATALOG)
    parser.add_argument("--source", default="lola-south-pole-5m")
    parser.add_argument("--directory", type=Path)
    parser.add_argument("--metadata-only", action="store_true",
                        help="Read only TIFF metadata, permitting an incomplete .part file")
    args = parser.parse_args()
    sources = json.loads(args.catalog.read_text(encoding="utf-8"))["sources"]
    source = next(item for item in sources if item["id"] == args.source)
    folder = args.directory or ROOT / "data" / "terrain" / source["id"]
    if args.action == "download":
        download(source, folder)
    elif args.action == "status":
        status_file = folder / "download-status.json"
        print(status_file.read_text(encoding="utf-8") if status_file.exists() else "No download status yet")
    else:
        raster_path = folder / source["filename"]
        if args.metadata_only and not raster_path.exists():
            raster_path = folder / (source["filename"] + ".part")
        report_name = "raster-metadata-partial.json" if args.metadata_only else "raster-metadata.json"
        inspect_raster(raster_path, folder / report_name, args.metadata_only)


if __name__ == "__main__":
    main()
