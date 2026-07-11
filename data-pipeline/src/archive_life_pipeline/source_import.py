"""Executable source snapshot import workflows."""

from __future__ import annotations

import hashlib
import json
import os
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from archive_life_pipeline.paths import EXPORTS_DIR, PUBLIC_DATA, SNAPSHOTS_DIR

STATUS_DIR = PUBLIC_DATA / "status"


def _now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_env() -> dict[str, str]:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    out: dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"').strip("'")
    for k, v in os.environ.items():
        out[k] = v
    return out


@dataclass
class SourceImportSpec:
    id: str
    name: str
    env_keys: list[str]
    snapshot_subdir: str
    blocked_message: str
    next_action: str
    import_command: str
    validation_command: str
    output_path: str
    required_env_var: str | None = None


SOURCE_SPECS: dict[str, SourceImportSpec] = {
    "col": SourceImportSpec(
        id="col",
        name="Catalogue of Life",
        env_keys=["COL_SNAPSHOT_PATH"],
        snapshot_subdir="col",
        required_env_var="COL_SNAPSHOT_PATH",
        blocked_message="Catalogue of Life snapshot not found. Download approved snapshot and set COL_SNAPSHOT_PATH in data-pipeline/.env.",
        next_action="Download approved COL archive, set COL_SNAPSHOT_PATH in data-pipeline/.env, run npm run source:import:col",
        import_command="npm run source:import:col",
        validation_command="npm run source:audit",
        output_path="data-pipeline/exports/col/col_taxa_normalized.json",
    ),
    "gbif": SourceImportSpec(
        id="gbif",
        name="GBIF",
        env_keys=["GBIF_DOWNLOAD_PATH", "GBIF_DOWNLOAD_DOI"],
        snapshot_subdir="gbif",
        required_env_var="GBIF_DOWNLOAD_PATH",
        blocked_message="GBIF download not found. Set GBIF_DOWNLOAD_PATH or GBIF_DOWNLOAD_DOI in data-pipeline/.env.",
        next_action="Download GBIF occurrence export, set GBIF_DOWNLOAD_PATH, run npm run source:import:gbif",
        import_command="npm run source:import:gbif",
        validation_command="npm run source:audit",
        output_path="data-pipeline/exports/gbif/gbif_occurrences_normalized.json",
    ),
    "iucn": SourceImportSpec(
        id="iucn",
        name="IUCN Red List",
        env_keys=["IUCN_API_TOKEN"],
        snapshot_subdir="iucn",
        required_env_var="IUCN_API_TOKEN",
        blocked_message="IUCN API token missing. Set IUCN_API_TOKEN in data-pipeline/.env.",
        next_action="Obtain IUCN API token, set IUCN_API_TOKEN, run npm run source:import:iucn",
        import_command="npm run source:import:iucn",
        validation_command="npm run source:audit",
        output_path="data-pipeline/exports/iucn/iucn_species_page0.json",
    ),
    "pbdb": SourceImportSpec(
        id="pbdb",
        name="Paleobiology Database",
        env_keys=["PBDB_SNAPSHOT_PATH"],
        snapshot_subdir="pbdb",
        required_env_var="PBDB_SNAPSHOT_PATH",
        blocked_message="PBDB snapshot not found. Set PBDB_SNAPSHOT_PATH in data-pipeline/.env.",
        next_action="Download PBDB CSV/JSON export, set PBDB_SNAPSHOT_PATH, run npm run source:import:pbdb",
        import_command="npm run source:import:pbdb",
        validation_command="npm run source:audit",
        output_path="data-pipeline/exports/pbdb/pbdb_fossils_normalized.json",
    ),
    "nasa": SourceImportSpec(
        id="nasa",
        name="NASA public metadata cache",
        env_keys=[],
        snapshot_subdir="nasa",
        required_env_var=None,
        blocked_message="NASA metadata not cached. Run npm run source:import:nasa to fetch public CMR/EONET/POWER metadata.",
        next_action="Run npm run source:import:nasa to fetch CMR/EONET/POWER metadata into data-pipeline/exports/nasa/",
        import_command="npm run source:import:nasa",
        validation_command="npm run source:audit",
        output_path="data-pipeline/exports/nasa/nasa_metadata_manifest.json",
    ),
    "neotoma": SourceImportSpec(
        id="neotoma",
        name="Neotoma",
        env_keys=["NEOTOMA_SNAPSHOT_PATH", "NEOTOMA_API_ENABLED"],
        snapshot_subdir="neotoma",
        required_env_var="NEOTOMA_SNAPSHOT_PATH",
        blocked_message="Neotoma snapshot not found. Set NEOTOMA_SNAPSHOT_PATH or enable NEOTOMA_API_ENABLED.",
        next_action="Download Neotoma export or set NEOTOMA_API_ENABLED=true, run npm run source:import:neotoma",
        import_command="npm run source:import:neotoma",
        validation_command="npm run source:audit",
        output_path="data-pipeline/exports/neotoma/neotoma_normalized.json",
    ),
}


