"""Acquire bounded public snapshots (no invented credentials).

Writes hashed JSON under data-pipeline/snapshots/public_bounded/ and registers
imports as sample_fallback / needs_source_verification — never source_verified.

IUCN stays blocked without IUCN_API_TOKEN.
"""

from __future__ import annotations

import hashlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from archive_life_pipeline.paths import EXPORTS_DIR, PUBLIC_DATA, REPO_ROOT, SNAPSHOTS_DIR
from archive_life_pipeline.source_import import (
    SOURCE_SPECS,
    _unverified_registration_status,
    _write_import_status,
    write_status_reports,
)

OUT_DIR = SNAPSHOTS_DIR / "public_bounded"
HERO_BUNDLE = PUBLIC_DATA / "bundles" / "hero-species.json"


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _hero_names() -> list[str]:
    if not HERO_BUNDLE.exists():
        return [
            "Panthera leo",
            "Loxodonta africana",
            "Canis lupus",
            "Equus ferus przewalskii",
            "Mammuthus primigenius",
            "Tyrannosaurus rex",
        ]
    doc = json.loads(HERO_BUNDLE.read_text())
    return [s["scientificName"] for s in doc.get("species", []) if s.get("scientificName")]


def _http_get(url: str, timeout: float = 30.0) -> tuple[dict[str, Any], bytes]:
    import httpx

    resp = httpx.get(url, timeout=timeout, headers={"Accept": "application/json"})
    resp.raise_for_status()
    body = resp.json()
    if not isinstance(body, dict):
        body = {"data": body}
    return body, resp.content


def _write_snapshot(name: str, payload: dict[str, Any]) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / name
    raw = json.dumps(payload, indent=2, sort_keys=True).encode("utf-8")
    path.write_bytes(raw)
    return path


def acquire_col_bounded(names: list[str] | None = None) -> dict[str, Any]:
    names = names or _hero_names()
    records: list[dict[str, Any]] = []
    errors: list[str] = []
    for name in names:
        try:
            body, _ = _http_get(
                f"https://api.checklistbank.org/dataset/3LR/nameusage/search"
                f"?q={httpx_quote(name)}&limit=5&offset=0"
            )
            for hit in body.get("result", []) or []:
                records.append({"query": name, "hit": hit})
        except Exception as exc:  # noqa: BLE001 — bounded acquire continues
            errors.append(f"{name}: {exc}")
    path = _write_snapshot(
        "col_flagship_bounded.json",
        {
            "source": "col",
            "retrievedAt": _now(),
            "taxa": records,
            "errors": errors,
            "approvedForUse": False,
            "verificationStatus": "needs_source_verification",
        },
    )
    raw = path.read_bytes()
    status = _unverified_registration_status(
        record_count=len(records),
        checksum=_sha256_bytes(raw),
        source_version="checklistbank-public-bounded",
        citation="Catalogue of Life / ChecklistBank public API (bounded flagship)",
        extra={
            "sourcePath": str(path.relative_to(REPO_ROOT)),
            "verificationStatus": "needs_source_verification",
            "approvedForUse": False,
            "errors": errors,
        },
    )
    # Also write normalized export for downstream tooling
    export = EXPORTS_DIR / "col"
    export.mkdir(parents=True, exist_ok=True)
    (export / "col_taxa_normalized.json").write_text(
        json.dumps({"taxa": records, "importedAt": _now()}, indent=2)
    )
    _write_import_status(SOURCE_SPECS["col"], status)
    return {"source": "col", "path": str(path), **status}


def httpx_quote(value: str) -> str:
    from urllib.parse import quote

    return quote(value)


def acquire_gbif_bounded(names: list[str] | None = None) -> dict[str, Any]:
    names = names or _hero_names()
    records: list[dict[str, Any]] = []
    errors: list[str] = []
    for name in names:
        try:
            body, _ = _http_get(
                f"https://api.gbif.org/v1/species/match?name={httpx_quote(name)}"
            )
            if body.get("usageKey") or body.get("scientificName"):
                records.append({"query": name, "match": body})
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{name}: {exc}")
    path = _write_snapshot(
        "gbif_flagship_match_bounded.json",
        {
            "source": "gbif",
            "retrievedAt": _now(),
            "records": records,
            "count": len(records),
            "errors": errors,
            "approvedForUse": False,
            "verificationStatus": "needs_source_verification",
        },
    )
    status = _unverified_registration_status(
        record_count=len(records),
        checksum=_sha256_bytes(path.read_bytes()),
        source_version="gbif-species-match-bounded",
        citation="GBIF species match API (bounded flagship)",
        extra={
            "sourcePath": str(path.relative_to(REPO_ROOT)),
            "errors": errors,
            "approvedForUse": False,
        },
    )
    export = EXPORTS_DIR / "gbif"
    export.mkdir(parents=True, exist_ok=True)
    (export / "gbif_occurrences_normalized.json").write_text(
        json.dumps(
            {
                "records": records,
                "count": len(records),
                "note": "species match not occurrences",
            },
            indent=2,
        )
    )
    _write_import_status(SOURCE_SPECS["gbif"], status)
    return {"source": "gbif", "path": str(path), **status}


