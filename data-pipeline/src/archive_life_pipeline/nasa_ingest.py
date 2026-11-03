"""NASA public metadata/event/climate ingestion with cache fallback.

Historical July 5 export bytes under data-pipeline/exports/nasa/ and
public/data/earth/nasa_metadata_cache.json are immutable. New acquires write
only to versioned snapshot directories.
"""

from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from archive_life_pipeline.paths import EXPORTS_DIR, PUBLIC_DATA, SNAPSHOTS_DIR

NASA_EXPORT = EXPORTS_DIR / "nasa"
NASA_PUBLIC = PUBLIC_DATA / "earth" / "nasa_metadata_cache.json"
NASA_SNAPSHOT_ROOT = SNAPSHOTS_DIR / "public_bounded" / "nasa"

# Protected historical paths — never rewrite. Authentic SHA from commit 97c7dea / origin/main.
HISTORICAL_MANIFEST_SHA256 = (
    "f6d1c4d83b3888b1cd9fd7cd1b4fed11dbd317b857d461666f6a01ea3b3265b6"
)
HISTORICAL_IMPORT_STATUS_SHA256 = (
    "085f224820462c2833ce432da8ebc7278e7656c9e0fe942669e5e3b9169e3635"
)
PROTECTED_HISTORICAL_PATHS: frozenset[Path] = frozenset(
    {
        NASA_EXPORT / "nasa_metadata_manifest.json",
        NASA_EXPORT / "import_status.json",
        NASA_EXPORT / "eonet_events.json",
        NASA_EXPORT / "cmr_hls_collections.json",
        NASA_EXPORT / "power_climate_savanna.json",
        NASA_PUBLIC,
    }
)

MOCK_EONET_EVENTS = [
    {
        "id": "SAMPLE-EONET-001",
        "title": "Savanna dry-season dust plume",
        "categories": [{"title": "Dust and Haze"}],
        "date": "2026-06-28",
    },
    {
        "id": "SAMPLE-EONET-003",
        "title": "Coastal phytoplankton bloom",
        "categories": [{"title": "Water Color"}],
        "date": "2026-06-25",
    },
]

MOCK_POWER_CLIMATE = {
    "savanna": {"T2M": 28.1, "RH2M": 45.0, "ALLSKY_SFC_SW_DWN": 6.9, "WS10M": 4.2},
    "forest": {"T2M": 14.2, "RH2M": 78.0, "ALLSKY_SFC_SW_DWN": 3.9, "WS10M": 1.8},
    "coastal": {"T2M": 12.0, "RH2M": 72.0, "ALLSKY_SFC_SW_DWN": 5.1, "WS10M": 6.8},
}


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def is_protected_historical_path(path: Path) -> bool:
    try:
        resolved = path.resolve()
    except OSError:
        resolved = path
    for protected in PROTECTED_HISTORICAL_PATHS:
        try:
            if resolved == protected.resolve():
                return True
        except OSError:
            if path == protected:
                return True
    return False


def assert_not_protected_historical_write(path: Path) -> None:
    if is_protected_historical_path(path):
        raise PermissionError(
            f"Refusing to overwrite protected historical NASA path: {path}. "
            "Write new acquires under data-pipeline/snapshots/public_bounded/nasa/<stamp>/."
        )


def historical_manifest_bytes_ok() -> bool:
    path = NASA_EXPORT / "nasa_metadata_manifest.json"
    if not path.is_file():
        return False
    return _sha256_bytes(path.read_bytes()) == HISTORICAL_MANIFEST_SHA256


def versioned_nasa_snapshot_dir(stamp: str | None = None) -> Path:
    stamp = stamp or _now().replace(":", "-")
    return NASA_SNAPSHOT_ROOT / stamp


def _write_json(path: Path, data: object) -> str:
    assert_not_protected_historical_write(path)
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


def verified_count_for_nasa_manifest(
    data_mode: str,
    record_count: int,
    explicit_verified: int | None = None,
) -> int:
    """Fetch length is not a reviewed count. explicit_verified is the only reviewed count."""
    del record_count
    if data_mode == "sample_fallback":
        return 0
    if isinstance(explicit_verified, int):
        return explicit_verified
    return 0


def nasa_verification_mode(data_mode: str) -> str:
    """A nonzero payload length does not make verificationMode source_verified."""
    if data_mode == "cached_nasa_snapshot":
        return "mixed"
    if data_mode == "real_metadata":
        return "real_metadata"
    return "sample_fallback"


