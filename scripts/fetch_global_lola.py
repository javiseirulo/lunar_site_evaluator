"""Download official global LOLA LDEM_64 and its PDS label. AI-assisted: Codex."""
import json
from pathlib import Path
from urllib.request import urlopen
from terrain_data import ROOT, download, write_json


def main():
    source = next(s for s in json.loads((ROOT / "config/terrain-sources.json").read_text())[
        "sources"] if s["id"] == "lola-global-64ppd")
    folder = ROOT / "data/terrain" / source["id"]
    folder.mkdir(parents=True, exist_ok=True)
    with urlopen(source["label_url"], timeout=60) as response:
        label = response.read().decode("ascii")
    # Refuse a changed product rather than silently interpreting its numbers.
    for field in ('PRODUCT_ID                = "LDEM_64"',
                  'LINES                 = 11520', 'LINE_SAMPLES          = 23040',
                  'SAMPLE_TYPE           = LSB_INTEGER', 'SCALING_FACTOR        = 0.5',
                  'COORDINATE_SYSTEM_NAME       = "MEAN EARTH/POLAR AXIS OF DE421"'):
        if field not in label:
            raise ValueError(f"Review changed PDS label: missing {field}")
    (folder / "ldem_64.lbl").write_text(label, encoding="ascii", newline="\n")
    download(source, folder)
    import numpy as np
    values = np.memmap(folder / source["filename"], dtype="<i2", mode="r", shape=(11520, 23040))
    minimum, maximum = int(values.min()), int(values.max())
    if minimum < -18251 or maximum > 21546:
        raise ValueError("IMG values exceed bounds in the PDS label; review source")
    write_json(folder / "raster-metadata.json", {
        "product": "LDEM_64 V3.1", "shape": [11520, 23040], "dtype": "int16-le",
        "registration": "pixel centres; row 0 north; longitude 0..360 east",
        "scale_to_elevation_m": 0.5, "reference_radius_m": 1737400,
        "frame": "MOON_ME_DE421", "min_dn": minimum, "max_dn": maximum,
        "validation": "full DN range scan and expected byte length; not accuracy certification",
    })
    print(f"Global DEM verified: {minimum * .5} .. {maximum * .5} m")


if __name__ == "__main__":
    main()