def acquire_pbdb_bounded(names: list[str] | None = None) -> dict[str, Any]:
    names = names or [
        n
        for n in _hero_names()
        if any(x in n.lower() for x in ("mammuthus", "tyrannosaurus", "trilob", "equus"))
    ] or _hero_names()[:6]
    records: list[dict[str, Any]] = []
    errors: list[str] = []
    for name in names:
        try:
            body, _ = _http_get(
                "https://paleobiodb.org/data1.2/taxa/list.json?vocab=pbdb"
                f"&name={httpx_quote(name)}&limit=5&offset=0"
            )
            for row in body.get("records", []) or []:
                records.append({"query": name, "row": row})
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{name}: {exc}")
    path = _write_snapshot(
        "pbdb_flagship_bounded.json",
        {
            "source": "pbdb",
            "retrievedAt": _now(),
            "records": records,
            "errors": errors,
            "approvedForUse": False,
            "verificationStatus": "needs_source_verification",
        },
    )
    status = _unverified_registration_status(
        record_count=len(records),
        checksum=_sha256_bytes(path.read_bytes()),
        source_version="pbdb-data1.2-bounded",
        citation="Paleobiology Database public API (bounded)",
        extra={
            "sourcePath": str(path.relative_to(REPO_ROOT)),
            "errors": errors,
            "approvedForUse": False,
        },
    )
    export = EXPORTS_DIR / "pbdb"
    export.mkdir(parents=True, exist_ok=True)
    (export / "pbdb_fossils_normalized.json").write_text(
        json.dumps({"records": records, "importedAt": _now()}, indent=2)
    )
    _write_import_status(SOURCE_SPECS["pbdb"], status)
    return {"source": "pbdb", "path": str(path), **status}


def acquire_neotoma_bounded(limit: int = 25) -> dict[str, Any]:
    errors: list[str] = []
    try:
        body, raw = _http_get(f"https://api.neotomadb.org/v2.0/data/sites?limit={limit}")
        records = body.get("data", []) if isinstance(body.get("data"), list) else []
    except Exception as exc:  # noqa: BLE001
        errors.append(str(exc))
        body, raw, records = {"data": []}, b"{}", []
    path = _write_snapshot(
        "neotoma_sites_bounded.json",
        {
            "source": "neotoma",
            "retrievedAt": _now(),
            "records": records,
            "errors": errors,
            "approvedForUse": False,
            "verificationStatus": "needs_source_verification" if records else "blocked_external",
        },
    )
    status = _unverified_registration_status(
        record_count=len(records),
        checksum=_sha256_bytes(path.read_bytes() if path.exists() else raw),
        source_version="neotoma-api-v2-bounded",
        citation="Neotoma Paleoecology Database API (sites sample)",
        extra={
            "sourcePath": str(path.relative_to(REPO_ROOT)),
            "errors": errors,
            "approvedForUse": False,
        },
    )
    if not records:
        status["imported"] = False
        status["status"] = "blocked"
        status["blockedReason"] = errors[0] if errors else "Neotoma fetch empty"
        status["dataMode"] = None
    export = EXPORTS_DIR / "neotoma"
    export.mkdir(parents=True, exist_ok=True)
    (export / "neotoma_normalized.json").write_text(json.dumps({"records": records}, indent=2))
    _write_import_status(SOURCE_SPECS["neotoma"], status)
    return {"source": "neotoma", "path": str(path), **status}