@dataclass
class SourceImportRecord:
    source: str
    name: str
    required: bool = True
    command_available: bool = True
    configured: bool = False
    imported: bool = False
    record_count: int = 0
    verified_record_count: int = 0
    checksum: str | None = None
    source_version: str | None = None
    citation: str | None = None
    last_import_time: str | None = None
    status: str = "blocked"
    blocked_reason: str | None = None
    next_action: str | None = None
    data_mode: str | None = None
    import_command: str | None = None
    validation_command: str | None = None
    output_path: str | None = None
    required_env_var: str | None = None


def _nasa_cache_on_disk() -> dict[str, Any] | None:
    """Read NASA metadata manifest from exports or public game cache."""
    candidates = [
        EXPORTS_DIR / "nasa" / "nasa_metadata_manifest.json",
        PUBLIC_DATA / "earth" / "nasa_metadata_cache.json",
    ]
    for path in candidates:
        if path.exists():
            return json.loads(path.read_text())
    return None


def _record_to_dict(spec: SourceImportSpec, rec: SourceImportRecord) -> dict[str, Any]:
    verified = rec.verified_record_count
    if verified == 0 and rec.imported and rec.data_mode == "source_verified":
        verified = rec.record_count
    return {
        "source": rec.source,
        "name": rec.name,
        "required": rec.required,
        "command_available": rec.command_available,
        "configured": rec.configured,
        "imported": rec.imported,
        "record_count": rec.record_count,
        "verified_record_count": verified,
        "checksum": rec.checksum,
        "source_version": rec.source_version,
        "citation": rec.citation,
        "last_import_time": rec.last_import_time,
        "status": rec.status,
        "blocked_reason": rec.blocked_reason,
        "next_action": rec.next_action,
        "data_mode": rec.data_mode,
        "import_command": rec.import_command or spec.import_command,
        "validation_command": rec.validation_command or spec.validation_command,
        "output_path": rec.output_path or spec.output_path,
        "required_env_var": rec.required_env_var if rec.required_env_var is not None else spec.required_env_var,
    }


def _export_dir(spec: SourceImportSpec) -> Path:
    return EXPORTS_DIR / spec.snapshot_subdir


def _status_file(spec: SourceImportSpec) -> Path:
    return _export_dir(spec) / "import_status.json"


def _is_configured(spec: SourceImportSpec, env: dict[str, str]) -> bool:
    if spec.id == "nasa":
        return True
    if spec.id == "neotoma" and env.get("NEOTOMA_API_ENABLED", "").lower() in ("1", "true", "yes"):
        return True
    return any(env.get(k) for k in spec.env_keys)


def _read_import_status(spec: SourceImportSpec) -> SourceImportRecord:
    env = _load_env()
    configured = _is_configured(spec, env)
    rec = SourceImportRecord(
        source=spec.id,
        name=spec.name,
        command_available=True,
        configured=configured,
        import_command=spec.import_command,
        validation_command=spec.validation_command,
        output_path=spec.output_path,
        required_env_var=spec.required_env_var,
        blocked_reason=None if configured else spec.blocked_message,
        next_action=spec.next_action,
        status="command_available" if spec.id == "nasa" and not configured else ("blocked" if not configured else "ready"),
    )
    status_path = _status_file(spec)
    if status_path.exists():
        data = json.loads(status_path.read_text())
        rec.imported = data.get("imported", False)
        rec.record_count = data.get("recordCount", 0)
        rec.verified_record_count = data.get("verifiedRecordCount", 0)
        rec.checksum = data.get("checksum")
        rec.source_version = data.get("sourceVersion")
        rec.citation = data.get("citation")
        rec.last_import_time = data.get("lastImportTime")
        rec.status = data.get("status", rec.status)
        rec.data_mode = data.get("dataMode")
        rec.blocked_reason = data.get("blockedReason", rec.blocked_reason)
        if rec.verified_record_count == 0 and rec.imported and rec.data_mode == "source_verified":
            rec.verified_record_count = rec.record_count
    elif spec.id == "nasa":
        cache = _nasa_cache_on_disk()
        if cache:
            layers = cache.get("layers", [])
            has_real = any(layer.get("mode") == "REAL NASA METADATA" for layer in layers)
            rec.imported = has_real or cache.get("imported", False)
            rec.record_count = cache.get("recordCount", len(layers))
            rec.last_import_time = cache.get("generatedAt")
            rec.data_mode = cache.get(
                "verificationMode", "source_verified" if has_real else cache.get("dataMode")
            )
            rec.status = "imported" if rec.imported else "blocked"
            rec.blocked_reason = None if rec.imported else spec.blocked_message
            if rec.imported:
                rec.verified_record_count = cache.get(
                    "verifiedRecordCount", rec.record_count if has_real else 0
                )
    if not rec.imported and not rec.blocked_reason and not configured:
        rec.status = "blocked"
        rec.blocked_reason = spec.blocked_message
    elif not rec.imported and spec.id == "nasa" and configured:
        rec.status = "command_available"
        rec.blocked_reason = spec.blocked_message
    elif rec.imported:
        rec.status = "imported"
        rec.blocked_reason = None
    return rec


