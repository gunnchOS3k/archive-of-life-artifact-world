from archive_life_pipeline.models import SourceSnapshot


def test_source_snapshot_model():
    snap = SourceSnapshot(
        id="test",
        source_name="catalogue_of_life",
        source_category="taxonomy",
        version="2026-07",
        license="CC-BY-4.0",
        citation="Test",
        retrieval_date="2026-07-05",
        approved_for_use=False,
        is_mock_data=True,
    )
    assert snap.is_mock_data is True
    assert snap.approved_for_use is False


def test_paths_exist():
    from archive_life_pipeline.paths import SQL_DIR

    assert SQL_DIR.exists()
