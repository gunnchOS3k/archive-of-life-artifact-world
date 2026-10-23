"""Generated NASA status reports keep the 21-count claim historical."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPORTS = [
    ROOT / "public/data/status/source_readiness_report.json",
]
MANIFEST = ROOT / "data-pipeline/exports/nasa/nasa_metadata_manifest.json"
CACHE = ROOT / "public/data/earth/nasa_metadata_cache.json"
IMPORT_STATUS = ROOT / "data-pipeline/exports/nasa/import_status.json"
MANIFEST_SHA256 = "f6d1c4d83b3888b1cd9fd7cd1b4fed11dbd317b857d461666f6a01ea3b3265b6"
IMPORT_STATUS_SHA256 = "085f224820462c2833ce432da8ebc7278e7656c9e0fe942669e5e3b9169e3635"


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _nasa_entry(document: dict) -> dict:
    return next(source for source in document["sources"] if source["source"] == "nasa")


def test_generated_nasa_reports_are_not_current_source_verified():
    assert _sha256(MANIFEST) == MANIFEST_SHA256
    assert _sha256(CACHE) == MANIFEST_SHA256
    assert _sha256(IMPORT_STATUS) == IMPORT_STATUS_SHA256

    assert REPORTS
    for path in REPORTS:
        document = json.loads(path.read_text())
        nasa = _nasa_entry(document)
        assert nasa["data_mode"] == "not_source_verified"
        assert nasa["verified_record_count"] == 0
        assert nasa["historical_data_mode"] == "source_verified"
        assert nasa["historical_verified_record_count"] == 21
        assert nasa["record_count"] == 21
        summary = document.get("summary")
        if isinstance(summary, dict) and "verifiedRecordCount" in summary:
            assert summary["verifiedRecordCount"] == 0
            assert summary["historical_verified_record_count"] == 21

    assert _sha256(MANIFEST) == MANIFEST_SHA256
    assert _sha256(CACHE) == MANIFEST_SHA256
    assert _sha256(IMPORT_STATUS) == IMPORT_STATUS_SHA256
