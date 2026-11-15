"""Build a small official IAU/USGS lunar landmark catalogue. AI-assisted: Codex."""
import hashlib
from datetime import datetime, timezone
import json
from pathlib import Path
from urllib.request import urlopen
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
URL = "https://asc-planetarynames-data.s3.us-west-2.amazonaws.com/MOON_nomenclature_center_pts.kmz"


def main():
    folder = ROOT / "data/nomenclature"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / "moon.kmz"
    if not path.exists():
        with urlopen(URL, timeout=60) as response:
            path.write_bytes(response.read())
    ns = {"k": "http://www.opengis.net/kml/2.2"}
    with zipfile.ZipFile(path) as archive:
        tree = ET.fromstring(archive.read("MOON_nomenclature_center_pts.kml"))
    features = []
    for mark in tree.findall(".//k:Placemark", ns):
        fields = {item.attrib["name"]: item.text for item in mark.findall(".//k:SimpleData", ns)}
        if fields.get("approval") != "Adopted by IAU" or fields.get("code") == "SF":
            continue
        lon, lat = map(float, mark.find(".//k:coordinates", ns).text.split(",")[:2])
        features.append({"id": fields["link"].rsplit("/", 1)[-1],
                         "name": mark.find("k:name", ns).text.strip(), "lat": lat, "lon": lon,
                         "kind": fields["code"], "diameter_km": float(fields["diameter"]),
                         "source": fields["link"].replace("http:", "https:")})
    features.sort(key=lambda item: item["name"])
    result = {"version": 1, "source": URL, "source_page": "https://planetarynames.wr.usgs.gov/GIS_Downloads",
              "source_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
              "retrieved_utc": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
              "coordinates": "planetocentric latitude, east longitude; LOLA 2011 control",
              "note": "Feature centres, not summit coordinates. Satellite lettered features omitted to reduce clutter.",
              "attribution": "IAU / USGS Gazetteer of Planetary Nomenclature; conversion assisted by OpenAI Codex",
              "features": features}
    output = ROOT / "web/public/data/terrain/lunar-names.json"
    output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(features)} official named features exported")


if __name__ == "__main__":
    main()