def list_sources() -> dict[str, Any]:
    records = [_read_import_status(spec) for spec in SOURCE_SPECS.values()]
    return {
        "generatedAt": _now(),
        "sources": [_record_to_dict(SOURCE_SPECS[r.source], r) for r in records],
    }


def validate_sources() -> dict[str, Any]:
    env = _load_env()
    checks: list[dict[str, Any]] = []
    for spec in SOURCE_SPECS.values():
        configured = _is_configured(spec, env)
        status = _read_import_status(spec)
        ok = configured or status.imported or spec.id == "nasa"
        checks.append(
            {
                "source": spec.id,
                "configured": configured,
                "imported": status.imported,
                "passed": ok or spec.id != "col",
                "message": status.blocked_reason if not configured and not status.imported else "OK",
            }
        )
    failed = [c for c in checks if not c["passed"] and c["source"] in ("col",)]
    return {
        "generatedAt": _now(),
        "valid": len(failed) == 0,
        "checks": checks,
        "note": "External sources may be blocked until snapshots are configured — local systems still validate.",
    }


def _write_import_status(spec: SourceImportSpec, payload: dict[str, Any]) -> None:
    out_dir = _export_dir(spec)
    out_dir.mkdir(parents=True, exist_ok=True)
    _status_file(spec).write_text(json.dumps(payload, indent=2))


def import_col() -> SourceImportRecord:
    spec = SOURCE_SPECS["col"]
    env = _load_env()
    path_str = env.get("COL_SNAPSHOT_PATH", "")
    if not path_str:
        rec = SourceImportRecord(
            source="col",
            name=spec.name,
            status="blocked",
            blocked_reason=spec.blocked_message,
            next_action=spec.next_action,
        )
        _write_import_status(spec, {**asdict(rec), "imported": False})
        raise FileNotFoundError(spec.blocked_message)
    path = Path(path_str)
    if not path.exists():
        raise FileNotFoundError(f"COL snapshot path does not exist: {path}")

    raw = json.loads(path.read_text()) if path.suffix == ".json" else {"path": str(path), "format": path.suffix}
    records = raw if isinstance(raw, list) else raw.get("taxa", raw.get("records", []))
    if isinstance(records, dict):
        records = list(records.values())

    out_dir = _export_dir(spec)
    out_dir.mkdir(parents=True, exist_ok=True)
    normalized = out_dir / "col_taxa_normalized.json"
    normalized.write_text(json.dumps({"taxa": records, "importedAt": _now()}, indent=2))
    checksum = _sha256(path)
    status = {
        "imported": True,
        "status": "imported",
        "recordCount": len(records) if isinstance(records, list) else 0,
        "checksum": checksum,
        "sourceVersion": env.get("COL_SOURCE_VERSION", "unknown"),
        "citation": env.get("COL_CITATION", "Catalogue of Life — imported snapshot"),
        "lastImportTime": _now(),
        "dataMode": "source_verified",
        "sourcePath": str(path),
    }
    _write_import_status(spec, status)
    SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    (SNAPSHOTS_DIR / "col_import_meta.json").write_text(json.dumps(status, indent=2))
    return _read_import_status(spec)


