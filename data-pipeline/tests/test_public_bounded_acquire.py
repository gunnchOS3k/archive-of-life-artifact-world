"""Offline honesty tests for public bounded acquire (no network required)."""

import hashlib
from pathlib import Path

from archive_life_pipeline.nasa_ingest import HISTORICAL_MANIFEST_SHA256
from archive_life_pipeline.paths import EXPORTS_DIR
from archive_life_pipeline.public_bounded_acquire import (
    acquire_ics_labels,
    acquire_iucn_status,
    acquire_nasa_bounded,
)


def test_ics_labels_never_approved():
    out = acquire_ics_labels()
    assert out["recordCount"] >= 17
    assert out["approvedForUse"] is False
    assert out["verifiedRecordCount"] == 0
    assert out["dataMode"] == "sample_fallback"


def test_iucn_blocked_without_token(monkeypatch):
    monkeypatch.delenv("IUCN_API_TOKEN", raising=False)
    monkeypatch.setattr(
        "archive_life_pipeline.source_import._load_env",
        lambda: {},
    )
    out = acquire_iucn_status()
    assert out["blocked"] is True
    assert out["imported"] is False
    assert out.get("blockedReason") or out.get("ownerSetup")


def test_nasa_bounded_never_source_verified(tmp_path, monkeypatch):
    manifest = EXPORTS_DIR / "nasa" / "nasa_metadata_manifest.json"
    before = hashlib.sha256(manifest.read_bytes()).hexdigest()
    snap = tmp_path / "nasa"
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
    assert out["dataMode"] != "source_verified"
    assert Path(out["snapshotDir"]) == snap
    assert hashlib.sha256(manifest.read_bytes()).hexdigest() == before == HISTORICAL_MANIFEST_SHA256