def ingest_nasa_metadata(
    *,
    output_dir: Path | None = None,
    overwrite_historical: bool = False,
) -> dict:
    """Fetch public NASA metadata into a versioned snapshot directory.

    Never rewrites protected historical export/cache bytes unless
    overwrite_historical is explicitly True (tests only; production callers
    must leave it False).
    """
    if overwrite_historical:
        raise PermissionError(
            "overwrite_historical is forbidden. Historical NASA manifests are immutable."
        )

    out_dir = output_dir or versioned_nasa_snapshot_dir()
    if any(is_protected_historical_path(out_dir / name) for name in (
        "nasa_metadata_manifest.json",
        "eonet_events.json",
        "cmr_hls_collections.json",
        "power_climate_savanna.json",
        "nasa_metadata_cache.json",
    )):
        raise PermissionError(
            f"Refusing NASA ingest into protected historical directory: {out_dir}"
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    layers: list[dict] = []
    record_count = 0
    data_mode = "real_metadata"
    has_real = False
    has_sample = False

    try:
        events, _eonet_cs = fetch_eonet_events()
        _write_json(
            out_dir / "eonet_events.json",
            {
                "events": events,
                "retrievedAt": _now(),
                "sourceUrl": "https://eonet.gsfc.nasa.gov/api/v3/events",
                "dataMode": "REAL NASA METADATA",
            },
        )
        layers.append(
            {
                "id": "natural_events",
                "mode": "REAL NASA METADATA",
                "recordCount": len(events),
                "sourceUrl": "https://eonet.gsfc.nasa.gov/",
            }
        )
        record_count += len(events)
        has_real = True
    except Exception as exc:  # noqa: BLE001
        _write_json(
            out_dir / "eonet_events.json",
            {
                "events": MOCK_EONET_EVENTS,
                "retrievedAt": _now(),
                "dataMode": "SAMPLE FALLBACK",
                "error": str(exc),
            },
        )
        layers.append(
            {
                "id": "natural_events",
                "mode": "SAMPLE FALLBACK",
                "recordCount": len(MOCK_EONET_EVENTS),
            }
        )
        has_sample = True
        data_mode = "sample_fallback"

    try:
        cmr, _cmr_cs = fetch_cmr_collections("HLS")
        _write_json(
            out_dir / "cmr_hls_collections.json",
            {
                "collections": cmr,
                "retrievedAt": _now(),
                "sourceUrl": "https://cmr.earthdata.nasa.gov/",
                "dataMode": "REAL NASA METADATA",
            },
        )
        layers.append(
            {
                "id": "vegetation",
                "mode": "REAL NASA METADATA",
                "recordCount": len(cmr),
                "sourceUrl": "https://cmr.earthdata.nasa.gov/",
            }
        )
        record_count += len(cmr)
        has_real = True
    except Exception as exc:  # noqa: BLE001
        _write_json(
            out_dir / "cmr_hls_collections.json",
            {"collections": [], "dataMode": "SAMPLE FALLBACK", "error": str(exc)},
        )
        layers.append({"id": "vegetation", "mode": "SAMPLE FALLBACK", "recordCount": 0})
        has_sample = True

    try:
        power, _power_cs = fetch_power_climate()
        _write_json(
            out_dir / "power_climate_savanna.json",
            {
                "climate": power,
                "retrievedAt": _now(),
                "sourceUrl": "https://power.larc.nasa.gov/",
                "dataMode": "REAL NASA METADATA",
            },
        )
        layers.append(
            {
                "id": "climate",
                "mode": "REAL NASA METADATA",
                "recordCount": 1,
                "sourceUrl": "https://power.larc.nasa.gov/",
            }
        )
        record_count += 1
        has_real = True
    except Exception as exc:  # noqa: BLE001
        _write_json(
            out_dir / "power_climate_savanna.json",
            {
                "climate": MOCK_POWER_CLIMATE,
                "dataMode": "SAMPLE FALLBACK",
                "error": str(exc),
            },
        )
        layers.append(
            {
                "id": "climate",
                "mode": "SAMPLE FALLBACK",
                "recordCount": len(MOCK_POWER_CLIMATE),
            }
        )
        has_sample = True

    if has_real and has_sample:
        data_mode = "cached_nasa_snapshot"
    elif has_real:
        data_mode = "real_metadata"
    else:
        data_mode = "sample_fallback"

    # Fetch length ≠ source verification. Bounded acquires stay unverified.
    verification_mode = nasa_verification_mode(data_mode)
    if verification_mode == "real_metadata":
        # Live/bounded acquire decision: metadata fetched, not independently reviewed.
        published_verification = "real_metadata"
    else:
        published_verification = verification_mode

    manifest = {
        "generatedAt": _now(),
        "dataMode": data_mode,
        "verificationMode": published_verification,
        "scope": "metadata_only",
        "measurementDataMode": "not_ingested",
        "layers": layers,
        "recordCount": record_count,
        "verifiedRecordCount": verified_count_for_nasa_manifest(data_mode, record_count),
        "approvedForUse": False,
        "sourceVerified": False,
        "historicalProtectedUntouched": True,
        "historicalManifestPath": "data-pipeline/exports/nasa/nasa_metadata_manifest.json",
        "historicalManifestSha256": HISTORICAL_MANIFEST_SHA256,
        "snapshotDir": str(out_dir),
    }
    manifest_cs = _write_json(out_dir / "nasa_metadata_manifest.json", manifest)
    # Snapshot-local cache copy only — never the public historical cache path.
    _write_json(out_dir / "nasa_metadata_cache.json", manifest)

    assert historical_manifest_bytes_ok(), (
        "Historical NASA manifest bytes were altered during ingest"
    )

    return {
        "imported": has_real,
        "status": "imported" if has_real else "sample_fallback",
        "recordCount": record_count,
        "checksum": manifest_cs,
        "sourceVersion": "public-api-bounded-snapshot",
        # Registration mode for status writers — never source_verified from fetch length.
        "dataMode": "sample_fallback",
        "verifiedRecordCount": 0,
        "scope": "metadata_only",
        "measurementDataMode": "not_ingested",
        "layers": layers,
        "snapshotDir": str(out_dir),
        "sourcePath": str(out_dir / "nasa_metadata_manifest.json"),
        "approvedForUse": False,
        "sourceVerified": False,
    }
