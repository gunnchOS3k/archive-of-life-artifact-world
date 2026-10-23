"""Live NASA status follows the review decision. Historical JSON bytes stay put."""

import hashlib
import json

from archive_life_pipeline.paths import EXPORTS_DIR, PUBLIC_DATA
from archive_life_pipeline.source_import import SOURCE_SPECS, _read_import_status, _record_to_dict

MANIFEST = EXPORTS_DIR / "nasa" / "nasa_metadata_manifest.json"
CACHE = PUBLIC_DATA / "earth" / "nasa_metadata_cache.json"
STATUS = EXPORTS_DIR / "nasa" / "import_status.json"
MANIFEST_SHA256 = "f6d1c4d83b3888b1cd9fd7cd1b4fed11dbd317b857d461666f6a01ea3b3265b6"
STATUS_SHA256 = "085f224820462c2833ce432da8ebc7278e7656c9e0fe942669e5e3b9169e3635"


def _sha256(path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_live_nasa_import_status_is_not_current_source_verified():
    assert STATUS.is_file()
    assert _sha256(MANIFEST) == MANIFEST_SHA256
    assert _sha256(CACHE) == MANIFEST_SHA256
    assert _sha256(STATUS) == STATUS_SHA256

    on_disk = json.loads(STATUS.read_text())
    assert on_disk["dataMode"] == "source_verified"
    assert on_disk["verifiedRecordCount"] == 21

    rec = _read_import_status(SOURCE_SPECS["nasa"])
    assert rec.data_mode == "not_source_verified"
    assert rec.data_mode != "source_verified"
    assert rec.verified_record_count == 0
    assert rec.historical_data_mode == "source_verified"
    assert rec.historical_verified_record_count == 21

    published = _record_to_dict(SOURCE_SPECS["nasa"], rec)
    assert published["data_mode"] == "not_source_verified"
    assert published["verified_record_count"] == 0
    assert published["historical_data_mode"] == "source_verified"
    assert published["historical_verified_record_count"] == 21

    assert _sha256(MANIFEST) == MANIFEST_SHA256
    assert _sha256(CACHE) == MANIFEST_SHA256
    assert _sha256(STATUS) == STATUS_SHA256
