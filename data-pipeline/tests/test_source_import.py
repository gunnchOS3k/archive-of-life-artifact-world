import json

from archive_life_pipeline.paths import EXPORTS_DIR
from archive_life_pipeline.source_import import SOURCE_SPECS, list_sources, validate_sources


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


def test_nasa_cache_is_explicitly_metadata_only():
    cache = json.loads((EXPORTS_DIR / "nasa" / "nasa_metadata_manifest.json").read_text())
    assert cache["scope"] == "metadata_only"
    assert cache["measurementDataMode"] == "not_ingested"
    assert cache["verifiedRecordCount"] <= cache["recordCount"]
