"""Local HTTP contract tests: no NASA traffic and no large downloads."""

import hashlib
import importlib.util
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest

SPEC = importlib.util.spec_from_file_location("terrain_data", Path(__file__).parents[1] / "scripts/terrain_data.py")
terrain = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(terrain)
PAYLOAD = b"II*\x00" + b"terrain-test" * 100


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        offset = int(self.headers.get("Range", "bytes=0-").split("=")[1].split("-")[0])
        if self.path == "/ignore-range":
            offset = 0
        self.send_response(206 if offset else 200)
        self.send_header("Content-Length", str(len(PAYLOAD) - offset))
        if offset:
            self.send_header("Content-Range", f"bytes {offset}-{len(PAYLOAD)-1}/{len(PAYLOAD)}")
        self.end_headers()
        self.wfile.write(PAYLOAD[offset:])

    def log_message(self, *args):
        pass


class DownloadContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        scratch = Path(__file__).parents[1] / "data" / "test-scratch"
        scratch.mkdir(parents=True, exist_ok=True)
        self.temporary = tempfile.TemporaryDirectory(dir=scratch)
        self.folder = Path(self.temporary.name)
        self.source = {"id": "fixture", "filename": "test.tif", "expected_bytes": len(PAYLOAD),
                       "url": f"http://127.0.0.1:{self.server.server_port}/terrain"}

    def tearDown(self):
        self.temporary.cleanup()

    def test_complete_download_publishes_fingerprint_and_final_name(self):
        terrain.download(self.source, self.folder)
        self.assertEqual((self.folder / "test.tif").read_bytes(), PAYLOAD)
        provenance = json.loads((self.folder / "provenance.json").read_text())
        self.assertEqual(provenance["sha256_local"], hashlib.sha256(PAYLOAD).hexdigest())
        self.assertFalse((self.folder / "download.lock").exists())

    def test_resume_keeps_prefix_and_appends_exact_range(self):
        (self.folder / "test.tif.part").write_bytes(PAYLOAD[:37])
        terrain.download(self.source, self.folder)
        self.assertEqual((self.folder / "test.tif").read_bytes(), PAYLOAD)

    def test_server_ignoring_range_cannot_corrupt_partial(self):
        partial = self.folder / "test.tif.part"
        partial.write_bytes(PAYLOAD[:37])
        self.source["url"] = self.source["url"].replace("/terrain", "/ignore-range")
        with self.assertRaisesRegex(ValueError, "resume range"):
            terrain.download(self.source, self.folder)
        self.assertEqual(partial.read_bytes(), PAYLOAD[:37])
        self.assertFalse((self.folder / "test.tif").exists())

    def test_changed_length_is_rejected_before_writing(self):
        self.source["expected_bytes"] += 1
        with self.assertRaisesRegex(ValueError, "length changed"):
            terrain.download(self.source, self.folder)
        self.assertFalse((self.folder / "test.tif").exists())

    def test_lock_prevents_concurrent_writers(self):
        (self.folder / "download.lock").write_text("123")
        with self.assertRaisesRegex(RuntimeError, "lock already exists"):
            terrain.download(self.source, self.folder)
        self.assertEqual((self.folder / "download.lock").read_text(), "123")

    def test_existing_invalid_file_is_preserved(self):
        existing = self.folder / "test.tif"
        existing.write_bytes(b"original")
        with self.assertRaisesRegex(ValueError, "refusing overwrite"):
            terrain.download(self.source, self.folder)
        self.assertEqual(existing.read_bytes(), b"original")

    @unittest.skipUnless(importlib.util.find_spec("rasterio"), "requires requirements-terrain.txt")
    def test_inspect_decodes_real_geotiff_and_preserves_lunar_crs(self):
        import numpy as np
        import rasterio
        from rasterio.transform import from_origin

        path = self.folder / "real.tif"
        lunar = "+proj=stere +lat_0=-90 +lon_0=0 +R=1737400 +units=m +no_defs"
        with rasterio.open(path, "w", driver="GTiff", width=32, height=32,
                           count=1, dtype="float32", nodata=float("nan"),
                           transform=from_origin(-80, 80, 5, 5), crs=lunar) as dataset:
            dataset.write(np.full((32, 32), -1234.5, dtype="float32"), 1)
        report = self.folder / "metadata.json"
        terrain.inspect_raster(path, report)
        result = json.loads(report.read_text())
        self.assertIn("1737400", result["crs_wkt"])
        self.assertEqual(result["resolution"], [5, 5])
        self.assertEqual(result["sample_windows"][0]["minimum_raw"], -1234.5)
        self.assertEqual(result["sample_windows"][0]["valid_pixels"], 256)


if __name__ == "__main__":
    unittest.main()
