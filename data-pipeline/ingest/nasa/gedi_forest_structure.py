"""NASA GEDI forest canopy structure placeholder."""

MOCK_GEDI = {
    "forest": {"rh98": 28.4, "cover": 0.82, "footprint": "MOCK-GEDI-FOREST"},
    "savanna": {"rh98": 8.1, "cover": 0.18, "footprint": "MOCK-GEDI-SAVANNA"},
}


def fetch_canopy_structure(region_id: str) -> dict:
    return MOCK_GEDI.get(region_id, {"rh98": 10.0, "cover": 0.3, "footprint": "MOCK-GEDI-DEFAULT"})
