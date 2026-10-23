"""SYNTHETIC manifest only. Not a NASA observation and not a coverage claim."""

from archive_life_pipeline.nasa_ingest import verified_count_for_nasa_manifest


def test_sample_fallback_manifest_does_not_copy_record_count():
    manifest = {
        "dataMode": "sample_fallback",
        "verificationMode": "sample_fallback",
        "recordCount": 4,
        "scope": "metadata_only",
        "note": "SYNTHETIC fixture. Not an observation.",
        "layers": [
            {
                "id": "synthetic-layer",
                "mode": "SAMPLE FALLBACK",
                "recordCount": 4,
            }
        ],
    }
    manifest["verifiedRecordCount"] = verified_count_for_nasa_manifest(
        manifest["dataMode"],
        manifest["recordCount"],
    )
    assert manifest["recordCount"] == 4
    assert manifest["verifiedRecordCount"] == 0
    assert manifest["dataMode"] == "sample_fallback"
    assert manifest["verificationMode"] == "sample_fallback"

    kept = verified_count_for_nasa_manifest(
        "real_metadata",
        record_count=4,
        explicit_verified=1,
    )
    assert kept == 1
