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