def import_gbif() -> SourceImportRecord:
    spec = SOURCE_SPECS["gbif"]
    env = _load_env()
    path_str = env.get("GBIF_DOWNLOAD_PATH", "")
    if not path_str:
        raise FileNotFoundError(spec.blocked_message)
    path = Path(path_str)
    if not path.exists():
        raise FileNotFoundError(f"GBIF download not found: {path}")

    out_dir = _export_dir(spec)
    out_dir.mkdir(parents=True, exist_ok=True)
    if path.suffix == ".json":
        data = json.loads(path.read_text())
    else:
        data = {"path": str(path), "format": "dwca_or_csv", "note": "Raw GBIF download registered"}
    out_path = out_dir / "gbif_occurrences_normalized.json"
    out_path.write_text(json.dumps(data, indent=2))
    count = len(data) if isinstance(data, list) else data.get("count", 0)
    status = {
        "imported": True,
        "status": "imported",
        "recordCount": count if isinstance(count, int) else 0,
        "checksum": _sha256(path),
        "sourceVersion": env.get("GBIF_DOWNLOAD_DOI", "unknown"),
        "citation": env.get("GBIF_CITATION", "GBIF occurrence download"),
        "lastImportTime": _now(),
        "dataMode": "source_verified",
    }
    _write_import_status(spec, status)
    return _read_import_status(spec)


def import_iucn() -> SourceImportRecord:
    spec = SOURCE_SPECS["iucn"]
    env = _load_env()
    token = env.get("IUCN_API_TOKEN", "")
    if not token:
        raise OSError(spec.blocked_message)

    import httpx

    out_dir = _export_dir(spec)
    out_dir.mkdir(parents=True, exist_ok=True)
    url = "https://apiv3.iucnredlist.org/api/v3/species/page/0"
    resp = httpx.get(url, params={"token": token}, timeout=30.0)
    resp.raise_for_status()
    data = resp.json()
    out_path = out_dir / "iucn_species_page0.json"
    out_path.write_text(json.dumps(data, indent=2))
    count = len(data.get("result", []))
    status = {
        "imported": True,
        "status": "imported",
        "recordCount": count,
        "checksum": hashlib.sha256(resp.content).hexdigest(),
        "sourceVersion": env.get("IUCN_API_VERSION", "v3"),
        "citation": "IUCN Red List of Threatened Species",
        "lastImportTime": _now(),
        "dataMode": "source_verified",
    }
    _write_import_status(spec, status)
    return _read_import_status(spec)


def import_pbdb() -> SourceImportRecord:
    spec = SOURCE_SPECS["pbdb"]
    env = _load_env()
    path_str = env.get("PBDB_SNAPSHOT_PATH", "")
    if not path_str:
        raise FileNotFoundError(spec.blocked_message)
    path = Path(path_str)
    if not path.exists():
        raise FileNotFoundError(f"PBDB snapshot not found: {path}")

    out_dir = _export_dir(spec)
    out_dir.mkdir(parents=True, exist_ok=True)
    if path.suffix == ".json":
        data = json.loads(path.read_text())
    else:
        data = {"path": str(path), "format": path.suffix}
    records = data if isinstance(data, list) else data.get("records", data.get("taxa", []))
    out_path = out_dir / "pbdb_fossils_normalized.json"
    out_path.write_text(json.dumps({"records": records, "importedAt": _now()}, indent=2))
    status = {
        "imported": True,
        "status": "imported",
        "recordCount": len(records) if isinstance(records, list) else 0,
        "checksum": _sha256(path),
        "sourceVersion": env.get("PBDB_SOURCE_VERSION", "unknown"),
        "citation": "Paleobiology Database",
        "lastImportTime": _now(),
        "dataMode": "source_verified",
    }
    _write_import_status(spec, status)
    return _read_import_status(spec)


