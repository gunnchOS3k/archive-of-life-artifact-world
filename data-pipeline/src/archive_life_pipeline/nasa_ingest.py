"""NASA public metadata/event/climate ingestion with cache fallback."""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from archive_life_pipeline.paths import EXPORTS_DIR, PUBLIC_DATA

NASA_EXPORT = EXPORTS_DIR / "nasa"
NASA_PUBLIC = PUBLIC_DATA / "earth" / "nasa_metadata_cache.json"

MOCK_EONET_EVENTS = [
    {"id": "SAMPLE-EONET-001", "title": "Savanna dry-season dust plume", "categories": [{"title": "Dust and Haze"}], "date": "2026-06-28"},
    {"id": "SAMPLE-EONET-003", "title": "Coastal phytoplankton bloom", "categories": [{"title": "Water Color"}], "date": "2026-06-25"},
]

MOCK_POWER_CLIMATE = {
    "savanna": {"T2M": 28.1, "RH2M": 45.0, "ALLSKY_SFC_SW_DWN": 6.9, "WS10M": 4.2},
    "forest": {"T2M": 14.2, "RH2M": 78.0, "ALLSKY_SFC_SW_DWN": 3.9, "WS10M": 1.8},
    "coastal": {"T2M": 12.0, "RH2M": 72.0, "ALLSKY_SFC_SW_DWN": 5.1, "WS10M": 6.8},
}


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _write_json(path: Path, data: object) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, indent=2)
    path.write_text(text)
    return hashlib.sha256(text.encode()).hexdigest()


def fetch_eonet_events() -> tuple[list[dict], str]:
    import httpx

    url = "https://eonet.gsfc.nasa.gov/api/v3/events"
    resp = httpx.get(url, params={"status": "open", "limit": 20}, timeout=30.0)
    resp.raise_for_status()
    events = resp.json().get("events", [])
    checksum = hashlib.sha256(resp.content).hexdigest()
    return events, checksum


def fetch_cmr_collections(short_name: str = "HLS") -> tuple[list[dict], str]:
    import httpx

    url = "https://cmr.earthdata.nasa.gov/search/collections.json"
    resp = httpx.get(url, params={"short_name": short_name, "page_size": 5}, timeout=30.0)
    resp.raise_for_status()
    entries = resp.json().get("feed", {}).get("entry", [])
    checksum = hashlib.sha256(resp.content).hexdigest()
    return entries, checksum


def fetch_power_climate(lat: float = -2.0, lon: float = 34.0) -> tuple[dict, str]:
    import httpx

    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "T2M,RH2M,ALLSKY_SFC_SW_DWN,WS10M",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": "20250601",
        "end": "20250630",
        "format": "JSON",
    }
    resp = httpx.get(url, params=params, timeout=45.0)
    resp.raise_for_status()
    data = resp.json()
    checksum = hashlib.sha256(resp.content).hexdigest()
    return data, checksum


def ingest_nasa_metadata() -> dict:
    """Fetch public NASA metadata or write labeled sample fallback exports."""
    NASA_EXPORT.mkdir(parents=True, exist_ok=True)
    layers: list[dict] = []
    record_count = 0
    data_mode = "real_metadata"
    has_real = False
    has_sample = False

    try:
        events, eonet_cs = fetch_eonet_events()
        _write_json(
            NASA_EXPORT / "eonet_events.json",
            {"events": events, "retrievedAt": _now(), "sourceUrl": "https://eonet.gsfc.nasa.gov/api/v3/events", "dataMode": "REAL NASA METADATA"},
        )
        layers.append({"id": "natural_events", "mode": "REAL NASA METADATA", "recordCount": len(events), "sourceUrl": "https://eonet.gsfc.nasa.gov/"})
        record_count += len(events)
        has_real = True
    except Exception as exc:  # noqa: BLE001
        _write_json(
            NASA_EXPORT / "eonet_events.json",
            {"events": MOCK_EONET_EVENTS, "retrievedAt": _now(), "dataMode": "SAMPLE FALLBACK", "error": str(exc)},
        )
        layers.append({"id": "natural_events", "mode": "SAMPLE FALLBACK", "recordCount": len(MOCK_EONET_EVENTS)})
        has_sample = True
        data_mode = "sample_fallback"

    try:
        cmr, _cmr_cs = fetch_cmr_collections("HLS")
        _write_json(
            NASA_EXPORT / "cmr_hls_collections.json",
            {"collections": cmr, "retrievedAt": _now(), "sourceUrl": "https://cmr.earthdata.nasa.gov/", "dataMode": "REAL NASA METADATA"},
        )
        layers.append({"id": "vegetation", "mode": "REAL NASA METADATA", "recordCount": len(cmr), "sourceUrl": "https://cmr.earthdata.nasa.gov/"})
        record_count += len(cmr)
        has_real = True
    except Exception as exc:  # noqa: BLE001
        _write_json(NASA_EXPORT / "cmr_hls_collections.json", {"collections": [], "dataMode": "SAMPLE FALLBACK", "error": str(exc)})
        layers.append({"id": "vegetation", "mode": "SAMPLE FALLBACK", "recordCount": 0})
        has_sample = True

    try:
        power, _power_cs = fetch_power_climate()
        _write_json(
            NASA_EXPORT / "power_climate_savanna.json",
            {"climate": power, "retrievedAt": _now(), "sourceUrl": "https://power.larc.nasa.gov/", "dataMode": "REAL NASA METADATA"},
        )
        layers.append({"id": "climate", "mode": "REAL NASA METADATA", "recordCount": 1, "sourceUrl": "https://power.larc.nasa.gov/"})
        record_count += 1
        has_real = True
    except Exception as exc:  # noqa: BLE001
        _write_json(
            NASA_EXPORT / "power_climate_savanna.json",
            {"climate": MOCK_POWER_CLIMATE, "dataMode": "SAMPLE FALLBACK", "error": str(exc)},
        )
        layers.append({"id": "climate", "mode": "SAMPLE FALLBACK", "recordCount": len(MOCK_POWER_CLIMATE)})
        has_sample = True

    if has_real and has_sample:
        data_mode = "cached_nasa_snapshot"
    elif has_real:
        data_mode = "real_metadata"
    else:
        data_mode = "sample_fallback"

    manifest = {
        "generatedAt": _now(),
        "dataMode": data_mode,
        "verificationMode": (
            "source_verified"
            if data_mode == "real_metadata"
            else "mixed"
            if data_mode == "cached_nasa_snapshot"
            else "sample_fallback"
        ),
        "scope": "metadata_only",
        "measurementDataMode": "not_ingested",
        "layers": layers,
        "recordCount": record_count,
        "verifiedRecordCount": record_count,
    }
    manifest_cs = _write_json(NASA_EXPORT / "nasa_metadata_manifest.json", manifest)
    NASA_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    NASA_PUBLIC.write_text(json.dumps(manifest, indent=2))

    return {
        "imported": has_real,
        "status": "imported" if has_real else "sample_fallback",
        "recordCount": record_count,
        "checksum": manifest_cs,
        "sourceVersion": "public-api",
        "dataMode": manifest["verificationMode"],
        "verifiedRecordCount": record_count,
        "scope": "metadata_only",
        "measurementDataMode": "not_ingested",
        "layers": layers,
    }
