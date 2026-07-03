"""NASA Ocean Color / OB.DAAC / PACE marine biology placeholder."""

MOCK_OCEAN_COLOR = {
    "coastal": {
        "chlorophyll_mg_m3": 1.8,
        "productivity_index": 0.82,
        "bloom": True,
        "sst_c": 14.2,
    }
}


def fetch_ocean_productivity(region_id: str) -> dict:
    return MOCK_OCEAN_COLOR.get(
        region_id,
        {"chlorophyll_mg_m3": 0.0, "productivity_index": 0.0, "bloom": False, "sst_c": None},
    )
