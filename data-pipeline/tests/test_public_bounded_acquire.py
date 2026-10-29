"""Offline honesty tests for public bounded acquire (no network required)."""

from archive_life_pipeline.public_bounded_acquire import acquire_ics_labels, acquire_iucn_status


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
