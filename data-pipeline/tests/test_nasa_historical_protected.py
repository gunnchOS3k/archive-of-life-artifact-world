"""Historical NASA bytes stay put; bounded acquires cannot overwrite them."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from archive_life_pipeline.nasa_ingest import (
    HISTORICAL_IMPORT_STATUS_SHA256,
    HISTORICAL_MANIFEST_SHA256,
    PROTECTED_HISTORICAL_PATHS,
    assert_not_protected_historical_write,
    historical_manifest_bytes_ok,
    ingest_nasa_metadata,
    is_protected_historical_path,
)
from archive_life_pipeline.paths import EXPORTS_DIR, PUBLIC_DATA, REPO_ROOT
from archive_life_pipeline.public_bounded_acquire import acquire_nasa_bounded
from archive_life_pipeline.source_import import (
    SOURCE_SPECS,
    _read_import_status,
    _write_import_status,
    audit_sources,
    write_status_reports,
)

MANIFEST = EXPORTS_DIR / "nasa" / "nasa_metadata_manifest.json"
CACHE = PUBLIC_DATA / "earth" / "nasa_metadata_cache.json"
IMPORT_STATUS = EXPORTS_DIR / "nasa" / "import_status.json"
DECISION = EXPORTS_DIR / "nasa" / "nasa_metadata_manifest_verification_decision.json"


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_historical_nasa_bytes_unchanged():
    assert historical_manifest_bytes_ok()
    assert _sha256(MANIFEST) == HISTORICAL_MANIFEST_SHA256
    assert _sha256(CACHE) == HISTORICAL_MANIFEST_SHA256
    assert _sha256(IMPORT_STATUS) == HISTORICAL_IMPORT_STATUS_SHA256
    historical = json.loads(MANIFEST.read_text())
    assert historical["generatedAt"] == "2026-07-05T03:41:38Z"
    assert historical["verificationMode"] == "source_verified"
    assert historical["verifiedRecordCount"] == 21
    assert historical["recordCount"] == 21


def test_new_acquires_cannot_overwrite_historical(tmp_path, monkeypatch):
    before = {str(p): _sha256(p) for p in PROTECTED_HISTORICAL_PATHS if p.is_file()}

    # Force sample fallback so the test stays offline.
    monkeypatch.setattr(
        "archive_life_pipeline.nasa_ingest.fetch_eonet_events",
        lambda: (_ for _ in ()).throw(RuntimeError("offline")),
    )
    monkeypatch.setattr(
        "archive_life_pipeline.nasa_ingest.fetch_cmr_collections",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("offline")),
    )
    monkeypatch.setattr(
        "archive_life_pipeline.nasa_ingest.fetch_power_climate",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("offline")),
    )

    snap = tmp_path / "nasa-snap"
    result = ingest_nasa_metadata(output_dir=snap)
    assert Path(result["snapshotDir"]) == snap
    assert (snap / "nasa_metadata_manifest.json").is_file()
    assert result["verifiedRecordCount"] == 0
    assert result["dataMode"] == "sample_fallback"
    assert result["sourceVerified"] is False

    for path_str, digest in before.items():
        assert _sha256(Path(path_str)) == digest

    with pytest.raises(PermissionError):
        assert_not_protected_historical_write(MANIFEST)
    with pytest.raises(PermissionError):
        ingest_nasa_metadata(output_dir=EXPORTS_DIR / "nasa")
    with pytest.raises(PermissionError):
        _write_import_status(SOURCE_SPECS["nasa"], {"imported": True})


def test_verification_decision_honest_and_separate_from_historical():
    assert is_protected_historical_path(MANIFEST)
    decision = json.loads(DECISION.read_text())
    assert decision["historicalManifest"]["sha256"] == HISTORICAL_MANIFEST_SHA256
    assert decision["historicalManifest"]["bytesRewritten"] is False
    current = decision["currentVerificationDecision"]
    assert current["sourceVerified"] is False
    assert current["verificationMode"] != "source_verified"
    assert current["verifiedRecordCount"] == 0

    rec = _read_import_status(SOURCE_SPECS["nasa"])
    assert rec.historical_data_mode == "source_verified"
    assert rec.historical_verified_record_count == 21
    assert rec.data_mode == "not_source_verified"
    assert rec.verified_record_count == 0
    assert rec.record_count == 21


def test_import_counts_are_not_source_verification():
    on_disk = json.loads(IMPORT_STATUS.read_text())
    assert on_disk["recordCount"] == 21
    assert on_disk["verifiedRecordCount"] == 21  # historical claim only
    assert on_disk["dataMode"] == "source_verified"

    rec = _read_import_status(SOURCE_SPECS["nasa"])
    # Live reader separates import length from current verification.
    assert rec.record_count == 21
    assert rec.verified_record_count == 0
    assert rec.data_mode != "source_verified"
    assert rec.record_count != rec.verified_record_count

    audit = audit_sources()
    nasa = next(s for s in audit["sources"] if s["source"] == "nasa")
    assert nasa["record_count"] == 21
    assert nasa["verified_record_count"] == 0
    assert nasa["historical_verified_record_count"] == 21
    assert audit["verifiedRecordCount"] == 0
    assert audit["historical_verified_record_count"] == 21


def test_bounded_nasa_acquire_writes_versioned_snapshot_only(tmp_path, monkeypatch):
    before_manifest = _sha256(MANIFEST)
    before_status = _sha256(IMPORT_STATUS)
    before_cache = _sha256(CACHE)

    snap = tmp_path / "bounded-nasa"
    monkeypatch.setattr(
        "archive_life_pipeline.nasa_ingest.versioned_nasa_snapshot_dir",
        lambda stamp=None: snap,
    )
    monkeypatch.setattr(
        "archive_life_pipeline.nasa_ingest.fetch_eonet_events",
        lambda: (_ for _ in ()).throw(RuntimeError("offline")),
    )
    monkeypatch.setattr(
        "archive_life_pipeline.nasa_ingest.fetch_cmr_collections",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("offline")),
    )
    monkeypatch.setattr(
        "archive_life_pipeline.nasa_ingest.fetch_power_climate",
        lambda *_a, **_k: (_ for _ in ()).throw(RuntimeError("offline")),
    )

    out = acquire_nasa_bounded()
    assert out["verifiedRecordCount"] == 0
    assert out["dataMode"] == "sample_fallback"
    assert out["sourceVerified"] is False
    assert str(out["path"]).startswith(str(snap))
    assert _sha256(MANIFEST) == before_manifest == HISTORICAL_MANIFEST_SHA256
    assert _sha256(IMPORT_STATUS) == before_status == HISTORICAL_IMPORT_STATUS_SHA256
    assert _sha256(CACHE) == before_cache == HISTORICAL_MANIFEST_SHA256


def test_write_status_reports_keep_nasa_honesty(tmp_path, monkeypatch):
    status_dir = tmp_path / "status"
    status_dir.mkdir()
    monkeypatch.setattr("archive_life_pipeline.source_import.STATUS_DIR", status_dir)
    write_status_reports()
    import_doc = json.loads((status_dir / "source_import_status.json").read_text())
    ready_doc = json.loads((status_dir / "source_readiness_report.json").read_text())
    nasa = next(s for s in import_doc["sources"] if s["source"] == "nasa")
    assert nasa["data_mode"] == "not_source_verified"
    assert nasa["verified_record_count"] == 0
    assert nasa["historical_verified_record_count"] == 21
    assert import_doc["verifiedRecordCount"] == 0
    assert import_doc["historical_verified_record_count"] == 21
    ready_nasa = next(s for s in ready_doc["sources"] if s["source"] == "nasa")
    assert ready_nasa["verified_record_count"] == 0
    assert ready_doc["summary"]["verifiedRecordCount"] == 0
    assert ready_doc["summary"]["historical_verified_record_count"] == 21
    # Historical bytes still untouched after status regen.
    assert _sha256(MANIFEST) == HISTORICAL_MANIFEST_SHA256
    assert (REPO_ROOT / "data-pipeline/exports/nasa/nasa_metadata_manifest.json").is_file()
