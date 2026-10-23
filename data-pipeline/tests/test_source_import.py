import json

from archive_life_pipeline.paths import EXPORTS_DIR
from archive_life_pipeline.source_import import (
    SOURCE_SPECS,
    _read_import_status,
    _record_to_dict,
    list_sources,
    validate_sources,
)


def test_source_specs_defined():
    assert "col" in SOURCE_SPECS
    assert "nasa" in SOURCE_SPECS
    assert len(SOURCE_SPECS) >= 6


def test_list_sources():
    out = list_sources()
    assert "sources" in out
    assert len(out["sources"]) == len(SOURCE_SPECS)


def test_validate_sources():
    out = validate_sources()
    assert "checks" in out
    assert "valid" in out


def test_source_verified_does_not_copy_record_count_into_verified_count(tmp_path, monkeypatch):
    """SYNTHETIC status only. A missing or zero verified count must stay zero."""
    spec = SOURCE_SPECS["col"]
    status_path = tmp_path / "import_status.json"
    monkeypatch.setattr(
        "archive_life_pipeline.source_import._status_file",
        lambda _spec: status_path,
    )

    status_path.write_text(
        json.dumps(
            {
                "imported": True,
                "status": "imported",
                "recordCount": 4,
                "dataMode": "source_verified",
                "citation": "SYNTHETIC fixture status. Not an observation.",
                "sourceVersion": "synthetic",
            }
        )
    )
    missing = _read_import_status(spec)
    assert missing.record_count == 4
    assert missing.data_mode == "source_verified"
    assert missing.verified_record_count == 0
    assert _record_to_dict(spec, missing)["verified_record_count"] == 0

    status_path.write_text(
        json.dumps(
            {
                "imported": True,
                "recordCount": 4,
                "verifiedRecordCount": 0,
                "dataMode": "source_verified",
                "citation": "SYNTHETIC fixture status. Not an observation.",
            }
        )
    )
    zeroed = _read_import_status(spec)
    assert zeroed.verified_record_count == 0
    assert _record_to_dict(spec, zeroed)["record_count"] == 4
    assert _record_to_dict(spec, zeroed)["verified_record_count"] == 0

    status_path.write_text(
        json.dumps(
            {
                "imported": True,
                "recordCount": 4,
                "verifiedRecordCount": 1,
                "dataMode": "source_verified",
                "citation": "SYNTHETIC fixture status. Not an observation.",
            }
        )
    )
    explicit = _read_import_status(spec)
    assert explicit.verified_record_count == 1
    assert explicit.record_count == 4

    monkeypatch.setattr(
        "archive_life_pipeline.source_import._status_file",
        lambda _spec: tmp_path / "absent-import-status.json",
    )
    monkeypatch.setattr(
        "archive_life_pipeline.source_import._nasa_cache_on_disk",
        lambda: {
            "recordCount": 9,
            "imported": True,
            "layers": [{"mode": "REAL NASA METADATA"}],
            "verificationMode": "source_verified",
            "citation": "SYNTHETIC nasa cache. Not an observation.",
        },
    )
    nasa_missing = _read_import_status(SOURCE_SPECS["nasa"])
    assert nasa_missing.record_count == 9
    assert nasa_missing.data_mode == "source_verified"
    assert nasa_missing.verified_record_count == 0


def test_nasa_cache_is_explicitly_metadata_only():
    cache = json.loads((EXPORTS_DIR / "nasa" / "nasa_metadata_manifest.json").read_text())
    assert cache["scope"] == "metadata_only"
    assert cache["measurementDataMode"] == "not_ingested"
    assert cache["verifiedRecordCount"] <= cache["recordCount"]