def acquire_ics_labels() -> dict[str, Any]:
    units = [
        {"id": "hadean", "name": "Hadean", "rank": "eon"},
        {"id": "archean", "name": "Archean", "rank": "eon"},
        {"id": "proterozoic", "name": "Proterozoic", "rank": "eon"},
        {"id": "cambrian", "name": "Cambrian", "rank": "period"},
        {"id": "ordovician", "name": "Ordovician", "rank": "period"},
        {"id": "silurian", "name": "Silurian", "rank": "period"},
        {"id": "devonian", "name": "Devonian", "rank": "period"},
        {"id": "carboniferous", "name": "Carboniferous", "rank": "period"},
        {"id": "permian", "name": "Permian", "rank": "period"},
        {"id": "triassic", "name": "Triassic", "rank": "period"},
        {"id": "jurassic", "name": "Jurassic", "rank": "period"},
        {"id": "cretaceous", "name": "Cretaceous", "rank": "period"},
        {"id": "paleogene", "name": "Paleogene", "rank": "period"},
        {"id": "neogene", "name": "Neogene", "rank": "period"},
        {"id": "pleistocene", "name": "Pleistocene", "rank": "epoch"},
        {"id": "holocene", "name": "Holocene", "rank": "epoch"},
        {"id": "ediacaran", "name": "Ediacaran", "rank": "period"},
    ]
    path = _write_snapshot(
        "ics_label_inventory.json",
        {
            "source": "ics",
            "citation": "International Chronostratigraphic Chart — https://stratigraphy.org/",
            "retrievedAt": _now(),
            "units": units,
            "approvedForUse": False,
            "verificationStatus": "needs_source_verification",
            "note": "Label inventory only — does not clear time_manifest.isMockData or unlock maps",
        },
    )
    return {
        "source": "ics",
        "path": str(path),
        "recordCount": len(units),
        "checksum": _sha256_bytes(path.read_bytes()),
        "imported": True,
        "verifiedRecordCount": 0,
        "dataMode": "sample_fallback",
        "approvedForUse": False,
    }


def acquire_iucn_status() -> dict[str, Any]:
    token = os.environ.get("IUCN_API_TOKEN", "").strip()
    if not token:
        # Also check data-pipeline/.env via source_import loader
        from archive_life_pipeline.source_import import _load_env

        token = _load_env().get("IUCN_API_TOKEN", "").strip()
    if not token:
        status = {
            "imported": False,
            "status": "blocked",
            "recordCount": 0,
            "verifiedRecordCount": 0,
            "blockedReason": SOURCE_SPECS["iucn"].blocked_message,
            "next_action": SOURCE_SPECS["iucn"].next_action,
            "dataMode": None,
            "ownerSetup": [
                "Obtain IUCN Red List API token under IUCN terms",
                "Set IUCN_API_TOKEN in data-pipeline/.env (never commit)",
                "Human rights review before redistribution / game display",
                "npm run source:import:iucn",
            ],
        }
        _write_import_status(SOURCE_SPECS["iucn"], status)
        return {"source": "iucn", "blocked": True, **status}
    from archive_life_pipeline.source_import import import_iucn

    rec = import_iucn()
    return {
        "source": "iucn",
        "blocked": False,
        "imported": rec.imported,
        "recordCount": rec.record_count,
    }


def acquire_all_public_bounded(*, include_nasa: bool = True) -> dict[str, Any]:
    results: dict[str, Any] = {}
    results["col"] = acquire_col_bounded()
    results["gbif"] = acquire_gbif_bounded()
    results["pbdb"] = acquire_pbdb_bounded()
    results["neotoma"] = acquire_neotoma_bounded()
    results["ics"] = acquire_ics_labels()
    results["iucn"] = acquire_iucn_status()
    if include_nasa:
        from archive_life_pipeline.source_import import import_nasa

        try:
            nasa = import_nasa()
            results["nasa"] = {
                "source": "nasa",
                "imported": nasa.imported,
                "recordCount": nasa.record_count,
                "verifiedRecordCount": nasa.verified_record_count,
                "dataMode": nasa.data_mode,
                "note": "Metadata only — regional measurements remain sample",
            }
        except Exception as exc:  # noqa: BLE001
            results["nasa"] = {"source": "nasa", "error": str(exc)}
    write_status_reports()
    manifest = {
        "generatedAt": _now(),
        "approvedForUse": False,
        "anySourceVerified": False,
        "productionReady": False,
        "results": {
            k: {
                "imported": v.get("imported"),
                "recordCount": v.get("recordCount"),
                "verifiedRecordCount": v.get("verifiedRecordCount", 0),
                "dataMode": v.get("dataMode"),
                "blocked": v.get("blocked"),
                "path": v.get("path"),
            }
            for k, v in results.items()
        },
        "honesty": [
            "Bounded public fetches do not promote mock hero provenance to source_verified",
            "IUCN remains blocked without authorized token + rights review",
            "ICS labels do not unlock 17 temporal maps",
            "NASA metadata ≠ regional measurement verification",
        ],
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "ACQUIRE_MANIFEST.json").write_text(json.dumps(manifest, indent=2))
    (PUBLIC_DATA / "status" / "public_bounded_acquire_report.json").write_text(
        json.dumps(manifest, indent=2)
    )
    return manifest
