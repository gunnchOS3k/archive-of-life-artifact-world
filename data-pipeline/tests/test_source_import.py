import json

from archive_life_pipeline.paths import EXPORTS_DIR
from archive_life_pipeline.source_import import (
    SOURCE_SPECS,
    UNVERIFIED_REGISTRATION_DATA_MODE,
    _read_import_status,
    _record_to_dict,
    import_col,
    import_gbif,
    import_iucn,
    import_neotoma,
    import_pbdb,
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


def test_local_snapshot_registration_is_not_source_verified(tmp_path, monkeypatch):
    """SYNTHETIC empty files only. Registration must not be labeled source_verified."""
    synthetic = {
        "note": "SYNTHETIC fixture. Not an observation.",
        "taxa": [],
        "records": [],
        "result": [],
        "data": [],
    }
    col_path = tmp_path / "col.json"
    gbif_path = tmp_path / "gbif.json"
    pbdb_path = tmp_path / "pbdb.json"
    neotoma_path = tmp_path / "neotoma.json"
    for path in (col_path, gbif_path, pbdb_path, neotoma_path):
        path.write_text(json.dumps(synthetic))

    env = {
        "COL_SNAPSHOT_PATH": str(col_path),
        "COL_SOURCE_VERSION": "synthetic",
        "COL_CITATION": "SYNTHETIC fixture. Not an observation.",
        "GBIF_DOWNLOAD_PATH": str(gbif_path),
        "GBIF_CITATION": "SYNTHETIC fixture. Not an observation.",
        "PBDB_SNAPSHOT_PATH": str(pbdb_path),
        "PBDB_SOURCE_VERSION": "synthetic",
        "NEOTOMA_SNAPSHOT_PATH": str(neotoma_path),
        "NEOTOMA_SOURCE_VERSION": "synthetic",
        "IUCN_API_TOKEN": "synthetic-not-sent",
        "IUCN_API_VERSION": "synthetic",
    }
    monkeypatch.setattr("archive_life_pipeline.source_import._load_env", lambda: env)
    monkeypatch.setattr(
        "archive_life_pipeline.source_import._export_dir",
        lambda spec: tmp_path / "exports" / spec.snapshot_subdir,
    )
    monkeypatch.setattr(
        "archive_life_pipeline.source_import.SNAPSHOTS_DIR",
        tmp_path / "snapshots",
    )
    monkeypatch.setattr(
        "archive_life_pipeline.source_import._fetch_iucn_page",
        lambda _token: ({"result": [], "note": "SYNTHETIC fixture. Not an observation."}, b""),
    )

    imported = {
        "col": import_col(),
        "gbif": import_gbif(),
        "pbdb": import_pbdb(),
        "iucn": import_iucn(),
        "neotoma": import_neotoma(),
    }
    assert UNVERIFIED_REGISTRATION_DATA_MODE == "sample_fallback"
    for source, record in imported.items():
        assert record.data_mode == "sample_fallback", source
        assert record.data_mode != "source_verified", source
        assert record.verified_record_count == 0, source
        assert record.record_count == 0, source
        assert record.imported is True, source


def test_nasa_cache_is_explicitly_metadata_only():
    cache = json.loads((EXPORTS_DIR / "nasa" / "nasa_metadata_manifest.json").read_text())
    assert cache["scope"] == "metadata_only"
    assert cache["measurementDataMode"] == "not_ingested"
    assert cache["verifiedRecordCount"] <= cache["recordCount"]