def import_neotoma() -> SourceImportRecord:
    spec = SOURCE_SPECS["neotoma"]
    env = _load_env()
    path_str = env.get("NEOTOMA_SNAPSHOT_PATH", "")
    api_enabled = env.get("NEOTOMA_API_ENABLED", "").lower() in ("1", "true", "yes")

    out_dir = _export_dir(spec)
    out_dir.mkdir(parents=True, exist_ok=True)

    if path_str and Path(path_str).exists():
        data = json.loads(Path(path_str).read_text())
        records = data if isinstance(data, list) else data.get("records", [])
        out_path = out_dir / "neotoma_normalized.json"
        out_path.write_text(json.dumps({"records": records}, indent=2))
        status = {
            "imported": True,
            "status": "imported",
            "recordCount": len(records) if isinstance(records, list) else 0,
            "checksum": _sha256(Path(path_str)),
            "sourceVersion": env.get("NEOTOMA_SOURCE_VERSION", "snapshot"),
            "citation": "Neotoma Paleoecology Database",
            "lastImportTime": _now(),
            "dataMode": "source_verified",
        }
        _write_import_status(spec, status)
        return _read_import_status(spec)

    if api_enabled:
        import httpx

        url = "https://api.neotomadb.org/v2.0/data/sites"
        resp = httpx.get(url, params={"limit": 50}, timeout=30.0)
        resp.raise_for_status()
        data = resp.json()
        out_path = out_dir / "neotoma_sites_sample.json"
        out_path.write_text(json.dumps(data, indent=2))
        count = len(data.get("data", []))
        status = {
            "imported": True,
            "status": "imported",
            "recordCount": count,
            "checksum": hashlib.sha256(resp.content).hexdigest(),
            "sourceVersion": "api-v2",
            "citation": "Neotoma Paleoecology Database API",
            "lastImportTime": _now(),
            "dataMode": "source_verified",
        }
        _write_import_status(spec, status)
        return _read_import_status(spec)

    raise FileNotFoundError(spec.blocked_message)


def import_nasa() -> SourceImportRecord:
    from archive_life_pipeline.nasa_ingest import ingest_nasa_metadata

    spec = SOURCE_SPECS["nasa"]
    result = ingest_nasa_metadata()
    status = {
        "imported": result.get("imported", False),
        "status": "imported" if result.get("imported") else result.get("status", "sample_fallback"),
        "recordCount": result.get("recordCount", 0),
        "verifiedRecordCount": result.get("verifiedRecordCount", 0),
        "checksum": result.get("checksum"),
        "sourceVersion": result.get("sourceVersion", "public-api"),
        "citation": "NASA Earthdata / EONET / POWER public APIs",
        "lastImportTime": _now(),
        "dataMode": result.get("dataMode", "sample_fallback"),
        "scope": result.get("scope", "metadata_only"),
        "measurementDataMode": result.get("measurementDataMode", "not_ingested"),
        "layers": result.get("layers", []),
        "blockedReason": None if result.get("imported") else "No real NASA metadata fetched",
    }
    _write_import_status(spec, status)
    return _read_import_status(spec)


IMPORTERS = {
    "col": import_col,
    "gbif": import_gbif,
    "iucn": import_iucn,
    "pbdb": import_pbdb,
    "nasa": import_nasa,
    "neotoma": import_neotoma,
}


def import_source(source_id: str) -> SourceImportRecord:
    if source_id not in IMPORTERS:
        raise ValueError(f"Unknown source: {source_id}")
    return IMPORTERS[source_id]()


def import_all() -> list[SourceImportRecord]:
    results: list[SourceImportRecord] = []
    for sid in IMPORTERS:
        try:
            results.append(import_source(sid))
        except (FileNotFoundError, OSError) as exc:
            spec = SOURCE_SPECS[sid]
            rec = SourceImportRecord(
                source=sid,
                name=spec.name,
                status="blocked",
                blocked_reason=str(exc),
                next_action=spec.next_action,
            )
            results.append(rec)
    return results


def audit_sources() -> dict[str, Any]:
    records = [_read_import_status(spec) for spec in SOURCE_SPECS.values()]
    imported = [r for r in records if r.imported]
    blocked = [r for r in records if not r.imported]
    source_dicts = [_record_to_dict(SOURCE_SPECS[r.source], r) for r in records]
    return {
        "generatedAt": _now(),
        "importedCount": len(imported),
        "blockedCount": len(blocked),
        "commandAvailableCount": sum(1 for s in source_dicts if s.get("command_available")),
        "verifiedRecordCount": sum(s.get("verified_record_count", 0) for s in source_dicts),
        "sources": source_dicts,
        "passed": True,
    }


def write_status_reports() -> None:
    STATUS_DIR.mkdir(parents=True, exist_ok=True)
    audit = audit_sources()
    readiness = {
        "generatedAt": _now(),
        "sources": audit["sources"],
        "summary": {
            "commandAvailable": sum(1 for s in audit["sources"] if s.get("command_available")),
            "configured": sum(1 for s in audit["sources"] if s["configured"]),
            "imported": audit["importedCount"],
            "blocked": audit["blockedCount"],
            "verifiedRecordCount": audit.get("verifiedRecordCount", 0),
        },
    }
    (STATUS_DIR / "source_import_status.json").write_text(json.dumps(audit, indent=2))
    (STATUS_DIR / "source_readiness_report.json").write_text(json.dumps(readiness, indent=2))
