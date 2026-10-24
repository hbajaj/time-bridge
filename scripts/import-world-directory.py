#!/usr/bin/env python3
"""Materialize every country/state/city record from a pinned ODbL country source.
No API key, user data, or executable upstream content. Writes deterministic static JSON.
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import pathlib
import time
from urllib.request import Request, urlopen

ROOT = pathlib.Path(__file__).resolve().parents[1]
REVISION = "ab77d11f438f439e3f7ed2680463cbd1f861ec15"
SOURCE = "srestre/world-countries-cities-db"
BASE = f"https://raw.githubusercontent.com/{SOURCE}/{REVISION}/countries/"
OUT = ROOT / "geo" / "regions"
INDEX = ROOT / "geo" / "countries.json"
MANIFEST = ROOT / "qa" / "release-manifest.json"
INTEGRITY = ROOT / "qa" / "source-integrity.json"
COUNTRIES = json.loads(INDEX.read_text(encoding="utf-8"))
if len(COUNTRIES) != 250 or len({x["code"] for x in COUNTRIES}) != 250:
    raise RuntimeError("Country index is incomplete or contains duplicates")

def download_country(item):
    code = item["code"]
    if not isinstance(code, str) or len(code) != 2 or not code.isalpha() or code != code.upper():
        raise ValueError(f"Bad country code: {code!r}")
    url = BASE + code + ".json"
    last_error = None
    for attempt in range(4):
        try:
            req = Request(url, headers={"User-Agent": "TimeBridge-GeoImport/1.0", "Accept": "application/json"})
            with urlopen(req, timeout=40) as response:
                raw = response.read(15_000_000)
            rows = json.loads(raw)
            if not isinstance(rows, list) or len(rows) != 1 or rows[0].get("iso2") != code:
                raise ValueError(f"Invalid source dataset for {code}")
            row = rows[0]
            regions = []
            for state in row.get("states", []) or []:
                if not isinstance(state, dict) or not isinstance(state.get("name"), str):
                    continue
                cities = []
                for city in state.get("cities", []) or []:
                    if not isinstance(city, dict) or not isinstance(city.get("name"), str):
                        continue
                    lat, lon = city.get("latitude"), city.get("longitude")
                    try:
                        lat = float(lat) if lat is not None else None
                        lon = float(lon) if lon is not None else None
                        if lat is not None and not -90 <= lat <= 90:
                            lat = None
                        if lon is not None and not -180 <= lon <= 180:
                            lon = None
                    except (ValueError, TypeError):
                        lat = lon = None
                    cities.append({"name": city["name"].strip()[:110], "latitude": lat, "longitude": lon})
                regions.append({"code": str(state.get("code") or "")[:16],
                                "name": state["name"].strip()[:110], "cities": cities})
            payload = {
                "country": code, "name": row.get("name") or item["name"],
                "regions": regions, "regionCount": len(regions),
                "cityCount": sum(len(s["cities"]) for s in regions),
                "sourceRevision": REVISION,
            }
            return code, payload
        except Exception as exc:
            last_error = exc
            time.sleep(min(2 ** attempt, 8))
    raise RuntimeError(f"Unable to download {code}: {last_error}") from last_error

print("Downloading complete country/state/city snapshot for", len(COUNTRIES), "countries", flush=True)
results = {}
with ThreadPoolExecutor(max_workers=12) as pool:
    for future in as_completed([pool.submit(download_country, item) for item in COUNTRIES]):
        code, payload = future.result()
        results[code] = payload
if len(results) != 250:
    raise RuntimeError(f"Incomplete geographic import: {len(results)} countries")

region_total = sum(p["regionCount"] for p in results.values())
city_total = sum(p["cityCount"] for p in results.values())
if region_total < 5_000 or city_total < 120_000:
    raise RuntimeError(f"Unexpectedly small snapshot: {region_total} regions, {city_total} cities")

OUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
integrity = json.loads(INTEGRITY.read_text(encoding="utf-8"))

def record(path, data):
    absolute = ROOT / path
    absolute.parent.mkdir(parents=True, exist_ok=True)
    absolute.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()
    blob = hashlib.sha1(f"blob {len(data)}\0".encode("utf-8") + data).hexdigest()
    manifest[path] = digest
    integrity[path] = {"blob": blob, "sha256": digest, "bytes": len(data)}

for code in sorted(results):
    data = (json.dumps(results[code], separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")
    record(f"geo/regions/{code}.json", data)

stats = {
    "source": SOURCE, "revision": REVISION,
    "countries": len(results), "regions": region_total, "cities": city_total,
    "countsByCountry": {c: {"regions": p["regionCount"], "cities": p["cityCount"]} for c, p in sorted(results.items())}
}
record("geo/catalog-stats.json", (json.dumps(stats, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8"))
MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
INTEGRITY.write_text(json.dumps(integrity, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("Imported", len(results), "countries,", region_total, "regions,", city_total, "cities/towns", flush=True)
