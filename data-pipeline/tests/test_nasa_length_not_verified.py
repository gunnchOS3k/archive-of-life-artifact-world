"""SYNTHETIC payload only. Not a NASA observation and not a coverage claim."""

from archive_life_pipeline.nasa_ingest import (
    nasa_verification_mode,
    verified_count_for_nasa_manifest,
)
from archive_life_pipeline.source_import import SOURCE_SPECS, _read_import_status


def test_nonzero_fetch_length_is_not_reviewed_verification(tmp_path, monkeypatch):
    payload = {
        "note": "SYNTHETIC fixture. Not an observation.",
        "events": [{"id": "synthetic-1"}, {"id": "synthetic-2"}],
    }
    record_count = len(payload["events"])
    assert record_count == 2

    labels = {
        "real_metadata": nasa_verification_mode("real_metadata"),
        "cached_nasa_snapshot": nasa_verification_mode("cached_nasa_snapshot"),
    }
    assert labels["real_metadata"] == "real_metadata"
    assert labels["cached_nasa_snapshot"] == "mixed"
    for data_mode, mode in labels.items():
        verified = verified_count_for_nasa_manifest(data_mode, record_count)
        assert verified == 0
        assert mode != "source_verified"
        assert data_mode != "source_verified"

    assert verified_count_for_nasa_manifest(
        "real_metadata",
        record_count,
        explicit_verified=1,
    ) == 1
    assert nasa_verification_mode("sample_fallback") == "sample_fallback"

    monkeypatch.setattr(
        "archive_life_pipeline.source_import._status_file",
        lambda _spec: tmp_path / "absent-import-status.json",
    )
    monkeypatch.setattr(
        "archive_life_pipeline.source_import._nasa_cache_on_disk",
        lambda: {
            "recordCount": record_count,
            "imported": True,
            "dataMode": "real_metadata",
            "layers": [{"mode": "REAL NASA METADATA", "recordCount": record_count}],
            "note": "SYNTHETIC fixture. Not an observation.",
        },
    )
    read = _read_import_status(SOURCE_SPECS["nasa"])
    assert read.record_count == record_count
    assert read.verified_record_count == 0
    assert read.data_mode == "real_metadata"
    assert read.data_mode != "source_verified"
